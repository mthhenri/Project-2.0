# Task 131 — Prompts da IA versionados: modelo de dados e API

> Origem: guarda-chuva [`rework-chat-ia.spec.md`](rework-chat-ia.spec.md), bloco 4 (3 de 5), e a seção "Prompt"
> da [`modelagem.md`](rework-chat-ia/modelagem.md). **Só estrutura e backend.**

## Objetivo

Guardar os prompts da IA no SQL, **versionados**, com versão ativa, rascunho, histórico e "restaurar o
padrão", e uma API para o administrador editá-los e para o backend lê-los. A versão 1 de cada tipo vem por
seed e é o "padrão". Nada chama a IA aqui.

## Entregáveis

### 1. Migration `0034` (schema)

- `tipo_prompt`, seeds: `CONVERSA`, `CHECKIN`, `DESCRICAO_EXECUCAO`, `PAD`, `PRIORIDADE`,
  `ENTREVISTA_DEMANDA`, `CONEXAO_DEMANDA` (descrição legível de cada um; a lista cresce por migration, não
  pela tela).
- `prompt`: BaseEntity, `tipo_prompt_id` (FK), `versao`, `conteudo TEXT NOT NULL`, `ativo` (`BOOLEAN`; a versão em
  uso), `rascunho` (`BOOLEAN`; no máximo um por tipo), `usuario_id` (FK, autor da versão) e
  `uix_prompt_tipo_versao (tipo_prompt_id, versao) WHERE is_deleted = false`. **Sem `tipo_prompt_status`**: a
  versão é rascunho (`rascunho = true`), ativa (`ativo = true`) ou antiga (as duas falsas, o histórico). Que há
  uma só ativa e um só rascunho por tipo é regra da **service**, dentro de transação (decisão do autor: não
  usar índice único para isso).
- **Seed da versão 1 de cada um dos 7 tipos**, `ativo = true`, autor `gestor.inicial`. O texto inicial é curto e
  honesto: uma instrução-base em português para cada tipo, que os blocos seguintes refinam quando adotarem o
  prompt (decisão 2). O prompt de `DESCRICAO_EXECUCAO` já existente no `AssistenteService` não é movido aqui
  (fica para quando a tarefa de descrição for adotada pela IA).
- `DOWN` desfaz tudo.

### 2. Shared

- Enum `TipoPromptEnum` e DTOs conforme a skill `project20-dto-conventions`
  (nomes confirmados na task): resumo de versão (tipo, versão, ativa, rascunho, conteúdo, autor, data), entrada de
  rascunho (conteúdo) e as entradas de ativar, arquivar e restaurar padrão.

### 3. Backend (módulo `prompt`)

Controller fino, service com regra, repository só SQL. **Tudo exclusivo de administrador**
(`@AdministradorOnly`, da task 129; leitura e escrita).

- `GET /prompt` (tipos com a versão ativa), `GET /prompt/:tipo/versoes` (histórico do tipo, mais nova
  primeiro), `POST /prompt/:tipo/rascunho` (cria ou **substitui** o rascunho do tipo; no máximo um
  rascunho por tipo), `POST /prompt/:tipo/rascunho/ativar` (promove o rascunho a ativo e a ativa anterior deixa
  de ser ativa, tudo numa transação que trava as linhas do tipo), `POST /prompt/:tipo/restaurar-padrao` (reativa a versão 1; a ativa
  anterior deixa de ser ativa) e `DELETE /prompt/:tipo/rascunho` (descarta o rascunho, soft delete).
- O texto de uma versão nunca é reescrito: editar é criar rascunho; ativar é trocar quem é a ativa. `versao` do
  rascunho é `maior + 1` no momento de criar.
- A service expõe `obterAtivo(tipo)` para os outros módulos, sem passar pelo controller. Os prompts ativos ficam em
  **cache em memória** (a IA não lê o banco a cada mensagem), renovado quando um rascunho é ativado ou o padrão
  é restaurado e na subida; vale para uma só instância do backend.
- Testes (node:test, repositório em memória): ativar troca a ativa e arquiva a anterior, restaurar padrão,
  um rascunho por tipo, 403 por tipo de usuário.

### 4. Documentação

- `docs/SCHEMA.md`, `docs/SYSTEM.SPEC.md` (módulo e regra de versionamento) e `docs/context/`.

## Decisões tomadas pelo autor

1. **Uma ativa por tipo garantida pela lógica da API**, com a coluna `ativo`, sem índice único.
2. **Texto dos seeds:** um texto-base curto por tipo agora; a escrita real dos prompts fica para as tasks dos
   blocos 5 a 9, que os adotam. O administrador pode editar desde já.
3. **"Testar antes de salvar"** (rodar o rascunho contra narrativas reais guardadas) é desejado e **entra como
   task do bloco 5**, porque precisa do chat e das mensagens no OpenSearch.

## Critérios de Aceite

- `db:migrate`, `db:rollback` e novo `db:migrate` rodam sem erro; cada um dos 7 tipos tem a versão 1 ativa.
- Ativar um rascunho deixa exatamente uma versão ativa por tipo; duas ativações simultâneas nunca deixam
  duas ativas (a transação serializa; teste com duas chamadas concorrentes).
- Restaurar padrão reativa a versão 1 sem apagar o histórico; a ativa anterior continua listada no histórico.
- Gestor e desenvolvedor levam 403 em todas as rotas; administrador usa todas.
- Testes de `shared` e `backend` e builds passam; frontend sem alteração.

## Fora de Escopo

- A tela de prompts (task 133) e o "testar antes de salvar" (bloco 5, com task própria).
- Interpolação de variáveis nos prompts e escolha do prompt por contexto (cada bloco que adota um prompt
  define como o preenche).
- Mover o prompt hoje fixo no `AssistenteService` e o do relatório.

## Dependências

Depende da **129** (`@AdministradorOnly`). Bloqueia a 133. Independente da 130.
