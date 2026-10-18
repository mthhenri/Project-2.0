import { Type } from 'class-transformer';
import { IsInt, IsOptional, Max, Min } from 'class-validator';

/**
 * Entrada da ferramenta `listar_atividades_paradas` (gestor): atividades em desenvolvimento, sem execução em andamento, cuja última
 * execução (ou criação, se nunca teve) foi há `diasParada` dias ou mais (padrão 3), podendo filtrar por demanda ou pessoa.
 */
export class AtividadesParadasListarDto {
  @IsOptional()
  @IsInt()
  @Min(1)
  @Type(() => Number)
  demandaId?: number;

  @IsOptional()
  @IsInt()
  @Min(1)
  @Type(() => Number)
  usuarioId?: number;

  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(365)
  @Type(() => Number)
  diasParada?: number;
}

/** Uma atividade parada. */
export interface AtividadeParadaDto {
  id: number;
  nome: string;
  usuario: string;
  demanda: string;
  projeto: string;
  /** Dias desde a última execução; sem nenhuma execução, desde a criação da atividade. */
  diasSemExecucao: number;
  nuncaExecutada: boolean;
}

/** O que a ferramenta `listar_atividades_paradas` devolve à IA. */
export interface AtividadesParadasListadasDto {
  diasParada: number;
  atividades: AtividadeParadaDto[];
  total: number;
  haMais: boolean;
}
