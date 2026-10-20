import { Inject, Injectable } from '@nestjs/common';
import {
  IaCustoConsultadoDto,
  IaCustoConsultarDto,
  IaModeloPrecoAlteradoDto,
  IaModeloPrecoAlterarDto,
  NivelIaEnum,
  StandardResponse,
  temPermissaoDeAdministrador,
} from '@project20/shared';
import { ConfigService } from '../../../config/config.service';
import { UnauthorizedAccessException } from '../../../core/exceptions/unauthorized-access.exception';
import { JwtPayload } from '../../autenticacao/domain/interfaces/jwt-payload.interface';
import { ARMAZENAMENTO_DE_CHAT, ArmazenamentoDeChat } from '../../chat/repositories/armazenamento-de-chat';
import { ConfiguracaoIaService } from '../../configuracao-ia/services/configuracao-ia.service';
import { limitesDoMes } from '../../projeto/domain/limites-do-mes';
import { agruparPeloNomeConhecido, listarPeriodos, montarModelos, montarPeriodos, somarTotais } from '../domain/calculo-de-custo';

/**
 * Custo da IA (tasks 201 e 202), só para o administrador: os tokens vêm das mensagens do chat (cada resposta da IA grava os seus, somando as
 * chamadas das ferramentas do turno, task 188) e o preço de cada modelo vive na configuração da IA. Não há tabela de uso: o que não passa
 * pelo chat (relatório, assistente de descrição, nomeação, sugestões) não entra na conta.
 */
@Injectable()
export class IaCustoService {
  constructor(
    @Inject(ARMAZENAMENTO_DE_CHAT) private readonly armazenamentoDeChat: ArmazenamentoDeChat,
    private readonly configuracaoIaService: ConfiguracaoIaService,
    private readonly configService: ConfigService,
  ) {}

  async consultar(dto: IaCustoConsultarDto, usuarioAtivo: JwtPayload): Promise<StandardResponse<IaCustoConsultadoDto>> {
    this.validarAdministrador(usuarioAtivo, 'Apenas administradores consultam os custos da IA');
    const porMes = dto.mes === undefined;
    const { dataInicio, dataFim } = porMes ? { dataInicio: `${dto.ano}-01-01`, dataFim: `${dto.ano}-12-31` } : limitesDoMes(dto.ano, dto.mes as number);

    const [usosPorId, precos, configuracao] = await Promise.all([
      this.armazenamentoDeChat.somarTokens({ dataInicio, dataFim, porMes, fusoHorario: this.configService.obter().aplicacao.fusoHorario }),
      this.configuracaoIaService.listarPrecos(),
      this.configuracaoIaService.obterAtiva(),
    ]);
    // Os níveis são atribuídos aos modelos do provedor padrão; o que um fallback respondeu entra pelo nome do modelo gravado na mensagem.
    const modelosDoPadrao = configuracao.modelosProvedor[configuracao.provedor];
    const modelosPorNivel = {
      [NivelIaEnum.RAPIDO]: modelosDoPadrao?.modeloRapido ?? '',
      [NivelIaEnum.PADRAO]: modelosDoPadrao?.modeloPadrao ?? '',
      [NivelIaEnum.ANALITICO]: modelosDoPadrao?.modeloAnalitico ?? '',
    };
    const modelosEmUso = [...new Set(Object.values(modelosPorNivel))];
    const usos = agruparPeloNomeConhecido(usosPorId, [...new Set([...precos.map((preco) => preco.modelo), ...modelosEmUso])]);
    const modelos = montarModelos(usos, precos, modelosPorNivel);

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
    return { sucesso: true, dados: await this.configuracaoIaService.alterarPreco(dto), mensagem: 'Preço do modelo alterado com sucesso' };
  }

  private validarAdministrador(usuarioAtivo: JwtPayload, mensagem: string): void {
    if (!temPermissaoDeAdministrador(usuarioAtivo.tipo)) throw new UnauthorizedAccessException(mensagem);
  }
}
