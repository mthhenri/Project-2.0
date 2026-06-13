# 03 — Migrations

**Depende de:** 02
**Entrega:** todas as tabelas do banco criadas e funcionando

---

## Objetivo

Criar as migrations Knex para todas as 11 tabelas do projeto, na ordem correta
de dependência definida no SCHEMA.md. Cada tabela em um arquivo de migration separado.

---

## Estrutura a Criar

```
backend/src/database/migrations/
  20240001_criar_funcao_updated_date.ts
  20240002_criar_tabela_usuario.ts
  20240003_criar_tabela_projeto.ts
  20240004_criar_tabela_tag.ts
  20240005_criar_tabela_demanda.ts
  20240006_criar_tabela_demanda_usuario.ts
  20240007_criar_tabela_demanda_conexao.ts
  20240008_criar_tabela_demanda_tag.ts
  20240009_criar_tabela_atividade.ts
  20240010_criar_tabela_atividade_tag.ts
  20240011_criar_tabela_execucao.ts
  20240012_criar_tabela_dia_nao_util.ts
```

---

## Formato de Cada Migration

Cada arquivo segue o padrão Knex com `up` e `down`:

```typescript
import type { Knex } from 'knex';

export async function up(knex: Knex): Promise<void> {
  await knex.raw(`
    -- SQL da criação aqui
  `);
}

export async function down(knex: Knex): Promise<void> {
  await knex.raw(`
    -- SQL do rollback aqui (DROP TABLE IF EXISTS ...)
  `);
}
```

---

## SQL de Cada Migration

O SQL completo de cada tabela está em `docs/SCHEMA.md`.
Copiar exatamente como está documentado, incluindo:
- Campos BaseEntity (sem DEFAULT)
- Constraints e CHECKs
- Índices e unique indexes filtrados por `is_deleted = false`
- Triggers apontando para `fn_atualizar_updated_date()`

### Ordem obrigatória

1. Função `fn_atualizar_updated_date()` — criada antes de qualquer tabela
2. `usuario`
3. `projeto`
4. `tag`
5. `demanda`
6. `demanda_usuario`
7. `demanda_conexao`
8. `demanda_tag`
9. `atividade`
10. `atividade_tag`
11. `execucao`
12. `dia_nao_util`

### Down de cada migration

O `down` deve desfazer na ordem inversa:
- DROP TABLE IF EXISTS com CASCADE onde houver FKs dependentes
- DROP TRIGGER IF EXISTS antes do DROP TABLE
- Para a migration da função: DROP FUNCTION IF EXISTS

---

## Verificação

Após criar as migrations, rodar:

```bash
npm run db:migrate
```

Verificar no PostgreSQL que todas as tabelas foram criadas com as colunas corretas.

---

## NÃO implementar nesta task

- Nenhuma seed de dados
- Nenhuma stored procedure além da função de trigger
- Nenhuma view
- Nenhuma alteração no código TypeScript da aplicação
