# 318 — Posição da barra de conversas, engrenagem de configurações e "voltar ao atual"

> Pedido do autor em 2026-11-06, ao ver a barra de bolinhas (task 312) à esquerda ("não ficaria melhor do lado direito?" / "no Whats é na esquerda, mas posso
> colocar como algo configurável"). Task da guarda-chuva `chat-colaboradores-evolucao.spec.md`, feita **antes da 313**.

## O que muda para o usuário

- A barra de bolinhas da conversa aberta pode ficar **à esquerda** (padrão, como hoje), **à direita**, **acima** ou **abaixo** da conversa. Acima e abaixo viram uma fileira horizontal
  (rola de lado quando não cabe).
- No **fim da barra** (embaixo na vertical, no fim da fileira na horizontal) há uma **engrenagem** que abre o menu de configurações do chat: as mesmas seções do sino da lista
  (notificações, silêncio, posição do popup) mais a nova seção **"Barra de conversas"** com as quatro posições (uma marcada). O sino da lista continua, com o mesmo menu.

- **Voltar ao atual (pedido do autor na mesma sessão):** quando a pessoa sobe na conversa (200 px ou mais acima do fim), aparece uma setinha para baixo, redonda, no canto inferior
  direito da área de mensagens; clicar rola suave até a mensagem mais recente e a setinha some. Some também ao trocar de conversa. Só front (sem modelagem): `longeDoFim` e `irParaOAtual`
  no `MensagemDiretaConversaComponent`, com o botão numa área nova (`conversa-direta__area`) que envolve a rolagem.

## Modelagem (decidida pelo autor em 2026-11-06: no banco)

Antes: a barra é sempre à esquerda e nada guarda a escolha. Depois: coluna **`posicao_barra`** (`VARCHAR(30)`, anulável) em `mensagem_direta_preferencia` (migration **0081**: sem DEFAULT, sem
trigger; linha anterior fica sem valor e vale o padrão do `shared`), no mesmo molde da `posicao_popup` (task 221). `shared`: enum `PosicaoBarraChatEnum` (`ESQUERDA`, `DIREITA`, `ACIMA`, `ABAIXO`),
campo `posicaoBarra` nos quatro DTOs de preferência (Alterar, Alterada, InternoAlterar, Recuperada) e `PREFERENCIA_PADRAO_DA_MENSAGEM_DIRETA.posicaoBarra = ESQUERDA`. A rota `PUT /mensagem-direta/preferencia`
já troca o conjunto inteiro, então ganha o campo (obrigatório no pedido). Nenhum contrato de armazenamento muda.

## Implementação

- Backend: `MensagemDiretaPreferenciaRepository` (coluna no SELECT, INSERT e UPDATE) e `MensagemDiretaService` (padrão quando nulo; repassa o campo). `docs/SCHEMA.md`.
- Frontend: `MensagemDiretaAvisosService` envia o campo; `app-mensagem-direta-barra` recebe a posição (orientação, lado da borda, lado do tooltip) e traz a engrenagem; o popup põe a barra antes ou
  depois da conversa conforme a posição; o menu (`app-mensagem-direta-notificacoes`) ganha a seção e passa a ter dois gatilhos (sino/engrenagem). Análogo visual: o menu "Notificações" e a seção "Posição do chat".

## Testes e verificação

`shared` (enum, DTO, padrão), `backend` (service: padrão e repasse; integração do repository), `frontend` (barra nas quatro posições, engrenagem abre o menu, seção grava a escolha, serviço envia o
campo). Ao vivo nos cinco formatos e dois temas, nas quatro posições. `npm run lint:tudo`, `npm run repo:verificar`.

## Fora de escopo

Posição da barra na lista completa (só existe na conversa aberta); arrastar a barra.

## Verificação (2026-11-06)

- **Testes:** `shared` 318 (2 novos: enum/DTO e padrão), `backend` 1664 (service: padrão com coluna nula e repasse), integração `npm run test:integracao` 374 (repository e service gravam e leem `posicao_barra`;
  Postgres 16 local, migration 0081 aplicada), `frontend` 2565 em 209 arquivos (novos: util da posição, barra nas quatro posições e engrenagem, seção do menu, setinha em 4 cenários).
  `npm run lint:tudo` limpo; build do frontend e do backend sem erro novo.
- **Ao vivo** (Postgres local, `CHAT_ARMAZENAMENTO=postgres`, gestor × quatro desenvolvedores, 40 mensagens): as quatro posições em 1920×1080 e 720×1280 (claro) e 1366×768 (escuro),
  mais a posição à direita em 1366×768, 1080×1920 e 960×1080; medidas das caixas conferidas (barra de 52 px de largura ou altura, conversa ocupando o resto); engrenagem no fim da barra abre o menu
  "Configurações do chat" com a seção nova; escolher "Abaixo" mudou a barra na hora e gravou `ABAIXO` no servidor; a setinha apareceu ao subir, o clique levou a 0 px do fim e a escondeu.
  Capturas em `.artifacts/318/` (ignorada pelo Git).
- **Limites:** o Project Desktop (janela de chat sem moldura) não foi exercitado; a barra à direita/acima/abaixo na janela do Desktop usa o mesmo componente. Estado de erro do servidor na gravação é coberto só
  por teste de componente. O check de leitura (✓) do item marcado no menu fica colado ao texto, igual ao da "Posição do chat" já existente.
