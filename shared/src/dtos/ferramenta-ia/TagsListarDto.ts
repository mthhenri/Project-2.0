/** Entrada da ferramenta `listar_tags`: nenhuma (são todas as tags ativas). */
export class TagsListarDto {}

/** Uma tag como a IA a lê. */
export interface TagDaFerramentaDto {
  id: number;
  nome: string;
  cor: string;
}

/** O que a ferramenta `listar_tags` devolve à IA. */
export interface TagsListadasDto {
  tags: TagDaFerramentaDto[];
  total: number;
  haMais: boolean;
}
