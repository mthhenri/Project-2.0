# 209-mensagem-direta-tempo-real.spec.md

> Task 5/11 da guarda-chuva [`chat-colaboradores.spec.md`](../backlog/chat-colaboradores.spec.md). Modelagem em
> [`chat-colaboradores/modelagem.md`](../backlog/chat-colaboradores/modelagem.md) (§9). Depende da [`208`](../done/208-mensagem-direta-service-e-api.spec.md).

## Objetivo

Entregar ao destinatário, em tempo real, a mensagem enviada e a marcação de leitura (o "Lida"), e dizer quem está online. A API é tratada como **várias instâncias**: a mensagem
enviada numa instância chega ao destinatário conectado em outra. O front (210) consome este stream e recupera o que perdeu ao reconectar.

## Entregáveis

1. **Contrato dos eventos no `shared`** (`MensagemDiretaEventoDto`, união discriminada por `tipo`): `MENSAGEM` (a mensagem pronta), `LEITURA` (conversa, quem leu e até quando),
   `PRESENCA` (uma pessoa ficou online ou offline), `ABERTURA` (primeiro evento do stream: quem está online agora), `SINCRONIZAR` (o cliente deve reler uma conversa, ou todas, quando
   `conversaId` é `null`), `BATIMENTO` e `ENCERRANDO` (a API vai fechar o stream; reconecte). `ConversaDiretaResumoDto` ganha `online`.
2. **Porta `PublicadorDeEventosDiretos`** (token + interface) com duas implementações, escolhida por **`CHAT_EVENTOS`** (`memoria`, padrão, ou `postgres`; valor desconhecido derruba a subida):
   - `PublicadorEmMemoria` (desenvolvimento, uma instância).
   - `PublicadorPostgres` (produção): `LISTEN`/`NOTIFY` do PostgreSQL num canal próprio, sem broker novo. A conexão de escuta é dedicada (`pg.Client`), reconecta sozinha com espera
     crescente e, ao voltar, manda `SINCRONIZAR` (todas as conversas) aos streams locais, porque o que passou durante a queda não se recupera. O `NOTIFY` tem limite de 8.000 bytes e a
     mensagem pode ter 10.000 caracteres: se o evento não cabe, vai um `SINCRONIZAR` da conversa no lugar da mensagem (o cliente já sabe reler).
3. **Registro local de conexões** (`ConexoesDeEventosDiretos`): por usuário, vários streams (abas e Desktop). Entrega a quem está conectado nesta instância; escrever em stream que o
   cliente fechou é ignorado.
4. **Presença compartilhada**: cada instância publica periodicamente (e a cada mudança) o conjunto de usuários que têm stream aberto **nela**; todas guardam o último conjunto de cada instância
   com validade (3 batimentos). Online é a união dos conjuntos válidos: uma instância que cai deixa de contar sozinha (a expiração é conferida a cada 5 s). A escuta do `postgres` tem um vigia (`PING` a si mesma; sem eco em 60 s, recicla a conexão). Mudanças viram `PRESENCA` para os streams locais.
5. **`GET /mensagem-direta/eventos`** (`text/event-stream`, qualquer usuário autenticado, `fetch` com cabeçalho): abre com `ABERTURA`, batimento a cada 25 s, remove a conexão ao fechar.
6. **A service publica**: ao enviar uma mensagem **nova** (não o reenvio), `MENSAGEM` para remetente e destinatário (as outras abas do remetente também recebem); ao marcar como lida, `LEITURA`
   para as duas pessoas. A falha do publicador **não** falha a operação (a mensagem já está gravada): vira log, e o cliente recupera ao reconectar. `listarConversas` passa a trazer `online`.
7. **Encerramento ordenado**: `enableShutdownHooks` no `main.ts`; ao parar, a API envia `ENCERRANDO`, fecha os streams e para os temporizadores e a escuta. Sem isso o `close()` do servidor
   esperaria os streams para sempre.
8. **Testes** unitários (codificação e limite do `NOTIFY`, presença com relógio injetado, registro de conexões, configuração, controller e service), de integração (**duas instâncias do publicador
   Postgres** conversando por um banco real) e a verificação ao vivo abaixo. Documentação: `.env.example`, `docs/SYSTEM.SPEC.md`, `CONTEXT.md`, `HISTORY.md`, `MEMORY.md`.

## Critérios de Aceite

- `npm run test --workspace=backend`, `npm run test:integracao`, `npm run test --workspace=shared` e `npm run build --workspace=backend` passam.
- **Ao vivo, duas instâncias da API** (portas diferentes, mesmo banco, `CHAT_EVENTOS=postgres`): A, ligado na instância 1, envia a B, ligado na instância 2, e B recebe `MENSAGEM` pelo stream; B marca como
  lida e A recebe `LEITURA`; a presença de B aparece para A e some quando B fecha o stream; matar uma instância faz os usuários dela saírem de online nas outras em até ~80 s; `SIGTERM` numa instância
  entrega `ENCERRANDO` e encerra o processo sem travar. Repetido com `CHAT_EVENTOS=memoria` (uma instância).
- `npm run repo:verificar` passa. `CLAUDE.md` e `AGENTS.md` continuam idênticos.

## Fora de Escopo

- O cliente do stream (reconexão com espera, recuperação do que perdeu): é a 210. Aviso de menção e notificações: 212. Presença "em reunião": fica para depois (exige o horário final da suspensão).
- Eventos da supervisão (214). Broker externo (Redis, Kafka). Proxy reverso e orquestração do contêiner (só documentados).

## Dependências

`208` (em `done/`). Fontes: `modelagem.md` §9, `ChatController`/`EventStreamResponse` (padrão de `text/event-stream`).

## Riscos e Mitigação

- **Evento perdido na queda da escuta:** não se recupera; por isso o `SINCRONIZAR` ao reconectar e a releitura do cliente. Nenhuma mensagem se perde (elas estão gravadas), só o aviso instantâneo.
- **`NOTIFY` acima de 8.000 bytes:** mandar referência (`SINCRONIZAR`) em vez de truncar.
- **Presença presa após queda de instância:** a validade do conjunto (75 s) a limpa; é aceito atraso nesse caso.
- **Streams que impedem o desligamento:** `ENCERRANDO` e fechamento explícito no gancho de parada; o contêiner precisa de tempo de graça maior que o intervalo de reconexão do cliente.
- **Carga:** um stream por aba; com o time pequeno, o custo é desprezível. `pg_notify` vai por uma conexão do pool e a escuta usa uma conexão fixa a mais.
