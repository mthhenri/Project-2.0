# Task 121 — Markdown: interpretador e visualizador próprios

> Origem: guarda-chuva [`rework-chat-ia.spec.md`](rework-chat-ia.spec.md), bloco 3 (1 de 4). Entrega
> a base; **nenhuma tela existente muda** nesta task.

## Objetivo

Ter um **interpretador de Markdown próprio**, sem biblioteca externa, e um componente que mostra o
resultado **sem jamais inserir HTML cru na página**. A segurança vem da construção: o texto vira
uma árvore de nós, e o Angular monta elementos a partir dela.

## Entregáveis

### 1. Interpretador (função pura)

- Local proposto: `shared/src/markdown/`, para ser testado com `node:test` (o frontend não tem
  testes) e reaproveitado pelo backend quando a IA precisar ler/validar o texto. Ver decisão em aberto.
- `interpretarMarkdown(texto: string): MarkdownNo[]`, com os nós como união discriminada em
  `shared/` (nome e estrutura conforme `project20-dto-conventions` e `CONVENTIONS.md`).
- **Subconjunto suportado** (o que o pad e as descrições precisam): títulos `#` a `####`;
  parágrafos e quebra de linha; **negrito**, *itálico*, `código`; ~~tachado~~; listas com e sem
  ordem, com aninhamento; **listas de tarefas** (`- [ ]`/`- [x]`); citação `>`; bloco de código
  cercado; régua `---`; links `[texto](url)`.
- **Sem HTML embutido:** `<tag>` é texto literal. **Sem imagens.**
- **Links:** só `http`, `https` e `mailto`. Qualquer outro esquema (`javascript:`, `data:`,
  `vbscript:` etc.) deixa o link como texto simples.
- Entrada hostil não pode travar o navegador: sem regex com retrocesso catastrófico, profundidade
  de aninhamento limitada, texto longo interpretado em tempo linear.
- Texto inválido/não terminado (`**sem fechar`, lista torta) nunca lança: vira texto.

### 2. Visualizador (frontend)

- Componente standalone `app-markdown-visualizador` (`shared/components/`), com `input` do texto e
  `computed` da árvore. Template recursivo (`ng-template` + `ngTemplateOutlet`) que cria elementos
  nativos (`h1`…, `p`, `ul`, `a`…).
- Proibido `[innerHTML]`, `bypassSecurityTrust*`, `ElementRef.nativeElement.innerHTML` e equivalentes.
  Links externos com `target="_blank"` e `rel="noopener noreferrer"`.
- Estilo `.scss` próprio (BEM `markdown`), com tokens semânticos nos temas claro e escuro; tipografia
  e espaçamentos coerentes com o corpo de texto atual (`ql-editor`) para a troca da 124 não parecer
  outra aplicação. Lista de tarefas renderizada como caixa **somente leitura**.
- Texto vazio renderiza nada (o estado vazio é de quem usa o componente).

### 3. Testes (`node:test` + `node:assert/strict`)

Cobertura mínima: cada construção suportada; aninhamento de listas; construções não terminadas;
**vetores de XSS** — `<script>`, `<img src=x onerror=...>`, `[a](javascript:alert(1))`,
`[a](JaVaScRiPt:...)`, `[a](data:text/html,...)`, entidades; entrada enorme e profundamente aninhada
dentro de um limite de tempo; idempotência de leitura (mesma entrada, mesma árvore).

### 4. Documentação

- `docs/SYSTEM.SPEC.md` (seção de componentes) e `docs/CONVENTIONS.md`: o visualizador é a única
  forma de exibir texto rico; HTML cru é proibido.

## Decisões em aberto

1. **Onde mora o interpretador:** `shared/` (proposta: testável e reaproveitável pelo backend) ou
   `frontend/` (sem testes automáticos).
2. **Tabelas:** entram no subconjunto? As descrições técnicas podem pedi-las. Proposta: fora na
   primeira versão, vistas como texto, e reavaliar com o uso real.

## Critérios de Aceite

- `npm run test --workspace=shared` passa com os testes novos, incluindo todos os vetores de XSS.
- Uma página temporária ou o componente isolado renderiza um documento com todas as construções,
  nos temas claro e escuro, em 1920×1080, 1366×768 e 1080×1920; o DOM resultante não contém nenhum
  nó vindo de HTML do texto (`<script>` aparece como texto visível).
- `grep` por `innerHTML` e `bypassSecurity` no componente novo retorna vazio.
- Nenhum arquivo existente fora do `shared/` e do componente novo foi alterado.

## Fora de Escopo

- O editor (122), a conversão do HTML gravado (123) e a troca das telas (124).
- Imagens, HTML embutido, tabelas (salvo decisão contrária), notas de rodapé, fórmulas e destaque
  de sintaxe em código.
- Qualquer extensão específica de IA.

## Dependências

Nenhuma. Bloqueia a 122 e a 124.
