import { IsIn, IsOptional, IsString, MaxLength } from 'class-validator';

/** Entrada da ferramenta `propor_suspender_checkin`: o motivo da suspensão (opcional, só para o cartão e o registro). */
export class ProporSuspenderCheckinDto {
  @IsOptional()
  @IsString()
  @MaxLength(200)
  motivo?: string;
}

/** Entrada da ferramenta `propor_retomar_checkin`: nenhuma. */
export class ProporRetomarCheckinDto {}

export const ACOES_DE_CHECKIN_DA_IA = ['SUSPENDER', 'RETOMAR'] as const;
export type AcaoDeCheckinDaIa = (typeof ACOES_DE_CHECKIN_DA_IA)[number];

/** Os dados da proposta `SUSPENDER_CHECKIN`: suspender os check-ins ou retomá-los (a mesma proposta serve às duas ações). */
export class PropostaSuspenderCheckinDadosDto extends ProporSuspenderCheckinDto {
  @IsIn(ACOES_DE_CHECKIN_DA_IA)
  acao: AcaoDeCheckinDaIa;
}
