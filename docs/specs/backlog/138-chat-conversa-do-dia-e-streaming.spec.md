# Task 138 — Chat: conversa do dia, laço da IA e streaming

> Origem: guarda-chuva [`rework-chat-ia.spec.md`](rework-chat-ia.spec.md), bloco 5 (4 de 6): "streaming obrigatório", "uma conversa
> por dia" e níveis de modelo.

## Objetivo

Receber a mensagem do usuário, conversar com a IA (nível rápido, com as ferramentas do usuário e o prompt `CONVERSA` ativo),
**transmitir a resposta enquanto é gerada**, gravar tudo no OpenSearch e permitir reabrir a conversa do dia (F5, queda, outro
aparelho). Sem tela (task 139).

## Entregáveis

### 1. Shared

- DTOs de entrada (`ChatMensagemEnviarDto`: texto) e de saída (conversa do dia, resultado de busca, `ChatMensagemResumoDto` da 135) e
  o **evento de streaming** tipado: `trecho` (texto parcial), `ferramenta` (nome e situação, para a tela mostrar "consultando…"),
  `proposta` (id da proposta criada), `fim` (mensagem final gravada, com nível, modelo e tokens) e `erro` (mensagem traduzida).

### 2. Backend (módulo `chat`)

- `ChatService.enviarMensagem(usuario, dto, emitir)`:
  1. grava a mensagem do usuário (`autor = USUARIO`, `contexto = CHAT`) **antes** de chamar a IA, para nunca se perder;
  2. monta o histórico da conversa do dia a partir de `conteudo_bruto` (blocos no formato do provedor, inclusive chamadas de ferramenta),
     limitado às **últimas 40 mensagens** do dia;
  3. chama `IaService.transmitir` no nível `RAPIDO`, com o `CONVERSA` ativo (`PromptService.obterAtivo`) e as ferramentas do usuário
     (`FerramentaIaRegistro.listarParaUsuario`);
  4. **laço de ferramentas** (máximo de 8 voltas): quando o modelo pede uma ferramenta, executa, devolve o resultado e continua;
     toda ferramenta de proposta emite o evento `proposta`;
  5. grava a mensagem da IA (`autor = IA`) com `nivel`, `modelo`, tokens de entrada, saída e cache, `conteudo_bruto`, e `proposta_id`
     quando houver; emite `fim`.
- Falha da IA (`IaException`): emite `erro` com a mensagem de `traduzirFalhaDeIa`, grava uma mensagem `SISTEMA` e não deixa
  proposta pendente órfã; a mensagem do usuário já está salva.
- Rotas (usuário autenticado, qualquer tipo): `POST /chat/mensagem` (resposta `text/event-stream`), `GET /chat/hoje` (mensagens da
  conversa do dia) e `GET /chat/busca?texto=&inicio=&fim=` (só as mensagens do próprio usuário). Como o `@Sse` do Nest é só GET, o
  controller usa a resposta direta com um helper de fluxo (`EventStreamResponse`), mantendo o controller fino.
- **A IA desligada ou fora do ar** responde 409 com a mensagem da `IaException`, sem gravar mensagem de IA.
- **Concorrência:** uma mensagem por conversa por vez; um segundo envio com o anterior em andamento responde 409.
- Testes (node:test, IA e repository falsos): ordem das gravações, laço com ferramenta, limite de 8 voltas, limite de 40 mensagens,
  falha no meio do streaming, proposta emitida e referenciada, 409 de concorrência, conversa do dia na virada de dia e fuso.
- **Verificação real** (a chave existe): uma conversa curta com a Anthropic, com a ferramenta `consultar_data_e_hora`, conferindo o
  streaming incremental e as mensagens no OpenSearch.

### 3. Documentação

- `docs/SYSTEM.SPEC.md` (rotas, eventos e regras de conversa) e `docs/context/`.

## Decisões assumidas (podem ser trocadas antes de implementar)

1. **SSE sobre `POST`** (o navegador usa `fetch` com leitura do fluxo), porque `EventSource` só faz `GET` e não envia o cabeçalho de
   autorização. WebSocket fica fora por exigir outra infraestrutura sem ganho aqui.
2. **Janela de 40 mensagens** do dia como contexto; a memória de longo prazo está nos dados (atividades, execuções, pad), não no chat.
3. **O texto do prompt `CONVERSA`** continua o seed curto da 131; refiná-lo é feito pelo administrador na tela, e as tasks dos blocos 6 e
   9 propõem o texto quando adotarem as ferramentas.

## Critérios de Aceite

- Mandar uma mensagem recebe os trechos aos poucos (vários eventos `trecho` antes do `fim`) e o texto concatenado é o da mensagem gravada.
- Recarregar (`GET /chat/hoje`) devolve a conversa inteira, na ordem, inclusive depois de uma chamada de ferramenta.
- Com a IA desligada, `POST /chat/mensagem` responde 409 e nenhuma mensagem de IA é gravada.
- Um usuário nunca lê nem busca mensagens de outro.
- Testes de `shared` e `backend` e builds passam; frontend sem alteração.

## Fora de Escopo

- A tela (139), o teste de prompts (140) e as ferramentas de negócio (blocos 6 e 9).
- **Check-in** (`contexto = CHECKIN`) e o bom dia proativo: o contexto existe no modelo, mas só o bloco 7 o usa.
- Escolha de nível acima do rápido por mensagem: o chat conversa no nível rápido; o nível padrão e o analítico entram quando as
  ferramentas pesadas existirem (blocos 6 e 9), e cada resposta já guarda o nível usado.

## Dependências

Depende de **130** e **131** (em `done/`), **135** (repository), **136** (propostas) e **137** (ferramentas). Bloqueia a 139 e a 140.

## Riscos e Mitigação

- **Streaming atrás do proxy do Angular/dev**: conferir que o fluxo não é bufferizado no `proxy.conf.json` e nos cabeçalhos
  (`Cache-Control: no-cache`, `X-Accel-Buffering: no`).
- **Cliente que fecha a conexão no meio**: a geração continua até o fim e a mensagem é gravada (senão o histórico fica sem a resposta
  que o modelo já gerou).
- **Custo**: cada turno pode virar várias chamadas (laço de ferramentas); o limite de voltas e `MAXIMO_TOKENS` por chamada são fixos
  no código e aparecem na documentação.
