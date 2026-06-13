export interface StandardResponse<TData = void> {
  sucesso: boolean;
  dados: TData | null;
  mensagem: string;
  erros?: string[];
}
