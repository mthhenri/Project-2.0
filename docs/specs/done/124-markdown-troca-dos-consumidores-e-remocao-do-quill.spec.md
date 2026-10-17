# Task 124 — Markdown: troca dos consumidores e remoção do Quill

> Origem: guarda-chuva [`rework-chat-ia.spec.md`](rework-chat-ia.spec.md), bloco 3 (4 de 4).

## Objetivo

Substituir o Quill (`p-editor` e `[innerHTML]`) pelo editor e pelo visualizador de Markdown em
todas as telas e **remover o Quill do projeto**. Ao fim, o sistema não aceita nem exibe HTML cru
em nenhum campo de texto rico.

## Entregáveis

### 1. Consumidores a trocar

Editor `p-editor` → `app-markdown-editor`; exibição `[innerHTML]` com `ql-editor` →
`app-markdown-visualizador`:

| Consumidor | Hoje |
|---|---|
| `usuario-anotacoes-dialog` (drawer do pad) | `p-editor` |
| `usuario-anotacoes.page` (página de anotações) | `p-editor` |
| `demanda-detalhe-dialog` | `p-editor` + `[innerHTML]` |
| `demanda-arvore-painel` | `p-editor` + `[innerHTML]` |
| `atividade-listagem` (dialog de descrição da demanda) | `p-editor` + `[innerHTML]` |

Para cada um: remover `EditorModule` do `imports[]`, os blocos `::ng-deep .p-editor-*` do `.scss`,
ajustar o `FormControl` (texto Markdown) e o estado vazio. Reconferir por grep se algum outro lugar
exibe esses campos (por exemplo tooltips, impressão do ponto, relatórios, busca).

### 2. Remoção do Quill

- `frontend/package.json` (`quill`) e `package-lock.json`.
- `frontend/src/styles.scss` (comentário e `@import 'quill/dist/quill.snow.css'`).
- `core/utils/atalhos.ts`: o seletor `.ql-editor` em `focoEmCampo`.
- Grep final: `quill`, `ql-`, `p-editor`, `EditorModule`, `innerHTML` sem resultado no frontend.

### 3. Backend e contratos

- Validar o que o backend faz hoje com esses campos (limites, `@IsString`, remoção de tags ou
  conferência de "vazio" como `<p><br></p>`): a regra de "vazio" e "tem anotações" na listagem de
  usuários deve passar a considerar Markdown (`''` ou só espaços).
- `assistente-descricao` e o assistente do backend: o texto gerado e inserido nos campos deve ser
  Markdown, sem tags. Conferir os prompts do `assistente.service.ts`.
- DTOs e `docs/SCHEMA.md`: o tipo continua `TEXT`; documentar que o conteúdo é Markdown.

### 4. Documentação

- `docs/SYSTEM.SPEC.md` (padrão de descrição rica da task 39 e referências ao Quill), `CONVENTIONS.md`,
  `CONTEXT.md`, `HISTORY.md` e `IDEAS.md` (se citar o Quill).

## Impacto em consumidores

Skill `gerenciamento-de-impacto` sobre os dois componentes novos e sobre cada campo de texto rico.
O que mudar além da lista acima vai ao autor antes de ser aplicado.

## Implantação

Deploy **junto** com a aplicação da conversão da 123: com o código novo no ar e dados ainda em HTML,
o HTML aparece como texto; com os dados convertidos e o código antigo, o Quill mostra Markdown cru.
O fecho registra a ordem executada: backup, `--aplicar`, publicação.

## Critérios de Aceite

- Verificação ao vivo, com dados reais convertidos: abrir, editar, salvar e reabrir descrições de
  demanda (cliente, técnica, documentação) e o pad, em todos os cinco consumidores; o texto salvo é
  Markdown puro (conferir no banco), nunca HTML.
- `<script>` ou `<img onerror>` digitado ou colado aparece como texto; nenhum nó HTML novo na página.
- Temas claro e escuro, 1920×1080, 1366×768 e 1080×1920; estados vazio, carregando, cheio e erro;
  comparar com o visual anterior e corrigir divergência antes de apresentar.
- Todos os greps do item 2 vazios; `npm install` limpo sem `quill`.
- Builds de backend e frontend passam; testes de `shared` e `backend` passam. Declarar: frontend sem
  testes e sem lint.

## Fora de Escopo

- Estrutura do pad em cinco seções, acordeões e "Enviar para" (bloco 8): o pad continua um texto único.
- Mudanças de permissão, rotas ou layout.
- Novos recursos do editor ou do interpretador (voltam para 121/122 se faltar algo).

## Dependências

Depende da **121**, da **122** e da aplicação da **123**.
