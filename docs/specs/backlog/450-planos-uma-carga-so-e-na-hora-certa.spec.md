# 450-planos-uma-carga-so-e-na-hora-certa.spec.md

> Task 122/158 da guarda-chuva `requisicoes-e-permissoes-correcoes.spec.md`. Origem: achados A-163, A-164 do dossiê `docs/specs/active/revisao-requisicoes-e-permissoes/DOSSIE.md`.
> Severidade: Baixa. Área: frontend/chat (plano).

## Objetivo

Quem só usa Perguntas deixa de pagar `GET /plano` ao abrir o chat, e entrar em Planejamento deixa de pedir a lista de novo antes de abrir o plano.

## Contexto

**A-163 · Baixa · GET /plano ao abrir /chat não é usado até o seletor abrir ou o usuário entrar em Planejamento**

O construtor do seletor chama `recarregar()`, que pede conversas e planos juntos. `conversas()` alimenta o rótulo do botão, mas `planos()` só é lido dentro do `p-popover`; em Planejamento o rótulo vem do input `planoAbertoTitulo`. Quem só usa Perguntas paga `GET /plano` em toda abertura da tela.

Evidência no código (linhas de 2026-11-13; confira antes de editar):

- frontend/src/app/modules/chat/components/seletor/seletor.component.ts:91-93 — `constructor() { this.recarregar(); }`
- frontend/src/app/modules/chat/components/seletor/seletor.component.ts:114 — `this.planoService.listar({ busca: this.buscaFeita() || undefined })` dentro de `recarregar()`
- frontend/src/app/modules/chat/components/seletor/seletor.component.html:26 e :44-95 — todos os usos de `planos()` ficam depois de `<p-popover #popover (onShow)="aoAbrir()">`
- frontend/src/app/modules/chat/components/seletor/seletor.component.ts:72-77 — `rotuloDoBotao` usa `planoAbertoTitulo()` e `conversas()`, nunca `planos()`
- .artifacts/revisao-requisicoes-e-permissoes/trafego/ADMINISTRADOR.txt:60-65 — "abrir /chat — 5 requisições", com GET /plano [200]

Como observar: Abrir /chat e não tocar em nada: GET /plano [200] aparece entre as 5 requisições sem que nenhum plano seja mostrado.

Verificação na auditoria: medido na aplicação rodando em 2026-11-13: abrir `/chat` faz `GET /plano` junto com `GET /chat/conversas`, antes de o usuário abrir o seletor ou entrar em Planejamento.

**A-164 · Baixa · Entrar em Planejamento pede GET /plano de novo e só então abre o plano (cascata de 1 + 4)**

`abrirUltimoPlano()` faz `planoService.listar()` só para pegar o primeiro item, a mesma lista que o seletor carregou ao abrir a tela. Só depois da resposta o plano abre e saem em paralelo `GET /chat/plano/:id`, `GET /plano/:id`, `GET /plano/:id/ponto` e `GET /plano/:id/fonte`.

Evidência no código (linhas de 2026-11-13; confira antes de editar):

- frontend/src/app/modules/chat/pages/chat/chat.page.ts:549 — `trocarModo` chama `this.abrirUltimoPlano()` quando não há plano aberto
- frontend/src/app/modules/chat/pages/chat/chat.page.ts:682-688 — `this.planoService.listar()` e uso só de `resposta.dados?.[0]`
- frontend/src/app/modules/chat/pages/chat/chat.page.ts:285-289 e :590 — efeito do plano aberto → `recuperarConversaDoPlano(planoId)`
- frontend/src/app/modules/chat/components/plano-documento/plano-documento.component.ts:143-146 e :153 — efeito por `planoId` → `planoService.recuperar(id)`
- frontend/src/app/modules/chat/components/plano-pontos/plano-pontos.component.ts:73-76 — efeito por `planoId` → `listarPontos`
- frontend/src/app/modules/chat/components/plano-fontes/plano-fontes.component.ts:65-68 — efeito por `planoId` → `listarFontes`

Como observar: /chat → clicar em Planejamento pela primeira vez: GET /plano (o segundo desde a abertura da tela) e, depois da resposta, GET /chat/plano/:id, GET /plano/:id, GET /plano/:id/ponto e GET /plano/:id/fonte.

Verificação na auditoria: medido na aplicação rodando em 2026-11-13: abrir `/chat` faz `GET /plano` junto com `GET /chat/conversas`, antes de o usuário abrir o seletor ou entrar em Planejamento.

## Entregáveis

1. O seletor carrega os planos ao abrir o popover e na entrada em Planejamento; o construtor pede só as conversas.
2. A página e o seletor compartilham a mesma lista de planos (uma carga).
3. Testes de componente.

## Critérios de Aceite

- Ao vivo: abrir `/chat` faz 4 requisições (hoje 5); entrar em Planejamento faz um `GET /plano` e as leituras do plano aberto.
- Testes e build dos workspaces tocados e `npm run lint:tudo` sem erro novo.

## Fora de Escopo

Qualquer outro achado do dossiê; cada um tem a sua spec.

## Dependências

Nenhuma.

