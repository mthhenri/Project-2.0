# 218-mensagem-direta-editor-formatado.spec.md

> Task solta, melhoria do compositor do chat entre colaboradores (task 211), pedida pelo autor em 2026-10-23. Segunda de duas (a 217 já
> enxugou o rodapé). Reaproveita o editor que escreve já formatado da task 134 (`EditorFormatado`, Milkdown), o mesmo do Pad.

## Objetivo

O campo de mensagem passa a **escrever já formatado**, como o Pad: negrito aparece em negrito enquanto se digita, `- ` vira lista com
marcadores e `1. ` vira lista numerada, e `Ctrl+B` / `Ctrl+I` funcionam. Não há barra de formatação fixa: uma barra pequena aparece
**sobre o texto selecionado** (como um menu de contexto). O texto da mensagem continua sendo Markdown puro, sem mudança no servidor nem no
renderizador.

## Decisões (autor, 2026-10-23)

1. Editor que escreve formatado, no molde do Pad; a barra de formatação só aparece ao selecionar texto.
2. **Sem sublinhado:** o Markdown não tem, e o renderizador compartilhado não muda (nada de `Ctrl+U`).
3. O aviso de leitura e a legenda já saíram do rodapé (task 217).

## Fatos do código (2026-10-23)

- `EditorFormatado` (`shared/components/markdown-editor/markdown-formatado.ts`) é um invólucro do Milkdown sem Angular: já traz as regras de
  digitação do `commonmark`/`gfm` (listas, negrito, itálico, código, citação, título), `Ctrl+B`/`Ctrl+I`, desfazer e a serialização para
  Markdown. O `app-markdown-editor` o usa com barra fixa e `Enter` inserindo linha, que não serve ao chat (Enter envia).
- O compositor atual é um `<textarea>` e toda a sua lógica de `@`/`#` (`detectarGatilho`, `aplicarEscolha`, `mencoesPresentes`,
  `referenciasPresentes`) já é **pura sobre strings** em `compositor.util.ts`; o que muda é de onde vem o texto e o cursor.
- O renderizador próprio (`interpretarMarkdown`) trata `\n` dentro do parágrafo como quebra e **não** entende a quebra dura `\` + `\n` do
  Markdown: por isso `Shift+Enter` cria um **novo parágrafo** (ou novo item de lista) e nunca uma quebra dura.
- O Electron não implementa `window.prompt`: o botão de link do editor atual não serve na janela do Desktop, então o link fica fora.

## Entregáveis

1. **Capacidades novas no `EditorFormatado`** (só acréscimos; os consumidores atuais não mudam): `blocoAtual()` (texto do bloco do cursor,
   cursor nele e posição do bloco no documento), `substituirNoBlocoAtual(inicio, fim, texto)`, `inserirTexto`, `inserirBlocoDeCodigo(codigo,
   linguagem)`, `dividirBloco()` (novo parágrafo ou item), `contextoDoCursor()` (em lista, em código ou em citação), `textoSelecionado()`,
   `limpar()` e `retanguloDaSelecao()` (para posicionar a barra). Com teste de jsdom no `markdown-formatado.test.ts`.
2. **`app-mensagem-direta-editor-mensagem`**: hospeda o editor (carregado sob demanda, como no Pad), com `placeholder`, altura que cresce até
   um máximo e rola, estilos do conteúdo formatado compartilhados com o `app-markdown-editor` (parcial SCSS, sem copiar) e a **barra flutuante
   da seleção** (negrito, itálico, tachado, código em linha, lista, lista numerada, citação), que só aparece com texto selecionado e o foco no
   editor, acende o que já vale na seleção e não rouba o foco ao clicar.
3. **Compositor sobre o editor formatado**, com o mesmo contrato de saída (`EnvioDoCompositor`: texto em Markdown, menções e referências):
   - `Enter` envia; `Shift+Enter` cria novo parágrafo (novo item dentro de lista); `Ctrl+Enter` envia sempre. Dentro de **lista** e de **bloco
     de código** o `Enter` não envia: continua a lista (item vazio sai da lista) e quebra a linha do código.
   - `@` e `#` com as mesmas sugestões, setas, `Enter`/`Tab` para escolher, `Esc` para fechar e o espaço automático; o texto escolhido
     entra como texto comum (`@Nome`, `#Nome`) e só vão no envio as menções e referências cujo texto ainda está na mensagem.
   - Colar várias linhas com cara de código vira bloco de código; o botão `</>` e o painel da task 216 inserem o bloco **com a linguagem** na
     posição do cursor (trocando a seleção, se houver); o atalho do Desktop (`codigoInicial`) segue entrando como bloco, sem enviar.
   - O limite de 10.000 caracteres vale para o Markdown gerado: um contador aparece perto do limite e o envio é bloqueado acima dele.
   - Campo e botões de código e de enviar nunca saem da linha (o editor tem `min-width: 0` e quebra palavra longa).
4. **Dicas atualizadas:** `placeholder`, dica do botão de enviar ("Enviar (Enter) · Shift+Enter nova linha") e dica da barra com os atalhos.

## Critérios de Aceite

- Testes: `markdown-formatado.test.ts` (cada capacidade nova), spec do `app-mensagem-direta-editor-mensagem` (barra só com seleção, botões
  aplicam e acendem, foco preservado) e o spec do compositor reescrito sobre o editor (Enter, Shift+Enter, Ctrl+Enter, lista e código, `@`,
  `#`, espaço automático, colagem de código, painel de código com linguagem, atalho do Desktop, limite, menções e referências no envio).
  `npm run test --workspace=frontend` e `npm run build --workspace=frontend` verdes (a falha de carga conhecida do `markdown-editor`
  relatada à parte).
- Ao vivo, na aplicação real: digitar `**oi**`, `- a`, `1. a`, `Ctrl+B`/`Ctrl+I`, selecionar texto e usar a barra, `@` e `#` com escolha,
  colar código, bloco pelo painel, `Shift+Enter` em lista e fora dela, enviar e ver a mensagem **igual** no chat (negrito, lista, código com a
  linguagem, menção destacada); `1920×1080`, `1366×768`, `1080×1920` e a rota `/chat-popup` em 420×640; tema claro e escuro; campo vazio,
  uma linha, várias linhas, palavra longa sem espaço e perto do limite. Comparar a barra e o conteúdo com o análogo aprovado (o Pad).

## Fora de Escopo

- Sublinhado (`Ctrl+U`), link, título e tabela pela barra; imagens e anexos.
- Mudar o renderizador, o servidor, o `shared` ou o `app-markdown-editor` (além de extrair seus estilos para um parcial compartilhado).
- Editar uma mensagem já enviada; mudar a task 214 (supervisão) ou 215 (verificação de ponta a ponta).
- Resolver o relato de a barra "comer" os botões ao digitar, que não foi reproduzido no navegador (task 217): o novo campo é refeito com
  `min-width: 0`, e o caso é conferido de novo ao vivo.

## Dependências

- Tasks 134 (editor formatado), 211 (compositor), 216 (mini editor de código) e 217 (rodapé) em `done/`.

## Riscos e Mitigação

- **Texto guardado diferente do digitado:** o Milkdown normaliza o Markdown (escapa `*`, `#` no começo da linha, `_`). `@Nome` e `#Nome`
  continuam presentes como substring (o `#` no começo da linha sai `\#`, que contém `#`); um teste cobre menção e referência no envio e a
  verificação ao vivo confere a mensagem renderizada.
- **Testes de jsdom mais lentos e sujeitos a flake sob carga** (o `markdown-editor` já tem um): o spec do compositor usa a API do editor para
  digitar e tem folga de tempo; falha só por timeout sob carga é relatada à parte.
- **`Enter` não enviar em lista ou código surpreende:** o `Ctrl+Enter` e o botão enviam sempre, e a dica do botão diz isso.
- **Janela do Desktop (Electron) não aberta pelo agente:** a verificação cobre a rota `/chat-popup` no tamanho real; o Electron fica
  declarado como não verificado.
