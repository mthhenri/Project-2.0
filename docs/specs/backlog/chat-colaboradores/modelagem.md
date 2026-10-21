# Modelagem — chat entre colaboradores

Anexo de [`../chat-colaboradores.spec.md`](../chat-colaboradores.spec.md). Segue as convenções de
`docs/SCHEMA.md`:
- BaseEntity em todas as tabelas, sem `DEFAULT`;
- soft delete, índices únicos parciais com `is_deleted = false`;
- nomes `pk_`/`fk_`/`uix_`/`ix_`/`chk_`.

Os nomes de coluna, rota e DTO são propostos aqui e confirmados na task de cada bloco (skills
`sql-migrations` e `project20-dto-conventions`). A versão visual desta modelagem e os mockups estão
listados em "Referências" da guarda-chuva.

## 1. Visão geral: o que vive onde

A mensagem é gravada uma vez e nunca reescrita, então cabe num índice de busca, como no chat da IA. O
que muda o tempo todo (até onde cada pessoa leu, preferências, leitura pelo gestor) fica no
PostgreSQL. **Enviar** é uma gravação no índice; **ler** é uma gravação no PostgreSQL. Nenhuma
operação precisa de transação entre os dois armazenamentos.

| Dado | Onde vive | Por quê |
|---|---|---|
| Mensagens | Índice (OpenSearch/Elasticsearch) ou tabela provisória | Gravadas uma vez, buscadas por texto e por código |
| Até onde cada pessoa leu | PostgreSQL | Muda a cada abertura de conversa; dele saem as não lidas e o "Lida" |
| Silenciar uma conversa | PostgreSQL | Mesma linha do marcador de leitura |
| Preferências de aviso e atalho | PostgreSQL | Uma linha por usuário, segue a pessoa em qualquer computador |
| Leitura pelo gestor (auditoria) | PostgreSQL | Consultável e base do aviso aos envolvidos |
| Presença (online) | Memória, derivada | Quem tem o stream aberto está online; não se grava |

## 2. Identidade da conversa

`conversa_id = <menorUsuarioId>-<maiorUsuarioId>` (ex.: `4-9`). Mesmo recurso do chat da IA
(`<usuarioId>-<yyyy-mm-dd>`): o par sempre cai na mesma conversa, não há tabela de conversa nem
passo de "criar conversa". A autorização de envio é conferir que quem manda é um dos dois ids.

**Índice separado.** As mensagens entre pessoas vão para um índice próprio, nunca para o do chat da
IA: aquele índice é lido por busca, por listagem de conversas por dia e pela soma de tokens do custo
(`somarTokens`), e todas as consultas assumem um dono por conversa e o contexto `CHAT` ou `CHECKIN`.

## 3. A mensagem (documento do índice)

Um documento por mensagem, em `snake_case`. Sem edição nem exclusão na primeira versão.

| Campo | Tipo | Para que serve |
|---|---|---|
| `mensagem_id` | keyword (e `_id`) | UUID gerado pelo cliente; dá idempotência ao "Tentar de novo" |
| `conversa_id` | keyword | Identidade determinística da conversa |
| `participantes` | integer[2] | Os dois ids; lista as conversas de uma pessoa |
| `autor_usuario_id` | integer, nulo | Quem escreveu; nulo quando o autor é o sistema |
| `tipo` | keyword | `USUARIO` ou `SISTEMA` (o aviso de leitura pelo gestor) |
| `texto` | text | Markdown; o código colado entra como bloco cercado; analisado em português sem acento, como o chat da IA |
| `contem_codigo` | boolean | Filtro "Com código" e etiqueta na busca |
| `mencoes` | integer[] | Ids mencionados, para gerar aviso |
| `referencias` | keyword[] | `DEMANDA:212`, `ATIVIDADE:57`; viram cartão clicável |
| `criada_date` | date | Instante de gravação, definido pelo servidor; ordena a conversa |

Exemplo:

```json
{
  "mensagem_id": "7f0c2b9e-4c1a-4e6a-9d55-2f6c0d1b8a10",
  "conversa_id": "4-9",
  "participantes": [4, 9],
  "autor_usuario_id": 9,
  "tipo": "USUARIO",
  "texto": "Vi isso ontem. O signal é zerado no ngOnInit.\n\n```ts\nthis.filtro.set(this.filtroSalvo() ?? '');\n```",
  "contem_codigo": true,
  "mencoes": [4],
  "referencias": ["DEMANDA:212"],
  "criada_date": "2026-10-21T14:05:11.482Z"
}
```

Regras que decidem o desenho:

- **Idempotência:** a gravação usa `mensagem_id` como `_id` e falha se já existir; a repetição devolve a
  mensagem que já está lá. Reenviar depois de uma queda nunca duplica.
- **Ordem:** por `criada_date`, com `mensagem_id` como desempate. O índice não tem sequência; duas
  pessoas escrevendo no mesmo milissegundo é um caso aceito.
- **Visibilidade logo após gravar:** o índice é quase em tempo real. A gravação pede
  `refresh=wait_for` e o cliente também recebe a mensagem pelo stream, sem reler o índice.
- **Tamanho:** 10.000 caracteres por mensagem, validado na service (proposta).
- **Autoria:** o servidor define `autor_usuario_id` e `participantes` a partir do token e do
  destinatário; nada disso vem do corpo da requisição.

## 4. PostgreSQL

Três tabelas, todas com os campos de `BaseEntity`. A próxima migration livre é a `0050`. Os
triggers `trg_*_updated_date` seguem o padrão das demais tabelas, e `docs/SCHEMA.md` é atualizado na
mesma task da migration.

### `mensagem_direta_leitura`: até onde cada pessoa leu

Uma linha por pessoa e conversa, criada na primeira leitura ou na primeira vez que a conversa é
silenciada. `lida_ate_date` guarda o `criada_date` da **última mensagem vista**, não o instante da
leitura: uma mensagem que chega entre a busca e a marcação nunca é dada como lida sem ter sido vista.

```sql
CREATE TABLE mensagem_direta_leitura (
  id                SERIAL       NOT NULL,
  created_date      TIMESTAMPTZ  NOT NULL,
  updated_date      TIMESTAMPTZ  NOT NULL,
  is_deleted        BOOLEAN      NOT NULL,
  deleted_date      TIMESTAMPTZ,
  conversa_id       VARCHAR(40)  NOT NULL,
  usuario_id        INTEGER      NOT NULL,
  outro_usuario_id  INTEGER      NOT NULL,
  lida_ate_date     TIMESTAMPTZ,
  silenciada        BOOLEAN      NOT NULL,
  CONSTRAINT pk_mensagem_direta_leitura PRIMARY KEY (id),
  CONSTRAINT fk_mensagem_direta_leitura_usuario FOREIGN KEY (usuario_id) REFERENCES usuario (id),
  CONSTRAINT fk_mensagem_direta_leitura_outro_usuario FOREIGN KEY (outro_usuario_id) REFERENCES usuario (id),
  CONSTRAINT chk_mensagem_direta_leitura_pessoas CHECK (usuario_id <> outro_usuario_id)
);
CREATE UNIQUE INDEX uix_mensagem_direta_leitura_conversa_usuario
  ON mensagem_direta_leitura (conversa_id, usuario_id) WHERE is_deleted = false;
CREATE INDEX ix_mensagem_direta_leitura_usuario ON mensagem_direta_leitura (usuario_id);
```

- **Não lidas:** mensagens do outro com `criada_date` maior que `lida_ate_date`, contadas por uma
  agregação no índice para a lista inteira de uma vez.
- **"Lida":** uma mensagem minha está lida quando a linha do outro tem `lida_ate_date` maior ou igual
  à data dela.

### `mensagem_direta_preferencia`: avisos e atalho

Uma linha por usuário, criada na primeira alteração. Sem linha, a service devolve os valores padrão,
que ficam em constantes do `shared` (nunca `DEFAULT` do banco). O atalho fica aqui para seguir a
pessoa entre computadores; se for melhor guardá-lo só no Project Desktop, a coluna sai.

```sql
CREATE TABLE mensagem_direta_preferencia (
  -- campos de BaseEntity
  usuario_id           INTEGER      NOT NULL,
  avisos_ativos        BOOLEAN      NOT NULL,
  aviso_desktop_ativo  BOOLEAN      NOT NULL,
  som_ativo            BOOLEAN      NOT NULL,
  silenciado_ate_date  TIMESTAMPTZ,
  atalho_global        VARCHAR(40)  NOT NULL
  -- pk_, fk_mensagem_direta_preferencia_usuario e uix_ parcial em (usuario_id)
);
```

"Silenciar por 1 hora" grava `silenciado_ate_date` com o instante final. Quem decide se um aviso
aparece é a service, comparando com a hora atual; não há tarefa agendada para "reativar".

### `mensagem_direta_supervisao`: leitura pelo gestor

Cada abertura de uma conversa de terceiros por gestor ou administrador gera uma linha. Os dois
participantes ficam em colunas próprias para consultar e avisar sem interpretar o `conversa_id`.
`participantes_avisados` diz se aquela abertura gerou aviso. O aviso sai **uma vez por leitor, conversa
e dia** no fuso `APP_TIMEZONE`, para não inundar a conversa.

```sql
CREATE TABLE mensagem_direta_supervisao (
  -- campos de BaseEntity
  leitor_usuario_id       INTEGER      NOT NULL,
  conversa_id             VARCHAR(40)  NOT NULL,
  usuario_menor_id        INTEGER      NOT NULL,
  usuario_maior_id        INTEGER      NOT NULL,
  participantes_avisados  BOOLEAN      NOT NULL
  -- pk_, três fk_ para usuario e ix_ em (leitor_usuario_id, conversa_id, created_date)
);
```

### Tabela provisória (só produção de teste)

`mensagem_direta`, no molde da `chat_mensagem` provisória (migration `0038`): uma linha por mensagem,
`mensagem_id` UUID único, `conversa_id`, os dois participantes, autor, tipo, texto, `contem_codigo`,
menções e referências, com `created_date` como data da mensagem. Busca por `tsvector` reaproveitando
`fn_chat_texto_busca`/`fn_chat_texto_consulta`. Sai **junto** com as tabelas provisórias do chat da IA,
na mesma migration de remoção, com `COMMENT ON TABLE` avisando.

## 5. Regras de acesso

| Ação | Quem pode | Como a service decide |
|---|---|---|
| Enviar | Qualquer usuário ativo, para qualquer outro usuário ativo | Destinatário existe, está ativo e é diferente de quem envia |
| Ler a própria conversa | Os dois participantes | O id de quem lê está no `conversa_id`; o dono vem sempre do token |
| Marcar como lida, silenciar, preferências | O próprio usuário | A linha é sempre a de quem está logado |
| Buscar | O próprio usuário | Filtro obrigatório por `participantes` contendo o id do token |
| Supervisão (listar e ler conversas de terceiros) | Gestor e administrador | Tipo de usuário, nunca `demanda_usuario`; só entram conversas em que **os dois participantes são desenvolvedores** |

**Regra da supervisão (decisão do autor):** conversas que envolvem um gestor ou administrador, mesmo
com um desenvolvedor, ficam **privadas** entre as duas pessoas. É a mesma regra das ferramentas do chat
da IA (task 201), que leem só o chat de desenvolvedores. A elegibilidade é decidida **na hora da
leitura**, pelo tipo atual dos dois usuários, e não gravada na mensagem: se um desenvolvedor virar
gestor, as conversas antigas dele passam a ser privadas, e o contrário também vale. Ler uma conversa
em que o próprio gestor participa segue o caminho normal e não gera auditoria.

O popup deve dizer, em uma linha discreta e permanente, que gestores e administradores podem ler as
conversas entre desenvolvedores.

## 6. Fluxos

**Enviar, receber e marcar como lida:**

1. O cliente de A faz `POST` da mensagem com `idCliente` e texto.
2. A service valida destinatário, tamanho e referências e grava no índice com `op create` e
   `refresh=wait_for`; se já existia, devolve a mesma mensagem.
3. A recebe `MensagemDiretaEnviadaDto`; B recebe o evento `mensagem` pelo stream.
4. B abre a conversa e faz `PUT` da leitura até a data da última mensagem vista; a service grava em
   `mensagem_direta_leitura` e A recebe o evento `leitura`.

**Supervisão:**

1. O gestor lista as conversas entre desenvolvedores (busca e filtro "Com código").
2. Ao abrir uma, a service confere que quem lê é gestor ou administrador e que os dois participantes
   são desenvolvedores (senão 403) e grava uma linha em `mensagem_direta_supervisao`.
3. Se ainda não houve aviso daquele leitor naquela conversa hoje, grava uma mensagem `SISTEMA` na
   própria conversa ("Fulano, gestor, leu esta conversa") e a publica para os dois. O aviso fica no
   histórico.
4. A tela do gestor não tem campo de resposta, e a leitura não marca nada como lida para os
   participantes.

## 7. Contrato de armazenamento

`ArmazenamentoDeMensagemDireta` (token `ARMAZENAMENTO_DE_MENSAGEM_DIRETA`), escolhido pela mesma
variável `CHAT_ARMAZENAMENTO` (task 162): um provider instancia só a implementação escolhida e valor
desconhecido derruba a subida. A autorização fica na service; o armazenamento recebe filtros
explícitos.

| Método | O que faz |
|---|---|
| `gravar` | Grava de forma idempotente pelo `mensagem_id` e devolve a que ficou gravada |
| `listarConversa` | Da mais nova para a mais antiga, com cursor (`antesDe`) e limite; a conversa é contínua, não por dia |
| `listarConversasDoUsuario` | Uma linha por conversa da pessoa: última mensagem e data |
| `contarNaoLidas` | Dado o marcador de cada conversa, quantas mensagens do outro vieram depois (uma agregação para a lista) |
| `buscar` | Texto, período e `somenteCodigo`, sempre restrito a uma pessoa |
| `listarTodasConversas` | Só para a supervisão. Recebe os ids de gestores e administradores (`usuarioIdsExcluidos`, calculados pela service pelo tipo atual) e devolve só as conversas em que nenhum participante está nessa lista, com texto, período, `somenteCodigo` e paginação |

| Ambiente | Implementação | Observação |
|---|---|---|
| Desenvolvimento | OpenSearch | Padrão; divide a lógica de consulta com o Elasticsearch, como `ChatMensagemIndiceRepository` |
| Produção de teste | PostgreSQL provisório | Tabela `mensagem_direta`, busca por `tsvector` |
| Produção final | Elasticsearch | Mesmo contrato e mesma suíte (`CHAT_INTEGRACAO=1`) |

A suíte de contrato é uma só e roda nas três implementações: idempotência, ordem, paginação,
isolamento entre pessoas, busca sem acento, filtro de código, contagem de não lidas e exclusão dos
ids da supervisão.

## 8. API

Controller fino: o `id` que chega por rota ou query entra no DTO dentro da controller; a service nunca
recebe primitivo solto.

| Rota | Quem | O que faz |
|---|---|---|
| `GET /mensagem-direta/conversas` | Usuário | A lista: pessoa, última mensagem, não lidas, silenciada e presença |
| `GET /mensagem-direta/conversa/:usuarioId` | Usuário | Mensagens com `antes` e `limite`, mais o marcador de leitura do outro |
| `POST /mensagem-direta/mensagem` | Usuário | Destinatário, texto, `idCliente`, menções e referências |
| `PUT /mensagem-direta/conversa/:usuarioId/leitura` | Usuário | Data da última mensagem vista |
| `PUT /mensagem-direta/conversa/:usuarioId/silencio` | Usuário | Silencia ou reativa uma conversa |
| `GET /mensagem-direta/busca` | Usuário | Texto, período e `somenteCodigo` |
| `GET` e `PUT /mensagem-direta/preferencia` | Usuário | Avisos, aviso no Desktop, som, silêncio temporário e atalho |
| `GET /mensagem-direta/eventos` | Usuário | Stream com `mensagem`, `leitura` e batimento |
| `GET /mensagem-direta/supervisao/conversas` | Gestor, administrador | Conversas entre desenvolvedores, com busca e filtros |
| `GET /mensagem-direta/supervisao/conversa/:conversaId` | Gestor, administrador | Lê uma conversa entre desenvolvedores, grava a auditoria e dispara o aviso; 403 se algum participante for gestor ou administrador |

O seletor "Para" reaproveita a listagem de usuários existente, sem rota nova.

## 9. Tempo real, contêineres e várias instâncias

O stream segue o padrão do chat da IA: `fetch` com cabeçalho de autorização (`EventSource` só faz
`GET` sem ele). Os eventos são pequenos: `mensagem` leva a mensagem pronta e `leitura` leva a conversa e
a data. Batimento a cada 25 s mantém a conexão e detecta cliente que sumiu.

A **produção final roda tudo em contêineres** (API, front, PostgreSQL e Elasticsearch). A API deve ser
tratada como **várias instâncias**: um deploy sobe o contêiner novo antes de derrubar o antigo, e um
orquestrador pode manter réplicas. A service não fala com o stream diretamente; chama uma porta,
`PublicadorDeEventosDiretos`:

- **Em memória** (desenvolvimento): guarda as conexões da própria instância.
- **`LISTEN/NOTIFY` do PostgreSQL** (produção): avisa todas as instâncias com só os ids; cada uma
  entrega aos seus clientes. Não exige broker novo.

Com duas instâncias e o publicador em memória o sistema falha em silêncio (a mensagem grava, mas o
destinatário só a vê ao recarregar). Por isso o publicador compartilhado entra junto com o stream.

Em contêineres:

- **Reconexão com recuperação:** todo deploy derruba os streams. O cliente reconecta sozinho, com
  espera crescente, e ao voltar busca as mensagens posteriores à última recebida antes de voltar a
  ouvir.
- **Encerramento ordenado:** ao receber o sinal de parada a API para de aceitar streams, avisa os
  clientes e fecha as conexões; o contêiner precisa de tempo de graça suficiente.
- **Proxy reverso:** sem buffer da resposta e com tempo limite de leitura maior que o batimento de 25 s.
- **Balanceamento:** o stream de uma pessoa e o envio da outra podem cair em instâncias diferentes; é o
  caso que o publicador em memória não cobre.
- **Estado fora do contêiner:** a API não guarda nada em disco. Conexões e presença vivem em memória e
  se reconstroem quando os clientes reconectam. PostgreSQL e Elasticsearch ficam em volume persistente.
- **Backup do histórico:** no Elasticsearch as mensagens existem só ali; nó único sem réplica ou volume
  perdido apaga as conversas. Snapshot periódico é decisão de infraestrutura, fora das tasks do chat.

**Presença.** Online é quem tem o stream aberto; com várias instâncias isso também é compartilhado
(mesma task do publicador). O "Em reunião até 15:00" dos mockups viria da suspensão do check-in
("Estou em reunião"), se a task confirmar que o horário final está disponível; senão o rótulo fica em
online, ausente ou offline.

## 10. Front-end e Project Desktop

**Front-end:** módulo `modules/mensagem-direta/` (componentes standalone e Signals): popup, lista,
conversa, nova mensagem, busca e supervisão. O serviço mantém o stream e expõe Signals de conversas,
não lidas e conexão; a lógica pura (rascunho como código, menção, hora) vai para `utils` com teste. O
editor de Markdown e o bloco de código copiável do chat da IA são reaproveitados, e a tela do chat da
IA é o análogo aprovado para a verificação visual.

**Project Desktop:**

- Janela de chat no molde da janelinha do check-in (task 160): sem moldura, sempre por cima,
  arrastável pelo topo, carregando a rota `/chat-popup`.
- `globalShortcut` abre e oculta a janela; a leitura da área de transferência passa pela ponte do
  `preload` e só acontece **no momento do atalho**, e o conteúdo aparece para conferência antes de enviar.
- Decisões em funções puras testadas (arquivo novo, como `politica-do-chat.ts`): quando abrir, quando usar
  o popup interno em vez da janela, como reconhecer código no que foi copiado.
- Com o Project visível vale o popup interno; com o Project oculto, a janela do Desktop. Nunca as duas.
- O executável não se atualiza sozinho: a feature exige uma versão nova do Desktop, e a verificação de
  versão existente (task 198) avisa quem estiver atrasado.

## 11. Nomes (conforme as convenções)

| Item | Nome proposto |
|---|---|
| Módulo do backend e do front | `mensagem-direta` (não colide com o `chat` da IA) |
| Contrato | `ArmazenamentoDeMensagemDireta` e token `ARMAZENAMENTO_DE_MENSAGEM_DIRETA` |
| DTOs de entrada | `MensagemDiretaEnviarDto`, `MensagemDiretaLeituraAlterarDto`, `MensagemDiretaSilencioAlterarDto`, `MensagemDiretaPreferenciaAlterarDto` |
| DTOs de saída | `MensagemDiretaEnviadaDto`, `MensagemDiretaResumoDto`, `ConversaDiretaResumoDto`, `MensagemDiretaPreferenciaDto` |
| Enums | `TipoMensagemDiretaEnum` (`USUARIO`, `SISTEMA`) e `ReferenciaMensagemDiretaEnum` (`DEMANDA`, `ATIVIDADE`) |
| Tabelas | `mensagem_direta_leitura`, `mensagem_direta_preferencia`, `mensagem_direta_supervisao` e a provisória `mensagem_direta` |

Tudo o que é contrato (DTOs, enums, limites, padrões de preferência) vive em `shared/`.
