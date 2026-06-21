# Task 55 — core/database: Correção de Padrões

## Objetivo

Corrigir o desvio de linguagem identificado pela auditoria da **task 44**
(`docs/AUDITORIA.md` §4.8): a função/trigger de BaseEntity `fn_atualizar_updated_date()`
nomeia um mecanismo **genérico/arquitetural** com verbo **português**, contrariando o
§16 #12 ("nunca escrever conceito genérico/arquitetural em português").

> **Referência cruzada:** task 44 · `docs/AUDITORIA.md` §4.8.

---

## Contexto

A função `fn_atualizar_updated_date()` mantém o campo `updated_date` da `BaseEntity` —
um mecanismo genérico (existe em qualquer projeto). Pelo §4/§16 #12 do SPEC, conceitos
genéricos/arquiteturais são escritos em **inglês**. O identificador atual mistura idiomas
(`atualizar` em português + `updated_date` em inglês). A função é referenciada pelos
triggers `trg_atualizar_updated_date` (ou equivalente) de todas as 11 tabelas.

**Arquivos:**
- `backend/src/database/migrations/20240001_criar_funcao_updated_date.ts:5,17`
  (`CREATE OR REPLACE FUNCTION fn_atualizar_updated_date()` / `DROP FUNCTION ...`).
- Os triggers que chamam a função, criados nas migrations de cada tabela
  (`20240002`–`20240012`, e os de tabelas adicionadas depois).

---

## Escopo

### Renomear a função (e os triggers) para inglês — via migration nova

> Migrations já aplicadas **não** devem ser editadas in-place (o histórico do banco
> depende delas). Criar uma **nova migration** que renomeia a função e recria os triggers.

**Correção esperada:**
1. Criar nova migration `…_renomear_funcao_updated_date` que:
   - Cria `fn_set_updated_date()` com o mesmo corpo (`NEW.updated_date = NOW(); RETURN NEW;`).
     > Nome fixado em `fn_set_updated_date` — já refletido no `SCHEMA.md` (não usar outra variante).
   - Recria, em cada tabela, o trigger apontando para a nova função (`DROP TRIGGER ... ; CREATE TRIGGER ...`).
   - Faz `DROP FUNCTION IF EXISTS fn_atualizar_updated_date() CASCADE;` ao final.
   - `down` reverte para a função/triggers antigos.
2. **`SCHEMA.md` já foi atualizado** para `fn_set_updated_date` (definição + todos os
   triggers) — confirmar que o nome na migration bate exatamente com o documentado.

> O nome em inglês escolhido deve constar na documentação (abaixo) como o padrão para
> objetos genéricos de banco (funções/triggers de infraestrutura).

---

## Atualização de Documentação (obrigatória)

- **`SYSTEM.SPEC.md` §4 (Regras de Linguagem) / §9** e **`CONVENTIONS.md`** —
  acrescentar um exemplo concreto ✅/❌ deixando claro que **funções, triggers e demais
  objetos genéricos de banco** (mecanismos de infraestrutura, não regra de negócio) são
  nomeados em **inglês**:
  - ❌ `fn_atualizar_updated_date`  ✅ `fn_set_updated_date`
  - Distinguir de objetos de **negócio** (tabelas/colunas em português), que permanecem
    em português (`dia_nao_util`, `nome_completo`).

---

## Verificação

1. `npm run db:migrate --workspace=backend` aplica a nova migration sem erro; `db:rollback`
   reverte sem erro.
2. `npm run build --workspace=backend` — sem erros.
3. Checagem negativa: nenhuma função/trigger de infraestrutura com verbo português
   (`grep` por `fn_atualizar`/`trg_atualizar` não retorna nada nas migrations ativas no banco).
4. Triggers de todas as tabelas continuam atualizando `updated_date` no `UPDATE`
   (testar um `UPDATE` simples e conferir que `updated_date` muda).

---

## NÃO implementar nesta task

- Editar in-place a migration `20240001` ou qualquer migration já aplicada — usar **nova** migration.
- Qualquer mudança nos módulos de negócio (cada um tem sua própria spec).
- Renomear tabelas/colunas de negócio (estão corretas em português).
