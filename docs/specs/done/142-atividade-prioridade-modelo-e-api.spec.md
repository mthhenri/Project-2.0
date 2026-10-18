# Task 142 — Prioridade de atividade: modelo e API

> Origem: guarda-chuva [`rework-chat-ia.spec.md`](rework-chat-ia.spec.md), bloco 6. Seção "Prioridade de atividades" e `rework-chat-ia/modelagem.md` (Prioridade).

## Objetivo

Dar prioridade às atividades no banco e na API (URGENTE, ALTA, MEDIA, BAIXA, INDEFINIDA, nessa ordem), com a cor editável só pelo administrador, para a IA propor a prioridade e a listagem ordenar por ela. Esta task não toca nas telas (143).

## Entregáveis

1. Migration `0036` (confira o próximo número): `tipo_atividade_prioridade` (BaseEntity, `codigo`, `descricao`, `ordem` INTEGER, `cor` VARCHAR(7)) com os cinco seeds, e `atividade.tipo_atividade_prioridade_id` NOT NULL com FK; as atividades existentes recebem INDEFINIDA **na própria migration** (sem `DEFAULT`), com `-- DOWN` correspondente. Segue a skill `sql-migrations`.
2. Shared: `TipoAtividadePrioridadeEnum` (valores iguais aos nomes), DTOs de entrada e saída seguindo a skill `project20-dto-conventions` (`AtividadeCriarDto`/`AtividadeAlterarDto` ganham a prioridade; os resumos e o detalhe devolvem a prioridade com `descricao`, `ordem` e `cor`). **Rodar o build do frontend ao mexer em DTOs** (stub do `class-validator`).
3. Backend: `atividade` grava e devolve a prioridade; a criação sem prioridade usa INDEFINIDA (a service fornece o valor, nunca `DEFAULT`); a listagem ordena por `ordem` e, dentro dela, pela ordem atual (`gerenciamento-de-impacto`: toda consulta que lista atividades, inclusive a do assistente e a de relatórios, é avaliada).
4. Rota de listagem das prioridades (`GET /atividade-prioridade`, qualquer usuário) e de alteração da cor (`PATCH`, `@AdministradorOnly`, só `cor` no formato `#rrggbb`; `codigo`, `descricao` e `ordem` são fixos).
5. Testes: ordenação, valor padrão da criação, alteração da cor só por administrador, cor inválida recusada.

## Critérios de Aceite

- A migration sobe e desce num banco com atividades existentes; todas ficam INDEFINIDA, e o rollback devolve o schema anterior.
- Criar atividade com e sem prioridade e listar mostra a ordem URGENTE → INDEFINIDA; gestor e desenvolvedor recebem 403 ao alterar a cor.
- Testes de `backend` (node:test) e builds de `backend` e `frontend` passam; frontend sem lint (P-001), declarado no fecho.

## Fora de Escopo

- Qualquer tela (143) e a IA propor prioridade (145).
- Prioridade calculada ou sugerida automaticamente; prioridades novas criadas pelo usuário.

## Dependências

`125` a `128` (pad) não são pré-requisito. Consulta `docs/SCHEMA.md` e a guarda-chuva (seção Prioridade).
