import { Type } from 'class-transformer';
import { IsInt, Min } from 'class-validator';

/** Entrada da ferramenta `consultar_grafo_do_projeto` (gestor): o projeto (o id vem de `listar_projetos`). */
export class GrafoDoProjetoConsultarDto {
  @IsInt()
  @Min(1)
  @Type(() => Number)
  projetoId: number;
}

/** Uma demanda do projeto, resumida; a hierarquia está em `paiId`. */
export interface DemandaDoGrafoDto {
  id: number;
  nome: string;
  status: string;
  isEstrutural: boolean;
  paiId: number | null;
  horasEstimadas: number;
  horasExecutadas: number;
  temDescricaoTecnica: boolean;
  temDescricaoCliente: boolean;
  tags: string[];
}

/** Uma conexão entre duas demandas (as arestas de hierarquia não entram: estão em `paiId`). */
export interface ConexaoDoGrafoDto {
  origemId: number;
  destinoId: number;
  bidirecional: boolean;
}

/** O que a ferramenta `consultar_grafo_do_projeto` devolve à IA. */
export interface GrafoDoProjetoConsultadoDto {
  projetoId: number;
  demandas: DemandaDoGrafoDto[];
  conexoes: ConexaoDoGrafoDto[];
  totalDemandas: number;
  haMaisDemandas: boolean;
}
