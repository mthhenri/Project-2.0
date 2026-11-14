# 382-demanda-novo-pai-estrutural-na-service.spec.md

> Task 54/67 da guarda-chuva `requisicoes-e-permissoes-correcoes.spec.md`. Origem: achado A-066 do dossiê `docs/specs/active/revisao-requisicoes-e-permissoes/DOSSIE.md`.
> Severidade: Média. Área: backend/demanda.

## Objetivo

A regra "só demanda estrutural tem sub-demandas" vale também ao trocar o pai de uma demanda existente. Hoje a criação e a IA recusam; a rota de alteração aceita.

## Contexto

**A-066 · Média · PUT /demanda/:id move a demanda para pai não estrutural; POST /demanda e a IA recusam**

Ao trocar demandaPaiId, DemandaService.alterar confere existência, mesmo projeto, a própria demanda e descendentes, mas não exige que o novo pai seja estrutural. A criação exige, e a ferramenta/executor de IA aplicam validarNovoPaiDaDemanda, cujo comentário diz que a tela é quem garante a regra na rota. Quem edita a demanda (condutor ou desenvolvedor membro) coloca uma demanda dentro de uma demanda de trabalho pela API.

Evidência no código (linhas de 2026-11-13; confira antes de editar):

- backend/src/modules/demanda/services/demanda.service.ts:362-385 — alterar: pai existe (367), mesmo projeto (371), não é a própria (378) nem descendente (381-384); nenhuma checagem de `estrutural`
- backend/src/modules/demanda/services/demanda.service.ts:112-116 — criar recusa "Apenas demandas estruturais podem ter sub-demandas"
- backend/src/modules/demanda/domain/novo-pai-da-demanda.ts:3-6 e ~20 (linhas aproximadas, lido sem linhas em branco) — "A DemandaService.alterar só confere o projeto; a tela só oferece como pai as demandas estruturais" e `if (!novoPai.estrutural) throw`
- backend/src/modules/demanda/executores/alterar-demanda.executor.ts:52-55 — o executor chama validarNovoPaiDaDemanda antes de alterar
- backend/src/modules/demanda/services/demanda.service.regras.test.ts:314 — teste do novo pai cobre só existência e projeto

Como observar: Como DESENVOLVEDOR membro da demanda 20 (ou GESTOR): PUT /api/demanda/20 com {"demandaPaiId": <id de demanda de trabalho, estrutural=false, do mesmo projeto>}. Esperado: 400 "Apenas demandas estruturais podem ter sub-demandas". O código responde 200 e grava o pai.

Verificação na auditoria: código, por um auditor; linhas citadas conferidas pelo agente principal.

## Entregáveis

1. `validarNovoPaiDaDemanda` aplicada dentro de `DemandaService.alterar` (fonte única); ferramenta e executor ficam só com a mensagem ao modelo.
2. Teste da service para o pai não estrutural.

## Critérios de Aceite

- `PUT /demanda/:id` com `demandaPaiId` de demanda não estrutural responde 400 com a mesma mensagem da criação.
- Testes e build dos workspaces tocados e `npm run lint:tudo` sem erro novo.

## Fora de Escopo

Qualquer outro achado do dossiê; cada um tem a sua spec.

## Dependências

Nenhuma.

