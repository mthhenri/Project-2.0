/** Se os check-ins do próprio usuário estão suspensos (reunião, por exemplo). Vale até ele voltar ou até a meia-noite do fuso do sistema. */
export class CheckinSuspensaoConsultadaDto {
  suspenso: boolean;
  /** Quando a suspensão começou; `null` se não está suspenso. */
  desde: Date | null;
  /** Por que (ex.: "reunião de planejamento"); `null` sem motivo ou sem suspensão. */
  motivo: string | null;
}
