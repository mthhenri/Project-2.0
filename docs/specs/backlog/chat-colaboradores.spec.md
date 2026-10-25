# chat-colaboradores.spec.md

> Guarda-chuva do chat entre colaboradores (o "zap" interno do Project). Origem: conversa com o autor em 2026-10-21. **Não é uma
> task implementável**: registra as decisões e quebra o trabalho nas tasks **205–215**. Cada task ganha a sua spec antes de ser
> implementada, como nas demais guarda-chuvas. A modelagem completa está em [`chat-colaboradores/modelagem.md`](chat-colaboradores/modelagem.md).

## Objetivo

Colaboradores conversam entre si, um a um, sem sair do trabalho: num popup dentro do Project e numa janela flutuante do Project
Desktop aberta por **atalho global**, de qualquer programa. O caso de uso central é a conversa em silêncio durante reunião e a
dúvida de código: o usuário copia um trecho, aperta o atalho, escolhe a pessoa e envia, com o código já em bloco copiável. Gestor e
administrador leem as conversas dos desenvolvedores numa área separada, com aviso aos envolvidos.

## Decisões (autor, 2026-10-21)

1. **Conversa um a um.** Todo usuário conversa com todo usuário (desenvolvedor, gestor, administrador).
2. **Conteúdo da mensagem:** Markdown, bloco de código copiável, menção `@pessoa` (gera aviso) e referência `#demanda` ou
   atividade (vira cartão clicável). Anexos e imagens ficam fora da primeira versão.
3. **Popup, não tela cheia.** Dentro do Project é um popup; **fora** do Project é uma janela do Project Desktop aberta por atalho global
   configurável. O Desktop lê a área de transferência **só quando o atalho é apertado**: se houver código, abre numa mensagem nova com o
   trecho colado em bloco, e o usuário confere antes de enviar. A feature de atalho e de leitura da área de transferência é do Desktop; no
   navegador fica só o popup interno.
4. **Avisos:** notificação de mensagem nova (no Project e no Desktop) que o usuário pode **desativar**, e silêncio temporário (ex.:
   1 hora, para reunião). Contador de não lidas e silenciar por conversa.
5. **Supervisão:** gestor e administrador leem as conversas **entre desenvolvedores**, numa **área separada** (item **Supervisão do
   chat** na barra lateral, no grupo **IA**, conforme a task 223; o mockup de 2026-10-21 a punha num grupo "Gestão"), somente leitura e com
   **aviso aos envolvidos** (mensagem do sistema na própria conversa, no máximo uma por leitor e dia, mais um registro de auditoria).
   Conversa que envolve gestor ou administrador, **inclusive com um desenvolvedor**, é **privada** entre as duas pessoas (a mesma
   regra das ferramentas do chat da IA, task 201). A elegibilidade é decidida na hora da leitura, pelo tipo atual dos usuários.
6. **Armazenamento no padrão do chat da IA:** contrato único, escolhido por `CHAT_ARMAZENAMENTO`: **OpenSearch** no desenvolvimento,
   **PostgreSQL provisório** na produção de teste (sai com as tabelas provisórias do chat da IA) e **Elasticsearch** na produção
   final, com a mesma suíte de contrato. O estado que muda (até onde cada pessoa leu, preferências, auditoria da supervisão) fica em
   tabelas permanentes do PostgreSQL.
7. **Produção em contêineres** (API, front, PostgreSQL e Elasticsearch). A API é tratada como **várias instâncias**: o tempo real passa
   por um publicador compartilhado (`LISTEN/NOTIFY` do PostgreSQL) desde o início, e o cliente reconecta e recupera o que perdeu.
8. **Mockups** feitos e validados com o autor (10 telas estáticas e uma versão clicável); ver "Referências".

## Fatos do código que sustentam o recorte (2026-10-21)

- Não existe conversa entre pessoas: o módulo `chat` é só o chat com a IA. O armazenamento dele vive atrás do contrato
  `ArmazenamentoDeChat` (`backend/src/modules/chat/repositories/`), com três implementações e uma suíte de contrato única (tasks 135, 162
  e 163). O contrato é por usuário e por dia (`<usuarioId>-<yyyy-mm-dd>`), contexto `CHAT`/`CHECKIN` e soma de tokens: não serve a
  conversa entre pessoas, que precisa de índice próprio.
- O stream do chat da IA usa `POST` com `text/event-stream`, porque `EventSource` não envia o cabeçalho de autorização. O stream de
  mensagens usa `fetch` com o cabeçalho, mas é `GET` e de longa duração.
- O Project Desktop já tem a janelinha do check-in (task 160: sem moldura, sempre por cima, arrasta pelo topo, carrega uma rota do front) e
  a ponte `preload`; a decisão da janela fica em funções puras testáveis. O executável não se atualiza sozinho (task 198 só avisa).
- O desenvolvedor só vê projetos por `demanda_usuario` e o gestor tem acesso por tipo (total). A supervisão do chat segue o tipo de
  usuário, não `demanda_usuario`.
- As ferramentas do gestor que leem o chat da IA (task 201) leem só o de **desenvolvedor**; a regra já existe para o pad (task 195).
- A última migration era a `0049`; a `0050` (task 205) cria as tabelas do chat e a próxima livre é a `0051`. As tabelas provisórias do chat da IA (`0038`) saem numa migration de remoção
  futura, e a provisória das mensagens diretas sai junto.

## Modelagem

Resumo (detalhes, DDL, campos, API e fluxos em [`chat-colaboradores/modelagem.md`](chat-colaboradores/modelagem.md)):

- **Conversa:** `conversa_id = <menorUsuarioId>-<maiorUsuarioId>`, sem tabela de conversa.
- **Mensagem:** documento imutável num **índice próprio** (`mensagem_id` gerado pelo cliente, `conversa_id`, `participantes`, autor
  `USUARIO`/`SISTEMA`, `texto` em Markdown, `contem_codigo`, `mencoes`, `referencias`, `created_date`).
- **PostgreSQL:** `mensagem_direta_leitura` (até onde cada pessoa leu e silêncio por conversa), `mensagem_direta_preferencia` (avisos, Desktop,
  som, silêncio temporário e atalho) e `mensagem_direta_supervisao` (auditoria da leitura pelo gestor).
- **Contrato:** `ArmazenamentoDeMensagemDireta` com `gravar` idempotente, `listarConversa` paginada, `listarConversasDoUsuario`,
  `contarNaoLidas`, `buscar` e `listarTodasConversas` (supervisão, excluindo gestores e administradores).
- **Tempo real:** stream de eventos (`mensagem`, `leitura`, batimento) por um publicador compartilhado.

## Tasks

| # | Task | Escopo | Depende de |
|---|---|---|---|
| 205 | [Fundação](../done/205-mensagem-direta-fundacao.spec.md) | `shared` (enums, DTOs, limites e padrões), migration `0050` com as três tabelas, `docs/SCHEMA.md` | — |
| 206 | [Contrato e armazenamento em índice](../done/206-mensagem-direta-armazenamento-em-indice.spec.md) | `ArmazenamentoDeMensagemDireta`, OpenSearch e Elasticsearch, suíte de contrato | 205 |
| 207 | [Armazenamento PostgreSQL provisório](../done/207-mensagem-direta-armazenamento-postgres-provisorio.spec.md) | tabela provisória, implementação na suíte de contrato e plano de remoção | 206 |
| 208 | [Service e API](../done/208-mensagem-direta-service-e-api.spec.md) | enviar, listar, ler, silenciar, buscar, preferências, permissões; testes de service e de repository | 205, 206 |
| 209 | [Tempo real](../done/209-mensagem-direta-tempo-real.spec.md) | stream de eventos, publicador compartilhado (`LISTEN/NOTIFY`) e em memória, presença, encerramento ordenado | 208 |
| 210 | [Popup no Project](../done/210-mensagem-direta-popup-no-project.spec.md) | lista, conversa, nova mensagem, busca, vazio, erro e tema escuro; reconexão com recuperação | 208, 209 |
| 211 | [Composer](../done/211-mensagem-direta-compositor.spec.md) | Markdown, bloco de código, menção e referência a demanda | 210 |
| 212 | [Avisos no Project](../done/212-mensagem-direta-avisos-no-project.spec.md) | notificação, contador, silêncio e desligar | 210 |
| 213 | [Project Desktop](../done/213-mensagem-direta-project-desktop.spec.md) | janela de chat, atalho global, área de transferência, aviso com o app oculto; versão nova do executável | 209, 210 |
| 214 | Supervisão | rotas, auditoria, aviso aos envolvidos e a tela do gestor (item "Supervisão do chat" no grupo IA da barra lateral) | 208, 210, 223 |
| 215 | Verificação de ponta a ponta | duas instâncias da API, queda e volta do stream, deploy simulado, Elasticsearch e PostgreSQL provisório | 209–214 |

**Ordem:** 205 → 206 (e 207 em paralelo à 208) → 208 → 209 → 210 → 211, 212, 213 e 214 (independentes entre si). A 215 fecha a guarda-chuva.

## Critérios de Aceite da guarda-chuva

- As 11 tasks em `docs/specs/done/`; `docs/SCHEMA.md`, `CONTEXT.md`, `HISTORY.md` e `MEMORY.md` atualizados.
- Ao vivo, com duas pessoas: enviar, receber em tempo real, marcar como lida e ver o "Lida", reenviar uma mensagem que falhou sem duplicar,
  buscar por texto e por código, mencionar e abrir o cartão de uma demanda.
- Ao vivo no Desktop: copiar um trecho de código em outro programa, apertar o atalho, escolher a pessoa e enviar; o aviso aparece com o
  Project oculto e some com o silêncio ou com o aviso desligado.
- A supervisão lista e abre conversas entre desenvolvedores, grava a auditoria e avisa os dois; uma conversa que envolve gestor ou
  administrador não aparece na lista e responde 403 se aberta pela rota.
- Duas instâncias da API: a mensagem enviada por uma chega ao destinatário conectado na outra, e um stream derrubado reconecta sem perder
  mensagem.
- A suíte de contrato passa nas três implementações de armazenamento.
- Testes rodados e relatados à parte dos de falha preexistente; a lacuna de lint (P-001) declarada.

## Fora de Escopo

- Grupos, canais por projeto ou demanda, anexos e imagens, editar e apagar mensagem, "digitando" avançado, chamadas de voz.
- A IA resumir conversa ou propor atividade a partir dela.
- Integração específica com editores (extensão do VS Code); o atalho funciona de qualquer programa pela área de transferência.
- Push com o Project Desktop fechado e aplicativo mobile.
- Backup e réplica do Elasticsearch (decisão de infraestrutura).

## Riscos e Mitigação

- **Dados sensíveis na área de transferência:** só se lê ao apertar o atalho, o trecho aparece para conferência antes do envio e há aviso
  explícito; nada é lido em segundo plano.
- **Conversa privada legível por gestor:** o popup avisa de forma permanente que gestores podem ler as conversas entre desenvolvedores, e
  cada leitura avisa os envolvidos e fica auditada.
- **Várias instâncias da API:** o publicador em memória falharia em silêncio; por isso o compartilhado entra junto com o stream e a 215
  exercita duas instâncias.
- **Quedas no deploy:** reconexão com espera crescente e recuperação das mensagens posteriores à última recebida.
- **Histórico só no Elasticsearch:** perder o volume apaga as conversas; recomendar snapshot periódico antes da produção.
- **Mensagens no mesmo milissegundo** de duas pessoas podem ordenar de forma arbitrária, mas estável (desempate por `mensagem_id`); caso aceito.

## Pontos em aberto (padrão proposto; confirmar na spec de cada task)

- Tamanho máximo da mensagem: 10.000 caracteres.
- Atalho guardado no servidor, por usuário (alternativa: só no Desktop).
- Presença "Em reunião até hh:mm" vindo da suspensão do check-in, se o horário final estiver disponível; senão online, ausente e offline.
- Mensagens do sistema para o aviso de leitura: no máximo uma por leitor, conversa e dia.

## Referências

- Mockups do autor (canvas, 10 telas estáticas e a versão clicável): https://claude.ai/artifact/JQkb7bumajjm3BqoNaKjkZ
- Página de modelagem desta conversa: https://claude.ai/artifact/1nancYy8CUwKHAFqimCFhW

  Os dois links são privados e podem deixar de existir; a fonte durável é [`chat-colaboradores/modelagem.md`](chat-colaboradores/modelagem.md).
