/** Tira a marcação de Markdown que não aparece no texto renderizado (`*`, `_`, crase, `#`, `>`, marcadores de lista e de tarefa), para comparar com a seleção. */
export function semMarcacaoDeMarkdown(texto: string): string {
  return texto
    .replace(/^\s*(?:[-*+]|\d+[.)])\s+(?:\[[ xX]\]\s+)?/gm, '')
    .replace(/^\s{0,3}(?:#{1,6}|>)\s+/gm, '')
    .replace(/[*_`~]/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

/** O resultado de conferir se a resposta da IA só mudou a seleção dentro do bloco. */
export type EncaixeDoTrechoAlterado = { encaixa: true } | { encaixa: false; motivo: 'IGUAL' | 'FORA_DA_SELECAO' | 'SELECAO_AUSENTE' };

/**
 * A resposta da IA para "altere só esta seleção" devolve o **bloco inteiro** (Markdown). Ela encaixa quando difere do bloco e a parte que mudou
 * (o que sobra tirando o começo e o fim iguais) cabe dentro da seleção: o que está antes e depois dela volta idêntico. Resposta igual ao bloco não
 * muda nada, e resposta que reescreve além da seleção não pode ser proposta (task 260).
 */
export function conferirEncaixeDoTrecho(bloco: string, selecao: string, blocoNovo: string): EncaixeDoTrechoAlterado {
  if (bloco === blocoNovo) return { encaixa: false, motivo: 'IGUAL' };
  const alvo = semMarcacaoDeMarkdown(selecao);
  if (alvo === '' || !semMarcacaoDeMarkdown(bloco).includes(alvo)) return { encaixa: false, motivo: 'SELECAO_AUSENTE' };

  let comeco = 0;
  const limite = Math.min(bloco.length, blocoNovo.length);
  while (comeco < limite && bloco[comeco] === blocoNovo[comeco]) comeco++;
  let fim = 0;
  while (fim < limite - comeco && bloco[bloco.length - 1 - fim] === blocoNovo[blocoNovo.length - 1 - fim]) fim++;

  const removido = semMarcacaoDeMarkdown(bloco.slice(comeco, bloco.length - fim));
  return alvo.includes(removido) ? { encaixa: true } : { encaixa: false, motivo: 'FORA_DA_SELECAO' };
}
