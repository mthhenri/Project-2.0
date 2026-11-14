# 408-rotas-sem-consumidor-na-interface.spec.md

> Task 80/81 da guarda-chuva `requisicoes-e-permissoes-correcoes.spec.md`. Origem: achados A-106, A-107 do dossiê `docs/specs/active/revisao-requisicoes-e-permissoes/DOSSIE.md`.
> Severidade: Informativo. Área: backend (anotacao, checkin, calendario, demanda). **Tem decisão do autor pendente** (seção própria): não implementar antes dela.

## Objetivo

Decidir o destino das seis rotas que a interface não usa: `PATCH /anotacao/:usuarioId/:tipo/trecho`, `POST /anotacao/:usuarioId/:tipo/anexo`, `POST /anotacao/:usuarioId/feito`, `GET /checkin/suspensao`, `GET /calendario/verificar` e `GET /demanda/:id/ancestral`.

## Contexto

**A-106 · Informativo · Três rotas HTTP do pad não têm chamador no frontend nem no desktop: `PATCH /anotacao/:usuarioId/:tipo/trecho`, `POST /anotacao/:usuarioId/:tipo/anexo` e `POST /anotacao/:usuarioId/feito`**

O frontend só chama listar, alterar e mover. As três operações são usadas pelo executor da IA, que chama a `AnotacaoService` direto, sem HTTP. As rotas estão documentadas no `SYSTEM.SPEC.md`.

Evidência no código (linhas de 2026-11-13; confira antes de editar):

- backend/src/modules/anotacao/controllers/anotacao.controller.ts:35, 45 e 55 — as três rotas
- frontend/src/app/modules/usuario/services/anotacao.service.ts:23-37 — só `listar`, `moverTrecho` e `alterar`
- backend/src/modules/anotacao/executores/anotar-pad.executor.ts:46-53 — `trocarTrecho`, `anexarFeito` e `anexarTexto` chamados direto na service
- docs/SYSTEM.SPEC.md:1248 — rotas listadas no módulo `anotacao`

Como observar: Percorrer o pad inteiro na aplicação: nenhuma dessas rotas aparece na aba de rede.

Verificação na auditoria: código, por um auditor; linhas citadas conferidas pelo agente principal.

**A-107 · Informativo · Mais três rotas sem consumidor: `GET /checkin/suspensao`, `GET /calendario/verificar` e `GET /demanda/:id/ancestral`**

Varredura por script das 202 rotas contra `frontend/src` e `desktop/src`: `GET /checkin/suspensao` não tem nenhuma chamada; `GET /calendario/verificar` e `GET /demanda/:id/ancestral` só são chamadas por métodos do front que não têm chamador (`CalendarioService.verificarDiaUtil` e `DemandaService.recuperarAncestral`). As services por trás continuam em uso pela IA ou por outras rotas.

Evidência no código (linhas de 2026-11-13; confira antes de editar):

- frontend/src/app/modules/calendario/services/calendario.service.ts:47 — `verificarDiaUtil()` sem chamador
- frontend/src/app/modules/demanda/services/demanda.service.ts:114 — `recuperarAncestral()` sem chamador (a rota de detalhe agregado da task 325 a substituiu)

Verificação na auditoria: varredura por script e `grep` do agente principal em 2026-11-14.

## Decisão do autor pendente

**Antes:** as seis rotas existem, estão no `SYSTEM.SPEC.md` e não têm chamador na interface.

**Opções:**

1. Remover do controller e do documento (as services ficam para a IA e para as outras rotas).
2. Manter como API documentada (uso por script ou integração futura) e registrar isso.

## Entregáveis

1. A opção escolhida para cada rota; na remoção, os testes de controller correspondentes saem junto e o `SYSTEM.SPEC.md` §12 é atualizado.

## Critérios de Aceite

- O log de subida do backend lista só as rotas mantidas; nenhuma tela quebra (testes do frontend e navegação pelas telas de pad, check-in, calendário e demandas).
- Testes e build dos workspaces tocados e `npm run lint:tudo` sem erro novo.

## Fora de Escopo

Qualquer outro achado do dossiê; cada um tem a sua spec.

## Dependências

Decisão do autor acima. Depois de `409-metodos-http-do-front-sem-chamador`.

