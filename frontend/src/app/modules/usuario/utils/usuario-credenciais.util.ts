/** `João da Silva` → `joao.silva` (primeiro e último nome, sem acento); vazio se não houver nome. */
export function sugerirLogin(nomeCompleto: string): string {
  const partes = nomeCompleto
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, '')
    .split(/\s+/)
    .filter(Boolean);
  if (partes.length === 0) return '';
  return partes.length === 1 ? partes[0] : `${partes[0]}.${partes[partes.length - 1]}`;
}

function nomeEmPartes(nomeCompleto: string): string[] {
  return nomeCompleto
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^A-Za-z0-9\s]/g, '')
    .split(/\s+/)
    .filter(Boolean);
}

function comInicialMaiuscula(texto: string): string {
  return texto.charAt(0).toUpperCase() + texto.slice(1).toLowerCase();
}

/**
 * A senha sugerida é sempre `Dev@` + inicial do primeiro nome + último nome + `!`: `Matheus Caranguejo` → `Dev@MCaranguejo!`.
 * Sem acento nem símbolo; nome único vira `Dev@Madonna!`; sem nome, vazia.
 */
export function sugerirSenha(nomeCompleto: string): string {
  const partes = nomeEmPartes(nomeCompleto);
  if (partes.length === 0) return '';
  const resto = partes.length === 1 ? comInicialMaiuscula(partes[0]) : `${partes[0][0].toUpperCase()}${comInicialMaiuscula(partes[partes.length - 1])}`;
  return `Dev@${resto}!`;
}

export function iniciaisDoNome(nomeCompleto: string): string {
  return nomeCompleto
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((parte) => parte[0])
    .join('')
    .toUpperCase();
}
