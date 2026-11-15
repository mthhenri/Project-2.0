# Matrizes de permissão

Anexo do [`DOSSIE.md`](DOSSIE.md). Rotas sem o prefixo `/api/v1`. Tipos de usuário: administrador, gestor, auxiliar e desenvolvedor.

## 1. Todas as rotas e a trava declarada na rota

Extraído dos `*.controller.ts` por script (202 rotas, as mesmas do log de subida do backend). "nenhuma" quer dizer que a rota não tem decorador de permissão: a regra, quando existe, está na service (seções 3 e 4). O `JwtAuthGuard` é global: sem login, tudo responde 401 (medido).


### anotacao

| Rota | Trava na rota | Método do controller |
|---|---|---|
| `GET /anotacao` | nenhuma | `listar` |
| `PUT /anotacao/:usuarioId/:tipo` | nenhuma | `alterar` |
| `PATCH /anotacao/:usuarioId/:tipo/trecho` | nenhuma | `trocarTrecho` |
| `POST /anotacao/:usuarioId/:tipo/anexo` | nenhuma | `anexarTexto` |
| `POST /anotacao/:usuarioId/feito` | nenhuma | `anexarFeito` |
| `POST /anotacao/:usuarioId/mover` | nenhuma | `moverTrecho` |

### assistente

| Rota | Trava na rota | Método do controller |
|---|---|---|
| `POST /assistente/auxiliar-descricao` | nenhuma | `auxiliarDescricao` |
| `POST /assistente/alterar-trecho` | nenhuma | `alterarTrecho` |

### atividade-prioridade

| Rota | Trava na rota | Método do controller |
|---|---|---|
| `GET /atividade-prioridade` | nenhuma | `listar` |
| `PATCH /atividade-prioridade/:codigo` | `@AdministradorOnly()` | `alterarCor` |

### atividade

| Rota | Trava na rota | Método do controller |
|---|---|---|
| `POST /atividade` | nenhuma | `criar` |
| `GET /atividade` | nenhuma | `listar` |
| `GET /atividade/:id` | nenhuma | `recuperar` |
| `PUT /atividade/:id` | nenhuma | `alterar` |
| `DELETE /atividade/:id` | `@ExigePermissao(podeEditarAtividadeDeOutro)` | `excluir` |
| `PATCH /atividade/:id/restaurar` | `@ExigePermissao(podeEditarAtividadeDeOutro)` | `restaurar` |
| `PUT /atividade/:id/tag` | nenhuma | `alterarTags` |
| `GET /atividade/:id/tag` | nenhuma | `listarTags` |

### autenticacao

| Rota | Trava na rota | Método do controller |
|---|---|---|
| `POST /autenticacao/login` | `@Public()` | `login` |

### calendario

| Rota | Trava na rota | Método do controller |
|---|---|---|
| `POST /calendario` | `@GestorOnly()` | `criar` |
| `GET /calendario/verificar` | nenhuma | `verificarDiaUtil` |
| `GET /calendario` | nenhuma | `listar` |
| `GET /calendario/:id` | nenhuma | `recuperar` |
| `PUT /calendario/:id` | `@GestorOnly()` | `alterar` |
| `DELETE /calendario/:id` | `@GestorOnly()` | `excluir` |
| `PATCH /calendario/:id/restaurar` | `@GestorOnly()` | `restaurar` |

### chat

| Rota | Trava na rota | Método do controller |
|---|---|---|
| `POST /chat/mensagem` | nenhuma | `enviarMensagem` |
| `POST /chat/bom-dia` | nenhuma | `iniciarBomDia` |
| `POST /chat/retomada` | nenhuma | `retomarAposQueda` |
| `GET /chat/plano/:planoId` | nenhuma | `recuperarConversaDoPlano` |
| `POST /chat/plano/:planoId/mensagem` | nenhuma | `enviarMensagemNoPlano` |
| `GET /chat/hoje` | nenhuma | `recuperarHoje` |
| `GET /chat/conversas` | nenhuma | `listarConversas` |
| `GET /chat/conversa/:data` | nenhuma | `recuperarConversa` |
| `PUT /chat/conversa/:data/titulo` | nenhuma | `alterarTituloConversa` |
| `GET /chat/busca` | nenhuma | `buscar` |

### checkin

| Rota | Trava na rota | Método do controller |
|---|---|---|
| `GET /checkin/situacao` | nenhuma | `consultarSituacao` |
| `POST /checkin/mensagem` | nenhuma | `enviarMensagem` |
| `GET /checkin/suspensao` | nenhuma | `consultarSuspensao` |

### configuracao-ia

| Rota | Trava na rota | Método do controller |
|---|---|---|
| `GET /configuracao-ia` | `@AdministradorOnly()` | `recuperarAtiva` |
| `GET /configuracao-ia/versoes` | `@AdministradorOnly()` | `listar` |
| `POST /configuracao-ia` | `@AdministradorOnly()` | `criar` |

### demanda

| Rota | Trava na rota | Método do controller |
|---|---|---|
| `POST /demanda` | nenhuma | `criar` |
| `GET /demanda` | nenhuma | `listar` |
| `GET /demanda/grafo` | nenhuma | `recuperarGrafo` |
| `GET /demanda/:id/arvore` | nenhuma | `recuperarArvore` |
| `GET /demanda/:id/ancestral` | nenhuma | `recuperarAncestral` |
| `GET /demanda/:id/detalhe` | nenhuma | `recuperarDetalhe` |
| `GET /demanda/atribuidas` | nenhuma | `listarAtribuidas` |
| `GET /demanda/executadas` | nenhuma | `listarExecutadas` |
| `GET /demanda/planejamento` | `@ExigePermissao(temVisibilidadeTotal)` | `listarPlanejamento` |
| `GET /demanda/documentacao` | nenhuma | `listarParaDocumentacao` |
| `GET /demanda/:id` | nenhuma | `recuperar` |
| `PUT /demanda/:id` | nenhuma | `alterar` |
| `PATCH /demanda/:id/textos` | nenhuma | `alterarTextos` |
| `DELETE /demanda/:id` | `@GestorOnly()` | `excluir` |
| `PATCH /demanda/:id/restaurar` | `@GestorOnly()` | `restaurar` |
| `POST /demanda/:id/conexao` | `@ExigePermissao(podeEditarDemanda)` | `criarConexao` |
| `GET /demanda/:id/conexao` | nenhuma | `listarConexoes` |
| `DELETE /demanda/:id/conexao/:conexaoId` | `@ExigePermissao(podeEditarDemanda)` | `excluirConexao` |
| `PUT /demanda/:id/tag` | nenhuma | `alterarTagsDemanda` |
| `GET /demanda/:id/tag` | nenhuma | `listarTagsDemanda` |
| `GET /demanda/:id/membro` | nenhuma | `listarMembros` |
| `POST /demanda/:id/membro` | nenhuma | `atribuirMembro` |
| `DELETE /demanda/:id/membro/:usuarioId` | nenhuma | `removerMembro` |

### desktop

| Rota | Trava na rota | Método do controller |
|---|---|---|
| `GET /desktop/versao` | nenhuma | `recuperarVersao` |
| `GET /desktop/download` | nenhuma | `baixar` |

### execucao

| Rota | Trava na rota | Método do controller |
|---|---|---|
| `POST /execucao` | nenhuma | `iniciar` |
| `POST /execucao/registro` | `@ExigePermissao(podeEditarExecucaoDeOutro)` | `registrar` |
| `GET /execucao` | nenhuma | `listar` |
| `GET /execucao/ativa` | nenhuma | `recuperarAtiva` |
| `GET /execucao/:id` | nenhuma | `recuperar` |
| `PATCH /execucao/:id/encerrar` | nenhuma | `encerrar` |
| `PUT /execucao/:id` | nenhuma | `alterar` |
| `DELETE /execucao/:id` | `@ExigePermissao(podeEditarExecucaoDeOutro)` | `excluir` |

### ia-custo

| Rota | Trava na rota | Método do controller |
|---|---|---|
| `GET /ia-custo` | `@AdministradorOnly()` | `consultar` |
| `PUT /ia-custo/preco` | `@AdministradorOnly()` | `alterarPreco` |

### ia

| Rota | Trava na rota | Método do controller |
|---|---|---|
| `GET /ia/estado` | `@AdministradorOnly()` | `recuperarEstado` |
| `GET /ia/modelos` | `@AdministradorOnly()` | `listarModelos` |
| `GET /ia/disponibilidade` | nenhuma | `recuperarDisponibilidade` |

### mensagem-direta

| Rota | Trava na rota | Método do controller |
|---|---|---|
| `GET /mensagem-direta/supervisao/grupos` | `@GestorOnly()` | `listarGruposSupervisionados` |
| `GET /mensagem-direta/supervisao/grupo/:grupoId` | `@GestorOnly()` | `lerGrupoSupervisionado` |
| `GET /mensagem-direta/canal/demanda/:demandaId` | nenhuma | `recuperarCanalDaDemanda` |
| `GET /mensagem-direta/canal/projeto/:projetoId` | nenhuma | `recuperarCanalDoProjeto` |
| `POST /mensagem-direta/canal/demanda/:demandaId` | nenhuma | `criarCanalDaDemanda` |
| `POST /mensagem-direta/canal/projeto/:projetoId` | nenhuma | `criarCanalDoProjeto` |
| `POST /mensagem-direta/grupo` | nenhuma | `criarGrupo` |
| `GET /mensagem-direta/grupo/:grupoId` | nenhuma | `recuperarGrupo` |
| `PATCH /mensagem-direta/grupo/:grupoId` | nenhuma | `alterarGrupo` |
| `POST /mensagem-direta/grupo/:grupoId/membros` | nenhuma | `adicionarMembros` |
| `DELETE /mensagem-direta/grupo/:grupoId/membro` | nenhuma | `sairDoGrupo` |
| `GET /mensagem-direta/grupo/:grupoId/mensagens` | nenhuma | `listarMensagens` |
| `POST /mensagem-direta/grupo/:grupoId/mensagem` | nenhuma | `enviarMensagem` |
| `PATCH /mensagem-direta/grupo/:grupoId/mensagem` | nenhuma | `alterarMensagem` |
| `PUT /mensagem-direta/grupo/:grupoId/reacao` | nenhuma | `reagirMensagem` |
| `GET /mensagem-direta/grupo/:grupoId/mensagem/:mensagemId/proposta/:propostaId` | nenhuma | `recuperarProposta` |
| `PUT /mensagem-direta/grupo/:grupoId/leitura` | nenhuma | `alterarLeitura` |
| `PUT /mensagem-direta/grupo/:grupoId/silencio` | nenhuma | `alterarSilencio` |
| `GET /mensagem-direta/grupo/:grupoId/resumo` | nenhuma | `recuperarOpcoesDoResumo` |
| `POST /mensagem-direta/grupo/:grupoId/resumo/estimativa` | nenhuma | `estimarResumo` |
| `POST /mensagem-direta/grupo/:grupoId/resumo` | nenhuma | `resumir` |
| `POST /mensagem-direta/grupo/:grupoId/resumo/:resumoId/proposta` | nenhuma | `criarPropostaDoResumo` |
| `POST /mensagem-direta/grupo/:grupoId/resumo/:resumoId/proposta/:propostaId/confirmar` | nenhuma | `confirmarPropostaDoResumo` |
| `POST /mensagem-direta/grupo/:grupoId/resumo/:resumoId/proposta/:propostaId/recusar` | nenhuma | `recusarPropostaDoResumo` |
| `GET /mensagem-direta/grupo/:grupoId/fixadas` | nenhuma | `listarFixadas` |
| `POST /mensagem-direta/grupo/:grupoId/fixadas/:mensagemId` | nenhuma | `fixarMensagem` |
| `DELETE /mensagem-direta/grupo/:grupoId/fixadas/:mensagemId` | nenhuma | `desafixarMensagem` |
| `GET /mensagem-direta/grupo/:grupoId/busca` | nenhuma | `buscarNoGrupo` |
| `POST /mensagem-direta/grupo/:grupoId/digitando` | nenhuma | `avisarDigitacao` |
| `GET /mensagem-direta/conversas` | nenhuma | `listarConversas` |
| `GET /mensagem-direta/pessoas` | nenhuma | `listarPessoas` |
| `GET /mensagem-direta/referencias` | nenhuma | `buscarReferencias` |
| `GET /mensagem-direta/referencia/:tipo/:id` | nenhuma | `recuperarReferencia` |
| `GET /mensagem-direta/supervisao/conversas` | `@GestorOnly()` | `listarConversasSupervisionadas` |
| `GET /mensagem-direta/supervisao/conversa/:conversaId` | `@GestorOnly()` | `lerConversaSupervisionada` |
| `GET /mensagem-direta/conversa/:usuarioId` | nenhuma | `listarConversa` |
| `GET /mensagem-direta/conversa/:usuarioId/mensagem/:mensagemId/proposta/:propostaId` | nenhuma | `recuperarProposta` |
| `POST /mensagem-direta/mensagem` | nenhuma | `enviarMensagem` |
| `PATCH /mensagem-direta/mensagem` | nenhuma | `alterarMensagem` |
| `PUT /mensagem-direta/reacao` | nenhuma | `reagirMensagem` |
| `PUT /mensagem-direta/conversa/:usuarioId/leitura` | nenhuma | `alterarLeitura` |
| `POST /mensagem-direta/conversa/:usuarioId/digitando` | nenhuma | `avisarDigitacao` |
| `PUT /mensagem-direta/conversa/:usuarioId/silencio` | nenhuma | `alterarSilencio` |
| `GET /mensagem-direta/busca` | nenhuma | `buscar` |
| `GET /mensagem-direta/preferencia` | nenhuma | `recuperarPreferencia` |
| `PUT /mensagem-direta/preferencia` | nenhuma | `alterarPreferencia` |
| `GET /mensagem-direta/eventos` | nenhuma | `abrirEventos` |

### modelagem

| Rota | Trava na rota | Método do controller |
|---|---|---|
| `GET /modelagem` | nenhuma | `obterDiagrama` |
| `POST /modelagem/grupo` | `@GestorOnly()` | `criarGrupo` |
| `PUT /modelagem/grupo/:id` | `@GestorOnly()` | `alterarGrupo` |
| `DELETE /modelagem/grupo/:id` | `@GestorOnly()` | `excluirGrupo` |
| `DELETE /modelagem/tabela/:nome` | `@GestorOnly()` | `removerTabela` |
| `PUT /modelagem/tabela/:nome` | `@GestorOnly()` | `alterarTabela` |

### plano

| Rota | Trava na rota | Método do controller |
|---|---|---|
| `POST /plano` | nenhuma | `criar` |
| `GET /plano` | nenhuma | `listar` |
| `GET /plano/demanda/:demandaId` | nenhuma | `recuperarOrigemDaDemanda` |
| `GET /plano/:id` | nenhuma | `recuperar` |
| `PUT /plano/:id` | nenhuma | `alterar` |
| `PATCH /plano/:id/solo` | nenhuma | `marcarSolo` |
| `PATCH /plano/:id/arquivo` | nenhuma | `arquivar` |
| `PUT /plano/:id/demanda` | nenhuma | `ligarDemanda` |
| `PATCH /plano/:id/projeto` | nenhuma | `atribuirProjeto` |
| `POST /plano/:id/publicacao` | nenhuma | `publicar` |
| `GET /plano/:id/ponto` | nenhuma | `listarPontos` |
| `POST /plano/:id/ponto` | nenhuma | `criarPonto` |
| `PATCH /plano/:id/ponto/:pontoId/situacao` | nenhuma | `alterarSituacaoDoPonto` |
| `GET /plano/:id/fonte` | nenhuma | `listarFontes` |
| `POST /plano/:id/fonte` | nenhuma | `criarFonte` |
| `GET /plano/:id/fonte/:fonteId` | nenhuma | `recuperarFonte` |
| `DELETE /plano/:id/fonte/:fonteId` | nenhuma | `excluirFonte` |
| `DELETE /plano/:id` | nenhuma | `excluir` |

### ponto-justificativa

| Rota | Trava na rota | Método do controller |
|---|---|---|
| `POST /ponto-justificativa` | `@GestorOnly()` | `criar` |
| `GET /ponto-justificativa` | `@GestorOnly()` | `listar` |
| `DELETE /ponto-justificativa/:id` | `@GestorOnly()` | `excluir` |

### ponto

| Rota | Trava na rota | Método do controller |
|---|---|---|
| `GET /ponto/diario` | nenhuma | `consultarDiario` |
| `GET /ponto/todos` | `@ExigePermissao(podeVerExecucaoEPontoDeOutro)` | `consultarTodos` |
| `GET /ponto/mensal` | nenhuma | `consultarMensal` |

### projeto

| Rota | Trava na rota | Método do controller |
|---|---|---|
| `POST /projeto` | `@GestorOnly()` | `criar` |
| `GET /projeto` | nenhuma | `listar` |
| `GET /projeto/volume` | `@GestorOnly()` | `listarVolume` |
| `GET /projeto/volume/anual` | `@GestorOnly()` | `listarVolumeAnual` |
| `GET /projeto/:id/volume-vigencia` | `@GestorOnly()` | `listarVigencias` |
| `POST /projeto/:id/volume-vigencia` | `@GestorOnly()` | `criarVigencia` |
| `DELETE /projeto/:id/volume-vigencia/:vigenciaId` | `@GestorOnly()` | `excluirVigencia` |
| `GET /projeto/:id` | nenhuma | `recuperar` |
| `PUT /projeto/:id` | `@GestorOnly()` | `alterar` |
| `DELETE /projeto/:id` | `@GestorOnly()` | `excluir` |
| `PATCH /projeto/:id/restaurar` | `@GestorOnly()` | `restaurar` |

### prompt

| Rota | Trava na rota | Método do controller |
|---|---|---|
| `GET /prompt` | `@AdministradorOnly()` | `listarTipos` |
| `GET /prompt/:tipo/versoes` | `@AdministradorOnly()` | `listarVersoes` |
| `POST /prompt/:tipo/rascunho` | `@AdministradorOnly()` | `salvarRascunho` |
| `POST /prompt/:tipo/testar` | `@AdministradorOnly()` | `testar` |
| `POST /prompt/:tipo/rascunho/ativar` | `@AdministradorOnly()` | `ativarRascunho` |
| `POST /prompt/:tipo/restaurar-padrao` | `@AdministradorOnly()` | `restaurarPadrao` |
| `DELETE /prompt/:tipo/rascunho` | `@AdministradorOnly()` | `descartarRascunho` |

### proposta-ia

| Rota | Trava na rota | Método do controller |
|---|---|---|
| `POST /proposta-ia/grupo/confirmar` | nenhuma | `confirmarGrupo` |
| `POST /proposta-ia/grupo/recusar` | nenhuma | `recusarGrupo` |
| `POST /proposta-ia/grupo/desfazer` | nenhuma | `desfazerGrupo` |
| `GET /proposta-ia/:id` | nenhuma | `recuperarPorId` |
| `POST /proposta-ia/:id/confirmar` | nenhuma | `confirmar` |
| `POST /proposta-ia/:id/ajustar` | nenhuma | `ajustar` |
| `POST /proposta-ia/:id/recusar` | nenhuma | `recusar` |
| `POST /proposta-ia/:id/desfazer` | nenhuma | `desfazer` |

### relatorio

| Rota | Trava na rota | Método do controller |
|---|---|---|
| `GET /relatorio/execucao` | `@GestorOnly()` | `gerar` |
| `GET /relatorio/execucao/download` | `@GestorOnly()` | `baixar` |
| `POST /relatorio/execucao/revisar` | `@GestorOnly()` | `revisar` |

### tag

| Rota | Trava na rota | Método do controller |
|---|---|---|
| `POST /tag` | `@ExigePermissao(podeGerenciarTag)` | `criar` |
| `GET /tag` | nenhuma | `listar` |
| `GET /tag/:id` | nenhuma | `recuperar` |
| `PUT /tag/:id` | `@ExigePermissao(podeGerenciarTag)` | `alterar` |
| `DELETE /tag/:id` | `@ExigePermissao(podeGerenciarTag)` | `excluir` |
| `PATCH /tag/:id/restaurar` | `@ExigePermissao(podeGerenciarTag)` | `restaurar` |

### tipo-usuario-ajuda

| Rota | Trava na rota | Método do controller |
|---|---|---|
| `GET /tipo-usuario-ajuda` | `@GestorOnly()` | `listar` |
| `PUT /tipo-usuario-ajuda/:tipo` | `@AdministradorOnly()` | `alterar` |

### usuario

| Rota | Trava na rota | Método do controller |
|---|---|---|
| `POST /usuario` | `@GestorOnly()` | `criar` |
| `GET /usuario` | `@ExigePermissao(temVisibilidadeTotal)` | `listar` |
| `PUT /usuario/cor` | nenhuma | `alterarCor` |
| `GET /usuario/:id` | nenhuma | `recuperar` |
| `PUT /usuario/:id` | nenhuma | `alterar` |
| `DELETE /usuario/:id` | `@GestorOnly()` | `excluir` |
| `PATCH /usuario/:id/restaurar` | `@GestorOnly()` | `restaurar` |
| `PATCH /usuario/:id/senha` | `@GestorOnly()` | `alterarSenha` |

## 2. Medido: leituras por perfil

Cada `GET` chamado na aplicação rodando, apontando para o projeto `SEGR`, de que só o desenvolvedor "dono" é membro. Colunas: sem login · desenvolvedor de outro projeto · desenvolvedor sem projeto · auxiliar · gestor · administrador · desenvolvedor dono. Cada célula é o status; **S** = a resposta trouxe um marcador `SEGREDO-*` (dado do projeto secreto). 400 = o parâmetro de consulta do roteiro não era o que a rota espera (a rota foi refeita à parte quando importava).

| Rota chamada | Sem login | Dev de fora | Dev sem projeto | Aux | Gestor | Adm | Dev dono |
|---|---|---|---|---|---|---|---|
| `/anotacao?usuarioId=5` | 401 | 403 | 403 | 403 | 200 | 200 | 200 |
| `/atividade?allRows=true` | 401 | 200 | 200 | 200 **S** | 200 **S** | 200 **S** | 200 **S** |
| `/atividade?usuarioId=5&allRows=true` | 401 | 200 | 200 | 200 **S** | 200 **S** | 200 **S** | 200 **S** |
| `/atividade?demandaId=8&allRows=true` | 401 | 200 | 200 | 200 **S** | 200 **S** | 200 **S** | 200 **S** |
| `/atividade/8` | 401 | 403 | 403 | 200 **S** | 200 **S** | 200 **S** | 200 **S** |
| `/atividade/8/tag` | 401 | 403 | 403 | 200 | 200 | 200 | 200 |
| `/atividade-prioridade` | 401 | 200 | 200 | 200 | 200 | 200 | 200 |
| `/calendario` | 401 | 200 | 200 | 200 | 200 | 200 | 200 |
| `/calendario/10` | 401 | 200 | 200 | 200 | 200 | 200 | 200 |
| `/calendario/verificar?data=2026-12-25` | 401 | 200 | 200 | 200 | 200 | 200 | 200 |
| `/chat/busca?termo=SEGREDO` | 401 | 400 | 400 | 400 | 400 | 400 | 400 |
| `/chat/conversa/2026-11-12` | 401 | 200 | 200 | 200 | 200 | 200 | 200 |
| `/chat/conversas` | 401 | 200 | 200 | 200 | 200 | 200 | 200 |
| `/chat/hoje` | 401 | 200 | 200 | 200 | 200 | 200 | 200 |
| `/chat/plano/1` | 401 | 404 | 404 | 404 | 404 | 404 | 200 |
| `/chat/plano/2` | 401 | 404 | 404 | 200 | 200 | 200 | 200 |
| `/checkin/situacao` | 401 | 200 | 200 | 200 | 200 | 200 | 200 |
| `/checkin/suspensao` | 401 | 200 | 200 | 200 | 200 | 200 | 200 |
| `/configuracao-ia` | 401 | 403 | 403 | 403 | 403 | 200 | 403 |
| `/configuracao-ia/versoes` | 401 | 403 | 403 | 403 | 403 | 200 | 403 |
| `/demanda?projetoId=2&allRows=true` | 401 | 200 | 200 | 200 **S** | 200 **S** | 200 **S** | 200 **S** |
| `/demanda?allRows=true` | 401 | 400 | 400 | 400 | 400 | 400 | 400 |
| `/demanda/8` | 401 | 404 | 404 | 200 **S** | 200 **S** | 200 **S** | 200 **S** |
| `/demanda/8/ancestral` | 401 | 404 | 404 | 200 | 200 | 200 | 200 |
| `/demanda/8/arvore` | 401 | 404 | 404 | 200 **S** | 200 **S** | 200 **S** | 200 **S** |
| `/demanda/8/conexao` | 401 | 404 | 404 | 200 | 200 | 200 | 200 |
| `/demanda/8/detalhe` | 401 | 404 | 404 | 200 **S** | 200 **S** | 200 **S** | 200 **S** |
| `/demanda/8/membro` | 401 | 404 | 404 | 200 | 200 | 200 | 200 |
| `/demanda/8/tag` | 401 | 404 | 404 | 200 | 200 | 200 | 200 |
| `/demanda/atribuidas` | 401 | 200 | 200 | 200 **S** | 200 **S** | 200 **S** | 200 **S** |
| `/demanda/documentacao` | 401 | 200 | 200 | 200 **S** | 200 **S** | 200 **S** | 200 **S** |
| `/demanda/executadas?limite=20` | 401 | 200 | 200 | 200 | 200 | 200 | 200 **S** |
| `/demanda/grafo?projetoId=2` | 401 | 403 | 403 | 200 **S** | 200 **S** | 200 **S** | 200 **S** |
| `/demanda/planejamento?projetoId=2` | 401 | 403 | 403 | 200 **S** | 200 **S** | 200 **S** | 403 |
| `/desktop/versao` | 401 | 200 | 200 | 200 | 200 | 200 | 200 |
| `/desktop/download` | 401 | 404 | 404 | 404 | 404 | 404 | 404 |
| `/execucao?usuarioId=5&data=2026-11-12&allRows=true` | 401 | 200 | 200 | 200 **S** | 200 **S** | 200 **S** | 200 **S** |
| `/execucao?atividadeId=8&allRows=true` | 401 | 200 | 200 | 200 **S** | 200 **S** | 200 **S** | 200 **S** |
| `/execucao?data=2026-11-12&allRows=true` | 401 | 200 | 200 | 200 **S** | 200 **S** | 200 **S** | 200 **S** |
| `/execucao/1` | 401 | 403 | 403 | 200 **S** | 200 **S** | 200 **S** | 200 **S** |
| `/execucao/ativa` | 401 | 200 | 200 | 200 | 200 | 200 | 200 |
| `/ia-custo?ano=2026` | 401 | 403 | 403 | 403 | 403 | 200 | 403 |
| `/ia/disponibilidade` | 401 | 200 | 200 | 200 | 200 | 200 | 200 |
| `/ia/estado` | 401 | 403 | 403 | 403 | 403 | 200 | 403 |
| `/ia/modelos` | 401 | 403 | 403 | 403 | 403 | 200 | 403 |
| `/mensagem-direta/busca?termo=SEGREDO` | 401 | 400 | 400 | 400 | 400 | 400 | 400 |
| `/mensagem-direta/canal/demanda/8` | 401 | 403 | 403 | 403 | 200 | 200 | 200 |
| `/mensagem-direta/canal/projeto/2` | 401 | 403 | 403 | 403 | 200 | 200 | 200 |
| `/mensagem-direta/conversa/5` | 401 | 200 | 200 **S** | 200 | 200 **S** | 200 | 400 |
| `/mensagem-direta/conversas` | 401 | 200 | 200 **S** | 200 | 200 **S** | 200 | 200 **S** |
| `/mensagem-direta/grupo/1` | 401 | 403 | 200 **S** | 403 | 403 | 403 | 200 **S** |
| `/mensagem-direta/grupo/1/busca?termo=SEGREDO` | 401 | 400 | 400 | 400 | 400 | 400 | 400 |
| `/mensagem-direta/grupo/1/fixadas` | 401 | 403 | 200 | 403 | 403 | 403 | 200 |
| `/mensagem-direta/grupo/1/mensagens` | 401 | 403 | 200 **S** | 403 | 403 | 403 | 200 **S** |
| `/mensagem-direta/grupo/1/resumo` | 401 | 403 | 200 | 403 | 403 | 403 | 200 |
| `/mensagem-direta/pessoas` | 401 | 200 | 200 | 200 | 200 | 200 | 200 |
| `/mensagem-direta/preferencia` | 401 | 200 | 200 | 200 | 200 | 200 | 200 |
| `/mensagem-direta/referencia/DEMANDA/8` | 401 | 200 | 200 | 200 **S** | 200 **S** | 200 **S** | 200 **S** |
| `/mensagem-direta/referencia/ATIVIDADE/8` | 401 | 200 | 200 | 200 **S** | 200 **S** | 200 **S** | 200 **S** |
| `/mensagem-direta/referencias?termo=SEGREDO` | 401 | 400 | 400 | 400 | 400 | 400 | 400 |
| `/mensagem-direta/supervisao/conversas?pagina=1&porPagina=20` | 401 | 403 | 403 | 403 | 200 **S** | 200 **S** | 403 |
| `/mensagem-direta/supervisao/grupos` | 401 | 403 | 403 | 403 | 200 **S** | 200 **S** | 403 |
| `/mensagem-direta/supervisao/grupo/1` | 401 | 403 | 403 | 403 | 200 **S** | 200 **S** | 403 |
| `/modelagem` | 401 | 200 | 200 | 200 | 200 | 200 | 200 |
| `/plano` | 401 | 200 | 200 | 200 **S** | 200 **S** | 200 **S** | 200 **S** |
| `/plano/1` | 401 | 404 | 404 | 404 | 404 | 404 | 200 **S** |
| `/plano/2` | 401 | 404 | 404 | 200 **S** | 200 **S** | 200 **S** | 200 **S** |
| `/plano/1/fonte` | 401 | 404 | 404 | 404 | 404 | 404 | 200 |
| `/plano/1/ponto` | 401 | 404 | 404 | 404 | 404 | 404 | 200 |
| `/plano/2/fonte` | 401 | 404 | 404 | 200 | 200 | 200 | 200 |
| `/plano/2/ponto` | 401 | 404 | 404 | 200 | 200 | 200 | 200 |
| `/plano/demanda/8` | 401 | 200 | 200 | 200 | 200 | 200 | 200 |
| `/ponto-justificativa?usuarioId=5&ano=2026&mes=11` | 401 | 403 | 403 | 403 | 200 | 200 | 403 |
| `/ponto/diario?usuarioId=5&data=2026-11-12` | 401 | 403 | 403 | 200 **S** | 200 **S** | 200 **S** | 200 **S** |
| `/ponto/mensal?usuarioId=5&ano=2026&mes=11` | 401 | 403 | 403 | 200 | 200 | 200 | 200 |
| `/ponto/todos?data=2026-11-12` | 401 | 403 | 403 | 200 **S** | 200 **S** | 200 **S** | 403 |
| `/projeto?allRows=true` | 401 | 200 | 200 | 200 **S** | 200 **S** | 200 **S** | 200 **S** |
| `/projeto/2` | 401 | 404 | 404 | 200 **S** | 200 **S** | 200 **S** | 200 **S** |
| `/projeto/2/volume-vigencia` | 401 | 403 | 403 | 403 | 200 | 200 | 403 |
| `/projeto/volume?ano=2026&mes=11` | 401 | 403 | 403 | 403 | 200 **S** | 200 **S** | 403 |
| `/projeto/volume/anual?ano=2026` | 401 | 403 | 403 | 403 | 200 **S** | 200 **S** | 403 |
| `/prompt` | 401 | 403 | 403 | 403 | 403 | 200 | 403 |
| `/prompt/CONVERSA/versoes` | 401 | 403 | 403 | 403 | 403 | 200 | 403 |
| `/proposta-ia/1` | 401 | 404 | 404 | 404 | 404 | 404 | 404 |
| `/relatorio/execucao?projetoId=2&ano=2026&mes=11` | 401 | 403 | 403 | 403 | 400 | 400 | 403 |
| `/relatorio/execucao/download?projetoId=2&ano=2026&mes=11` | 401 | 403 | 403 | 403 | 400 | 400 | 403 |
| `/tag` | 401 | 200 **S** | 200 **S** | 200 **S** | 200 **S** | 200 **S** | 200 **S** |
| `/tag/34` | 401 | 200 **S** | 200 **S** | 200 **S** | 200 **S** | 200 **S** | 200 **S** |
| `/tipo-usuario-ajuda` | 401 | 403 | 403 | 403 | 200 | 200 | 403 |
| `/usuario?allRows=true` | 401 | 403 | 403 | 200 | 200 | 200 | 403 |
| `/usuario/5` | 401 | 403 | 403 | 403 | 200 | 200 | 200 |

Leitura do resultado: nenhum **S** nas colunas dos desenvolvedores sem acesso, a não ser nas tags (`/tag`), que são globais. O que diverge do esperado está nos achados do dossiê (403 no lugar de 404, canal recusado ao auxiliar).

## 3. Medido: regras de escrita por perfil

Cada linha é uma regra do `SYSTEM.SPEC.md` §14 exercitada com corpo válido. "ok" = o backend respondeu como a regra manda.

| Perfil | Tentativa | Requisição | Status | Resposta | Resultado |
|---|---|---|---|---|---|
| desenvolvedor | editar demanda de projeto sem acesso | `PUT /demanda/11` | 404 | Demanda não encontrado | ok |
| desenvolvedor | gravar texto de demanda sem acesso | `PATCH /demanda/11/textos` | 404 | Demanda não encontrado | ok |
| desenvolvedor | criar sub-demanda em projeto sem acesso | `POST /demanda` | 403 | Desenvolvedor não tem acesso ao projeto informado | ok |
| desenvolvedor | incluir a si mesmo em demanda de projeto sem acesso | `POST /demanda/11/membro` | 403 | Desenvolvedor não tem acesso ao projeto desta demanda | ok |
| desenvolvedor | tag em demanda sem acesso | `PUT /demanda/11/tag` | 403 | Você só pode atribuir tags em demandas das quais é membro | ok |
| desenvolvedor | ligar demanda própria a demanda de projeto sem acesso | `POST /demanda/2/conexao` | 403 | Você não tem permissão para esta ação | ok |
| desenvolvedor | criar atividade em demanda sem acesso | `POST /atividade` | 403 | Usuário não tem acesso à demanda informada | ok |
| desenvolvedor | editar atividade alheia | `PUT /atividade/10` | 403 | Desenvolvedor não tem permissão para alterar esta atividade | ok |
| desenvolvedor | tag em atividade alheia | `PUT /atividade/10/tag` | 403 | Desenvolvedor não tem permissão para alterar esta atividade | ok |
| desenvolvedor | iniciar execução de atividade alheia (PLANEJADA) | `POST /execucao` | 400 | A descrição é obrigatória | atenção: 400 antes da permissão |
| desenvolvedor | iniciar execução de atividade alheia PENDENTE (R-16) | `POST /execucao` | 400 | Só é possível iniciar execução em atividades planejadas ou em desenvolvimento | atenção: regra de negócio antes da permissão |
| desenvolvedor | editar execução alheia | `PUT /execucao/2` | 403 | Desenvolvedor não pode editar execução de outro usuário | ok |
| desenvolvedor | encerrar execução alheia já encerrada | `PATCH /execucao/2/encerrar` | 400 | Esta execução já foi encerrada | atenção: regra de negócio antes da permissão |
| desenvolvedor | excluir execução alheia | `DELETE /execucao/2` | 403 | Você não tem permissão para esta ação | ok |
| desenvolvedor | gravar no pad de outro | `PUT /anotacao/5/EM_ANDAMENTO` | 403 | Desenvolvedor acessa apenas o próprio pad | ok |
| desenvolvedor | alterar outro usuário | `PUT /usuario/5` | 403 | Apenas gestores podem alterar usuários | ok |
| desenvolvedor | promover a si mesmo | `PUT /usuario/2` | 403 | Apenas gestores podem alterar usuários | ok |
| desenvolvedor | alterar o próprio cadastro (só gestor altera) | `PUT /usuario/2` | 403 | Apenas gestores podem alterar usuários | ok |
| desenvolvedor | atribuir plano próprio a projeto sem acesso | `PATCH /plano/6/projeto` | 403 | Você não tem acesso a este projeto | ok |
| desenvolvedor | ligar plano próprio a demanda sem acesso | `PUT /plano/6/demanda` | 400 | Plano amplo não liga a demanda; atribua um projeto ao plano antes | atenção: 400 antes da permissão |
| desenvolvedor | editar plano privado de outro | `PUT /plano/1` | 404 | Plano não encontrado | ok |
| desenvolvedor | editar mensagem de outra conversa | `PATCH /mensagem-direta/mensagem` | 404 | Mensagem não encontrado | ok |
| desenvolvedor | reagir a mensagem de outra conversa | `PUT /mensagem-direta/reacao` | 404 | Mensagem não encontrado | ok |
| desenvolvedor | enviar em grupo de que não participa | `POST /mensagem-direta/grupo/1/mensagem` | 403 | Você não é membro deste grupo | ok |
| desenvolvedor | renomear grupo de que não participa | `PATCH /mensagem-direta/grupo/1` | 403 | Você não é membro deste grupo | ok |
| desenvolvedor | incluir a si mesmo em grupo alheio | `POST /mensagem-direta/grupo/1/membros` | 403 | Você não é membro deste grupo | ok |
| desenvolvedor | reagir em grupo alheio | `PUT /mensagem-direta/grupo/1/reacao` | 403 | Você não é membro deste grupo | ok |
| desenvolvedor | abrir canal de projeto sem acesso | `POST /mensagem-direta/canal/projeto/2` | 403 | Você não tem acesso a este projeto | ok |
| desenvolvedor | abrir canal de demanda sem acesso | `POST /mensagem-direta/canal/demanda/11` | 403 | Você não é membro desta demanda | ok |
| desenvolvedor | pedir à IA trecho de demanda sem acesso | `POST /assistente/alterar-trecho` | 400 | Dados inválidos | atenção: 400 antes da permissão |
| desenvolvedor membro | membro altera descricaoCliente (só gestor) | `PATCH /demanda/11/textos` | 403 | Apenas gestores podem alterar a descrição do cliente | ok |
| desenvolvedor membro | membro altera descricaoCliente pelo PUT | `PUT /demanda/11` | 403 | Apenas gestores podem alterar a descrição do cliente | ok |
| desenvolvedor membro | desenvolvedor cria demanda raiz | `POST /demanda` | 403 | Desenvolvedor só pode criar sub-demandas (é obrigatório informar a demanda pai) | ok |
| desenvolvedor membro | desenvolvedor inclui outra pessoa como membro | `POST /demanda/11/membro` | 403 | Desenvolvedor só pode incluir a si mesmo como membro | ok |
| desenvolvedor membro | desenvolvedor cria atividade informando outro dono | `POST /atividade` | 201 | Atividade criada com sucesso (dono=5) | registrado |
| desenvolvedor membro | desenvolvedor cria tag | `POST /tag` | 403 | Você não tem permissão para esta ação | ok |
| desenvolvedor membro | desenvolvedor membro exclui demanda | `DELETE /demanda/12` | 403 | Acesso restrito a gestores | ok |
| desenvolvedor membro | iniciar execução de atividade de projeto sem acesso | `POST /execucao` | 400 | A descrição é obrigatória | atenção: 400 antes da permissão |
| desenvolvedor membro | desenvolvedor registra execução manual | `POST /execucao/registro` | 403 | Você não tem permissão para esta ação | ok |
| auxiliar | auxiliar cria projeto | `POST /projeto` | 403 | Acesso restrito a gestores | ok |
| auxiliar | auxiliar edita projeto | `PUT /projeto/2` | 403 | Acesso restrito a gestores | ok |
| auxiliar | auxiliar exclui demanda | `DELETE /demanda/12` | 403 | Acesso restrito a gestores | ok |
| auxiliar | auxiliar altera descricaoCliente | `PATCH /demanda/11/textos` | 403 | Apenas gestores podem alterar a descrição do cliente | ok |
| auxiliar | auxiliar altera descricaoCliente pelo PUT | `PUT /demanda/11` | 403 | Apenas gestores podem alterar a descrição do cliente | ok |
| auxiliar | auxiliar cria atividade para outra pessoa | `POST /atividade` | 201 | Atividade criada com sucesso (dono=4) | registrado |
| auxiliar | auxiliar cria usuário | `POST /usuario` | 403 | Acesso restrito a gestores | ok |
| auxiliar | auxiliar altera usuário | `PUT /usuario/5` | 403 | Apenas gestores podem alterar usuários | ok |
| auxiliar | auxiliar troca senha de outro | `PATCH /usuario/5/senha` | 403 | Acesso restrito a gestores | ok |
| auxiliar | auxiliar cadastra dia não útil | `POST /calendario` | 403 | Acesso restrito a gestores | ok |
| auxiliar | auxiliar justifica ponto | `POST /ponto-justificativa` | 403 | Acesso restrito a gestores | ok |
| auxiliar | auxiliar altera prioridade | `PATCH /atividade-prioridade/ALTA` | 403 | Acesso restrito a administradores | ok |
| auxiliar | auxiliar grava no pad de outro | `PUT /anotacao/5/EM_ANDAMENTO` | 403 | Desenvolvedor acessa apenas o próprio pad | ok |
| auxiliar | gestor como membro de demanda (nunca é membro) | `POST /demanda/11/membro` | 201 | Membro atribuído à demanda com sucesso | **falha** |
| auxiliar | auxiliar edita demanda alheia | `PUT /demanda/11` | 200 | Demanda alterada com sucesso | ok |
| auxiliar | auxiliar edita atividade alheia | `PUT /atividade/10` | 200 | Atividade alterada com sucesso | ok |
| auxiliar | auxiliar edita execução alheia | `PUT /execucao/2` | 200 | Execução alterada com sucesso | ok |
| gestor | gestor cria administrador | `POST /usuario` | 403 | Apenas administradores podem criar ou promover administradores | ok |
| gestor | gestor altera administrador | `PUT /usuario/1` | 403 | Apenas administradores podem gerenciar administradores | ok |
| gestor | gestor troca a senha do administrador | `PATCH /usuario/1/senha` | 403 | Apenas administradores podem gerenciar administradores | ok |
| gestor | gestor exclui administrador | `DELETE /usuario/1` | 403 | Apenas administradores podem gerenciar administradores | ok |
| gestor | gestor promove a si mesmo a administrador | `PUT /usuario/3` | 403 | Apenas administradores podem criar ou promover administradores | ok |
| gestor | gestor altera texto de ajuda do tipo | `PUT /tipo-usuario-ajuda/DESENVOLVEDOR` | 403 | Acesso restrito a administradores | ok |
| gestor | gestor altera prioridade | `PATCH /atividade-prioridade/ALTA` | 403 | Acesso restrito a administradores | ok |
| gestor | gestor entra como membro de demanda | `POST /demanda/11/membro` | 400 | Usuário já está atribuído a esta demanda | atenção: 400 antes da permissão |
| gestor | gestor grava no pad de outro (lê; e escreve?) | `PUT /anotacao/5/EM_ANDAMENTO` | 409 | A seção foi alterada em outro lugar; recarregue e tente de novo (dono=-) | registrado |
| gestor | gestor envia em grupo que só supervisiona | `POST /mensagem-direta/grupo/1/mensagem` | 403 | Você não é membro deste grupo | ok |

## 4. Lido no código: rota × tipo de usuário, por módulo

O que cada tipo consegue em cada rota segundo a leitura do controller e da service. "parcial" traz a condição. A coluna "Conforme" compara com as regras do `SYSTEM.SPEC.md` §11 e §14; vazio quando a regra não está escrita.

### PA-usuario-anotacao-projeto-ponto

| Rota | Trava na rota | Verificação na service | Adm | Gestor | Aux | Dev | Conforme |
|---|---|---|---|---|---|---|---|
| POST /autenticacao/login | @Public (autenticacao.controller.ts:46) | validarCredenciais:19-37 | sim | sim | sim | sim |  |
| POST /usuario | @GestorOnly (usuario.controller.ts:74) | criar:38-40 (validarPermissaoDeAdministrador:201) | sim | parcial: não cria ADMINISTRADOR | nao | nao | sim |
| GET /usuario | @ExigePermissao(temVisibilidadeTotal) (usuario.controller.ts:103) | nenhuma (listar:67 não recebe o usuário ativo) | sim | sim | sim (com login e temAnotacoes de todos) | nao |  |
| PUT /usuario/cor | nenhuma | alterarCor:263 (id vem do token no controller:115) | parcial: só a própria cor | parcial: só a própria cor | parcial: só a própria cor | parcial: só a própria cor | sim |
| GET /usuario/:id | nenhuma | recuperar:103 | sim | sim | parcial: só o próprio | parcial: só o próprio | sim |
| PUT /usuario/:id | nenhuma | alterar:137, 147, 152, 163-166, 170-174 | parcial: não rebaixa nem inativa o último administrador ativo | parcial: não altera administrador, não promove a administrador, não rebaixa a si mesmo | nao | nao | sim |
| DELETE /usuario/:id | @GestorOnly (usuario.controller.ts:181) | excluir:222-228 | parcial: não o último administrador ativo nem quem tem execução | parcial: não administrador nem quem tem execução (a si mesmo, sim) | nao | nao | sim |
| PATCH /usuario/:id/restaurar | @GestorOnly (usuario.controller.ts:193) | restaurar:246 | sim | parcial: não administrador | nao | nao | sim |
| PATCH /usuario/:id/senha | @GestorOnly (usuario.controller.ts:215) | alterarSenha:281 | sim (qualquer usuário, sem senha atual) | parcial: qualquer não administrador, inclusive a própria e a de outro gestor, sem senha atual | nao (nem a própria) | nao (nem a própria) |  |
| GET /tipo-usuario-ajuda | @GestorOnly (tipo-usuario-ajuda.controller.ts:17) | nenhuma (listar:22) | sim | sim | nao | nao | sim |
| PUT /tipo-usuario-ajuda/:tipo | @AdministradorOnly (tipo-usuario-ajuda.controller.ts:24) | alterar:29 | sim | nao | nao | nao | sim |
| GET /anotacao?usuarioId | nenhuma | listar:46 -> validarAcesso:165-175 | parcial: o próprio e o de desenvolvedor/auxiliar | parcial: o próprio e o de desenvolvedor/auxiliar | parcial: só o próprio | parcial: só o próprio |  |
| PUT /anotacao/:usuarioId/:tipo | nenhuma | alterar:58 -> validarAcesso:165-175 | parcial: o próprio e o de desenvolvedor/auxiliar (todas as seções) | parcial: o próprio e o de desenvolvedor/auxiliar (todas as seções) | parcial: só o próprio | parcial: só o próprio |  |
| PATCH /anotacao/:usuarioId/:tipo/trecho | nenhuma | trocarTrecho:76 -> validarAcesso:165-175 | parcial: o próprio e o de desenvolvedor/auxiliar | parcial: o próprio e o de desenvolvedor/auxiliar | parcial: só o próprio | parcial: só o próprio |  |
| POST /anotacao/:usuarioId/:tipo/anexo | nenhuma | anexarTexto:95 -> validarAcesso:165-175 | parcial: o próprio e o de desenvolvedor/auxiliar | parcial: o próprio e o de desenvolvedor/auxiliar | parcial: só o próprio | parcial: só o próprio |  |
| POST /anotacao/:usuarioId/feito | nenhuma | anexarFeito:112 -> validarAcesso:165-175 | parcial: o próprio e o de desenvolvedor/auxiliar | parcial: o próprio e o de desenvolvedor/auxiliar | parcial: só o próprio | parcial: só o próprio |  |
| POST /anotacao/:usuarioId/mover | nenhuma | moverTrecho:130 -> validarAcesso:165-175 | parcial: o próprio e o de desenvolvedor/auxiliar | parcial: o próprio e o de desenvolvedor/auxiliar | parcial: só o próprio | parcial: só o próprio |  |
| POST /projeto | @GestorOnly (projeto.controller.ts:48) | nenhuma (criar:32) | sim | sim | nao | nao | sim |
| GET /projeto | nenhuma | listar:72-74 (temVisibilidadeTotal) | sim | sim | sim | parcial: só projetos com linha em demanda_usuario | sim |
| GET /projeto/volume | @GestorOnly (projeto.controller.ts:70) | nenhuma (listarVolume:109) | sim | sim | nao | nao | sim |
| GET /projeto/volume/anual | @GestorOnly (projeto.controller.ts:80) | nenhuma (listarVolumeAnual:118) | sim | sim | nao | nao | sim |
| GET /projeto/:id/volume-vigencia | @GestorOnly (projeto.controller.ts:86) | nenhuma de tipo (ProjetoVolumeVigenciaService.listar:14 só existência) | sim | sim | nao | nao | sim |
| POST /projeto/:id/volume-vigencia | @GestorOnly (projeto.controller.ts:92) | nenhuma de tipo (ProjetoVolumeVigenciaService.criar:19-22) | sim | sim | nao | nao | sim |
| DELETE /projeto/:id/volume-vigencia/:vigenciaId | @GestorOnly (projeto.controller.ts:98) | nenhuma de tipo (ProjetoVolumeVigenciaService.excluir:33-35 confere vigência do projeto) | sim | sim | nao | nao | sim |
| GET /projeto/:id | nenhuma | recuperar:138-142 (validarAcesso do repository) | sim | sim | sim | parcial: 404 sem linha em demanda_usuario no projeto | sim |
| PUT /projeto/:id | @GestorOnly (projeto.controller.ts:122) | nenhuma (alterar:154) | sim | sim | nao | nao | sim |
| DELETE /projeto/:id | @GestorOnly (projeto.controller.ts:136) | nenhuma (excluir:187) | sim | sim | nao | nao | sim |
| PATCH /projeto/:id/restaurar | @GestorOnly (projeto.controller.ts:148) | nenhuma (restaurar:204) | sim | sim | nao | nao | sim |
| GET /relatorio/execucao | @GestorOnly (relatorio.controller.ts:27) | nenhuma (gerarRelatorio:70) | sim | sim | nao | nao | sim |
| GET /relatorio/execucao/download | @GestorOnly (relatorio.controller.ts:36) | nenhuma (baixarRelatorio:81) | sim | sim | nao | nao | sim |
| POST /relatorio/execucao/revisar | @GestorOnly (relatorio.controller.ts:49) | nenhuma (revisarRelatorio:100) | sim | sim | nao | nao | sim |
| POST /calendario | @GestorOnly (calendario.controller.ts:42) | nenhuma (criar:21) | sim | sim | nao | nao | sim |
| GET /calendario/verificar | nenhuma | nenhuma (verificarDiaUtil:123) | sim | sim | sim | sim |  |
| GET /calendario | nenhuma | nenhuma (listar:38) | sim | sim | sim | sim |  |
| GET /calendario/:id | nenhuma | nenhuma (recuperar:49) | sim | sim | sim | sim |  |
| PUT /calendario/:id | @GestorOnly (calendario.controller.ts:79) | nenhuma (alterar:64) | sim | sim | nao | nao | sim |
| DELETE /calendario/:id | @GestorOnly (calendario.controller.ts:93) | nenhuma (excluir:87) | sim | sim | nao | nao | sim |
| PATCH /calendario/:id/restaurar | @GestorOnly (calendario.controller.ts:105) | nenhuma (restaurar:104) | sim | sim | nao | nao | sim |
| GET /ponto/diario | nenhuma | consultarDiario:69 (temVisibilidadeTotal) | sim | sim | sim | parcial: só o próprio | sim |
| GET /ponto/todos | @ExigePermissao(podeVerExecucaoEPontoDeOutro) (ponto.controller.ts:25) | nenhuma (consultarTodos:86) | sim | sim | sim | nao | sim |
| GET /ponto/mensal | nenhuma | consultarMensal:104 (temVisibilidadeTotal) | sim | sim | sim | parcial: só o próprio | sim |
| POST /ponto-justificativa | @GestorOnly na classe (ponto-justificativa.controller.ts:21) | nenhuma de tipo/dono (criar:28-65) | sim (inclusive para si mesmo) | sim (inclusive para si mesmo) | nao | nao | sim |
| GET /ponto-justificativa | @GestorOnly na classe (ponto-justificativa.controller.ts:21) | nenhuma (listar:68) | sim | sim | nao | nao | sim |
| DELETE /ponto-justificativa/:id | @GestorOnly na classe (ponto-justificativa.controller.ts:21) | nenhuma (excluir:81) | sim | sim (também as criadas por outro gestor) | nao | nao | sim |
| POST /tag | @ExigePermissao(podeGerenciarTag) (tag.controller.ts:34) | nenhuma (criar:22) | sim | sim | sim | nao | sim |
| GET /tag | nenhuma | nenhuma (listar:39) | sim | sim | sim | sim | sim |
| GET /tag/:id | nenhuma | nenhuma (recuperar:50) | sim | sim | sim | sim | sim |
| PUT /tag/:id | @ExigePermissao(podeGerenciarTag) (tag.controller.ts:63) | nenhuma (alterar:65) | sim | sim | sim | nao | sim |
| DELETE /tag/:id | @ExigePermissao(podeGerenciarTag) (tag.controller.ts:77) | nenhuma (excluir:89) | sim | sim | sim | nao | sim |
| PATCH /tag/:id/restaurar | @ExigePermissao(podeGerenciarTag) (tag.controller.ts:89) | nenhuma (restaurar:106) | sim | sim | sim | nao | sim |
| GET /atividade-prioridade | nenhuma | nenhuma (listar:20) | sim | sim | sim | sim | sim |
| PATCH /atividade-prioridade/:codigo | @AdministradorOnly (atividade-prioridade.controller.ts:18) | alterarCor:30 | sim | nao | nao | nao | sim |

### PC-demanda

| Rota | Trava na rota | Verificação na service | Adm | Gestor | Aux | Dev | Conforme |
|---|---|---|---|---|---|---|---|
| POST /demanda | nenhuma | criar:75-95 (raiz e acesso ao projeto), 119-121 (descricaoCliente), 125-131 (usuarioIds) | sim | sim | parcial: sem descricaoCliente | parcial: só sub-demanda em projeto com acesso, sem descricaoCliente, só a si mesmo em usuarioIds | **não** |
| GET /demanda | nenhuma | listar:196-199 (restrição por usuário) | sim | sim | sim | parcial: só demandas em que é membro |  |
| GET /demanda/grafo | nenhuma | recuperarGrafo:739-750 (validarAcessoProjeto) | sim | sim | sim | parcial: projeto com acesso (403 senão) | sim |
| GET /demanda/:id/arvore | nenhuma | recuperarArvore:493-502 | sim | sim | sim | parcial: projeto com acesso (404 senão) | sim |
| GET /demanda/:id/ancestral | nenhuma | recuperarAncestral:549-558 | sim | sim | sim | parcial: projeto com acesso (404 senão) | sim |
| GET /demanda/:id/detalhe | nenhuma | recuperarDetalhe:335 (via recuperar:303-313) | sim | sim | sim | parcial: projeto com acesso (404 senão) | sim |
| GET /demanda/atribuidas | nenhuma | listarAtribuidas:240-243 | sim | sim | sim | parcial: só as atribuídas a ele | sim |
| GET /demanda/executadas | nenhuma | listarExecutadas:261-266 (sempre o usuário do token) | parcial: só as que executou | parcial: só as que executou | parcial: as que executou e as de que é membro | parcial: só as de que é membro | sim |
| GET /demanda/planejamento | @ExigePermissao(temVisibilidadeTotal) | nenhuma (listarPlanejamento:284 ignora o usuário) | sim | sim | sim | nao | sim |
| GET /demanda/documentacao | nenhuma | listarParaDocumentacao:412-415 | sim | sim | sim | parcial: projetos com acesso | sim |
| GET /demanda/:id | nenhuma | recuperar:303-313 | sim | sim | sim | parcial: projeto com acesso (404 senão) | sim |
| PUT /demanda/:id | nenhuma | alterar:360 (recuperarDemandaParaEditar:448-479) | sim | sim | parcial: tudo menos descricaoCliente | parcial: só como membro e sem descricaoCliente | sim |
| PATCH /demanda/:id/textos | nenhuma | alterarTextos:427 (recuperarDemandaParaEditar:448-479) | sim | sim | parcial: técnica e documentação, nunca descricaoCliente | parcial: só como membro e nunca descricaoCliente | sim |
| DELETE /demanda/:id | @GestorOnly | nenhuma (excluir:692-706 sem usuário) | sim | sim | nao | nao | sim |
| PATCH /demanda/:id/restaurar | @GestorOnly | nenhuma (restaurar:709-729 sem usuário) | sim | sim | nao | nao | sim |
| POST /demanda/:id/conexao | @ExigePermissao(podeEditarDemanda) | criarConexao:578-580 | sim | sim | sim | nao | sim |
| GET /demanda/:id/conexao | nenhuma | listarConexoes:638-647 | sim | sim | sim | parcial: projeto com acesso (404 senão) | sim |
| DELETE /demanda/:id/conexao/:conexaoId | @ExigePermissao(podeEditarDemanda) | excluirConexao:666-668 | sim | sim | sim | nao | sim |
| PUT /demanda/:id/tag | nenhuma | alterarTagsDemanda:777-782 (validarMembro) | sim | sim | sim | parcial: só como membro (403 também em projeto sem acesso, onde deveria ser 404) | sim |
| GET /demanda/:id/tag | nenhuma | listarTagsDemanda:810-819 | sim | sim | sim | parcial: projeto com acesso (404 senão) | sim |
| GET /demanda/:id/membro | nenhuma | listarMembros:838-847 | sim | sim | sim | parcial: projeto com acesso (404 senão) | sim |
| POST /demanda/:id/membro | nenhuma | atribuirMembro:874-890 (tipo do alvo não é conferido: 892-895) | sim | sim | sim | parcial: só a si mesmo, em projeto com acesso | **não** |
| DELETE /demanda/:id/membro/:usuarioId | nenhuma | removerMembro:940-947 (dono) e 954-957 (último membro) | parcial: qualquer membro, menos o último | parcial: qualquer membro, menos o último | parcial: qualquer membro, menos o último | parcial: só a si mesmo, menos o último | sim |

### PD-atividade-execucao-checkin

| Rota | Trava na rota | Verificação na service | Adm | Gestor | Aux | Dev | Conforme |
|---|---|---|---|---|---|---|---|
| POST /atividade | nenhuma | AtividadeService.criar:53-66 (dono por temPermissaoDeGestor:54; vínculo por validarAcessoDemanda:58-66) | sim | sim | parcial: qualquer demanda, sempre para si (usuarioId do corpo ignorado em silêncio) | parcial: só em demanda de que é membro, sempre para si (usuarioId ignorado em silêncio) | sim |
| GET /atividade | nenhuma | AtividadeService.listar:114-125 | sim | sim | sim | parcial: só as próprias; todas as da demanda quando filtra por demandaId de que é membro | sim |
| GET /atividade/:id | nenhuma | AtividadeService.recuperar:171-179 | sim | sim | sim | parcial: só se membro da demanda; 403 (não 404) sem vínculo, inclusive para o dono não membro |  |
| PUT /atividade/:id | nenhuma | AtividadeService.alterar:202-214 (validarMudancaDeDemanda:249-266 inalcançável pela rota) | sim | sim | sim | parcial: dono OU membro da demanda (altera atividade alheia) | **não** |
| DELETE /atividade/:id | @ExigePermissao(podeEditarAtividadeDeOutro) | AtividadeService.excluir:277 | sim | sim | sim | nao (pela IA, o dono exclui a própria sem execução) | sim |
| PATCH /atividade/:id/restaurar | @ExigePermissao(podeEditarAtividadeDeOutro) | AtividadeService.restaurar:296 | sim | sim | sim | nao (pela IA, o dono restaura ao desfazer) | sim |
| PUT /atividade/:id/tag | nenhuma | AtividadeService.alterarTags:329-341 | sim | sim | sim | parcial: dono OU membro da demanda (troca tags de atividade alheia) | **não** |
| GET /atividade/:id/tag | nenhuma | AtividadeService.listarTags:373-381 | sim | sim | sim | parcial: só se membro da demanda; 403 sem vínculo, inclusive para o dono não membro |  |
| POST /execucao | nenhuma | ExecucaoService.iniciar:104-109 (depois das regras de status:92 e descrição:96) | sim | sim | sim | parcial: só atividade própria | sim |
| POST /execucao/registro | @ExigePermissao(podeEditarExecucaoDeOutro) | nenhuma (registrar:142-186 não usa o usuário) | sim | sim | sim | nao | sim |
| GET /execucao | nenhuma | ExecucaoService.listar:288-289 | sim | sim | sim | parcial: só as próprias (usuarioId do filtro sobrescrito) | sim |
| GET /execucao/ativa | nenhuma | ExecucaoService.recuperarAtiva:240 (sempre o usuário do token) | sim | sim | sim | sim | sim |
| GET /execucao/:id | nenhuma | ExecucaoService.recuperar:337-342 | sim | sim | sim | parcial: só a própria; 403 (não 404) na alheia | sim |
| PATCH /execucao/:id/encerrar | nenhuma | ExecucaoService.encerrar:205-210 (depois da regra 'já encerrada':201) | sim | sim | sim | parcial: só a própria | sim |
| PUT /execucao/:id | nenhuma | ExecucaoService.alterar:364-369 | sim | sim | sim | parcial: só a própria (descrição, início, fim e reabrir com fimData null) | sim |
| DELETE /execucao/:id | @ExigePermissao(podeEditarExecucaoDeOutro) | nenhuma (excluir:408-424 não usa o usuário) | sim | sim | sim | nao | sim |
| GET /checkin/situacao | nenhuma | CheckinService.montarSituacao:55-68 (sempre o usuário do token) | sim | sim | sim | sim | sim |
| POST /checkin/mensagem | nenhuma | CheckinService.enviarMensagem:36-52 (situação e conversa do token; 409 sem execução ativa) | sim | sim | sim | sim | sim |
| GET /checkin/suspensao | nenhuma | CheckinController.consultarSuspensao:40 (CheckinSuspensaoService.consultar(usuarioAtivo.sub)) | sim | sim | sim | sim | sim |

### PE-chat-ia-propostas-ferramentas

| Rota | Trava na rota | Verificação na service | Adm | Gestor | Aux | Dev | Conforme |
|---|---|---|---|---|---|---|---|
| POST /chat/mensagem | nenhuma (JwtAuthGuard global) | ChatService.enviarMensagem (chat.service.ts:195); conversa montada com usuarioAtivo.sub (:574) | sim | sim | sim | sim | sim |
| POST /chat/bom-dia | nenhuma | ChatService.iniciarBomDia (chat.service.ts:235) | sim | sim | sim | sim | sim |
| POST /chat/retomada | nenhuma | ChatService.retomarAposQueda (chat.service.ts:262) | sim | sim | sim | sim | sim |
| GET /chat/plano/:planoId | nenhuma | ChatPlanoService.recuperarConversa -> planoService.recuperar (chat-plano.service.ts:86) | parcial: só plano acessível (regra da PlanoService, não lida) | parcial: só plano acessível | parcial: só plano acessível | parcial: só plano acessível |  |
| POST /chat/plano/:planoId/mensagem | nenhuma | ChatPlanoService.enviarMensagem -> planoService.recuperar (chat-plano.service.ts:99) | parcial: só plano acessível | parcial: só plano acessível | parcial: só plano acessível | parcial: só plano acessível |  |
| GET /chat/hoje | nenhuma | ChatService.recuperarHoje (chat.service.ts:126-129), filtra por usuarioAtivo.sub | parcial: só a própria conversa | parcial: só a própria conversa | parcial: só a própria conversa | parcial: só a própria conversa | sim |
| GET /chat/conversas | nenhuma | ChatService.listarConversas (chat.service.ts:134-135) | parcial: só as próprias | parcial: só as próprias | parcial: só as próprias | parcial: só as próprias | sim |
| GET /chat/conversa/:data | nenhuma | ChatService.recuperarConversa (chat.service.ts:153-155), conversaId = usuarioAtivo.sub + data | parcial: só a própria | parcial: só a própria | parcial: só a própria | parcial: só a própria | sim |
| PUT /chat/conversa/:data/titulo | nenhuma | ChatService.alterarTituloConversa (chat.service.ts:164-173) | parcial: só a própria | parcial: só a própria | parcial: só a própria | parcial: só a própria | sim |
| GET /chat/busca | nenhuma | ChatService.buscar (chat.service.ts:181-183), usuarioId = usuarioAtivo.sub | parcial: só nas próprias conversas | parcial: só nas próprias conversas | parcial: só nas próprias conversas | parcial: só nas próprias conversas | sim |
| GET /proposta-ia/:id | nenhuma | PropostaIaService.obterDoUsuario (proposta-ia.service.ts:322-328) | parcial: só a própria, ou trecho de plano acessível; alheia dá 403 | parcial: só a própria, ou trecho de plano acessível | parcial: só a própria, ou trecho de plano acessível | parcial: só a própria, ou trecho de plano acessível | sim |
| POST /proposta-ia/:id/confirmar | nenhuma | confirmar (:107) -> obterDoUsuario (:322) + resolver (:272); a permissão da ação é da service de domínio chamada pelo executor | parcial: só a própria; a ação segue a permissão do tipo atual | parcial: só a própria; a ação segue a permissão do tipo atual | parcial: só a própria; a ação segue a permissão do tipo atual | parcial: só a própria; a ação segue a permissão do tipo atual | sim |
| POST /proposta-ia/:id/ajustar | nenhuma | ajustar (:113) -> obterDoUsuario + resolver (:272-303) | parcial: só a própria ou trecho de plano acessível | parcial: só a própria ou trecho de plano acessível | parcial: idem; ajuste que falha regrava a proposta alheia do plano | parcial: idem; ajuste que falha regrava a proposta alheia do plano | **não** |
| POST /proposta-ia/:id/recusar | nenhuma | recusar (:139-148) -> obterDoUsuario; sem executor | parcial: só a própria ou trecho de plano acessível | parcial: só a própria ou trecho de plano acessível | parcial: idem; expira proposta alheia em aba que não edita | parcial: idem; expira proposta alheia em aba que não edita | **não** |
| POST /proposta-ia/:id/desfazer | nenhuma | desfazer (:152-179) -> obterDoUsuario + executor.desfazer | parcial: só a própria, até 30 minutos | parcial: só a própria, até 30 minutos | parcial: idem; desfazer CRIAR_DEMANDA exclui a demanda | parcial: idem; desfazer CRIAR_DEMANDA exclui a demanda |  |
| POST /proposta-ia/grupo/confirmar | nenhuma | confirmarGrupo (:187) -> recuperarDoGrupo (:234) -> obterDoUsuario, depois confirmar de cada uma | parcial: só as próprias | parcial: só as próprias | parcial: só as próprias | parcial: só as próprias | sim |
| POST /proposta-ia/grupo/recusar | nenhuma | recusarGrupo (:204) -> recuperarDoGrupo -> recusar | parcial: só as próprias ou trecho de plano acessível | parcial: só as próprias ou trecho de plano acessível | parcial: idem; mesma lacuna de recusar | parcial: idem; mesma lacuna de recusar | **não** |
| POST /proposta-ia/grupo/desfazer | nenhuma | desfazerGrupo (:217) -> recuperarDoGrupo -> desfazer | parcial: só as próprias | parcial: só as próprias | parcial: só as próprias | parcial: só as próprias |  |
| POST /assistente/auxiliar-descricao | @UseGuards(JwtAuthGuard) no controller (repete o global) | nenhuma (AssistenteService.auxiliarDescricao, assistente.service.ts:49, não recebe usuário) | sim | sim | sim | sim |  |
| POST /assistente/alterar-trecho | @UseGuards(JwtAuthGuard) no controller | DemandaService.recuperarDemandaParaEditar (demanda.service.ts:443), chamada em assistente.service.ts:93 | sim | sim | parcial: qualquer demanda, menos a aba DESCRICAO_CLIENTE (403) | parcial: só demanda em que é membro, menos DESCRICAO_CLIENTE; 404 sem acesso ao projeto | sim |
| IA: propor_criar_atividade | permissao QUALQUER (ferramenta-ia.registro.ts:66) | nenhuma sobre a demanda na ferramenta (propor-criar-atividade.ferramenta.ts:40); AtividadeService.criar:58-64 só ao confirmar | sim | sim | parcial: só para si | parcial: só para si; propõe em demanda sem acesso e recebe o caminho dela | **não** |
| IA: propor_mover_atividade | permissao QUALQUER | dono ou tipo em propor-mover-atividade.ferramenta.ts:38; destino lido sem acesso (:45); AtividadeService:260-264 ao confirmar | sim | sim | sim | parcial: só atividade própria; nome e status do destino sem acesso vazam | **não** |
| IA: propor_criar_demanda | permissao QUALQUER | propor-criar-demanda.ferramenta.ts:47 e :54; DemandaService.criar:80 e :119 | sim | sim | sim | parcial: só sub-demanda em projeto acessível | sim |
| IA: propor_conectar_demanda / propor_desconectar_demanda | permissao AUXILIAR | DemandaService.criarConexao / excluirConexao com o usuário (conectar-demanda.executor.ts:38, desconectar-demanda.executor.ts:44) | sim | sim | sim | nao | sim |
| IA: consultar_demanda / consultar_grafo_do_projeto | permissao AUXILIAR | DemandaService.recuperar / recuperarGrafo com o usuário (consultar-demanda.ferramenta.ts:39; consultar-grafo-do-projeto.ferramenta.ts:29) | sim | sim | sim | nao |  |
| IA: listar / consultar / buscar conversas do desenvolvedor | permissao GESTOR | ChatDesenvolvedorService.validarAcesso (chat-desenvolvedor.service.ts:96-102) | parcial: só conversa de desenvolvedor ou auxiliar | parcial: só conversa de desenvolvedor ou auxiliar | nao | nao | sim |
| IA: propor_justificar_ponto | permissao GESTOR | JustificarPontoExecutor.exigirGestor (justificar-ponto.executor.ts:60-62) | parcial: só o ponto de outra pessoa | parcial: só o ponto de outra pessoa | nao | nao | sim |
| IA: propor_registrar_execucao | permissao AUXILIAR | RegistrarExecucaoExecutor.exigirGestor -> podeEditarExecucaoDeOutro (registrar-execucao.executor.ts:44-46) | sim | sim | sim | nao | sim |
| IA: propor_criar_projeto | permissao GESTOR | CriarProjetoExecutor.exigirGestor (criar-projeto.executor.ts:55-57) | sim | sim | nao | nao | sim |
| IA: listar_usuarios | permissao AUXILIAR | nenhuma na ferramenta (usuarioService.listar sem usuário, listar-usuarios.ferramenta.ts:30); igual a GET /usuario com @ExigePermissao(temVisibilidadeTotal) | sim | sim | sim | nao | sim |

### PF-mensagem-direta

| Rota | Trava na rota | Verificação na service | Adm | Gestor | Aux | Dev | Conforme |
|---|---|---|---|---|---|---|---|
| GET /mensagem-direta/conversas | nenhuma | MensagemDiretaService.listarConversas:267-270 (usuarioId do token) | sim | sim | sim | sim | sim |
| GET /mensagem-direta/pessoas | nenhuma | nenhuma (MensagemDiretaService.listarPessoas:307-313 lista todos os ativos, menos quem pergunta) | sim | sim | sim | sim | sim |
| GET /mensagem-direta/referencias | nenhuma | MensagemDiretaService.buscarReferencias:319 (temVisibilidadeTotal) | sim | sim | sim | parcial: demandas de projeto em que tem vínculo; atividades só de demanda em que é membro | sim |
| GET /mensagem-direta/referencia/:tipo/:id | nenhuma | resolverReferenciaDireta:30-38 (mensagem-direta-referencia.ts), via recuperarReferencia:337 | sim | sim | sim | parcial: sem acesso devolve acessivel=false sem dados | sim |
| GET /mensagem-direta/supervisao/conversas | @GestorOnly | MensagemDiretaSupervisaoService.validarGestor:58 (def. 172-174) | parcial: só conversas sem gestor/administrador; recebe o texto da última mensagem sem auditoria | parcial: só conversas sem gestor/administrador; recebe o texto da última mensagem sem auditoria | nao | nao |  |
| GET /mensagem-direta/supervisao/conversa/:conversaId | @GestorOnly | MensagemDiretaSupervisaoService.lerConversaSupervisionada:89 (validarGestor), 94 (conversa própria), 100 (conversaEhSupervisionavel) | parcial: conversa de terceiros sem gestor/administrador; com cursor não audita nem avisa | parcial: conversa de terceiros sem gestor/administrador; com cursor não audita nem avisa | nao | nao | **não** |
| GET /mensagem-direta/conversa/:usuarioId | nenhuma | MensagemDiretaService.listarConversa:249-250 (validarOutraPessoa + conversaId do token) | sim | sim | sim | sim | sim |
| GET /mensagem-direta/conversa/:usuarioId/mensagem/:mensagemId/proposta/:propostaId | nenhuma | MensagemDiretaService.recuperarProposta:238-244 + PropostaIaService.recuperarParaParticipante:312-314 | sim | sim | sim | parcial: só participante; dados se for o dono ou se o executor.podeVer permitir | sim |
| POST /mensagem-direta/mensagem | nenhuma | MensagemDiretaService.enviarMensagem:103 (validarDestinatarioAtivo), 105 (menções), 108 (validarReferencia) | sim | sim | sim | parcial: referências só ao que ele vê | sim |
| PATCH /mensagem-direta/mensagem | nenhuma | MensagemDiretaService.alterarMensagem:150-162 (conversa do token + avaliarEdicaoDeMensagemDireta) | parcial: só a própria mensagem, até 1 hora | parcial: só a própria mensagem, até 1 hora | parcial: só a própria mensagem, até 1 hora | parcial: só a própria mensagem, até 1 hora | sim |
| PUT /mensagem-direta/reacao | nenhuma | MensagemDiretaService.reagirMensagem:201-208 (conversa do token, mensagem de pessoa) | parcial: mensagem de pessoa da própria conversa; só a própria reação | parcial: mensagem de pessoa da própria conversa; só a própria reação | parcial: mensagem de pessoa da própria conversa; só a própria reação | parcial: mensagem de pessoa da própria conversa; só a própria reação | sim |
| PUT /mensagem-direta/conversa/:usuarioId/leitura | nenhuma | MensagemDiretaService.alterarLeitura:366-370 (validarOutraPessoa; marcador do token) | sim | sim | sim | sim | sim |
| POST /mensagem-direta/conversa/:usuarioId/digitando | nenhuma | MensagemDiretaService.avisarDigitacao:391-393 (validarOutraPessoa; evento só ao outro) | sim | sim | sim | sim | sim |
| PUT /mensagem-direta/conversa/:usuarioId/silencio | nenhuma | MensagemDiretaService.alterarSilencio:403-406 (validarOutraPessoa; marcador do token) | sim | sim | sim | sim | sim |
| GET /mensagem-direta/busca | nenhuma | MensagemDiretaService.buscar:346-349 (usuarioId do token + grupos de que é membro) | sim | sim | sim | sim | sim |
| GET /mensagem-direta/preferencia | nenhuma | MensagemDiretaService.recuperarPreferencia:423 (usuarioId do token) | sim | sim | sim | sim | sim |
| PUT /mensagem-direta/preferencia | nenhuma | MensagemDiretaService.alterarPreferencia:445-446 (usuarioId do token) | sim | sim | sim | sim | sim |
| GET /mensagem-direta/eventos | nenhuma | MensagemDiretaEventosService.abrir:72-83 (stream do token); aoReceber:104-105 (entrega por usuarioIds); emitirMudancasDePresenca:156 (presença a todos) | sim | sim | sim | sim | sim |

### PG-grupos-canais

| Rota | Trava na rota | Verificação na service | Adm | Gestor | Aux | Dev | Conforme |
|---|---|---|---|---|---|---|---|
| GET /mensagem-direta/supervisao/grupos | @GestorOnly | GrupoSupervisaoService.listarGruposSupervisionados:58 (validarGestor:180) | sim | sim | nao | nao | **não** |
| GET /mensagem-direta/supervisao/grupo/:grupoId | @GestorOnly | GrupoSupervisaoService.lerGrupoSupervisionado:106, :116, :121; auditoria só sem cursor :128 | parcial: não sendo membro; grupo livre sem gestor/adm entre os membros atuais, ou qualquer canal | parcial: não sendo membro; grupo livre sem gestor/adm entre os membros atuais, ou qualquer canal | nao | nao | **não** |
| GET /mensagem-direta/canal/demanda/:demandaId | nenhuma | CanalAcessoService.validarAcessoAoAlvo:121-130 (via GrupoService.recuperarCanal:181) | sim | sim | parcial: só com linha em demanda_usuario na própria demanda | parcial: só com linha em demanda_usuario na própria demanda | **não** |
| GET /mensagem-direta/canal/projeto/:projetoId | nenhuma | CanalAcessoService.validarAcessoAoAlvo:132-137 | sim | sim | parcial: só com alguma demanda do projeto em demanda_usuario | parcial: só com alguma demanda do projeto em demanda_usuario | **não** |
| POST /mensagem-direta/canal/demanda/:demandaId | nenhuma | CanalAcessoService.validarAcessoAoAlvo:121-130 (via GrupoService.criarCanal:195) | sim | sim | parcial: só com linha em demanda_usuario na própria demanda | parcial: só com linha em demanda_usuario na própria demanda | **não** |
| POST /mensagem-direta/canal/projeto/:projetoId | nenhuma | CanalAcessoService.validarAcessoAoAlvo:132-137 (via GrupoService.criarCanal:195) | sim | sim | parcial: só com alguma demanda do projeto em demanda_usuario | parcial: só com alguma demanda do projeto em demanda_usuario | **não** |
| POST /mensagem-direta/grupo | nenhuma | GrupoService.criarGrupo:134 (sem checagem de tipo; validarPessoasAtivas:140) | sim | sim | sim | sim |  |
| GET /mensagem-direta/grupo/:grupoId | nenhuma | GrupoService.recuperarGrupo:171 (exigirAcessoDeLeitura:687) | parcial: membro, ou qualquer canal por tipo (sem auditoria) | parcial: membro, ou qualquer canal por tipo (sem auditoria) | parcial: membro (no canal, por demanda_usuario) | parcial: membro (no canal, por demanda_usuario) | **não** |
| PATCH /mensagem-direta/grupo/:grupoId | nenhuma | GrupoService.alterarGrupo:240 (exigirMembro) e :241 (recusarEmCanal) | parcial: membro de grupo livre | parcial: membro de grupo livre | parcial: membro de grupo livre | parcial: membro de grupo livre |  |
| POST /mensagem-direta/grupo/:grupoId/membros | nenhuma | GrupoService.adicionarMembros:264, :265 e :270 | parcial: membro de grupo livre; adiciona qualquer pessoa ativa | parcial: membro de grupo livre; adiciona qualquer pessoa ativa | parcial: membro de grupo livre; adiciona qualquer pessoa ativa | parcial: membro de grupo livre; adiciona qualquer pessoa ativa |  |
| DELETE /mensagem-direta/grupo/:grupoId/membro | nenhuma | GrupoService.sairDoGrupo:301 e :302; só o próprio :303 | parcial: membro de grupo livre; só a si mesmo | parcial: membro de grupo livre; só a si mesmo | parcial: membro de grupo livre; só a si mesmo | parcial: membro de grupo livre; só a si mesmo |  |
| GET /mensagem-direta/grupo/:grupoId/mensagens | nenhuma | GrupoService.listarMensagens:369; leitor por tipo vai à supervisão :371-372 | parcial: membro, ou canal por tipo (auditado só sem cursor) | parcial: membro, ou canal por tipo (auditado só sem cursor) | parcial: membro | parcial: membro | **não** |
| POST /mensagem-direta/grupo/:grupoId/mensagem | nenhuma | GrupoService.enviarMensagem:325-327; entrarNoCanal:338 | parcial: membro; em canal escreve por tipo e vira membro | parcial: membro; em canal escreve por tipo e vira membro | parcial: membro | parcial: membro |  |
| PATCH /mensagem-direta/grupo/:grupoId/mensagem | nenhuma | GrupoService.alterarMensagem:392; autor e prazo :397-403 | parcial: membro e autor, até 1 hora | parcial: membro e autor, até 1 hora | parcial: membro e autor, até 1 hora | parcial: membro e autor, até 1 hora |  |
| PUT /mensagem-direta/grupo/:grupoId/reacao | nenhuma | GrupoService.reagirMensagem:437; mensagem do grupo :442-444 | parcial: membro | parcial: membro | parcial: membro | parcial: membro |  |
| GET /mensagem-direta/grupo/:grupoId/mensagem/:mensagemId/proposta/:propostaId | nenhuma | GrupoService.recuperarProposta:466-470; PropostaIaService.recuperarParaParticipante:310-318 | parcial: membro ou leitor de canal; vê os dados por visão total | parcial: membro ou leitor de canal; vê os dados por visão total | parcial: membro; vê os dados por visão total | parcial: membro; dados só se for o dono ou o executor disser que vê o alvo |  |
| PUT /mensagem-direta/grupo/:grupoId/leitura | nenhuma | GrupoService.alterarLeitura:480; leitor por tipo não grava :482 | parcial: membro (leitor por tipo recebe 200 sem gravar) | parcial: membro (leitor por tipo recebe 200 sem gravar) | parcial: membro | parcial: membro |  |
| PUT /mensagem-direta/grupo/:grupoId/silencio | nenhuma | GrupoService.alterarSilencio:504 | parcial: membro | parcial: membro | parcial: membro | parcial: membro |  |
| GET /mensagem-direta/grupo/:grupoId/resumo | nenhuma | GrupoResumoIaService.recuperarOpcoes:95 (exigirMembroDoGrupo) | parcial: membro | parcial: membro | parcial: membro | parcial: membro |  |
| POST /mensagem-direta/grupo/:grupoId/resumo/estimativa | nenhuma | GrupoResumoIaService.estimar:111 | parcial: membro | parcial: membro | parcial: membro | parcial: membro |  |
| POST /mensagem-direta/grupo/:grupoId/resumo | nenhuma | GrupoResumoIaService.resumir:124 | parcial: membro | parcial: membro | parcial: membro | parcial: membro |  |
| POST /mensagem-direta/grupo/:grupoId/resumo/:resumoId/proposta | nenhuma | GrupoResumoIaService.criarProposta:209-218; dono do resumo :272 | parcial: membro do canal e autor do resumo | parcial: membro do canal e autor do resumo | parcial: membro do canal e autor do resumo; qualquer demanda do alvo | parcial: membro do canal, autor do resumo e membro da demanda de destino | sim |
| POST /mensagem-direta/grupo/:grupoId/resumo/:resumoId/proposta/:propostaId/confirmar | nenhuma | GrupoResumoIaService.confirmarProposta:229-234; exigirPropostaDoResumo:276; PropostaIaService.obterDoUsuario:322 | parcial: membro e autor do resumo | parcial: membro e autor do resumo | parcial: membro e autor do resumo | parcial: membro e autor do resumo; a demanda revalida a edição |  |
| POST /mensagem-direta/grupo/:grupoId/resumo/:resumoId/proposta/:propostaId/recusar | nenhuma | GrupoResumoIaService.recusarProposta:244-246 | parcial: membro e autor do resumo | parcial: membro e autor do resumo | parcial: membro e autor do resumo | parcial: membro e autor do resumo |  |
| GET /mensagem-direta/grupo/:grupoId/fixadas | nenhuma | GrupoFixadaService.listarFixadas:77 (exigirAcessoAoGrupo) | parcial: membro, ou canal por tipo (sem auditoria) | parcial: membro, ou canal por tipo (sem auditoria) | parcial: membro | parcial: membro | **não** |
| POST /mensagem-direta/grupo/:grupoId/fixadas/:mensagemId | nenhuma | GrupoFixadaService.fixarMensagem:42; mensagem do grupo :44-46 | parcial: membro | parcial: membro | parcial: membro | parcial: membro |  |
| DELETE /mensagem-direta/grupo/:grupoId/fixadas/:mensagemId | nenhuma | GrupoFixadaService.desafixarMensagem:68 | parcial: membro (desafixa a de qualquer pessoa) | parcial: membro (desafixa a de qualquer pessoa) | parcial: membro (desafixa a de qualquer pessoa) | parcial: membro (desafixa a de qualquer pessoa) |  |
| GET /mensagem-direta/grupo/:grupoId/busca | nenhuma | GrupoFixadaService.buscarNoGrupo:91 | parcial: membro | parcial: membro | parcial: membro | parcial: membro |  |
| POST /mensagem-direta/grupo/:grupoId/digitando | nenhuma | GrupoService.avisarDigitacao:515 | parcial: membro (leitor por tipo recebe 200 sem publicar) | parcial: membro (leitor por tipo recebe 200 sem publicar) | parcial: membro | parcial: membro |  |

### PH-frontend-permissoes

| Rota | Trava na rota | Verificação na service | Adm | Gestor | Aux | Dev | Conforme |
|---|---|---|---|---|---|---|---|
| /autenticacao | somentePublicoGuard (com token redireciona para /) | menu: sem item (tela pública) | sim (sem token) | sim (sem token) | sim (sem token) | sim (sem token) | sim |
| / (redireciona para /ponto) | autenticacaoGuard (só existência de access_token) | menu: sem item | sim | sim | sim | sim | **não** |
| /ponto | nenhum (só o autenticacaoGuard do layout) | menu: todos | sim | sim | parcial: vê o ponto de todos; não justifica e só imprime o próprio | parcial: só o próprio | sim |
| /atividade | nenhum | menu: todos | sim (mais 'Alterar prioridades') | sim (ação em massa, criar para outro) | parcial: vê todas, edita e exclui as dos outros; sem ação em massa e sem criar para outro | parcial: só as próprias | sim |
| /atividade/:id | nenhum | menu: sem item | sim | sim | sim ('Registrar tempo' incluído) | parcial: só a própria; sem 'Registrar tempo' |  |
| /execucao | nenhum | menu: todos | sim (não inicia pelo histórico) | sim (não inicia pelo histórico; descrição do 'Agora' pelo tipo errado) | sim (edita e exclui de todos, inicia as próprias) | parcial: só as próprias e sem edição, embora o PUT /execucao/:id aceite a própria | **não** |
| /documentacao | nenhum | menu: todos | sim | sim | sim | sim |  |
| /projeto | nenhum | menu: gestor, administrador e auxiliar (somenteGestor + visivelAoAuxiliar) | sim | sim | parcial: vê todos; sem criar ou editar projeto nem visão Volume | parcial: sem item no menu, mas a URL abre e GET /projeto devolve os dele | **não** |
| /projeto/:id | nenhum | menu: sem item | sim | sim | parcial: cria demanda; sem editar projeto, relatório e volume; GET do canal responde 403 | parcial: projetos acessíveis; id sem acesso dá 404 e 403 (já medido) | **não** |
| /projeto/:id/relatorio | gestorGuard | menu: sem item (botão 'Relatório' só com eGestor) | sim | sim | nao | nao | sim |
| /demanda | nenhum | menu: todos | sim | sim | parcial: edita tudo; sem excluir demanda e sem descricaoCliente | parcial: projetos acessíveis; 'Tags' aparece em demanda de que não é membro e ?projetoId não é conferido | **não** |
| /calendario | gestorGuard | menu: gestor e administrador | sim | sim | nao | nao (o GET /calendario do backend é aberto) | sim |
| /tag | permissaoGuard(podeGerenciarTag) | menu: gestor, administrador e auxiliar (flags, não a função do guard) | sim | sim | sim | nao | sim |
| /usuario | gestorGuard | menu: gestor e administrador | sim | parcial: não gerencia administradores | nao | nao | sim |
| /usuario/:id/anotacoes | nenhum (a página só redireciona) | menu: sem item (deep link) | parcial: vai a /usuario?anotacoes=id sem conferir o dono | parcial: vai a /usuario?anotacoes=id sem conferir o dono | parcial: só o próprio (vai a /ponto?anotacoes=id) | parcial: só o próprio (vai a /ponto?anotacoes=id) | **não** |
| /relatorio | gestorGuard | menu: sem item (botão 'Relatório' de /execucao só com eGestor) | sim | sim | nao | nao | sim |
| /chat | nenhum | menu: todos (selo quando a IA não está no ar) | sim | sim | sim | sim |  |
| /supervisao-chat | gestorGuard | menu: gestor e administrador | sim | sim | nao | nao | sim |
| /configuracao-ia | administradorGuard (mais canDeactivate do rascunho) | menu: só administrador | sim | nao | nao | nao | sim |
| /modelagem | nenhum | menu: todos (fundo da barra) | sim | sim | parcial: só leitura | parcial: só leitura | sim |
| /checkin | autenticacaoGuard | menu: sem item (janela do Project Desktop) | sim | sim | sim | sim |  |
| /chat-popup | autenticacaoGuard | menu: sem item (janela do Project Desktop) | sim | sim | sim | sim |  |

### PP-plano

| Rota | Trava na rota | Verificação na service | Adm | Gestor | Aux | Dev | Conforme |
|---|---|---|---|---|---|---|---|
| POST /plano | nenhuma (só JwtAuthGuard) | PlanoService.criar:53 (validarAcessoAoProjeto:265; recuperarDemandaEditavel:253) | sim | sim | sim | parcial: privado sempre; de projeto só com demanda_usuario no projeto; com demandaId só se membro da demanda | sim |
| GET /plano | nenhuma (só JwtAuthGuard) | PlanoService.listar:83 (SQL em PlanoRepository.listar:178-182) | parcial: planos de projeto não solo + os próprios privados e solo | parcial: planos de projeto não solo + os próprios privados e solo | parcial: planos de projeto não solo + os próprios privados e solo | parcial: de projeto com demanda_usuario e não solo + os próprios privados e solo (solo próprio mesmo sem acesso ao projeto) | **não** |
| GET /plano/demanda/:demandaId | nenhuma (só JwtAuthGuard) | PlanoPublicacaoService.recuperarOrigem:89 (PlanoService.podeAcessar:236) | parcial: só plano que acessa; senão dados null | parcial: só plano que acessa; senão dados null | parcial: só plano que acessa; senão dados null | parcial: só plano que acessa; senão dados null | sim |
| GET /plano/:id | nenhuma (só JwtAuthGuard) | PlanoService.recuperar:95 (recuperarPlanoAcessivel:229) | parcial: plano de projeto não solo; privado e solo só se criador | parcial: plano de projeto não solo; privado e solo só se criador | parcial: plano de projeto não solo; privado e solo só se criador | parcial: projeto com demanda_usuario e não solo; privado e solo próprios (solo próprio mesmo sem acesso ao projeto) | **não** |
| PUT /plano/:id | nenhuma (só JwtAuthGuard) | PlanoService.alterar:105 (acesso :106; aba do cliente :108) | parcial: plano que acessa | parcial: plano que acessa | parcial: plano que acessa, sem descricaoCliente | parcial: plano que acessa, sem descricaoCliente | sim |
| PATCH /plano/:id/solo | nenhuma (só JwtAuthGuard) | PlanoService.marcarSolo:127 (criador :129) | parcial: só o criador | parcial: só o criador | parcial: só o criador | parcial: só o criador |  |
| PATCH /plano/:id/arquivo | nenhuma (só JwtAuthGuard) | PlanoService.arquivar:138 (validarPodeArquivarOuExcluir:275) | parcial: plano que acessa (solo ou privado alheio: 404) | parcial: plano que acessa (solo ou privado alheio: 404) | parcial: só plano que criou (alheio: 403) | parcial: só plano que criou (alheio: 403) |  |
| PUT /plano/:id/demanda | nenhuma (só JwtAuthGuard) | PlanoService.ligarDemanda:159 (recuperarDemandaEditavel:253) | parcial: plano que acessa, com projeto; demanda do mesmo projeto | parcial: plano que acessa, com projeto; demanda do mesmo projeto | parcial: plano que acessa, com projeto; demanda do mesmo projeto | parcial: plano que acessa e membro da demanda nova | sim |
| PATCH /plano/:id/projeto | nenhuma (só JwtAuthGuard) | PlanoService.atribuirProjeto:174 (criador :179; validarAcessoAoProjeto :186) | parcial: só o criador do plano privado | parcial: só o criador do plano privado | parcial: só o criador do plano privado | parcial: criador e com demanda_usuario no projeto |  |
| POST /plano/:id/publicacao | nenhuma (só JwtAuthGuard) | PlanoPublicacaoService.publicar:48 (aba do cliente :51; DemandaService.alterar :74) | parcial: plano que acessa | parcial: plano que acessa | parcial: plano que acessa, sem a aba DESCRICAO_CLIENTE | parcial: membro da demanda ligada, sem a aba DESCRICAO_CLIENTE | sim |
| GET /plano/:id/ponto | nenhuma (só JwtAuthGuard) | PlanoPontoService.listar:39 (acesso :40) | parcial: plano que acessa | parcial: plano que acessa | parcial: plano que acessa | parcial: plano que acessa | sim |
| POST /plano/:id/ponto | nenhuma (só JwtAuthGuard) | PlanoPontoService.criar:29 (acesso :30) | parcial: plano que acessa | parcial: plano que acessa | parcial: plano que acessa | parcial: plano que acessa | sim |
| PATCH /plano/:id/ponto/:pontoId/situacao | nenhuma (só JwtAuthGuard) | PlanoPontoService.alterarSituacao:44 (acesso :45; ponto do plano :46) | parcial: plano que acessa | parcial: plano que acessa | parcial: plano que acessa | parcial: plano que acessa | sim |
| GET /plano/:id/fonte | nenhuma (só JwtAuthGuard) | PlanoFonteService.listar:46 (acesso :47) | parcial: plano que acessa | parcial: plano que acessa | parcial: plano que acessa | parcial: plano que acessa |  |
| POST /plano/:id/fonte | nenhuma (só JwtAuthGuard) | PlanoFonteService.criar:33 (acesso :34; autor do token :42) | parcial: plano que acessa | parcial: plano que acessa | parcial: plano que acessa | parcial: plano que acessa |  |
| GET /plano/:id/fonte/:fonteId | nenhuma (só JwtAuthGuard) | PlanoFonteService.recuperar:57 (acesso :58) | parcial: plano que acessa | parcial: plano que acessa | parcial: plano que acessa | parcial: plano que acessa |  |
| DELETE /plano/:id/fonte/:fonteId | nenhuma (só JwtAuthGuard) | PlanoFonteService.excluir:64 (acesso :65; não confere quem trouxe) | parcial: plano que acessa, fonte de qualquer pessoa | parcial: plano que acessa, fonte de qualquer pessoa | parcial: plano que acessa, fonte de qualquer pessoa | parcial: plano que acessa, fonte de qualquer pessoa |  |
| DELETE /plano/:id | nenhuma (só JwtAuthGuard) | PlanoService.excluir:147 (validarPodeArquivarOuExcluir:275) | parcial: plano que acessa (solo ou privado alheio: 404) | parcial: plano que acessa (solo ou privado alheio: 404) | parcial: só plano que criou (alheio: 403) | parcial: só plano que criou (alheio: 403) |  |
| GET /chat/plano/:planoId | nenhuma (JwtAuthGuard global) | ChatPlanoService.recuperarConversa:85 (PlanoService.recuperar :86) | parcial: plano que acessa; lê as mensagens de todos | parcial: plano que acessa; lê as mensagens de todos | parcial: plano que acessa; lê as mensagens de todos | parcial: plano que acessa; lê as mensagens de todos, inclusive respostas da IA a quem tem visão total | sim |
| POST /chat/plano/:planoId/mensagem | nenhuma (JwtAuthGuard global) | ChatPlanoService.enviarMensagem:98 (PlanoService.recuperar :99) | parcial: plano que acessa | parcial: plano que acessa | parcial: plano que acessa; IA não escreve na aba do cliente | parcial: plano que acessa; IA não escreve na aba do cliente | sim |

### PT-ia-config-prompt-custo-modelagem-desktop

| Rota | Trava na rota | Verificação na service | Adm | Gestor | Aux | Dev | Conforme |
|---|---|---|---|---|---|---|---|
| GET /ia/estado | @AdministradorOnly (método) | nenhuma (IaService.recuperarEstadoCompleto:95) | sim | nao | nao | nao | sim |
| GET /ia/modelos | @AdministradorOnly (método) | nenhuma (IaService.listarModelos:106) | sim | nao | nao | nao | sim |
| GET /ia/disponibilidade | nenhuma (JwtAuthGuard global) | nenhuma (IaService.recuperarEstado:90) | sim | sim | sim | sim | sim |
| GET /configuracao-ia | @AdministradorOnly (classe) | ConfiguracaoIaService.validarAdministrador:58 | sim | nao | nao | nao | sim |
| GET /configuracao-ia/versoes | @AdministradorOnly (classe) | ConfiguracaoIaService.validarAdministrador:66 | sim | nao | nao | nao | sim |
| POST /configuracao-ia | @AdministradorOnly (classe) | ConfiguracaoIaService.validarAdministrador:84 | sim | nao | nao | nao | sim |
| GET /prompt | @AdministradorOnly (classe) | PromptService.validarAdministrador:52 | sim | nao | nao | nao | sim |
| GET /prompt/:tipo/versoes | @AdministradorOnly (classe) | PromptService.validarAdministrador:61 | sim | nao | nao | nao | sim |
| POST /prompt/:tipo/rascunho | @AdministradorOnly (classe) | PromptService.validarAdministrador:76 | sim | nao | nao | nao | sim |
| POST /prompt/:tipo/testar | @AdministradorOnly (classe) | PromptTesteService.testar:42 | sim | nao | nao | nao | sim |
| POST /prompt/:tipo/rascunho/ativar | @AdministradorOnly (classe) | PromptService.validarAdministrador:84 | sim | nao | nao | nao | sim |
| POST /prompt/:tipo/restaurar-padrao | @AdministradorOnly (classe) | PromptService.validarAdministrador:93 | sim | nao | nao | nao | sim |
| DELETE /prompt/:tipo/rascunho | @AdministradorOnly (classe) | PromptService.validarAdministrador:101 | sim | nao | nao | nao | sim |
| GET /ia-custo | @AdministradorOnly (método) | IaCustoService.validarAdministrador:34 | sim | nao | nao | nao | sim |
| PUT /ia-custo/preco | @AdministradorOnly (método) | IaCustoService.validarAdministrador:68 | sim | nao | nao | nao | sim |
| GET /modelagem | nenhuma (JwtAuthGuard global) | nenhuma (ModelagemService.obterDiagrama:51) | sim | sim | sim | sim | sim |
| POST /modelagem/grupo | @GestorOnly (método) | nenhuma (ModelagemService.criarGrupo:56) | sim | sim | nao | nao | sim |
| PUT /modelagem/grupo/:id | @GestorOnly (método) | nenhuma (ModelagemService.alterarGrupo:69) | sim | sim | nao | nao | sim |
| DELETE /modelagem/grupo/:id | @GestorOnly (método) | nenhuma (ModelagemService.excluirGrupo:81) | sim | sim | nao | nao | sim |
| PUT /modelagem/tabela/:nome | @GestorOnly (método) | nenhuma (ModelagemService.alterarTabela:97) | sim | sim | nao | nao | sim |
| DELETE /modelagem/tabela/:nome | @GestorOnly (método) | nenhuma (ModelagemService.removerTabela:118) | sim | sim | nao | nao | sim |
| GET /desktop/versao | nenhuma (JwtAuthGuard global) | nenhuma (DesktopService.recuperarVersao:21) | sim | sim | sim | sim | sim |
| GET /desktop/download | nenhuma (JwtAuthGuard global) | nenhuma (DesktopService.prepararDownload:30) | sim | sim | sim | sim | sim |

