# Verificação — 296

Em 2026-10-31, Electron 39 do repositório, front de desenvolvimento em `localhost:4200`.

- **Reprodução (antes):** um roteiro temporário subiu o app, abriu a janelinha do check-in, chamou a saída e clicou "Fechar completamente" no aviso por protocolo de depuração: depois de 6 s o processo **continuava vivo**. Sem a janelinha, a saída funcionava (o app encerrou), o que localizou a causa.
- **Depois:** o mesmo roteiro, com a janelinha aberta, terminou com o processo encerrado (código 0). O roteiro só alterava o `dist/main.js` durante a execução, que foi recompilado em seguida; nada dele entrou no código.
- **Testes:** desktop 38 (um novo, `janelinhaPodeFechar`); `tsc` ok. Executável: `npm run pack --workspace=desktop` gerou `desktop/release/Project-Desktop-1.1.0.exe` (85 MB; a pasta `release/` é ignorada pelo Git e é a que o backend serve em `DESKTOP_PASTA_EXECUTAVEIS`).
- **Limites:** o executável empacotado **não foi aberto** (não fechei processos por nome para não derrubar o Desktop do autor); a correção foi provada no Electron de desenvolvimento, que roda o mesmo `dist/main.js`. Não distingui, no roteiro, a saída normal do `app.exit` de 4 s (a espera era de 6 s). O clique no item da bandeja em si não foi exercitado (o roteiro chamou a mesma `pedirSaida`).
