# 253-chat-ia-campo-formatado.spec.md

> Task solta, pedido do autor (2026-10-26): o campo de mensagem do chat com a IA deve ter o mesmo Markdown "tímido" do chat entre colaboradores
> (task 218): escreve formatado, sem barra fixa, com uma barra pequena que só aparece sobre o texto selecionado ou a sintaxe digitada à mão.

## Objetivo

Trocar os dois `<textarea>` da `chat.page` (modo Perguntas e modo Planejamento) pelo editor formatado já usado no chat entre colaboradores. O texto
enviado continua sendo Markdown puro; servidor, `shared` e renderizador não mudam.

## Decisões

- Mesmo comportamento da 218: negrito/itálico/lista aparecem formatados ao digitar, `Ctrl+B`/`Ctrl+I`, barra flutuante só com seleção, sem sublinhado,
  sem link/título/tabela pela barra.
- Teclas do chat da IA são as de hoje: `Enter` envia, `Shift+Enter` cria novo parágrafo (novo item em lista), `Enter` em lista e em bloco de código não envia.
- Limite atual de **4000 caracteres** (do Markdown gerado) mantido, com contador perto do limite.

## Fatos do código (2026-10-26)

- `chat.page.html` tem dois `<textarea pTextarea [formControl]="controleTexto">` (planejamento e perguntas) e `aoTeclar` trata o Enter; o campo é
  habilitado/desabilitado por `controleTexto.enable/disable` e as sugestões e o `queryParam` de mensagem inicial (task 252) escrevem nele.
- O editor da 218 vivia em `mensagem-direta` (`app-mensagem-direta-editor-mensagem`, hoje `app-editor-mensagem`) sobre `EditorFormatado` (`shared/components/markdown-editor/markdown-formatado.ts`).
  Esse componente não deve ser importado do módulo `mensagem-direta` pelo `chat`: extrair a parte genérica (editor, barra flutuante, estilos) para `shared/components`
  e fazer os dois consumidores a usarem, **sem mudar o comportamento do chat entre colaboradores**.

## Entregáveis

1. Aplicar a skill `gerenciamento-de-impacto` (`npm run impacto`) antes de extrair o editor; registrar os consumidores e o que muda além do pedido.
2. Componente compartilhado do campo formatado (placeholder, altura que cresce até um máximo, desabilitado, foco programático, contador, `valor` em Markdown),
   usado pelo chat entre colaboradores (regressão coberta pelos specs da 218) e pelo chat da IA.
3. `chat.page`: os dois campos viram o componente; `aoTeclar`, `podeEnviar`, sugestões (`enviar(sugestao)`), limpeza após envio, mensagem inicial por `queryParam`
   e estado desligado/somente leitura continuam funcionando; o campo também funciona na rota/popup do chat que reaproveita a página.
4. Conferir se a mensagem **do usuário** já é renderizada como Markdown no histórico (`app-markdown-visualizador`); se não for, renderizar, para o enviado aparecer igual ao digitado.
5. Atualizar a legenda do rodapé ("Enter envia, Shift+Enter quebra a linha") se mudar.

## Critérios de Aceite

- Testes: spec do componente compartilhado (barra só com seleção, foco preservado, limite), specs da `chat.page` adaptados (Enter, Shift+Enter, sugestão, desabilitado,
  mensagem inicial) e os specs do compositor da 218 verdes. `npm run test --workspace=frontend` e build verdes; falhas preexistentes relatadas à parte.
- Ao vivo: digitar `**oi**`, `- a`, `1. a`, selecionar e usar a barra, enviar e ver a mensagem igual no histórico; modos Perguntas e Planejamento; IA desligada;
  `1920×1080`, `1366×768`, `1080×1920`, claro e escuro; comparar com o campo do chat entre colaboradores (análogo aprovado).

## Fora de Escopo

- Mudar o renderizador, o servidor, o `shared` ou a forma como a IA recebe o texto; sublinhado, link, título, tabela, anexos.

## Dependências

- Tasks 134 e 218 em `done/`. Combina com a 252 (mensagem inicial pré-digitada).

## Resultado (2026-10-26)

- Extração feita com `git mv` para `shared/components/editor-mensagem/` (`app-editor-mensagem`); o compositor do chat entre colaboradores só trocou o seletor e o
  import, com os specs da 218 verdes. O componente ganhou `desabilitado` e `definirTexto`; o `EditorFormatado` ganhou `cursorNoFim`.
- Decisão tomada na implementação: a mensagem **do usuário** passou a ser renderizada como Markdown no histórico (entregável 4), com o visualizador herdando a
  cor do balão azul (input `herdaCor` do `app-markdown-visualizador`, aditivo). Mensagens antigas, em texto puro, passam pelo mesmo renderizador.
- A legenda do rodapé não mudou ("Enter envia, Shift+Enter quebra a linha" continua certa). O contador aparece a partir de 3.200 caracteres.
- Verificação ao vivo e limites: `done/253-chat-ia-campo-formatado/verificacao.md`.
