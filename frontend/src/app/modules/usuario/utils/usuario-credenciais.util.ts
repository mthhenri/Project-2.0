const CARACTERES_SENHA = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789';
const SIMBOLOS_SENHA = '@#$%&*!?';
export const TAMANHO_SENHA_GERADA = 12;

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

function sortear(limite: number): number {
  const sorteio = new Uint32Array(1);
  crypto.getRandomValues(sorteio);
  return sorteio[0] % limite;
}

/** Senha aleatória legível: sem caracteres ambíguos (0/O, 1/l/I) e com ao menos um símbolo e um dígito. */
export function gerarSenha(): string {
  const caracteres = Array.from({ length: TAMANHO_SENHA_GERADA - 2 }, () => CARACTERES_SENHA[sortear(CARACTERES_SENHA.length)]);
  caracteres.push(SIMBOLOS_SENHA[sortear(SIMBOLOS_SENHA.length)], String(2 + sortear(8)));
  for (let indice = caracteres.length - 1; indice > 0; indice--) {
    const outro = sortear(indice + 1);
    [caracteres[indice], caracteres[outro]] = [caracteres[outro], caracteres[indice]];
  }
  return caracteres.join('');
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
