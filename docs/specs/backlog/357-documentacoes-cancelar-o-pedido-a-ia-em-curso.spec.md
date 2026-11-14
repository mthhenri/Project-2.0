# 357-documentacoes-cancelar-o-pedido-a-ia-em-curso.spec.md

> Task 29/67 da guarda-chuva `requisicoes-e-permissoes-correcoes.spec.md`. Origem: achado A-037 do dossiê `docs/specs/active/revisao-requisicoes-e-permissoes/DOSSIE.md`.
> Severidade: Informativo. Área: frontend/documentacao.

## Objetivo

Um `POST /assistente/alterar-trecho` que ficou para trás não devolve resposta para a demanda errada nem corre em paralelo com o novo.

## Contexto

**A-037 · Informativo · Documentações: novo pedido à IA ou troca de demanda não cancela o `POST /assistente/alterar-trecho` em curso**

Cada pedido faz um `subscribe` novo; a resposta antiga só é ignorada na chegada. O pedido pode ser aberto de novo com outro em curso, e trocar de demanda zera a proposta sem cancelar a requisição. No backend a chamada ao provedor termina e entra em custos.

Evidência no código (linhas de 2026-11-13; confira antes de editar):

- frontend/src/app/modules/documentacao/components/documentacao-demanda/documentacao-demanda.component.ts:288-302 — `subscribe` sem guardar; descarte por `this.proposta() !== proposta`
- frontend/src/app/modules/documentacao/components/documentacao-demanda/documentacao-demanda.component.ts:202-206 — `carregar` zera a proposta ao trocar de demanda
- frontend/src/app/modules/documentacao/components/documentacao-demanda/documentacao-demanda.component.ts:251-266 — nada impede novo pedido no estado `PEDINDO`
- backend/src/modules/assistente/services/assistente.service.ts:113-137 — a chamada à IA e o registro de uso seguem até o fim

Como observar: Pedir a alteração de um trecho e, antes da resposta, pedir outra ou trocar de demanda: a primeira `POST /assistente/alterar-trecho` segue pendente, termina 200 e o resultado é descartado.

Verificação na auditoria: código, por um auditor; não exercitado ao vivo (a IA não tem provedor no ambiente da auditoria).

## Entregáveis

1. A assinatura do pedido é guardada e cancelada ao pedir de novo e ao trocar de demanda (ou o novo pedido fica bloqueado enquanto o estado é `PEDINDO`).
2. Teste de componente: trocar de demanda com pedido em curso não aplica a resposta antiga.

## Critérios de Aceite

- Teste de componente passa; conferir no backend se a chamada ao provedor é abortada quando a conexão fecha e registrar o resultado no relatório da task.
- Testes e build dos workspaces tocados e `npm run lint:tudo` sem erro novo.

## Fora de Escopo

Qualquer outro achado do dossiê; cada um tem a sua spec.

## Dependências

Nenhuma.

