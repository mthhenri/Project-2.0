# Dossiê — Auditoria de requisições nos fluxos das telas

Spec: `../auditoria-requisicoes-telas.spec.md`. Evidências brutas (ignoradas pelo Git): `.artifacts/auditoria-requisicoes-telas/`.

**Estado: cobertura incompleta, a auditoria continua em `active/`.** Faltam os fluxos de IA (impedidos pelo ambiente) e uma lista curta de fluxos disponíveis, na seção 6.

## 1. Como foi medido

- Aplicação real num stack isolado: backend na porta 3015, frontend na 4215, banco descartável `project20_auditoria_requests_20261105`, chat em Postgres, IA sem chaves. O stack e o banco do autor (3000/4200, `project20`) não foram tocados.
- Playwright em `1920×1080`, registrando por ação da interface cada chamada a `/api/`: método, URL, status e, na segunda fase, tamanho e formato (chaves) do corpo.
- Três rodadas. **Fase 1 (2026-11-05)**: 18 roteiros como administrador, só método/URL/status, banco na migration 0080 (`01-*.json` a `18-*.json`). **Fase 2 (2026-11-11)**: banco migrado até a 0085, checkout com as alterações locais das tasks 276/277, roteiros `19` a `31` com corpo das respostas, perfis desenvolvedor e auxiliar e varredura das leituras da API por perfil. **Fase 3 (2026-11-11)**: roteiros `32` a `40`, com a varredura das rotas de escrita por perfil, o teste do teto das listas com 108 usuários, ações em massa, restaurar (desfazer) e escrita pela interface como auxiliar.
- Dados de teste só no banco de auditoria (`20-fixtures.cjs`): 13 usuários, 2 projetos (um deles sem o desenvolvedor de teste), 7 demandas, 14 atividades, conversas diretas e marcadores `SEGREDO-*` nos textos do que o desenvolvedor não pode ver.
- "Observado" é o que apareceu no tráfego. "Hipótese" é leitura de código não exercitada. Cada achado diz qual é.

Limites: uma só resolução (a auditoria é de tráfego, não visual); volume pequeno, então custo por item foi medido mas não tempo de resposta sob carga.

## 2. Matriz de cobertura

Legenda: ✅ percorrido com tráfego registrado · ◐ parcial · ⛔ impedido pelo ambiente · ✗ não percorrido.

| Tela | Fluxos percorridos | Estado | Roteiros |
|---|---|---|---|
| Login e sessão | login (3 perfis), carga inicial, logout, repouso, foco e aba oculta | ✅ | 19, 22, 23, 25 |
| Usuários | abrir, criar, buscar, filtrar, paginar, editar, inativar/reativar, senha, excluir, ajuda dos tipos (ver e alterar o texto), anotações de um usuário (abrir e editar) | ✅ | 01, 02, 14, 17, 18, 35, 36 |
| Projetos | abrir, criar, editar, buscar, filtrar por status, trocar status, aba Volume, vigência do volume | ✅ | 03, 13, 30 |
| Demandas | abrir, criar, editar, excluir e desfazer, selecionar, abas, membro, conexão (criar/remover), status, busca, filtro, Grafo, Controle de horas, trocar projeto | ✅ | 04, 13, 15, 17, 23, 30, 35, 36 |
| Atividades | abrir, paginar, buscar, criar, excluir, prioridade, status, tags da linha, descrição da linha, detalhe, filtro Minhas e por usuário, ação em massa (status, tags, excluir), excluir e desfazer | ◐ (salvar cor da prioridade ✗) | 05, 15, 17, 24, 26, 35, 36 |
| Execuções | iniciar e encerrar (detalhe e lista), registrar, editar descrição, excluir, dia anterior, filtro Minhas e por usuário, atualizar | ✅ | 06, 09, 12, 28, 29, 30 |
| Ponto | abrir (gestor e desenvolvedor), escolher usuário, trocar mês, justificativa (criar/excluir), imprimir | ✅ | 06, 14, 17, 23 |
| Documentações e pad | abrir, selecionar demanda, gravar texto, editar pad, abrir/fechar drawer | ◐ (sem anexo, sem mover/feito, sem trecho com IA) | 07, 10 |
| Calendário | abrir, criar, editar, excluir e desfazer | ✅ | 09, 36 |
| Tags | abrir, buscar, criar, editar, excluir | ✅ | 03, 30 |
| Relatório | abrir, mês/ano, baixar CSV | ◐ (revisão com IA ⛔) | 12 |
| Chat com a IA | abrir, histórico, lista de demandas | ⛔ envio, propostas, bom-dia, retomada | 07, 23, 28 |
| Plano | criar, renomear, gravar, ponto (criar/resolver), fonte (criar e ver), arquivar, atribuir projeto, buscar, excluir, abrir "Ligar a uma demanda" | ◐ (remover fonte, publicar, solo e concluir a ligação ✗) | 11, 16, 37, 38 |
| Chat entre colegas | abrir, nova conversa, buscar, enviar, digitando, reagir, responder, editar, referência a demanda, marcar leitura, preferências | ◐ (silenciar ✗) | 10, 24, 39 |
| Supervisão do chat | abrir, abrir conversa, buscar, só com código | ✅ | 30 |
| Configurações da IA | abrir, abas, salvar nova versão, rascunho de prompt, custos | ◐ (ativar/testar prompt ⛔, preço ✗) | 07, 16, 17 |
| Modelagem | abrir, buscar, zoom, grupo (criar/editar/excluir) | ◐ (sem editar tabela) | 12, 17 |
| Check-in (`/checkin`) | abrir sem execução | ⛔ conversa do check-in | 18, 19 |
| Chat popup (`/chat-popup`) | abrir | ◐ | 19 |
| Perfil | menu, cor do avatar, tema, sair | ◐ (download do Desktop ✗) | 25, 30 |
| Perfil desenvolvedor | menu inteiro, URLs de gestor digitadas à mão, fluxos de atividade/execução/demanda/chat | ✅ | 19, 23–29 |
| Perfil auxiliar | menu inteiro, URLs de gestor digitadas à mão, prioridade e status de atividade alheia, iniciar e encerrar execução alheia, ponto de outro usuário, criar tag | ✅ | 27, 40 |
| Perfil gestor (não administrador) | só pela API (leitura e escrita) | ◐ | 21, 32, 33 |

## 3. Achados de tráfego

Ordenados por impacto. Nenhum foi corrigido (fora de escopo).

### R-01 · Alta · A situação do check-in é consultada a cada 20 s por toda aba aberta, com ou sem execução

- **Observado:** em repouso de 150 s na tela de Demandas, sem execução ativa e com a IA desligada, 8 `GET /checkin/situacao` (roteiro 22). São cerca de 180 requisições por hora por aba, de todo usuário logado. Na janela `/checkin` o intervalo cai para 3 s (cerca de 1.200 por hora enquanto aberta).
- **Causa (código):** `checkin-janelinha.component.ts:9` (`INTERVALO_DA_CONFERENCIA_MS = 20_000`), sem condição de execução ativa nem de IA no ar; `checkin.page.ts:22` (`INTERVALO_DA_SITUACAO_MS = 3000`).
- **Recomendação:** a resposta já traz `proximoCheckinData`; agendar a próxima consulta por ela e pelo evento de início/fim de execução, em vez de intervalo fixo. Não consultar sem execução ativa.

### R-02 · Média · Tela de Demandas: 13 requisições para abrir, 8 por demanda selecionada, sem reaproveitar

- **Observado:** abrir `/demanda` faz 13 chamadas; cada clique numa demanda faz 8 (`/plano/demanda/:id`, `/demanda/:id`, `/ancestral`, `/arvore`, `/tag`, `/membro`, `/conexao`, `/atividade?demandaId`); voltar a uma demanda já vista refaz as 8 (roteiro 23). Voltar do modo Controle de horas para Árvore refaz 11, incluindo `/tag` e `/usuario`; trocar de projeto também (roteiro 30). Abrir a edição refaz `/tag`, `/usuario`, `/demanda/:id`, `/tag` e `/membro` da demanda que já está na tela; salvar faz `GET /demanda/1` duas vezes (roteiro 15).
- **Impacto:** é a tela com mais requisições por interação. Com árvore grande cada clique custa 8 idas ao servidor.
- **Recomendação:** um endpoint de detalhe que devolva a demanda com ancestrais, tags, membros e conexões; manter `/tag` e a lista de usuários em memória durante a sessão da tela.

### R-03 · Média · Chamadas duplicadas na carga de toda página

- **Observado:** toda carga completa faz `GET /ia/disponibilidade` 2× e `GET /checkin/situacao` 2× (todos os roteiros). No login são 3× `/ia/disponibilidade`; ao entrar no Chat, mais uma.
- **Causa (código):** `/ia/disponibilidade` é pedida por `sidebar.component.ts:48` e por `checkin-janelinha.component.ts:49` (e pelo login e `chat.page.ts:319`); `/checkin/situacao` por `checkin-janelinha` e por `checkin-proximo.component.ts:47`.
- **Recomendação:** uma única consulta compartilhada por serviço, com os componentes lendo o sinal.

### R-04 · Média · Usuários: a listagem é pedida duas vezes ao abrir

- **Observado:** `GET /usuario?pagina=1&itensPorPagina=10` 2× em toda abertura da tela (roteiros 01, 02, 14, 17, 18, 22). Criar, filtrar e paginar fazem uma só.
- **Causa (código):** `usuario-listagem.page.ts` chama `buscarUsuarios()` no `ngOnInit` e a tabela dispara o `onLazyLoad` inicial, que cai em `aoCarregarTabela` e busca de novo.

### R-05 · Média · Listas carregadas com teto fixo e sem paginação: acima do teto, itens somem em silêncio

- **Observado:** seletores e painéis pedem uma página só: `/usuario?itensPorPagina=100`, `/projeto?itensPorPagina=100`, `/demanda?projetoId&itensPorPagina=200`, `/atividade?demandaId&itensPorPagina=100`, `/execucao?atividadeId&itensPorPagina=200`. Para a mesma finalidade (lista de usuários de um seletor) a tela de Execuções usa `allRows=true` e as de Atividades, Ponto e Demandas usam `itensPorPagina=100`.
- **Confirmado para usuários** (`34-teto-listas.cjs`, 108 usuários ativos): `/usuario?ativo=true&itensPorPagina=100` devolve 100 de 108 (`totalPaginas: 2`) e o seletor do Ponto não acha o último usuário em ordem alfabética; o de Execuções (`allRows=true`) acha. Na mesma tela do Ponto a tabela (`/ponto/todos`) traz os 108, então quem aparece na tabela pode faltar no seletor. É o caso de "requisição a menos".
- **Hipótese, não exercitada:** o mesmo corte para mais de 100 projetos, 200 demandas num projeto, 100 atividades numa demanda ou 200 execuções numa atividade.
- **Custo:** com 100 usuários a lista pesa 16,4 KB e é pedida de novo a cada entrada em Atividades, Ponto e Demandas (ver R-02 e R-08).
- **Recomendação:** padronizar em `allRows` (ou num endpoint de opções) onde a tela precisa da lista inteira.

### R-06 · Baixa · Cada foco da janela dispara `GET /execucao/ativa`, sem intervalo mínimo

- **Observado:** 3 focos seguidos, 3 requisições; voltar de aba oculta dispara 2× `/execucao/ativa` e 1× `/checkin/situacao` (roteiro 22).
- **Causa (código):** `topbar.component.ts:142`, com `visibilitychange` e `window:focus` no mesmo método, sem guarda de tempo. Usuários, Ponto, Execuções, Atividades e Custos também recarregam a própria lista em `visibilitychange`.

### R-07 · Baixa · Diálogo de iniciar/encerrar execução busca até 200 execuções da atividade

- **Observado:** abrir o diálogo faz `GET /execucao?atividadeId=15&itensPorPagina=200` (roteiros 26, 28, 29).
- **Recomendação:** se o uso é sugerir a última descrição, pedir só a última.

### R-08 · Baixa · Catálogos pequenos recarregados a cada uso

- **Observado:** `GET /tag` (33 tags, 1,5 KB) a cada abertura do seletor de tags de uma linha, do formulário de demanda e de atividade e da tela de Demandas; `GET /atividade-prioridade` a cada entrada em Atividades; `GET /anotacao?usuarioId` a cada abertura da gaveta do pad (roteiro 10).

### R-09 · Baixa · Configurações da IA carrega todas as abas ao abrir

- **Observado:** 6 requisições na abertura, entre elas `GET /prompt` (15 KB, os 14 prompts com o texto inteiro) e as versões do prompt de conversa, antes de a aba Prompts ser aberta (roteiros 16, 22).

### R-10 · Baixa · Plano: toda alteração recarrega as duas listas

- **Observado:** renomear, gravar, arquivar e atribuir projeto são seguidos de `GET /chat/conversas` e `GET /plano` (roteiros 11, 16).

### R-11 · Média · Excluir uma demanda pede a demanda excluída, mostra erro e recarrega a tela inteira

- **Observado:** `DELETE /demanda/7` 200 seguido de `GET /demanda/7` 404, de um aviso "Não encontrado: Registro não encontrado" na tela e de mais 11 requisições que recarregam a demanda vizinha, `/tag` e `/usuario` (roteiros 17, 35, 36). Reproduzido três vezes.
- **Impacto:** o usuário vê um erro logo depois de uma exclusão que deu certo.

### R-12 · Baixa · Texto de uma demanda na linha da atividade traz a demanda inteira

- **Observado:** o ícone "Descrição técnica" da linha faz `GET /demanda/:id`, que devolve os três textos (roteiro 24).

### R-13 · Informativo · Primeira mensagem de uma conversa nova recarrega a lista duas vezes

- **Observado:** `POST /mensagem-direta/mensagem` seguido de 2× `GET /mensagem-direta/conversas` (roteiro 10). Em conversa já existente não há recarga (roteiro 24).

### R-14 · Média · Ação em massa nas atividades faz uma requisição por item

- **Observado:** com 3 atividades selecionadas, "Mudar status" faz 3 `PUT /atividade/:id`, "Acrescentar tags" 3 `PUT /atividade/:id/tag`, "Excluir" 3 `DELETE` e "Desfazer" um `PATCH .../restaurar` por item, cada grupo seguido de uma recarga da lista (roteiros 35, 36).
- **Impacto:** cresce com a seleção e a operação pode ficar pela metade se uma das chamadas falhar.
- **Recomendação:** rota em lote, numa transação.

### R-15 · Baixa · Desfazer a exclusão de uma demanda não recarrega nada

- **Observado:** `PATCH /demanda/7/restaurar` 200 e nenhuma leitura depois (roteiro 36). Em atividade e calendário o desfazer é seguido da recarga da lista.
- **Hipótese:** a demanda restaurada só volta à árvore na próxima recarga; não conferido visualmente.

### R-16 · Informativo · Iniciar execução em atividade alheia responde a regra de status antes da permissão

- **Observado:** `POST /execucao` de um desenvolvedor sobre atividade de outro projeto, com a atividade em `PENDENTE`, responde 400 "Só é possível iniciar execução em atividades planejadas ou em desenvolvimento"; com a atividade em `PLANEJADA`, 403 (roteiros 32, 33). A execução nunca é criada, mas a primeira resposta revela o status de uma atividade que ele não vê.

### O que está bem resolvido

- Busca de atividades, do chat e da supervisão: 1 requisição para 6 teclas digitadas. "Digitando…": 1 `POST` para 40 teclas.
- Busca e filtros de Projetos, Tags e Demandas são feitos na tela: 0 requisições.
- Tempo real por uma única conexão (`/mensagem-direta/eventos`); sair não faz requisição.
- Trocar mês no Ponto, dia nas Execuções e período no Relatório: 1 requisição cada.
- Respostas de listagem enxutas (seção 5).

## 4. Vazamento de dados e isolamento entre perfis

Varredura `21-varredura-api.cjs`: 85 leituras (`GET`) chamadas como administrador, gestor, desenvolvedor, auxiliar e sem login, comparando status, tamanho, chaves e a presença dos marcadores `SEGREDO-*`.

**Nenhum vazamento encontrado.**

- Sem login: 401 nas 85 rotas.
- Desenvolvedor: 403 ou 404 em tudo do projeto de que não participa (demanda, árvore, membros, grafo, atividade, execução, ponto de outro usuário, relatório, justificativas). Nas listagens os filtros `usuarioId` e `projetoId` de terceiros são ignorados e voltam só os dados dele. Nenhum marcador `SEGREDO-*` chegou a ele. Referência do chat a item sem acesso volta `acessivel: false` com os demais campos nulos.
- Conversa direta de terceiros não é legível; a supervisão responde 403 a desenvolvedor e auxiliar.
- Plano privado (sem projeto): 404 para desenvolvedor, auxiliar e gestor, e não aparece na lista deles (`31-plano-isolamento.cjs`).
- Configurações da IA, prompts, custos e estado dos provedores: só administrador.
- Nenhuma resposta tem senha ou hash. O token aparece só na resposta do login.
- Pela interface, URL de gestor digitada por desenvolvedor ou auxiliar redireciona para `/ponto` sem chamar a API da tela.

Comportamentos previstos em `SYSTEM.SPEC.md`, registrados para ciência do autor:

- `GET /modelagem` (24 KB, estrutura do banco) responde a qualquer usuário logado, e a tela abre para o desenvolvedor.
- O auxiliar lê tudo o que o gestor lê em projetos, demandas, atividades, execuções e ponto, e `GET /usuario` (lista com `login` e `tipo`) é aberto a ele.
- `GET /demanda/:id/membro` devolve o `login` dos membros a quem vê a demanda.

### Escrita por perfil

Varredura `32-varredura-escrita.cjs` e `33-escrita-complemento.cjs`: 63 chamadas de escrita como desenvolvedor, auxiliar, gestor e sem login. Corpo vazio onde a trava é por tipo (400 significa que passou da autorização sem gravar) e corpo válido onde a regra é da service.

**Nenhuma escrita indevida.**

- Sem login: 401 em todas.
- Desenvolvedor: 403 ou 404 em tudo que é de gestor e em atividade, execução, demanda, membros, tags e pad de terceiros.
- Auxiliar: bloqueado em usuários, projetos, calendário, justificativas, prioridades, modelagem, relatório, excluir/restaurar demanda, descrição do cliente e pad alheio; liberado no que a spec prevê (editar demanda e atividade alheias, iniciar e registrar execução, membros, tags). Ao criar atividade informando outro dono, a API cria para ele mesmo, sem avisar.
- Gestor: bloqueado no que é só do administrador (Configurações da IA, prompts, preços, prioridades, textos dos tipos).
- Plano privado e mensagem de conversa alheia: 404 para todos os outros, inclusive para editar e reagir.
- Única ressalva: R-16.

Limite: não foram testadas as rotas de IA (`/chat/*`, `/proposta-ia/*`, `/assistente/*`, `/checkin/mensagem`), que dependem de provedor.

## 5. Projeção das respostas

- Listagens usam DTOs de resumo. Textos longos não trafegam em lista: demanda e atividade mandam `temDescricaoTecnica`, `temDescricaoCliente` e `temDocumentacao`.
- Maiores respostas observadas: `/modelagem` 24,2 KB; `/prompt` 15,2 KB; `/ponto/mensal` 8 KB por mês; `/atividade` (lista) cerca de 690 B por item; `/ponto/todos` cerca de 290 B por usuário.
- Não foi observado N+1 no frontend sobre listas (nenhuma tela faz uma requisição por linha). O único padrão de várias requisições por item é o detalhe da demanda (R-02).
- Não verificado: campo a campo, se cada chave devolvida é usada pela tela.

## 6. Pendências

**Impedido pelo ambiente** (sem chave de provedor; IA desligada na configuração do banco de auditoria):

- Chat com a IA: enviar mensagem, streaming, propostas (confirmar, recusar, ajustar, desfazer, em grupo), bom-dia e retomada.
- Conversa do check-in, assistente de descrição, alterar trecho com IA, revisão do relatório (`POST /relatorio/execucao/revisar` respondeu 400), testar e ativar prompt.
- Project Desktop (Electron): janela, bandeja, aviso de atualização e download do instalador (81 MB).
- Chat armazenado em OpenSearch (a auditoria usou Postgres).

**Disponível e não percorrido** (tentado nesta rodada sem o roteiro acertar o controle, ou não tentado):

- Atividades: salvar a cor de uma prioridade.
- Plano: remover fonte, publicar, marcar solo, concluir a ligação a uma demanda.
- Pad: mover trecho entre seções (anexo e "feito" não têm chamada no frontend).
- Chat entre colegas: silenciar conversa.
- Configurações da IA: preço dos modelos. Modelagem: editar tabela.
- Gestor não administrador pela interface (pela API está coberto).
- Restaurar usuário, projeto e tag: não achei "desfazer" na interface para eles; as rotas só passaram pela varredura de escrita.
- Projeção campo a campo (se cada chave devolvida é usada pela tela).

## 7. Como reproduzir

Da raiz do repositório: `node .artifacts/auditoria-requisicoes-telas/start.cjs` (sobe 3015/4215), depois `node .artifacts/auditoria-requisicoes-telas/<roteiro>.cjs`. Os roteiros da fase 2 usam `harness2.cjs` e gravam `<roteiro>.json` (chamadas por ação) e `<roteiro>-corpos.json` (corpos, com token mascarado). `processos.json` guarda os PIDs para encerrar só esse stack.
