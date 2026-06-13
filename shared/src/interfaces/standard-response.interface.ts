export interface StandardResponse<TDados = void> {
  sucesso: boolean;
  dados: TDados | null;
  mensagem: string;
  erros?: string[];
}
