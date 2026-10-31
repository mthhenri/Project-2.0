/** Pergunta se o leitor já avisou os participantes desta conversa no dia de `agora` (dia no fuso do sistema; uso interno da service). */
export interface MensagemDiretaSupervisaoAvisoVerificarDto {
  leitorUsuarioId: number;
  conversaId: string;
  agora: Date;
}
