/** Confere se já existe outro grupo ativo com o mesmo rótulo (sem diferenciar maiúsculas); `idExcluir` ignora o próprio grupo ao renomear. */
export interface ModelagemGrupoValidarRotuloDto {
  rotulo: string;
  idExcluir?: number;
}
