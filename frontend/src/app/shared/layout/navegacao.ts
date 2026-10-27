/** Grupos de itens parecidos da barra lateral (task 223). São os mesmos para todos os perfis. */
export type GrupoNavegacao = 'DIA_A_DIA' | 'PROJETOS' | 'GESTAO' | 'IA';

/** Os grupos na ordem em que aparecem, com o título mostrado no separador. */
export const GRUPOS_NAVEGACAO: readonly { grupo: GrupoNavegacao; titulo: string }[] = [
  { grupo: 'DIA_A_DIA', titulo: 'Dia a dia' },
  { grupo: 'PROJETOS',  titulo: 'Projetos' },
  { grupo: 'GESTAO',    titulo: 'Gestão' },
  { grupo: 'IA',        titulo: 'IA' },
];

/** Itens da navegação principal (barra lateral). `tecla` é a segunda tecla do atalho `g` + letra. */
export interface ItemNavegacao {
  label: string;
  icone: string;
  rotaLink: string;
  tecla: string;
  somenteGestor: boolean;
  /** Só administrador vê o item (a rota correspondente usa `administradorGuard`). */
  somenteAdministrador?: boolean;
  /** Grupo do item. Sem grupo, o item fica sozinho no fundo da barra (a Modelagem: não é tela do dia a dia). */
  grupo?: GrupoNavegacao;
  /**
   * A tela que o chat substitui: fica desabilitada enquanto a IA está no ar (para todos, ou só para o desenvolvedor) e volta quando ela
   * cai ou é desligada (fallback).
   */
  substituidoPelaIa?: 'TODOS' | 'SOMENTE_DESENVOLVEDOR';
  /** Item que só funciona com a IA no ar (o chat): com a IA desligada ou fora do ar o ícone ganha um selo de "proibido", para não parecer ativo. */
  exigeIa?: boolean;
}

export const ITENS_NAVEGACAO: readonly ItemNavegacao[] = [
  { label: 'Chat',       icone: 'pi pi-comments',     rotaLink: '/chat',       tecla: 'h', somenteGestor: false, grupo: 'DIA_A_DIA', exigeIa: true },
  { label: 'Atividades', icone: 'pi pi-check-square', rotaLink: '/atividade',  tecla: 'a', somenteGestor: false, grupo: 'DIA_A_DIA' },
  { label: 'Execuções',  icone: 'pi pi-play',         rotaLink: '/execucao',   tecla: 'e', somenteGestor: false, grupo: 'DIA_A_DIA' },
  { label: 'Ponto',      icone: 'pi pi-clock',        rotaLink: '/ponto',      tecla: 'p', somenteGestor: false, grupo: 'DIA_A_DIA' },
  { label: 'Documentações', icone: 'pi pi-book',      rotaLink: '/documentacao', tecla: 'o', somenteGestor: false, grupo: 'DIA_A_DIA' },
  { label: 'Projetos',   icone: 'pi pi-folder',       rotaLink: '/projeto',    tecla: 'j', somenteGestor: true,  grupo: 'PROJETOS' },
  { label: 'Demandas',   icone: 'pi pi-sitemap',      rotaLink: '/demanda',    tecla: 'd', somenteGestor: false, grupo: 'PROJETOS' },
  { label: 'Calendário', icone: 'pi pi-calendar',     rotaLink: '/calendario', tecla: 'c', somenteGestor: true,  grupo: 'GESTAO' },
  { label: 'Tags',       icone: 'pi pi-tag',          rotaLink: '/tag',        tecla: 't', somenteGestor: true,  grupo: 'GESTAO' },
  { label: 'Usuários',   icone: 'pi pi-users',        rotaLink: '/usuario',    tecla: 'u', somenteGestor: true,  grupo: 'GESTAO' },
  { label: 'IA Config.', icone: 'pi pi-sparkles',     rotaLink: '/configuracao-ia', tecla: 'i', somenteGestor: true, somenteAdministrador: true, grupo: 'IA' },
  { label: 'Modelagem',  icone: 'pi pi-database',     rotaLink: '/modelagem',  tecla: 'm', somenteGestor: false },
];

/** Um grupo com os itens que o usuário vê, já na ordem da barra. */
export interface GrupoNavegacaoVisivel<T extends ItemNavegacao> {
  grupo: GrupoNavegacao;
  titulo: string;
  itens: T[];
}

/**
 * Separa os itens visíveis em grupos, na ordem de `GRUPOS_NAVEGACAO`, descartando o grupo que ficou sem item para este usuário; os
 * itens sem grupo vão para o fundo da barra. A ordem dos itens dentro do grupo é a da lista recebida.
 */
export function agruparItensNavegacao<T extends ItemNavegacao>(itens: readonly T[]): { grupos: GrupoNavegacaoVisivel<T>[]; fundo: T[] } {
  const grupos = GRUPOS_NAVEGACAO
    .map(({ grupo, titulo }) => ({ grupo, titulo, itens: itens.filter((item) => item.grupo === grupo) }))
    .filter((grupoVisivel) => grupoVisivel.itens.length > 0);
  return { grupos, fundo: itens.filter((item) => item.grupo === undefined) };
}
