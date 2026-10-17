# Modelagem de dados — rework do chat com IA

Anexo de [`../rework-chat-ia.spec.md`](../rework-chat-ia.spec.md). Segue as convenções de
`docs/SCHEMA.md`:
- BaseEntity em todas as tabelas, sem `DEFAULT`;
- enums como tabelas `tipo_*` (`codigo` + `descricao`);
- soft delete, índices únicos parciais com `is_deleted = false`;
- nomes `pk_`/`fk_`/`uix_`/`ix_`/`chk_`.

Os nomes de coluna são propostos aqui e confirmados na task de cada bloco (skill
`sql-migrations`).

## Postgres

### Sem mudança de tabela

- **Administrador:** seed `ADMINISTRADOR` em `tipo_usuario` e migration que converte o
  `gestor.inicial`.
- **Execução:** `execucao.descricao` recebe a descrição provisória e depois a definitiva. A
  narrativa crua do dev fica no chat, referenciando a execução.
- **Check-in:** sem tabela. O último check-in é o `inicio_data` da execução ativa, o próximo é
  sorteado pelo Electron e a suspensão por reunião fica em memória no backend.

### Prioridade

- `tipo_atividade_prioridade`, no molde das tabelas de referência, mais `ordem` (INTEGER) e `cor`
  (VARCHAR(7)).
- Seeds, nesta ordem: URGENTE, ALTA, MEDIA, BAIXA, INDEFINIDA.
- Só o administrador altera `cor`; `codigo` e `descricao` são fixos.
- `atividade.tipo_atividade_prioridade_id INTEGER NOT NULL`, com FK. As atividades existentes
  recebem INDEFINIDA na própria migration, já que não há `DEFAULT`.

### Pad

```
tipo_anotacao: EM_ANDAMENTO, FEITO, PENDENCIA, LEMBRETE, PESSOAL

anotacao
  BaseEntity
  usuario_id        INTEGER NOT NULL  → usuario(id)
  tipo_anotacao_id  INTEGER NOT NULL  → tipo_anotacao(id)
  texto             TEXT    NOT NULL  -- Markdown; seção vazia = ''

  uix_anotacao_usuario_tipo_ativa (usuario_id, tipo_anotacao_id) WHERE is_deleted = false
```

- Cada usuário tem sempre as 5 linhas. A service cria as linhas junto com o usuário, e uma
  migration cria as de quem já existe.
- **Migração:** `usuario.anotacoes`, convertido de HTML para Markdown, vai inteiro para PESSOAL.
  Depois, uma migration nova remove `anotacoes` e `anotacoes_alteracao_data` de `usuario`.
- **Concorrência:** salvar compara o `updated_date` lido. "Enviar para" altera as duas seções
  numa única transação.
- **"Tem anotações"** (listagem de usuários) passa a significar que alguma das 5 seções não está
  vazia.

### Prompt

```
tipo_prompt: CONVERSA, CHECKIN, DESCRICAO_EXECUCAO, PAD, PRIORIDADE,
             ENTREVISTA_DEMANDA, CONEXAO_DEMANDA

prompt
  BaseEntity
  tipo_prompt_id  INTEGER NOT NULL → tipo_prompt(id)
  versao          INTEGER NOT NULL
  conteudo        TEXT    NOT NULL   -- Markdown
  ativo           BOOLEAN NOT NULL   -- a versão em uso (uma por tipo)
  rascunho        BOOLEAN NOT NULL   -- no máximo um por tipo
  usuario_id      INTEGER NOT NULL → usuario(id)   -- autor da versão

  uix_prompt_tipo_versao (tipo_prompt_id, versao) WHERE is_deleted = false
```

- A versão 1 de cada tipo vem por seed e é o "padrão". Restaurar o padrão é reativar a versão 1.
- O rascunho é o que permite "testar antes de salvar".
- **Uma só ativa e um só rascunho por tipo** é regra da service, dentro de transação (sem índice único, por decisão do autor). Os prompts
  ativos ficam em cache em memória, renovado ao ativar ou restaurar.

### Configuração da IA

```
tipo_provedor_ia: ANTHROPIC, GOOGLE, OPENAI

configuracao_ia
  BaseEntity
  versao                       INTEGER      NOT NULL
  tipo_provedor_ia_id          INTEGER      NOT NULL → tipo_provedor_ia(id)
  modelo_rapido                VARCHAR(100) NOT NULL
  modelo_padrao                VARCHAR(100) NOT NULL
  modelo_analitico             VARCHAR(100) NOT NULL
  esforco_analitico            VARCHAR(20)  NOT NULL   -- BAIXO/MEDIO/ALTO; enum do shared, sem tabela (cada provedor traduz)
  checkin_minimo_minutos       INTEGER      NOT NULL
  checkin_maximo_minutos       INTEGER      NOT NULL
  duracao_recomendada_minutos  INTEGER      NOT NULL
  checkin_inteligente          BOOLEAN      NOT NULL
  rigor_proporcional           BOOLEAN      NOT NULL
  deteccao_automatica          BOOLEAN      NOT NULL
  ia_desligada                 BOOLEAN      NOT NULL
  usuario_id                   INTEGER      NOT NULL → usuario(id)   -- quem salvou

  uix_configuracao_ia_versao (versao) WHERE is_deleted = false
  chk_configuracao_ia_intervalo_checkin (checkin_minimo_minutos < checkin_maximo_minutos)
```

- Uma linha por versão, e a ativa é a de maior `versao`. Os modelos são `VARCHAR` porque mudam
  de nome com frequência.
- A chave da API do provedor **não** fica no banco: fica no `.env`, lida via `ConfigService`.
- Booleanos sem prefixo (`ativo`, `rascunho`, `ia_desligada`...), por decisão do autor. A configuração ativa fica em cache em
  memória no backend, renovado a cada versão gravada.

### Proposta da IA

```
tipo_proposta_ia: INICIAR_EXECUCAO, PAUSAR_EXECUCAO, CRIAR_ATIVIDADE,
                  DESCREVER_EXECUCAO, SUSPENDER_CHECKIN, ANOTAR_PAD,
                  CRIAR_DEMANDA, DESCREVER_DEMANDA, CONECTAR_DEMANDA
tipo_proposta_ia_status: PENDENTE, CONFIRMADA, AJUSTADA, EXPIRADA, DESFEITA

proposta_ia
  BaseEntity
  usuario_id                  INTEGER     NOT NULL → usuario(id)
  tipo_proposta_ia_id         INTEGER     NOT NULL → tipo_proposta_ia(id)
  tipo_proposta_ia_status_id  INTEGER     NOT NULL → tipo_proposta_ia_status(id)
  dados                       JSONB       NOT NULL   -- argumentos da ação, validados na service
  resolucao_data              TIMESTAMPTZ
  resultado                   JSONB                  -- ids do que foi criado ou alterado
```

- **A confirmação é atômica:**
  `UPDATE ... SET status = CONFIRMADA WHERE id = :id AND status = PENDENTE RETURNING ...`. Um
  duplo clique nunca executa a ação duas vezes.
- **Desfazer** é mais um status, e aplica a ação inversa pela própria service.
- **A ação passa pela service do domínio,** com as mesmas validações e permissões da tela.
- **Auditoria:** a tabela responde "o que a IA propôs e quem confirmou". A mensagem do chat
  aponta para a proposta por `proposta_id`.

### Fora do banco

- O estado da IA (no ar ou fora) é saúde em tempo real e fica em memória no backend.
- O "agora não" do usuário, depois que a IA volta, fica no navegador.

## OpenSearch

Um índice único, `chat-mensagem`, com um documento por mensagem, gravado uma vez e nunca
reescrito.

| Campo | Tipo | Observação |
|---|---|---|
| `mensagem_id` | keyword | identificador |
| `conversa_id` | keyword | `<usuario_id>-<yyyy-mm-dd>`, uma conversa por dia |
| `usuario_id` | integer | dono da conversa |
| `contexto` | keyword | `CHAT` ou `CHECKIN` |
| `autor` | keyword | `USUARIO`, `IA` ou `SISTEMA` |
| `texto` | text (`brazilian`) + keyword | busca textual em português |
| `nivel` | keyword | `RAPIDO`, `PADRAO` ou `ANALITICO` |
| `modelo` | keyword | modelo que respondeu |
| `tokens_entrada` / `tokens_saida` / `tokens_cache` | integer | base do painel de custo futuro |
| `proposta_id` / `execucao_id` / `atividade_id` / `demanda_id` | integer | referências opcionais |
| `conteudo_bruto` | object, `enabled: false` | blocos no formato do provedor, inclusive chamadas de ferramenta; remonta a conversa após F5 ou queda |
| `created_date` | date | filtro de período e retenção |

- Os períodos (mês, ano) e a retenção saem de filtros por `created_date`, sem índices por mês.
- Não há exclusão por documento. A retenção futura é uma exclusão por consulta de datas antigas.
- O acesso fica num repository do chat no backend, para trocar OpenSearch por Elasticsearch num
  lugar só.
