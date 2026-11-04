# 276 — Auditoria do filtro `is_deleted` em todo o SQL do backend

> Consequência da task 275: o relato (horas que apareciam na demanda e no volume, mas não nas atividades)
> mostrou leituras que tratam o mesmo registro de jeitos diferentes. Decisão do autor (2026-11-04):
> `is_deleted = true` é morto, para o sistema equivale a apagado fisicamente, e **toda query filtra, sempre**.
> O que se decide é se uma listagem mostra ou não o **inativo** (`ativo`), nunca o excluído.

## Objetivo

Garantir, com evidência, que nenhuma consulta do backend lê, soma, conta, junta ou altera registro excluído, e
que essa regra está escrita nas regras de padrão do projeto de forma completa e verificável por máquina.

## Entregáveis

1. **Inventário.** Listar todo SQL do backend que toca tabela de negócio: os 33 repositories, o SQL de `services`,
   `executores` e `ferramentas` que chame `executarConsulta`/`executarComando`, `database/scripts/*.sql` e
   `*.ts` de seed, e os repositories do chat e da mensagem direta em Postgres. O resultado é uma tabela em
   `docs/specs/<estado>/276-auditoria-is-deleted-nos-repositorios/INVENTARIO.md` com, por consulta: arquivo,
   método, tabelas lidas (inclusive em `JOIN`, subconsulta, `EXISTS`, CTE e `UPDATE ... FROM`) e veredito
   (`filtra`, `corrigida` ou `isenta` com o motivo).
2. **Correção.** Toda consulta fora do padrão passa a filtrar `<alias>.is_deleted = false` em **cada** tabela de
   negócio que lê ou altera (`FROM`, `JOIN`, subconsulta, `EXISTS`, CTE, `UPDATE`), não só na principal. Cada
   correção tem teste de integração com um registro excluído que prova a exclusão do resultado. Se uma correção
   **mudar o que uma tela mostra ou soma**, vai ao autor antes de aplicar (skill `gerenciamento-de-impacto`).
3. **Exceções nomeadas e fechadas.** O inventário e a regra listam as únicas isenções admitidas, cada uma com
   motivo: leituras de restauração (`recuperarExcluid[oa]`, §9.2 #11), tabelas do catálogo do PostgreSQL e
   `knex_migrations` (Modelagem), funções de conjunto (`generate_series`, `jsonb_each`) e CTEs que só reorganizam
   linhas já filtradas. Qualquer outra isenção é defeito.
4. **Regra de padrão completa.** Hoje a regra existe em `docs/CONVENTIONS.md` (§Proibições e exemplos SQL),
   `docs/SYSTEM.SPEC.md` §9.2 #1 e §16 #4, mas diz só "todo SELECT inclui `WHERE [tabela].is_deleted = false`".
   Reescrever (nos três pontos, sem divergir) para cobrir: toda tabela de negócio em `JOIN`/subconsulta/`EXISTS`/CTE,
   `UPDATE` e soft delete que não reabrem registro morto, o princípio "excluído é morto" e a lista fechada de
   exceções do entregável 3. `CLAUDE.md`/`AGENTS.md` e as skills `sql-migrations` e `conventions-check` já trazem o princípio
   (alinhamento de 2026-11-04); conferir que o texto final da regra e o das skills não divergem (cópias idênticas).
5. **Trava mecânica.** Um verificador estático de SQL (script da raiz, no mesmo molde de
   `scripts/verificar-estilo-inline.mjs`, com teste em `*.test.mjs`) que reprova consulta de tabela de negócio sem o
   filtro, respeitando a lista fechada de exceções, ligado ao `npm run lint:tudo` para que a regra deixe de depender
   de revisão manual. Se uma heurística estática não bastar para um caso (SQL montado por fragmentos), o caso
   entra no inventário como revisão manual, nunca como isenção silenciosa.

## Critérios de Aceite

- `INVENTARIO.md` cobre 100% dos arquivos com SQL de negócio; a contagem de arquivos e de consultas é conferida por
  busca (`executarConsulta`, `executarComando`, `knex.raw`) e bate com a tabela.
- `npm run test --workspace=backend`, `npm run test:integracao`, `npm run build --workspace=backend`,
  `npm run repo:test`, `npm run lint:tudo` e `npm run repo:verificar` sem falha; o verificador novo falha de propósito
  num SQL de exemplo sem filtro (teste) e passa no código real.
- `diff -r .claude/skills .agents/skills` vazio e os três textos da regra (CONVENTIONS, SYSTEM.SPEC §9.2 e §16)
  iguais no conteúdo.
- Cada correção com teste de integração; a lista do que mudou de comportamento visível, se houver, vai no fecho.
- Revisão independente (agente `revisor`) do diff, por tocar SQL em vários módulos.

## Fora de Escopo

- Mudar a regra de exclusão de usuário (já feita na task 275) ou a de qualquer outra entidade.
- Decidir se uma listagem mostra o inativo: é por `ativo`, tela a tela, e não entra aqui.
- Migrations: corrigir dado já gravado (usuários excluídos com execução, por exemplo) o autor faz à mão.
- Frontend e desktop (não têm SQL).

## Dependências

Task 275 em `done/`; `docs/SYSTEM.SPEC.md` §9.2 e §16, `docs/CONVENTIONS.md`, `docs/SCHEMA.md`
(quais tabelas têm `is_deleted`) e skills `sql-migrations`, `conventions-check` e `gerenciamento-de-impacto`.

## Riscos e Mitigação

- **Falso positivo do verificador** (aliases, CTEs, SQL montado com `${}`): começar pelo inventário manual e só
  depois automatizar, com a lista de exceções no próprio script e testada.
- **Corrigir muda o que a tela soma ou mostra** (o caso original): cada mudança de comportamento é listada e
  aprovada pelo autor antes de entrar; correção silenciosa que altera total de horas não passa.
- **Tabela sem `is_deleted`**: conferir em `docs/SCHEMA.md` antes de exigir o filtro; tabela sem a coluna entra na
  lista de exceções com o motivo.
