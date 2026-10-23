# 219-mensagem-direta-digitando.spec.md

> Task solta, ajuste do chat entre colaboradores (tasks 205 a 218), pedida pelo autor em 2026-10-23: o "digitando…". No mesmo dia o autor
> pediu pequenos ajustes de acabamento, registrados em "Ajustes da mesma sessão". Responder mensagem é a 220 e posição/tamanho do popup é a 221
> (backlog): mexem em armazenamento e em preferência, não cabem aqui.

## Objetivo

Quem conversa vê, no cabeçalho da conversa e na linha da lista, que a outra pessoa está digitando.

## Decisões

1. **Efêmero.** Nada é gravado: o aviso é um evento do stream (`DIGITANDO`) entregue só à outra pessoa, nunca a quem digita. Não há tabela, migration
   nem mudança no armazenamento das mensagens.
2. **Quem digita avisa a API:** `POST /mensagem-direta/conversa/:usuarioId/digitando` (qualquer usuário autenticado; o `usuarioId` é a outra pessoa;
   valida como as demais rotas da conversa: existir e ser outra pessoa). O cliente avisa no máximo a cada **3 s** por pessoa; falha de rede é ignorada.
3. **Quem vê:** o aviso vale **5 s** (mais que o intervalo, para não piscar) e cada novo aviso renova; a mensagem da pessoa o apaga na hora; queda e
   volta do stream o limpa. Cabeçalho da conversa: "digitando…" no lugar de Online/Offline; lista: "digitando…" no lugar da prévia.
4. **O que conta como digitar:** tecla que insere ou apaga texto e colagem. Texto posto por programa (código do Desktop, limpar depois de enviar)
   **não** avisa.
5. **Várias instâncias:** o evento passa pelo mesmo publicador (`memoria` ou `postgres`); o decodificador do barramento aceita `DIGITANDO`.

## Ajustes da mesma sessão (pedidos do autor)

- Barra flutuante do campo: tooltips com o atalho (`Negrito (CTRL+B)`, `Itálico (CTRL+I)`, `Tachado (CTRL+ALT+X)`, `Código em linha (CTRL+E)`,
  `Lista (CTRL+ALT+8)`, `Lista numerada (CTRL+ALT+7)`, `Citação (CTRL+SHIFT+B)`, todos conferidos nas keymaps do Milkdown), `</>` sem quebrar em duas
  linhas e separador entre texto e listas.
- Aviso de mensagem nova no Project renderiza o Markdown (altura de ~3 linhas, fim esmaecido); a notificação do sistema do Desktop segue em texto.
- A prévia da última mensagem na lista renderiza o Markdown em uma linha; mensagem com código segue `[código]`.
- Som do aviso: pico de 0,12 para 0,30.
- Botão **Copiar** em cada mensagem (aparece com o mouse sobre ela): copia o Markdown como foi escrito.
- Pacote inicial do front: o diálogo de anotações do topbar (que arrastava o editor de Markdown) passou a carregar por `@defer`; fecha o P-032
  (1,10 MB para 0,96 MB). `montarComponente` dos testes passou a chamar `TestBed.compileComponents()` (necessário para `@defer` em teste).

## Critérios de Aceite

- Testes: `shared` 214, `backend` 1285 (inclui `avisarDigitacao`, a rota e o barramento), `frontend` 1757 (inclui o novo spec da conversa: aparece, expira,
  renova, some com a mensagem, avisa uma vez por 3 s; copiar; Markdown no aviso). Builds do backend e do front passam.
- **Pendente:** verificação ao vivo (duas sessões, 1920×1080, 1366×768 e 1080×1920) e a conferência visual da barra e do cartão; ver HISTORY.

## Fora de Escopo

Responder mensagem (220); posição, tamanho e arrasto do popup (221); "digitando" em grupo (não há grupos).
