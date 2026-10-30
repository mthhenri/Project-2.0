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
  // Planejamento (task 234): a conversa roda no nível padrão (era o analítico, caro demais; decisão do autor de 2026-10-27) e escala para o analítico
  // pela ferramenta `aprofundar_analise_do_plano` só quando o trabalho pede. Os três prompts por aba entram nessa mesma conversa.
  [TipoPromptEnum.PLANEJAMENTO]: NivelIaEnum.PADRAO,
  [TipoPromptEnum.PLANO_DESCRICAO_TECNICA]: NivelIaEnum.PADRAO,
  [TipoPromptEnum.PLANO_DESCRICAO_CLIENTE]: NivelIaEnum.PADRAO,
  [TipoPromptEnum.PLANO_DOCUMENTACAO]: NivelIaEnum.PADRAO,
  // Alterar trecho (task 260): feature de uso frequente, então o nível padrão (era o analítico, caro demais); a regra de encaixe recusa a resposta que mexe fora da seleção.
  [TipoPromptEnum.ALTERAR_TRECHO]: NivelIaEnum.PADRAO,
  // Revisão do relatório (task 270): o nível padrão que a revisão já usava.
  [TipoPromptEnum.REVISAO_RELATORIO]: NivelIaEnum.PADRAO,
};

/** Quantas narrativas um teste de prompt aceita (cada uma custa duas chamadas à IA). */
export const MAXIMO_DE_NARRATIVAS = 5;
