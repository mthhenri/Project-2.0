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
- **Situação (2026-10-18):** a parte de **testes** foi entregue nas tasks 171–187
  (`docs/specs/done/testes-automatizados.spec.md`, concluída em 2026-10-19); o **lint** continua ideia aberta.

### I-003 — Tabelas no editor e no visualizador de Markdown · frontend/shared

- **Ideia:** aceitar tabelas (GFM) no `interpretarMarkdown`, no `app-markdown-visualizador` e no editor formatado, com botão de tabela na barra.
- **Origem:** conversa da task 134 (2026-10-17): o editor de outro projeto do autor tem o botão; o autor não precisa por ora.
- **Por quê:** descrições técnicas e documentação de demanda às vezes pedem comparação em colunas; a IA também escreve tabelas com naturalidade.
- **Custo aparente:** estender o interpretador (nó de tabela, sem HTML), o visualizador e o esquema do editor (Milkdown tem o preset GFM), mais testes
  de ida e volta; decidir o que a IA pode gerar.

### I-005 — IA lê o código dos projetos · chat IA/backend

- **Ideia:** dar à IA acesso de leitura ao código-fonte dos projetos cadastrados, para responder dúvidas e relacionar
  atividades e demandas com o código real.
- **Origem:** conversa sobre a I-004 (2026-10-19).
- **Por quê:** a resposta de programação deixa de ser genérica ("como faço um loop") e passa a falar do código do projeto
  ("onde isso é feito aqui", "por que isso quebra"); as dúvidas registradas pela I-004 também passam a ser ligadas ao código.
- **Custo aparente:** vincular projeto a repositório (schema novo?), credencial de acesso, indexação ou busca no código
  (ferramenta nova da IA), controle de quem vê qual repositório — alinhado ao acesso por projeto (`demanda_usuario`); custo
  de contexto alto.

### I-006 — Gestor pergunta à IA onde o time tem mais dúvida · chat IA/gestor

- **Ideia:** o gestor consulta a IA sobre o histórico de dúvidas do time ("com o que o pessoal está tendo mais dúvida?",
  "o que está mais difícil?"), a partir das conversas registradas pela I-004.
- **Origem:** conversa sobre a I-004 (2026-10-19).
- **Por quê:** transforma as dúvidas do dia a dia em sinal para treinamento, pareamento ou revisão de demanda.
- **Custo aparente:** ferramenta da IA para ler e resumir conversas de outros usuários (permissão de gestor), depende da
  marcação de assunto das mensagens (I-004) para filtrar dúvidas de código; decidir o que o desenvolvedor sabe sobre essa
  leitura. A marcação de assunto entra na task 191.

### I-007 — Dúvida de código complexa escala para um nível mais forte · chat IA/backend

- **Ideia:** quando a IA perceber que uma dúvida de código ficou complexa, ela escala para o nível padrão ou analítico, no
  mesmo molde das tarefas pesadas: uma ferramenta "responder dúvida de código complexa" que roda num modelo mais forte.
- **Origem:** conversa sobre a I-004 (2026-10-19); o autor quer a possibilidade anotada, com a dúvida de código começando no rápido.
- **Por quê:** o rápido basta para sintaxe, mas não para dúvida de arquitetura ou depuração; o usuário nunca escolhe modelo.
- **Custo aparente:** ferramenta nova; decidir como a resposta dela chega ao usuário com streaming (hoje o resultado de uma
  ferramenta volta ao modelo rápido, que reescreve) e o custo. O selo de nível verdadeiro (task 188) é pré-requisito.

## Promovidas

### I-004 — Chat IA como tira-dúvidas de programação, com bloco de código copiável · chat IA/frontend

- **Promovida em 2026-10-19** para a guarda-chuva [`chat-duvidas-de-codigo.spec.md`](../specs/backlog/chat-duvidas-de-codigo.spec.md)
  (tasks 188–191). As decisões da conversa com o autor estão na seção "Decisões" da guarda-chuva.
