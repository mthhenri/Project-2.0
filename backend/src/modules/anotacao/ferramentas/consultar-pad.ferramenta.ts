import { Injectable } from '@nestjs/common';
import { diaMesNoFuso, PadConsultadoDto, PadConsultarDto, TipoAnotacaoEnum } from '@project20/shared';
import { ConfigService } from '../../../config/config.service';
import { JwtPayload } from '../../autenticacao/domain/interfaces/jwt-payload.interface';
import { FerramentaIa } from '../../ferramenta-ia/domain/ferramenta-ia';
import { blocoDoDiaNoFeito } from '../domain/anotacao-texto';
import { ROTULO_SECAO_DO_PAD } from '../domain/rotulo-secao-do-pad';
import { AnotacaoService } from '../services/anotacao.service';

/** Tamanho máximo do texto de uma seção que volta à IA (o resto é cortado e avisado). */
export const LIMITE_CARACTERES_DA_SECAO = 8000;

/**
 * Leitura do pad do **próprio** usuário, só das seções pedidas (carregar só o que precisa economiza tokens). Em Feito vem só o bloco do
 * dia pedido (hoje, por padrão), porque o resto são dias antigos. Chama a `AnotacaoService` com o usuário do token.
 */
@Injectable()
export class ConsultarPadFerramenta extends FerramentaIa<PadConsultarDto> {
  readonly nome = 'consultar_pad';
  readonly descricao =
    'Lê o pad do usuário (anotações em Markdown em cinco seções: EM_ANDAMENTO, FEITO, PENDENCIA, LEMBRETE e PESSOAL). Peça só as seções de que precisa. ' +
    'Em FEITO vem apenas o bloco do dia (hoje por padrão; use diaDoFeito no formato dd/MM para outro dia). Use no começo do dia para retomar o contexto ' +
    '("ontem você parou em…") e antes de propor trocar um trecho do pad, para copiar o trecho exatamente.';
  readonly tipo = 'LEITURA' as const;
  readonly permissao = 'QUALQUER' as const;
  readonly classeDeEntrada = PadConsultarDto;

  constructor(
    private readonly anotacaoService: AnotacaoService,
    private readonly configService: ConfigService,
  ) {
    super();
  }

  async executar(entrada: PadConsultarDto, usuarioAtivo: JwtPayload): Promise<PadConsultadoDto> {
    const fuso = this.configService.obter().aplicacao.fusoHorario;
    const hoje = diaMesNoFuso(this.agora(), fuso);
    const lidas = (await this.anotacaoService.listar({ usuarioId: usuarioAtivo.sub, tipos: entrada.secoes }, usuarioAtivo)).dados ?? [];

    return {
      hoje,
      secoes: lidas.map((secao) => {
        const texto = secao.tipo === TipoAnotacaoEnum.FEITO ? blocoDoDiaNoFeito(secao.texto, entrada.diaDoFeito ?? hoje) : secao.texto;
        const truncado = texto.length > LIMITE_CARACTERES_DA_SECAO;
        return { tipo: secao.tipo, rotulo: ROTULO_SECAO_DO_PAD[secao.tipo], texto: truncado ? texto.slice(0, LIMITE_CARACTERES_DA_SECAO) : texto, truncado };
      }),
    };
  }

  /** Separado para os testes fixarem o instante. */
  protected agora(): Date {
    return new Date();
  }
}
