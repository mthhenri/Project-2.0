import { RelatorioInconsistenciaDto } from './RelatorioInconsistenciaDto';

/** Resultado da revisão por IA — recorte computado. */
export class RelatorioRevisaoDto {
  resumo: string;
  inconsistencias: RelatorioInconsistenciaDto[];
}
