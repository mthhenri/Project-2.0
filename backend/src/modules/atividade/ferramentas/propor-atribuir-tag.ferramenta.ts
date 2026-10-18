import { Injectable } from '@nestjs/common';
import { ProporAtribuirTagDto, PropostaAtribuirTagDadosDto, TipoPropostaIaEnum } from '@project20/shared';
import { BusinessException } from '../../../core/exceptions/business.exception';
import { JwtPayload } from '../../autenticacao/domain/interfaces/jwt-payload.interface';
import { DemandaService } from '../../demanda/services/demanda.service';
import { FerramentaPropostaIa } from '../../ferramenta-ia/ferramentas/ferramenta-proposta-ia';
import { PropostaIaService } from '../../proposta-ia/services/proposta-ia.service';
import { TagService } from '../../tag/services/tag.service';
import { calcularConjuntoDeTags, mesmoConjuntoDeTags } from '../domain/conjunto-de-tags';
import { AtividadeService } from '../services/atividade.service';

/**
 * Propõe acrescentar e/ou tirar tags de uma demanda ou de uma atividade (só o gestor); **não altera nada** (só o clique de Confirmar
 * no cartão altera). A IA informa só o que entra e o que sai, com ids de `listar_tags`; aqui se calcula o conjunto final a partir das
 * tags de hoje, descarta o que já está como pedido e mostra o antes e o depois com nomes. Tag inexistente é recusada (criar tag é pela
 * tela): a IA nunca inventa id.
 */
@Injectable()
export class ProporAtribuirTagFerramenta extends FerramentaPropostaIa<ProporAtribuirTagDto> {
  readonly nome = 'propor_atribuir_tag';
  readonly descricao =
    'Propõe acrescentar (`adicionarTagIds`) e/ou tirar (`removerTagIds`) tags de uma DEMANDA ou de uma ATIVIDADE (`alvo` e `alvoId`). Os ids das tags vêm de listar_tags; nunca invente id nem nome de tag. ' +
    'Se a tag que o usuário pediu não existe, avise que criar tag é pela tela de Tags. Informe só o que muda. Nada muda até o gestor confirmar no cartão.';
  readonly permissao = 'GESTOR' as const;
  readonly classeDeEntrada = ProporAtribuirTagDto;
  readonly tipoProposta = TipoPropostaIaEnum.ATRIBUIR_TAG;

  constructor(
    propostaIaService: PropostaIaService,
    private readonly demandaService: DemandaService,
    private readonly atividadeService: AtividadeService,
    private readonly tagService: TagService,
  ) {
    super(propostaIaService);
  }

  protected async montarDados(entrada: ProporAtribuirTagDto, usuarioAtivo: JwtPayload): Promise<Record<string, unknown>> {
    const adicionar = entrada.adicionarTagIds ?? [];
    const remover = entrada.removerTagIds ?? [];
    if (adicionar.length === 0 && remover.length === 0) throw new BusinessException('Informe as tags a acrescentar (adicionarTagIds) e/ou a tirar (removerTagIds)');
    const emAmbos = adicionar.filter((tagId) => remover.includes(tagId));
    if (emAmbos.length > 0) throw new BusinessException('Uma mesma tag não pode entrar e sair na mesma proposta');

    const nomesPorId = new Map(((await this.tagService.listar()).dados ?? []).map((tag) => [tag.id, tag.nome]));
    const inexistentes = [...adicionar, ...remover].filter((tagId) => !nomesPorId.has(tagId));
    if (inexistentes.length > 0) {
      throw new BusinessException(`Tag(s) inexistente(s): ${inexistentes.join(', ')}. Use os ids de listar_tags; criar tag é pela tela de Tags. Avise o usuário.`);
    }

    // As leituras conferem a existência e o acesso do usuário ao alvo: erro aqui volta ao modelo, e nenhuma proposta nasce.
    let alvoNome: string;
    let demandaNome: string | undefined;
    let tagsAtuais: number[];
    if (entrada.alvo === 'DEMANDA') {
      const demanda = (await this.demandaService.recuperar({ id: entrada.alvoId }, usuarioAtivo)).dados;
      if (!demanda) throw new BusinessException('Demanda não encontrada');
      alvoNome = demanda.nome;
      tagsAtuais = ((await this.demandaService.listarTagsDemanda({ id: entrada.alvoId }, usuarioAtivo)).dados ?? []).map((tag) => tag.id);
    } else {
      const atividade = (await this.atividadeService.recuperar({ id: entrada.alvoId }, usuarioAtivo)).dados;
      if (!atividade) throw new BusinessException('Atividade não encontrada');
      alvoNome = atividade.nome;
      demandaNome = (await this.demandaService.recuperar({ id: atividade.demandaId }, usuarioAtivo)).dados?.nome;
      tagsAtuais = ((await this.atividadeService.listarTags({ id: entrada.alvoId }, usuarioAtivo)).dados ?? []).map((tag) => tag.id);
    }

    const depois = calcularConjuntoDeTags(tagsAtuais, adicionar, remover);
    if (mesmoConjuntoDeTags(tagsAtuais, depois)) {
      throw new BusinessException(`"${alvoNome}" já está com essas tags: não há o que alterar. Avise o usuário.`);
    }
    const nomes = (ids: readonly number[]): string[] => ids.map((tagId) => nomesPorId.get(tagId) ?? `Tag ${tagId}`);
    const dados: PropostaAtribuirTagDadosDto = {
      alvo: entrada.alvo,
      alvoId: entrada.alvoId,
      // Só o que de fato muda (o que já estava como pedido não vira "mudança").
      adicionarTagIds: adicionar.filter((tagId) => !tagsAtuais.includes(tagId)),
      removerTagIds: remover.filter((tagId) => tagsAtuais.includes(tagId)),
      alvoNome,
      ...(demandaNome ? { demandaNome } : {}),
      tagsAntesNomes: nomes([...tagsAtuais].sort((a, b) => a - b)),
      tagsDepoisNomes: nomes(depois),
    };
    return { ...dados };
  }
}
