-- UP

-- Autonomia da IA por tipo de proposta (task 228). A configuração versionada passa a guardar `niveis_proposta` (JSONB): regra de proposta →
-- nível ("FAZ_E_AVISA" ou "PERGUNTA"; os tipos que mexem em horas, ponto e projeto são fixos e ficam fora). Anulável: uma versão antiga não
-- guardou o mapa e vale o padrão do `shared`; a versão nova grava o mapa inteiro que a aplicação fornece e, sem ele, copia o da anterior.
ALTER TABLE configuracao_ia ADD COLUMN niveis_proposta JSONB;
ALTER TABLE configuracao_ia ADD CONSTRAINT chk_configuracao_ia_niveis_proposta CHECK (niveis_proposta IS NULL OR jsonb_typeof(niveis_proposta) = 'object');

-- Quem executou a proposta: a IA sozinha, pelo nível "Faz e avisa" (verdadeiro), ou o usuário no cartão (falso). A tela usa para mostrar a linha de
-- aviso da IA no lugar da de "feito". Nenhuma coluna tem DEFAULT: nasce anulável, as propostas de hoje foram todas do usuário (falso) e só então vira NOT NULL.
ALTER TABLE proposta_ia ADD COLUMN aplicada_pela_ia BOOLEAN;
UPDATE proposta_ia SET aplicada_pela_ia = false;
ALTER TABLE proposta_ia ALTER COLUMN aplicada_pela_ia SET NOT NULL;

-- DOWN

ALTER TABLE proposta_ia DROP COLUMN aplicada_pela_ia;

ALTER TABLE configuracao_ia DROP CONSTRAINT chk_configuracao_ia_niveis_proposta;
ALTER TABLE configuracao_ia DROP COLUMN niveis_proposta;
