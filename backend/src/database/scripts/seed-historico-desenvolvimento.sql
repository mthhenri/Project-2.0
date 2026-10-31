-- Executar pelo CLI seed-historico-desenvolvimento.ts, dentro de uma transação.
-- Não é migration. A indicação de ambiente é uma trava de operação, não autenticação:
-- PostgreSQL não consegue descobrir o APP_AMBIENTE do processo que o acessa.
-- Dados fictícios constantes; nenhuma entrada de usuário é interpolada neste SQL.
DO $seed$
DECLARE
  sobrenomes text[] := ARRAY['Henrique', 'Caranguejo', 'Nebuloso', 'Parafuso', 'Trovão', 'Abacaxi'];
  logins text[] := ARRAY['henrique', 'caranguejo', 'nebuloso', 'parafuso', 'trovao', 'abacaxi'];
  codigos text[] := ARRAY['DEV-PORTAL', 'DEV-ESTOQUE', 'DEV-AGENDA'];
  nomes text[] := ARRAY['Portal do Cliente', 'Estoque Inteligente', 'Agenda da Equipe'];
  cores text[] := ARRAY['#2563eb', '#16a34a', '#9333ea'];
  entregas text[];
  usuarios integer[] := ARRAY[]::integer[];
  atividades integer[] := ARRAY[]::integer[];
  projeto_id_criado integer;
  raiz_id integer;
  demanda_id_criada integer;
  demanda_anterior_id integer;
  atividade_id_criada integer;
  usuario_id_criado integer;
  projeto_indice integer;
  entrega_indice integer;
  usuario_indice integer;
  dia_deslocamento integer;
  periodo integer;
  total_existentes integer;
  dia date;
  inicio timestamptz;
  criacao timestamptz := (CURRENT_DATE - 91)::timestamp AT TIME ZONE 'America/Sao_Paulo';
BEGIN
  IF current_setting('project20.seed_ambiente', true) IS DISTINCT FROM 'development' THEN
    RAISE EXCEPTION 'Seed recusado: execute pelo CLI em development';
  END IF;
  -- Serializa execuções simultâneas deste seed até o fim da transação.
  PERFORM pg_advisory_xact_lock(2020273);
  SELECT count(*) INTO total_existentes FROM projeto
  WHERE codigo = ANY(codigos) AND is_deleted = false;
  IF total_existentes = 3 THEN
    IF (SELECT count(*) FROM usuario WHERE login = ANY(ARRAY[
        'dev.mateus.henrique', 'dev.mateus.caranguejo', 'dev.mateus.nebuloso',
        'dev.mateus.parafuso', 'dev.mateus.trovao', 'dev.mateus.abacaxi']) AND is_deleted = false) <> 6
      OR (SELECT count(*) FROM demanda JOIN projeto ON projeto.id = demanda.projeto_id
          WHERE projeto.codigo = ANY(codigos) AND projeto.is_deleted = false AND demanda.is_deleted = false) <> 21
      OR (SELECT count(*) FROM atividade JOIN demanda ON demanda.id = atividade.demanda_id
          JOIN projeto ON projeto.id = demanda.projeto_id WHERE projeto.codigo = ANY(codigos)
          AND projeto.is_deleted = false AND demanda.is_deleted = false AND atividade.is_deleted = false) <> 108 THEN
      RAISE EXCEPTION 'Colisão parcial: cenário existente incompleto; nenhum dado foi alterado';
    END IF;
    RAISE NOTICE 'Os três projetos já existem; nenhum dado foi alterado.';
    RETURN;
  END IF;
  IF total_existentes > 0 OR EXISTS (
    SELECT 1 FROM usuario WHERE login LIKE 'dev.mateus.%' AND is_deleted = false
  ) THEN
    RAISE EXCEPTION 'Colisão com dados existentes: seed cancelado sem alterar registros';
  END IF;

  FOR usuario_indice IN 1..6 LOOP
    INSERT INTO usuario (created_date, updated_date, is_deleted, deleted_date, login,
      senha_encriptada, nome_completo, cargo_titulo, horas_diarias_necessarias,
      tipo_usuario_id, tipo_usuario_status_id)
    SELECT criacao, criacao, false, NULL, 'dev.mateus.' || logins[usuario_indice],
      '$2b$10$51f1N0cpsHPMmnogphlgQ.dnH5GAbLLTuMtcN0kD7EZZIWnewhb/K',
      'Mateus ' || sobrenomes[usuario_indice], 'Desenvolvedor', 8,
      (SELECT id FROM tipo_usuario WHERE codigo = 'DESENVOLVEDOR' AND is_deleted = false),
      (SELECT id FROM tipo_usuario_status WHERE codigo = 'ATIVO' AND is_deleted = false)
    RETURNING id INTO usuario_id_criado;
    usuarios := array_append(usuarios, usuario_id_criado);
  END LOOP;

  FOR projeto_indice IN 1..3 LOOP
    entregas := CASE projeto_indice
      WHEN 1 THEN ARRAY['Cadastro de clientes', 'Acesso ao portal', 'Consulta de pedidos', 'Documentos do cliente', 'Notificações', 'Painel de indicadores']
      WHEN 2 THEN ARRAY['Cadastro de produtos', 'Entrada de mercadorias', 'Movimentação de estoque', 'Inventário', 'Alertas de reposição', 'Relatório de perdas']
      ELSE ARRAY['Cadastro da equipe', 'Disponibilidade semanal', 'Agendamento', 'Calendário compartilhado', 'Lembretes', 'Resumo de ocupação'] END;
    INSERT INTO projeto (created_date, updated_date, is_deleted, deleted_date, nome, codigo, cor,
      tipo_projeto_status_id, inicio_data, previsao_fim_data)
    SELECT criacao, criacao, false, NULL, nomes[projeto_indice], codigos[projeto_indice], cores[projeto_indice],
      (SELECT id FROM tipo_projeto_status WHERE codigo = 'ATIVO' AND is_deleted = false),
      CURRENT_DATE - 91, CURRENT_DATE + 30 RETURNING id INTO projeto_id_criado;
    INSERT INTO projeto_volume_vigencia (created_date, updated_date, is_deleted, deleted_date,
      projeto_id, vigencia_inicio_data, volume_esperado_horas)
    SELECT criacao, criacao, false, NULL, projeto_id_criado, date_trunc('month', CURRENT_DATE - 91)::date, 320;
    INSERT INTO demanda (created_date, updated_date, is_deleted, deleted_date, projeto_id, demanda_pai_id,
      nome, descricao_tecnica, descricao_cliente, documentacao, horas_estimadas,
      tipo_demanda_status_id, is_estrutural, previsao_fim_data, versao)
    SELECT criacao, criacao, false, NULL, projeto_id_criado, NULL, 'Entregas de ' || nomes[projeto_indice],
      '## Escopo técnico' || chr(10) || 'Módulos integrados com validação e testes.',
      'Evolução do produto em seis entregas.', 'Cenário fictício para desenvolvimento.', 0,
      (SELECT id FROM tipo_demanda_status WHERE codigo = 'PLANEJADA' AND is_deleted = false),
      true, CURRENT_DATE + 30, 1 RETURNING id INTO raiz_id;
    demanda_anterior_id := NULL;
    FOR entrega_indice IN 1..6 LOOP
      INSERT INTO demanda (created_date, updated_date, is_deleted, deleted_date, projeto_id, demanda_pai_id,
        nome, descricao_tecnica, descricao_cliente, documentacao, horas_estimadas,
        tipo_demanda_status_id, is_estrutural, previsao_fim_data, versao)
      SELECT criacao, criacao, false, NULL, projeto_id_criado, raiz_id, entregas[entrega_indice],
        '## Implementação' || chr(10) || '- Validar permissões e entradas.' || chr(10) || '- Cobrir o fluxo com testes.',
        'Permitir que a equipe utilize ' || lower(entregas[entrega_indice]) || ' com segurança.',
        '## Validação' || chr(10) || 'Conferir cadastro, consulta e mensagens de erro.', 120,
        (SELECT id FROM tipo_demanda_status WHERE codigo = CASE WHEN entrega_indice <= 3 THEN 'CONCLUIDA'
          WHEN entrega_indice <= 5 THEN 'PLANEJADA' ELSE 'PENDENTE' END AND is_deleted = false),
        false, CURRENT_DATE + (entrega_indice * 5), 1 RETURNING id INTO demanda_id_criada;
      IF demanda_anterior_id IS NOT NULL THEN
        -- Apenas anterior -> próxima: ordem crescente impede ciclos por construção.
        INSERT INTO demanda_conexao (created_date, updated_date, is_deleted, deleted_date,
          demanda_origem_id, demanda_destino_id, eh_bidirecional)
        SELECT criacao, criacao, false, NULL, demanda_anterior_id, demanda_id_criada, false;
      END IF;
      demanda_anterior_id := demanda_id_criada;
      FOR usuario_indice IN 1..6 LOOP
        INSERT INTO demanda_usuario (created_date, updated_date, is_deleted, deleted_date, demanda_id, usuario_id)
        SELECT criacao, criacao, false, NULL, demanda_id_criada, usuarios[usuario_indice];
        INSERT INTO atividade (created_date, updated_date, is_deleted, deleted_date, demanda_id, usuario_id,
          nome, tipo_atividade_status_id, tipo_atividade_prioridade_id)
        SELECT criacao, criacao, false, NULL, demanda_id_criada, usuarios[usuario_indice],
          (ARRAY['Implementar API', 'Montar interface', 'Validar permissões', 'Criar testes', 'Revisar integração', 'Documentar entrega'])[usuario_indice],
          (SELECT id FROM tipo_atividade_status WHERE codigo = CASE WHEN entrega_indice <= 3 THEN 'DESENVOLVIDA'
            WHEN entrega_indice <= 5 THEN 'DESENVOLVENDO' ELSE 'PLANEJADA' END AND is_deleted = false),
          (SELECT id FROM tipo_atividade_prioridade WHERE codigo = CASE WHEN entrega_indice = 5 THEN 'ALTA' ELSE 'MEDIA' END AND is_deleted = false)
        RETURNING id INTO atividade_id_criada;
        atividades := array_append(atividades, atividade_id_criada);
      END LOOP;
    END LOOP;
  END LOOP;

  FOR dia_deslocamento IN REVERSE 90..1 LOOP
    dia := CURRENT_DATE - dia_deslocamento;
    IF extract(isodow FROM dia) > 5 OR EXISTS (
      SELECT 1 FROM dia_nao_util WHERE is_deleted = false AND (
        dia_data = dia OR (recorrente = true AND to_char(dia_data, 'MM-DD') = to_char(dia, 'MM-DD'))
      )
    ) THEN CONTINUE; END IF;
    -- Os projetos alternam por dia; as entregas avançam em blocos de 18 dias.
    projeto_indice := 1 + ((90 - dia_deslocamento) % 3);
    entrega_indice := least(5, 1 + ((90 - dia_deslocamento) / 18));
    FOR usuario_indice IN 1..6 LOOP
      atividade_id_criada := atividades[(projeto_indice - 1) * 36 + (entrega_indice - 1) * 6 + usuario_indice];
      FOR periodo IN 0..1 LOOP
        inicio := (dia + make_time(9 + periodo * 5, (usuario_indice - 1) * 5, 0)) AT TIME ZONE 'America/Sao_Paulo';
        INSERT INTO execucao (created_date, updated_date, is_deleted, deleted_date, atividade_id, descricao, inicio_data, fim_data)
        SELECT inicio, inicio + interval '3 hours', false, NULL, atividade_id_criada,
          CASE WHEN periodo = 0 THEN 'Implementação e validação do fluxo da entrega'
            ELSE 'Testes de integração e revisão dos resultados' END,
          inicio, inicio + interval '3 hours';
      END LOOP;
    END LOOP;
  END LOOP;
  RAISE NOTICE 'Seed criado: 3 projetos, 6 devs, 21 demandas, 108 atividades e histórico de 90 dias.';
END;
$seed$;
