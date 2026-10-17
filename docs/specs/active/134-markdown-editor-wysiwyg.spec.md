# Task 134 — Editor de Markdown "escreve vendo": edição formatada com o texto guardado em Markdown

> Origem: pedido do autor em 2026-10-17, depois de ver o pad com o Markdown cru (`**teste**`). Complementa o
> bloco 3 da guarda-chuva [`rework-chat-ia.spec.md`](rework-chat-ia.spec.md) (Markdown no lugar do Quill) e muda a
> decisão "editor próprio, sem biblioteca externa": o autor aceita biblioteca **se ela facilitar**.

## Objetivo

Trocar o campo de texto cru do `app-markdown-editor` por uma edição **formatada**: o usuário escreve e vê
negrito, itálico, títulos, listas, tarefas, citação, código e links já aplicados, sem os símbolos do Markdown
(`**`, `#`, `- [ ]`). O que é **guardado continua sendo Markdown** (string), o contrato do componente
(`ControlValueAccessor`, `string`) não muda e o texto continua legível pela IA e pelo
`app-markdown-visualizador`. Vale para todos os usos do editor (pad, descrições de demanda, documentação e os
prompts da task 133), sem os consumidores mudarem.

## Biblioteca (proposta)

Comparadas em 2026-10-17 (todas MIT, mantidas, com versão publicada na semana):

| Opção | Como funciona | Encaixe |
|---|---|---|
| **Milkdown** (`@milkdown/kit`, 7.22) | Editor **nativo em Markdown** sobre ProseMirror: a fonte da verdade é o Markdown, serializa e interpreta com `remark`. O `kit` é "sem tema" (sem UI própria), então o visual sai dos nossos tokens. | **Melhor encaixe**: faz exatamente "escrever formatado, guardar Markdown", e não tem UI pronta para brigar com o PrimeNG. O `@milkdown/crepe` (pacote com UI e tema prontos, 3,4 MB) **não** serve: impõe o visual dele. |
| Tiptap (`@tiptap/core` 3 + `@tiptap/markdown`) | Editor ProseMirror cujo modelo é HTML/JSON; Markdown é uma extensão. | Mais popular, mas o Markdown é um adaptador (idas e voltas mais frágeis) e é o mais pesado. |
| CodeMirror 6 com "live preview" | Campo de código que esconde os símbolos das linhas fora do cursor (estilo Obsidian). | Mantém o Markdown exato, mas a formatação é toda decoração escrita à mão: muito trabalho próprio. |

**Proposta: Milkdown, só com os pacotes do `kit`** (núcleo, `preset-commonmark`, `preset-gfm` para tarefas e
tachado, histórico, listener, e o que a task confirmar como necessário), carregado sob demanda (`import()`
dentro do componente) para não pesar o bundle inicial.

## Entregáveis

### 1. `app-markdown-editor` com edição formatada

- Mesma API pública (inputs `placeholder`, `alturaMinima`, `somenteLeitura`, `maxlength`, `rotulo`,
  `semAbas`, `emitirMenuContexto`; output `aoMenuContexto`; `focar()`; CVA em `string`). O componente por
  dentro passa a hospedar o Milkdown; `writeValue` carrega o Markdown e cada mudança emite o Markdown.
- Barra de formatação **no molde do editor de outro projeto do autor** (referência visual): desfazer e refazer,
  títulos (H1 e H2), negrito, itálico, código, lista, lista numerada e citação, mais tachado, tarefa e link,
  ligada aos comandos do editor, com os atalhos de hoje (`Ctrl+B`, `Ctrl+I`, `Ctrl+K`). Botões ativos acesos
  quando o cursor está sobre a formatação (negrito aceso dentro de um trecho em negrito). O escrever é direto no
  texto formatado, sem ver os símbolos do Markdown.
- **Contrato do `Enter` e do `Ctrl+Enter` preservado** (decisão do projeto: `Ctrl+Enter` confirma o dialog;
  `Enter` não envia nada).
- Tema pelos tokens do projeto (claro e escuro), sem `style=""` inline nem seletor de ID, estados de
  foco, desabilitado e vazio (placeholder) iguais aos de hoje.
- **Segurança:** o editor **não aceita HTML**. Os nós de HTML cru do Markdown ficam desligados/removidos do
  esquema, e nada vira HTML na página que não seja nó do próprio editor. O `app-markdown-visualizador`
  continua sendo a única forma de exibir texto fora do editor.
- Colar: colar texto simples vira texto; colar HTML do navegador é reduzido ao que o esquema aceita (negrito,
  listas, links...), nunca HTML cru.

### 2. O Markdown guardado tem de ser estável

O pad é editado **pela IA por trechos exatos** e o "Enviar para" (task 127) move um trecho exato. Se o editor
reescrever o Markdown (trocar `*` por `-`, acrescentar escapes, mexer em quebras de linha) ao salvar, o trecho
da IA deixa de ser encontrado. Por isso:

- **Idempotência:** converter Markdown → editor → Markdown deve devolver o mesmo texto, depois da primeira
  normalização. Há uma função de normalização única (a mesma usada ao carregar e ao gravar) e testes de
  ida e volta sobre o conjunto de construções que o `interpretarMarkdown` aceita (e o que o editor gera).
- **Só o subconjunto do projeto:** o editor gera somente o que o `interpretarMarkdown` do `shared` entende
  (negrito, itálico, tachado, títulos, listas, numeradas, tarefas, citação, código, link, parágrafos).
  Tabelas, imagens e HTML ficam fora do esquema do editor.
- **Texto antigo:** conteúdo já gravado (conversão do Quill, texto da IA) que o editor normalizaria é
  normalizado **só quando o usuário edita**, nunca ao abrir; abrir e fechar sem digitar não grava nada
  (o autosave compara o Markdown carregado com o atual).

### 3. "Enviar para" (task 127) no editor formatado

Hoje o menu de contexto entrega o trecho selecionado como texto cru. No editor formatado a seleção é de
**conteúdo renderizado**, não de caracteres de Markdown. A task troca `aoMenuContexto` para entregar o
**Markdown do trecho selecionado** (a fatia da seleção serializada) e ajusta o "Enviar para" para trabalhar
com isso. Se a serialização da seleção não casar exatamente com um trecho único do texto guardado (por
exemplo, seleção no meio de uma palavra formatada), o envio **estende a seleção ao bloco inteiro** (parágrafo
ou item de lista) em vez de falhar (decisão 2).

### 4. Testes

- Funções de normalização e ida e volta com testes de `node:test` (decisão 3: onde mora o primeiro teste do
  frontend).
- Verificação ao vivo percorrendo: digitar com atalhos e barra, listas aninhadas e tarefas, colar, desfazer
  e refazer, `Ctrl+Enter` num dialog, pad com autosave (nada grava ao só abrir), "Enviar para", descrição
  de demanda e documentação, tema claro e escuro, `1920×1080`, `1366×768` e `1080×1920`.

### 5. Documentação

- `docs/SYSTEM.SPEC.md` (§ do editor, nova dependência e a regra de estabilidade do Markdown),
  `docs/context/` e `README.md` se o procedimento de build mudar.

## Decisões

Tomadas pelo autor (as de 5 a 8 em 2026-10-17, na revisão da spec):

1. **O editor é trocado em todos os lugares** de uma vez (pad, descrições de demanda, documentação e prompts).
2. **Biblioteca externa é aceita** (Milkdown proposto acima).
3. **"Enviar para" envia os tokens juntos:** o trecho selecionado vai como o seu Markdown, e não como o texto
   renderizado. Como exatamente a seleção vira Markdown é decidido na task (ver entregável 3).
4. **Foco, Tab e Esc** dentro de dialogs e drawers são revalidados em cada consumidor; contrato que conflitar é
   registrado e resolvido caso a caso.

5. **Seleção no "Enviar para":** estender sempre ao **bloco inteiro** (parágrafo, item de lista, título), em vez de tentar o trecho exato.
6. **Modo "ver Markdown"** como alternância opcional por editor, **desligada por padrão**: muita gente vai querer ver e editar o Markdown
   direto, então o modo texto fica (o código do `textarea` e de `markdown.edicao.ts` continua vivo, como modo alternativo do mesmo componente).
7. **Primeiro teste do frontend:** um `node:test` mínimo só para as funções puras de normalização e ida e volta, sem montar componente.
8. **Tabelas ficam fora desta task** (o `interpretarMarkdown` não as lê e o pad não precisa); registradas como ideia em
   [`IDEAS.md`](../../context/IDEAS.md) (I-003).

## Critérios de Aceite

- Em cada consumidor o usuário escreve, aplica formatação pela barra e pelos atalhos e **vê o resultado
  formatado enquanto digita**, sem símbolos de Markdown na tela (fora do modo texto, se mantido).
- O valor do controle é Markdown e o `app-markdown-visualizador` o exibe igual ao que o editor mostrou.
- Abrir um texto e fechar sem digitar **não** envia requisição nem altera o Markdown guardado; um texto
  editado e salvo volta idêntico ao reabrir (ida e volta estável).
- O pad continua com autosave, conflito (409), "Limpar" com Desfazer e "Enviar para" funcionando, e a edição
  pontual da API (`PATCH .../trecho`) encontra o trecho no texto que o editor gravou.
- HTML digitado ou colado nunca é renderizado como HTML (teste com `<script>`, `<img onerror>` e `<b>`).
- Testes de `shared`/`backend` passam; testes novos de ida e volta passam; build do frontend passa e o
  tamanho adicional ao bundle inicial é **zero** (editor carregado sob demanda), com o tamanho do trecho
  carregado registrado no `HISTORY.md`.

## Fora de Escopo

- Tabelas, imagens e HTML no editor; colaboração em tempo real; menções e comandos por `/`.
- Mudar o `interpretarMarkdown` ou o `app-markdown-visualizador`.
- O restante do rework do chat (blocos 4 a 10).

## Dependências

Depende do bloco 3 (tasks 121 a 124) e do bloco 8 (125 a 128), concluídos. **Recomendada antes da 133**
(a aba de prompts usa o editor). Não bloqueia as tasks 129 a 132.
