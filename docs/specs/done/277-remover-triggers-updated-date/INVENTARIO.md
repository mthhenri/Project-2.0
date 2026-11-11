# Inventário dos `UPDATE`s — task 277

Gerado pelo verificador `scripts/verificar-sql.mjs` sobre todo o SQL de `backend/src` (testes e migrations ficam de fora). "Corrigida" compara com o código antes da task.

**Totais:** 57 comandos `UPDATE`/upsert. Corrigidos: 15. Já gravavam: 29. Isentos: 13.

Conferência: a busca por `UPDATE` em `backend/src`, fora testes e migrations, bate com esta tabela; o `FOR UPDATE` de travas de linha não altera dado e não entra.

Revisão manual: `BaseRepository.executarSoftDelete` (tabela dinâmica; é exclusão, não grava a data) e `converter-descricoes.ts` (`UPDATE :tabela:`, corrigido à mão). O `alterar` de cada repository monta o `SET` a partir de uma lista que já contém `updated_date = NOW()`; `demanda.alterarTextos` era o único `SET` dinâmico sem a data, e o teste de integração o achou.

Leitores de `updatedDate` conferidos: `plano`, `plano_ponto`, `usuario` e `anotacao` (o `anotacao.modificarSecoes` grava a data e o controle de versão por `updatedDateLido` continua valendo).

| Arquivo | Linha | Método | Tabela | Grava `updated_date` | Veredito |
|---|---|---|---|---|---|
| core/base/base.repository.ts | 44 | executarSoftDelete | (tabela dinâmica) (UPDATE) | não | isenta: exclusão não é alteração (P-074) |
| database/scripts/converter-descricoes.ts | 109 | principal | (tabela dinâmica) (UPDATE) | sim | corrigida |
| anotacao/anotacao.repository.ts | 172 | modificarSecoes | anotacao (UPDATE) | sim | já gravava |
| atividade/atividade.repository.ts | 475 | alterar | atividade (UPDATE) | sim | já gravava (SET dinâmico: a data entra na lista) |
| atividade/atividade.repository.ts | 567 | restaurar | atividade (UPDATE) | sim | já gravava |
| atividade/atividade.repository.ts | 690 | alterarTags | atividade_tag (UPDATE) | não | isenta: exclusão não é alteração (P-074) |
| atividade-prioridade/atividade-prioridade.repository.ts | 35 | alterarCor | tipo_atividade_prioridade (UPDATE) | sim | já gravava |
| calendario/calendario.repository.ts | 222 | alterar | dia_nao_util (UPDATE) | sim | já gravava (SET dinâmico: a data entra na lista) |
| calendario/calendario.repository.ts | 291 | restaurar | dia_nao_util (UPDATE) | sim | já gravava |
| chat/chat-mensagem-postgres.repository.ts | 233 | gravarTitulo | chat_conversa (UPSERT) | sim | já gravava |
| configuracao-ia/configuracao-ia.repository.ts | 143 | alterarPrecoDaVersaoAtiva | configuracao_ia (UPDATE) | sim | corrigida |
| demanda/demanda.repository.ts | 828 | alterar | demanda (UPDATE) | sim | já gravava (SET dinâmico: a data entra na lista) |
| demanda/demanda.repository.ts | 1263 | alterarTextos | demanda (UPDATE) | sim | corrigida |
| demanda/demanda.repository.ts | 1286 | restaurar | demanda (UPDATE) | sim | já gravava |
| demanda/demanda.repository.ts | 1609 | excluirConexao | demanda_conexao (UPDATE) | não | isenta: exclusão não é alteração (P-074) |
| demanda/demanda.repository.ts | 1717 | removerTagDemanda | demanda_tag (UPDATE) | não | isenta: exclusão não é alteração (P-074) |
| demanda/demanda.repository.ts | 1788 | removerMembroDemanda | demanda_usuario (UPDATE) | não | isenta: exclusão não é alteração (P-074) |
| execucao/execucao.repository.ts | 174 | encerrar | execucao (UPDATE) | sim | já gravava |
| execucao/execucao.repository.ts | 207 | encerrarTodasAbertas | execucao (UPDATE) | sim | já gravava |
| execucao/execucao.repository.ts | 475 | alterar | execucao (UPDATE) | sim | já gravava |
| mensagem-direta/mensagem-direta-leitura.repository.ts | 78 | alterarLeitura | mensagem_direta_leitura (UPSERT) | sim | corrigida |
| mensagem-direta/mensagem-direta-leitura.repository.ts | 119 | alterarSilencio | mensagem_direta_leitura (UPSERT) | sim | corrigida |
| mensagem-direta/mensagem-direta-postgres.repository.ts | 294 | alterarMensagem | mensagem_direta (UPDATE) | sim | já gravava |
| mensagem-direta/mensagem-direta-preferencia.repository.ts | 48 | alterar | mensagem_direta_preferencia (UPSERT) | sim | corrigida |
| mensagem-direta/mensagem-direta-reacao.repository.ts | 51 | definir | mensagem_direta_reacao (UPSERT) | sim | já gravava |
| mensagem-direta/mensagem-direta-reacao.repository.ts | 87 | remover | mensagem_direta_reacao (UPDATE) | não | isenta: exclusão não é alteração (P-074) |
| mensagem-direta/mensagem-direta-supervisao.repository.ts | 72 | marcarAvisoDado | mensagem_direta_supervisao (UPDATE) | sim | corrigida |
| modelagem/modelagem-grupo.repository.ts | 112 | alterar | modelagem_grupo (UPDATE) | sim | corrigida |
| modelagem/modelagem-tabela.repository.ts | 43 | gravar | modelagem_tabela (UPSERT) | sim | corrigida |
| modelagem/modelagem-tabela.repository.ts | 84 | remover | modelagem_tabela (UPDATE) | não | isenta: exclusão não é alteração (P-074) |
| plano/plano-fonte.repository.ts | 161 | excluir | plano_fonte (UPDATE) | não | isenta: exclusão não é alteração (P-074) |
| plano/plano-ponto.repository.ts | 129 | alterarSituacao | plano_ponto (UPDATE) | sim | já gravava |
| plano/plano.repository.ts | 250 | alterar | plano (UPDATE) | sim | já gravava (SET dinâmico: a data entra na lista) |
| plano/plano.repository.ts | 272 | marcarSolo | plano (UPDATE) | sim | já gravava |
| plano/plano.repository.ts | 292 | arquivar | plano (UPDATE) | sim | já gravava |
| plano/plano.repository.ts | 312 | atribuirProjeto | plano (UPDATE) | sim | já gravava |
| plano/plano.repository.ts | 333 | ligarDemanda | plano_demanda (UPDATE) | não | isenta: exclusão não é alteração (P-074) |
| plano/plano.repository.ts | 373 | marcarPublicacao | plano_demanda (UPDATE) | sim | já gravava |
| plano/plano.repository.ts | 410 | excluir | plano_demanda (UPDATE) | não | isenta: exclusão não é alteração (P-074) |
| plano/plano.repository.ts | 423 | excluir | plano (UPDATE) | não | isenta: exclusão não é alteração (P-074) |
| projeto/projeto.repository.ts | 495 | alterar | projeto (UPDATE) | sim | já gravava (SET dinâmico: a data entra na lista) |
| projeto/projeto.repository.ts | 578 | restaurar | projeto (UPDATE) | sim | já gravava |
| prompt/prompt.repository.ts | 132 | salvarRascunho | prompt (UPDATE) | sim | corrigida |
| prompt/prompt.repository.ts | 229 | ativarRascunho | prompt (UPDATE) | sim | corrigida |
| prompt/prompt.repository.ts | 268 | restaurarPadrao | prompt (UPDATE) | sim | corrigida |
| prompt/prompt.repository.ts | 286 | descartarRascunho | prompt (UPDATE) | não | isenta: exclusão não é alteração (P-074) |
| prompt/prompt.repository.ts | 330 | desativarAtivas | prompt (UPDATE) | sim | corrigida |
| proposta-ia/proposta-ia.repository.ts | 141 | transitar | proposta_ia (UPDATE) | sim | corrigida |
| proposta-ia/proposta-ia.repository.ts | 187 | registrarResultado | proposta_ia (UPDATE) | sim | corrigida |
| tag/tag.repository.ts | 129 | alterar | tag (UPDATE) | sim | já gravava (SET dinâmico: a data entra na lista) |
| tag/tag.repository.ts | 179 | restaurar | tag (UPDATE) | sim | já gravava |
| usuario/tipo-usuario-ajuda.repository.ts | 32 | alterar | tipo_usuario (UPDATE) | sim | já gravava |
| usuario/usuario.repository.ts | 358 | alterar | usuario (UPDATE) | sim | já gravava (SET dinâmico: a data entra na lista) |
| usuario/usuario.repository.ts | 392 | alterarCor | usuario (UPDATE) | sim | já gravava |
| usuario/usuario.repository.ts | 411 | alterarSenha | usuario (UPDATE) | sim | já gravava |
| usuario/usuario.repository.ts | 490 | restaurar | usuario (UPDATE) | sim | já gravava |
| database/realinhar-knex-migrations.sql | 1 | (script) | knex_migrations (UPDATE) | não | isenta: tabela sem updated_date |
