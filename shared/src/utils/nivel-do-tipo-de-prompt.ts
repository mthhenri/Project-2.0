import { NivelIaEnum } from '../enums/nivel-ia.enum';
import { TipoPromptEnum } from '../enums/tipo-prompt.enum';

/** O nível em que cada tipo de prompt roda de verdade (guarda-chuva do rework do chat); o teste de prompt usa o mesmo. */
export const NIVEL_DO_TIPO_DE_PROMPT: Record<TipoPromptEnum, NivelIaEnum> = {
  [TipoPromptEnum.CONVERSA]: NivelIaEnum.RAPIDO,
  [TipoPromptEnum.CHECKIN]: NivelIaEnum.RAPIDO,
  [TipoPromptEnum.DESCRICAO_EXECUCAO]: NivelIaEnum.PADRAO,
  [TipoPromptEnum.PAD]: NivelIaEnum.PADRAO,
  [TipoPromptEnum.PRIORIDADE]: NivelIaEnum.PADRAO,
  [TipoPromptEnum.ENTREVISTA_DEMANDA]: NivelIaEnum.ANALITICO,
  [TipoPromptEnum.CONEXAO_DEMANDA]: NivelIaEnum.ANALITICO,
  [TipoPromptEnum.DUVIDA_CODIGO]: NivelIaEnum.RAPIDO,
};

/** Quantas narrativas um teste de prompt aceita (cada uma custa duas chamadas à IA). */
export const MAXIMO_DE_NARRATIVAS = 5;
