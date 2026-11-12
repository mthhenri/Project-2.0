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

### I-044 — Comando do usuário para pedir pesquisa na internet · chat IA

- **Ideia:** permitir ao usuário ativar um comando/controle para pedir explicitamente pesquisa na internet ao tirar uma dúvida de código. Continua só ideia, sem formato definido nem autorização de implementação.
- **Origem:** discussão de 2026-10-31. O indicador, as referências, a configuração por provedor e os custos (I-041 e a parte automática desta ideia) viraram a [spec 294](../specs/backlog/294-pesquisa-internet-provedores-custos-e-fontes.spec.md); só o comando manual permanece aqui.
- **Por quê:** quem já sabe que precisa de uma pesquisa pode pedi-la diretamente.
- **Restrição:** exclusivamente dúvidas de código, respeitando o bloqueio administrativo por provedor. Demandas e assuntos internos continuam restritos ao projeto e às suas demandas; o comando não libera busca externa desses dados.
- **Custo aparente:** a definir depois da 294, sobre o fluxo de elegibilidade e isolamento dela, sem contornar suas restrições.

### I-045 — Volume por usuário: quanto cada pessoa fez no mês · frontend/backend

- **Ideia:** ver o volume por usuário: quantas horas e quantas atividades cada pessoa fez no mês (e, por extensão, no ano), no mesmo molde do volume por projeto.
- **Origem:** o autor lembrou, em 2026-10-31, de ter visto algo assim numa tela planejada ("tal usuário fez tantas coisas esse mês, tantas horas") e não achou. Não encontrei nada disso implementado: o Ponto mostra o saldo de horas por usuário contra a meta, e o volume (tasks 197, 199 e 251) é só por projeto.
- **Por quê:** o gestor enxerga a carga e a entrega de cada pessoa sem abrir o ponto de cada uma.
- **Custo aparente:** só gestor; uma consulta por usuário e mês (horas executadas e atividades), uma visão nova (talvez ao lado do Volume em Projetos ou em Usuários) e a decisão de como isso convive com o Ponto da equipe, que já mostra horas por pessoa no dia. Definir com o autor o que é "fez": horas, atividades concluídas ou os dois.

### I-049 — Executável do Project Desktop sem o aviso de "inseguro" ao baixar · desktop
- **Ideia:** o `Project-Desktop-<versão>.exe` deixar de ser tratado como inseguro ao baixar e ao abrir.
- **Origem:** o autor, em 2026-11-03: "toda vez que eu vou baixar ele, ele dá como inseguro".
- **Por quê:** o executável não é assinado (README do desktop), então o navegador (reputação do download) e o SmartScreen do Windows ("editor desconhecido") o barram; cada colega precisa forçar o download e o "Executar assim mesmo".
- **Custo aparente:** depende do caminho, a decidir com o autor. (a) Certificado de assinatura de código OV de uma autoridade certificadora (≈ US$ 150–300/ano, chave em token ou HSM), configurado no `electron-builder`; o aviso some aos poucos, conforme o arquivo ganha reputação. (b) O Azure Artifact Signing (≈ US$ 10/mês) não atende pessoa nem empresa no Brasil hoje. (c) Uso só interno: certificado próprio instalado como confiável nas máquinas da equipe; resolve o "editor desconhecido" do Windows, mas não o aviso do navegador. Antes, confirmar qual aviso aparece: se o site for servido em HTTP, o Chrome também barra o download como "inseguro" por isso, e aí a correção é HTTPS.

### I-050 — Datas de criação e alteração só nas tabelas em que fazem sentido · banco/modelagem
- **Ideia:** hoje toda tabela traz as quatro colunas de `BaseEntity`. `is_deleted` e `deleted_date` ficam em todas, mas `created_date` e `updated_date` só nas que de fato são criadas e alteradas pela aplicação. Tabelas de tipo fixo (`tipo_usuario`, `tipo_prompt`, `tipo_anotacao` e parecidas) não têm criação nem alteração: o conjunto é fixo no sistema, no máximo se exclui uma linha (e aí a data de exclusão serve de auditoria). Algumas só não precisam de `updated_date`. Uma exceção recente é o tipo de usuário, que passou a ser alterado por causa das descrições.
- **Origem:** o autor, em 2026-11-05, ao revisar a migration da spec 261: "nem todas essas entidades precisam desses registros".
- **Por quê:** coluna que nunca muda de valor é ruído e passa a falsa ideia de auditoria. Junto vai a regra do P-074 (excluir não altera `updated_date`).
- **Custo aparente:** a decidir com o autor, tabela por tabela (quais precisam de `created_date`, quais de `updated_date`). Mexe em `BaseEntity`, nas migrations (colunas a remover), no `docs/SCHEMA.md` e nos repositories, e depende da 276/277. A tela de Modelagem poderia passar a exibir esses campos por tabela (relaciona-se com a I-040). Decisão de modelagem: **perguntar ao autor antes de especificar**.


### I-051 — Bloco de código e caixa maior na barra de formatação do campo da IA · chat IA/frontend
- **Ideia:** a barra de formatação do campo do chat com a IA ganha a opção de **bloco de código** (como a do chat entre colaboradores) e um controle para **expandir a caixa de texto para mais alto**, para ler e revisar um texto longo antes de enviar.
- **Origem:** o autor, em 2026-11-05, ao ver o código escapando do balão (corrigido com quebra de linha nos blocos).
- **Custo aparente:** a decidir; mexe só no campo formatado do chat da IA (spec 218/252). Não está especificada.

### I-052 — Guardar o texto original da mensagem editada para a supervisão · chat entre colaboradores/backend

- **Ideia:** quando uma mensagem do chat entre colaboradores é editada (task 313), guardar o texto original (ou todas as versões) e mostrá-lo só à supervisão (gestor e administrador), para a auditoria não se perder.
- **Origem:** o autor, em 2026-11-06, na especificação da 313: primeiro pediu o original guardado, depois mandou deixar isso como ideia e editar sem guardar.
- **Por quê:** sem isso, a supervisão lê só o texto atual e não vê o que foi dito antes da edição.
- **Custo aparente:** decisão de modelagem (já discutida): campo `texto_original` no próprio documento/tabela `mensagem_direta` (migration + OpenSearch/Elasticsearch) lido só pelo DTO da supervisão, ou tabela de edições no PostgreSQL se quiser todas as versões. Perguntar ao autor de novo antes de especificar.

### I-053 — Edição, reação e `@IA` dentro do grupo · chat entre colaboradores

- **Ideia:** editar, reagir e chamar a `@IA` dentro do grupo, como na conversa um a um. (A outra metade desta ideia, a notificação do Windows para mensagem de grupo, foi implementada em 2026-11-12, Project Desktop 1.1.3.)
- **Origem:** a task 247 (2026-11-12): edição, reação e `@IA` não estavam na spec dos grupos, e a tabela de reação amarra o `conversa_id` ao par de pessoas.
- **Por quê:** no grupo ainda não há como corrigir uma mensagem, reagir nem chamar a IA.
- **Custo aparente:** migration em `mensagem_direta_reacao` e regras de permissão por grupo. Decisão de modelagem do autor antes de especificar.
