# 442-atividade-detalhe-com-as-tags-na-mesma-resposta.spec.md

> Task 114/135 da guarda-chuva `requisicoes-e-permissoes-correcoes.spec.md`. Origem: achado A-143 do dossiê `docs/specs/active/revisao-requisicoes-e-permissoes/DOSSIE.md`.
> Severidade: Baixa. Área: backend/atividade e frontend/atividade. **Tem decisão do autor pendente** (seção própria): não implementar antes dela.

## Objetivo

Abrir o detalhe da atividade deixa de fazer duas requisições para a atividade e as tags dela.

## Contexto

**A-143 · Baixa · Detalhe da atividade: duas requisições para atividade e tags, e a atividade relida a cada mudança de execução**

`AtividadeRecuperadaDto` não traz as tags, então abrir o detalhe faz GET /atividade/:id e GET /atividade/:id/tag (medido), enquanto o resumo da listagem já traz `tags`. Depois de iniciar, pausar ou registrar, `carregarExecucoes` relê a atividade inteira para acompanhar o status.

Evidência no código (linhas de 2026-11-13; confira antes de editar):

- frontend/src/app/modules/atividade/pages/atividade-detalhe/atividade-detalhe.page.ts:339-340 — `recuperar(id)` e `listarTags(id)` no mesmo `forkJoin`
- shared/src/dtos/atividade/AtividadeRecuperadaDto.ts:5-21 — campos sem `tags`
- frontend/src/app/modules/atividade/pages/atividade-listagem/atividade-listagem.page.ts:481 — a linha usa `atividade.tags` do `AtividadeResumoDto`
- frontend/src/app/modules/atividade/pages/atividade-detalhe/atividade-detalhe.page.ts:366-372 — `recuperar(id)` de novo em `carregarExecucoes`
- .artifacts/revisao-requisicoes-e-permissoes/trafego/ADMINISTRADOR.txt:112-113 — GET /atividade/5 e GET /atividade/5/tag

Como observar: /atividade/:id: GET /atividade/:id e GET /atividade/:id/tag juntos ao abrir; iniciar ou pausar: outro GET /atividade/:id.

Verificação na auditoria: medido na aplicação rodando em 2026-11-13: abrir o detalhe faz `GET /atividade/:id` e `GET /atividade/:id/tag`.

## Decisão do autor pendente

**Antes:** `AtividadeRecuperadaDto` não traz as tags; o resumo da listagem já traz.

**Opções:**

1. Incluir `tags` no `AtividadeRecuperadaDto` (campo novo no DTO).
2. Manter as duas requisições.

## Entregáveis

1. Na opção 1: o campo no DTO, a leitura no repository e o detalhe sem a segunda chamada, com testes.

## Critérios de Aceite

- Ao vivo: abrir o detalhe faz uma requisição para a atividade.
- Testes e build dos workspaces tocados e `npm run lint:tudo` sem erro novo.

## Fora de Escopo

Qualquer outro achado do dossiê; cada um tem a sua spec.

## Dependências

Decisão do autor acima. `npm run impacto` no DTO.

