-- UP

-- Trava de versão dos textos da demanda (task 258), como o plano (`plano.versao`): a tela de Documentações grava os três textos (técnica, cliente e
-- documentação) com a versão que leu, e uma versão mais nova no banco recusa a gravação. Toda gravação que muda um dos textos soma 1; as demais telas
-- seguem gravando sem recusar por versão, só sobem o número. Coluna anulável, preenchida com 1 nas linhas que já existem e então NOT NULL, sem DEFAULT
-- (a aplicação fornece o valor).
ALTER TABLE demanda ADD COLUMN versao INTEGER;
UPDATE demanda SET versao = 1;
ALTER TABLE demanda ALTER COLUMN versao SET NOT NULL;
ALTER TABLE demanda ADD CONSTRAINT chk_demanda_versao_positiva CHECK (versao >= 1);

-- DOWN

ALTER TABLE demanda DROP CONSTRAINT IF EXISTS chk_demanda_versao_positiva;
ALTER TABLE demanda DROP COLUMN IF EXISTS versao;
