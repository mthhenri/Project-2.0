/** Service → repository: o corpo de `ModelagemGrupoCriarDto` mais a ordem e a cor que a service escolheu. */
export interface ModelagemGrupoInternoCriarDto {
  titulo: string;
  rotulo: string;
  ordem: number;
  corIndice: number;
}
