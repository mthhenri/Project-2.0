/**
 * Tema visual da aplicação. Preferência por dispositivo/navegador — não cruza para o backend,
 * por isso é um tipo local do frontend e não um enum do pacote `shared`.
 */
export type Tema = 'claro' | 'escuro';

/** Chave usada para persistir o tema escolhido no `localStorage`. */
export const TEMA_CHAVE_LOCAL_STORAGE = 'tema';

/** Classe aplicada em `<html>` que ativa o tema escuro (casada com o `darkModeSelector` do PrimeNG). */
export const TEMA_CLASSE_ESCURO = 'app-escuro';

/** Tema usado quando não há valor salvo no `localStorage`. */
export const TEMA_PADRAO: Tema = 'claro';
