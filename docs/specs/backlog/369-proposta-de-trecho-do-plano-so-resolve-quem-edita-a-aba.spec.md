# 369-proposta-de-trecho-do-plano-so-resolve-quem-edita-a-aba.spec.md

> Task 41/81 da guarda-chuva `requisicoes-e-permissoes-correcoes.spec.md`. Origem: achado A-055 do dossiê `docs/specs/active/revisao-requisicoes-e-permissoes/DOSSIE.md`.
> Severidade: Baixa. Área: backend/plano.

## Objetivo

Quem não edita a aba (desenvolvedor e auxiliar na descrição do cliente) não consegue recusar, e com isso expirar, a proposta de outra pessoa sobre ela.

## Contexto

**A-055 · Baixa · Quem não pode editar a aba recusa (expira) a proposta de trecho do plano de outra pessoa**

`recusar` não passa pelo executor: basta `obterDoUsuario`, que aceita qualquer pessoa com acesso ao plano. Desenvolvedor e auxiliar conseguem expirar a proposta do gestor sobre a descrição do cliente, que eles não editam; o contrato do executor diz que resolve quem pode editar o plano. Confirmar e desfazer estão protegidos por `lerPlano`.

Evidência no código (linhas de 2026-11-13; confira antes de editar):

- backend/src/modules/proposta-ia/services/proposta-ia.service.ts:139-148 — `recusar` chama `obterDoUsuario` e `transitar` para EXPIRADA, sem executor
- backend/src/modules/plano/executores/alterar-trecho-do-plano.executor.ts:72-80 — `podeResolver` devolve true só com `planoService.recuperar`
- backend/src/modules/proposta-ia/domain/executor-proposta-ia.ts:24-26 — contrato: 'quem pode editar o plano a resolve'
- shared/src/utils/plano.ts:15-17 — `podeEditarAbaDoPlano`: DESCRICAO_CLIENTE só com `temPermissaoDeGestor`

Como observar: Como DESENVOLVEDOR com acesso ao plano: POST /proposta-ia/P/recusar numa proposta do gestor com `aba: DESCRICAO_CLIENTE`. Esperado: 403. O código: 200 e a proposta vira EXPIRADA (o mesmo por POST /proposta-ia/grupo/recusar).

Verificação na auditoria: código, por um auditor; linhas citadas conferidas pelo agente principal.

## Entregáveis

1. `podeResolver` do executor de trecho do plano exige também `podeEditarAbaDoPlano(aba, tipo)`.
2. Teste por aba e por tipo de usuário.

## Critérios de Aceite

- `POST /proposta-ia/:id/recusar` de um desenvolvedor sobre proposta da aba do cliente de outra pessoa é recusado e a proposta continua pendente.
- Testes e build dos workspaces tocados e `npm run lint:tudo` sem erro novo.

## Fora de Escopo

Qualquer outro achado do dossiê; cada um tem a sua spec.

## Dependências

Nenhuma.

