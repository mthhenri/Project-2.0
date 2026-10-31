# 296-desktop-fechar-completamente-com-janelinha-aberta.spec.md

> Task solta, pedido do autor (2026-10-31): "o fechar completamente do Project Desktop não está funcional" e gerar um build novo, porque o executável em uso parecia desatualizado.

## Objetivo

"Fechar completamente" na bandeja encerra o app em qualquer situação, e o executável publicado tem a correção.

## Entregáveis

1. **Causa e correção.** A janelinha do check-in recusa fechar enquanto o check-in não termina (`evento.preventDefault()` no `close`). Com a saída confirmada, o `app.quit()` tenta fechar todas as janelas, a janelinha recusa e o Electron **cancela o encerramento**: o app continuava vivo, sem aviso. Nova função pura `janelinhaPodeFechar(liberada, estado)` (`politica-da-janela.ts`): a janelinha também fecha com a saída confirmada ou com o sistema desligando.
2. **Garantia.** Depois de confirmar a saída, se o `quit` ainda for cancelado por qualquer janela, `app.exit(0)` encerra em 4 s.
3. **Atalho do chat (Ctrl+Shift+Espaço) que parava de abrir** (relato do autor, com o Project minimizado, depois de fechar a conversa uma vez). Não reproduzi no fluxo lógico (abrir, fechar, abrir, com o Project oculto, funciona), então o Desktop foi endurecido nos pontos que podem derrubá-lo: (a) uma falha **de leitura** do login (página recarregando) deixou de contar como "sem login", que soltava o atalho e fechava o chat; só "sem login" de verdade solta; (b) o `closed` de uma janela de chat velha não apaga mais a referência da nova; (c) a cada 10 s o app confere se o sistema ainda tem o atalho (`isRegistered`) e o registra de novo; (d) o aviso de "Fechar completamente" é mostrado mesmo se o `ready-to-show` não vier (2 s), para o item da bandeja não parecer morto.
4. **Build novo.** `Project-Desktop-1.1.0.exe` (a 1.1.0 nunca tinha sido empacotada: a pasta só tinha 1.0.0 e 1.0.1; ela traz o chat no desktop da 213, o aviso de atualização da 200 e esta correção).

## Critérios de Aceite

- Teste puro de `janelinhaPodeFechar`; testes do desktop e build ok.
- Reproduzido e confirmado no Electron real: com a janelinha aberta, antes o app continuava vivo depois de "Fechar completamente"; depois, encerra.

## Fora de Escopo

- Assinar o executável, atualização automática e trocar a URL de produção (`http://localhost:4200/`, ainda a de desenvolvimento).

## Dependências

- 152, 160 e 200.
