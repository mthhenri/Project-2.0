# Task 122 — Markdown: editor próprio

> Origem: guarda-chuva [`rework-chat-ia.spec.md`](rework-chat-ia.spec.md), bloco 3 (2 de 4). Entrega
> o componente; **nenhuma tela existente passa a usá-lo** nesta task.

## Objetivo

Um editor de Markdown **próprio**, sem biblioteca, que se encaixa em Reactive Forms como o
`p-editor` se encaixa hoje. O usuário escreve Markdown num campo de texto, com uma barra de
formatação e uma aba de pré-visualização (que usa o visualizador da 121).

## Entregáveis

### 1. Componente `app-markdown-editor` (`shared/components/`)

- Standalone, `ControlValueAccessor` (funciona com `formControlName`/`FormControl`), Signals.
  O valor é sempre a **string Markdown**; vazio é `''`, nunca `null`.
- **Campo de edição:** `<textarea>` (acessível, seleção nativa, desfazer/refazer nativos).
- **Barra:** negrito, itálico, título, lista, lista numerada, lista de tarefas, citação, código,
  link. Cada botão aplica a marcação à seleção (ou insere o modelo) preservando o cursor.
- **Atalhos:** `Ctrl+B`, `Ctrl+I`, `Ctrl+K` (link). `Enter` dentro de lista continua a lista (e
  sai dela em item vazio); `Tab`/`Shift+Tab` recuam e avançam item de lista.
- **Abas Editar | Visualizar** (a pré-visualização usa `app-markdown-visualizador`).
- Inputs: `placeholder`, `altura mínima`, `somenteLeitura`, `maxlength` opcional. Somente leitura
  mostra o visualizador, sem barra.
- **Conflito com o padrão de dialogs (task 97, Enter confirma):** no editor `Enter` insere linha;
  a confirmação do dialog fica em `Ctrl+Enter`. O dialog consumidor não pode interpretar o `Enter`
  do editor como confirmação. Registrar o comportamento no componente e na documentação.
- **Gancho de seleção** (apenas leitura, sem UI): o componente expõe a seleção atual para o bloco 8
  ("Enviar para"). Não implementar o menu aqui.
- Atalhos globais de navegação já ignoram `TEXTAREA` (`focoEmCampo`); confirmar que continuam
  quietos dentro do editor.

### 2. Estilo

- `.scss` próprio (BEM `markdown-editor`), tokens semânticos, temas claro e escuro, estados de foco
  e desabilitado coerentes com os demais campos do sistema; barra compacta que cabe nos dialogs e
  no drawer do pad.

### 3. Integração com o assistente de descrição

- Verificar como `assistente-descricao` hoje entrega o texto gerado ao campo (`aceitarDescricao…`
  nos consumidores). O editor precisa aceitar a inserção programática (`setValue`/patch no controle)
  sem perder o cursor de forma surpreendente. A troca dos consumidores é da 124.

## Critérios de Aceite

- Numa página/dialog de verificação: digitar, formatar por botão e por atalho, continuar e sair de
  lista, alternar Editar/Visualizar, salvar e reabrir preservam exatamente o texto.
- Funciona dentro de `p-dialog` e de `p-drawer`, com foco inicial correto e sem roubar o `Enter`
  de confirmação do dialog de forma indevida.
- Temas claro e escuro, 1920×1080, 1366×768 e 1080×1920; estados vazio, preenchido, desabilitado e
  somente leitura.
- Colar HTML num campo não o interpreta: aparece como texto e o visualizador o mostra como texto.
- Build do frontend passa; lacuna declarada: frontend sem testes. Lógica de edição reutilizável
  (continuar lista, aplicar marcação) fica em funções puras, testadas se estiverem no `shared/`.

## Fora de Escopo

- Trocar qualquer tela existente (124) e converter dados (123).
- Menu "Enviar para" e acordeões do pad (bloco 8).
- Imagens, anexos, menções, autocompletar e edição colaborativa.
- Modo WYSIWYG.

## Dependências

Depende da **121**. Bloqueia a 124.
