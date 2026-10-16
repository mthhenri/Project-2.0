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
- **Custo aparente:** migração tela a tela (17 módulos de frontend), definição de tema e tokens
  antes de qualquer tela, decisão do autor sobre cada primitivo. Precisa de milestone próprio.

### I-002 — Trazer testes e lint para o monorepo · repositório

- **Ideia:** ver `PROBLEMS.md` P-001; vira spec quando a ferramenta for escolhida.
- **Origem:** adoção do kit (2026-10-16).
- **Por quê:** o gate de qualidade do `CLAUDE.md` pede testes focados e lint; sem eles só resta
  verificação manual.
- **Custo aparente:** configuração por workspace e um passo de CI; escrever os primeiros testes nas
  regras puras (ponto, intervalos) e nos validadores de `shared/`.

## Promovidas

Nenhuma ainda.
