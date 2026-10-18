# Task 139 — Chat: tela do chat do dia

> Origem: guarda-chuva [`rework-chat-ia.spec.md`](rework-chat-ia.spec.md), bloco 5 (5 de 6) e "Fluxo do desenvolvedor", item 1.

## Objetivo

A tela onde o usuário conversa com a IA: mensagens do dia em Markdown, resposta chegando aos poucos, nível usado em cada resposta e
**cartões de proposta** com Confirmar, Ajustar, Recusar e Desfazer. Esta task entrega a tela e o mecanismo; o conteúdo específico dos
cartões de cada tipo (iniciar execução, criar atividade etc.) vem com os executores dos blocos 6, 8 e 9.

## Entregáveis

### 1. Backend (pequeno)

- `GET /ia/disponibilidade` para **qualquer usuário autenticado**, devolvendo só o `EstadoIaEnum` (a rota `GET /ia/estado` continua
  exclusiva do administrador). A tela do chat e, depois, o fallback do bloco 10 leem daqui.

### 2. Frontend (módulo `chat`)

- Rota `/chat`, item "Chat" na barra lateral (`pi-comments`, tecla `g` + letra livre, a definir na task: `c` já é do Calendário),
  visível para todos os tipos de usuário. **Não vira a tela inicial do login** (isso é o bloco 6/10).
- **Mensagens** do dia (`GET /chat/hoje`), do usuário à direita e da IA à esquerda, texto da IA no `app-markdown-visualizador`; cada
  resposta mostra o **nível** (rápido, padrão, analítico) só para leitura.
- **Entrada:** caixa de texto; `Enter` envia, `Shift+Enter` quebra linha; desabilitada enquanto a IA responde, com botão de enviar.
- **Streaming:** `fetch` com leitura do fluxo SSE (`POST /chat/mensagem`); a resposta cresce aos poucos, a tela rola junto se o usuário
  estiver no fim e o evento `ferramenta` mostra "consultando…". Erro (evento `erro`) aparece como mensagem do sistema, com "Tentar de novo".
- **Cartão de proposta** genérico: título pelo tipo, resumo dos dados, estado (pendente, confirmada, ajustada, recusada, desfeita,
  expirada) e os botões coerentes com o estado (Confirmar/Ajustar/Recusar na pendente; Desfazer na confirmada ou ajustada, com o toast de
  Desfazer padrão do projeto). "Ajustar" abre um formulário simples dos dados da proposta, **desenhado por tipo quando o executor existir**;
  até lá, o cartão mostra os dados e só oferece Confirmar e Recusar.
- **Busca** no histórico (`GET /chat/busca`) por um campo no cabeçalho, com resultados em lista e "ver no dia".
- **Estados:** carregando (esqueleto), vazio (conversa do dia sem mensagens), IA desligada (aviso, entrada desabilitada, mensagens antigas legíveis),
  IA fora do ar (só avisa e deixa tentar: o estado só se recupera com uma chamada bem-sucedida) e erro de rede.
- Análogo visual registrado na task (candidato: a tela do Pad, pela densidade e pelo uso do Markdown).

### 3. Documentação

- `docs/SYSTEM.SPEC.md` (§ de telas) e `docs/context/`.

## Critérios de Aceite

- Conversa de ponta a ponta na aplicação real com a Anthropic: pergunta, resposta aos poucos, F5 e a conversa continua lá.
- Proposta de teste (criada por uma ferramenta de teste) aparece como cartão e confirmar, recusar e desfazer mudam o estado sem
  recarregar a página.
- Com a IA desligada pela tela de Configurações, a entrada fica desabilitada com o aviso; ligar de novo (e esperar o estado) a reabilita.
- `1920×1080`, `1366×768` e `1080×1920`, temas claro e escuro, estados vazio, carregando, cheio, erro e IA fora do ar.
- Builds passam; frontend sem testes e sem lint declarado; testes de backend da rota nova.

## Fora de Escopo

- Os formulários de ajuste e o resumo bonito de cada tipo de proposta (blocos 6, 8 e 9), o bom dia proativo e o chat como tela inicial.
- O fallback automático para as telas convencionais (bloco 10) e o aviso "a IA voltou".
- Voz, anexos e edição ou exclusão de mensagens.

## Dependências

Depende da **138** (rotas e eventos), da **136** (rotas de proposta) e das telas de Pad e Configurações (análogo). Bloqueia a 140.

## Riscos e Mitigação

- **Cartão desatualizado** (a proposta foi resolvida em outro lugar): toda ação trata 409 recarregando o cartão pelo `GET /proposta-ia/:id`.
- **Mensagem longa e rolagem**: não rolar para o fim se o usuário subiu para ler; um botão "ir para o fim" aparece nesse caso.
