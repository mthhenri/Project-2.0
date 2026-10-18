import { Injectable } from '@nestjs/common';
import { PropostaDescreverExecucaoDadosDto, TipoPropostaIaEnum } from '@project20/shared';
import { BusinessException } from '../../../core/exceptions/business.exception';
import { JwtPayload } from '../../autenticacao/domain/interfaces/jwt-payload.interface';
import { ExecutorPropostaIa } from '../../proposta-ia/domain/executor-proposta-ia';
import { validarDadosDaProposta } from '../../proposta-ia/domain/validar-dados-da-proposta';
import { ExecucaoService } from '../services/execucao.service';

/** Descrição provisória do trecho seguinte quando a proposta não traz uma. */
export const DESCRICAO_CONTINUACAO = 'Continuação da atividade';
export const DESCRICAO_INICIO_DA_SEGUINTE = 'Início da atividade';

function validarEscolha(dados: PropostaDescreverExecucaoDadosDto): void {
  if (dados.escolha === 'TROCAR' && !dados.atividadeSeguinteId) throw new BusinessException('Informe a atividade para a qual trocar');
}

/**
 * Executor da proposta `DESCREVER_EXECUCAO` (o check-in): **encerra** a execução ativa do usuário com a descrição formal e abre o
 * trecho seguinte, na mesma atividade (`CONTINUAR`) ou em outra (`TROCAR`), tudo pela `ExecucaoService` com o usuário do token (valem
 * o dono, o status executável e a regra de uma execução ativa). Recusa a proposta velha se a execução em andamento já não é a que foi
 * descrita. Se abrir o trecho seguinte falhar, reabre a execução (a descrição não se perde: o usuário tenta de novo). Desfazer exclui o
 * trecho novo (se ainda em andamento) e reabre a execução descrita com a descrição provisória de antes.
 */
@Injectable()
export class DescreverExecucaoExecutor implements ExecutorPropostaIa {
  readonly tipo = TipoPropostaIaEnum.DESCREVER_EXECUCAO;

  constructor(private readonly execucaoService: ExecucaoService) {}

  validar(dados: Record<string, unknown>): void {
    validarEscolha(validarDadosDaProposta(PropostaDescreverExecucaoDadosDto, dados));
  }

  async executar(dados: Record<string, unknown>, usuarioAtivo: JwtPayload): Promise<Record<string, unknown>> {
    const entrada = validarDadosDaProposta(PropostaDescreverExecucaoDadosDto, dados);
    validarEscolha(entrada);

    const ativa = (await this.execucaoService.recuperarAtiva(usuarioAtivo)).dados;
    if (!ativa) throw new BusinessException('Você não tem execução em andamento: não há o que descrever');
    if (entrada.execucaoId && ativa.id !== entrada.execucaoId) {
      throw new BusinessException('A execução em andamento mudou desde a proposta: peça um novo check-in');
    }
    if (entrada.escolha === 'TROCAR' && entrada.atividadeSeguinteId === ativa.atividadeId) {
      throw new BusinessException('A atividade seguinte é a mesma da execução: escolha continuar nela');
    }

    const atividadeSeguinteId = entrada.escolha === 'TROCAR' ? entrada.atividadeSeguinteId! : ativa.atividadeId;
    const descricaoSeguinte =
      entrada.descricaoSeguinte?.trim() || (entrada.escolha === 'TROCAR' ? DESCRICAO_INICIO_DA_SEGUINTE : DESCRICAO_CONTINUACAO);

    await this.execucaoService.encerrar({ id: ativa.id, descricao: entrada.descricao.trim() }, usuarioAtivo);
    try {
      const nova = (await this.execucaoService.iniciar({ atividadeId: atividadeSeguinteId, descricao: descricaoSeguinte }, usuarioAtivo)).dados;
      return { execucaoDescritaId: ativa.id, descricaoAnterior: ativa.descricao, novaExecucaoId: nova?.id, atividadeSeguinteId };
    } catch (erro) {
      await this.reabrir(ativa.id, ativa.descricao, usuarioAtivo).catch(() => undefined);
      throw erro;
    }
  }

  async desfazer(resultado: Record<string, unknown>, usuarioAtivo: JwtPayload): Promise<void> {
    const novaId = Number(resultado['novaExecucaoId']);
    const descritaId = Number(resultado['execucaoDescritaId']);
    if (!Number.isInteger(novaId) || !Number.isInteger(descritaId)) throw new BusinessException('Não há descrição a desfazer nesta proposta');

    const nova = (await this.execucaoService.recuperar({ id: novaId }, usuarioAtivo)).dados;
    if (nova?.fimData) throw new BusinessException('O trecho seguinte já foi encerrado: não dá para desfazer a descrição');

    await this.execucaoService.excluir({ id: novaId }, usuarioAtivo);
    await this.reabrir(descritaId, String(resultado['descricaoAnterior'] ?? DESCRICAO_CONTINUACAO), usuarioAtivo);
  }

  /** Reabre uma execução encerrada (fim nulo) com a descrição de antes, desde que o usuário não tenha outra em andamento. */
  private async reabrir(execucaoId: number, descricao: string, usuarioAtivo: JwtPayload): Promise<void> {
    if ((await this.execucaoService.recuperarAtiva(usuarioAtivo)).dados) {
      throw new BusinessException('Há outra execução em andamento: a anterior não pôde ser reaberta');
    }
    await this.execucaoService.alterar({ id: execucaoId, descricao: descricao.trim() || DESCRICAO_CONTINUACAO, fimData: null }, usuarioAtivo);
  }
}
