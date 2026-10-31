# 296-desktop-fechar-completamente-com-janelinha-aberta.spec.md

> Task solta, pedido do autor (2026-10-31): "o fechar completamente do Project Desktop não está funcional" e gerar um build novo, porque o executável em uso parecia desatualizado.

## Objetivo

"Fechar completamente" na bandeja encerra o app em qualquer situação, e o executável publicado tem a correção.

## Entregáveis

1. **Causa e correção.** A janelinha do check-in recusa fechar enquanto o check-in não termina (`evento.preventDefault()` no `close`). Com a saída confirmada, o `app.quit()` tenta fechar todas as janelas, a janelinha recusa e o Electron **cancela o encerramento**: o app continuava vivo, sem aviso. Nova função pura `janelinhaPodeFechar(liberada, estado)` (`politica-da-janela.ts`): a janelinha também fecha com a saída confirmada ou com o sistema desligando.
2. **Garantia.** Depois de confirmar a saída, se o `quit` ainda for cancelado por qualquer janela, `app.exit(0)` encerra em 4 s.
3. **Build novo.** `Project-Desktop-1.1.0.exe` (a 1.1.0 nunca tinha sido empacotada: a pasta só tinha 1.0.0 e 1.0.1; ela traz o chat no desktop da 213, o aviso de atualização da 200 e esta correção).

## Critérios de Aceite

- Teste puro de `janelinhaPodeFechar`; testes do desktop e build ok.
- Reproduzido e confirmado no Electron real: com a janelinha aberta, antes o app continuava vivo depois de "Fechar completamente"; depois, encerra.

## Fora de Escopo

- Assinar o executável, atualização automática e trocar a URL de produção (`http://localhost:4200/`, ainda a de desenvolvimento).

## Dependências

- 152, 160 e 200.
