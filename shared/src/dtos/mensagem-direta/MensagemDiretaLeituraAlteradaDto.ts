/** O ponto até onde o usuário leu a conversa, como ficou gravado. */
export interface MensagemDiretaLeituraAlteradaDto {
  conversaId: string;
  /** Nunca recua: uma marcação mais antiga que a gravada mantém a gravada. */
  lidaAteDate: Date;
}
