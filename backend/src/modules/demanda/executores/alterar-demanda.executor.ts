import { Injectable } from '@nestjs/common';
import { PropostaAlterarDemandaDadosDto, TipoPropostaIaEnum } from '@project20/shared';
import { BusinessException } from '../../../core/exceptions/business.exception';
import { JwtPayload } from '../../autenticacao/domain/interfaces/jwt-payload.interface';
import { ExecutorPropostaIa } from '../../proposta-ia/domain/executor-proposta-ia';
import { validarDadosDaProposta } from '../../proposta-ia/domain/validar-dados-da-proposta';
import { validarNovoPaiDaDemanda } from '../domain/novo-pai-da-demanda';
import { DemandaRepository } from '../repositories/demanda.repository';
import { DemandaService } from '../services/demanda.service';

const dia = (data: string | null | undefined): string | null => (data ? String(data).slice(0, 10) : null);

/**
 * Executor da proposta `ALTERAR_DEMANDA`: altera pela `DemandaService.alterar` com o usuário do token (valem o acesso e as demais
 * regras da tela: o desenvolvedor só edita demanda de que é membro). A documentação é **acrescentada** ao texto de agora, e mover de pai
 * confere de novo ciclo, projeto e estrutura. Guarda no resultado os valores de antes e os aplicados. Desfazer devolve os de antes, mas só
 * se a demanda ainda está como a proposta a deixou (senão não perde a edição de outra pessoa).
 */
@Injectable()
export class AlterarDemandaExecutor implements ExecutorPropostaIa {
  readonly tipo = TipoPropostaIaEnum.ALTERAR_DEMANDA;

  constructor(
    private readonly demandaService: DemandaService,
    private readonly demandaRepositorio: DemandaRepository,
  ) {}

  validar(dados: Record<string, unknown>): void {
    const entrada = validarDadosDaProposta(PropostaAlterarDemandaDadosDto, dados);
    if (!this.algoParaAlterar(entrada)) {
      throw new BusinessException('A proposta não altera nada na demanda');
    }
  }

  async executar(dados: Record<string, unknown>, usuarioAtivo: JwtPayload): Promise<Record<string, unknown>> {
    const entrada = validarDadosDaProposta(PropostaAlterarDemandaDadosDto, dados);
    const atual = (await this.demandaService.recuperar({ id: entrada.demandaId }, usuarioAtivo)).dados;
    if (!atual) throw new BusinessException('Demanda não encontrada');

    const acrescimo = entrada.acrescentarDocumentacao?.trim();
    const documentacaoNova = acrescimo ? (atual.documentacao?.trim() ? `${atual.documentacao.trimEnd()}\n\n${acrescimo}` : acrescimo) : undefined;
    if (entrada.demandaPaiId !== undefined) {
      const novoPai = (await this.demandaService.recuperar({ id: entrada.demandaPaiId }, usuarioAtivo)).dados;
      if (!novoPai) throw new BusinessException('Demanda pai não encontrada');
      const subarvore = (await this.demandaRepositorio.listarDescendentes({ demandaId: atual.id })).map((item) => item.id);
      validarNovoPaiDaDemanda({ demandaId: atual.id, demandaProjetoId: atual.projetoId, novoPai, idsDaSubarvore: subarvore });
    }

    await this.demandaService.alterar(
      {
        id: entrada.demandaId, nome: entrada.nome, status: entrada.status, horasEstimadas: entrada.horasEstimadas, previsaoFimData: entrada.previsaoFimData,
        ...(documentacaoNova !== undefined ? { documentacao: documentacaoNova } : {}),
        ...(entrada.demandaPaiId !== undefined ? { demandaPaiId: entrada.demandaPaiId } : {}),
      },
      usuarioAtivo,
    );
    return {
      demandaId: entrada.demandaId,
      ...(entrada.nome !== undefined ? { nome: entrada.nome, nomeAnterior: atual.nome } : {}),
      ...(entrada.status !== undefined ? { status: entrada.status, statusAnterior: atual.status } : {}),
      ...(entrada.horasEstimadas !== undefined ? { horasEstimadas: entrada.horasEstimadas, horasAnteriores: atual.horasEstimadas } : {}),
      ...(entrada.previsaoFimData !== undefined ? { previsaoFimData: entrada.previsaoFimData, previsaoAnteriorData: dia(atual.previsaoFimData) } : {}),
      ...(documentacaoNova !== undefined ? { documentacaoNova, documentacaoAnterior: atual.documentacao ?? null } : {}),
      ...(entrada.demandaPaiId !== undefined ? { demandaPaiId: entrada.demandaPaiId, paiAnteriorId: atual.demandaPaiId ?? null } : {}),
    };
  }

  async desfazer(resultado: Record<string, unknown>, usuarioAtivo: JwtPayload): Promise<void> {
    const demandaId = Number(resultado['demandaId']);
    if (!Number.isInteger(demandaId)) throw new BusinessException('Não há demanda a desfazer nesta proposta');
    const atual = (await this.demandaService.recuperar({ id: demandaId }, usuarioAtivo)).dados;
    if (!atual) throw new BusinessException('Demanda não encontrada');

    const mudouDepois =
      (resultado['nome'] !== undefined && atual.nome !== resultado['nome']) ||
      (resultado['status'] !== undefined && atual.status !== resultado['status']) ||
      (resultado['horasEstimadas'] !== undefined && atual.horasEstimadas !== resultado['horasEstimadas']) ||
      (resultado['previsaoFimData'] !== undefined && dia(atual.previsaoFimData) !== resultado['previsaoFimData']) ||
      (resultado['documentacaoNova'] !== undefined && (atual.documentacao ?? null) !== resultado['documentacaoNova']) ||
      (resultado['demandaPaiId'] !== undefined && (atual.demandaPaiId ?? null) !== resultado['demandaPaiId']);
    if (mudouDepois) throw new BusinessException('A demanda mudou depois desta alteração: não dá para desfazer com segurança');

    await this.demandaService.alterar(
      {
        id: demandaId,
        ...(resultado['nomeAnterior'] !== undefined ? { nome: resultado['nomeAnterior'] as string } : {}),
        ...(resultado['statusAnterior'] !== undefined ? { status: resultado['statusAnterior'] as never } : {}),
        ...(resultado['horasAnteriores'] !== undefined ? { horasEstimadas: resultado['horasAnteriores'] as number } : {}),
        // `null` limpa a previsão (a service e o repository aceitam); `undefined` deixaria como está.
        ...(resultado['previsaoAnteriorData'] !== undefined ? { previsaoFimData: resultado['previsaoAnteriorData'] as string | null } : {}),
        // `null` limpa a documentação e devolve a demanda ao topo (a service e o repository aceitam; `undefined` deixaria como está).
        ...(resultado['documentacaoAnterior'] !== undefined ? { documentacao: resultado['documentacaoAnterior'] as string | null } : {}),
        ...(resultado['paiAnteriorId'] !== undefined ? { demandaPaiId: resultado['paiAnteriorId'] as number | null } : {}),
      },
      usuarioAtivo,
    );
  }

  /** Obsoleta quando a demanda já está como a proposta pede (o gestor alterou à mão). */
  async estaObsoleta(dados: Record<string, unknown>, usuarioAtivo: JwtPayload): Promise<boolean> {
    const entrada = validarDadosDaProposta(PropostaAlterarDemandaDadosDto, dados);
    const atual = (await this.demandaService.recuperar({ id: entrada.demandaId }, usuarioAtivo)).dados;
    if (!atual) return false;
    return (
      (entrada.nome === undefined || atual.nome === entrada.nome) &&
      (entrada.status === undefined || atual.status === entrada.status) &&
      (entrada.horasEstimadas === undefined || atual.horasEstimadas === entrada.horasEstimadas) &&
      (entrada.previsaoFimData === undefined || dia(atual.previsaoFimData) === entrada.previsaoFimData) &&
      !entrada.acrescentarDocumentacao?.trim() &&
      (entrada.demandaPaiId === undefined || (atual.demandaPaiId ?? null) === entrada.demandaPaiId)
    );
  }

  private algoParaAlterar(entrada: PropostaAlterarDemandaDadosDto): boolean {
    return (
      entrada.nome !== undefined || entrada.status !== undefined || entrada.horasEstimadas !== undefined || entrada.previsaoFimData !== undefined ||
      !!entrada.acrescentarDocumentacao?.trim() || entrada.demandaPaiId !== undefined
    );
  }
}
