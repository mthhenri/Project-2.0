/** Grava a auditoria de uma abertura de conversa de terceiros (uso interno da service). */
export interface MensagemDiretaSupervisaoRegistrarDto {
  leitorUsuarioId: number;
  conversaId: string;
  usuarioMenorId: number;
  usuarioMaiorId: number;
}
