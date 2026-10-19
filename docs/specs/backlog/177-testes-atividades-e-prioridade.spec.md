# Task 177 — Testes: atividades e prioridade

> Task 7/17 da guarda-chuva [`testes-automatizados.spec.md`](testes-automatizados.spec.md) — método comum lá.
> Inventário de partida: [análise](testes-automatizados/ANALISE.md).

## Objetivo

Provar criação, alteração, status, tags e prioridade de atividades (inclusive a ordenação da listagem pela `ordem` da
prioridade) e as telas de atividade, que são o fluxo convencional quando a IA está fora.

## Entregáveis

### Backend

1. **`atividade.service`** (5 testes: `restaurar` e prioridade na criação): permissão de criar/alterar/excluir por tipo
   e dono; atividade só em demanda acessível (e, para o desenvolvedor, nas que pode criar); troca de status e as
   transições permitidas; prioridade na alteração; tags (`conjunto-de-tags`); listagem com filtros.
2. **`atividade.repository` (integração, 466 linhas):** ordenação por `ordem` da prioridade e depois a ordem anterior
   (task 142); filtros da URL (task 102); excluída fora; tags da atividade; contagens usadas pela tela.
3. **Regra pura:** `conjunto-de-tags`.
4. **Controller:** permissão de cada rota, incluindo as ações em massa (task 102).
5. **IA:** executores `alterar-atividade`, `atribuir-tag`; ferramentas `consultar-demanda`, `propor-alterar-atividade`,
   `propor-atribuir-tag`, `propor-criar-atividade` (conferir cobertura dos testes agregados `alterar-atividade.test.ts` e
   `atribuir-tag.test.ts` antes).
6. **`atividade-prioridade`:** repository (integração: ordem fixa, cor em minúsculas) e controller (`GET` para qualquer
   autenticado, `PATCH` só administrador). Service já tem 3 testes.

### Frontend

7. **Lógica:** `atividade.service`; `core/services/atividade-prioridade.service`. Utils já testados
   (`faixa-execucao`, `filtros-atividade`, `intervalo-registro`) — só completar lacunas.
8. **Componentes:** `atividade-listagem` (filtros na URL, vazio/cheio/erro, seleção e `atividade-barra-em-massa`),
   `atividade-detalhe` (faixa de execução, timer, pausa em 1 clique — task 104), `atividade-nova` e
   `atividade-formulario`/`atividade-nova-dialog` (task 105), `atividade-visualizar-dialog`,
   `execucao-registro-dialog` (chips de duração, usar descrição — task 103), `atividade-tags-popover`,
   `atividade-em-execucao`, `atividade-documentos-indicador`; `prioridades-aba` fica na 184.

## Critérios de Aceite

- A ordenação por prioridade tem teste no repository; as permissões de atividade, no service.
- `npm test`, `test:integracao` e builds verdes; divergências como `todo` + `PROBLEMS.md`.

## Fora de Escopo

- Execuções em si (178), mesmo as iniciadas pela tela de atividade — aqui só o componente chama a service certa.

## Dependências

171, 172, 173, 176. A **105** (em `active/`, reescreve `atividade-formulario` e `atividade-nova`) termina antes da parte de
componente. Fontes: `SYSTEM.SPEC.md` §12 (`atividade`, `atividade-prioridade`), §13, §14.
