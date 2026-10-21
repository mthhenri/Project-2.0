/** Interno (repository): grava o conjunto inteiro de preferências do chat de uma pessoa (a data do silêncio já convertida). */
export interface MensagemDiretaPreferenciaInternoAlterarDto {
  usuarioId: number;
  avisosAtivos: boolean;
  avisoDesktopAtivo: boolean;
  somAtivo: boolean;
  silenciadoAteDate: Date | null;
  atalhoGlobal: string;
}
