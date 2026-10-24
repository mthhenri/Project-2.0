/** Um grupo do diagrama (caixa colorida que reúne tabelas). `corIndice` (0 a 6) escolhe a cor na paleta da tela; o 7 é do "Sem grupo". */
export interface ModelagemGrupoDto {
  id: number;
  titulo: string;
  rotulo: string;
  corIndice: number;
}
