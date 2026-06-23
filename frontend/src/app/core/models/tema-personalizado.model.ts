import { palette, type ColorScale } from '@primeng/themes';

/**
 * Paleta da cor primária do app (escala 50–950 do PrimeNG). É a fonte única tanto
 * para o preset inicial (`app.config.ts`) quanto para restaurar a cor padrão em runtime,
 * evitando duplicar os valores em dois lugares.
 */
export const PALETA_PRIMARIA_PADRAO = {
  50:  '{blue.50}',
  100: '{blue.100}',
  200: '{blue.200}',
  300: '{blue.300}',
  400: '{blue.400}',
  500: '{blue.500}',
  600: '{blue.600}',
  700: '{blue.700}',
  800: '{blue.800}',
  900: '{blue.900}',
  950: '{blue.950}',
} as const;

/** Hex representativo da cor primária padrão, usado só para exibição em controles. */
export const COR_PRIMARIA_PADRAO_HEX = '#3b82f6';

/** Chaves de persistência da preferência de cor no `localStorage`. */
export const COR_CHAVE_DESBLOQUEADO = 'tema-custom-desbloqueado';
export const COR_CHAVE_COR = 'tema-custom-cor';
export const COR_CHAVE_DONO = 'tema-custom-dono';

/** Atalho de cor: rótulo legível + hex base usado para gerar a escala primária. */
export interface CorSugerida {
  readonly nome: string;
  readonly hex: string;
}

/** Cores prontas oferecidas como atalho na seção de tema personalizado. */
export const CORES_SUGERIDAS: readonly CorSugerida[] = [
  { nome: 'Verde',    hex: '#10b981' },
  { nome: 'Vermelho', hex: '#ef4444' },
  { nome: 'Roxo',     hex: '#8b5cf6' },
  { nome: 'Laranja',  hex: '#f97316' },
  { nome: 'Rosa',     hex: '#ec4899' },
  { nome: 'Teal',     hex: '#14b8a6' },
];

/** Garante o prefixo '#' no hex (o color picker emite sem ele). */
export function normalizarHex(hex: string): string {
  return hex.startsWith('#') ? hex : `#${hex}`;
}

/**
 * Resolve a paleta primária a aplicar já na montagem do preset (antes do PrimeNG
 * carregar o tema), lendo a preferência salva no `localStorage`. Evita a corrida
 * em que aplicar a cor após o boot era sobrescrito pelo preset padrão (o que
 * fazia o F5 voltar ao azul). Cai no padrão quando não há preferência válida.
 */
export function resolverPaletaPrimariaInicial(): ColorScale {
  const desbloqueado = localStorage.getItem(COR_CHAVE_DESBLOQUEADO) === 'true';
  const corSalva = localStorage.getItem(COR_CHAVE_COR);
  if (desbloqueado && corSalva) {
    // `palette()` chamado com um hex sempre retorna uma escala (nunca string).
    return palette(normalizarHex(corSalva)) as ColorScale;
  }
  return { ...PALETA_PRIMARIA_PADRAO };
}
