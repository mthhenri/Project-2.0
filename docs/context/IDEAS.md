# IDEAS.md — Insights e Ideias

> **O que este arquivo é:** o lugar onde ideias levantadas durante uma conversa **não se perdem**.
> Um insight que apareceu no meio de outra task, uma feature que alguém imaginou, uma direção que
> vale considerar um dia. Nada aqui é compromisso.
>
> **A porta de saída importa mais que a entrada.** Quando uma ideia amadurece, ela vira uma spec em
> `docs/specs/backlog/` e **sai da lista de abertas**, indo para "Promovidas" com o link da spec.
> Sem isso, este arquivo vira um segundo backlog concorrente e o `docs/specs/backlog/` deixa de ser
> a fila real.
>
> **O que NÃO entra aqui:** trabalho já decidido (isso é spec no backlog), bug ou dívida (isso é
> [`PROBLEMS.md`](PROBLEMS.md)), e decisão já tomada (isso é `CONTEXT.md`).
>
> **Formato de entrada** — copie o bloco abaixo:
>
> ```markdown
> ### I-0NN — <título curto> · <área>
>
> - **Ideia:** o que é, em uma ou duas frases.
> - **Origem:** de onde saiu (task, conversa, observação de uso).
> - **Por quê:** que problema real ela resolveria — se não houver, provavelmente não é uma ideia.
> - **Custo aparente:** o que ela exigiria (schema novo? motor novo? só UI?).
> ```

---

## Abertas

### I-001 — Biblioteca própria de componentes no lugar de PrimeNG puro · frontend

- **Ideia:** substituir o uso direto de componentes PrimeNG por primitivos próprios em
  `frontend/src/app/shared/` (botão, campo, chip, diálogo, estado vazio...), com tema e tokens
  definidos pelo projeto, e só então adotar a regra "todo controle usa o primitivo" e a skill
  `design-fidelity` do kit.
- **Origem:** conversa de adoção do kit (2026-10-16); o ContratadosRPG segue esse modelo.
- **Por quê:** consistência visual, densidade controlada e um ponto único para evoluir o tema; hoje
  a UI depende dos padrões e do tema padrão do PrimeNG.
- **Decisão do autor (2026-10-16):** manter anotado; **nada muda por ora** — PrimeNG 21 segue como
  base de UI e telas novas usam os componentes dele com o tema atual. Só ao abrir o milestone
  desta ideia entram `design-fidelity` e a regra "todo controle usa o primitivo".
- **Custo aparente:** migração tela a tela (10 módulos de frontend), definição de tema e tokens
  antes de qualquer tela, decisão do autor sobre cada primitivo. Precisa de milestone próprio.

### I-002 — Lint e testes de service · repositório

- **Ideia:** adicionar lint (ESLint/Prettier) aos três workspaces e testes de service com
  repositórios falsos; ver `PROBLEMS.md` P-001, itens 1 e 2.
- **Origem:** adoção do kit (2026-10-16). Os primeiros testes (validadores, migrations, helpers de
  ponto) já existem.
- **Por quê:** o gate de qualidade do `CLAUDE.md` pede lint e testes focados; hoje a regra de
  permissão e de execução só é verificada ao vivo.
- **Custo aparente:** configuração por workspace e um passo de CI; services estendem
  `BaseRepository` com injeção do Knex, então os falsos precisam de um ponto de injeção.
- **Situação (2026-10-18):** a parte de **testes** foi especificada nas tasks 171–187
  (`docs/specs/backlog/testes-automatizados.spec.md`); o **lint** continua ideia aberta.

### I-003 — Tabelas no editor e no visualizador de Markdown · frontend/shared

- **Ideia:** aceitar tabelas (GFM) no `interpretarMarkdown`, no `app-markdown-visualizador` e no editor formatado, com botão de tabela na barra.
- **Origem:** conversa da task 134 (2026-10-17): o editor de outro projeto do autor tem o botão; o autor não precisa por ora.
- **Por quê:** descrições técnicas e documentação de demanda às vezes pedem comparação em colunas; a IA também escreve tabelas com naturalidade.
- **Custo aparente:** estender o interpretador (nó de tabela, sem HTML), o visualizador e o esquema do editor (Milkdown tem o preset GFM), mais testes
  de ida e volta; decidir o que a IA pode gerar.

## Promovidas

Nenhuma ainda.
