import { IsNumber, IsOptional, Min } from 'class-validator';

export class DemandaUsuarioAtribuirDto {
  /**
   * Demanda alvo. Injetada pela controller a partir de `@Param('id')` (§7.2) —
   * não enviada no corpo; opcional na validação por isso.
   */
  @IsOptional()
  @IsNumber()
  @Min(1)
  demandaId?: number;

  @IsNumber()
  @Min(1)
  usuarioId: number;
}
