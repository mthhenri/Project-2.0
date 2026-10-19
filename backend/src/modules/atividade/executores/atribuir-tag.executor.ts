import { Injectable } from '@nestjs/common';
import { PropostaAtribuirTagDadosDto, TipoPropostaIaEnum } from '@project20/shared';
import { BusinessException } from '../../../core/exceptions/business.exception';
import { JwtPayload } from '../../autenticacao/domain/interfaces/jwt-payload.interface';
import { DemandaService } from '../../demanda/services/demanda.service';
import { ExecutorPropostaIa } from '../../proposta-ia/domain/executor-proposta-ia';
import { validarDadosDaProposta } from '../../proposta-ia/domain/validar-dados-da-proposta';
import { calcularConjuntoDeTags, mesmoConjuntoDeTags } from '../domain/conjunto-de-tags';
import { AtividadeService } from '../services/atividade.service';

/**
 * Executor da proposta `ATRIBUIR_TAG`: lê as tags **de agora**, aplica a diferença (entram `adicionarTagIds`, saem `removerTagIds`) e
 * grava o conjunto final pela service do alvo (`PUT .../tag` substitui o conjunto inteiro, por isso a diferença é calculada aqui, sobre
 * o estado atual, para não desfazer o que outra pessoa mudou nesse meio tempo). Quem pode é decidido pela service do alvo (demanda: gestor ou membro; atividade: gestor, autor ou membro). Desfazer devolve o conjunto de antes, mas
 * só se as tags ainda são as que a proposta deixou.
 */
@Injectable()
export class AtribuirTagExecutor implements ExecutorPropostaIa {
  readonly tipo = TipoPropostaIaEnum.ATRIBUIR_TAG;

  constructor(
    private readonly demandaService: DemandaService,
    private readonly atividadeService: AtividadeService,
  ) {}

  validar(dados: Record<string, unknown>): void {
    const entrada = validarDadosDaProposta(PropostaAtribuirTagDadosDto, dados);
    if ((entrada.adicionarTagIds ?? []).length === 0 && (entrada.removerTagIds ?? []).length === 0) throw new BusinessException('A proposta não altera nenhuma tag');
  }

  async executar(dados: Record<string, unknown>, usuarioAtivo: JwtPayload): Promise<Record<string, unknown>> {
    const entrada = validarDadosDaProposta(PropostaAtribuirTagDadosDto, dados);
    const antes = await this.lerTags(entrada.alvo, entrada.alvoId, usuarioAtivo);
    const depois = calcularConjuntoDeTags(antes, entrada.adicionarTagIds, entrada.removerTagIds);
    if (mesmoConjuntoDeTags(antes, depois)) throw new BusinessException('O alvo já está com essas tags: não há o que alterar');
    await this.gravarTags(entrada.alvo, entrada.alvoId, depois, usuarioAtivo);
    return { alvo: entrada.alvo, alvoId: entrada.alvoId, tagsAntesIds: antes, tagsDepoisIds: depois };
  }

  async desfazer(resultado: Record<string, unknown>, usuarioAtivo: JwtPayload): Promise<void> {
    const alvo = resultado['alvo'] as 'DEMANDA' | 'ATIVIDADE';
    const alvoId = Number(resultado['alvoId']);
    const antes = resultado['tagsAntesIds'] as number[] | undefined;
    const depois = resultado['tagsDepoisIds'] as number[] | undefined;
    if ((alvo !== 'DEMANDA' && alvo !== 'ATIVIDADE') || !Number.isInteger(alvoId) || !antes || !depois) throw new BusinessException('Não há tags a desfazer nesta proposta');

    const atuais = await this.lerTags(alvo, alvoId, usuarioAtivo);
    if (!mesmoConjuntoDeTags(atuais, depois)) throw new BusinessException('As tags mudaram depois desta alteração: não dá para desfazer com segurança');
    await this.gravarTags(alvo, alvoId, antes, usuarioAtivo);
  }

  /** Obsoleta quando o alvo já está com o conjunto que a proposta produziria. */
  async estaObsoleta(dados: Record<string, unknown>, usuarioAtivo: JwtPayload): Promise<boolean> {
    const entrada = validarDadosDaProposta(PropostaAtribuirTagDadosDto, dados);
    const atuais = await this.lerTags(entrada.alvo, entrada.alvoId, usuarioAtivo);
    return mesmoConjuntoDeTags(atuais, calcularConjuntoDeTags(atuais, entrada.adicionarTagIds, entrada.removerTagIds));
  }

  private async lerTags(alvo: 'DEMANDA' | 'ATIVIDADE', alvoId: number, usuarioAtivo: JwtPayload): Promise<number[]> {
    const tags =
      alvo === 'DEMANDA'
        ? (await this.demandaService.listarTagsDemanda({ id: alvoId }, usuarioAtivo)).dados
        : (await this.atividadeService.listarTags({ id: alvoId }, usuarioAtivo)).dados;
    return (tags ?? []).map((tag) => tag.id).sort((a, b) => a - b);
  }

  private async gravarTags(alvo: 'DEMANDA' | 'ATIVIDADE', alvoId: number, tagIds: number[], usuarioAtivo: JwtPayload): Promise<void> {
    if (alvo === 'DEMANDA') await this.demandaService.alterarTagsDemanda({ demandaId: alvoId, tagIds }, usuarioAtivo);
    else await this.atividadeService.alterarTags({ id: alvoId, tagIds }, usuarioAtivo);
  }
}
