# 207-mensagem-direta-armazenamento-postgres-provisorio.spec.md

> Task 3/11 da guarda-chuva [`chat-colaboradores.spec.md`](../backlog/chat-colaboradores.spec.md). Modelagem em
> [`chat-colaboradores/modelagem.md`](../backlog/chat-colaboradores/modelagem.md) (§7). Depende da [`206`](./206-mensagem-direta-armazenamento-em-indice.spec.md). No molde da
> [`162`](../done/162-chat-armazenamento-trocavel-e-postgres-provisorio.spec.md), do chat com a IA.

## Objetivo

Dar às mensagens entre colaboradores a terceira implementação do contrato `ArmazenamentoDeMensagemDireta`: tabela **provisória** no PostgreSQL, para a **produção de teste**
(`CHAT_ARMAZENAMENTO=postgres`) rodar o chat sem um serviço de busca. Ela passa pela **mesma suíte de contrato** das duas implementações em índice, e traz junto o plano de
remoção, porque na produção final as mensagens ficam no Elasticsearch.

## Entregáveis

1. **Migration `0051`** com a tabela `mensagem_direta`, marcada como provisória (`COMMENT ON TABLE` e comentário no arquivo), no padrão da `0038`: campos de `BaseEntity` sem
   `DEFAULT`, `mensagem_id` UUID único, `conversa_id` (`VARCHAR(21)`), `usuario_menor_id` e `usuario_maior_id` (os dois participantes; `CHECK` de menor < maior e de que o texto
   bate com os dois ids), `autor_usuario_id` (anulável), `autor`, `texto`, `contem_codigo`, `mencoes` (`INTEGER[]`) e `referencias` (`TEXT[]`, `DEMANDA:212`). **Sem FK para
   `usuario`**, como `chat_mensagem` e como os documentos do índice: a suíte de contrato usa ids que não existem. Índices: leitura da conversa
   (`conversa_id`, `created_date`, `mensagem_id`), um por participante e GIN em `fn_chat_texto_busca(texto)` (a função da `0038`, a mesma busca sem acento). `DOWN` derruba a tabela.
2. **`MensagemDiretaPostgresRepository`** (estende `BaseRepository`, SQL puro com parâmetros nomeados, sem `DELETE`, sem alteração de mensagem), implementando os seis métodos do
   contrato com o mesmo resultado dos índices:
   - `gravar`: `INSERT ... SELECT ... ON CONFLICT (mensagem_id) DO NOTHING RETURNING`; se o id já existia, lê a linha e aplica a mesma regra de origem (mesmo autor, mesma
     conversa, senão `BusinessException`). `created_date` definido pelo servidor da aplicação, em milissegundos, como nos índices.
   - `listarConversa`: da mais nova para a mais antiga, `limite + 1`, cursor opaco **o mesmo** dos índices (`created_date` em ms e `mensagem_id`), comparado por linha
     (`(created_date, mensagem_id) < (...)`).
   - `listarConversasDoUsuario`, `contarNaoLidas` (uma consulta, só mensagem `USUARIO` que não é minha, depois do marcador), `buscar` (todas as palavras, sem acento, relevância
     e depois a mais recente), `listarTodasConversas` (sem conversa com os ids excluídos, com texto, período e código, paginação e total).
3. **Regras comuns extraídas** do `MensagemDiretaIndiceRepository` para o domínio, para os três armazenamentos não duplicarem validação: validação da consulta da conversa
   (conversa, limite, cursor), das não lidas, da busca e da página da supervisão, a montagem da página de mensagens e a regra de "mesma origem" do reenvio. Os testes da 206
   continuam passando sem mudança de comportamento.
4. **Provider**: `postgres` instancia `MensagemDiretaPostgresRepository` com a conexão do banco (o provider passa a injetar `DATABASE_CONNECTION`); deixa de falhar na subida.
5. **A suíte de contrato roda no PostgreSQL** em `mensagem-direta-postgres.repository.integracao.test.ts`, sem `CHAT_INTEGRACAO` (o banco de teste é local e faz parte de
   `npm run test:integracao`). A suíte ganha a opção de ficar sempre ligada; a execução fica dentro de uma transação descartada, sem `DELETE`.
6. **Plano de remoção** registrado em `docs/SCHEMA.md` (tabelas provisórias) e no cabeçalho da migration: uma migration nova derruba `mensagem_direta`, junto com
   `MensagemDiretaPostgresRepository` e o ramo `postgres` do provider. As funções `fn_chat_texto_*` são da `0038` e só saem quando o `chat_mensagem` e a `mensagem_direta` já
   saíram (a tabela depende delas por índice).
7. **Documentação**: `docs/SCHEMA.md`, `docs/SYSTEM.SPEC.md` (módulo, variável e tabela provisória), `CONTEXT.md`, `HISTORY.md` e `MEMORY.md`.

## Critérios de Aceite

- A suíte de contrato passa **no PostgreSQL real** (`npm run test:integracao`), com os mesmos cenários que as duas implementações em índice.
- A migration `0051` aplica, reverte e reaplica; o teste de integração do esquema cobre unicidade, `CHECK`s, ausência de `DEFAULT` e o trigger de `updated_date`.
- `npm run test --workspace=backend` e `npm run build --workspace=backend` passam; o `shared` não muda.
- `npm run repo:verificar` passa. `CLAUDE.md` e `AGENTS.md` continuam idênticos.

## Fora de Escopo

- Service, controller e rotas (208), stream de eventos (209), telas e Desktop.
- Executar a suíte nos serviços de busca reais: continua sendo o critério aberto da 206.
- Alterar ou excluir mensagem; mexer no `chat_mensagem` ou nas funções `fn_chat_texto_*`.
- Registrar o módulo no `AppModule` (208).

## Dependências

`206` (contrato e suíte; ainda em `active/` por causa da execução nos serviços reais), `205` (em `done/`). Fontes: `modelagem.md`, `docs/SCHEMA.md` (tabelas provisórias),
`ChatMensagemPostgresRepository` e a migration `0038`.

## Riscos e Mitigação

- **Ordem do cursor diferente entre o PostgreSQL e os índices.** O `mensagem_id` é UUID no banco e `keyword` no índice; a ordem de bytes de um UUID é a da string em hexadecimal
  minúsculo, então coincidem. Um UUID em maiúsculas é normalizado pelo banco (volta em minúsculas); a service (208) grava o `mensagemId` em minúsculas. A suíte de contrato cobre
  a paginação sem repetir nem pular.
- **Precisão da data.** O banco guarda microssegundos, a aplicação grava milissegundos: a data lida é exatamente a gravada, e o cursor (em ms) compara sem erro.
- **Função de busca compartilhada com o chat da IA.** A remoção de uma implementação não pode derrubar a função da outra: o plano de remoção fixa a ordem (tabelas primeiro, funções
  por último).
