import { Router } from '@angular/router';

/**
 * Destino pós-login: aceita só caminho interno do app (começa com uma única `/`, sem esquema nem
 * host) e nunca a própria tela de login. Qualquer outra coisa cai no padrão `/ponto`.
 */
export function urlRetornoSegura(roteador: Router, retorno: string | null | undefined): string {
  const padrao = '/ponto';
  if (!retorno || !retorno.startsWith('/') || retorno.startsWith('//') || retorno.includes('\\')) return padrao;
  try {
    const arvore = roteador.parseUrl(retorno);
    const url = roteador.serializeUrl(arvore);
    return url.startsWith('/autenticacao') || url === '/' ? padrao : url;
  } catch {
    return padrao;
  }
}
