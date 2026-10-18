import { Type } from 'class-transformer';
import { IsInt, Min } from 'class-validator';

/** Entrada da ferramenta `consultar_demanda` (gestor): a demanda (o id vem de `listar_demandas_do_projeto`). */
export class DemandaConsultarDto {
  @IsInt()
  @Min(1)
  @Type(() => Number)
  demandaId: number;
}

/** Uma atividade da demanda como a IA a lê. */
export interface AtividadeDaDemandaDto {
  id: number;
  nome: string;
  status: string;
  usuario: string;
  minutosExecutados: number;
  emExecucao: boolean;
}

/** O que a ferramenta `consultar_demanda` devolve à IA (os textos longos vêm cortados, com a marca `textoCortado`). */
export interface DemandaConsultadaDto {
  id: number;
  nome: string;
  projetoId: number;
  demandaPaiId: number | null;
  isEstrutural: boolean;
  status: string;
  horasEstimadas: number;
  previsaoFimData: string | null;
  descricaoTecnica: string | null;
  descricaoCliente: string | null;
  documentacao: string | null;
  textoCortado: boolean;
  tags: string[];
  atividades: AtividadeDaDemandaDto[];
  totalAtividades: number;
  haMaisAtividades: boolean;
}
