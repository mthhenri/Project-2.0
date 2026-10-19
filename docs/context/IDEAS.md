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

### I-008 — Chip de nível (rápido / padrão / analítico) abaixo, ao lado do horário · chat IA/frontend

- **Ideia:** mover o chip do nível da IA, hoje no alto da mensagem, para baixo, ao lado do horário da mensagem.
- **Origem:** anotações do autor (2026-10-19).
- **Por quê:** o chip chama atenção demais no topo; ao lado do horário vira metadado.
- **Custo aparente:** só UI (`chat.page.html` e estilos); verificação visual nos três tamanhos.

### I-009 — Desfazer das propostas no lado oposto e com prazo · chat IA/frontend

- **Ideia:** colocar o botão "Desfazer" do cartão de proposta no lado oposto ao de Confirmar e desativá-lo depois de um tempo (talvez 30 min).
- **Origem:** anotações do autor (2026-10-19).
- **Por quê:** evita clique por engano e desfazer algo muito antigo, quando o estado já mudou (hoje o executor só recusa se as tags/estado mudaram).
- **Custo aparente:** UI do cartão; decidir se o prazo é só visual ou também recusado pelo backend (`desfazer` do executor, com a data da confirmação).

### I-010 — Revisar os prompts da revisão das descrições · chat IA/prompts

- **Ideia:** nos prompts da revisão/redação das descrições de demanda: remover a temporalidade, tirar a herança de descrição da atividade e dar exemplos melhores de descrição boa.
- **Origem:** anotações do autor (2026-10-19).
- **Por quê:** descrições saem com marcas de tempo ("hoje", "nesta sprint") e misturam o que é da atividade com o da demanda.
- **Custo aparente:** só texto de prompt (versão nova do prompt na tela de configuração), mais um teste manual com entrevistas reais.

### I-011 — Gestor/admin lê e edita o pad dos desenvolvedores · anotações/permissão

- **Ideia:** gestor e administrador leem e editam o pad (anotações) dos desenvolvedores, mas não o de outros gestores ou administradores.
- **Origem:** anotações do autor (2026-10-19).
- **Por quê:** acompanhar e ajudar o time pelo pad; manter privado o pad entre pares de gestão.
- **Custo aparente:** regra de permissão na service de anotações (`temPermissaoDeGestor` + tipo do dono), DTO/tela para escolher de quem é o pad, `SYSTEM.SPEC.md` §14 e testes de permissão; conferir a regra atual antes (não verificada).

### I-012 — Loading das propostas mais discreto · chat IA/frontend

- **Ideia:** reduzir o destaque do estado de carregamento do cartão de proposta.
- **Origem:** anotações do autor (2026-10-19).
- **Por quê:** o loading atual chama atenção demais para algo rápido.
- **Custo aparente:** só UI; verificação visual.

### I-013 — Volume de trabalho por projeto · projeto/relatório

- **Ideia:** ampliar a parte de projetos com uma visão do volume de trabalho: horas gastas em cada projeto e o volume esperado, definido por projeto.
- **Origem:** anotações do autor (2026-10-19).
- **Por quê:** comparar o gasto com o esperado e planejar a capacidade do time.
- **Custo aparente:** coluna nova em `projeto` (volume esperado, migration), consulta agregada de horas por projeto (execuções por atividade/demanda), tela e, talvez, ferramenta da IA; decidir a unidade (horas por mês?) e quem edita.

### I-014 — Botão "Baixar Project Desktop" e conferir a atualização do app · desktop/frontend

- **Ideia:** um botão no sistema que baixa o executável do Project Desktop; e verificar como o app se atualiza.
- **Origem:** anotações do autor (2026-10-19).
- **Por quê:** hoje o executável (`npm run pack --workspace=desktop`) não tem caminho de distribuição dentro do sistema.
- **Custo aparente:** onde hospedar o executável (backend serve o arquivo ou link externo), versão publicada, e revisar o mecanismo de atualização do `desktop/` (hoje não verificado).

## Promovidas

### I-004 — Chat IA como tira-dúvidas de programação, com bloco de código copiável · chat IA/frontend

- **Promovida em 2026-10-19** para a guarda-chuva [`chat-duvidas-de-codigo.spec.md`](../specs/done/chat-duvidas-de-codigo.spec.md)
  (tasks 188–191). As decisões da conversa com o autor estão na seção "Decisões" da guarda-chuva.
