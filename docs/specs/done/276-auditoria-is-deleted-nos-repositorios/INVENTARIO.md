# Inventário do filtro `is_deleted` — task 276

Gerado pelo verificador `scripts/verificar-sql.mjs` sobre todo o SQL de `backend/src` (repositories, services, ferramentas, scripts e seeds; testes e migrations ficam de fora). O "corrigida" compara com o código antes da task.

**Totais:** 243 consultas em 33 arquivos. Filtra: 179. Corrigida: 46. Isenta: 18.

## Conferência da cobertura

Busca por chamadas a `executarConsulta`, `executarComando` e `.raw` fora de teste: 247 chamadas em 34 arquivos. Toda chamada que lê ou altera dado tem linha nesta tabela. Ficam sem linha, por não tocarem tabela de negócio: as duas chamadas internas do `BaseRepository`, `pg_advisory_xact_lock` (2), `pg_notify` (2), `set_config` do seed e a execução das migrations (2); o `sql` do seed histórico é o arquivo `.sql` listado aqui.

## Exceções admitidas (lista fechada)

- Leitura de restauração `recuperarExcluid[oa]` e o `UPDATE` que restaura (`SYSTEM.SPEC.md` §9.2 #11).
- Catálogo do PostgreSQL e `knex_migrations` (Modelagem).
- Funções de conjunto (`generate_series`, `jsonb_each`) e CTEs que só reorganizam linhas já filtradas.
- Três leituras de `usuario` do chat entre colaboradores, por decisão do autor em 2026-11-11: `validarExistenciaIncluindoExcluido`, `listarTiposPorIds` e `listarIdsComPermissaoDeGestor`. O histórico sobrevive a quem saiu, e a conversa de gestor segue privada depois de ele ser excluído.

## Mudanças de comportamento visível (aprovadas pelo autor em 2026-11-11)

- Prompt, versão da configuração da IA, fonte do plano e plano de autor excluído continuam na tela, com "Usuário removido".
- Atividade de demanda ou projeto excluído passa a dar "não encontrada" ao abrir. A IA ainda pausa a execução em andamento nesse caso; a proposta sai sem o nome da atividade.
- `converter-descricoes.ts` deixa de converter linhas excluídas.

## Revisão manual

- `BaseRepository.executarSoftDelete`: a tabela vem de `this.nomeTabela`; o filtro foi acrescentado e tem teste.
- `converter-descricoes.ts`: a tabela vem da lista de alvos; o `SELECT` e o `UPDATE` filtram o excluído.
- As consultas marcadas "revisão manual: filtro em fragmento" montam o `WHERE` com `condicoes.push(...)`; o filtro foi conferido nos textos do próprio método.
- Corrigidas sem teste que isole o filtro, porque um passo anterior já recusa a linha excluída (a trava é o verificador): `ativarRascunho`, `restaurarPadrao`, `recuperarPorId` e `salvarRascunho` de prompt, `inserirNovaVersao` e `alterarPrecoDaVersaoAtiva` da configuração, `listarExecutadas` e `listarDescendentes` de demanda, o `RETURNING` dos `inserir`.

## Limites do verificador

`scripts/verificar-sql.mjs` é análise estática. Num `SET` ou `WHERE` montado por fragmentos ele procura o texto no método inteiro, soma os dois ramos de um ternário e trata o nome de uma CTE como válido no SQL todo. Esses casos seguem dependendo de revisão; a revisão independente não achou defeito escondido por eles no código de hoje.

## Consultas

| Arquivo | Linha | Método | Tabelas | Veredito |
|---|---|---|---|---|
| core/base/base.repository.ts | 44 | executarSoftDelete | (tabela dinâmica) (UPDATE) | corrigida (revisão manual: tabela vem por parâmetro) |
| database/scripts/converter-descricoes.ts | 54 | lerLinhas | (tabela dinâmica) | corrigida (revisão manual: tabela vem por parâmetro) |
| database/scripts/converter-descricoes.ts | 109 | principal | (tabela dinâmica) (UPDATE) | corrigida (revisão manual: tabela vem por parâmetro) |
| database/scripts/seed-conversas-desenvolvimento.ts | 27 | semearConversas | usuario, tipo_usuario (JOIN) | filtra |
| database/scripts/seed-desenvolvimento.ts | 98 | inserirDemanda | tipo_demanda_status, demanda (INSERT) | filtra |
| database/scripts/seed-desenvolvimento.ts | 145 | semearDesenvolvimento | projeto | filtra |
| database/scripts/seed-desenvolvimento.ts | 160 | semearDesenvolvimento | usuario | filtra |
| database/scripts/seed-desenvolvimento.ts | 174 | semearDesenvolvimento | tipo_usuario, usuario (INSERT) | filtra |
| database/scripts/seed-desenvolvimento.ts | 215 | semearDesenvolvimento | tipo_projeto_status, projeto (INSERT) | filtra |
| database/scripts/seed-desenvolvimento.ts | 255 | semearDesenvolvimento | demanda_usuario (INSERT) | filtra |
| database/scripts/seed-desenvolvimento.ts | 277 | semearDesenvolvimento | tipo_atividade_status, tipo_atividade_prioridade, atividade (INSERT) | filtra |
| database/scripts/seed-desenvolvimento.ts | 315 | semearDesenvolvimento | demanda_conexao (INSERT) | filtra |
| anotacao/anotacao.repository.ts | 44 | criarSecoesFaltantes | usuario, tipo_anotacao (JOIN), anotacao (INSERT) | filtra |
| anotacao/anotacao.repository.ts | 83 | recuperarTipoDoDono | usuario, tipo_usuario (JOIN) | filtra |
| anotacao/anotacao.repository.ts | 115 | lerSecoes | anotacao, tipo_anotacao (JOIN) | filtra |
| anotacao/anotacao.repository.ts | 145 | modificarSecoes | anotacao, tipo_anotacao (JOIN) | filtra |
| anotacao/anotacao.repository.ts | 172 | modificarSecoes | anotacao (UPDATE), tipo_anotacao | corrigida |
| atividade/atividade.repository.ts | 61 | inserir | atividade (INSERT), tipo_atividade_status, tipo_atividade_prioridade | corrigida |
| atividade/atividade.repository.ts | 132 | buscarPorNome | atividade, tipo_atividade_status (JOIN), demanda (JOIN), demanda_usuario | filtra |
| atividade/atividade.repository.ts | 178 | recuperar | atividade, usuario (JOIN), tipo_usuario (JOIN), tipo_atividade_status (JOIN), demanda (JOIN), projeto (JOIN), tipo_atividade_prioridade | corrigida |
| atividade/atividade.repository.ts | 305 | listar | atividade, usuario (JOIN), tipo_usuario (JOIN), tipo_atividade_status (JOIN), tipo_atividade_prioridade (JOIN), demanda (JOIN), projeto (JOIN) | filtra (revisão manual: filtro em fragmento montado no método) |
| atividade/atividade.repository.ts | 325 | listar | atividade, usuario (JOIN), tipo_usuario (JOIN), tipo_atividade_status (JOIN), tipo_atividade_prioridade (JOIN), demanda (JOIN), projeto (JOIN), tipo_atividade_prioridade, execucao, atividade_tag, tag (JOIN) | corrigida |
| atividade/atividade.repository.ts | 475 | alterar | atividade (UPDATE), tipo_atividade_status, tipo_atividade_prioridade | corrigida |
| atividade/atividade.repository.ts | 505 | alterar | usuario | filtra |
| atividade/atividade.repository.ts | 536 | recuperarExcluida | atividade, demanda | isenta: leitura de restauração (§9.2 #11) |
| atividade/atividade.repository.ts | 567 | restaurar | atividade (UPDATE) | isenta: restauração (§9.2 #11) |
| atividade/atividade.repository.ts | 592 | possuiExecucaoAtiva | execucao | filtra |
| atividade/atividade.repository.ts | 613 | possuiExecucao | execucao | filtra |
| atividade/atividade.repository.ts | 636 | validarAcessoDemanda | demanda_usuario | filtra |
| atividade/atividade.repository.ts | 659 | listarTags | atividade_tag, tag (JOIN) | filtra |
| atividade/atividade.repository.ts | 690 | alterarTags | atividade_tag (UPDATE) | filtra |
| atividade/atividade.repository.ts | 706 | alterarTags | atividade_tag (INSERT) | filtra |
| atividade-prioridade/atividade-prioridade.repository.ts | 16 | listar | tipo_atividade_prioridade | filtra |
| atividade-prioridade/atividade-prioridade.repository.ts | 35 | alterarCor | tipo_atividade_prioridade (UPDATE) | filtra |
| calendario/calendario.repository.ts | 48 | inserir | dia_nao_util (INSERT), tipo_dia_nao_util, tipo_dia_nao_util_duracao | corrigida |
| calendario/calendario.repository.ts | 124 | recuperar | dia_nao_util, tipo_dia_nao_util (JOIN), tipo_dia_nao_util_duracao (JOIN) | filtra |
| calendario/calendario.repository.ts | 153 | listar | dia_nao_util, tipo_dia_nao_util (JOIN), tipo_dia_nao_util_duracao (JOIN) | filtra |
| calendario/calendario.repository.ts | 222 | alterar | dia_nao_util (UPDATE), tipo_dia_nao_util, tipo_dia_nao_util_duracao | corrigida |
| calendario/calendario.repository.ts | 270 | recuperarExcluido | dia_nao_util | isenta: leitura de restauração (§9.2 #11) |
| calendario/calendario.repository.ts | 291 | restaurar | dia_nao_util (UPDATE) | isenta: restauração (§9.2 #11) |
| calendario/calendario.repository.ts | 321 | validarDia | dia_nao_util | filtra |
| calendario/calendario.repository.ts | 371 | listarDiasNaoUteisDoMes | dia_nao_util, tipo_dia_nao_util (JOIN), tipo_dia_nao_util_duracao (JOIN) | filtra |
| calendario/calendario.repository.ts | 429 | recuperarTipo | dia_nao_util, tipo_dia_nao_util (JOIN), tipo_dia_nao_util_duracao (JOIN) | filtra |
| chat/chat-mensagem-postgres.repository.ts | 83 | gravar | chat_mensagem (INSERT) | filtra |
| chat/chat-mensagem-postgres.repository.ts | 166 | listarConversa | chat_mensagem | filtra |
| chat/chat-mensagem-postgres.repository.ts | 193 | listarConversas | chat_mensagem | filtra |
| chat/chat-mensagem-postgres.repository.ts | 233 | gravarTitulo | chat_conversa (UPSERT) | filtra |
| chat/chat-mensagem-postgres.repository.ts | 270 | listarTitulos | chat_conversa | filtra |
| chat/chat-mensagem-postgres.repository.ts | 294 | buscar | chat_mensagem | filtra |
| chat/chat-mensagem-postgres.repository.ts | 337 | somarTokens | chat_mensagem | filtra |
| configuracao-ia/configuracao-ia.repository.ts | 55 | recuperarAtiva | configuracao_ia, usuario (JOIN) | corrigida |
| configuracao-ia/configuracao-ia.repository.ts | 74 | listar | configuracao_ia | filtra |
| configuracao-ia/configuracao-ia.repository.ts | 84 | listar | configuracao_ia, usuario (JOIN) | corrigida |
| configuracao-ia/configuracao-ia.repository.ts | 104 | listarPrecos | configuracao_ia | filtra |
| configuracao-ia/configuracao-ia.repository.ts | 143 | alterarPrecoDaVersaoAtiva | configuracao_ia (UPDATE), configuracao_ia | corrigida |
| configuracao-ia/configuracao-ia.repository.ts | 198 | inserirNovaVersao | configuracao_ia (INSERT), configuracao_ia | filtra |
| configuracao-ia/configuracao-ia.repository.ts | 294 | inserirNovaVersao | configuracao_ia, usuario (JOIN) | corrigida |
| demanda/demanda.repository.ts | 74 | inserir | demanda (INSERT), tipo_demanda_status | corrigida |
| demanda/demanda.repository.ts | 160 | inserirDemandaUsuario | demanda_usuario (INSERT) | filtra |
| demanda/demanda.repository.ts | 209 | buscarPorNome | demanda, tipo_demanda_status (JOIN), demanda_usuario (JOIN) | filtra |
| demanda/demanda.repository.ts | 277 | recuperar | demanda, tipo_demanda_status (JOIN) | filtra (revisão manual: filtro em fragmento montado no método) |
| demanda/demanda.repository.ts | 324 | listar | demanda_usuario (JOIN) | filtra |
| demanda/demanda.repository.ts | 355 | listar | demanda, tipo_demanda_status (JOIN) | filtra (revisão manual: filtro em fragmento montado no método) |
| demanda/demanda.repository.ts | 376 | listar | demanda, tipo_demanda_status (JOIN) | filtra (revisão manual: filtro em fragmento montado no método) |
| demanda/demanda.repository.ts | 430 | listarAtribuidas | demanda_usuario (JOIN) | filtra |
| demanda/demanda.repository.ts | 438 | listarAtribuidas | demanda, tipo_demanda_status (JOIN), projeto (JOIN) | filtra |
| demanda/demanda.repository.ts | 470 | listarExecutadas | demanda_usuario (JOIN) | filtra |
| demanda/demanda.repository.ts | 497 | listarExecutadas | demanda (JOIN), projeto (JOIN), tipo_demanda_status (JOIN), execucao, atividade (JOIN), demanda, atividade, execucao (JOIN), tipo_atividade_status (JOIN), demanda_usuario | corrigida |
| demanda/demanda.repository.ts | 649 | listarPlanejamento | tipo_demanda_status (JOIN), demanda (JOIN), demanda, atividade, execucao (JOIN), usuario (JOIN) | filtra |
| demanda/demanda.repository.ts | 828 | alterar | demanda (UPDATE), tipo_demanda_status | corrigida |
| demanda/demanda.repository.ts | 895 | listarDescendentes | demanda (JOIN), tipo_demanda_status (JOIN), demanda, atividade, execucao (JOIN), demanda_tag, tag (JOIN) | corrigida |
| demanda/demanda.repository.ts | 993 | listarAncestral | demanda | filtra |
| demanda/demanda.repository.ts | 1036 | possuiFilhasOuAtividades | demanda, atividade | filtra |
| demanda/demanda.repository.ts | 1067 | contarAtividadesEmAberto | atividade, tipo_atividade_status (JOIN) | filtra |
| demanda/demanda.repository.ts | 1095 | recuperarExcluida | demanda, projeto | isenta: leitura de restauração (§9.2 #11) |
| demanda/demanda.repository.ts | 1141 | listarParaDocumentacao | demanda, projeto (JOIN), tipo_demanda_status (JOIN), atividade, execucao (JOIN), demanda_usuario, demanda_usuario (JOIN) | filtra |
| demanda/demanda.repository.ts | 1263 | alterarTextos | demanda (UPDATE) | filtra |
| demanda/demanda.repository.ts | 1286 | restaurar | demanda (UPDATE) | isenta: restauração (§9.2 #11) |
| demanda/demanda.repository.ts | 1311 | validarAcessoProjeto | demanda, demanda_usuario (JOIN) | filtra |
| demanda/demanda.repository.ts | 1338 | recuperarGrafo | demanda, tipo_demanda_status (JOIN), atividade, execucao (JOIN), demanda_tag, tag (JOIN) | filtra |
| demanda/demanda.repository.ts | 1401 | recuperarGrafo | demanda_conexao, demanda (JOIN), demanda | filtra |
| demanda/demanda.repository.ts | 1445 | verificarCriariaCiclo | demanda_conexao | filtra |
| demanda/demanda.repository.ts | 1484 | validarConexao | demanda_conexao | filtra |
| demanda/demanda.repository.ts | 1505 | recuperarConexaoPorPar | demanda_conexao | filtra |
| demanda/demanda.repository.ts | 1535 | inserirConexao | demanda_conexao (INSERT) | filtra |
| demanda/demanda.repository.ts | 1573 | listarConexoes | demanda_conexao, demanda (JOIN) | filtra |
| demanda/demanda.repository.ts | 1609 | excluirConexao | demanda_conexao (UPDATE) | corrigida |
| demanda/demanda.repository.ts | 1627 | validarConexaoDemanda | demanda_conexao | filtra |
| demanda/demanda.repository.ts | 1656 | listarTagsDemanda | demanda_tag, tag (JOIN) | filtra |
| demanda/demanda.repository.ts | 1691 | atribuirTagsDemanda | demanda_tag (INSERT) | filtra |
| demanda/demanda.repository.ts | 1717 | removerTagDemanda | demanda_tag (UPDATE) | filtra |
| demanda/demanda.repository.ts | 1736 | listarMembrosDemanda | demanda_usuario, usuario (JOIN), tipo_usuario (JOIN) | filtra |
| demanda/demanda.repository.ts | 1763 | atribuirMembroDemanda | demanda_usuario (INSERT) | filtra |
| demanda/demanda.repository.ts | 1788 | removerMembroDemanda | demanda_usuario (UPDATE) | filtra |
| demanda/demanda.repository.ts | 1807 | validarMembro | demanda_usuario | filtra |
| demanda/demanda.repository.ts | 1831 | contarMembrosDemanda | demanda_usuario | filtra |
| execucao/execucao.repository.ts | 49 | inserir | execucao (INSERT) | filtra |
| execucao/execucao.repository.ts | 97 | registrar | execucao (INSERT) | filtra |
| execucao/execucao.repository.ts | 146 | validarSobreposicao | execucao, atividade (JOIN) | filtra |
| execucao/execucao.repository.ts | 174 | encerrar | execucao (UPDATE) | filtra |
| execucao/execucao.repository.ts | 207 | encerrarTodasAbertas | execucao (UPDATE) | filtra |
| execucao/execucao.repository.ts | 236 | recuperar | execucao | filtra |
| execucao/execucao.repository.ts | 304 | listar | execucao, atividade (JOIN), usuario (JOIN), demanda (JOIN), projeto (JOIN) | filtra (revisão manual: filtro em fragmento montado no método) |
| execucao/execucao.repository.ts | 320 | listar | execucao, atividade (JOIN), usuario (JOIN), demanda (JOIN), projeto (JOIN) | filtra (revisão manual: filtro em fragmento montado no método) |
| execucao/execucao.repository.ts | 355 | listar | execucao, atividade (JOIN), usuario (JOIN), demanda (JOIN), projeto (JOIN) | filtra (revisão manual: filtro em fragmento montado no método) |
| execucao/execucao.repository.ts | 403 | agruparPorDia | execucao, atividade (JOIN) | filtra |
| execucao/execucao.repository.ts | 447 | recuperarAtiva | execucao, atividade (JOIN) | filtra |
| execucao/execucao.repository.ts | 475 | alterar | execucao (UPDATE) | filtra |
| execucao/execucao.repository.ts | 506 | listarUltimaPorAtividade | execucao | filtra |
| execucao/execucao.repository.ts | 533 | recuperarUsuario | execucao, atividade (JOIN) | filtra |
| execucao/execucao.repository.ts | 557 | recuperarTipoUsuarioDaAtividade | atividade, usuario (JOIN), tipo_usuario (JOIN) | filtra |
| execucao/execucao.repository.ts | 585 | listarParaRelatorio | execucao, atividade (JOIN), usuario (JOIN), demanda (JOIN), projeto (JOIN), tipo_atividade_status (JOIN) | filtra |
| mensagem-direta/mensagem-direta-leitura.repository.ts | 41 | listarMarcadores | mensagem_direta_leitura | filtra |
| mensagem-direta/mensagem-direta-leitura.repository.ts | 57 | recuperarMarcador | mensagem_direta_leitura | filtra |
| mensagem-direta/mensagem-direta-leitura.repository.ts | 78 | alterarLeitura | mensagem_direta_leitura (UPSERT) | filtra |
| mensagem-direta/mensagem-direta-leitura.repository.ts | 119 | alterarSilencio | mensagem_direta_leitura (UPSERT) | filtra |
| mensagem-direta/mensagem-direta-postgres.repository.ts | 126 | ULTIMA_MENSAGEM_POR_CONVERSA | — | isenta: nenhuma tabela com is_deleted lida |
| mensagem-direta/mensagem-direta-postgres.repository.ts | 209 | gravar | mensagem_direta (INSERT) | filtra |
| mensagem-direta/mensagem-direta-postgres.repository.ts | 271 | gravar | mensagem_direta | filtra |
| mensagem-direta/mensagem-direta-postgres.repository.ts | 294 | alterarMensagem | mensagem_direta (UPDATE) | filtra |
| mensagem-direta/mensagem-direta-postgres.repository.ts | 333 | recuperarMensagem | mensagem_direta | filtra |
| mensagem-direta/mensagem-direta-postgres.repository.ts | 354 | listarConversa | mensagem_direta | filtra |
| mensagem-direta/mensagem-direta-postgres.repository.ts | 385 | listarConversasDoUsuario | mensagem_direta | filtra |
| mensagem-direta/mensagem-direta-postgres.repository.ts | 409 | contarNaoLidas | mensagem_direta (JOIN) | filtra |
| mensagem-direta/mensagem-direta-postgres.repository.ts | 452 | buscar | mensagem_direta | filtra |
| mensagem-direta/mensagem-direta-postgres.repository.ts | 484 | listarTodasConversas | mensagem_direta | filtra |
| mensagem-direta/mensagem-direta-postgres.repository.ts | 500 | listarTodasConversas | mensagem_direta | filtra |
| mensagem-direta/mensagem-direta-preferencia.repository.ts | 31 | recuperar | mensagem_direta_preferencia | filtra |
| mensagem-direta/mensagem-direta-preferencia.repository.ts | 48 | alterar | mensagem_direta_preferencia (UPSERT) | filtra |
| mensagem-direta/mensagem-direta-reacao.repository.ts | 32 | listarPorMensagens | mensagem_direta_reacao | filtra |
| mensagem-direta/mensagem-direta-reacao.repository.ts | 51 | definir | mensagem_direta_reacao (UPSERT) | filtra |
| mensagem-direta/mensagem-direta-reacao.repository.ts | 87 | remover | mensagem_direta_reacao (UPDATE) | filtra |
| mensagem-direta/mensagem-direta-supervisao.repository.ts | 40 | registrarLeitura | mensagem_direta_supervisao (INSERT) | filtra |
| mensagem-direta/mensagem-direta-supervisao.repository.ts | 72 | marcarAvisoDado | mensagem_direta_supervisao (UPDATE) | filtra |
| mensagem-direta/mensagem-direta-supervisao.repository.ts | 88 | existeAvisoDoDia | mensagem_direta_supervisao | filtra |
| modelagem/modelagem-catalogo.repository.ts | 22 | listarColunas | — | isenta: nenhuma tabela com is_deleted lida |
| modelagem/modelagem-catalogo.repository.ts | 52 | obterUltimaMigration | knex_migrations | isenta: nenhuma tabela com is_deleted lida |
| modelagem/modelagem-catalogo.repository.ts | 69 | listarChaves | pg_constraint, pg_class (JOIN), pg_attribute (JOIN), pg_namespace | isenta: nenhuma tabela com is_deleted lida |
| modelagem/modelagem-grupo.repository.ts | 33 | listar | modelagem_grupo | filtra |
| modelagem/modelagem-grupo.repository.ts | 49 | recuperar | modelagem_grupo | filtra |
| modelagem/modelagem-grupo.repository.ts | 66 | obterMaiorOrdem | modelagem_grupo | filtra |
| modelagem/modelagem-grupo.repository.ts | 80 | inserir | modelagem_grupo (INSERT) | filtra |
| modelagem/modelagem-grupo.repository.ts | 112 | alterar | modelagem_grupo (UPDATE) | filtra |
| modelagem/modelagem-grupo.repository.ts | 139 | validarRotulo | modelagem_grupo | filtra |
| modelagem/modelagem-tabela.repository.ts | 27 | listar | modelagem_tabela | filtra |
| modelagem/modelagem-tabela.repository.ts | 43 | gravar | modelagem_tabela (UPSERT) | filtra |
| modelagem/modelagem-tabela.repository.ts | 84 | remover | modelagem_tabela (UPDATE) | filtra |
| plano/plano-fonte.repository.ts | 49 | inserir | plano_fonte (INSERT), tipo_plano_fonte_origem | filtra |
| plano/plano-fonte.repository.ts | 92 | listar | plano_fonte, tipo_plano_fonte_origem (JOIN), usuario (JOIN) | corrigida |
| plano/plano-fonte.repository.ts | 108 | listarComConteudo | plano_fonte, tipo_plano_fonte_origem (JOIN), usuario (JOIN) | corrigida |
| plano/plano-fonte.repository.ts | 125 | recuperar | plano_fonte, tipo_plano_fonte_origem (JOIN), usuario (JOIN) | corrigida |
| plano/plano-fonte.repository.ts | 144 | contar | plano_fonte | filtra |
| plano/plano-fonte.repository.ts | 161 | excluir | plano_fonte (UPDATE) | filtra |
| plano/plano-ponto.repository.ts | 46 | inserir | plano_ponto (INSERT), tipo_plano_ponto_situacao | filtra |
| plano/plano-ponto.repository.ts | 90 | listar | plano_ponto, tipo_plano_ponto_situacao (JOIN) | filtra |
| plano/plano-ponto.repository.ts | 111 | recuperar | plano_ponto, tipo_plano_ponto_situacao (JOIN) | filtra |
| plano/plano-ponto.repository.ts | 129 | alterarSituacao | plano_ponto (UPDATE), tipo_plano_ponto_situacao | filtra |
| plano/plano.repository.ts | 99 | inserir | plano (INSERT) | filtra |
| plano/plano.repository.ts | 139 | recuperar | plano, usuario (JOIN), projeto (JOIN) | filtra |
| plano/plano.repository.ts | 197 | listar | plano, usuario (JOIN), projeto (JOIN) | filtra (revisão manual: filtro em fragmento montado no método) |
| plano/plano.repository.ts | 250 | alterar | plano (UPDATE) | filtra |
| plano/plano.repository.ts | 272 | marcarSolo | plano (UPDATE) | filtra |
| plano/plano.repository.ts | 292 | arquivar | plano (UPDATE) | filtra |
| plano/plano.repository.ts | 312 | atribuirProjeto | plano (UPDATE) | filtra |
| plano/plano.repository.ts | 333 | ligarDemanda | plano_demanda (UPDATE) | filtra |
| plano/plano.repository.ts | 346 | ligarDemanda | plano_demanda (INSERT) | filtra |
| plano/plano.repository.ts | 373 | marcarPublicacao | plano_demanda (UPDATE) | filtra |
| plano/plano.repository.ts | 392 | listarPorDemanda | plano, usuario (JOIN), projeto (JOIN) | filtra |
| plano/plano.repository.ts | 410 | excluir | plano_demanda (UPDATE) | filtra |
| plano/plano.repository.ts | 423 | excluir | plano (UPDATE) | corrigida |
| ponto-justificativa/ponto-justificativa.repository.ts | 32 | inserir | ponto_justificativa (INSERT) | filtra |
| ponto-justificativa/ponto-justificativa.repository.ts | 83 | listar | ponto_justificativa, usuario (JOIN) | filtra |
| ponto-justificativa/ponto-justificativa.repository.ts | 132 | recuperar | ponto_justificativa, usuario (JOIN) | filtra |
| ponto-justificativa/ponto-justificativa.repository.ts | 170 | recuperarPorUsuarioEDia | ponto_justificativa, usuario (JOIN) | filtra |
| ponto-justificativa/ponto-justificativa.repository.ts | 203 | validarPorUsuarioEDia | ponto_justificativa | filtra |
| projeto/projeto-volume-vigencia.repository.ts | 22 | emTransacao | projeto | filtra |
| projeto/projeto-volume-vigencia.repository.ts | 39 | listar | projeto_volume_vigencia | filtra |
| projeto/projeto-volume-vigencia.repository.ts | 55 | inserir | projeto_volume_vigencia (INSERT) | filtra |
| projeto/projeto.repository.ts | 38 | validarCodigo | projeto | filtra |
| projeto/projeto.repository.ts | 58 | inserir | projeto (INSERT), tipo_projeto_status | corrigida |
| projeto/projeto.repository.ts | 122 | recuperar | projeto, tipo_projeto_status (JOIN) | filtra |
| projeto/projeto.repository.ts | 166 | listarTodos | projeto, tipo_projeto_status (JOIN) | filtra (revisão manual: filtro em fragmento montado no método) |
| projeto/projeto.repository.ts | 186 | listarTodos | projeto, tipo_projeto_status (JOIN) | filtra (revisão manual: filtro em fragmento montado no método) |
| projeto/projeto.repository.ts | 213 | listarVolume | projeto, projeto_volume_vigencia, execucao, atividade (JOIN), demanda (JOIN) | filtra |
| projeto/projeto.repository.ts | 275 | listarVolumePorMes | projeto, projeto_volume_vigencia, execucao, atividade (JOIN), demanda (JOIN) | filtra |
| projeto/projeto.repository.ts | 374 | listarPorUsuario | projeto, tipo_projeto_status (JOIN), demanda (JOIN), demanda_usuario (JOIN) | filtra |
| projeto/projeto.repository.ts | 401 | listarPorUsuario | projeto, tipo_projeto_status (JOIN), demanda (JOIN), demanda_usuario (JOIN) | filtra |
| projeto/projeto.repository.ts | 434 | validarAcesso | demanda, demanda_usuario (JOIN), projeto (JOIN) | filtra |
| projeto/projeto.repository.ts | 495 | alterar | projeto (UPDATE), tipo_projeto_status | corrigida |
| projeto/projeto.repository.ts | 528 | possuiDemandas | demanda | filtra |
| projeto/projeto.repository.ts | 556 | recuperarExcluido | projeto | isenta: leitura de restauração (§9.2 #11) |
| projeto/projeto.repository.ts | 578 | restaurar | projeto (UPDATE) | isenta: restauração (§9.2 #11) |
| prompt/prompt.repository.ts | 41 | listarTipos | tipo_prompt | filtra |
| prompt/prompt.repository.ts | 54 | listarTipos | prompt, tipo_prompt (JOIN), usuario (JOIN) | corrigida |
| prompt/prompt.repository.ts | 75 | recuperarAtivo | prompt, tipo_prompt (JOIN), usuario (JOIN) | corrigida |
| prompt/prompt.repository.ts | 92 | listarVersoes | prompt, tipo_prompt (JOIN) | corrigida |
| prompt/prompt.repository.ts | 106 | listarVersoes | prompt, tipo_prompt (JOIN), usuario (JOIN) | corrigida |
| prompt/prompt.repository.ts | 132 | salvarRascunho | prompt (UPDATE), tipo_prompt | corrigida |
| prompt/prompt.repository.ts | 155 | salvarRascunho | tipo_prompt, prompt (INSERT), prompt | filtra |
| prompt/prompt.repository.ts | 211 | ativarRascunho | prompt, tipo_prompt (JOIN) | corrigida |
| prompt/prompt.repository.ts | 229 | ativarRascunho | prompt (UPDATE) | corrigida |
| prompt/prompt.repository.ts | 251 | restaurarPadrao | prompt, tipo_prompt (JOIN) | corrigida |
| prompt/prompt.repository.ts | 268 | restaurarPadrao | prompt (UPDATE) | corrigida |
| prompt/prompt.repository.ts | 286 | descartarRascunho | prompt (UPDATE), tipo_prompt | corrigida |
| prompt/prompt.repository.ts | 313 | travarTipo | tipo_prompt | filtra |
| prompt/prompt.repository.ts | 330 | desativarAtivas | prompt (UPDATE), tipo_prompt | corrigida |
| prompt/prompt.repository.ts | 351 | recuperarPorId | prompt, tipo_prompt (JOIN), usuario (JOIN) | corrigida |
| proposta-ia/proposta-ia.repository.ts | 50 | criar | tipo_proposta_ia, tipo_proposta_ia_status (JOIN), proposta_ia (INSERT) | filtra |
| proposta-ia/proposta-ia.repository.ts | 89 | recuperarPorId | proposta_ia, tipo_proposta_ia (JOIN), tipo_proposta_ia_status (JOIN) | corrigida |
| proposta-ia/proposta-ia.repository.ts | 104 | listarPendentesDoUsuario | proposta_ia, tipo_proposta_ia (JOIN), tipo_proposta_ia_status (JOIN) | corrigida |
| proposta-ia/proposta-ia.repository.ts | 121 | contarPendentesDoPlano | proposta_ia, tipo_proposta_ia (JOIN), tipo_proposta_ia_status (JOIN) | corrigida |
| proposta-ia/proposta-ia.repository.ts | 141 | transitar | proposta_ia (UPDATE), tipo_proposta_ia_status | corrigida |
| proposta-ia/proposta-ia.repository.ts | 187 | registrarResultado | proposta_ia (UPDATE) | filtra |
| tag/tag.repository.ts | 34 | validarNome | tag | filtra |
| tag/tag.repository.ts | 54 | inserir | tag (INSERT) | filtra |
| tag/tag.repository.ts | 77 | recuperar | tag | filtra |
| tag/tag.repository.ts | 99 | listar | tag | filtra |
| tag/tag.repository.ts | 129 | alterar | tag (UPDATE) | filtra |
| tag/tag.repository.ts | 158 | recuperarExcluida | tag | isenta: leitura de restauração (§9.2 #11) |
| tag/tag.repository.ts | 179 | restaurar | tag (UPDATE) | isenta: restauração (§9.2 #11) |
| usuario/tipo-usuario-ajuda.repository.ts | 16 | listar | tipo_usuario | filtra |
| usuario/tipo-usuario-ajuda.repository.ts | 32 | alterar | tipo_usuario (UPDATE) | filtra |
| usuario/usuario.repository.ts | 34 | validarLogin | usuario | filtra |
| usuario/usuario.repository.ts | 70 | recuperar | usuario, tipo_usuario (JOIN) | filtra (revisão manual: filtro em fragmento montado no método) |
| usuario/usuario.repository.ts | 135 | listar | usuario, tipo_usuario (JOIN) | filtra (revisão manual: filtro em fragmento montado no método) |
| usuario/usuario.repository.ts | 157 | listar | usuario, tipo_usuario (JOIN), anotacao | filtra (revisão manual: filtro em fragmento montado no método) |
| usuario/usuario.repository.ts | 204 | inserir | tipo_anotacao, anotacao (INSERT) | filtra |
| usuario/usuario.repository.ts | 245 | inserirUsuario | usuario (INSERT), tipo_usuario | corrigida |
| usuario/usuario.repository.ts | 358 | alterar | usuario (UPDATE), tipo_usuario | corrigida |
| usuario/usuario.repository.ts | 392 | alterarCor | usuario (UPDATE) | filtra |
| usuario/usuario.repository.ts | 411 | alterarSenha | usuario (UPDATE) | filtra |
| usuario/usuario.repository.ts | 435 | validarExecucoes | atividade, execucao (JOIN) | filtra |
| usuario/usuario.repository.ts | 460 | recuperarExcluido | usuario, tipo_usuario | corrigida (junções); isenta: leitura de restauração (§9.2 #11) |
| usuario/usuario.repository.ts | 490 | restaurar | usuario (UPDATE) | isenta: restauração (§9.2 #11) |
| usuario/usuario.repository.ts | 516 | listarNomesPorIds | usuario | filtra |
| usuario/usuario.repository.ts | 537 | validarExistenciaIncluindoExcluido | usuario | isenta em usuario: histórico e privacidade do chat (decisão do autor, 2026-11-11) |
| usuario/usuario.repository.ts | 556 | listarAtivos | usuario, tipo_usuario (JOIN) | filtra |
| usuario/usuario.repository.ts | 590 | listarAtivosComMeta | usuario | filtra |
| usuario/usuario.repository.ts | 615 | listarTiposPorIds | usuario, tipo_usuario (JOIN) | corrigida (só tipo_usuario); isenta em usuario: histórico e privacidade do chat (decisão do autor, 2026-11-11) |
| usuario/usuario.repository.ts | 638 | listarIdsComPermissaoDeGestor | usuario, tipo_usuario (JOIN) | corrigida (só tipo_usuario); isenta em usuario: histórico e privacidade do chat (decisão do autor, 2026-11-11) |
| usuario/usuario.repository.ts | 656 | listarAdministradoresAtivos | usuario, tipo_usuario | filtra |
| database/realinhar-knex-migrations.sql | 1 | (script) | knex_migrations (UPDATE) | isenta: nenhuma tabela com is_deleted lida |
| database/scripts/seed-historico-desenvolvimento.sql | 1 | (script) | — | isenta: nenhuma tabela com is_deleted lida |
