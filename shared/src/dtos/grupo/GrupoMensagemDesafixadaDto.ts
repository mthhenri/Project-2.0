/** A mensagem desafixada; `estavaFixada` falso quando ela já não estava. */
export interface GrupoMensagemDesafixadaDto {
    grupoId: number;
    mensagemId: string;
    estavaFixada: boolean;
}
