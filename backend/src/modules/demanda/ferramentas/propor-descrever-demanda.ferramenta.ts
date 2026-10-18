import { Injectable } from '@nestjs/common';
import { NivelIaEnum, ProporDescreverDemandaDto, PropostaDescreverDemandaDadosDto, TipoPropostaIaEnum, TipoPromptEnum } from '@project20/shared';
import { BusinessException } from '../../../core/exceptions/business.exception';
import { JwtPayload } from '../../autenticacao/domain/interfaces/jwt-payload.interface';
import { FerramentaPropostaIa } from '../../ferramenta-ia/ferramentas/ferramenta-proposta-ia';
import { IaService } from '../../ia/services/ia.service';
import { ProjetoService } from '../../projeto/services/projeto.service';
import { PromptService } from '../../prompt/services/prompt.service';
import { PropostaIaService } from '../../proposta-ia/services/proposta-ia.service';
import { interpretarRedacaoDaDemanda, montarInstrucoesDeRedacaoDaDemanda } from '../domain/redacao-da-demanda';
import { DemandaService } from '../services/demanda.service';

/** Teto de tokens da redação das descrições (as duas, em Markdown). */
export const MAXIMO_TOKENS_DA_REDACAO_DA_DEMANDA = 2500;

/**
 * Propõe as descrições do cliente e técnica de uma demanda a partir da entrevista com o gestor; **não grava nada** (só o clique de
 * Confirmar grava). A redação é uma chamada à parte no **nível analítico** (o de `NIVEL_DO_TIPO_DE_PROMPT`), com o prompt
 * `ENTREVISTA_DEMANDA` ativo mais instruções que proíbem inventar; só o que veio no relato vira descrição. Só o gestor.
 */
@Injectable()
export class ProporDescreverDemandaFerramenta extends FerramentaPropostaIa<ProporDescreverDemandaDto> {
  readonly nome = 'propor_descrever_demanda';
  readonly descricao =
    'Propõe a descrição do cliente e/ou a descrição técnica de uma demanda, a partir da ENTREVISTA com o gestor. Antes de chamar, converse: pergunte o que o cliente pediu e o que será feito, ' +
    'uma coisa de cada vez, e peça o que faltar; nunca invente o que o cliente pediu. Passe em relatoDoCliente e relatoTecnico o que o gestor contou, fiel e com as palavras dele ' +
    '(só o que ele disse; um dos dois pode faltar). O sistema redige as descrições em Markdown e o gestor confirma no cartão; nada é gravado antes. O demandaId vem de listar_demandas_do_projeto.';
  readonly permissao = 'GESTOR' as const;
  readonly classeDeEntrada = ProporDescreverDemandaDto;
  readonly tipoProposta = TipoPropostaIaEnum.DESCREVER_DEMANDA;

  constructor(
    propostaIaService: PropostaIaService,
    private readonly demandaService: DemandaService,
    private readonly projetoService: ProjetoService,
    private readonly iaService: IaService,
    private readonly promptService: PromptService,
  ) {
    super(propostaIaService);
  }

  protected async montarDados(entrada: ProporDescreverDemandaDto, usuarioAtivo: JwtPayload): Promise<Record<string, unknown>> {
    const relatoDoCliente = entrada.relatoDoCliente?.trim() || undefined;
    const relatoTecnico = entrada.relatoTecnico?.trim() || undefined;
    if (!relatoDoCliente && !relatoTecnico) {
      throw new BusinessException('Faça a entrevista antes: informe o que o cliente pediu (relatoDoCliente) e/ou o que será feito (relatoTecnico)');
    }
    // `recuperar` confere a existência e o acesso do usuário à demanda.
    const demanda = (await this.demandaService.recuperar({ id: entrada.demandaId }, usuarioAtivo)).dados;
    if (!demanda) throw new BusinessException('Demanda não encontrada');
    const projeto = (await this.projetoService.recuperar({ id: demanda.projetoId }, usuarioAtivo)).dados;

    const prompt = await this.promptService.obterAtivo(TipoPromptEnum.ENTREVISTA_DEMANDA);
    const instrucoes = `${prompt.conteudo}\n\n${montarInstrucoesDeRedacaoDaDemanda({
      demanda: demanda.nome,
      projeto: projeto?.nome ?? '',
      querCliente: relatoDoCliente !== undefined,
      querTecnica: relatoTecnico !== undefined,
      descricaoClienteAtual: relatoDoCliente ? demanda.descricaoCliente : null,
      descricaoTecnicaAtual: relatoTecnico ? demanda.descricaoTecnica : null,
    })}`;
    const relato = [relatoDoCliente ? `Relato sobre o que o cliente pediu: ${relatoDoCliente}` : '', relatoTecnico ? `Relato sobre o que será feito: ${relatoTecnico}` : ''].filter((linha) => linha !== '').join('\n\n');
    const redigida = await this.iaService.gerar({
      nivel: NivelIaEnum.ANALITICO,
      instrucoes,
      mensagens: [{ papel: 'usuario', conteudo: relato }],
      maximoTokens: MAXIMO_TOKENS_DA_REDACAO_DA_DEMANDA,
    });
    const descricoes = interpretarRedacaoDaDemanda(redigida.texto, { cliente: relatoDoCliente !== undefined, tecnica: relatoTecnico !== undefined });
    if (!descricoes) throw new BusinessException('Não foi possível redigir as descrições a partir do relato; peça mais detalhe ao gestor.');

    const dados: PropostaDescreverDemandaDadosDto = { demandaId: entrada.demandaId, ...descricoes, demandaNome: demanda.nome, projetoNome: projeto?.nome };
    return { ...dados };
  }
}
