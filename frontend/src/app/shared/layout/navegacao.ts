/** Itens da navegação principal (barra lateral). `tecla` é a segunda tecla do atalho `g` + letra. */
export interface ItemNavegacao {
  label: string;
  icone: string;
  rotaLink: string;
  tecla: string;
  somenteGestor: boolean;
  /** Só administrador vê o item (a rota correspondente usa `administradorGuard`). */
  somenteAdministrador?: boolean;
}

export const ITENS_NAVEGACAO: readonly ItemNavegacao[] = [
  { label: 'Ponto',      icone: 'pi pi-clock',        rotaLink: '/ponto',      tecla: 'p', somenteGestor: false },
  { label: 'Calendário', icone: 'pi pi-calendar',     rotaLink: '/calendario', tecla: 'c', somenteGestor: true  },
  { label: 'Projetos',   icone: 'pi pi-folder',       rotaLink: '/projeto',    tecla: 'j', somenteGestor: true  },
  { label: 'Demandas',   icone: 'pi pi-sitemap',      rotaLink: '/demanda',    tecla: 'd', somenteGestor: false },
  { label: 'Atividades', icone: 'pi pi-check-square', rotaLink: '/atividade',  tecla: 'a', somenteGestor: false },
  { label: 'Execuções',  icone: 'pi pi-play',         rotaLink: '/execucao',   tecla: 'e', somenteGestor: false },
  { label: 'Tags',       icone: 'pi pi-tag',          rotaLink: '/tag',        tecla: 't', somenteGestor: true  },
  { label: 'Usuários',   icone: 'pi pi-users',        rotaLink: '/usuario',    tecla: 'u', somenteGestor: true  },
  { label: 'IA',         icone: 'pi pi-sparkles',     rotaLink: '/configuracao-ia', tecla: 'i', somenteGestor: true, somenteAdministrador: true },
];
