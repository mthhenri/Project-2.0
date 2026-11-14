# 343-codigo-morto-da-casca-e-do-checkin.spec.md

> Task 15/81 da guarda-chuva `requisicoes-e-permissoes-correcoes.spec.md`. Origem: achado A-018 do dossiê `docs/specs/active/revisao-requisicoes-e-permissoes/DOSSIE.md`.
> Severidade: Baixa. Área: frontend/casca.

## Objetivo

Tirar o que não é mais usado: o sinal `usuarioAutenticado` e o seu teste, e o ponto de extensão `slotCheckin` da topbar, que ninguém preenche.

## Contexto

**A-018 · Baixa · Código sem uso na casca e no check-in: sinal usuarioAutenticado, slot slotCheckin da topbar e rota GET /checkin/suspensao**

O sinal usuarioAutenticado só é usado pelo próprio teste (a sessão vive no UsuarioSessaoService). A topbar tem um <ng-content select="[slotCheckin]"> que ninguém preenche (o layout usa <app-topbar /> sem conteúdo; o próximo check-in foi para o menu do perfil). No backend, GET /checkin/suspensao não tem chamador no frontend nem no desktop: os dois leem a suspensão dentro de GET /checkin/situacao, apesar do comentário da rota.

Evidência no código (linhas de 2026-11-13; confira antes de editar):

- frontend/src/app/core/signals/usuario-autenticado.signal.ts:4 — export const usuarioAutenticado; grep em frontend/src só acha core/services/sessao-e-autenticacao.spec.ts:9, 173-178
- frontend/src/app/shared/layout/topbar/topbar.component.html:16-17 — <ng-content select="[slotCheckin]" />; grep de slotCheckin em frontend/src não acha outro uso
- frontend/src/app/shared/layout/layout.component.html:4 — <app-topbar /> sem conteúdo projetado
- backend/src/modules/checkin/controllers/checkin.controller.ts:35-43 — @Get('suspensao') com comentário 'O Electron e a barra superior perguntam'
- desktop/src/politica-do-checkin.ts:14 e frontend/src/app/modules/checkin/services/checkin.service.ts:18 — ambos usam só checkin/situacao (grep de 'checkin/suspensao' em frontend/src e desktop/src vazio)

Como observar: Não aparece na aplicação: GET /checkin/suspensao nunca surge na aba de rede em nenhum fluxo.

Verificação na auditoria: código, por um auditor; linhas citadas conferidas pelo agente principal.

## Entregáveis

1. Remover `core/signals/usuario-autenticado.signal.ts` (e o teste), depois de confirmar com `npm run impacto` que não há consumidor.
2. Remover o `ng-content` do slot do check-in em `topbar.component.html`.

## Critérios de Aceite

- `npm run impacto -- frontend/src/app/core/signals/usuario-autenticado.signal.ts` sem consumidores antes da remoção; build e testes do frontend sem erro.
- Testes e build dos workspaces tocados e `npm run lint:tudo` sem erro novo.

## Fora de Escopo

A rota `GET /checkin/suspensao`, sem consumidor no front: remover rota é contrato e está na spec das rotas sem consumidor.

## Dependências

Nenhuma.

