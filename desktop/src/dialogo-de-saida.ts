/** Os dois caminhos do aviso de saída: cada botão navega para um endereço próprio, que o app intercepta (a página não tem acesso ao sistema). */
export const ENDERECO_DE_SAIR = 'project-desktop://sair';
export const ENDERECO_DE_CONTINUAR = 'project-desktop://continuar';

export type RespostaDaSaida = 'sair' | 'continuar';

/** Traduz a navegação da página do aviso na resposta do usuário; qualquer outra navegação é ignorada. */
export function respostaDaNavegacao(endereco: string): RespostaDaSaida | null {
  if (endereco === ENDERECO_DE_SAIR) return 'sair';
  if (endereco === ENDERECO_DE_CONTINUAR) return 'continuar';
  return null;
}

/** A página do aviso "Fechar completamente": segue o tema claro ou escuro do sistema, como o resto do Project. */
export function montarPaginaDoDialogoDeSaida(nomeDoApp: string): string {
  return `<!doctype html>
<html lang="pt-BR">
<head>
<meta charset="utf-8">
<title>${nomeDoApp}</title>
<style>
  :root { color-scheme: light dark; --fundo: #ffffff; --texto: #18181b; --suave: #52525b; --borda: #e4e4e7; --destaque: #3b82f6; --destaque-texto: #ffffff; --perigo: #dc2626; --aviso-fundo: #fef3c7; --aviso: #b45309; }
  @media (prefers-color-scheme: dark) { :root { --fundo: #18181b; --texto: #fafafa; --suave: #a1a1aa; --borda: #3f3f46; --aviso-fundo: #422006; --aviso: #fbbf24; } }
  * { box-sizing: border-box; }
  body { margin: 0; height: 100vh; display: flex; flex-direction: column; justify-content: space-between; padding: 1.5rem; font: 14px/1.5 "Segoe UI", system-ui, sans-serif; color: var(--texto); background: var(--fundo); border: 1px solid var(--borda); user-select: none; }
  .topo { display: flex; gap: 1rem; align-items: flex-start; }
  .icone { flex: none; display: grid; place-items: center; width: 2.75rem; height: 2.75rem; border-radius: 50%; background: var(--aviso-fundo); color: var(--aviso); }
  h1 { margin: 0 0 0.375rem; font-size: 1.125rem; font-weight: 600; }
  p { margin: 0; color: var(--suave); }
  .acoes { display: flex; justify-content: flex-end; gap: 0.625rem; }
  button { font: inherit; font-weight: 500; padding: 0.5rem 1rem; border-radius: 8px; cursor: pointer; border: 1px solid var(--borda); background: transparent; color: var(--texto); }
  button:hover { background: color-mix(in srgb, var(--texto) 7%, transparent); }
  button.sair { color: var(--perigo); border-color: color-mix(in srgb, var(--perigo) 45%, transparent); }
  button.sair:hover { background: color-mix(in srgb, var(--perigo) 10%, transparent); }
  button.continuar { background: var(--destaque); border-color: var(--destaque); color: var(--destaque-texto); }
  button.continuar:hover { background: color-mix(in srgb, var(--destaque) 85%, black); }
  button:focus-visible { outline: 2px solid var(--destaque); outline-offset: 2px; }
</style>
</head>
<body>
  <div class="topo">
    <div class="icone" aria-hidden="true">
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M10.29 3.86 1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><path d="M12 9v4"/><path d="M12 17h.01"/></svg>
    </div>
    <div>
      <h1>Fechar o Project Desktop?</h1>
      <p>Isso desativa o check-in. Ele só volta quando você abrir o aplicativo de novo.</p>
    </div>
  </div>
  <div class="acoes">
    <button class="sair" onclick="location.href='${ENDERECO_DE_SAIR}'">Fechar completamente</button>
    <button class="continuar" autofocus onclick="location.href='${ENDERECO_DE_CONTINUAR}'">Continuar usando</button>
  </div>
</body>
</html>`;
}
