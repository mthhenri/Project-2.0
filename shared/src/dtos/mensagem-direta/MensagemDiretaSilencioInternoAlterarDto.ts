/** Interno (repository): silencia ou reativa a conversa da pessoa, sem apagar até onde ela leu. */
export interface MensagemDiretaSilencioInternoAlterarDto {
  conversaId: string;
  usuarioId: number;
  outroUsuarioId: number;
  silenciada: boolean;
}
