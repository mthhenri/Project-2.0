/** As preferências do chat do usuário, como ficaram depois da alteração. */
export interface MensagemDiretaPreferenciaAlteradaDto {
  avisosAtivos: boolean;
  avisoDesktopAtivo: boolean;
  somAtivo: boolean;
  silenciadoAteDate: Date | null;
  atalhoGlobal: string;
}
