/** Entrada da ferramenta `listar_projetos`: nenhuma (são os projetos que o usuário pode ver). */
export class ProjetosListarDto {}

/** Um projeto como a IA o lê. */
export interface ProjetoDaFerramentaDto {
  id: number;
  nome: string;
  codigo: string;
  status: string;
}

/** O que a ferramenta `listar_projetos` devolve à IA. */
export interface ProjetosListadosDto {
  projetos: ProjetoDaFerramentaDto[];
  total: number;
  haMais: boolean;
}
