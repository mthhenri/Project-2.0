import { TipoAnotacaoEnum } from '../../enums/tipo-anotacao.enum';

/** Uma seção do pad como a IA a lê. */
export interface PadSecaoConsultadaDto {
  tipo: TipoAnotacaoEnum;
  /** O nome da seção na tela. */
  rotulo: string;
  /** Markdown. Em Feito, só o bloco do dia pedido. */
  texto: string;
  /** O texto passou do limite e foi cortado. */
  truncado: boolean;
}

/** O que a ferramenta `consultar_pad` devolve à IA. */
export interface PadConsultadoDto {
  /** Hoje, `dd/MM`, no fuso do sistema (o título do dia em Feito). */
  hoje: string;
  secoes: PadSecaoConsultadaDto[];
}
