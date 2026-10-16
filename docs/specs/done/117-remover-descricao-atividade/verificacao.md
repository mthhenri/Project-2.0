# Verificação — Task 117 (remover a descrição da atividade)

Data: 2026-10-16. Capturas e saídas brutas em `.artifacts/117-remover-descricao-atividade/`
(ignorada pelo Git, **não vem no clone**): 9 PNGs em 1920×1080 e 360×800. O veredito abaixo não
depende delas.

## Método

Banco descartável: Postgres 16 local em `/tmp`, porta 5544, sem Docker. API e frontend de
desenvolvimento reais (`ts-node` e `ng serve` com proxy). Navegador: Chromium com Playwright.
Usuário: `gestor.inicial` (seed da migration 0015). Cenário montado por API (projeto, demanda,
atividade) e a interface dirigida pelo navegador.

## Resultados por item da spec

| Item | Resultado |
|---|---|
| 1. Builds | `npm run build --workspace=backend` e `--workspace=frontend`: exit 0, sem erro (avisos de budget de SCSS e `quill-delta` não-ESM já existiam). |
| 2. Migration | `db:migrate`: 28 migrations no lote 1. `db:rollback` desfez o lote inteiro (28) e `db:migrate` reaplicou. Isolando só a `0028`: `migrate:down` deixou `descricao text nullable=YES`; `migrate:up` removeu; colunas finais de `atividade`: `id, created_date, updated_date, is_deleted, deleted_date, demanda_id, usuario_id, nome, tipo_atividade_status_id`. |
| 3. Grep negativo | Sem ocorrência em `shared/src/dtos/atividade` nem no model/service. No repository sobram só `demanda.descricao_*` e `execucao.descricao`. No frontend sobram só os campos de descrição de **execução**, de **registro manual** e de **demanda**. |
| 4. Fluxos de tela | Dialog "Nova Atividade": sem campo; o POST enviado foi `{"demandaId":1,"nome":"Criada pela dialog 117","status":"DESENVOLVENDO"}` e a tabela passou de 1 para 2 linhas. Formulário dedicado `/atividade/nova`: sem campo. Dialog do olho: sem abas nem editor Quill, mostra direto "Últimas execuções". Detalhe `/atividade/:id`: sem seção "Descrição" nem dialog; o botão "Editar" que sobra é o da seção Tags. |
| 5. Assistente | `app-assistente-descricao` presente nos dialogs de iniciar execução, registro manual e edição da descrição da demanda. |

API: criar devolve 201 sem `descricao`; recuperar e alterar devolvem objetos sem a chave;
criar enviando `descricao` devolve 400 `property descricao should not exist`; o endpoint do
assistente com `tipoEntidade: 'atividade'` devolve 400 `must be one of the following values:
execucao, demanda`.

## Limites

- Sem testes automatizados de frontend; a verificação visual cobre as 4 telas e os 3 dialogs do
  assistente, nos dois viewports apenas para listagem/dialogs/detalhe/formulário.
- O assistente foi conferido por presença no DOM; sem chave da Anthropic não houve chamada real à IA.
- Gate visual contra um "análogo aprovado": os dialogs e o detalhe foram comparados com as telas
  vizinhas já existentes (Tags e Execuções recentes no detalhe; demais dialogs da listagem). O
  título "Últimas execuções" do dialog do olho é uma classe nova (`__secao-titulo`) no lugar da
  aba, com tokens do tema.
- **Achado fora do escopo:** a barra de navegação do topo não se adapta a 360 px e gera scroll
  horizontal de ~1388 px em todas as telas testadas (`/tag`, `/projeto`, `/usuario`, formulário).
  Anterior a esta task; registrado em `PROBLEMS.md` P-002.
