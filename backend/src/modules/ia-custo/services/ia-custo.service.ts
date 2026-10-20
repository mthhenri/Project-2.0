import { Injectable, Logger } from '@nestjs/common';
import {
  IaCustoConsultadoDto,
  IaCustoConsultarDto,
  IaModeloPrecoAlteradoDto,
  IaModeloPrecoAlterarDto,
  IaUsoRegistrarDto,
  StandardResponse,
  temPermissaoDeAdministrador,
} from '@project20/shared';
import { UnauthorizedAccessException } from '../../../core/exceptions/unauthorized-access.exception';
import { JwtPayload } from '../../autenticacao/domain/interfaces/jwt-payload.interface';
import { ConfiguracaoIaService } from '../../configuracao-ia/services/configuracao-ia.service';
import { limitesDoMes } from '../../projeto/domain/limites-do-mes';
import { listarPeriodos, montarModelos, montarPeriodos, somarTotais } from '../domain/calculo-de-custo';
import { IaCustoRepository } from '../repositories/ia-custo.repository';

/** Custo da IA (task 201): grava o uso de cada chamada e monta a consulta da aba "Custos" (só o administrador). */
@Injectable()
export class IaCustoService {
  private readonly logger = new Logger(IaCustoService.name);

  constructor(
    private readonly iaCustoRepositorio: IaCustoRepository,
    private readonly configuracaoIaService: ConfiguracaoIaService,
  ) {}

  /** Nunca derruba a chamada de IA que já deu certo: se a gravação falha, o custo daquela chamada se perde e o erro vai para o log. */
  async registrarUso(dto: IaUsoRegistrarDto): Promise<void> {
    try {
      await this.iaCustoRepositorio.registrarUso(dto);
    } catch (erro) {
      this.logger.error(`Não foi possível registrar o uso de IA do modelo ${dto.modelo}`, erro instanceof Error ? erro.stack : String(erro));
    }
  }

  async consultar(dto: IaCustoConsultarDto, usuarioAtivo: JwtPayload): Promise<StandardResponse<IaCustoConsultadoDto>> {
    this.validarAdministrador(usuarioAtivo, 'Apenas administradores consultam os custos da IA');
    const porMes = dto.mes === undefined;
    const { dataInicio, dataFim } = porMes ? { dataInicio: `${dto.ano}-01-01`, dataFim: `${dto.ano}-12-31` } : limitesDoMes(dto.ano, dto.mes as number);

    const [usos, precos, configuracao] = await Promise.all([
      this.iaCustoRepositorio.somarUso({ dataInicio, dataFim, porMes }),
      this.iaCustoRepositorio.listarPrecos(),
      this.configuracaoIaService.obterAtiva(),
    ]);
    const modelosEmUso = [...new Set([configuracao.modeloRapido, configuracao.modeloPadrao, configuracao.modeloAnalitico])];
    const modelos = montarModelos(usos, precos, modelosEmUso);

    return {
      sucesso: true,
      dados: {
        ano: dto.ano,
        mes: dto.mes ?? null,
        totais: somarTotais(modelos),
        modelos,
        periodos: montarPeriodos(usos, precos, listarPeriodos(dto.ano, dto.mes)),
      },
      mensagem: 'Custos da IA consultados com sucesso',
    };
  }

  async alterarPreco(dto: IaModeloPrecoAlterarDto, usuarioAtivo: JwtPayload): Promise<StandardResponse<IaModeloPrecoAlteradoDto>> {
    this.validarAdministrador(usuarioAtivo, 'Apenas administradores alteram o preço de um modelo');
    return { sucesso: true, dados: await this.iaCustoRepositorio.salvarPreco(dto), mensagem: 'Preço do modelo alterado com sucesso' };
  }

  private validarAdministrador(usuarioAtivo: JwtPayload, mensagem: string): void {
    if (!temPermissaoDeAdministrador(usuarioAtivo.tipo)) throw new UnauthorizedAccessException(mensagem);
  }
}
