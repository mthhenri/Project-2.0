-- ==========================================================================================
-- Script de corte da Task 90 — realinhamento da tabela de controle `knex_migrations`.
--
-- Executar UMA ÚNICA VEZ por ambiente que JÁ tenha rodado as 27 migrations no formato antigo
-- (`.ts`), ANTES de trocar o código para o SqlMigrationSource. Renomeia cada registro já
-- gravado sob o nome antigo (`20240001_....ts`) para o novo (`0001 - ....sql`), para que o
-- Knex reconheça as 27 como já aplicadas e não tente reaplicá-las contra o schema existente.
--
-- NÃO é uma migration e NÃO deve ser rodado por `db:migrate`. Não é reexecutável depois que
-- os nomes já foram trocados. Rodar via psql / cliente do banco, por exemplo:
--   psql "$DATABASE_URL" -f backend/src/database/realinhar-knex-migrations.sql
--
-- Ambientes criados do zero JÁ com o SqlMigrationSource não precisam deste script.
-- ==========================================================================================

BEGIN;

UPDATE knex_migrations SET name = '0001 - Criação da função de manutenção de updated_date.sql'         WHERE name = '20240001_criar_funcao_updated_date.ts';
UPDATE knex_migrations SET name = '0002 - Criação da tabela usuario.sql'                                WHERE name = '20240002_criar_tabela_usuario.ts';
UPDATE knex_migrations SET name = '0003 - Criação da tabela projeto.sql'                                WHERE name = '20240003_criar_tabela_projeto.ts';
UPDATE knex_migrations SET name = '0004 - Criação da tabela tag.sql'                                    WHERE name = '20240004_criar_tabela_tag.ts';
UPDATE knex_migrations SET name = '0005 - Criação da tabela demanda.sql'                                WHERE name = '20240005_criar_tabela_demanda.ts';
UPDATE knex_migrations SET name = '0006 - Criação da tabela demanda_usuario.sql'                        WHERE name = '20240006_criar_tabela_demanda_usuario.ts';
UPDATE knex_migrations SET name = '0007 - Criação da tabela demanda_conexao.sql'                        WHERE name = '20240007_criar_tabela_demanda_conexao.ts';
UPDATE knex_migrations SET name = '0008 - Criação da tabela demanda_tag.sql'                            WHERE name = '20240008_criar_tabela_demanda_tag.ts';
UPDATE knex_migrations SET name = '0009 - Criação da tabela atividade.sql'                              WHERE name = '20240009_criar_tabela_atividade.ts';
UPDATE knex_migrations SET name = '0010 - Criação da tabela atividade_tag.sql'                          WHERE name = '20240010_criar_tabela_atividade_tag.ts';
UPDATE knex_migrations SET name = '0011 - Criação da tabela execucao.sql'                               WHERE name = '20240011_criar_tabela_execucao.ts';
UPDATE knex_migrations SET name = '0012 - Criação da tabela dia_nao_util.sql'                           WHERE name = '20240012_criar_tabela_dia_nao_util.ts';
UPDATE knex_migrations SET name = '0013 - Alteração dos valores de status da demanda.sql'               WHERE name = '20240013_alterar_status_demanda.ts';
UPDATE knex_migrations SET name = '0014 - Adição da coluna duracao em dia_nao_util.sql'                 WHERE name = '20240014_adicionar_duracao_dia_nao_util.ts';
UPDATE knex_migrations SET name = '0015 - Seed do usuário gestor inicial.sql'                           WHERE name = '20240015_seed_usuario_gestor_inicial.ts';
UPDATE knex_migrations SET name = '0016 - Renomeação da função de updated_date para inglês.sql'         WHERE name = '20240016_renomear_funcao_updated_date.ts';
UPDATE knex_migrations SET name = '0017 - Seed de tags padrão.sql'                                      WHERE name = '20240017_seed_tags_padrao.ts';
UPDATE knex_migrations SET name = '0018 - Seed complementar de tags padrão.sql'                         WHERE name = '20240018_seed_tags_padrao_complemento.ts';
UPDATE knex_migrations SET name = '0019 - Remoção da coluna ordem_exibicao.sql'                         WHERE name = '20240019_remover_ordem_exibicao.ts';
UPDATE knex_migrations SET name = '0020 - Padronização dos nomes de constraints.sql'                    WHERE name = '20240020_padronizar_nomes_constraints.ts';
UPDATE knex_migrations SET name = '0021 - Seed de feriados nacionais fixos.sql'                         WHERE name = '20240021_seed_feriados_nacionais.ts';
UPDATE knex_migrations SET name = '0022 - Conversão das datas para timestamptz.sql'                     WHERE name = '20240022_converter_datas_para_timestamptz.ts';
UPDATE knex_migrations SET name = '0023 - Remoção da coluna prioridade em demanda.sql'                  WHERE name = '20240023_remover_prioridade_demanda.ts';
UPDATE knex_migrations SET name = '0024 - Adição da coluna anotacoes_alteracao_data em usuario.sql'     WHERE name = '20240024_adicionar_anotacoes_alteracao_data_usuario.ts';
UPDATE knex_migrations SET name = '0025 - Conversão dos enums em tabelas de referência.sql'             WHERE name = '20240025_enums_para_tabelas_referencia.ts';
UPDATE knex_migrations SET name = '0026 - Criação da tabela ponto_justificativa.sql'                    WHERE name = '20240026_criar_ponto_justificativa.ts';
UPDATE knex_migrations SET name = '0027 - Adição do status Cancelada em tipo_demanda_status.sql'        WHERE name = '20240027_adicionar_status_cancelada_demanda.ts';

COMMIT;
