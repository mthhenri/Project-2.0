# 221-mensagem-direta-posicao-e-tamanho-do-popup.spec.md

> Task solta, ajuste do chat entre colaboradores (tasks 205 a 220), pedida pelo autor em 2026-10-23: poder **redimensionar** o chat, **movê-lo** pela tela e ter
> uma "posição do chat" preferida (canto esquerdo, canto direito, centro etc.). Especificada e implementada em 2026-10-26 a partir do rascunho; o autor mandou seguir com os padrões
> propostos nos dois pontos em aberto (ver "Decisões").

## Objetivo

O popup do chat (hoje 392×640 fixo no canto inferior direito) passa a ter a posição e o tamanho escolhidos pelo usuário. A **posição preferida** é uma preferência do chat, gravada
na conta; o que o usuário arrasta e redimensiona fica lembrado no navegador.

## Decisões

1. **Preferência na conta:** `posicaoPopup` na preferência do chat (`mensagem_direta_preferencia`). Valores do enum `PosicaoPopupChatEnum` (`shared`): `CANTO_INFERIOR_DIREITO`
   (padrão, o de hoje), `CANTO_INFERIOR_ESQUERDO`, `CANTO_SUPERIOR_DIREITO`, `CANTO_SUPERIOR_ESQUERDO` e `CENTRO`. O padrão mora no `shared`
   (`PREFERENCIA_PADRAO_DA_MENSAGEM_DIRETA`), nunca em `DEFAULT` de coluna; sem valor gravado vale o padrão.
2. **Coluna simples, sem tabela de referência:** a posição não entra em `WHERE`/`JOIN`/FK (a regra de "enum vira tabela de referência" é para enum de coluna que filtra), como o `atalho_global`
   da mesma tabela. `VARCHAR(30)` anulável (as linhas existentes ficam sem valor = padrão), migration nova, a `0050` nunca é editada.
3. **Onde escolher:** só no menu de notificações do chat (o sino do cabeçalho), numa seção "Posição do chat" abaixo do silêncio: a lista das cinco posições (a preferida marcada) e o link
   **Restaurar posição e tamanho**; escolher ou restaurar fecha o menu (ele ficaria no lugar antigo do sino). A seção não aparece na janela de chat do Desktop. Não vai para "Meu perfil" (ponto em aberto do rascunho resolvido: só no chat).
4. **Mover:** arrastar pelo **cabeçalho** de qualquer tela do popup (lista, conversa e nova conversa); botões, campos e links do cabeçalho continuam clicáveis e **não** iniciam arrasto.
   A posição solta é limitada à janela (nunca fica fora dela) e **persiste entre sessões**, em `localStorage` por usuário (conveniência do navegador, não dado de negócio; todo acesso
   dentro de `try/catch`, e sem storage o popup funciona só na sessão).
5. **Redimensionar:** alça no canto **oposto** ao canto da tela mais próximo do popup (o canto da âncora fica parado). Mínimo 360×480, máximo a janela menos a margem de 16 px.
   Tamanho e posição ficam juntos no mesmo registro do `localStorage`.
6. **Precedência:** o que o usuário arrastou/redimensionou vale; sem isso, vale a posição preferida da conta com o tamanho padrão (392×640 limitado à janela). Mudar a posição preferida no
   menu **descarta** o arranjo arrastado (quem escolhe um canto espera ir para ele); **Restaurar** também descarta e volta à preferida.
7. **A janela é redimensionada pelo navegador:** o popup é relimitado à janela a cada `resize` (e na abertura). Nunca some nem passa da margem, também em 1080×1920 e 1366×768.
8. **Fora do popup dentro do Project:** o Project Desktop (`/chat-popup`, `emJanela`) tem janela própria do Electron e **não** usa posição, arrasto nem alça (só o popup dentro do Project).
9. **Lógica pura testável** em `frontend/.../utils/posicao-popup.util.ts`: âncora de cada posição para um tamanho e uma janela, limite (`limitarPopup`), canto mais próximo, redimensionamento
   mantendo o canto da âncora, leitura segura do registro salvo. O componente só liga eventos e aplica o resultado.

## Entregáveis

1. **`shared`:** `PosicaoPopupChatEnum` (`enums/posicao-popup-chat.enum.ts`, exportado); `posicaoPopup` em `MensagemDiretaPreferenciaAlterarDto` (`@IsEnum`, obrigatório: o pedido troca o
   conjunto inteiro), em `MensagemDiretaPreferenciaRecuperadaDto`, em `MensagemDiretaPreferenciaInternoAlterarDto` e em `PREFERENCIA_PADRAO_DA_MENSAGEM_DIRETA`. Aplicar
   `gerenciamento-de-impacto` (`npm run impacto`) nos DTOs de preferência (o Desktop lê `atalhoGlobal` da mesma resposta).
2. **Migration** (a próxima livre na hora; skill `sql-migrations`, com `-- DOWN`): `mensagem_direta_preferencia.posicao_popup VARCHAR(30)` anulável, sem `DEFAULT`; `docs/SCHEMA.md` atualizado.
3. **Backend:** `MensagemDiretaPreferenciaRepository` lê e grava a coluna (`posicao_popup AS "posicaoPopup"`; nula vira o padrão do `shared` na service); a service valida o valor (o DTO já o faz) e
   devolve o padrão quando não há linha. A coluna anulável não vira `null` no DTO: a service completa com o padrão.
4. **Frontend, lógica:** `utils/posicao-popup.util.ts` (decisão 9) com testes.
5. **Frontend, popup:** `app-mensagem-direta-popup` aplica posição e tamanho por *bindings* de estilo (nunca `style=""` fixo nem seletor de ID); arrasto por *pointer events* com captura no
   cabeçalho (`data-popup-arrasto` nos três cabeçalhos; cursor `grab`); alça de redimensionar com `aria-label` e `pTooltip`; relimite no `resize`; registro no `localStorage` por usuário
   (chave versionada). Teclado: a alça é um botão focável e as **setas** a puxam (16 px; 64 px com Shift), para o redimensionar não depender só do mouse. O arrasto não tem teclado: quem não usa
   mouse escolhe a posição no menu (o cabeçalho não é focável).
6. **Frontend, menu de notificações:** seção "Posição do chat" com a lista (cinco posições, rótulos em português) e **Restaurar posição e tamanho**; grava pela mesma ação de preferência
   (`MensagemDiretaAvisosService.alterarPreferencia`), com o estado de erro que as outras opções já têm.
7. **Testes:** `shared` (enum no DTO, padrão), service (padrão sem linha, valor gravado), integração do repository (grava e relê a posição; linha antiga sem valor), lógica pura (cada âncora, limites,
   janela menor que o mínimo, canto mais próximo, redimensionar por cada canto, registro corrompido), componente do popup (arrasto só pelo cabeçalho, limite da janela, alça, restaurar, persistência) e do
   menu (escolher posição descarta o arranjo, restaurar).
8. **Documentação:** `docs/SYSTEM.SPEC.md` (preferência e popup), `docs/SCHEMA.md`, `CONTEXT.md`, `HISTORY.md`.

## Critérios de Aceite

- `npm run test --workspace=shared`, `--workspace=backend`, `--workspace=frontend`, `npm run test:integracao` e os builds do backend e do front passam; `db:rollback` e `db:migrate` da migration
  funcionam; `npm run repo:verificar` passa.
- **Ao vivo** (API real, navegador): escolher cada posição no menu leva o popup para lá; arrastar pelo cabeçalho move e o botão do cabeçalho continua clicando; a alça redimensiona respeitando
  360×480 e a janela; recarregar a página mantém o arranjo; trocar a posição no menu descarta o arranjo; Restaurar volta à preferida; reduzir a janela relimita o popup. Verificar em `1920×1080`,
  `1366×768` e `1080×1920`, nos dois temas.
- **Visual:** comparado com o popup atual (210) e com o menu de notificações (212), que são os análogos aprovados; a alça e o estado de arrasto não podem destoar do restante.
- Sem `ngModel`, `innerHTML`, `title` nem `style=""` inline; tooltip só `pTooltip`.

## Resultado (2026-10-26)

- **Testes:** `shared` 275; `backend` unitário 1502; `npm run test:integracao` 347 (inclui a posição gravada e relida e a linha antiga sem valor); `frontend` 175 arquivos / 2159 testes (14 de lógica pura, 11 do
  popup, 4 novos do menu). Builds do backend e do front passam; a migration `0064` foi aplicada ao banco de desenvolvimento e de teste. Uma rodada completa do `frontend` teve 6 falhas em testes que carregam o
  editor Milkdown (chat, compositor, editor, popup) e todos passaram isolados e numa segunda rodada completa: oscilação sob carga, não regressão. **Não há lint** (`PROBLEMS.md` P-001).
- **Ao vivo** (API real, `gestor.inicial`, navegador): o padrão continua 950,104 → 392×640 em 1366×768; escolher "Canto superior esquerdo" leva o popup para 24,24 e a alça para o canto oposto; arrastar pelo cabeçalho move
  (limitado à janela) e grava `project20:chat-popup:v1:1`; a alça redimensiona com o canto da âncora parado (392×640 para 477×684); o arranjo sobrevive a recarregar a página; um `resize` da janela para 800×500 relimita o
  popup à margem; **Restaurar** volta ao canto preferido e apaga o registro; a preferência gravada na conta foi relida pela API. Conferido em 1366×768 e 1920×1080 (escuro e claro) e 1080×1920 (só a posição).
- **Limites:** o emulador de viewport do painel não dispara o evento `resize` sozinho (o relimite foi provado com o evento disparado à mão e nos testes de componente); o 1080×1920 foi conferido só pela posição, sem captura;
  o Project Desktop (janela `/chat-popup`) não foi aberto (fora de escopo, coberto por teste que garante que ele não tem alça nem arrasto).

## Fora de Escopo

- A janela do Project Desktop (`/chat-popup`) e o tamanho/posição dela (decisão 8).
- Lembrar o arranjo **na conta** (entre dispositivos): fica no navegador; só a posição preferida vai para a conta.
- Fixar/ancorar o popup em outra tela, múltiplas conversas abertas lado a lado, ou modo tela cheia.
- Mudar o conteúdo do popup (lista, conversa, compositor).

## Dependências

`210` (popup), `212` (menu de notificações e preferência) e `213` (o Desktop, que não muda). Fontes: `docs/SCHEMA.md` (`mensagem_direta_preferencia`), skill `sql-migrations`,
`MensagemDiretaAvisosService` (ação de preferência).

## Riscos e Mitigação

- **Popup fora da tela** (janela reduzida, monitor trocado): o relimite no `resize`, na abertura e ao ler o registro salvo garante a janela; teste com janela menor que o registro.
- **Arrasto roubando o clique dos botões do cabeçalho:** o arrasto só começa fora de `button`, `input`, `a` e do que tem `data-popup-arrasto-ignorar`; teste de componente.
- **Registro corrompido ou de outra versão no `localStorage`:** leitura tolerante (valor inválido = sem arranjo), chave versionada.
- **Mudar o DTO de preferência quebrar o Desktop:** o Desktop só lê `atalhoGlobal`; campo novo é aditivo, conferido por `npm run impacto`.
