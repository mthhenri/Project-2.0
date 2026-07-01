import { Type } from 'class-transformer';
import { IsDateString, IsEnum, IsInt, IsOptional, Max, Min, ValidateIf } from 'class-validator';
import { RelatorioPeriodoTipoEnum } from '../../enums/relatorio-periodo-tipo.enum';

export class RelatorioExecucaoConsultarDto {
  /**
   * Projeto do relatório. Injetado pela controller a partir de `@Query('projetoId')`
   * (§7.2) — opcional na validação por isso.
   */
  @IsOptional()
  @IsInt()
  @Min(1)
  @Type(() => Number)
  projetoId?: number;

  @IsEnum(RelatorioPeriodoTipoEnum)
  periodoTipo: RelatorioPeriodoTipoEnum;

  @ValidateIf(
    (dto: RelatorioExecucaoConsultarDto) =>
      dto.periodoTipo === RelatorioPeriodoTipoEnum.ANUAL ||
      dto.periodoTipo === RelatorioPeriodoTipoEnum.MENSAL,
  )
  @IsInt()
  @Min(2000)
  @Max(2100)
  @Type(() => Number)
  ano?: number;

  @ValidateIf((dto: RelatorioExecucaoConsultarDto) => dto.periodoTipo === RelatorioPeriodoTipoEnum.MENSAL)
  @IsInt()
  @Min(1)
  @Max(12)
  @Type(() => Number)
  mes?: number;

  @ValidateIf((dto: RelatorioExecucaoConsultarDto) => dto.periodoTipo === RelatorioPeriodoTipoEnum.CUSTOM)
  @IsDateString()
  dataInicio?: string;

  @ValidateIf((dto: RelatorioExecucaoConsultarDto) => dto.periodoTipo === RelatorioPeriodoTipoEnum.CUSTOM)
  @IsDateString()
  dataFim?: string;
}
