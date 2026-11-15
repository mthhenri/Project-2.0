# 415-chat-evento-sincronizar-rele-so-o-que-mudou.spec.md

> Task 87/135 da guarda-chuva `requisicoes-e-permissoes-correcoes.spec.md`. Origem: achados A-110, A-111, A-112 do dossiê `docs/specs/active/revisao-requisicoes-e-permissoes/DOSSIE.md`; auditoria anterior: R-13.
> Severidade: Média. Área: frontend/mensagem-direta e backend/mensagem-direta. **Tem decisão do autor pendente** (seção própria): não implementar antes dela.

## Objetivo

Fixar uma mensagem, renomear um grupo ou mudar os membros de uma demanda deixa de fazer cada membro reler a lista de conversas, a página de mensagens e as fixadas, de repetir a leitura no próprio autor e de descartar o histórico que a pessoa tinha rolado.

## Contexto

**A-110 · Média · `SINCRONIZAR` é um único evento de "relê tudo": fixar uma mensagem faz cada membro reler lista, mensagens e fixadas**

Todo `SINCRONIZAR` dispara `GET /mensagem-direta/conversas` e, se a conversa ou o grupo do evento está aberto, também a página de mensagens e `GET /grupo/:id/fixadas`. O backend usa esse evento para mudanças pequenas: fixar/desafixar (só as fixadas mudam) e entrada/saída em demanda (só a lista muda, mas com `conversaId: null` a conversa direta aberta também é relida). Quem fixou ainda pede as fixadas duas vezes: uma depois do POST e outra pelo evento.

Evidência no código (linhas de 2026-11-13; confira antes de editar):

- frontend/src/app/modules/mensagem-direta/services/mensagem-direta-estado.service.ts:761-765 — `case 'SINCRONIZAR'`: `carregarConversas()` sempre; `carregarConversaAberta()` e `grupoEstado.carregarGrupoAberto()` quando `conversaId` é null ou é o aberto
- frontend/src/app/modules/mensagem-direta/services/mensagem-direta-grupo-estado.service.ts:193 e :204 — `carregarGrupoAberto` pede `listarMensagens` e depois `carregarFixadas`
- frontend/src/app/modules/mensagem-direta/services/mensagem-direta-grupo-estado.service.ts:232-237 — `alternarFixada` descarta a resposta do POST/DELETE e chama `carregarFixadas`
- backend/src/modules/mensagem-direta/services/grupo-fixada.service.ts:59 e :71 — `if (criada) await this.sincronizar(grupo.grupoId, membrosIds)` e o mesmo ao desafixar
- backend/src/modules/mensagem-direta/services/grupo-fixada.service.ts:105-106 — publica `{ tipo: 'SINCRONIZAR', conversaId: G<id> }` para todos os membros
- backend/src/modules/mensagem-direta/services/canal-membros-observador.service.ts:24 — `SINCRONIZAR` com `conversaId: null` para quem entrou ou saiu da demanda

Como observar: Popup do chat com dois usuários conectados no mesmo grupo; um deles fixa uma mensagem. Rede de quem fixou: POST /mensagem-direta/grupo/N/fixadas/ID, GET .../fixadas e, pelo evento, GET /mensagem-direta/conversas, GET .../grupo/N/mensagens, GET .../fixadas. Rede do outro: GET /conversas, GET .../mensagens, GET .../fixadas (só GET /conversas se o grupo não estiver aberto).

Verificação na auditoria: código, por um auditor; linhas citadas conferidas pelo agente principal.

**A-111 · Média · Criar ou alterar grupo, adicionar membros e sair: a resposta já traz o grupo, mas o eco `SINCRONIZAR` relê tudo no próprio autor**

A resposta de `POST /grupo`, `PATCH /grupo/:id` e `POST /grupo/:id/membros` já é aplicada na lista local. O backend inclui o autor entre os destinatários do `SINCRONIZAR`, e o cliente dele pede `GET /conversas` de novo e, com o grupo aberto (inclusive na tela de detalhes), também mensagens e fixadas. A ordem entre o evento e a resposta HTTP não foi observada, então a repetição de mensagens/fixadas na criação depende de qual chega primeiro.

Evidência no código (linhas de 2026-11-13; confira antes de editar):

- frontend/src/app/modules/mensagem-direta/services/mensagem-direta-grupo-estado.service.ts:519-521 — `criarGrupo` insere `resposta.dados.grupo` na lista
- frontend/src/app/modules/mensagem-direta/services/mensagem-direta-grupo-estado.service.ts:528-529 e :537-538 — `alterarGrupo` e `adicionarMembros` usam `substituirNaLista(resposta.dados.grupo)`
- backend/src/modules/mensagem-direta/services/grupo.service.ts:157 e :165 — `membrosIds = [usuarioAtivo.sub, ...convidados]` e `sincronizar(grupo.grupoId, membrosIds)` na criação
- backend/src/modules/mensagem-direta/services/grupo.service.ts:253, :290 e :311-312 — `sincronizar` ao alterar, ao adicionar e ao sair ("Quem saiu também sincroniza")
- frontend/src/app/modules/mensagem-direta/services/mensagem-direta-estado.service.ts:762-765 — o evento relê lista e grupo aberto; o comentário da :764 diz que as mensagens do sistema já chegam por `MENSAGEM`

Como observar: Popup → abrir um grupo → Detalhes → mudar o nome e salvar. Rede: PATCH /mensagem-direta/grupo/N seguido de GET /mensagem-direta/conversas, GET .../grupo/N/mensagens e GET .../grupo/N/fixadas. Ao criar um grupo: POST /mensagem-direta/grupo, GET mensagens, GET fixadas e um GET /conversas a mais.

Verificação na auditoria: código, por um auditor; linhas citadas conferidas pelo agente principal.

**A-112 · Média · `SINCRONIZAR` descarta o histórico já carregado da conversa ou do grupo aberto**

`carregarConversaAberta` e `carregarGrupoAberto` substituem todas as mensagens do servidor pela página mais nova e trocam o cursor. Isso é intencional na reconexão, mas o mesmo caminho roda quando alguém fixa uma mensagem, renomeia o grupo ou muda os membros de uma demanda. Quem rolou para cima e carregou páginas antigas perde essas páginas; o efeito na rolagem não foi observado ao vivo.

Evidência no código (linhas de 2026-11-13; confira antes de editar):

- frontend/src/app/modules/mensagem-direta/services/mensagem-direta-estado.service.ts:352-354 — comentário: as mensagens do servidor são substituídas pela página nova
- frontend/src/app/modules/mensagem-direta/services/mensagem-direta-estado.service.ts:367-372 — `atual.mensagens.filter(situacao !== 'ENVIADA')` mais a página nova; `proximoCursor: pagina.proximoCursor`
- frontend/src/app/modules/mensagem-direta/services/mensagem-direta-grupo-estado.service.ts:196-201 — mesma substituição no grupo
- frontend/src/app/modules/mensagem-direta/services/mensagem-direta-estado.service.ts:763 e :765 — chamados em todo `SINCRONIZAR` da conversa aberta ou com `conversaId` null
- backend/src/modules/mensagem-direta/services/grupo-fixada.service.ts:59 — origem corriqueira do evento (fixar)

Como observar: Abrir um grupo com histórico longo, rolar para cima até aparecer GET .../grupo/N/mensagens?cursor=..., e pedir a outro usuário que fixe uma mensagem. Rede: novo GET .../mensagens sem cursor; na tela, as páginas antigas deixam de estar carregadas.

Verificação na auditoria: código, por um auditor; linhas citadas conferidas pelo agente principal.

## Decisão do autor pendente

A correção completa dá um motivo ao evento, que é contrato (`MensagemDiretaEventoDto`).

**Antes:** todo `SINCRONIZAR` dispara `GET /mensagem-direta/conversas` e, com a conversa ou o grupo aberto, as mensagens e `GET /grupo/:id/fixadas`; o autor da mudança recebe o eco e relê também; a releitura substitui as mensagens pela página mais nova.

**Opções:**

1. O evento ganha um motivo (fixadas, lista, grupo) e o cliente relê só o que mudou.
2. Só front: pular o eco da própria mutação e, fora da reconexão, não substituir o histórico carregado (mesclar ou não reler mensagens).

Recomendação da auditoria: opção 2 já resolve o autor e o histórico; a 1 resolve os demais membros.

## Entregáveis

1. No front (`mensagem-direta-estado.service.ts` e `mensagem-direta-grupo-estado.service.ts`): o eco da própria mutação é ignorado quando a resposta HTTP já foi aplicada; a substituição das mensagens fica só para a reconexão.
2. Na opção 1: o motivo no evento, publicado pelo backend em cada caso e tratado no cliente.
3. Testes dos dois services de estado para cada motivo.

## Critérios de Aceite

- Ao vivo com duas sessões no mesmo grupo: fixar uma mensagem gera, no outro membro, só `GET /grupo/:id/fixadas` (opção 1) e nunca apaga o histórico rolado; no autor, nenhuma releitura.
- Testes e build dos workspaces tocados e `npm run lint:tudo` sem erro novo.

## Fora de Escopo

Qualquer outro achado do dossiê; cada um tem a sua spec.

## Dependências

Decisão do autor acima.

