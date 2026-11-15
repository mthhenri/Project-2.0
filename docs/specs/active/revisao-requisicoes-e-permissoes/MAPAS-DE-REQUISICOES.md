# Mapas de requisições

Anexo do [`DOSSIE.md`](DOSSIE.md). Rotas sem o prefixo `/api/v1`. Duas fontes, sempre identificadas:

- **Medido**: tráfego registrado na aplicação rodando (Playwright, `1920×1080`, banco descartável), por perfil.
- **Lido no código**: o que cada fluxo pede segundo a leitura dos services e componentes, com `arquivo:linha` do gatilho.

## 1. Medido: requisições por tela e por perfil

Navegação dentro da SPA (sem recarregar a página), então o número é o que a tela pede, sem a carga da casca. A carga da casca está na primeira linha.

| Passo | Requisições (administrador) | Adm | Gestor | Aux | Dev | Diferenças por perfil |
|---|---|---|---|---|---|---|
| carga-inicial (/) | `GET /usuario/1`<br>`GET /execucao/ativa`<br>`GET /desktop/versao`<br>`GET /ia/disponibilidade`<br>`GET /checkin/situacao`<br>`GET /mensagem-direta/eventos`<br>`GET /mensagem-direta/conversas`<br>`GET /mensagem-direta/preferencia`<br>`GET /usuario?ativo=true&allRows=true`<br>`GET /ponto/todos?data=<hoje>` | 10 | 10 | 10 | 9 | — |
| abrir /ponto | — | 0 | 0 | 0 | 0 | — |
| abrir /atividade | `GET /atividade-prioridade`<br>`GET /usuario?ativo=true&allRows=true`<br>`GET /atividade?status=PLANEJADA&status=PENDENTE&status=DESENVOLVENDO&pagina=1&itensPorPagina=10` | 3 | 3 | 3 | 2 | — |
| abrir /execucao | `GET /usuario?ativo=true&allRows=true`<br>`GET /execucao?data=<hoje>&pagina=1&itensPorPagina=50` | 2 | 2 | 2 | 1 | — |
| abrir /documentacao | `GET /demanda/documentacao`<br>`GET /anotacao?usuarioId=1` | 2 | 2 | 2 | 2 | — |
| abrir /projeto | `GET /projeto?pagina=1&itensPorPagina=100` | 1 | 1 | 1 | 1 | — |
| abrir /demanda | `GET /projeto?allRows=true` | 1 | 1 | 1 | 9 | — |
| abrir /calendario | `GET /calendario` | 1 | 1 | 2 | 1 | auxiliar: redirecionado para `/ponto`<br>desenvolvedor: redirecionado para `/ponto` |
| abrir /tag | `GET /tag` | 1 | 1 | 1 | 0 | desenvolvedor: redirecionado para `/ponto` |
| abrir /usuario | `GET /tipo-usuario-ajuda`<br>`GET /usuario?pagina=1&itensPorPagina=10` | 2 | 2 | 2 | 0 | auxiliar: redirecionado para `/ponto`<br>desenvolvedor: redirecionado para `/ponto` |
| abrir /supervisao-chat | `GET /mensagem-direta/supervisao/conversas?pagina=1&porPagina=20` | 1 | 1 | 0 | 0 | auxiliar: redirecionado para `/ponto`<br>desenvolvedor: redirecionado para `/ponto` |
| abrir /configuracao-ia | `GET /configuracao-ia`<br>`GET /configuracao-ia/versoes?itensPorPagina=50`<br>`GET /ia/estado`<br>`GET /prompt`<br>`GET /prompt/CONVERSA/versoes?itensPorPagina=50`<br>`GET /ia/modelos` | 6 | 2 | 0 | 0 | gestor: redirecionado para `/ponto`<br>auxiliar: redirecionado para `/ponto`<br>desenvolvedor: redirecionado para `/ponto` |
| abrir /modelagem | `GET /modelagem` | 1 | 1 | 1 | 1 | — |
| abrir /chat | `GET /chat/conversas`<br>`GET /plano`<br>`GET /ia/disponibilidade`<br>`GET /chat/hoje`<br>`GET /demanda/executadas?limite=20` | 5 | 5 | 5 | 5 | — |
| abrir /relatorio | `GET /projeto?allRows=true` | 1 | 1 | 2 | 1 | auxiliar: redirecionado para `/ponto`<br>desenvolvedor: redirecionado para `/ponto` |
| demanda: abrir com projeto (/demanda?projetoId=DEMO) | `GET /projeto?allRows=true`<br>`GET /demanda/grafo?projetoId=1`<br>`GET /plano/demanda/7`<br>`GET /demanda/7/detalhe`<br>`GET /demanda/7/arvore`<br>`GET /tag`<br>`GET /usuario?allRows=true`<br>`GET /demanda?projetoId=1&allRows=true`<br>`GET /atividade?demandaId=7&allRows=true`<br>`GET /mensagem-direta/canal/demanda/7` | 10 | 10 | 10 | 8 | auxiliar: `GET /mensagem-direta/canal/demanda/7` → 403 |
| demanda: selecionar "Tela de login" | `GET /plano/demanda/2`<br>`GET /demanda/2/detalhe`<br>`GET /demanda/2/arvore`<br>`GET /atividade?demandaId=2&allRows=true`<br>`GET /mensagem-direta/canal/demanda/2` | 5 | 5 | 5 | 5 | auxiliar: `GET /mensagem-direta/canal/demanda/2` → 403 |
| demanda: selecionar "Recuperação de senha" | `GET /plano/demanda/3`<br>`GET /demanda/3/detalhe`<br>`GET /demanda/3/arvore`<br>`GET /atividade?demandaId=3&allRows=true`<br>`GET /mensagem-direta/canal/demanda/3` | 5 | 5 | 5 | 5 | auxiliar: `GET /mensagem-direta/canal/demanda/3` → 403 |
| demanda: voltar para "Tela de login" | `GET /plano/demanda/2`<br>`GET /demanda/2/detalhe`<br>`GET /demanda/2/arvore`<br>`GET /atividade?demandaId=2&allRows=true`<br>`GET /mensagem-direta/canal/demanda/2` | 5 | 5 | 5 | 5 | auxiliar: `GET /mensagem-direta/canal/demanda/2` → 403 |
| atividade: detalhe /atividade/5 | `GET /execucao/ativa`<br>`GET /atividade/5`<br>`GET /atividade/5/tag`<br>`GET /execucao?atividadeId=5&itensPorPagina=200` | 4 | 4 | 4 | 5 | — |
| projeto: detalhe /projeto/1 | `GET /projeto/1`<br>`GET /demanda/grafo?projetoId=1`<br>`GET /mensagem-direta/canal/projeto/1`<br>`GET /plano/demanda/7`<br>`GET /demanda/7/detalhe`<br>`GET /demanda/7/arvore`<br>`GET /demanda?projetoId=1&allRows=true`<br>`GET /atividade?demandaId=7&allRows=true`<br>`GET /mensagem-direta/canal/demanda/7` | 9 | 9 | 9 | 9 | auxiliar: `GET /mensagem-direta/canal/projeto/1` → 403, `GET /mensagem-direta/canal/demanda/7` → 403 |
| anotacoes do proprio usuario | `GET /anotacao?usuarioId=1`<br>`GET /usuario/1`<br>`GET /usuario?pagina=1&itensPorPagina=10` | 3 | 3 | 3 | 2 | — |
| URL de projeto sem acesso /projeto/2 | `GET /projeto/2`<br>`GET /demanda/grafo?projetoId=2`<br>`GET /mensagem-direta/canal/projeto/2`<br>`GET /plano/demanda/10`<br>`GET /demanda/10/detalhe`<br>`GET /demanda/10/arvore`<br>`GET /demanda?projetoId=2&allRows=true`<br>`GET /atividade?demandaId=10&allRows=true`<br>`GET /mensagem-direta/canal/demanda/10` | 9 | 9 | 9 | 2 | auxiliar: `GET /mensagem-direta/canal/projeto/2` → 403, `GET /mensagem-direta/canal/demanda/10` → 403<br>desenvolvedor: `GET /projeto/2` → 404, `GET /demanda/grafo?projetoId=2` → 403 |
| URL de demanda de projeto sem acesso (/demanda?projetoId=SEGR) | `GET /projeto?allRows=true`<br>`GET /demanda/grafo?projetoId=2`<br>`GET /plano/demanda/10`<br>`GET /demanda/10/detalhe`<br>`GET /demanda/10/arvore`<br>`GET /demanda?projetoId=2&allRows=true`<br>`GET /atividade?demandaId=10&allRows=true`<br>`GET /mensagem-direta/canal/demanda/10` | 8 | 8 | 8 | 2 | auxiliar: `GET /mensagem-direta/canal/demanda/10` → 403<br>desenvolvedor: `GET /demanda/grafo?projetoId=2` → 403 |
| URL de atividade sem acesso | `GET /execucao/ativa`<br>`GET /atividade/8`<br>`GET /atividade/8/tag`<br>`GET /execucao?atividadeId=8&itensPorPagina=200` | 4 | 4 | 4 | 4 | desenvolvedor: `GET /atividade/8` → 403, `GET /atividade/8/tag` → 403 |
| URL de anotacoes de outro usuario | `GET /anotacao?usuarioId=5`<br>`GET /usuario/5`<br>`GET /usuario?pagina=1&itensPorPagina=10` | 3 | 3 | 2 | 1 | — |
| voltar ao /ponto | `GET /usuario?ativo=true&allRows=true`<br>`GET /ponto/todos?data=<hoje>` | 2 | 2 | 0 | 0 | — |
| foco na janela 3x | 3× `GET /execucao/ativa` | 3 | 3 | 3 | 3 | — |
| aba oculta e visivel | 2× `GET /execucao/ativa`<br>`GET /checkin/situacao`<br>`GET /ponto/todos?data=<hoje>` | 4 | 4 | 4 | 4 | — |

Medições pontuais (administrador), descritas no dossiê: repouso de 180 s em `/ponto` sem execução ativa = 3 `GET /ia/disponibilidade` e nada mais; excluir uma demanda = `DELETE /demanda/:id` 200, `GET /demanda/:id` 404, aviso "Não encontrado" e mais 7 leituras; desfazer = `PATCH /demanda/:id/restaurar` 200 e nenhuma leitura (a demanda não volta à tela).

## 2. Lido no código: mapa por fluxo

### PH-frontend-permissoes

| Fluxo | Requisições | Onde no código |
|---|---|---|
| Login | POST /autenticacao/login (sem token, erro tratado pela tela); grava access_token e usuario_sessao no localStorage | frontend/src/app/core/services/autenticacao.service.ts:19-31 |
| Abertura da casca autenticada | GET /usuario/:id uma vez (atualizarSessao); GET /ia/disponibilidade ao abrir e a cada 60 s (sidebar) | frontend/src/app/shared/layout/layout.component.ts:24; frontend/src/app/shared/layout/sidebar/sidebar.component.ts:47-50 |
| Resposta 401 | Nenhuma nova; remove access_token e usuario_sessao e navega para /autenticacao com returnUrl; não limpa os services em memória | frontend/src/app/core/interceptors/error-handler.interceptor.ts:23-28 |
| Resposta 403 | Nenhuma nova; toast 'Acesso não permitido', sem redirecionar e sem reconferir a sessão | frontend/src/app/core/interceptors/error-handler.interceptor.ts:29-31 |
| Logout | Nenhuma; remove o token, limpa UsuarioSessaoService e ExecucaoAtivaService e navega para /autenticacao sem recarregar | frontend/src/app/core/services/autenticacao.service.ts:34-39 |
| Botão de canal em projeto e demanda | GET /mensagem-direta/canal/{projeto\|demanda}/:id a cada alvo, para qualquer tipo; 403 vira o estado SEM_ACESSO, sem toast | frontend/src/app/modules/mensagem-direta/components/mensagem-direta-canal-botao/mensagem-direta-canal-botao.component.ts:48-66 |

### TA-demandas

| Fluxo | Requisições | Onde no código |
|---|---|---|
| abrir /demanda sem projeto | GET /projeto?allRows=true | frontend/src/app/modules/demanda/pages/demanda-projeto/demanda-projeto.page.ts:174-175 (ngOnInit) e 377-381 |
| abrir /demanda com projeto (modo Árvore) — 10 | GET /projeto?allRows=true -> em cascata GET /demanda/grafo?projetoId -> ao abrir a 1ª demanda, paralelas: GET /plano/demanda/:id, GET /demanda/:id/detalhe, GET /demanda/:id/arvore, GET /tag, GET /usuario?allRows=true -> em cascata após o forkJoin, paralelas: GET /demanda?projetoId&allRows=true, GET /atividade?demandaId&allRows=true, GET /mensagem-direta/canal/demanda/:id | demanda-projeto.page.ts:387-393 e 415-420; demanda-arvore-tela.component.ts:171-178 (effect abre a 1ª demanda); demanda-aberta.component.ts:78-84; demanda-detalhe.base.ts:377-418; mensagem-direta-canal-botao.component.ts:47-53 |
| selecionar uma demanda — 5 | paralelas: GET /plano/demanda/:id, GET /demanda/:id/detalhe, GET /demanda/:id/arvore -> em cascata: GET /atividade?demandaId&allRows=true e GET /mensagem-direta/canal/demanda/:id | demanda-arvore-tela.component.ts:231-240 -> demanda-aberta.component.ts:78-84 -> demanda-detalhe.base.ts:377-418 |
| voltar a uma demanda já vista | as mesmas 5 (não há cache por demanda) | demanda-aberta.component.ts:81-83 |
| navegar pelo caminho ou por uma conexão dentro da demanda; "Voltar" interno | ir: as mesmas 5; "Voltar": nenhuma da demanda (estado restaurado) + GET /mensagem-direta/canal/demanda/:id | demanda-detalhe.base.ts:178-183 e 204-218; mensagem-direta-canal-botao.component.ts:47-53 |
| trocar de projeto | GET /demanda/grafo?projetoId (+ GET /demanda/planejamento?projetoId se no Controle de horas) -> carga completa da 1ª demanda, incluindo GET /demanda?projetoId&allRows=true | demanda-projeto.page.ts:176-193 |
| modo Grafo | nenhuma (usa o grafo já carregado); voltar à Árvore recria a coluna: 5 + GET /demanda?projetoId&allRows=true (+ /tag e /usuario se o catálogo de 60 s expirou) | demanda-projeto.page.ts:195-202; demanda-projeto.page.html:168-179 |
| modo Controle de horas | GET /demanda/planejamento?projetoId a cada entrada no modo | demanda-projeto.page.ts:199-201 e 282-287 |
| Controle de horas: status e cartão "Sem estimativa" | PUT /demanda/:id (otimista, sem recarga) | demanda-controle-horas-painel.component.ts:231-245 e 261-277; demanda-projeto.page.ts:314-337 |
| criar demanda (botão ou atalho C) | ao abrir: GET /tag e GET /usuario (catálogo em memória) + GET /demanda?projetoId&estrutural=true&allRows=true -> POST /demanda -> GET /demanda/grafo | demanda-formulario-dialog.component.ts:129-146 e 225-232; demanda-projeto.page.html:242 |
| nova filha pelo menu de contexto | idem -> POST /demanda -> GET /demanda/grafo + GET /demanda/:id da demanda aberta (+ GET /demanda/planejamento no Controle de horas) | demanda-arvore-painel.component.ts:289-300; demanda-projeto.page.ts:302-307 |
| abrir Editar | catálogos (memória) + paralelas: GET /demanda/:id, GET /demanda/:id/tag, GET /demanda/:id/membro -> em cascata GET /demanda?projetoId&estrutural=true&allRows=true | demanda-formulario-dialog.component.ts:129-146, 334-360 e 395-398 |
| salvar edição (botão Editar da demanda aberta) | PUT /demanda/:id -> paralelas: PUT /demanda/:id/tag, POST /demanda/:id/membro por pessoa, DELETE /demanda/:id/membro/:usuarioId por pessoa -> GET /demanda/:id + GET /demanda/grafo + GET /demanda/:id (duplicada) | demanda-formulario-dialog.component.ts:251-309; demanda-detalhe.base.ts:157-161; demanda-projeto.page.ts:302-304 |
| salvar edição pelo menu de contexto | PUT /demanda/:id (+ tags e membros) -> GET /demanda/grafo + GET /demanda/:id da demanda aberta | demanda-arvore-painel.component.ts:284-296; demanda-projeto.page.ts:302-304 |
| renomear inline | PUT /demanda/:id -> GET /demanda/grafo + GET /demanda/:id | demanda-detalhe.base.ts:255-278 |
| status | chip da demanda aberta: PUT /demanda/:id só; bolinha da linha: PUT /demanda/:id -> GET /demanda/:id se for a aberta | demanda-detalhe.base.ts:281-293; demanda-arvore-tela.component.ts:320-331 |
| estimativa e previsão inline | GET /demanda/grafo + GET /demanda/:id disparados antes do PUT /demanda/:id | demanda-metricas.component.ts:94-99; demanda-detalhe.base.ts:296-302 |
| tags | cabeçalho: PUT /demanda/:id/tag só; menu de contexto: GET /tag (memória) -> em cascata GET /demanda/:id/tag -> PUT /demanda/:id/tag | demanda-tags-cabecalho.component.ts:42-45; demanda-arvore-painel.component.ts:306-349 |
| membros | cabeçalho: POST ou DELETE /demanda/:id/membro -> GET /demanda/grafo + GET /demanda/:id; "Participar": POST -> GET /demanda/:id/membro -> idem; diálogo do menu: GET /usuario (memória) + GET /demanda/:id/membro -> um POST/DELETE por pessoa -> GET /demanda/:id/membro | demanda-membros-cabecalho.component.ts:66-117; demanda-arvore-painel.component.ts:369-388; demanda-membro-lista.component.ts:61-104 |
| conexões | criar: POST /demanda/:id/conexao -> GET /demanda/:id/conexao + GET /demanda/grafo + GET /demanda/:id; remover: DELETE /demanda/:id/conexao/:conexaoId -> GET /demanda/grafo + GET /demanda/:id; desfazer: POST -> GET conexao + GET grafo + GET /demanda/:id | demanda-conexao-lista.component.ts:156-229; demanda-aberta.component.html:248 |
| descrição (editor do modo Dividido) | abrir: GET /demanda/:id; salvar: PUT /demanda/:id -> GET /demanda/grafo + GET /demanda/:id; pelo Controle de horas: GET /demanda/:id -> PUT /demanda/:id -> GET /demanda/grafo + GET /demanda/planejamento | demanda-descricao-editor.component.ts:70-123; demanda-arvore-tela.component.ts:258-264; demanda-arvore-painel.component.ts:394-463 |
| excluir | DELETE /demanda/:id -> GET /demanda/grafo + GET /demanda/:id da excluída (404) -> carga completa da 1ª demanda da pasta | demanda-detalhe.base.ts:339-353; demanda-arvore-tela.component.ts:333-336; demanda-projeto.page.ts:302-304 |
| desfazer exclusão | PATCH /demanda/:id/restaurar e mais nada | demanda-detalhe.base.ts:347-351 |
| abas Atividades e Conexões da demanda aberta | nenhuma ao trocar de aba (dados vieram na seleção); iniciar/encerrar execução ou criar atividade: GET /atividade?demandaId&allRows=true | demanda-aberta.component.html:233-251; demanda-detalhe.base.ts:229-232 |
| chat da demanda | "Criar chat": POST /mensagem-direta/canal/demanda/:id; "Abrir chat": nenhuma deste componente | mensagem-direta-canal-botao.component.ts:70-91 |

### TB-atividades-execucoes-ponto

| Fluxo | Requisições | Onde no código |
|---|---|---|
| abrir /atividade | GET /atividade-prioridade (só na 1ª vez da sessão) + GET /usuario?ativo=true&allRows=true (quem tem visão total) + GET /atividade?status=...&pagina=1&itensPorPagina=10 — paralelas (medido: 3) | frontend/src/app/modules/atividade/pages/atividade-listagem/atividade-listagem.page.ts:225-234 |
| /atividade: busca, filtros, paginação | GET /atividade a cada mudança de URL ou de página; busca com debounce de 400 ms, sem cancelar a anterior | frontend/src/app/modules/atividade/pages/atividade-listagem/atividade-listagem.page.ts:236-238, :309-318, :352-360 |
| /atividade: voltar à aba ou foco da janela | GET /atividade + GET /execucao/ativa da topbar (1 a 2×) | frontend/src/app/modules/atividade/pages/atividade-listagem/atividade-listagem.page.ts:266-271 |
| /atividade: prioridade, nome e tags na linha | PUT /atividade/:id (prioridade, nome) ou PUT /atividade/:id/tag, sem recarga; GET /tag na 1ª abertura do popover de tags da visita | frontend/src/app/modules/atividade/pages/atividade-listagem/atividade-listagem.page.ts:424-436, :651-674, :477-501 |
| /atividade: status na linha | PUT /atividade/:id e depois GET /atividade — em cascata | frontend/src/app/modules/atividade/pages/atividade-listagem/atividade-listagem.page.ts:446-464 |
| /atividade: ação em massa (status, tags) | N× PUT /atividade/:id ou N× PUT /atividade/:id/tag paralelas, depois GET /atividade | frontend/src/app/modules/atividade/pages/atividade-listagem/atividade-listagem.page.ts:690-718, :750-764 |
| /atividade: excluir em massa e desfazer | N× DELETE /atividade/:id paralelas, depois GET /atividade; desfazer: N× PATCH /atividade/:id/restaurar paralelas, depois GET /atividade | frontend/src/app/modules/atividade/pages/atividade-listagem/atividade-listagem.page.ts:721-747 |
| /atividade: excluir uma e desfazer | DELETE /atividade/:id (otimista, sem recarga); desfazer: PATCH /atividade/:id/restaurar e depois GET /atividade | frontend/src/app/modules/atividade/pages/atividade-listagem/atividade-listagem.page.ts:771-790 |
| Nova atividade: abrir o diálogo e criar | a cada abertura: demandaService.listarAtribuidas() + GET /tag + GET /usuario?ativo=true&allRows=true (gestor) — paralelas; criar: POST /atividade e depois GET /atividade | frontend/src/app/modules/atividade/components/atividade-formulario/atividade-formulario.component.ts:82-90, :110-124; frontend/src/app/modules/atividade/pages/atividade-listagem/atividade-listagem.page.html:568 |
| /atividade: demanda ao lado da lista | GET /demanda/:id por demanda aberta (trocar de aba não pede); salvar texto: gravação do editor e depois GET /demanda/:id | frontend/src/app/modules/atividade/components/atividade-demanda-painel/atividade-demanda-painel.component.ts:81-84, :96, :124 |
| iniciar execução pelo diálogo da listagem | abrir: GET /execucao?atividadeId=:id&itensPorPagina=200; confirmar: POST /execucao, depois GET /execucao/ativa (interceptor) + GET /atividade | frontend/src/app/modules/atividade/components/execucao-iniciar-dialog/execucao-iniciar-dialog.component.ts:93, :107-108; frontend/src/app/modules/atividade/pages/atividade-listagem/atividade-listagem.page.html:573 |
| encerrar execução pelo diálogo compartilhado (listagem, /execucao, chip) | abrir: GET /execucao?atividadeId=:id&itensPorPagina=200; confirmar: PATCH /execucao/:id/encerrar, depois GET /execucao/ativa (interceptor) + recarga da tela hospedeira (GET /atividade ou GET /execucao) | frontend/src/app/shared/components/execucao-encerrar-dialog/execucao-encerrar-dialog.component.ts:93, :117, :131 |
| registrar execução (tempo retroativo) | POST /execucao/registro, depois GET /atividade (listagem) ou GET /atividade/:id + GET /execucao?atividadeId=:id&itensPorPagina=200 (detalhe) | frontend/src/app/modules/atividade/components/execucao-registro-dialog/execucao-registro-dialog.component.ts:141-149; frontend/src/app/modules/atividade/pages/atividade-listagem/atividade-listagem.page.html:576 |
| abrir /atividade/:id | GET /execucao/ativa + GET /atividade/:id + GET /atividade/:id/tag + GET /tag (catálogo de 60 s) + GET /execucao?atividadeId=:id&itensPorPagina=200 — paralelas (medido: 4, tags em cache) | frontend/src/app/modules/atividade/pages/atividade-detalhe/atividade-detalhe.page.ts:335-343 |
| detalhe: iniciar ou pausar | POST /execucao ou PATCH /execucao/:id/encerrar, depois GET /execucao/ativa (interceptor) + GET /atividade/:id + GET /execucao?atividadeId=:id&itensPorPagina=200 | frontend/src/app/modules/atividade/pages/atividade-detalhe/atividade-detalhe.page.ts:257-280, :314-319, :362-377 |
| detalhe: pausar lá e iniciar aqui | PATCH encerrar, GET /execucao/ativa, POST /execucao, GET /execucao/ativa, GET /atividade/:id + GET /execucao?...&itensPorPagina=200 — em cascata | frontend/src/app/modules/atividade/pages/atividade-detalhe/atividade-detalhe.page.ts:283-303 |
| detalhe: status, prioridade, tags | PUT /atividade/:id ou PUT /atividade/:id/tag, sem recarga | frontend/src/app/modules/atividade/pages/atividade-detalhe/atividade-detalhe.page.ts:195-247 |
| detalhe: voltar à aba | GET /execucao/ativa (página) + GET /execucao/ativa da topbar (1 a 2×) + GET /atividade/:id + GET /execucao?...&itensPorPagina=200 | frontend/src/app/modules/atividade/pages/atividade-detalhe/atividade-detalhe.page.ts:185-191 |
| abrir /execucao | GET /usuario?ativo=true&allRows=true (visão total) + GET /execucao?data=&pagina=1&itensPorPagina=50 — paralelas (medido: 2) | frontend/src/app/modules/execucao/pages/execucao-historico/execucao-historico.page.ts:169-185 |
| /execucao: trocar dia, usuário ou página; voltar à aba ou foco | GET /execucao por mudança de URL (setas sem debounce nem cancelamento) e a cada foco/visibilidade | frontend/src/app/modules/execucao/pages/execucao-historico/execucao-historico.page.ts:213-214, :226-231, :233-266, :298-307 |
| /execucao: editar na célula e excluir | PUT /execucao/:id (início/fim: depois GET /execucao; descrição: sem recarga); DELETE /execucao/:id e depois GET /execucao | frontend/src/app/modules/execucao/pages/execucao-historico/execucao-historico.page.ts:433-456, :511-519 |
| abrir /ponto | GET /usuario?ativo=true&allRows=true (quem vê o ponto dos outros) + GET /ponto/todos?data= ou GET /ponto/mensal — paralelas (medido ao voltar: 2) | frontend/src/app/modules/ponto/pages/ponto/ponto.page.ts:149-152 |
| /ponto: escolher usuário, trocar mês, expandir dia, voltar à aba | GET /ponto/mensal?ano=&mes=[&usuarioId=] por mudança; GET /ponto/diario?data=&usuarioId= uma vez por dia expandido; visibilitychange: GET /ponto/todos ou /ponto/mensal, sem guarda | frontend/src/app/modules/ponto/pages/ponto/ponto.page.ts:155-173, :214-218, :266-285; frontend/src/app/modules/ponto/components/ponto-mes-dia/ponto-mes-dia.component.ts:174-193 |
| /ponto: justificativa (abrir, criar, remover) | abrir: GET /usuario/:id + GET /ponto-justificativa?usuarioId=&ano=&mes= — paralelas; criar/remover: POST /ponto-justificativa ou DELETE /ponto-justificativa/:id, depois GET /ponto-justificativa + GET /ponto/mensal | frontend/src/app/modules/ponto/components/ponto-justificativa-dialog/ponto-justificativa-dialog.component.ts:123-124, :151-171, :188-198; frontend/src/app/modules/ponto/pages/ponto/ponto.page.html:221 |
| /calendario: abrir, criar, alterar, excluir, desfazer | abrir: GET /calendario (medido: 1); criar/alterar: POST /calendario ou PUT /calendario/:id, depois GET /calendario; excluir: DELETE /calendario/:id (otimista); desfazer: PATCH /calendario/:id/restaurar, depois GET /calendario | frontend/src/app/modules/calendario/pages/calendario-listagem/calendario-listagem.page.ts:193-214, :377-390, :415-432, :446-457 |
| execução ativa (global) e pausa pelo chip | GET /execucao/ativa no boot, em cada visibilitychange e window:focus, e após POST /execucao, PATCH /execucao/:id/encerrar e POST /proposta-ia/:id/(confirmar\|desfazer); pausa pelo chip: PATCH encerrar, GET /execucao/ativa e, só em /atividade e /atividade/:id, recarga da tela | frontend/src/app/shared/layout/topbar/topbar.component.ts:118, :142-146; frontend/src/app/core/interceptors/execucao-ativa.interceptor.ts:17-27; frontend/src/app/shared/layout/topbar/chip-execucao-ativa/chip-execucao-ativa.component.ts:51-65 |

### TC-chat-ia-plano

| Fluxo | Requisições | Onde no código |
|---|---|---|
| abrir /chat | GET /chat/conversas ∥ GET /plano (seletor); GET /ia/disponibilidade ∥ GET /chat/hoje (página); GET /demanda/executadas?limite=20 (lista lateral); mais 1 GET /proposta-ia/:id por proposta das mensagens do dia. Todas paralelas. | frontend/src/app/modules/chat/components/seletor/seletor.component.ts:92; frontend/src/app/modules/chat/pages/chat/chat.page.ts:307 e :319-320; frontend/src/app/modules/chat/components/minhas-demandas/minhas-demandas.component.ts:57 |
| abrir /chat com execução rodando (a demanda abre sozinha) | depois de GET /demanda/executadas: GET /demanda/:id → listagem de atividades da demanda com itensPorPagina=100 (em cascata) + carga do pad | frontend/src/app/modules/chat/pages/chat/chat.page.ts:562; frontend/src/app/modules/chat/components/demanda-leitura/demanda-leitura.component.ts:100, :118 e :134 |
| bom dia (conversa de hoje sem resposta da IA, IA no ar) | POST /chat/bom-dia (event-stream) → GET /ia/disponibilidade (forçado, no `fim`) → GET /chat/conversas ∥ GET /plano. Em 409: GET /chat/hoje + GET /ia/disponibilidade + as duas listas. | frontend/src/app/modules/chat/pages/chat/chat.page.ts:248-254 (efeito), :407-411 e :422-445 |
| retomada ("Voltar para a IA") | POST /chat/retomada (event-stream) → GET /ia/disponibilidade (forçado) → GET /chat/conversas ∥ GET /plano | frontend/src/app/modules/chat/pages/chat/chat.page.ts:256-263 (efeito) e :415-418 |
| enviar mensagem em Perguntas | POST /chat/mensagem (event-stream) → [GET /proposta-ia/:id a cada evento `proposta`] → GET /ia/disponibilidade (forçado, no `fim`) → [GET /execucao/ativa se houve ferramenta `propor_*`] → GET /chat/conversas ∥ GET /plano. Recusa 409 antes do fluxo: GET /ia/disponibilidade + as duas listas. | frontend/src/app/modules/chat/pages/chat/chat.page.ts:345-392 e :740-777; frontend/src/app/modules/chat/services/chat.service.ts:68 e :141 |
| enviar mensagem em Planejamento (inclui pedido de alteração de trecho) | POST /chat/plano/:id/mensagem (event-stream) → [GET /plano/:id quando `escrever_no_plano` conclui e o documento não está sujo] → [GET /plano/:id/ponto quando a IA anota ou resolve ponto] → mesma cauda: GET /ia/disponibilidade, GET /chat/conversas ∥ GET /plano | frontend/src/app/modules/chat/pages/chat/chat.page.ts:374, :608-610, :748 e :752 |
| abrir outro dia / voltar para hoje | GET /chat/conversa/:data (+ 1 GET /proposta-ia/:id por proposta); voltar: GET /chat/hoje ∥ GET /ia/disponibilidade (só se a última resposta tem mais de 5 s) | frontend/src/app/modules/chat/pages/chat/chat.page.ts:507-528 e :535-539 |
| seletor: buscar (Enter), limpar e escolher resultado | buscar: GET /chat/busca?texto= ∥ GET /plano?busca=; limpar: GET /chat/conversas ∥ GET /plano; escolher resultado: limpar + GET /chat/conversa/:data | frontend/src/app/modules/chat/components/seletor/seletor.component.ts:140-156, :158-164 e :171-175 |
| seletor: renomear conversa | PUT /chat/conversa/:data/titulo (resposta aplicada em memória, sem recarga) | frontend/src/app/modules/chat/components/seletor/seletor.component.ts:206-230 |
| entrar em Planejamento sem plano aberto | GET /plano → depois, paralelas: GET /chat/plano/:id, GET /plano/:id, GET /plano/:id/ponto, GET /plano/:id/fonte | frontend/src/app/modules/chat/pages/chat/chat.page.ts:546-550, :680-698 e :285-295 |
| escolher um plano no seletor ou abrir /chat?plano=<id> | paralelas: GET /chat/plano/:id, GET /plano/:id, GET /plano/:id/ponto, GET /plano/:id/fonte | frontend/src/app/modules/chat/pages/chat/chat.page.ts:302-303 e :574-579 |
| novo plano | POST /plano → as quatro leituras do plano + GET /chat/conversas ∥ GET /plano | frontend/src/app/modules/chat/pages/chat/chat.page.ts:628-642 |
| gravar documento do plano (botão, manual) | PUT /plano/:id (com `versao`; 409 mostra aviso) → GET /chat/conversas ∥ GET /plano | frontend/src/app/modules/chat/components/plano-documento/plano-documento.component.ts:209-238; frontend/src/app/modules/chat/components/plano-documento/plano-documento.component.html:153 |
| renomear plano, marcar solo, arquivar | PUT /plano/:id \| PATCH /plano/:id/solo \| PATCH /plano/:id/arquivo → GET /chat/conversas ∥ GET /plano | frontend/src/app/modules/chat/components/plano-documento/plano-documento.component.ts:240-269 e :319-331 |
| atribuir projeto ao plano | listagem de projetos com allRows=true (ao abrir o popover, só na primeira vez) → PATCH /plano/:id/projeto → GET /plano/:id + GET /chat/conversas ∥ GET /plano | frontend/src/app/modules/chat/components/plano-cabecalho/plano-cabecalho.component.ts:87-99; frontend/src/app/modules/chat/components/plano-documento/plano-documento.component.ts:271-275 |
| ligar demanda ao plano | listagem de demandas do projeto com allRows=true (a cada clique no chip) → PUT /plano/:id/demanda → GET /plano/:id + GET /chat/conversas ∥ GET /plano | frontend/src/app/modules/chat/components/plano-cabecalho/plano-cabecalho.component.ts:108-121; frontend/src/app/modules/chat/components/plano-documento/plano-documento.component.ts:278-282 |
| excluir plano | DELETE /plano/:id → GET /chat/conversas ∥ GET /plano | frontend/src/app/modules/chat/components/plano-documento/plano-documento.component.ts:306-310; frontend/src/app/modules/chat/pages/chat/chat.page.ts:621-625 |
| pontos em aberto: anotar, resolver/decidir/dispensar, reabrir | POST /plano/:id/ponto → GET /plano/:id/ponto; PATCH /plano/:id/ponto/:pontoId/situacao → GET /plano/:id/ponto | frontend/src/app/modules/chat/components/plano-pontos/plano-pontos.component.ts:102-115 e :145-155 |
| fontes: adicionar (colar ou arquivo), ver, remover | POST /plano/:id/fonte → GET /plano/:id/fonte; ver: GET /plano/:id/fonte/:fonteId (a cada abertura); DELETE /plano/:id/fonte/:fonteId → GET /plano/:id/fonte | frontend/src/app/modules/chat/components/plano-fontes/plano-fontes.component.ts:144-157, :111-120 e :130-142 |
| publicar plano na demanda | abrir o diálogo: GET /demanda/:id ∥ GET /plano/:id/ponto; publicar: POST /plano/:id/publicacao → GET /plano/:id (em 409 também GET /plano/:id) | frontend/src/app/modules/chat/components/plano-publicar-dialog/plano-publicar-dialog.component.ts:90-93, :109-133 e :135-165; frontend/src/app/modules/chat/components/plano-documento/plano-documento.component.ts:291-293 |
| proposta (cartão): confirmar, recusar, desfazer, ajustar | POST /proposta-ia/:id/confirmar\|recusar\|desfazer (resposta aplicada) → GET /execucao/ativa pelo interceptor, só em confirmar e desfazer; ajustar: [listagem de atividades do usuário com allRows=true se DESCREVER_EXECUCAO] → POST /proposta-ia/:id/ajustar; desfazer pelo toast: POST /proposta-ia/:id/desfazer → GET /proposta-ia/:id; erro 409: GET /proposta-ia/:id | frontend/src/app/modules/chat/components/proposta-cartao/proposta-cartao.component.ts:216-225, :271-297, :359-375 e :377-395; frontend/src/app/core/interceptors/execucao-ativa.interceptor.ts:9 |
| propostas em grupo: confirmar todas, recusar todas, desfazer | POST /proposta-ia/grupo/confirmar \| /grupo/recusar \| /grupo/desfazer (uma requisição para o grupo, resultado aplicado por item; sem GET /execucao/ativa) | frontend/src/app/modules/chat/components/proposta-grupo/proposta-grupo.component.ts:161-185 |
| proposta de alterar trecho do plano confirmada ou desfeita | depois da resposta da proposta: GET /plano/:id (se o documento não tem alteração sem gravar) | frontend/src/app/modules/chat/pages/chat/chat.page.ts:213-219; frontend/src/app/modules/chat/components/plano-documento/plano-documento.component.ts:176-179 |
| "Minhas demandas": alterar status, sair da demanda, desfazer | DemandaService.alterar(id, { status }) otimista, sem recarga; DemandaService.removerMembro → desfazer: atribuirMembro → GET /demanda/executadas?limite=20; voltar de uma demanda à lista: GET /demanda/executadas?limite=20 de novo | frontend/src/app/modules/chat/components/minhas-demandas/minhas-demandas.component.ts:106-131; frontend/src/app/modules/chat/pages/chat/chat.page.ts:131 |

### TD-chat-colegas

| Fluxo | Requisições | Onde no código |
|---|---|---|
| carga de qualquer tela, chat fechado | GET /mensagem-direta/eventos (stream por fetch) + GET /mensagem-direta/conversas + GET /mensagem-direta/preferencia — paralelas | frontend/src/app/shared/layout/layout.component.html:11 → mensagem-direta-popup.component.ts:138 → frontend/src/app/modules/mensagem-direta/services/mensagem-direta-estado.service.ts:200-209 |
| abrir ou fechar o popup; voltar à lista | nenhuma (PUT de leitura se havia conversa ou grupo aberto com mensagem nova) | frontend/src/app/modules/mensagem-direta/services/mensagem-direta-estado.service.ts:248-257, 291-299 |
| abrir conversa direta | GET /mensagem-direta/conversa/:usuarioId → PUT /mensagem-direta/conversa/:usuarioId/leitura (em cascata); mais GET /mensagem-direta/referencia/:tipo/:id por referência distinta e um GET por proposta de IA | frontend/src/app/modules/mensagem-direta/services/mensagem-direta-estado.service.ts:331-348, 364, 376, 421 |
| rolar para cima (histórico) | GET /mensagem-direta/conversa/:usuarioId com cursor, ou GET /mensagem-direta/grupo/:id/mensagens com cursor — uma por página | frontend/src/app/modules/mensagem-direta/services/mensagem-direta-estado.service.ts:383-388; mensagem-direta-grupo-estado.service.ts:248-253 |
| abrir grupo | GET /mensagem-direta/grupo/:id/mensagens → GET /mensagem-direta/grupo/:id/fixadas (em cascata) → PUT /mensagem-direta/grupo/:id/leitura | frontend/src/app/modules/mensagem-direta/services/mensagem-direta-estado.service.ts:841-851; mensagem-direta-grupo-estado.service.ts:193, 204, 280 |
| enviar mensagem | POST /mensagem-direta/mensagem (conversa conhecida: sem recarga; conversa nova: até 2× GET /mensagem-direta/conversas). Grupo: POST /mensagem-direta/grupo/:id/mensagem | frontend/src/app/modules/mensagem-direta/services/mensagem-direta-estado.service.ts:650-655, 800-801; mensagem-direta-grupo-estado.service.ts:463-478 |
| evento MENSAGEM do stream | nenhuma; conversa ou grupo desconhecido: GET /mensagem-direta/conversas; conversa à vista: PUT de leitura (um por mensagem recebida) | frontend/src/app/modules/mensagem-direta/services/mensagem-direta-estado.service.ts:735-737, 800-805, 926-927 |
| eventos EDICAO, REACAO, LEITURA, PRESENCA, DIGITANDO, IA_DIGITANDO, BATIMENTO | nenhuma | frontend/src/app/modules/mensagem-direta/services/mensagem-direta-estado.service.ts:718-759, 767-770 |
| evento SINCRONIZAR | GET /mensagem-direta/conversas + (conversa do evento aberta ou conversaId null) GET /mensagem-direta/conversa/:id + GET /mensagem-direta/grupo/:id/mensagens → GET .../fixadas — paralelas, fixadas em cascata | frontend/src/app/modules/mensagem-direta/services/mensagem-direta-estado.service.ts:761-765 |
| reconexão do stream | nova tentativa de GET /mensagem-direta/eventos com espera crescente (0,5–1 s dobrando até 15–30 s); depois da ABERTURA: GET /mensagem-direta/conversas + conversa aberta + grupo aberto e fixadas | frontend/src/app/modules/mensagem-direta/services/mensagem-direta-eventos.service.ts:56-64, 131; mensagem-direta-estado.service.ts:775-779 |
| digitar no compositor | POST /mensagem-direta/conversa/:id/digitando ou POST /mensagem-direta/grupo/:id/digitando, no máximo um a cada 3 s | frontend/src/app/modules/mensagem-direta/components/mensagem-direta-conversa/mensagem-direta-conversa.component.ts:430-433; mensagem-direta-estado.service.ts:962-967; mensagem-direta-grupo-estado.service.ts:599-604 |
| sugestão de # e de @ | #: GET /mensagem-direta/referencias depois de 250 ms de pausa e 2 letras; @: nenhuma | frontend/src/app/modules/mensagem-direta/components/mensagem-direta-compositor/mensagem-direta-compositor.component.ts:156-166, 275-288, 298-302 |
| editar e reagir | PATCH /mensagem-direta/mensagem ou PUT /mensagem-direta/reacao (grupo: PATCH /mensagem-direta/grupo/:id/mensagem, PUT /mensagem-direta/grupo/:id/reacao) | frontend/src/app/modules/mensagem-direta/services/mensagem-direta-estado.service.ts:478, 503; mensagem-direta-grupo-estado.service.ts:339, 378 |
| busca na lista | GET /mensagem-direta/busca depois de 300 ms (mais GET /mensagem-direta/pessoas se a lista de pessoas ainda é nula) | frontend/src/app/modules/mensagem-direta/components/mensagem-direta-lista/mensagem-direta-lista.component.ts:56-64; mensagem-direta-estado.service.ts:668-683 |
| busca dentro do grupo | GET /mensagem-direta/grupo/:id/busca depois de 300 ms; alternar "Com código" busca na hora | frontend/src/app/modules/mensagem-direta/components/mensagem-direta-grupo-busca/mensagem-direta-grupo-busca.component.ts:54-73 |
| Nova conversa, Novo grupo, Detalhes do grupo | GET /mensagem-direta/pessoas a cada abertura | frontend/src/app/modules/mensagem-direta/components/mensagem-direta-lista/mensagem-direta-lista.component.ts:74-76; mensagem-direta-estado.service.ts:868, 880 |
| criar grupo | POST /mensagem-direta/grupo → GET /mensagem-direta/grupo/:id/mensagens → GET .../fixadas; mais o eco SINCRONIZAR (GET /mensagem-direta/conversas) | frontend/src/app/modules/mensagem-direta/services/mensagem-direta-estado.service.ts:889-892; mensagem-direta-grupo-estado.service.ts:517-521 |
| alterar grupo, adicionar membros, sair | PATCH /mensagem-direta/grupo/:id, POST /mensagem-direta/grupo/:id/membros ou DELETE /mensagem-direta/grupo/:id/membro; mais o eco SINCRONIZAR (GET conversas, mensagens, fixadas) | frontend/src/app/modules/mensagem-direta/services/mensagem-direta-grupo-estado.service.ts:526-553 |
| fixar ou desafixar mensagem | POST ou DELETE /mensagem-direta/grupo/:id/fixadas/:mensagemId → GET /mensagem-direta/grupo/:id/fixadas; mais o eco SINCRONIZAR (GET conversas, mensagens, fixadas) | frontend/src/app/modules/mensagem-direta/services/mensagem-direta-grupo-estado.service.ts:229-237 |
| silenciar conversa ou grupo | PUT /mensagem-direta/conversa/:id/silencio ou PUT /mensagem-direta/grupo/:id/silencio, sem recarga | frontend/src/app/modules/mensagem-direta/services/mensagem-direta-estado.service.ts:1024-1029; mensagem-direta-grupo-estado.service.ts:557-564 |
| botão de chat da demanda ou do projeto | ao mostrar: GET /mensagem-direta/canal/{demanda\|projeto}/:id a cada alvo; ao clicar: POST no mesmo caminho (se não existe) → GET /mensagem-direta/conversas (se fora da lista) → GET /mensagem-direta/grupo/:id/mensagens → GET .../fixadas, em cascata | frontend/src/app/modules/mensagem-direta/components/mensagem-direta-canal-botao/mensagem-direta-canal-botao.component.ts:48-60, 70-85; mensagem-direta-estado.service.ts:858-861 |
| preferências do chat | PUT /mensagem-direta/preferencia por alteração, com o conjunto inteiro (GET antes se ainda não carregada); arrastar ou redimensionar o popup: nenhuma | frontend/src/app/modules/mensagem-direta/services/mensagem-direta-avisos.service.ts:78-99; mensagem-direta-posicao.service.ts:53-57 |
| resumo do grupo por IA | abrir: GET /mensagem-direta/grupo/:id/resumo → (canal de projeto) GET /demanda?projetoId=...&allRows=true; Estimar: POST .../resumo/estimativa; Gerar: POST .../resumo | frontend/src/app/modules/mensagem-direta/components/mensagem-direta-grupo-resumo/mensagem-direta-grupo-resumo.component.ts:84-105, 115, 146, 166 |
| supervisão: abrir a tela, filtrar, trocar de modo, abrir conversa | GET /mensagem-direta/supervisao/conversas?pagina=1&porPagina=20 (modo grupos: rota de supervisão de grupos); filtro depois de 400 ms; abrir: GET /mensagem-direta/supervisao/conversa/:id ou a rota de supervisão do grupo | frontend/src/app/modules/mensagem-direta/pages/supervisao-chat/supervisao-chat.page.ts:105-116, 119-137, 167-173, 182-205 |
| janela /chat-popup do Desktop | GET /mensagem-direta/eventos + GET /mensagem-direta/conversas + GET /mensagem-direta/preferencia, mais a conversa ou o grupo pedido, ou GET /mensagem-direta/pessoas | frontend/src/app/modules/mensagem-direta/pages/chat-popup/chat-popup.page.ts:42-58; mensagem-direta-popup.component.ts:138 |

### TE-projetos-relatorio-tags-modelagem-config-ia

| Fluxo | Requisições | Onde no código |
|---|---|---|
| Projetos: abrir /projeto | GET /projeto?pagina=1&itensPorPagina=100 | frontend/src/app/modules/projeto/pages/projeto-listagem/projeto-listagem.page.ts:113 (ngOnInit) -> :134 |
| Projetos: visão Volume na listagem (abrir, trocar Mensal/Anual, mês ou ano) | GET /projeto/volume?ano&mes ou GET /projeto/volume/anual?ano; uma por troca, sem cancelar a anterior | frontend/src/app/modules/projeto/components/projeto-volume/projeto-volume.component.ts:102 (ngOnInit), :84-87, :109, :130 -> :163 e :176 |
| Projetos: busca e filtro de status | nenhuma (filtro local; estado na URL) | frontend/src/app/modules/projeto/pages/projeto-listagem/projeto-listagem.page.ts:79-90, 147-171 |
| Projetos: criar | POST /projeto -> (com volume inicial) POST /projeto/:id/volume-vigencia, em cascata; depois navega para /projeto/:id | frontend/src/app/modules/projeto/components/projeto-formulario-dialog/projeto-formulario-dialog.component.ts:197-206; projeto-listagem.page.ts:178-179 |
| Projetos: abrir edição pela listagem | GET /projeto/:id e GET /projeto/:id/volume-vigencia, paralelas | projeto-formulario-dialog.component.ts:144-146; projeto-volume-vigencias.component.ts:46 (effect) -> :65 |
| Projetos: salvar edição / trocar status no card | PUT /projeto/:id (sem recarga) | projeto-formulario-dialog.component.ts:244-254; projeto-listagem.page.ts:183-189 e :210 |
| Projetos: excluir e desfazer | DELETE /projeto/:id; desfazer: PATCH /projeto/:id/restaurar -> GET /projeto?pagina=1&itensPorPagina=100 | projeto-listagem.page.ts:225-230 |
| Projeto detalhe: campo do cabeçalho (nome, cor, datas, status) | PUT /projeto/:id (otimista, aplica a resposta) | frontend/src/app/modules/projeto/pages/projeto-detalhe/projeto-detalhe.page.ts:187 |
| Projeto detalhe: visão Volume | GET /projeto/volume/anual?ano (todos os projetos, filtrado no cliente); trocar para Mensal: GET /projeto/volume?ano&mes | projeto-detalhe.page.html:160-161; projeto-volume.component.ts:96-102, :176 |
| Projeto detalhe: Configurar volume (vigências) | abrir: GET /projeto/:id/volume-vigencia; salvar: POST /projeto/:id/volume-vigencia -> GET /projeto/volume/anual (se a visão Volume está aberta); excluir: DELETE /projeto/:id/volume-vigencia/:vigenciaId -> idem | projeto-volume-vigencias.component.ts:46, :84, :102; projeto-detalhe.page.ts:211-213 |
| Relatório: abrir /relatorio ou /projeto/:id/relatorio | GET /projeto?allRows=true e, havendo projeto (lembrado ou da rota), GET /relatorio/execucao?projetoId&periodoTipo&ano&mes, paralelas | frontend/src/app/modules/relatorio/pages/relatorio-execucao/relatorio-execucao.page.ts:175, :204-205 -> :362 e :321 |
| Relatório: trocar projeto, mês, ano, atalho ou intervalo | 1 GET /relatorio/execucao por troca, após 400 ms, cancelando a anterior | relatorio-execucao.page.ts:160-173 -> :321 |
| Relatório: Revisar com IA | POST /relatorio/execucao/revisar?projetoId= (só por clique; não é cancelado ao trocar filtro) | relatorio-execucao.page.ts:249-256; relatorio.service.ts:46-53 |
| Relatório: baixar CSV | GET /relatorio/execucao/download?...&formato=CSV (blob) | relatorio-execucao.page.ts:235-241; relatorio.service.ts:34-44 |
| Tags: abrir /tag | GET /tag | frontend/src/app/modules/tag/pages/tag-listagem/tag-listagem.page.ts:109 (ngOnInit) -> :135 |
| Tags: criar, renomear, trocar cor | POST /tag; PUT /tag/:id (otimista, sem recarga; invalida o catálogo em memória) | tag-listagem.page.ts:169, :254, :356; tag.service.ts:41, :49 |
| Tags: excluir e desfazer | DELETE /tag/:id; desfazer: PATCH /tag/:id/restaurar (sem recarga) | tag-listagem.page.ts:303-308 |
| Tags: excluir selecionadas e desfazer | N x DELETE /tag/:id paralelas; desfazer: N x PATCH /tag/:id/restaurar; em falha, GET /tag | tag-listagem.page.ts:335-342, :366-369 |
| Modelagem: abrir /modelagem | GET /modelagem (cerca de 28 KB) | frontend/src/app/modules/modelagem/pages/modelagem/modelagem.page.ts:66-72 |
| Modelagem: soltar tabela arrastada (já na modelagem) | PUT /modelagem/tabela/:nome (uma por soltura, sem recarga) | modelagem-diagrama.component.ts:260 (tabelaSolta.emit) -> modelagem.page.ts:150-155, :189 |
| Modelagem: trocar grupo pelo painel ou soltar tabela de fora num grupo | PUT /modelagem/tabela/:nome -> GET /modelagem | modelagem.page.ts:147, :168 -> :189-198 -> :206 |
| Modelagem: tirar tabela da modelagem | DELETE /modelagem/tabela/:nome -> GET /modelagem | modelagem.page.ts:172-176 |
| Modelagem: criar, editar, excluir grupo | POST /modelagem/grupo \| PUT /modelagem/grupo/:id \| DELETE /modelagem/grupo/:id (sem recarga) | modelagem-grupo-dialog.component.ts:84, :110-112; modelagem.page.ts:122-133 |
| Configurações da IA: abrir | GET /configuracao-ia, GET /configuracao-ia/versoes?itensPorPagina=50, GET /ia/estado (paralelas); GET /prompt -> GET /prompt/:tipo/versoes?itensPorPagina=50 (cascata, aba Prompts sempre montada); GET /ia/modelos só depois das três primeiras | configuracao-ia.page.ts:125-140; prompts-aba.component.ts:94-96, :119, :152; provedor-aba.component.ts:76-78 |
| Configurações da IA: salvar versão | POST /configuracao-ia -> GET /configuracao-ia, GET /configuracao-ia/versoes?itensPorPagina=50, GET /ia/estado (paralelas) | configuracao-ia.page.ts:176-180 |
| Prompts: trocar de tipo | GET /prompt/:tipo/versoes?itensPorPagina=50 | prompts-aba.component.ts:138-152 |
| Prompts: salvar rascunho, ativar, restaurar padrão, descartar, desfazer | POST /prompt/:tipo/rascunho \| POST /prompt/:tipo/rascunho/ativar \| POST /prompt/:tipo/restaurar-padrao \| DELETE /prompt/:tipo/rascunho -> GET /prompt -> GET /prompt/:tipo/versoes?itensPorPagina=50 (cascata) | prompts-aba.component.ts:172-176, :198-202, :221-225, :239-246 |
| Prompts: testar | POST /prompt/:tipo/testar (uma por confirmação) | prompt-teste-dialog.component.ts:94-98 |
| Custos: abrir a aba, trocar período, voltar à janela | GET da consulta de custos (rota ia-custo) com ano e mes; uma por clique e uma por foco/visibilidade | custos-aba.component.ts:99-100, :93-95, :103-126, :128-134 -> :143 |
| Custos: salvar preço de um modelo | PUT .../preco (rota ia-custo) -> GET da consulta de custos | custos-aba.component.ts:170-176 |

### TF-desktop

| Fluxo | Requisições | Onde no código |
|---|---|---|
| Processo principal: conferência do check-in (a cada 15 s; 3 s com a janelinha aberta), com ou sem execução | lê o token por executeJavaScript na janela principal; [1 vez por hora: GET /desktop/versao]; GET /checkin/situacao; [se disparado, Project oculto e janelinha fechada: GET /ia/disponibilidade]. Em cascata, fetch do Node com Bearer. | desktop/src/main.ts:571-577 (temporizador), 552-569 (conferirCheckin), 816 (início) |
| Processo principal: conferência do chat e do atalho (4 s após abrir, depois a cada 60 s) | GET /mensagem-direta/preferencia (uma só) | desktop/src/main.ts:762-767, 744-756, 817 |
| Processo principal: conferência de versão (1 vez por hora, dentro do tique do check-in, só com login) | GET /desktop/versao | desktop/src/main.ts:544-549; desktop/src/politica-da-versao.ts:33-37 |
| Processo principal: garantir atalho (10 s), aviso de 'atualizou', diálogo de saída | nenhuma (tudo local ou data: URL) | desktop/src/main.ts:759, 287-308, 423 |
| Janela principal: abrir o app | loadURL da SPA inteira; casca em paralelo: GET /usuario/:id, GET /execucao/ativa, GET /desktop/versao, GET /ia/disponibilidade, GET /checkin/situacao, GET /mensagem-direta/eventos (stream), GET /mensagem-direta/conversas, GET /mensagem-direta/preferencia; mais as da rota (/ponto: 2) | desktop/src/main.ts:264; frontend/src/app/shared/layout/layout.component.ts:24; topbar.component.ts:118-119; sidebar.component.ts:48; checkin-janelinha.component.ts:70-73; mensagem-direta-estado.service.ts:200-209 |
| Janela principal: falha de carga (front fora do ar) | loadURL da página de falha (data:) e nova loadURL do Project a cada 5 s até voltar; ao voltar, carga inicial completa | desktop/src/main.ts:254-259 |
| Janela principal: ocultar, minimizar, voltar pela bandeja | nenhuma recarga; IPC janela:visibilidade; ao ganhar foco, GET /execucao/ativa | desktop/src/main.ts:133-135, 141-160, 163-166; frontend/src/app/shared/layout/topbar/topbar.component.ts:142-146 |
| Janela principal oculta na bandeja (página segue viva) | stream /mensagem-direta/eventos aberto; GET /ia/disponibilidade a cada 60 s; GET /checkin/situacao a cada 300 s só com execução e no horário sorteado | frontend/src/app/shared/layout/sidebar/sidebar.component.ts:49; checkin-janelinha.component.ts:41-43, 92-98 |
| Janelinha do check-in: abrir (decisão do processo principal) | [principal] GET /checkin/situacao, depois GET /ia/disponibilidade; loadURL /checkin (SPA inteira, sem a casca); [página] GET /ia/disponibilidade e GET /checkin/situacao em paralelo | desktop/src/main.ts:556, 566-568, 524; frontend/src/app/modules/checkin/pages/checkin/checkin.page.ts:183-191 |
| Janelinha do check-in: aberta | [página] GET /checkin/situacao a cada 3 s enquanto EM_ANDAMENTO; [principal] GET /checkin/situacao a cada 3 s; envio da mensagem à IA pelo chat (rota não lida) | frontend/src/app/modules/checkin/pages/checkin/checkin.page.ts:22, 202, 348-362, 270; desktop/src/main.ts:29, 573 |
| Janelinha do check-in: encerrar | nenhuma (IPC checkin:encerrar); o processo principal volta aos 15 s | frontend/src/app/modules/checkin/pages/checkin/checkin.page.ts:302-305; desktop/src/main.ts:799-801, 519-523 |
| Janela de chat: abrir (atalho global, item da bandeja ou clique em notificação) | BrowserWindow nova e loadURL /chat-popup (SPA inteira, sem a casca); em paralelo: GET /mensagem-direta/eventos (segundo stream do usuário), GET /mensagem-direta/conversas, GET /mensagem-direta/preferencia; mais as mensagens da conversa pedida (não lidas) | desktop/src/main.ts:596-612, 615-688; frontend/src/app/modules/mensagem-direta/pages/chat-popup/chat-popup.page.ts:42-58; mensagem-direta-popup.component.ts:137-138 |
| Janela de chat: fechar e reabrir | fechar destrói a janela (stream cai); reabrir repete a carga inteira. Com a janela já aberta, nova notificação só manda IPC chat:abrir-conversa | desktop/src/main.ts:690-697, 616-624 |
| Aplicação web (navegador ou Desktop): toda carga da casca | GET /desktop/versao | frontend/src/app/shared/layout/topbar/topbar.component.ts:119 |
| Baixar o Project Desktop pelo botão do popover do perfil | GET /desktop/download (blob inteiro em memória, depois link de download) | frontend/src/app/shared/layout/topbar/topbar.component.html:188; frontend/src/app/core/services/desktop-download.service.ts:32-42 |
| Bandeja: 'Nova versão disponível: baixar' | abre o Project no navegador do sistema com ?baixar-desktop=1: carga inicial completa (10 requisições e stream), depois GET /desktop/download | desktop/src/main.ts:275; desktop/src/politica-da-versao.ts:40-44; frontend/src/app/shared/layout/topbar/topbar.component.ts:129-131 |

### T01 — Casca da aplicação, sessão, login e check-in: mapa de requisições

Arquivos lidos por inteiro (`.ts` e `.html`, sem os `*.spec.ts`/`*.test.ts` e sem os `.scss`, salvo o do diálogo de encerrar): `frontend/src/app/app.config.ts`, `app.routes.ts`, `app.component.ts|html`; `core/guards/*` (4), `core/interceptors/*` (4), `core/services/*` (11: autenticacao, usuario-sessao, execucao-ativa, ia-disponibilidade, desfazer, atividade-prioridade, desktop-download, project-desktop, tema, tema-personalizado, visualizacao-tempo), `core/signals/*` (2), `core/utils/*` (7), `core/models/*` (3), `core/config/rxjs-erros-http.ts`; `shared/layout/layout.component.ts|html`, `navegacao.ts`, `sidebar/sidebar.component.ts|html`, `topbar/topbar.component.ts|html`, `topbar/chip-execucao-ativa/*.ts|html`, `ia-retorno-aviso/*.ts|html`; `modules/autenticacao/pages/login/login.page.ts|html`; `modules/checkin/**` (rotas, janelinha, próximo, página `.ts|html`, service, util); `shared/components/execucao-encerrar-dialog/*.ts|html|scss`; `shared/components/toast-desfazer/*.ts|html`.

Lidos em parte (só o trecho seguido a partir da unidade): `modules/mensagem-direta/components/mensagem-direta-popup/*.ts|html`, `mensagem-direta-avisos.component.ts`, `pages/chat-popup/chat-popup.page.ts`, `services/mensagem-direta-estado.service.ts` (ciclo de vida e eventos), `services/mensagem-direta-eventos.service.ts`, `modules/atividade/services/atividade.service.ts` (`listarExecucoesPorAtividade`), `modules/atividade/pages/atividade-detalhe/atividade-detalhe.page.ts|html` (trechos), `modules/chat/services/chat.service.ts` (`enviarMensagem`, `lerFluxo`), `modules/chat/components/proposta-cartao` (construtor), `shared/components/assistente-descricao`, `modules/usuario/components/usuario-anotacoes-dialog` e `usuario-cor-dialog`; backend: `checkin` (controller, service, agenda, suspensão, executor), `execucao` (controller, `listar`/`encerrar`/`recuperarAtiva` da service e do repository, `domain/execucao-ativa-detalhada.ts`), `ia` (controller, `obterEstado`), `desktop` (controller, service), `autenticacao` (`jwt.strategy.ts`, controller), `usuario` (`recuperar`); desktop: `desktop/src/main.ts` (conferência do check-in e do chat), `politica-do-checkin.ts`.

Medição já existente usada como conferência: ``.artifacts/` da auditoria: trafego/DESENVOLVEDOR.txt` (carga inicial, foco, aba oculta).

Convenção: "‖" = paralelas; "→" = em cascata. Rotas sem o prefixo `/api/v1`.

#### 1. Login (`/autenticacao`)

| Gatilho | Requisições | Onde no código |
|---|---|---|
| Abrir a tela de login | nenhuma | `login.page.ts:76` (só `localStorage`) |
| Clicar "Entrar" | `POST /autenticacao/login` → `GET /ia/disponibilidade` (decide o destino) → navegação | `login.page.ts:100-111`; `autenticacao.service.ts:19-32`; `ia-disponibilidade.service.ts:39-48` |
| Layout nasce depois do login | as da seção 2, menos `GET /ia/disponibilidade` (resposta com menos de 5 s) | `ia-disponibilidade.service.ts:54-56` |

Total do login até a casca pronta: 2 + 7 = 9, mais as da tela de destino (`/chat` com a IA no ar, `/atividade` sem). O `GET /usuario/:id` do passo 2 repete o que o login acabou de devolver (achado).

#### 2. Abrir a aplicação já logado (F5 em qualquer rota do layout)

| Gatilho | Requisições | Onde no código |
|---|---|---|
| `LayoutComponent` construído | `GET /usuario/:id` (atualizarSessao) | `layout.component.ts:24`; `autenticacao.service.ts:46-57` |
| `SidebarComponent.ngOnInit` | `GET /ia/disponibilidade` | `sidebar.component.ts:48` |
| `TopbarComponent` construído | `GET /execucao/ativa` ‖ `GET /desktop/versao` | `topbar.component.ts:118-119`; `execucao-ativa.service.ts:27-39`; `desktop-download.service.ts:22-29` |
| `CheckinJanelinhaComponent.ngOnInit` | `GET /ia/disponibilidade` (não sai: consulta em curso) ‖ `GET /checkin/situacao` | `checkin-janelinha.component.ts:68-71`; `checkin.service.ts:15-25` |
| `CheckinProximoComponent.ngOnInit` (conteúdo do popover do perfil, criado junto com a topbar) | `GET /checkin/situacao` (não sai: compartilha a consulta em curso) | `checkin-proximo.component.ts:47-49`; `topbar.component.html:96-107` |
| `MensagemDiretaPopupComponent.ngOnInit` → `estado.iniciar()` | `GET /mensagem-direta/eventos` (stream por `fetch`, fica aberto) ‖ `GET /mensagem-direta/conversas` ‖ `GET /mensagem-direta/preferencia` | `mensagem-direta-popup.component.ts:138`; `mensagem-direta-estado.service.ts:200-210`; `mensagem-direta-eventos.service.ts:102` |
| Resposta de `/execucao/ativa` com execução | nenhuma a mais se a situação já conhecida mostra a mesma execução; senão `GET /checkin/situacao` | `checkin-janelinha.component.ts:50-59`; `checkin.util.ts:31-35` |
| Avisos do chat, pad e diálogo da cor (`@defer`) | nenhuma chamada de API (só o pacote JS) | `layout.component.html:12-14`; `topbar.component.html:220-223` |

Total da casca: 8 requisições, todas paralelas (7 + o stream). Conferido na medição: `carga-inicial` do desenvolvedor = essas 8 + 1 da tela.

#### 3. Navegar entre telas do layout

| Gatilho | Requisições | Onde no código |
|---|---|---|
| Clique no menu, atalho `g`+letra, logo | nenhuma da casca | `sidebar.component.ts:82-105` |
| `?anotacoes=:id` na URL (fora de `/usuario`) | abre o pad: `GET /anotacao?usuarioId=` (unidade de Usuários) | `topbar.component.ts:125-138` |
| `?baixar-desktop=1` na URL | `GET /desktop/download` (blob) | `topbar.component.ts:129-133`; `desktop-download.service.ts:32-42` |

#### 4. Foco da janela e volta à aba

| Gatilho | Requisições | Onde no código |
|---|---|---|
| `window:focus` (alt-tab de volta, sem a aba ter ficado oculta) | `GET /execucao/ativa` (1 por foco, sem guarda de tempo) | `topbar.component.ts:142-146` |
| Aba volta a ficar visível | `GET /execucao/ativa` ×2 (`visibilitychange` + `focus`) ‖ `GET /checkin/situacao` (janelinha, com ou sem execução) ‖ recargas da tela aberta | `topbar.component.ts:142-146`; `checkin-janelinha.component.ts:44-47` |
| Chat aberto numa conversa, aba volta | `PUT /mensagem-direta/conversa/:id/leitura` se há mensagem nova a marcar | `mensagem-direta-estado.service.ts:177-179`, `405-426` |

Medição: "foco na janela 3x" = 3× `GET /execucao/ativa`; "aba oculta e visível" = 2× `GET /execucao/ativa` + `GET /checkin/situacao` + a da tela.

#### 5. Em repouso (por aba, por hora)

| Temporizador | Requisições | Onde no código |
|---|---|---|
| Barra lateral, a cada 60 s, aba visível ou oculta | `GET /ia/disponibilidade` — 60/h | `sidebar.component.ts:15`, `49` |
| Janelinha, a cada 5 min, só com execução ativa | `GET /checkin/situacao` — 12/h | `checkin-janelinha.component.ts:13`, `41-43` |
| Janelinha, no horário sorteado (`proximoCheckinData` + 500 ms) | `GET /checkin/situacao` — 1 por check-in | `checkin-janelinha.component.ts:92-98` |
| Stream do chat | 1 conexão aberta; reconecta se ficar 70 s sem dado | `mensagem-direta-eventos.service.ts:18`, `96-99` |
| Relógio da topbar, cronômetro do chip, contagem do "próximo check-in" | nenhuma (só sinais locais; a contagem de 1 s do `CheckinProximoComponent` corre a sessão inteira) | `topbar.component.ts:148-157`; `chip-execucao-ativa.component.ts:43-48`; `checkin-proximo.component.ts:31` |

Sem execução: 60/h. Com execução: 72/h + 1 por check-in. Cada requisição autenticada custa ainda 1 consulta de usuário no backend (`jwt.strategy.ts:29`).

No Project Desktop somam-se, do processo principal (seção 15): 240/h de `GET /checkin/situacao`, 60/h de `GET /mensagem-direta/preferencia`, 1/h de `GET /desktop/versao`.

#### 6. Iniciar ou encerrar execução em qualquer tela (interceptor)

| Gatilho | Requisições | Onde no código |
|---|---|---|
| `POST /execucao` com sucesso | → `GET /execucao/ativa` → (id mudou e a situação diverge) `GET /checkin/situacao` | `execucao-ativa.interceptor.ts:17-29`; `checkin-janelinha.component.ts:50-59` |
| `PATCH /execucao/:id/encerrar` com sucesso | → `GET /execucao/ativa` → `GET /checkin/situacao` se a encerrada era a do usuário | idem |
| `POST /proposta-ia/:id/confirmar|desfazer` com sucesso | → `GET /execucao/ativa` (qualquer proposta) | `execucao-ativa.interceptor.ts:9`, `21` |
| Fim de um fluxo do chat em que rodou ferramenta `propor_*` | `GET /execucao/ativa` | `chat.service.ts:134-141` |

Os interceptors `auth-token`, `error-handler` e `loading` não repetem nem disparam requisição. O `error-handler` mostra toast em todo erro que não seja 401 e que não venha marcado `ERRO_TRATADO_PELA_TELA` — inclui as leituras de fundo desta unidade (achado).

#### 7. Chip da execução ativa: pausar

| Gatilho | Requisições | Onde no código |
|---|---|---|
| Clicar no ⏸ do chip (abre "Encerrar execução") | `GET /execucao?atividadeId=:id&itensPorPagina=200` | `chip-execucao-ativa.component.ts:51-61`; `execucao-encerrar-dialog.component.ts:83-95`, `128-138`; `atividade.service.ts:93-98` |
| "Auxiliar com IA" | `POST /assistente/auxiliar-descricao` | `assistente-descricao.component.ts:52-71` |
| "Encerrar" | `PATCH /execucao/:id/encerrar` → `GET /execucao/ativa` (interceptor) ‖ `GET /checkin/situacao` (a execução do chip virou `null`) + recarga da lista da tela de Atividades, se aberta (`pausasDoChip`) | `execucao-encerrar-dialog.component.ts:106-126`; `chip-execucao-ativa.component.ts:63-68` |

Total: 1 ao abrir; 3 ao confirmar (1 gravação + 2 leituras), fora a recarga da tela.

#### 8. Menu do perfil

| Gatilho | Requisições | Onde no código |
|---|---|---|
| Abrir o menu | nenhuma (o `app-checkin-proximo` já nasceu na carga e não reconsulta ao abrir) | `topbar.component.html:84`, `96-107` |
| "Editar cor" → salvar | `PUT /usuario/cor` | `usuario-cor-dialog.component.ts:44-58` |
| "Baixar Project Desktop" | `GET /desktop/download` | `desktop-download.service.ts:32-42` |
| "Sair" | nenhuma; o stream do chat é abortado | `autenticacao.service.ts:34-39`; `mensagem-direta-popup.component.ts:157-159` |
| Tema, "Tempos em dias", cor do tema | nenhuma (`localStorage`) | `tema.service.ts`, `visualizacao-tempo.service.ts`, `tema-personalizado.service.ts` |

#### 9. Botões da topbar

| Gatilho | Requisições | Onde no código |
|---|---|---|
| Chat com colegas | nenhuma ao abrir a lista (já carregada); com conversa aberta, `PUT .../leitura` se houver o que marcar | `mensagem-direta-estado.service.ts:243-252` |
| Minhas anotações (botão ou tecla `n`) | `GET /anotacao?usuarioId=` (unidade de Usuários) | `topbar.component.ts:113-115` |
| "Voltar para a IA" | nenhuma da casca; navega para `/chat` | `topbar.component.ts:75-78` |

#### 10. Janelinha do check-in (diálogo dentro do layout)

| Gatilho | Requisições | Onde no código |
|---|---|---|
| Horário chega (`setTimeout`) | `GET /checkin/situacao` → `disparado: true` → monta `app-checkin-page` embutida | `checkin-janelinha.component.ts:79-98`; `checkin-janelinha.component.html:1-13` |
| `CheckinPage.ngOnInit` embutida | `GET /ia/disponibilidade` (se a última tem mais de 5 s) ‖ `GET /checkin/situacao` (de novo) | `checkin.page.ts:183-209` |
| Estado `EM_ANDAMENTO`, aba visível | `GET /checkin/situacao` a cada 3 s, sem teto de tempo | `checkin.page.ts:22`, `348-351`, `358-373` |
| Enviar mensagem ou sugestão | `POST /checkin/mensagem` (stream) → ao fim: `GET /execucao/ativa` (se rodou `propor_*`) ‖ `GET /checkin/situacao` | `checkin.page.ts:259-293`; `chat.service.ts:68-83`, `134-141` |
| Cartão de proposta aparece | `GET /proposta-ia/:id` por cartão; `GET /atividade-prioridade` uma vez na sessão | `proposta-cartao.component.ts:183-214`; `atividade-prioridade.service.ts:27-34` |
| Confirmar a proposta | `POST /proposta-ia/:id/confirmar` → `GET /execucao/ativa` → `GET /checkin/situacao` (`CheckinProximoComponent`; a janelinha não confere com o diálogo aberto) | `execucao-ativa.interceptor.ts`; `checkin-proximo.component.ts:35-44`; `checkin-janelinha.component.ts:81` |
| Diálogo se encerra (2,5 s depois de registrado, ou "Fechar") | `GET /checkin/situacao` (janelinha, para o próximo horário) | `checkin.page.ts:175-179`, `296-300`; `checkin-janelinha.component.ts:74-77` |

Um check-in respondido em 1 min: cerca de 20 `GET /checkin/situacao` do intervalo + 4 pontuais.

#### 11. Página `/checkin` (janela própria, sem layout)

| Gatilho | Requisições | Onde no código |
|---|---|---|
| Abrir | `GET /ia/disponibilidade` ‖ `GET /checkin/situacao` | `checkin.page.ts:183-186` |
| Em andamento | igual à seção 10 (3 s) | `checkin.page.ts:348-351` |
| Sem execução | nenhuma a mais; fecha em 5 s | `checkin.page.ts:169-173` |
| "Tentar de novo" (erro) | `GET /checkin/situacao` | `checkin.page.html:45-51` |

Não chama `atualizarSessao`, não abre o stream do chat.

#### 12. `/chat-popup` (janela de chat do Desktop, sem layout)

| Gatilho | Requisições | Onde no código |
|---|---|---|
| Abrir | `GET /mensagem-direta/eventos` (2º stream do usuário) ‖ `GET /mensagem-direta/conversas` ‖ `GET /mensagem-direta/preferencia` + as da conversa pedida (unidade do chat) | `chat-popup.page.ts:42-58`; `mensagem-direta-popup.component.ts:137-147` |

#### 13. Toast "Desfazer"

| Gatilho | Requisições | Onde no código |
|---|---|---|
| Aparecer, expirar, fechar | nenhuma | `desfazer.service.ts:37-57` |
| Clicar "Desfazer" | a chamada que a tela registrou (`PATCH .../restaurar` etc.) e depois o `aposDesfazer` da tela | `desfazer.service.ts:60-73` |

#### 14. Sessão expirada (401)

| Gatilho | Requisições | Onde no código |
|---|---|---|
| Qualquer resposta 401 pelo `HttpClient` | nenhuma; apaga `access_token` e `usuario_sessao` do `localStorage` e navega ao login (uma navegação por resposta 401) | `error-handler.interceptor.ts:23-28` |
| 401 no stream do chat | idem, pelo próprio serviço | `mensagem-direta-eventos.service.ts:71-76`, `106-109` |

#### 15. Project Desktop — processo principal (fora dos arquivos da unidade; lido em parte)

| Gatilho | Requisições | Onde no código |
|---|---|---|
| A cada 15 s, com login, com ou sem execução, janela à vista ou não | `GET /checkin/situacao` | `desktop/src/main.ts:28`, `552-577` |
| Com a janelinha do Desktop aberta, a cada 3 s | `GET /checkin/situacao` (além do intervalo de 3 s da própria página `/checkin` dentro dela) | `desktop/src/main.ts:29`, `573` |
| Check-in disparado com o Project minimizado | `GET /ia/disponibilidade` | `desktop/src/main.ts:567` |
| A cada 60 s | `GET /mensagem-direta/preferencia` (atalho global) | `desktop/src/main.ts:55`, `754`, `762-766` |
| De hora em hora | `GET /desktop/versao` | `desktop/src/main.ts:544-549` |

#### 16. Componentes de outros módulos montados no layout (lista, sem aprofundar)

| Componente | Pede ao carregar | Pede depois |
|---|---|---|
| `app-mensagem-direta-popup` | stream + `/mensagem-direta/conversas` + `/mensagem-direta/preferencia` | `SINCRONIZAR` ou reconexão do stream: `/mensagem-direta/conversas` de novo (+ conversa ou grupo aberto) — `mensagem-direta-estado.service.ts:761-777` |
| `app-mensagem-direta-avisos` (`@defer`) | nada | abrir um aviso abre a conversa (unidade do chat) |
| `app-usuario-anotacoes-dialog` (`@defer`) | nada | `GET /anotacao?usuarioId=` a cada abertura |
| `app-usuario-cor-dialog` (`@defer`) | nada | `PUT /usuario/cor` ao salvar |
| `app-checkin-janelinha` / `app-checkin-proximo` | `GET /checkin/situacao` (uma, compartilhada) | seções 5, 6 e 10 |
| `app-ia-retorno-aviso`, `app-toast-desfazer`, `app-loading-spinner` | nada | nada |

#### Custo no backend das rotas que a casca repete

| Rota | O que roda | Onde |
|---|---|---|
| toda rota autenticada | 1 `SELECT` do usuário do token | `backend/src/modules/autenticacao/strategies/jwt.strategy.ts:29` |
| `GET /ia/disponibilidade` | configuração em cache, sem banco | `ia.service.ts:80-87`; `configuracao-ia.service.ts:43-50` |
| `GET /execucao/ativa` | 1 `SELECT` | `execucao.repository.ts:445-467` |
| `GET /checkin/situacao` com execução ativa | 1 `SELECT` da ativa + listagem `allRows` de todas as execuções da atividade (`COUNT`, `SUM` e `SELECT` com 4 `JOIN`) só para achar três nomes | `checkin.service.ts:55-57`; `execucao-ativa-detalhada.ts:25-28`; `execucao.repository.ts:303-390` |
| `GET /execucao?atividadeId&itensPorPagina=200` | `COUNT` + `SUM` + `SELECT ... ORDER BY usuario.nome_completo ASC, execucao.inicio_data ASC LIMIT 200` (as 200 mais antigas) | `execucao.repository.ts:303-390` |
| `GET /desktop/versao` | `readdir` + `stat` da pasta de executáveis | `desktop.service.ts:36-56` |

### Mapa de requisições — T02 · Usuários, perfil, pad (anotações) e Documentações

Arquivos lidos por inteiro: em `frontend/src/app/modules/usuario/`, `usuario.routes.ts`, `models/usuario.model.ts`, `pages/usuario-listagem/usuario-listagem.page.{ts,html}`, `pages/usuario-anotacoes/usuario-anotacoes.page.ts`, `services/{usuario,anotacao,pad,tipo-usuario-ajuda}.service.ts`, todos os componentes (`pad-painel`, `usuario-anotacoes-dialog` com `secao-anotacao.ts`, `usuario-cartao`, `usuario-cor-dialog`, `usuario-cor-seletor`, `usuario-formulario-dialog`, `usuario-senha-dialog`, `usuario-tipo-descricao`, `usuario-tipos-dialog`, `usuario-tipos-textos`, `.ts` e `.html`) e os `utils/*.ts`; em `frontend/src/app/modules/documentacao/`, `documentacao.routes.ts`, `pages/documentacao/documentacao.page.{ts,html}`, `components/documentacao-{demanda,seletor,proposta}/*.{ts,html}`, `services/assistente-trecho.service.ts`, `utils/documentacao-arvore.util.ts`; fora do módulo, `shared/layout/topbar/topbar.component.ts`, `core/utils/catalogo-em-memoria.ts`, `core/services/{usuario-sessao,desfazer,desktop-download,autenticacao}.service.ts`, `core/interceptors/{error-handler,execucao-ativa}.interceptor.ts`, `core/guards/gestor.guard.ts`; no backend, `usuario.controller.ts`, `tipo-usuario-ajuda.controller.ts`, `usuario.service.ts`, `tipo-usuario-ajuda.service.ts`, `anotacao.controller.ts`, `anotacao.service.ts`, `assistente.controller.ts`, `assistente.service.ts`. Lidos em parte: `usuario.repository.ts` (`listar`), `anotacao.repository.ts`, `demanda.controller.ts`/`demanda.service.ts`/`demanda.repository.ts` (rotas `documentacao`, `:id`, `:id/textos`), `topbar.component.html`, `chat/demanda-leitura.component.ts`, `chat.page.ts` (chamadas ao pad), `primeng-paginator.mjs` e `primeng-table.mjs` (carga lazy e paginador).

Leitura de código, sem executar a aplicação. Contagens são do que o código dispara; nenhuma foi medida na aba de rede.

Abreviações: `page.ts` = `usuario-listagem.page.ts`; `pad` = `services/pad.service.ts`; `doc-demanda` = `documentacao-demanda.component.ts`.

#### 1. Tela Usuários (`/usuario`, só gestor e administrador: `gestorGuard` em `usuario.routes.ts:7`)

| Gatilho | Requisições (ordem; paralelas ou em cascata) | Onde no código |
|---|---|---|
| Abrir a tela | 2 em paralelo: `GET /tipo-usuario-ajuda` (só na primeira abertura da sessão do SPA; depois fica no sinal) e `GET /usuario?pagina=1&itensPorPagina=10[&tipo][&ativo]` (do `onLazyLoad` inicial da tabela; o `ngOnInit` não busca) | `page.ts:121`, `page.ts:133`, `page.ts:211-217`, `page.ts:194-195`; `usuario-listagem.page.html:128`; `tipo-usuario-ajuda.service.ts:29-32` |
| Voltar à aba (`visibilitychange`) | 1 `GET /usuario?...` a cada volta, sem intervalo mínimo | `page.ts:153-156` |
| Buscar (digitar) | 1 `GET /usuario?busca=...&pagina=1` por pausa de 300 ms; a anterior não é cancelada | `page.ts:126-131`, `page.ts:219-222` |
| Filtrar por tipo ou por status | 1 `GET /usuario?tipo=...` / `?ativo=...` | `page.ts:224-234` |
| Limpar filtros | 1 `GET /usuario?pagina=1...` | `page.ts:236-243` |
| Paginar ou mudar linhas por página | 1 `GET /usuario?pagina=N&itensPorPagina=M` (`onLazyLoad`) | `page.ts:211-217` |
| Abrir "Tipos de usuário" (popover) | 0 (lê o sinal) | `usuario-listagem.page.html:40-55`; `usuario-tipo-descricao.component.ts:26` |
| Abrir "Alterar textos dos tipos" (administrador) | 0 | `usuario-tipos-textos.component.ts:50-57` |
| Salvar o texto de um tipo | 1 `PUT /tipo-usuario-ajuda/:tipo`; a resposta atualiza o sinal, sem recarga | `usuario-tipos-textos.component.ts:94`; `tipo-usuario-ajuda.service.ts:41-48` |
| "Novo Usuário": abrir | 0 | `usuario-formulario-dialog.component.ts:100-109` |
| "Novo Usuário": salvar | 2 em cascata: `POST /usuario` → `GET /usuario?...` (lista) | `usuario-formulario-dialog.component.ts:180-187`; `usuario-listagem.page.html:310` |
| Editar: abrir | 1 `GET /usuario/:id` | `usuario-formulario-dialog.component.ts:120-121` |
| Editar: salvar | 2 em cascata: `PUT /usuario/:id` → `GET /usuario?...` (lista) | `usuario-formulario-dialog.component.ts:204-212`; `usuario-listagem.page.html:311` |
| Inativar ou reativar (switch) | 1 `PUT /usuario/:id` com `{ ativo }`; a linha muda na tela, sem recarga | `page.ts:270-284` |
| Desfazer a troca de status | 1 `PUT /usuario/:id` | `page.ts:279-280` |
| Senha: abrir | 0 | `usuario-senha-dialog.component.ts:37-43` |
| Senha: confirmar | 1 `PATCH /usuario/:id/senha` | `usuario-senha-dialog.component.ts:62-63` |
| Excluir | 1 `DELETE /usuario/:id`; a linha sai antes da resposta e volta se o servidor recusar | `page.ts:287-305` |
| Desfazer a exclusão | 2 em cascata: `PATCH /usuario/:id/restaurar` → `GET /usuario?...` | `page.ts:297-298` |
| Anotações de uma linha (coluna Anotações) | 1 `GET /anotacao?usuarioId=:id` | `usuario-listagem.page.html:186-191`; `usuario-anotacoes-dialog.component.ts:64`; `pad:99`, `pad:447-448` |
| Deep-link `/usuario/:id/anotacoes` (gestor) | redireciona para `/usuario?anotacoes=:id`; além da abertura da tela, 2 em paralelo: `GET /anotacao?usuarioId=:id` e `GET /usuario/:id` (só para o nome do título) | `usuario-anotacoes.page.ts:22-23`; `page.ts:138-143`; `pad:446-450` |
| Deep-link `/usuario/:id/anotacoes` (não gestor) | id próprio: vai a `/ponto?anotacoes=:id` e a topbar abre o pad (1 `GET /anotacao`); id alheio: vai a `/ponto`, 0 requisições do pad | `usuario-anotacoes.page.ts:24-28`; `topbar.component.ts:134-137` |

#### 2. Perfil e cor do avatar (menu da topbar)

| Gatilho | Requisições | Onde no código |
|---|---|---|
| Carga da casca (contexto, fora do módulo) | `GET /usuario/:id` 1 vez por abertura do app (confere o tipo) e `GET /desktop/versao` (botão "Baixar Project Desktop" do menu do perfil) | `layout.component.ts:24`; `autenticacao.service.ts:46-57`; `topbar.component.ts:119`; `desktop-download.service.ts:22-29` |
| Abrir o menu do perfil | 0 deste recorte (`app-checkin-proximo` é da unidade do check-in) | `topbar.component.html:96-108` |
| "Editar cor": abrir | 0 (cor atual vem da sessão) | `usuario-cor-dialog.component.ts:39-42` |
| "Editar cor": salvar | 1 `PUT /usuario/cor`; a resposta atualiza a sessão; sai mesmo sem mudança de cor | `usuario-cor-dialog.component.ts:44-58` |
| Tempos em dias, tema | 0 (local) | `topbar.component.html:109-180` |
| Sair | 0; a casca é destruída e o diálogo do pad chama `pad.encerrar()` (PUT só se havia texto pendente, já sem token) | `autenticacao.service.ts:34-39`; `usuario-anotacoes-dialog.component.ts:47-51` |

#### 3. Pad (gaveta da topbar, gaveta da tela Usuários, painel de Documentações, aba Anotações do chat — um só `PadService`)

| Gatilho | Requisições | Onde no código |
|---|---|---|
| Abrir a gaveta (botão da topbar, tecla `n`, linha de Usuários) | 1 `GET /anotacao?usuarioId=X` a cada abertura (+1 `GET /usuario/:id` em paralelo só quando o nome não veio); 0 se o mesmo pad tem texto local ainda não gravado | `topbar.component.ts:113-115`; `pad:91-101`, `pad:443-450` |
| Painel permanente (Documentações, chat) | 1 `GET /anotacao?usuarioId=<eu>` só se o pad do usuário ainda não está em memória | `pad:107-112`; `documentacao.page.ts:52-55`; `demanda-leitura.component.ts:105-108` |
| Digitar | 1 `PUT /anotacao/:usuarioId/:tipo` por pausa de 2 s, por seção editada (corpo: texto inteiro da seção + `updatedDateLido`); com um PUT em curso, no máximo mais 1 quando ele termina | `pad:15`, `pad:297-312`, `pad:315-338` |
| Ctrl+S ou botão Salvar | 1 PUT por seção com mudança; 0 sem mudança | `pad:163-167`, `pad:318` |
| Fechar a gaveta (X, Esc, clique fora) | 0 sem mudança; 1 PUT por seção pendente | `pad:146-149`, `pad:422-428` |
| Conflito (409) no PUT | +1 `GET /anotacao?usuarioId=X&tipos=<seção>` | `pad:351-353`, `pad:362-363` |
| Limpar seção | 0 na hora; 1 PUT (texto vazio) depois de 7 s; 0 se desfizer | `pad:170-189`, `pad:411-416` |
| "Enviar para" outra seção | 0 a 2 PUT (grava as duas antes) → 1 `POST /anotacao/:usuarioId/mover`; a resposta traz as duas seções, sem recarga | `pad:192-242` |
| Desfazer o envio | mais 1 `POST /anotacao/:usuarioId/mover` (inverso) | `pad:199-204` |
| Falha 400/409 ao mover | +1 `GET /anotacao?usuarioId=X&tipos=a,b` | `pad:257-280` |
| A IA anotou no pad (chat) | 1 `GET /anotacao?usuarioId=X` | `pad:119-139`; `chat.page.ts:221`, `chat.page.ts:750` |
| Relógio "Editado há…" | 0 (intervalo de 30 s só atualiza um sinal) | `pad:476-480` |
| Sair da tela Usuários, ou sair do sistema | `pad.encerrar()`: 1 PUT por seção pendente; as seções ficam em memória, sem a assinatura da gravação automática | `usuario-anotacoes-dialog.component.ts:47-51`; `pad:152-156`; `secao-anotacao.ts:65-69` |

Rotas do pad no backend sem chamador no frontend (usadas só pelo executor da IA, por chamada direta à service): `PATCH /anotacao/:usuarioId/:tipo/trecho`, `POST /anotacao/:usuarioId/:tipo/anexo`, `POST /anotacao/:usuarioId/feito` (`anotacao.controller.ts:35`, `:45`, `:55`; `anotar-pad.executor.ts:46-53`).

#### 4. Tela Documentações (`/documentacao`, qualquer usuário autenticado)

| Gatilho | Requisições | Onde no código |
|---|---|---|
| Abrir a tela | 3: `GET /demanda/documentacao` e `GET /anotacao?usuarioId=<eu>` em paralelo (o pad só se ainda não estiver em memória; é pedido mesmo com o pad recolhido); depois, em cascata, `GET /demanda/:id` da demanda guardada ou da que está em execução (0 se não há nenhuma) | `documentacao.page.ts:50-56`, `:58-73`, `:76-83`; `doc-demanda:192-195`, `doc-demanda:207` |
| Selecionar outra demanda | 1 `GET /demanda/:id` | `documentacao.page.ts:86-100`, `:145-149`; `doc-demanda:192-207` |
| Abrir o seletor, buscar, expandir | 0 (busca na lista em memória) | `documentacao-seletor.component.ts:45-50` |
| Trocar de aba (Técnica, Cliente, Documentação) | 0 | `doc-demanda:226-228` |
| Gravar | 1 `PATCH /demanda/:id/textos` (só os textos alterados + `versao`); sem recarga | `doc-demanda:311-333` |
| 409 ao gravar → "Recarregar" | 1 `GET /demanda/:id` | `doc-demanda:336-339`; `documentacao-demanda.component.html:46-57` |
| Descartar | 0 | `doc-demanda:346-351` |
| "Pedir à IA", "Pedir de novo", "Tentar de novo" | 1 `POST /assistente/alterar-trecho` cada; a anterior não é cancelada | `doc-demanda:259-302`; `assistente-trecho.service.ts:15-17` |
| Aceitar ou descartar a proposta | 0 | `doc-demanda:275-286` |
| Recolher ou mostrar o pad, arrastar o divisor | 0 | `documentacao.page.ts:106-143` |
| "Tentar de novo" (lista com erro) | 1 `GET /demanda/documentacao` | `documentacao.page.ts:58` |
| Foco, visibilidade, temporizadores | nenhum na tela | — |
| Histórico de versões, anexos | não existem no frontend: `versao` é só o controle de concorrência do PATCH | `doc-demanda:316-317` |

#### 5. Permissões conferidas de passagem

| Ação | Frontend | Backend | Situação |
|---|---|---|---|
| Entrar em `/usuario` | `gestorGuard` (gestor e administrador) | `GET /usuario` aceita também o auxiliar (`usuario.controller.ts:103`) | conforme para a tela; a rota é mais aberta por causa dos seletores |
| `GET /tipo-usuario-ajuda` | pedido ao abrir Usuários | `@GestorOnly` (`tipo-usuario-ajuda.controller.ts:17`) | conforme |
| `PUT /tipo-usuario-ajuda/:tipo` | botão só para administrador (`usuario-listagem.page.html:13`) | `@AdministradorOnly` (`:24`) | conforme |
| Editar, senha | `podeEditar`: gestor **ou a própria pessoa** (`page.ts:251-254`) | só gestor (`usuario.service.ts:137-139`; `usuario.controller.ts:215`) | regra do front mais larga; hoje inalcançável por causa do guard |
| Inativar ou excluir a si mesmo | bloqueado (`page.ts:261-264`; html `:171`, `:238`) | não há trava (`usuario.service.ts:136-183`, `:215-237`) | trava só no front |
| Gerenciar administrador | só administrador (`page.ts:257-259`) | `validarPermissaoSobreAdministrador` (`usuario.service.ts:208-212`) | conforme |
| Abrir pad de outro | o próprio; gestor abre o de quem não é gestor (`anotacoes-acesso.util.ts:7-13`) | mesma regra (`anotacao.service.ts:165-175`) | conforme |
| `temAnotacoes` na listagem | botão só onde pode abrir | `GET /usuario` devolve o campo de todos (`usuario.repository.ts:166-177`) | campo vai além do que o tipo pode abrir |
| Textos da demanda | `podeEditar` da API + `podeEditarAbaDoPlano` (`doc-demanda:141-147`) | `recuperarDemandaParaEditar` (`demanda.service.ts`, usado por `alterarTextos` e `alterarTrecho`) | conforme |
| Trecho com IA | só na aba que a pessoa edita e com a IA no ar (`doc-demanda:150-155`) | mesma regra de edição (`assistente.service.ts:93`) | conforme |

