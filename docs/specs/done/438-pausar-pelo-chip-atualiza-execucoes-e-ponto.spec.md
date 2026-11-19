# 438-pausar-pelo-chip-atualiza-execucoes-e-ponto.spec.md

> Task 110/158 da guarda-chuva `requisicoes-e-permissoes-correcoes.spec.md`. Origem: achado A-150 do dossiê `docs/specs/active/revisao-requisicoes-e-permissoes/DOSSIE.md`.
> Severidade: Média. Área: frontend/execucao e ponto.

## Objetivo

Depois de pausar a execução pelo chip, o bloco "Em andamento agora" de Execuções e o cartão de quem está trabalhando no Ponto deixam de mostrar a execução como aberta.

## Contexto

**A-150 · Média · Pausar pelo chip em /execucao ou /ponto não atualiza a tela**

O contador `pausasDoChip` só é lido pela listagem e pelo detalhe de atividades. Em /execucao o bloco 'Em andamento agora' e em /ponto o cartão de quem está trabalhando continuam mostrando a execução como aberta depois de pausada pelo chip, até um foco, uma volta à aba ou outra ação.

Evidência no código (linhas de 2026-11-13; confira antes de editar):

- frontend/src/app/shared/layout/topbar/chip-execucao-ativa/chip-execucao-ativa.component.ts:63-65 — `aposEncerrar` chama `definir(null)` e `registrarPausaDoChip()`
- frontend/src/app/modules/atividade/pages/atividade-listagem/atividade-listagem.page.ts:216-222 e frontend/src/app/modules/atividade/pages/atividade-detalhe/atividade-detalhe.page.ts:161-166 — únicos leitores de `pausasDoChip` (grep em frontend/src)
- grep `inject(ExecucaoAtivaService)` em frontend/src — não aparece em execucao-historico.page.ts nem em ponto.page.ts
- frontend/src/app/modules/execucao/pages/execucao-historico/execucao-historico.page.ts:187-190 — a lista só recarrega quando a pausa parte do diálogo da própria página

Como observar: Não executado. Com uma execução própria aberta, ir a /execucao e pausar pelo chip da barra superior: a rede mostra PATCH /execucao/:id/encerrar e GET /execucao/ativa, e nenhum GET /execucao; conferir se o bloco 'Em andamento agora' permanece.

Verificação na auditoria: código, por um auditor; arquivo e linha das evidências conferidos por script.

## Entregáveis

1. As duas telas reagem ao mesmo sinal que a listagem de atividades já usa (`pausasDoChip` ou a mudança de `ExecucaoAtivaService.ativa()`) e recarregam.
2. Teste de componente das duas telas.

## Critérios de Aceite

- Ao vivo: com Execuções aberta, pausar pelo chip tira a execução de "Em andamento agora" sem F5.
- Testes e build dos workspaces tocados e `npm run lint:tudo` sem erro novo.

## Fora de Escopo

Qualquer outro achado do dossiê; cada um tem a sua spec.

## Dependências

Nenhuma.

