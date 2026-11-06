# 313 — Editar mensagem no chat entre colaboradores

> Task da guarda-chuva `chat-colaboradores-evolucao.spec.md` (decisões do autor, 2026-11-06). Tem modelagem: as respostas abaixo foram dadas
> pelo autor em 2026-11-06 (original no próprio documento era a opção, depois **descartada**: o original não é guardado, ver I-052).

## O que muda para o usuário

- O **autor** de uma mensagem de texto pode editá-la **até 1 hora depois do envio** (prazo contado em `created_date`). Ação "Editar" no menu da
  mensagem (três pontinhos / botão direito), só na mensagem própria, de pessoa (não do sistema) e dentro do prazo.
- Editar abre o texto no compositor em modo edição (barra "Editando mensagem" com Cancelar, no estilo da barra "Respondendo a…"); Enviar grava.
- A mensagem editada mostra **"editada"** junto ao horário, nos dois lados da conversa, em tempo real.
- Não se edita: mensagem de outra pessoa, do sistema, fora do prazo, nem para texto vazio. Texto igual ao atual não grava nada.

## Modelagem (decidida)

Antes: a mensagem tem `texto` e `created_date`; "gravada uma vez e nunca reescrita". Depois: ganha **`editada_date`** (nula = nunca editada) e o `texto` pode
ser sobrescrito. **Não há `texto_original`** (I-052). Em cada implementação do armazenamento:

- **PostgreSQL:** coluna `editada_date timestamptz` nula em `mensagem_direta` (migration **0082**, sem DEFAULT, sem trigger; `updated_date = NOW()` no UPDATE).
- **OpenSearch / Elasticsearch:** campo `editada_date` no documento (`MensagemDiretaFonte.editada_date?: string | null`), mapeado como `date`.
- **shared:** `MensagemDiretaResumoDto.editadaDate: Date | null`; DTOs novos `MensagemDiretaEditarDto` (entrada: `mensagemId`, `destinatarioId`, `texto`, `mencoes?`, `referencias?`)
  e `MensagemDiretaEditadaDto` (saída). Evento novo do stream `{ tipo: 'EDICAO'; mensagem: MensagemDiretaResumoDto }`. Rota `PATCH /mensagem-direta/mensagem`
  (verbo de edição já usado no projeto; conferir com os controllers vizinhos). Nomes finais: skill `project20-dto-conventions`.
- A regra do prazo e da autoria é **pura no `shared`** (`podeEditarMensagemDireta`, com o relógio recebido por parâmetro), usada pela service (autoridade) e pelo front (só mostra o botão).

## Backend

- `ArmazenamentoDeMensagemDireta.alterarMensagem(...)` no contrato e nas três implementações: recebe conversa, `mensagemId`, autor, novo texto, menções, referências e `contemCodigo`;
  recalcula o que deriva do texto (`contem_codigo`, menções, referências); define `editada_date`; **não muda `created_date`**, a ordem nem o `responde_a_*`. Devolve a mensagem atualizada.
- `MensagemDiretaService.alterarMensagem`: valida destinatário/conversa, que a mensagem existe **na conversa**, que o autor é o `usuarioAtivo`, o prazo (1 h), texto não vazio, mesmas
  validações de referência e menções do envio. Publica `EDICAO` para as duas pontas. `BusinessException`/`UnauthorizedAccessException` conforme o caso.
- A busca e a supervisão leem o texto atual (nada extra). A citação já gravada em outra mensagem (`responde_a_trecho`) **não** é reescrita (decidir no fecho se o trecho deve acompanhar; padrão: não).
- Deixa o contador de não lidas e o marcador de leitura como estão (editar não é mensagem nova nem gera aviso/som).

## Frontend

- Menu da mensagem ganha "Editar" (condição `podeEditarMensagemDireta`); modo edição no compositor; rótulo "editada" com `title` da data; tratamento do evento `EDICAO` (substitui a mensagem
  na conversa e na última mensagem da lista). Análogo visual: a barra "Respondendo a…" e o menu de ações já existentes (task 220/311).

## Testes e verificação

- `shared`: regra de prazo/autoria (limites de 59 min 59 s e 1 h 0 s 1; sistema; outro autor). `backend`: service (autor, prazo, outra conversa, vazio, evento) e o contrato de armazenamento
  nas três implementações (mantém `created_date`, ordem e `respondeA`; recalcula código/menções). Integração do Postgres. `frontend`: componente (opção só na própria mensagem e no prazo, modo edição, "editada", evento).
- Ao vivo (skill `verify`) nos cinco formatos e nos dois temas, com dois usuários: editar, ver "editada" no outro lado, prazo vencido sem a opção. `npm run lint:tudo`, `npm run repo:verificar`.

## Fora de escopo

Guardar/mostrar o original à supervisão (I-052); excluir mensagem; histórico de edições.
