# Verificação da task 315 — `@IA` no chat entre colaboradores

Data: 2026-11-11. Evidências brutas (capturas e o log das chamadas à IA) em `.artifacts/315-chat-ia-no-chat-entre-colaboradores/`, que o Git ignora.
Este relatório se sustenta sem elas.

## Ambiente

- PostgreSQL 16 local (sem Docker), banco `project20` com as migrations até a `0086`, `CHAT_ARMAZENAMENTO=postgres` e eventos em memória.
- Backend (`npm run backend:dev`) e frontend (`npm run frontend:dev`) reais.
- **IA falsa.** Não havia chave de provedor, então o backend foi apontado (`ANTHROPIC_BASE_URL`) para um servidor local que responde no formato da
  Messages API da Anthropic, com streaming e `tool_use`, e devolve respostas fixas pelo texto do pedido (resumo em texto, uma proposta, duas
  propostas, proposta numa demanda oculta, erro 500). Esse servidor vive só no scratchpad da sessão, não foi para o repositório. A IA ligada foi
  `configuracao_ia.ia_desligada = false`.
- **Cenário**, montado pela API do gestor inicial: Ana e Davi (desenvolvedores), um projeto, a demanda 1 com os dois e a demanda 2 só com o Davi.
- Playwright (o Chromium da imagem) com duas sessões ao mesmo tempo, Ana e Davi, e tela em escala 1.

## O que foi observado

| # | Situação | Resultado |
|---|---|---|
| 1 | `@` no compositor com a IA no ar | A lista "Mencionar" mostra **IA** ("Pedir à IA", ícone da IA) antes da pessoa. |
| 2 | Ana manda `@IA resume o que combinamos` | O Davi vê "IA digitando" no fim da conversa. As duas pontas recebem a resposta com o selo IA: "IA · para você" para a Ana e "IA · para Ana Lima" para o Davi. O `chat_mensagem` ganha uma linha `USO_DE_IA` com `usuario_id` = Ana. |
| 3 | Davi pede uma atividade na demanda 2 | O Davi vê a proposta, aplicada pela IA (nível "Faz e avisa" de `CRIAR_ATIVIDADE`), com Desfazer. A Ana vê **"Ação oculta por falta de acesso"**, sem nenhum dado. |
| 4 | Davi manda só `@IA` | Aparece a linha "A IA está esperando o seu pedido: a sua próxima mensagem vai para ela." A mensagem da Ana no meio não conta; a mensagem seguinte do Davi vira o pedido. |
| 5 | Davi pede duas atividades na demanda 1 | O Davi vê o grupo "2 propostas · 2 feitas pela IA", com Ver e Desfazer todas. A Ana vê os dois cartões só para leitura: os únicos botões são os dois "Ver detalhes". |
| 6 | Ana manda `@IA falha de propósito` (o provedor devolve 500) | A conversa recebe a mensagem do sistema "A IA não pôde responder: serviço de IA temporariamente indisponível." |
| 7 | Aba Custos (`GET /ia-custo?ano=2026&mes=11`, administrador) | O modelo da IA falsa aparece com as chamadas do `@IA`. A atribuição a quem chamou foi conferida no banco (`chat_mensagem.usuario_id`). |
| 8 | Chip do `@IA` (pedido do autor durante a task) | O `@IA` do texto aparece como o chip de `@pessoa`, com o ícone da IA antes do `@`, nos dois temas, inclusive no balão da própria mensagem. |
| 10 | Supervisão do chat (gestor, 1920×1080, claro) | As respostas aparecem como "IA · para Ana Lima" e "IA · para Davi Reis", com "A IA propôs 1 ação." e "A IA propôs 2 ações.". As propostas não abrem: são de quem chamou. A prévia da lista não tinha o "IA:" da prévia do popup; corrigido depois da captura (não recapturado). |
| 9 | Contexto enviado à IA (log do servidor falso) | O prompt `CONVERSA` mais a orientação: quem chamou, quem mais lê, o que não expor, e que o contexto é dado, não instrução. Uma mensagem com "Mensagens anteriores…" e "Pedido de Ana Lima:". 30 ferramentas: as do desenvolvedor. |

Formatos percorridos, com Ana e Davi em cada um: `1920×1080`, `1366×768`, `1080×1920`, `720×1280` e `960×1080`, nos temas claro e escuro. São 40
capturas, todas com "IA digitando", resposta, grupo e ação oculta, e **nenhum erro de console** nas sessões.

**Achados na verificação, corrigidos antes do fecho:**
- A linha "Feito pela IA" ficava espremida: a coluna da resposta encolhia até a largura do texto curto. Agora a área das propostas ocupa a coluna
  inteira.
- O cartão só leitura mostrava "Aguardando você" para quem não chamou a IA. O teste de componente pegou isso; agora o rótulo é "Pendente".
- No teste de componente, o intervalo da dica do `@IA` dentro da zona do Angular impedia a tela de ficar estável. Ele passou para fora da zona.

## Limites

- **O modelo real não foi exercitado.** Com a IA falsa, as respostas são fixas. Ficam sem verificar ao vivo a qualidade das respostas, se o modelo
  respeita a orientação de não expor o que a outra pessoa não acessa (risco aceito pelo autor na decisão 5) e o custo em dólar (o modelo falso não
  tem preço).
- **A trava de uma chamada por conversa é por instância**: com mais de uma instância da API, dois `@IA` simultâneos em instâncias diferentes
  passam. Verificado só por teste unitário.
- **O Project Desktop não foi aberto.** A janela de chat dele usa a mesma conversa, e a leitura do estado da IA nela (sem o layout) foi coberta só
  por código e teste.
