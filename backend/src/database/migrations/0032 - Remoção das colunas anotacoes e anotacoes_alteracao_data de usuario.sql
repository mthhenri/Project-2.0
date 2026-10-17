-- UP

-- Task 128: o pad vive nas cinco seções de `anotacao` desde a task 126. Antes de apagar, confere que a cópia da
-- migration 0031 cobriu todo mundo: nenhum usuário pode ter texto em `usuario.anotacoes` com a seção PESSOAL vazia.
DO $conferencia$
DECLARE
  sem_copia INTEGER;
BEGIN
  SELECT COUNT(*) INTO sem_copia
  FROM usuario
  WHERE usuario.anotacoes IS NOT NULL
    AND btrim(usuario.anotacoes, E' \t\r\n') <> ''
    AND NOT EXISTS (
      SELECT 1
      FROM anotacao
      INNER JOIN tipo_anotacao ON tipo_anotacao.id = anotacao.tipo_anotacao_id
      WHERE anotacao.usuario_id = usuario.id
        AND anotacao.is_deleted = false
        AND tipo_anotacao.codigo = 'PESSOAL'
        AND btrim(anotacao.texto, E' \t\r\n') <> ''
    );

  IF sem_copia > 0 THEN
    RAISE EXCEPTION 'Migration 0032 interrompida: % usuário(s) com texto em usuario.anotacoes e a seção PESSOAL vazia. Rode a migration 0031 (copia o texto) antes de remover a coluna.', sem_copia;
  END IF;
END
$conferencia$;

ALTER TABLE usuario DROP COLUMN anotacoes;
ALTER TABLE usuario DROP COLUMN anotacoes_alteracao_data;

-- DOWN

-- Recria as colunas (nullable, sem DEFAULT) e devolve o texto da seção PESSOAL para `anotacoes`. A data da última
-- alteração volta com o `updated_date` da seção, quando ela tem texto.
ALTER TABLE usuario ADD COLUMN anotacoes TEXT;
ALTER TABLE usuario ADD COLUMN anotacoes_alteracao_data TIMESTAMPTZ;

UPDATE usuario
SET anotacoes = anotacao.texto,
    anotacoes_alteracao_data = anotacao.updated_date
FROM anotacao, tipo_anotacao
WHERE anotacao.usuario_id = usuario.id
  AND tipo_anotacao.id = anotacao.tipo_anotacao_id
  AND tipo_anotacao.codigo = 'PESSOAL'
  AND anotacao.is_deleted = false
  AND btrim(anotacao.texto, E' \t\r\n') <> '';
