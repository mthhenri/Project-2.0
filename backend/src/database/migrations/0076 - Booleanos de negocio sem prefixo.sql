-- UP

-- Booleano de negócio sem prefixo `is_`/`eh_` (`is_deleted` fica: é genérico, da BaseEntity). Só os nomes mudam; nenhum índice,
-- constraint, função ou view depende dessas colunas.
ALTER TABLE demanda RENAME COLUMN is_estrutural TO estrutural;
ALTER TABLE demanda_conexao RENAME COLUMN eh_bidirecional TO bidirecional;
ALTER TABLE plano RENAME COLUMN is_solo TO solo;
ALTER TABLE plano RENAME COLUMN is_arquivado TO arquivado;

-- DOWN

ALTER TABLE plano RENAME COLUMN arquivado TO is_arquivado;
ALTER TABLE plano RENAME COLUMN solo TO is_solo;
ALTER TABLE demanda_conexao RENAME COLUMN bidirecional TO eh_bidirecional;
ALTER TABLE demanda RENAME COLUMN estrutural TO is_estrutural;
