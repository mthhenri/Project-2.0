# Task 175 — Testes: projetos

> Task 5/17 da guarda-chuva [`testes-automatizados.spec.md`](testes-automatizados.spec.md) — método comum lá.
> Inventário de partida: [análise](testes-automatizados/ANALISE.md).

## Objetivo

Provar quem cria e quem vê projeto — a regra de acesso do desenvolvedor por `demanda_usuario` vive no SQL e hoje não tem
teste — e o comportamento das telas de projeto.

## Entregáveis

### Backend

1. **`projeto.service`** (3 testes, só `restaurar`): só gestor/administrador cria, altera e exclui; desenvolvedor recebe
   `UnauthorizedAccessException`; código duplicado entre ativos recusado; recuperar projeto inacessível ao desenvolvedor
   é recusado (404 ou 403, o que o documento disser); exclusão é soft delete.
2. **`projeto.repository` (integração):** gestor vê todos; desenvolvedor só os com ao menos uma linha dele em
   `demanda_usuario` (em demanda não excluída); **gestor sem linha em `demanda_usuario` vê tudo**; projeto excluído
   fora; paginação e filtros da listagem; unicidade de código.
3. **Controller:** permissão de cada rota.
4. **IA:** `listar-projetos.ferramenta` devolve só os projetos acessíveis ao usuário do token; conferir que
   `criar-projeto.executor`, `propor-criar-projeto` e `dados-do-projeto-proposto` (já testados) cobrem a recusa ao
   desenvolvedor.

### Frontend

5. **Lógica:** `modules/projeto/services/projeto.service`.
6. **Componentes:** `projeto-listagem` (vazio, cheio, erro; botão de criar só para gestor), `projeto-detalhe`,
   `projeto-formulario-dialog` (validação, envio, erro de código duplicado), `projeto-status-chip`.

## Critérios de Aceite

- As linhas "Criar projeto" e "Ver todos os projetos" de §14 têm teste em service **e** repository.
- `npm test`, `test:integracao` e builds verdes; divergências como `todo` + `PROBLEMS.md`.

## Fora de Escopo

- Demandas dentro do projeto (176). Mudar a regra de acesso.

## Dependências

171, 172, 173. Fontes: `SYSTEM.SPEC.md` §12 (`projeto`), §13 (Projeto), §14; `docs/SCHEMA.md`.
