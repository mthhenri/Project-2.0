# IDEAS.md — Insights e Ideias

> **O que este arquivo é:** o lugar onde ideias levantadas durante uma conversa **não se perdem**.
> Um insight que apareceu no meio de outra task, uma feature que alguém imaginou, uma direção que
> vale considerar um dia. Nada aqui é compromisso.
>
> **A porta de saída importa mais que a entrada.** Quando uma ideia amadurece, ela vira uma spec em
> `docs/specs/backlog/` e **sai deste arquivo**: a spec cita a origem (`IDEAS.md I-0NN`) e o número nunca é
> reaproveitado.
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

### I-030 — Integração com o Git (Gitea) · projeto todo

- **Ideia:** ligar o Project ao repositório Git do projeto (a empresa do autor está saindo do Tortoise para o Gitea, não GitHub). Com os commits, o check-in passa a ser automático (a IA lê o que foi feito em vez de perguntar) e a documentação da demanda pode sair do que realmente mudou no código (I-023 cita os commits como o passo seguinte às execuções).
- **Origem:** conversas de 2026-10-25 com o autor; o check-in manual e o checklist de `chat-execucao-por-demanda.spec.md` ficam até esta integração existir.
- **Por quê:** tira do desenvolvedor o último relato manual e dá à IA a fonte mais fiel do trabalho.
- **Custo aparente:** alto e de futuro distante: acesso ao Gitea por projeto, ligar commit a demanda e atividade, segurança das credenciais e mudança no fluxo do check-in.

### I-031 — Escolher pelo sistema o nível de IA de cada tipo de prompt · configuração da IA

- **Ideia:** hoje o nível (rápido, padrão, analítico) de cada tipo de prompt é a constante `NIVEL_DO_TIPO_DE_PROMPT` no código. O administrador poderia escolher o nível de cada tipo na tela de Configurações da IA (por exemplo, tirar o planejamento do analítico, ou subir o alterar trecho).
- **Origem:** pergunta do autor em 2026-10-27, ao baixar o "alterar trecho com IA" do analítico para o padrão por custo.
- **Por quê:** o custo da IA passa a ser ajustável sem mexer em código, tipo a tipo.
- **Custo aparente:** médio: guardar o nível por tipo (na versão do prompt ou na configuração ativa, por migration), a service ler dele no lugar da constante (chat, planejamento, assistente e teste de prompt) e um seletor por tipo na aba Prompts.

### I-036 — Status de usuário vira coluna `ativo` e booleanos sem prefixo `is_` · banco/schema

- **Ideia:** trocar a tabela de referência `tipo_usuario_status` (só `ATIVO` e `INATIVO`) por uma coluna booleana `ativo` em `usuario`. Na mesma linha, `demanda.is_estrutural` passa a se chamar `estrutural`. O `is_deleted` fica, por ser genérico (soft delete em todas as tabelas).
- **Origem:** pedido do autor em 2026-10-29, só anotado. Ele pediu para avaliar também os outros casos antes de decidir.
- **Por quê:** uma tabela de referência com dois valores fixos é mais custo que benefício (join em 16 SQLs de `usuario.repository.ts`, subselect para gravar, `codigo` para filtrar). Um booleano diz o mesmo e some do join.
- **Casos a avaliar antes de especificar:**
  - `tipo_usuario_status` → `usuario.ativo`: confirmar se há outros estados previstos (ex.: afastado, férias) antes de fechar em booleano.
  - Demais tabelas `tipo_*_status` (`tipo_projeto_status`, `tipo_demanda_status`, `tipo_atividade_status`, `tipo_proposta_ia_status`): ver quantos valores cada uma tem e se alguma também é só booleana ou um enum fixo, que poderia ser coluna.
  - Booleanos com prefixo `is_`: `is_estrutural` (`demanda`, `demanda_filho`, `caminho_demanda`, `arvore_demanda` e a DTO `isEstrutural`), e `is_solo` e `is_arquivado` em `plano` (migração 0059). Decidir o padrão de nome de booleanos antes de renomear qualquer um, e checar `docs/CONVENTIONS.md`.
  - `is_deleted` fica como está (genérico, em `BaseEntity`).
- **Custo aparente:** migrations de renomear e converter (sem editar migration já aplicada, ver `sql-migrations`); ajustar DTOs no `shared` (`isEstrutural` e `status` de usuário), repositories e a UI; e atualizar `docs/SCHEMA.md`. A troca de `status` de usuário mexe em filtros de tela e em alguns testes de integração. Rodar `gerenciamento-de-impacto` nos DTOs e enums antes de mexer.

### I-037 — Visão do cliente sobre as demandas do próprio projeto · cliente/permissões

- **Ideia:** um perfil de cliente que enxerga só o projeto dele: as demandas, se estão prontas, quais estão na fila, etc.
- **Origem:** pedido do autor em 2026-10-29, só anotado (`"Tudo uma ideia"`).
- **Por quê:** o cliente acompanha o andamento sem depender de contato com o gestor.
- **Restrição já dita pelo autor:** não expõe quem está executando nem o tempo gasto (sem atividades, responsáveis, horas nem ponto para o cliente).
- **Custo aparente:** alto e transversal: novo tipo de usuário ou de acesso em `shared` (`TipoUsuarioEnum`), regra de visibilidade que não passa por `demanda_usuario` (hoje o acesso é só por tipo e por vínculo), e DTOs de visão reduzida, sem os campos de responsável e de tempo. Antes de especificar, definir com o autor o que é "fila" e "pronto" para o cliente e rodar `gerenciamento-de-impacto` nas permissões e nos DTOs de demanda.

### I-040 — Documentar cada tabela e cada campo na tela de Modelagem · frontend/modelagem

- **Ideia:** a tela de Modelagem passa a mostrar uma descrição de cada tabela e de cada campo (o que é, regra, quem escreve), em vez de só o desenho do schema.
- **Origem:** apontado pelo autor em 2026-10-29 como problema (P-053) e reclassificado como ideia em 2026-10-30; o autor ainda não detalhou o formato.
- **Por quê:** quem lê o desenho não sabe o que cada coluna significa sem abrir `docs/SCHEMA.md`.
- **Custo aparente:** a decidir onde a descrição mora: tabela nova (migration) ou o arquivo JSON local da spec 222 (`modelagem-em-arquivo-json.spec.md`), que muda onde a Modelagem guarda a organização; ou só texto em `docs/SCHEMA.md` lido pela tela. Definir isso com o autor antes de especificar.

### I-041 — Custo da pesquisa na internet e da OpenAI com pesquisa · chat IA/custos

- **Ideia:** mostrar na aba Custos quantas buscas o provedor fez (o `web_search` da Anthropic devolve `server_tool_use.web_search_requests`; o Gemini cobra por resposta com pesquisa) e, na migração da OpenAI para a Responses API (spec 261), ligar a `web_search` dela.
- **Origem:** task 263 (2026-10-30): a pesquisa entrou usando a ferramenta de cada provedor, e o custo dela não é de token.
- **Por quê:** o gasto da IA hoje some de uma parte: cada busca é cobrada à parte e o administrador não vê.
- **Custo aparente:** ler o contador de buscas de cada provedor na resposta, gravar na mensagem (sem tabela de uso, como a 202) e preço por busca na configuração; a parte da OpenAI depende da 261.

### I-042 — Melhorar o formulário de criação do projeto · frontend/projeto

- **Ideia:** ajustar a forma do cadastro de projeto (o dialog "Novo Projeto": nome, código, cor, status, datas e volume esperado inicial) para ficar melhor de preencher.
- **Origem:** pedido do autor em 2026-10-31, ao decidir os dialogs da `reduzir-dialogs.spec.md`: "acho que a gente pode ajustar algumas formas do cadastro". Ele não disse quais ajustes.
- **Por quê:** a criação é o que sobrou no dialog depois que a edição do projeto foi para o cabeçalho (271).
- **Custo aparente:** baixo, só frontend, mas a lista de ajustes precisa vir do autor antes de especificar (por exemplo ordem dos campos, código gerado, volume inicial).
