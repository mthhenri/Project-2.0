/** Interno (repository): o plano tem fonte trazida por alguém que não é `usuarioId` (quem criou o plano)? Alimenta a trava de marcar o plano como solo (task 397). */
export interface PlanoFonteDeOutroVerificarDto {
    planoId: number;
    usuarioId: number;
}
