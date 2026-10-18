/** O que um dos dois prompts respondeu a uma narrativa: o texto ou o erro (nunca os dois). */
export interface PromptTesteSaidaDto {
  texto: string | null;
  erro: string | null;
  tokensEntrada: number;
  tokensSaida: number;
}
