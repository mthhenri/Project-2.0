import { Type } from 'class-transformer';
import { IsInt, Min } from 'class-validator';

/** Entrada da ferramenta `listar_demandas_do_projeto`: o projeto (o id vem de `listar_projetos`). */
export class DemandasDoProjetoListarDto {
  @IsInt()
  @Min(1)
  @Type(() => Number)
  projetoId: number;
}

/** Uma demanda como a IA a lê (o caminho mostra onde ela está na árvore). */
export interface DemandaDaFerramentaDto {
  id: number;
  nome: string;
  caminho: string;
  isEstrutural: boolean;
  status: string;
  /** Só para o desenvolvedor: ele é membro desta demanda (a lista dele traz as do projeto inteiro). Ausente para o gestor. */
  participa?: boolean;
}

/** O que a ferramenta `listar_demandas_do_projeto` devolve à IA. */
export interface DemandasDoProjetoListadasDto {
  demandas: DemandaDaFerramentaDto[];
  total: number;
  haMais: boolean;
}
