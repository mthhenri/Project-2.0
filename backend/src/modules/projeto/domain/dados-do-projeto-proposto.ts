/** Cores que a IA usa quando o usuário não escolhe uma para o projeto novo (as mesmas famílias da paleta do sistema). */
export const CORES_DOS_PROJETOS = ['#6366f1', '#0ea5e9', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#14b8a6', '#ec4899'];

/** Escolhe uma cor da paleta de modo estável pelo nome (o mesmo nome sempre dá a mesma cor, sem sorteio). */
export function escolherCorDoProjeto(nome: string): string {
  let soma = 0;
  for (const caractere of nome) soma += caractere.charCodeAt(0);
  return CORES_DOS_PROJETOS[soma % CORES_DOS_PROJETOS.length];
}

/**
 * Deriva o código do projeto do nome: sem acentos, em maiúsculas, a inicial de cada palavra com 3 letras ou mais (ou as 4 primeiras
 * letras de um nome de uma palavra só). "Sistema de Gestão" → "SG"; "Loja" → "LOJA".
 */
export function derivarCodigoDoProjeto(nome: string): string {
  const limpo = nome
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^A-Za-z0-9 ]/g, ' ')
    .trim();
  const palavras = limpo.split(/\s+/).filter((palavra) => palavra.length > 0);
  const significativas = palavras.filter((palavra) => palavra.length >= 3);
  const base = significativas.length >= 2 ? significativas.map((palavra) => palavra[0]).join('') : (significativas[0] ?? palavras[0] ?? 'PRJ').slice(0, 4);
  const codigo = base.toUpperCase().slice(0, 10);
  return codigo.length >= 2 ? codigo : `${codigo}PJ`;
}
