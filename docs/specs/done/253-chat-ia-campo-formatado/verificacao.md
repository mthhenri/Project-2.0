# Verificação — 253 Campo formatado no chat da IA

Verificada ao vivo em 2026-10-26 com o stack real (backend NestJS, SPA Angular e PostgreSQL 16 local, `CHAT_ARMAZENAMENTO=postgres`), Playwright com o Chromium
pré-instalado. Capturas em `.artifacts/253-chat-ia-campo-formatado/` (ignorada pelo Git); este texto basta para o veredito.

## Cenário

Desenvolvedor `matheus.henrique` na rota `/chat`. A IA não tem chave neste ambiente: ela responde "Configuração da IA inválida", então a verificação vai até o
envio e o histórico, que é o escopo (nenhuma resposta da IA foi avaliada).

## Resultado

| Item | Resultado |
|---|---|
| Digitar `**análise**`, `` `cadastro` ``, `1. ` e `- ` | Aprovado: aparecem formatados enquanto se digita (negrito, código, lista com marcadores e numerada) |
| `Shift+Enter` | Abre novo parágrafo; `Enter` dentro da lista continua a lista (verificado também nos testes) |
| Selecionar o texto (`Ctrl+A`) | A barra flutuante aparece sobre a seleção (B, I, S, código, lista, numerada, citação) e acende o que já vale; sem seleção não aparece |
| `Ctrl+Enter` e `Enter` | Enviam; o campo esvazia; a mensagem aparece no histórico **formatada** (negrito, link, lista, itálico) no balão azul |
| Contador e limite | Contador a partir de 3.200 ("3.300 / 4.000"); acima de 4.000 mostra "Passou do limite da mensagem", o botão Enviar desabilita e o `Enter` não envia (nenhuma mensagem nova) |
| Palavra longa sem espaço | Quebra dentro do campo, sem empurrar o botão de enviar |
| IA desligada | Campo apagado, não editável, placeholder "A IA está desligada" |
| Modo Planejamento sem plano aberto | Campo apagado e não editável, placeholder "Abra um plano para conversar" |
| `1920×1080`, `1366×768`, `1080×1920` | Aprovados (campo, histórico formatado e contador) |
| Tema escuro (1366×768) | Aprovado: o histórico formatado e o campo seguem o tema |
| `/chat?mensagem=` (task 252) com o campo novo | Texto pré-digitado, sem enviar, com o foco no editor |

## Limites e achados

- **Achado só na verificação:** o `Enter` passava pelo limite de 4.000 caracteres (o botão estava desabilitado, mas o `enviar()` chamado pelo teclado não
  checava). Corrigido em `enviar()` e coberto por teste.
- Não verificado: a janela do Desktop (Electron); o `/chat-popup` do chat entre colaboradores foi coberto só pelos specs existentes, que seguem verdes depois da
  extração do componente; resposta real da IA (sem chave).
- A mensagem do usuário agora é Markdown no histórico: texto antigo com `*`, `_` ou `#` no começo da linha passa a ser interpretado. É o mesmo
  renderizador do resto do sistema.
- Não há lint no projeto (P-001).
