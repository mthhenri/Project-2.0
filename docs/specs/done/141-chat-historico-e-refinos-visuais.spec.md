# Task 141 — Chat: histórico de conversas e refinos visuais

> Origem: pedido do autor depois da task 139 ([`rework-chat-ia.spec.md`](../backlog/rework-chat-ia.spec.md), bloco 5, extensão). Usa o
> número 141 porque era o próximo livre; os blocos 6, 7, 9 e 10 serão numerados a partir da 142.

## Objetivo

Tirar o cabeçalho da tela do chat ("Chat" e "conversa de hoje" repetem o menu) e dar à tela um **histórico**: um painel à direita, que
recolhe, com a busca e a lista das conversas de todos os dias, cada uma abrindo só para leitura. Junto, os refinos de apresentação
pedidos: hora de cada mensagem, copiar a resposta da IA e estado vazio com as sugestões no meio.

## Entregáveis

### 1. Shared

- `ChatConversaResumoDto` (`conversaId`, `data` `yyyy-mm-dd`, `primeiraMensagem`, `quantidadeDeMensagens`, `ultimaMensagemDate`),
  `ChatConversasListadasDto` (`conversas`) e `ChatConversaRecuperarDto` (`data`, validada como `yyyy-mm-dd`).

### 2. Backend

- `GET /chat/conversas`: as conversas do próprio usuário, da mais recente para a mais antiga, até 100 (agregação por `conversa_id`
  filtrada pelo dono; sem tabela nova).
- `GET /chat/conversa/:data`: a conversa de qualquer dia do próprio usuário, no mesmo formato de `GET /chat/hoje`. O dono vem sempre do
  token: pedir um dia sem mensagens devolve a lista vazia, nunca a conversa de outro.
- Testes: consulta de agregação (domínio), repositório com cliente falso, service (dono e formato).

### 3. Frontend

- Sem cabeçalho. Painel **Histórico** à direita: recolhe/expande (lembrado em `localStorage`), busca no topo (resultados no próprio
  painel, "ver no dia" para qualquer dia) e a lista de conversas ("Hoje", "Ontem", dia da semana e data) com o trecho da primeira mensagem.
- Abrir um dia antigo: conversa só para leitura, aviso "Conversa de dd/MM/yyyy" com "Voltar para hoje"; sem entrada nem sugestões.
- Hora (`HH:mm`) embaixo de cada mensagem; botão de copiar no texto da IA (aparece ao passar o mouse ou receber foco) com toast.
- Estado vazio com avatar, texto e as sugestões no meio da tela (rodapé sem sugestões enquanto a conversa estiver vazia).
- Análogo: o próprio chat da 139 e o painel de histórico da aba de Prompts (task 133).

### 4. Documentação

- `docs/SYSTEM.SPEC.md` (rotas e tela), `docs/context/`.

## Critérios de Aceite

- Conversa de hoje + um dia antigo criado para o teste: a lista mostra os dois, abrir o antigo é só leitura, "Voltar para hoje" volta.
- Busca no painel acha mensagem de dia antigo e abre o dia dela.
- Recolher o painel dá a largura de volta à conversa e o estado sobrevive ao F5.
- `1920×1080`, `1366×768`, `1080×1920`, claro e escuro. Builds e testes do backend passam; frontend sem testes e sem lint (P-001).

## Fora de Escopo

- Painel "Execuções de hoje" e "Meu pad" ao lado do chat (dependem dos blocos 6 e 8; o autor ainda decide se entram).
- Excluir, renomear ou fixar conversas; paginação além de 100 dias.
- Separador de dia dentro da conversa (cada conversa é um dia só).

## Dependências

139 (tela do chat) e 135 (repositório de mensagens).
