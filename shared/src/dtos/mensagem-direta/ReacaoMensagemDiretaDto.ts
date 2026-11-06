/** A reação de uma pessoa a uma mensagem (task 314): o emoji que ela escolheu. Cada pessoa tem no máximo uma por mensagem. */
export interface ReacaoMensagemDiretaDto {
    usuarioId: number;
    /** O próprio emoji (um só). */
    reacao: string;
}
