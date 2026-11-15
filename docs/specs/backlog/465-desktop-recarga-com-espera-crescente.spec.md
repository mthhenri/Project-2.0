# 465-desktop-recarga-com-espera-crescente.spec.md

> Task 137/158 da guarda-chuva `requisicoes-e-permissoes-correcoes.spec.md`. Origem: achado A-183 do dossiê `docs/specs/active/revisao-requisicoes-e-permissoes/DOSSIE.md`.
> Severidade: Baixa. Área: desktop.

## Objetivo

Em falha de carga, a janela principal deixa de tentar `loadURL` a cada 5 s fixos (720 tentativas por hora por Desktop, à vista ou na bandeja), com todos recarregando juntos quando o front volta.

## Contexto

**A-183 · Baixa · Front fora do ar: a janela principal tenta recarregar a cada 5 s, sem recuo, mesmo oculta**

Em falha de carga a janela mostra a página de aviso e agenda nova loadURL em 5 s fixos, sem contador nem espera crescente, esteja à vista ou na bandeja. São 720 tentativas por hora por Desktop enquanto durar a queda, e todos recarregam a SPA quase juntos quando o front volta.

Evidência no código (linhas de 2026-11-13; confira antes de editar):

- desktop/src/main.ts:254-259 — did-fail-load: loadURL(paginaDeFalha()) e setTimeout(() => loadURL(urlDoProject), 5000)
- desktop/src/main.ts:169 — texto da página: 'O app tenta de novo a cada poucos segundos'

Como observar: Derrubar o servidor do front com o Desktop aberto: no log do proxy, 1 tentativa de GET / a cada 5 s por Desktop; ao religar, todas as janelas fazem a carga inicial completa no mesmo instante.

Verificação na auditoria: código, por um auditor; o Electron não roda no ambiente da auditoria.

## Entregáveis

1. Espera crescente com variação aleatória (de 5 s até cerca de 60 s) e tentativa imediata quando o usuário traz a janela para a frente; a regra fica em função pura em `desktop/src/politica-da-janela.ts`.
2. Teste da função.

## Critérios de Aceite

- `npm run test --workspace=desktop` cobre a sequência de esperas.
- Testes e build dos workspaces tocados e `npm run lint:tudo` sem erro novo.

## Fora de Escopo

Qualquer outro achado do dossiê; cada um tem a sua spec.

## Dependências

Nenhuma.

