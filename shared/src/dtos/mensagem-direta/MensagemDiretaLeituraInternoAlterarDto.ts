/** Interno (repository): grava (sem recuar) até onde a pessoa leu a conversa. Diferente do DTO da rota, já traz a conversa, o outro participante e a data resolvida. */
export interface MensagemDiretaLeituraInternoAlterarDto {
  conversaId: string;
  usuarioId: number;
  outroUsuarioId: number;
  lidaAteDate: Date;
}
