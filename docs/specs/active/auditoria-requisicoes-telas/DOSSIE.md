# Dossiê — Auditoria de requisições nos fluxos das telas

Spec: `../auditoria-requisicoes-telas.spec.md`. Evidências brutas (ignoradas pelo Git): `.artifacts/auditoria-requisicoes-telas/`.

**Estado: cobertura incompleta, a auditoria continua em `active/`.** O que falta está na seção 6.

## 1. Como foi medido

- Aplicação real num stack isolado: backend na porta 3015, frontend na 4215, banco descartável `project20_auditoria_requests_20261105`, chat em Postgres, IA sem chaves. O stack e o banco do autor (3000/4200, `project20`) não foram tocados.
- Playwright em `1920×1080`, registrando por ação da interface cada chamada a `/api/`: método, URL, status e, na segunda fase, tamanho e formato (chaves) do corpo.
- Duas fases. **Fase 1 (2026-11-05)**: 18 roteiros como administrador, só método/URL/status, banco na migration 0080 (`01-*.json` a `18-*.json`). **Fase 2 (2026-11-11)**: banco migrado até a 0085, checkout com as alterações locais das tasks 276/277, roteiros `19` a `31` com corpo das respostas, perfis desenvolvedor e auxiliar e varredura da API por perfil.
- Dados de teste só no banco de auditoria (`20-fixtures.cjs`): 13 usuários, 2 projetos (um deles sem o desenvolvedor de teste), 7 demandas, 14 atividades, conversas diretas e marcadores `SEGREDO-*` nos textos do que o desenvolvedor não pode ver.
- "Observado" é o que apareceu no tráfego. "Hipótese" é leitura de código não exercitada. Cada achado diz qual é.

Limites: uma só resolução (a auditoria é de tráfego, não visual); volume pequeno, então custo por item foi medido mas não tempo de resposta sob carga; rotas de escrita não foram varridas por perfil (seção 4).

## 2. Matriz de cobertura

Legenda: ✅ percorrido com tráfego registrado · ◐ parcial · ⛔ impedido pelo ambiente · ✗ não percorrido.

| Tela | Fluxos percorridos | Estado | Roteiros |
|---|---|---|---|
| Login e sessão | login (3 perfis), carga inicial, logout, repouso, foco e aba oculta | ✅ | 19, 22, 23, 25 |
| Usuários | abrir, criar, buscar, filtrar, paginar, editar, inativar/reativar, senha, excluir, ajuda dos tipos | ✅ | 01, 02, 14, 17, 18 |
| Usuários › anotações do usuário | — | ✗ | — |
| Projetos | abrir, criar, editar, buscar, filtrar por status, trocar status, aba Volume, vigência do volume | ✅ | 03, 13, 30 |
| Demandas | abrir, criar, editar, excluir, selecionar, abas, membro, conexão (criar/remover), status, busca, filtro, Grafo, Controle de horas, trocar projeto | ✅ | 04, 13, 15, 17, 23, 30 |
| Atividades | abrir, paginar, buscar, criar, excluir, prioridade, status, tags da linha, descrição da linha, detalhe | ◐ (sem ação em massa, sem restaurar) | 05, 15, 17, 24, 26 |
| Execuções | iniciar e encerrar (detalhe e lista), registrar, editar descrição, excluir, dia anterior, filtro Minhas e por usuário, atualizar | ✅ | 06, 09, 12, 28, 29, 30 |
| Ponto | abrir (gestor e desenvolvedor), escolher usuário, trocar mês, justificativa (criar/excluir), imprimir | ✅ | 06, 14, 17, 23 |
| Documentações e pad | abrir, selecionar demanda, gravar texto, editar pad, abrir/fechar drawer | ◐ (sem anexo, sem mover/feito, sem trecho com IA) | 07, 10 |
| Calendário | abrir, criar, editar, excluir | ✅ | 09 |
| Tags | abrir, buscar, criar, editar, excluir | ✅ | 03, 30 |
| Relatório | abrir, mês/ano, baixar CSV | ◐ (revisão com IA ⛔) | 12 |
| Chat com a IA | abrir, histórico, lista de demandas | ⛔ envio, propostas, bom-dia, retomada | 07, 23, 28 |
| Plano | criar, renomear, gravar, ponto (criar/resolver), fonte (criar), arquivar, atribuir projeto | ◐ (sem remover fonte, publicar, solo, excluir) | 11, 16 |
| Chat entre colegas | abrir, nova conversa, buscar, enviar, digitando, reagir, preferências | ◐ (sem editar, responder, silenciar, referências) | 10, 24 |
| Supervisão do chat | abrir, abrir conversa, buscar, só com código | ✅ | 30 |
| Configurações da IA | abrir, abas, salvar nova versão, rascunho de prompt, custos | ◐ (ativar/testar prompt ⛔, preço ✗) | 07, 16, 17 |
| Modelagem | abrir, buscar, zoom, grupo (criar/editar/excluir) | ◐ (sem editar tabela) | 12, 17 |
| Check-in (`/checkin`) | abrir sem execução | ⛔ conversa do check-in | 18, 19 |
| Chat popup (`/chat-popup`) | abrir | ◐ | 19 |
| Perfil | menu, cor do avatar, tema, sair | ◐ (download do Desktop ✗) | 25, 30 |
| Perfil desenvolvedor | menu inteiro, URLs de gestor digitadas à mão, fluxos de atividade/execução/demanda/chat | ✅ | 19, 23–29 |
| Perfil auxiliar | menu inteiro, URLs de gestor digitadas à mão | ◐ (só navegação) | 27 |
| Perfil gestor (não administrador) | só pela API | ◐ | 21 |

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
- **Causa:** hipótese, não confirmada: o `onLazyLoad` inicial da tabela somado à restauração dos filtros salvos.

### R-05 · Média · Listas carregadas com teto fixo e sem paginação: acima do teto, itens somem em silêncio

- **Observado:** seletores e painéis pedem uma página só: `/usuario?itensPorPagina=100`, `/projeto?itensPorPagina=100`, `/demanda?projetoId&itensPorPagina=200`, `/atividade?demandaId&itensPorPagina=100`, `/execucao?atividadeId&itensPorPagina=200`. Para a mesma finalidade (lista de usuários de um seletor) a tela de Execuções usa `allRows=true` e as de Atividades, Ponto e Demandas usam `itensPorPagina=100`.
- **Impacto:** hipótese: com mais de 100 usuários, 100 projetos ou 200 demandas num projeto, o excedente não aparece e nada avisa. É o caso de "requisição a menos". Não foi exercitado com esse volume.
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

### R-11 · Baixa · Depois de excluir uma demanda, a tela pede a demanda excluída

- **Observado:** `DELETE /demanda/2` 200 seguido de `GET /demanda/2` 404 (roteiro 17).

### R-12 · Baixa · Texto de uma demanda na linha da atividade traz a demanda inteira

- **Observado:** o ícone "Descrição técnica" da linha faz `GET /demanda/:id`, que devolve os três textos (roteiro 24).

### R-13 · Informativo · Primeira mensagem de uma conversa nova recarrega a lista duas vezes

- **Observado:** `POST /mensagem-direta/mensagem` seguido de 2× `GET /mensagem-direta/conversas` (roteiro 10). Em conversa já existente não há recarga (roteiro 24).

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

Limite: só leituras foram varridas. A autorização das rotas de escrita por perfil não foi testada aqui.

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

**Disponível e não percorrido:**

- Restaurar itens excluídos (usuário, projeto, demanda, atividade, tag, calendário).
- Ação em massa nas atividades; anotações de um usuário pela tela de Usuários.
- Pad: anexo, mover, marcar feito.
- Plano: remover fonte, publicar, solo, vincular demanda, excluir.
- Chat entre colegas: editar, responder, silenciar, referências a demanda e atividade.
- Configurações da IA: preço dos modelos; editar prioridades; editar a ajuda dos tipos de usuário; editar tabela na Modelagem.
- Perfis auxiliar e gestor não administrador: fluxos de escrita pela interface.
- Varredura de autorização das rotas de escrita por perfil.
- Causa de R-04 e exercício de R-05 com volume acima do teto.

## 7. Como reproduzir

Da raiz do repositório: `node .artifacts/auditoria-requisicoes-telas/start.cjs` (sobe 3015/4215), depois `node .artifacts/auditoria-requisicoes-telas/<roteiro>.cjs`. Os roteiros da fase 2 usam `harness2.cjs` e gravam `<roteiro>.json` (chamadas por ação) e `<roteiro>-corpos.json` (corpos, com token mascarado). `processos.json` guarda os PIDs para encerrar só esse stack.
