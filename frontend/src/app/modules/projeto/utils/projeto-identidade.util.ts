const CONECTIVOS = new Set(['de', 'da', 'do', 'das', 'dos', 'e']);

function primeirasLetras(palavra: string, quantidade: number): string {
  return (palavra.match(/[\p{L}\p{N}]/gu) ?? []).slice(0, quantidade).join('');
}

/**
 * Sigla do selo do projeto: iniciais das duas primeiras palavras do nome, ignorando conectivos
 * ("Portal do Cliente" → "PC"); com uma palavra só, as duas primeiras letras ("Portal" → "PO").
 */
export function siglaDoProjeto(nome: string): string {
  const palavras = nome.trim().split(/\s+/).filter((palavra) => primeirasLetras(palavra, 1) !== '');
  const significativas = palavras.filter((palavra) => !CONECTIVOS.has(palavra.toLowerCase()));
  const base = significativas.length ? significativas : palavras;
  if (base.length === 0) return '';
  const sigla = base.length === 1 ? primeirasLetras(base[0], 2) : primeirasLetras(base[0], 1) + primeirasLetras(base[1], 1);
  return sigla.toLocaleUpperCase('pt-BR');
}

function luminanciaRelativa(corHexadecimal: string): number {
  const valor = parseInt(corHexadecimal.slice(1), 16);
  const [vermelho, verde, azul] = [(valor >> 16) & 255, (valor >> 8) & 255, valor & 255].map((canal) => {
    const normalizado = canal / 255;
    return normalizado <= 0.03928 ? normalizado / 12.92 : Math.pow((normalizado + 0.055) / 1.055, 2.4);
  });
  return 0.2126 * vermelho + 0.7152 * verde + 0.0722 * azul;
}

/** Texto legível sobre a cor do projeto (`#RRGGBB`): escuro em fundo claro, branco em fundo escuro. */
export function corTextoSobre(corHexadecimal: string): string {
  return /^#[0-9A-Fa-f]{6}$/.test(corHexadecimal) && luminanciaRelativa(corHexadecimal) > 0.4 ? '#1c2430' : '#ffffff';
}
