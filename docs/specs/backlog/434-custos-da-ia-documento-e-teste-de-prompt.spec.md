# 434-custos-da-ia-documento-e-teste-de-prompt.spec.md

> Task 106/158 da guarda-chuva `requisicoes-e-permissoes-correcoes.spec.md`. Origem: achado A-143 do dossiê `docs/specs/active/revisao-requisicoes-e-permissoes/DOSSIE.md`.
> Severidade: Informativo. Área: docs e backend/ia-custo. **Tem decisão do autor pendente** (seção própria): não implementar antes dela.

## Objetivo

Atualizar o `SYSTEM.SPEC.md` e o comentário de `IaCustoService`, que ainda dizem que só o chat entra na conta (a task 260 passou a registrar chamadas fora do chat), e decidir se o teste de prompt (até 10 chamadas ao provedor) entra na aba Custos.

## Contexto

**A-143 · Informativo · Spec e comentário da service de custos dizem que só o chat entra na conta, mas o código já registra chamadas fora do chat; o teste de prompt não é registrado**

A linha do módulo `ia-custo` na spec e o JSDoc de `IaCustoService` afirmam que o que não passa pelo chat não aparece nos custos. `IaUsoService` (task 260) grava essas chamadas como mensagem de uso que a aba soma. Já o teste de prompt (até 10 chamadas ao provedor por pedido) não usa `IaUsoService`.

Evidência no código (linhas de 2026-11-13; confira antes de editar):

- docs/SYSTEM.SPEC.md:1258 — 'Só o chat entra: relatório, assistente de descrição, nomeação e sugestões não têm onde gravar tokens e não aparecem'
- backend/src/modules/ia-custo/services/ia-custo.service.ts:21-23 — 'o que não passa pelo chat ... não entra na conta'
- backend/src/modules/ia-custo/services/ia-uso.service.ts:5-9 e 16-30 — 'Põe na conta da aba Custos a chamada à IA que não passou pelo chat (task 260)'
- backend/src/modules/prompt/services/prompt-teste.service.ts:36-39 e 49-55 — só `PromptService` e `IaService` injetados; duas chamadas `rodar` por narrativa

Como observar: Leitura de código, sem execução: como ADMINISTRADOR, POST /prompt/CONVERSA/testar {conteudo, narrativas:['x']} e depois GET /ia-custo?ano=<ano>&mes=<mês> — pelo código os totais não mudam, embora o provedor tenha sido chamado duas vezes.

Verificação na auditoria: código, por um auditor; arquivo e linha das evidências conferidos por script.

## Decisão do autor pendente

**Antes:** o teste de prompt não é registrado em Custos.

**Opções:**

1. Registrar o teste de prompt como uso.
2. Não registrar e escrever isso no documento.

## Entregáveis

1. A linha do módulo `ia-custo` no `SYSTEM.SPEC.md` §12 e o JSDoc corrigidos; a opção escolhida para o teste de prompt, com teste.

## Critérios de Aceite

- O documento descreve o que a aba Custos soma.
- Testes e build dos workspaces tocados e `npm run lint:tudo` sem erro novo.

## Fora de Escopo

Qualquer outro achado do dossiê; cada um tem a sua spec.

## Dependências

Decisão do autor acima.

