import { Injectable } from '@nestjs/common';
import { ProporCriarProjetoDto, TipoProjetoStatusEnum, TipoPropostaIaEnum, temPermissaoDeGestor } from '@project20/shared';
import { BusinessException } from '../../../core/exceptions/business.exception';
import { UnauthorizedAccessException } from '../../../core/exceptions/unauthorized-access.exception';
import { JwtPayload } from '../../autenticacao/domain/interfaces/jwt-payload.interface';
import { ExecutorPropostaIa } from '../../proposta-ia/domain/executor-proposta-ia';
import { validarDadosDaProposta } from '../../proposta-ia/domain/validar-dados-da-proposta';
import { escolherCorDoProjeto, derivarCodigoDoProjeto } from '../domain/dados-do-projeto-proposto';
import { ProjetoRepository } from '../repositories/projeto.repository';
import { ProjetoService } from '../services/projeto.service';

/**
 * Executor da proposta `CRIAR_PROJETO`: cria pela `ProjetoService` (código único e datas valem como na tela). A `ProjetoService.criar`
 * não confere o tipo do usuário (quem barra é o `@GestorOnly` da controller), então o executor confere. O projeto nasce ATIVO.
 * Desfazer só vale enquanto o projeto não tem nenhuma demanda.
 */
@Injectable()
export class CriarProjetoExecutor implements ExecutorPropostaIa {
  readonly tipo = TipoPropostaIaEnum.CRIAR_PROJETO;

  constructor(
    private readonly projetoService: ProjetoService,
    private readonly projetoRepositorio: ProjetoRepository,
  ) {}

  validar(dados: Record<string, unknown>): void {
    validarDadosDaProposta(ProporCriarProjetoDto, dados);
  }

  async executar(dados: Record<string, unknown>, usuarioAtivo: JwtPayload): Promise<Record<string, unknown>> {
    this.exigirGestor(usuarioAtivo);
    const entrada = validarDadosDaProposta(ProporCriarProjetoDto, dados);
    const criado = await this.projetoService.criar({
      nome: entrada.nome,
      codigo: (entrada.codigo ?? derivarCodigoDoProjeto(entrada.nome)).trim().toUpperCase(),
      cor: entrada.cor ?? escolherCorDoProjeto(entrada.nome),
      status: TipoProjetoStatusEnum.ATIVO,
      inicioData: entrada.inicioData,
      previsaoFimData: entrada.previsaoFimData,
    });
    return { projetoId: criado.dados?.id, nome: entrada.nome };
  }

  async desfazer(resultado: Record<string, unknown>, usuarioAtivo: JwtPayload): Promise<void> {
    this.exigirGestor(usuarioAtivo);
    const projetoId = Number(resultado['projetoId']);
    if (!Number.isInteger(projetoId)) throw new BusinessException('Não há projeto a desfazer nesta proposta');
    await this.projetoService.recuperar({ id: projetoId }, usuarioAtivo);
    if (await this.projetoRepositorio.possuiDemandas({ id: projetoId })) {
      throw new BusinessException('O projeto já tem demandas: não dá para desfazer a criação');
    }
    await this.projetoService.excluir({ id: projetoId });
  }

  private exigirGestor(usuarioAtivo: JwtPayload): void {
    if (!temPermissaoDeGestor(usuarioAtivo.tipo)) throw new UnauthorizedAccessException('Apenas gestores podem criar projetos');
  }
}
