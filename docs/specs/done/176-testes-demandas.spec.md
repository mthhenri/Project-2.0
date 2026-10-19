# Task 176 — Testes: demandas

> Task 6/17 da guarda-chuva [`testes-automatizados.spec.md`](../backlog/testes-automatizados.spec.md) — método comum lá.
> Inventário de partida: [análise](../backlog/testes-automatizados/ANALISE.md).

## Objetivo

Cobrir o maior módulo do sistema (`demanda.service` com 835 linhas e só `restaurar` testado; repository com 1058 linhas
sem teste): hierarquia, grafo sem ciclo, membros, tags e as permissões de demanda de `SYSTEM.SPEC.md` §14.

## Entregáveis

### Backend

1. **`demanda.service`** — uma bateria por regra de §14 "Demandas":
   - desenvolvedor só cria sub-demanda (`demandaPaiId` obrigatório); gestor cria raiz;
   - criador desenvolvedor é auto-atribuído; **gestor criador não é**; membros escolhidos na criação entram;
   - desenvolvedor vê demanda de projeto acessível, mas só edita as que é membro (`podeEditar`);
   - `descricaoCliente` só o gestor altera (as demais descrições, o membro);
   - atribuir/remover membro: gestor qualquer um; desenvolvedor só a si mesmo, em projeto acessível;
   - **o último membro não sai**;
   - conexões: ciclo recusado com `BusinessException` explicativa, nada gravado; excluir conexão; listar;
   - tags: desenvolvedor só em demanda de que é membro;
   - árvore, ancestral, planejamento, grafo e exclusão (soft) com as permissões de leitura.
2. **`demanda.repository` (integração):** CTE recursiva de ciclo (ciclo direto, indireto de 3+ nós, auto-conexão,
   conexão válida em diamante); `caminho` na listagem (task 88); árvore e ancestral por CTE; excluída fora de toda
   leitura, inclusive dentro das CTEs; filtro de projeto acessível ao desenvolvedor; transação da linha ~134 atômica.
3. **Regra pura:** `novo-pai-da-demanda` (sem teste); conferir `redacao-da-demanda` e `sugestoes-de-conexao`.
4. **Controller:** permissão e DTO de cada rota (276 linhas, maior controller).
5. **IA:** executores `alterar-demanda`, `atribuir-membro` (conferir cobertura dos testes agregados
   `alterar-demanda.test.ts`/`atribuir-membro.test.ts`); ferramentas `consultar-grafo-do-projeto`,
   `listar-demandas-do-projeto`, `propor-conectar-demanda`, `propor-descrever-demanda`, `sugerir-conexoes-e-lugar`.

### Frontend

6. **Lógica:** utils `demanda-arvore`, `demanda-datas`, `demanda-filtro`, `demanda-context-menu.factory` (itens são
   **propriedade**, nunca getter — o teste falha se voltar a ser getter); `demanda.service`.
7. **Componentes:** `demanda-projeto` (página), `demanda-toolbar`, `demanda-arvore-painel`/`-item`,
   `demanda-detalhe-dialog`, `demanda-formulario-dialog` (raiz só para gestor; `descricaoCliente` só para gestor),
   `demanda-membro-lista`/`-membros-cabecalho` (desenvolvedor só se inclui/remove), `demanda-conexao-lista`,
   `demanda-tags-cabecalho`, `demanda-planejamento-painel`, `demanda-metricas`, `demanda-status-chip`.
   `demanda-grafo` (D3): testar os dados entregues ao desenho e as interações, não o SVG.

## Critérios de Aceite

- Toda linha de demanda em §14 e todo bullet de "Demandas" e "Grafo de Demandas" têm teste nomeado, listado no fecho.
- `npm test`, `test:integracao` e builds verdes; divergências como `todo` + `PROBLEMS.md`.

## Fora de Escopo

- Mudar a regra de membros ou do grafo; desenho do grafo; tasks 167–170 em andamento (se tocarem a mesma área, esperar).

## Dependências

171, 172, 173 e 175 (fábricas de projeto acessível). Tasks **167–170** (em `active/`) mexem em demanda pela IA: fazer
esta depois delas. Fontes: `SYSTEM.SPEC.md` §12–§14; memória "gestor não está em `demanda_usuario`".
