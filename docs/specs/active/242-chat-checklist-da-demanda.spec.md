# 242-chat-checklist-da-demanda.spec.md

> Task 1/4 da guarda-chuva [`chat-execucao-por-demanda.spec.md`](chat-execucao-por-demanda.spec.md) (fase 1): a IA passa a tratar as
> atividades como o **checklist** da demanda. Origem: `IDEAS.md` I-025.

## Objetivo

A IA lê o checklist (as atividades) da demanda em que o desenvolvedor trabalha, marca uma atividade como `DESENVOLVIDA` quando o relato
mostra que o bloco acabou e cria uma atividade nova **só quando falta o bloco**. Uma atividade é um bloco do trabalho e tem várias
execuções; a IA não cria uma atividade por execução.

## Entregáveis

1. **Prompts** (editáveis nas Configurações da IA, só do administrador): texto novo que explica que atividade é bloco (exemplo do
   cadastro de usuário: tela, services e controllers, repositório, scripts do banco, testes), que tem várias execuções, que um bloco
   grande vira bloquinhos, que "concluída" é `DESENVOLVIDA` e que, havendo bloco no checklist que serve, a IA o reutiliza. Entra nos
   prompts de conversa e de check-in, com o texto-padrão por migration (a próxima livre na hora, skill `sql-migrations`).
2. **Leitura do checklist para o desenvolvedor:** hoje `consultar_demanda` é `permissao = 'GESTOR'`
   (`backend/src/modules/atividade/ferramentas/consultar-demanda.ferramenta.ts`) e o desenvolvedor não a usa. A IA precisa ler, de uma
   demanda em que o usuário pode criar atividade (a mesma regra de `listar_minhas_demandas`), as atividades com nome, status, dono,
   tempo executado, quantidade de execuções e qual está rodando. Ferramenta de leitura nova (ou ajuste da existente, ver Pontos em
   aberto), com DTOs de entrada e de saída no `shared`, controller fino e regra na service.
3. **Marcar desenvolvida:** `propor_alterar_atividade` já aceita `status` (`DESENVOLVIDA`). O prompt e a descrição da ferramenta passam
   a orientar o uso quando o relato mostra o bloco acabado. Por ora segue como proposta com confirmação; o "faz e avisa" chega com a
   task 243 (que depende da 228).
4. **Criar bloco só quando falta:** `propor_criar_atividade` e `listar_minhas_atividades` ganham, na descrição, a orientação de olhar o
   checklist antes e de preferir a atividade existente. O nome do bloco descreve a parte do trabalho, não a execução.
5. **Teste de prompt** (aba Prompts das Configurações da IA): casos de relato de continuação (mesma atividade), de bloco acabado e de
   bloco novo, registrados na verificação.
6. **Documentação:** `docs/SYSTEM.SPEC.md` (linhas `ferramenta-ia` e `prompt`) com a ferramenta de leitura e o texto novo dos prompts.

## Critérios de Aceite

- `npm run test --workspace=backend` e `--workspace=shared` aprovados, com teste da ferramenta de leitura (desenvolvedor da demanda lê;
  desenvolvedor de fora é recusado; gestor lê) e dos DTOs. Se houver repository novo ou alterado, `npm run test:integracao`.
- `npm run build --workspace=backend` e `--workspace=shared` aprovados.
- Teste de prompt (aba Prompts) com os três casos acima: a IA não cria atividade para uma continuação, propõe `DESENVOLVIDA` quando o
  bloco acabou e propõe criar só quando nenhuma atividade do checklist serve. Relatos e respostas em
  `.artifacts/242-chat-checklist-da-demanda/`, com os limites (modelo, data).
- Verificação ao vivo no chat (skill `verify`) com um desenvolvedor, do relato até o cartão confirmado (sem UI nova; um passe em
  1920×1080 no chat existente basta).

## Fora de Escopo

- Faz e avisa e bom dia (task 243), troca no check-in e aviso de tempo (task 244), lista de demandas (task 245).
- Mudar quem pode criar atividade, ler demanda ou marcar status; mudar as telas de Atividades e Execuções.
- Quebrar bloco automaticamente: a IA só sugere, e o desenvolvedor decide.

## Dependências

- Guarda-chuva `chat-execucao-por-demanda.spec.md` (decisões 1 a 3) e `docs/SYSTEM.SPEC.md` §14.
- Nenhuma task numerada antes. As tasks 243 e 244 usam o que esta entrega.

## Pontos em aberto (o autor confirma ao abrir a task)

- Ferramenta de leitura **nova** (por exemplo `consultar_checklist_da_demanda`) ou abrir `consultar_demanda` ao desenvolvedor? Padrão
  proposto: ferramenta nova e enxuta, para não expor ao desenvolvedor a descrição do cliente que `consultar_demanda` devolve.
- Onde moram os textos: `TipoPromptEnum` hoje tem CONVERSA, CHECKIN, DESCRICAO_EXECUCAO, PAD, PRIORIDADE, ENTREVISTA_DEMANDA,
  CONEXAO_DEMANDA e DUVIDA_CODIGO. Padrão proposto: acrescentar o texto a CONVERSA e CHECKIN, sem tipo novo.
