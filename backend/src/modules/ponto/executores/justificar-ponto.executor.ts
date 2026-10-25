import { Injectable } from '@nestjs/common';
import { PropostaJustificarPontoDadosDto, TipoPropostaIaEnum, temPermissaoDeGestor } from '@project20/shared';
import { BusinessException } from '../../../core/exceptions/business.exception';
import { UnauthorizedAccessException } from '../../../core/exceptions/unauthorized-access.exception';
import { JwtPayload } from '../../autenticacao/domain/interfaces/jwt-payload.interface';
import { PontoJustificativaRepository } from '../../ponto-justificativa/repositories/ponto-justificativa.repository';
import { PontoJustificativaService } from '../../ponto-justificativa/services/ponto-justificativa.service';
import { ExecutorPropostaIa } from '../../proposta-ia/domain/executor-proposta-ia';
import { validarDadosDaProposta } from '../../proposta-ia/domain/validar-dados-da-proposta';

/**
 * Executor da proposta `JUSTIFICAR_PONTO` (task 231): cria pela `PontoJustificativaService.criar` com o usuário do token, que valida a pessoa, a
 * jornada e a duplicidade. Só o gestor, para outra pessoa: a service não confere o tipo (quem barra é o `@GestorOnly` da controller), então o
 * executor confere. Desfazer exclui (soft delete) a justificativa criada, só se ela continua como a proposta a deixou.
 */
@Injectable()
export class JustificarPontoExecutor implements ExecutorPropostaIa {
  readonly tipo = TipoPropostaIaEnum.JUSTIFICAR_PONTO;

  constructor(
    private readonly pontoJustificativaService: PontoJustificativaService,
    private readonly pontoJustificativaRepositorio: PontoJustificativaRepository,
  ) {}

  validar(dados: Record<string, unknown>): void {
    validarDadosDaProposta(PropostaJustificarPontoDadosDto, dados);
  }

  async executar(dados: Record<string, unknown>, usuarioAtivo: JwtPayload): Promise<Record<string, unknown>> {
    this.exigirGestor(usuarioAtivo);
    const entrada = validarDadosDaProposta(PropostaJustificarPontoDadosDto, dados);
    if (entrada.usuarioId === usuarioAtivo.sub) throw new BusinessException('Só se justifica o ponto de outra pessoa, não o seu');
    const criada = (
      await this.pontoJustificativaService.criar(
        { usuarioId: entrada.usuarioId, diaData: entrada.diaData, nome: entrada.nome, descricao: entrada.descricao, horasCobertas: entrada.horasCobertas },
        usuarioAtivo,
      )
    ).dados;
    return { justificativaId: criada?.id, usuarioId: entrada.usuarioId, diaData: entrada.diaData, nome: entrada.nome, descricao: entrada.descricao, horasCobertas: entrada.horasCobertas };
  }

  async desfazer(resultado: Record<string, unknown>, usuarioAtivo: JwtPayload): Promise<void> {
    this.exigirGestor(usuarioAtivo);
    const justificativaId = Number(resultado['justificativaId']);
    if (!Number.isInteger(justificativaId)) throw new BusinessException('Não há justificativa a desfazer nesta proposta');
    const atual = await this.pontoJustificativaRepositorio.recuperar({ id: justificativaId });
    if (!atual) throw new BusinessException('A justificativa já foi excluída: não há o que desfazer');
    if (atual.nome !== resultado['nome'] || atual.descricao !== resultado['descricao'] || Number(atual.horasCobertas) !== Number(resultado['horasCobertas'])) {
      throw new BusinessException('A justificativa mudou depois: não dá para desfazer com segurança');
    }
    await this.pontoJustificativaService.excluir({ id: justificativaId });
  }

  /** Obsoleta quando o dia já tem justificativa dessa pessoa (alguém justificou à mão). */
  async estaObsoleta(dados: Record<string, unknown>, _usuarioAtivo: JwtPayload): Promise<boolean> {
    const entrada = validarDadosDaProposta(PropostaJustificarPontoDadosDto, dados);
    return this.pontoJustificativaRepositorio.validarPorUsuarioEDia({ usuarioId: entrada.usuarioId, diaData: entrada.diaData });
  }

  private exigirGestor(usuarioAtivo: JwtPayload): void {
    if (!temPermissaoDeGestor(usuarioAtivo.tipo)) throw new UnauthorizedAccessException('Só o gestor justifica o ponto');
  }
}
