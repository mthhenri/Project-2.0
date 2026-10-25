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

### I-010 — Revisar os prompts da revisão das descrições · chat IA/prompts

- **Ideia:** nos prompts da revisão/redação das descrições de demanda: remover a temporalidade, tirar a herança de descrição da atividade e dar exemplos melhores de descrição boa.
- **Origem:** anotações do autor (2026-10-19).
- **Por quê:** descrições saem com marcas de tempo ("hoje", "nesta sprint") e misturam o que é da atividade com o da demanda.
- **Custo aparente:** só texto de prompt (versão nova do prompt na tela de configuração), mais um teste manual com entrevistas reais.

### I-019 — Teste que garanta o stub de `class-validator` do frontend · frontend/shared

- **Ideia:** um teste que confere que todo decorator de `class-validator` (e de `class-transformer`) usado nos DTOs do `shared` existe no stub do frontend (`frontend/src/stubs/`).
- **Origem:** task 205 (2026-10-21): o build do frontend quebrou por `IsUUID` e `ValidateNested` faltarem no stub. Já tinha acontecido com `IsDate` e `ArrayMaxSize`.
- **Por quê:** o frontend lê os DTOs do `shared` com um stub, então todo decorator novo só aparece como erro no `ng build`, depois de o `shared` e o backend já estarem verdes.
- **Custo aparente:** um teste pequeno que lê os imports dos DTOs e o stub; mora no `shared` (ou no frontend) sem ligar os dois workspaces em tempo de execução.

### I-020 — Quem sai da demanda continua vendo o histórico do canal · chat entre colaboradores

- **Ideia:** no canal de demanda, quem foi removido de `demanda_usuario` perde só o acesso daqui para frente e segue vendo o que já tinha visto.
- **Origem:** conversa de 2026-10-23 sobre grupos (`chat-grupos.spec.md`); por ora vale a regra mais restritiva (perde o canal inteiro).
- **Por quê:** quem participou de uma decisão pode precisar rever o que foi combinado.
- **Custo aparente:** guardar a data de saída do membro e filtrar o histórico por ela; avaliar o conflito com a regra "o acesso acompanha `demanda_usuario`".

### I-021 — Resumo da IA com opção de citar os autores · chat entre colaboradores/IA

- **Ideia:** o resumo do chat citaria o nome de quem disse cada coisa, como opção a cada resumo.
- **Origem:** conversa de 2026-10-23 sobre grupos; a decisão atual é resumir sem nomes.
- **Por quê:** documentação com autoria ("Ana decidiu usar a fila") tem mais valor de consulta.
- **Custo aparente:** só prompt e uma opção na confirmação do resumo; os nomes passariam a ir ao provedor de IA, o que pede aviso de consentimento.

### I-022 — Plano que vira várias demandas · chat IA/planejamento

- **Ideia:** no modo planejamento, a IA propõe quebrar o plano numa árvore de demandas, e publicar cria todas de uma vez, cada uma com o seu pedaço do texto.
- **Origem:** conversa de 2026-10-25 sobre o modo planejamento (`backlog/chat-planejamento.spec.md`, Fora de Escopo).
- **Por quê:** um plano grande costuma ser a criação de várias demandas, e criar uma a uma joga fora o que o plano já organizou.
- **Custo aparente:** a modelagem do plano já admite várias demandas (`plano_demanda`); falta a parte do documento com a árvore e a publicação em lote (as propostas de criar demanda já dependem umas das outras).

### I-023 — Documentação a partir do que foi feito · chat IA/planejamento

- **Ideia:** depois da entrega, a IA escreve a documentação da demanda a partir do que realmente foi feito: primeiro pelas descrições das execuções; mais para frente, pelos commits do repositório Git (a empresa do autor está indo para o Gitea).
- **Origem:** conversa de 2026-10-25 sobre o modo planejamento.
- **Por quê:** a documentação fica fiel ao entregue, e não ao planejado, sem ninguém precisar escrever do zero.
- **Custo aparente:** só leitura de execuções no primeiro passo; o passo do Git depende da I-005 (vincular projeto a repositório, credencial, permissão), que é futuro distante e vale para o projeto inteiro.

### I-024 — Imagens e prints no chat da IA e no chat entre colaboradores · chat

- **Ideia:** enviar imagens e prints nas conversas, tanto com a IA quanto entre colaboradores.
- **Origem:** conversa de 2026-10-25 com o autor.
- **Por quê:** um print explica um erro ou uma tela muito mais rápido que um texto.
- **Custo aparente:** armazenamento de arquivo (hoje as mensagens são só texto), envio da imagem ao provedor de IA (custo e consentimento), exibição no popup e no Project Desktop.

### I-028 — Cada usuário escolhe a autonomia da IA para si · chat IA/preferências

- **Ideia:** dentro do teto que o administrador define na IA Config., cada usuário decide nas próprias preferências quais propostas a IA pode fazer sem perguntar (por exemplo, "mexer no meu pad: nem pergunta").
- **Origem:** conversa de 2026-10-25 com o autor, ao discutir a I-026; ele preferiu deixar só o administrador por enquanto e ver a complexidade depois.
- **Por quê:** cada pessoa tem uma tolerância diferente a confirmar.
- **Custo aparente:** não existe preferência de usuário para a IA hoje; dá para seguir o modelo das preferências do chat entre colaboradores (`MensagemDiretaPreferencia*`).

## Promovidas

### I-025 — O desenvolvedor executa demandas; a IA cuida de atividades e execuções · chat IA/demanda

- **Promovida em 2026-10-25** para a guarda-chuva [`chat-execucao-por-demanda.spec.md`](../specs/backlog/chat-execucao-por-demanda.spec.md) (só a spec, no backlog): atividades como checklist, bom dia com "continuar ou coisa nova", check-in que troca sozinho e "Minhas demandas" no chat.

### I-029 — Tela de demandas em três colunas, com as descrições em primeiro plano · demanda/frontend

- **Promovida em 2026-10-25** para a guarda-chuva [`demanda-tela.spec.md`](../specs/backlog/demanda-tela.spec.md) (só a spec, no backlog): Árvore em três colunas, Controle de horas no lugar da aba Planejamento e os ajustes do grafo.

### I-026 — Propostas mais simples e mais autonomia para a IA · chat IA

- **Promovida em 2026-10-25** para a guarda-chuva [`chat-propostas.spec.md`](../specs/backlog/chat-propostas.spec.md) (só a spec, no backlog): régua de autonomia configurada pelo administrador, cartões compactos, Confirmar todas, diff por palavra, cinco propostas novas e a correção do sumiço e do scroll. A escolha por usuário ficou na I-028.

### I-027 — Barra lateral em grupos · frontend/navegação

- **Promovida em 2026-10-25** para a task [`223-barra-lateral-em-grupos`](../specs/done/223-barra-lateral-em-grupos.spec.md) (implementada em 2026-10-25). Os grupos acabaram iguais para todos os perfis.

### I-004 — Chat IA como tira-dúvidas de programação, com bloco de código copiável · chat IA/frontend

- **Promovida em 2026-10-19** para a guarda-chuva [`chat-duvidas-de-codigo.spec.md`](../specs/done/chat-duvidas-de-codigo.spec.md)
  (tasks 188–191). As decisões da conversa com o autor estão na seção "Decisões" da guarda-chuva.

### I-008 — Chip de nível (rápido / padrão / analítico) abaixo, ao lado do horário · chat IA/frontend

- **Promovida em 2026-10-19** para a task [`193-chat-chip-de-nivel-ao-lado-do-horario`](../specs/done/193-chat-chip-de-nivel-ao-lado-do-horario.spec.md) (implementada).

### I-009 — Desfazer das propostas no lado oposto e com prazo · chat IA/frontend

- **Promovida em 2026-10-19** para a task [`194-chat-desfazer-proposta-com-prazo`](../specs/done/194-chat-desfazer-proposta-com-prazo.spec.md) (implementada).

### I-011 — Gestor/admin lê e edita o pad dos desenvolvedores · anotações/permissão

- **Promovida em 2026-10-19** para a task [`195-gestor-le-e-edita-pad-dos-desenvolvedores`](../specs/done/195-gestor-le-e-edita-pad-dos-desenvolvedores.spec.md) (implementada).

### I-012 — Loading das propostas mais discreto · chat IA/frontend

- **Promovida em 2026-10-19** para a task [`196-chat-loading-da-proposta-discreto`](../specs/done/196-chat-loading-da-proposta-discreto.spec.md) (implementada).

### I-013 — Volume de trabalho por projeto · projeto/relatório

- **Promovida em 2026-10-19** para a task [`197-projeto-volume-de-trabalho`](../specs/done/197-projeto-volume-de-trabalho.spec.md) (implementada em 2026-10-19).

### I-014 — Botão "Baixar Project Desktop" e conferir a atualização do app · desktop/frontend

- **Promovida em 2026-10-19** para a task [`198-desktop-baixar-e-atualizar`](../specs/done/198-desktop-baixar-e-atualizar.spec.md) (implementada).

### I-015 — Project Desktop mostra e avisa que atualizou · desktop

- **Promovida em 2026-10-20** para a task [`200-desktop-aviso-de-que-atualizou`](../specs/backlog/200-desktop-aviso-de-que-atualizou.spec.md) (só a spec, no backlog; a implementação fica para depois).

### I-016 — Custo da IA por usuário e por origem, com histórico de preço · ia-custo

- **Ideia:** além do custo por modelo e por dia, mostrar quanto cada pessoa e cada origem (chat, check-in, assistente de descrição, relatório, nomeação) gastou; e guardar o preço vigente de cada época, para trocar um preço não recalcular o passado.
- **Origem:** task 201 (aba Custos); ficou fora do escopo de propósito.
- **Por quê:** hoje trocar o preço de um modelo muda o custo de tudo o que já foi registrado, e não dá para saber quem ou o que mais gasta.
- **Custo aparente:** o corte por pessoa já existe nas mensagens (`usuario_id`) e é um filtro a mais em `somarTokens`; a origem exige gravar a origem na mensagem; o preço com vigência vira um histórico dentro de `configuracao_ia.precos_modelo` (hoje o preço é único e retroativo, task 202).

### I-017 — Avisar o desenvolvedor quando o gestor consulta a conversa dele pela IA · chat IA/gestor

- **Ideia:** registrar e mostrar ao desenvolvedor que o gestor leu (ou buscou em) suas conversas com a IA.
- **Origem:** task 201; a decisão de não avisar foi minha e está marcada a confirmar.
- **Por quê:** transparência sobre um acesso sensível a conversas pessoais de trabalho.
- **Custo aparente:** uma tabela de acessos, a escrita nas três ferramentas e um ponto de exibição para o desenvolvedor (por exemplo, no histórico do chat).

### I-018 — Custo exato por modelo e custo do que fica fora do chat · ia-custo

- **Ideia:** (a) gravar na mensagem os tokens **por modelo** do turno, em vez de um só `modelo` com a soma de tudo; (b) medir também o que não é mensagem do chat (relatório, assistente de descrição, nomeação, sugestões de conexões e lugar, propostas de descrição, teste de prompts).
- **Origem:** task 202 (aba Custos pelas mensagens); o autor pediu para deixar anotado.
- **Por quê:** (a) o turno soma as chamadas das ferramentas (task 188), que podem rodar num nível mais barato, mas todos os tokens são precificados pelo modelo da mensagem (o do nível mais alto): o custo sai aproximado, para mais. (b) a aba só enxerga o chat: o que o Console da Anthropic mostra a mais é isso, mais o uso da mesma chave fora da aplicação.
- **Custo aparente:** (a) campo novo no documento da mensagem e no mapeamento dos três armazenamentos, mudança no `TurnoIa` e em `somarTokens`; só vale para mensagem nova. (b) exige um lugar para gravar chamadas que não têm mensagem (uma tabela de uso, que é o que a task 202 tirou) ou um conceito de "mensagem de sistema" por origem.
