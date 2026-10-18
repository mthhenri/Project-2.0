import { Injectable } from '@nestjs/common';
import { PropostaAlterarAtividadeDadosDto, TipoPropostaIaEnum } from '@project20/shared';
import { BusinessException } from '../../../core/exceptions/business.exception';
import { JwtPayload } from '../../autenticacao/domain/interfaces/jwt-payload.interface';
import { ExecutorPropostaIa } from '../../proposta-ia/domain/executor-proposta-ia';
import { validarDadosDaProposta } from '../../proposta-ia/domain/validar-dados-da-proposta';
import { AtividadeService } from '../services/atividade.service';

/**
 * Executor da proposta `ALTERAR_ATIVIDADE`: altera pela `AtividadeService` com o usuário do token (valem o dono da atividade e a recusa
 * de mudar o status com execução em andamento; o erro da service segue, nada é reimplementado aqui). Guarda no resultado os valores de
 * antes e os aplicados. Desfazer devolve os de antes, mas só se a atividade ainda está como a proposta a deixou.
 */
@Injectable()
export class AlterarAtividadeExecutor implements ExecutorPropostaIa {
  readonly tipo = TipoPropostaIaEnum.ALTERAR_ATIVIDADE;

  constructor(private readonly atividadeService: AtividadeService) {}

  validar(dados: Record<string, unknown>): void {
    const entrada = validarDadosDaProposta(PropostaAlterarAtividadeDadosDto, dados);
    if (entrada.status === undefined && entrada.prioridade === undefined && entrada.nome === undefined) {
      throw new BusinessException('A proposta não altera nada na atividade');
    }
  }

  async executar(dados: Record<string, unknown>, usuarioAtivo: JwtPayload): Promise<Record<string, unknown>> {
    const entrada = validarDadosDaProposta(PropostaAlterarAtividadeDadosDto, dados);
    const atual = (await this.atividadeService.recuperar({ id: entrada.atividadeId }, usuarioAtivo)).dados;
    if (!atual) throw new BusinessException('Atividade não encontrada');

    await this.atividadeService.alterar(
      { id: entrada.atividadeId, status: entrada.status, prioridade: entrada.prioridade, nome: entrada.nome },
      usuarioAtivo,
    );
    return {
      atividadeId: entrada.atividadeId,
      ...(entrada.status !== undefined ? { status: entrada.status, statusAnterior: atual.status } : {}),
      ...(entrada.prioridade !== undefined ? { prioridade: entrada.prioridade, prioridadeAnterior: atual.prioridade.codigo } : {}),
      ...(entrada.nome !== undefined ? { nome: entrada.nome, nomeAnterior: atual.nome } : {}),
    };
  }

  async desfazer(resultado: Record<string, unknown>, usuarioAtivo: JwtPayload): Promise<void> {
    const atividadeId = Number(resultado['atividadeId']);
    if (!Number.isInteger(atividadeId)) throw new BusinessException('Não há atividade a desfazer nesta proposta');
    const atual = (await this.atividadeService.recuperar({ id: atividadeId }, usuarioAtivo)).dados;
    if (!atual) throw new BusinessException('Atividade não encontrada');

    const mudouDepois =
      (resultado['status'] !== undefined && atual.status !== resultado['status']) ||
      (resultado['prioridade'] !== undefined && atual.prioridade.codigo !== resultado['prioridade']) ||
      (resultado['nome'] !== undefined && atual.nome !== resultado['nome']);
    if (mudouDepois) throw new BusinessException('A atividade mudou depois desta alteração: não dá para desfazer com segurança');

    await this.atividadeService.alterar(
      {
        id: atividadeId,
        status: resultado['statusAnterior'] as never,
        prioridade: resultado['prioridadeAnterior'] as never,
        nome: resultado['nomeAnterior'] as string | undefined,
      },
      usuarioAtivo,
    );
  }

  /** Obsoleta quando a atividade já está como a proposta pede (o usuário alterou à mão). */
  async estaObsoleta(dados: Record<string, unknown>, usuarioAtivo: JwtPayload): Promise<boolean> {
    const entrada = validarDadosDaProposta(PropostaAlterarAtividadeDadosDto, dados);
    const atual = (await this.atividadeService.recuperar({ id: entrada.atividadeId }, usuarioAtivo)).dados;
    if (!atual) return false;
    return (
      (entrada.status === undefined || atual.status === entrada.status) &&
      (entrada.prioridade === undefined || atual.prioridade.codigo === entrada.prioridade) &&
      (entrada.nome === undefined || atual.nome === entrada.nome)
    );
  }
}
