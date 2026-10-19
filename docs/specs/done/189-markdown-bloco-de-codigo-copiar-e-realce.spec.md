# Task 189 — Bloco de código: copiar e realce por linguagem

> Task 2/4 da guarda-chuva [`chat-duvidas-de-codigo.spec.md`](chat-duvidas-de-codigo.spec.md).

## Objetivo

Todo bloco de código cercado exibido pelo `app-markdown-visualizador` ganha um botão de copiar (como nas ferramentas de IA de
mercado) e, quando a linguagem é informada e conhecida, realce de sintaxe. Vale para todo o sistema, não só para o chat.

## Entregáveis

1. **Componente do bloco.** Um componente standalone novo para o bloco de código (ex.: `app-markdown-bloco-codigo`, ao lado do
   visualizador em `frontend/src/app/shared/components/`), usado pelo `@case ('bloco-codigo')` do visualizador. Recebe
   `linguagem` e `valor` do nó que `interpretarMarkdown` já produz; o interpretador do `shared` não muda.
2. **Cabeçalho do bloco** com o nome da linguagem (quando houver) e o botão **Copiar**: copia o `valor` exato pela Clipboard API,
   troca para "Copiado" por alguns segundos e avisa erro se a cópia falhar. Botão com rótulo acessível e foco visível; os
   controles seguem PrimeNG e o tema atual.
3. **Realce sem HTML injetado.** O realce vem de um tokenizador que devolve **tokens**, e o template monta `<span>` com classe por
   tipo de token. Proibido `innerHTML`, `bypassSecurityTrust*` ou escrita direta no DOM (regra do visualizador). Escolha
   recomendada: `prismjs` com `Prism.tokenize`; o Shiki (`codeToTokens`) é a alternativa se o Prism se mostrar inviável — a
   escolha e o motivo vão para o fecho.
4. **Carregado sob demanda.** O tokenizador e as gramáticas só são baixados quando aparece um bloco com linguagem; a tela sem
   bloco de código não paga o peso. Medir o tamanho do pacote inicial antes e depois no fecho.
5. **Linguagens.** No mínimo: TypeScript, JavaScript, PHP, C#, Java, Python, SQL, HTML, CSS, SCSS, JSON, Bash e YAML, com os
   apelidos comuns (`ts`, `js`, `cs`/`csharp`, `py`, `sh`/`shell`, `yml`, `html`/`xml`). Linguagem ausente ou desconhecida mostra
   o código sem realce, com o botão de copiar.
6. **Cores nos dois temas.** Cores dos tokens como variáveis do tema, legíveis no claro e no escuro, usando os aliases de
   superfície do projeto (nunca `--p-surface-N` direto). Rolagem horizontal do bloco preservada.
7. **Impacto.** `npm run impacto` no visualizador; conferir os 10 consumidores (chat, cartão de proposta, check-in, atividades,
   demandas — detalhe e painel da árvore —, anotações, prompts e teste de prompt, editor de Markdown) e listar no fecho como cada
   um ficou.

## Critérios de Aceite

- Teste do componente (Vitest): copiar entrega o texto exato (com recuo e quebras de linha); "Copiado" aparece e volta; falha da
  Clipboard API mostra o aviso; linguagem desconhecida não realça; texto com `<b>` e `**` aparece literal.
- Teste da função que converte tokens em segmentos do template (lógica pura).
- `npm run test --workspace=frontend` e `npm run build --workspace=frontend` verdes.
- Ao vivo (skill `verify`): blocos em TypeScript, PHP, C# e sem linguagem no chat e na descrição de uma demanda, nos temas claro e
  escuro, em 1920×1080, 1366×768 e 1080×1920. Análogo aprovado: o visualizador atual no chat. Colar o conteúdo copiado confere
  com o original.

## Fora de Escopo

- Mudar o interpretador de Markdown ou o editor formatado (Milkdown).
- Realce no código em linha (`` `x` ``).
- Numeração de linhas, quebra automática ou tema de cores escolhido pelo usuário.

## Dependências

Nenhuma. Fonte de verdade: o comentário de cabeçalho do `markdown-visualizador.component.ts` (sem HTML injetado) e
`docs/CONVENTIONS.md` (estilo, BEM em português, sem `style=""`).

## Riscos e Mitigação

- **Gramáticas do Prism dependem de outras** (PHP precisa de `markup-templating`; C# e Java de `clike`) e algumas esperam o
  `Prism` global: carregar na ordem certa e testar cada linguagem da lista.
- **Diretiva PrimeNG sem módulo no `imports[]`** não aplica e só quebra no tema escuro: conferir o botão nos dois temas.
