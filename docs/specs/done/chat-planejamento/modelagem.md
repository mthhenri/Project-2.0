# Modelagem — modo planejamento do chat com a IA

> Rascunho para revisão do autor (2026-10-25). Nomes e tipos seguem `docs/CONVENTIONS.md` e ainda passam pela skill `sql-migrations`
> antes da migration. Todas as tabelas têm as colunas de `BaseEntity` e soft delete.

## 1. Por que entidade nova

A conversa do chat é do usuário e do dia (`conversa_id = <usuarioId>-<yyyy-mm-dd>`), sem tabela. O plano vive vários dias, é
compartilhado no projeto e tem um documento próprio, que não pode morar nas colunas da demanda enquanto é rascunho (a decisão 12 da
guarda-chuva: a demanda só muda ao publicar). Por isso o plano ganha tabelas próprias e a conversa do dia não muda.

## 2. Tabelas (PostgreSQL)

- **`plano`**: `titulo` (VARCHAR 255), `projeto_id` (FK, anulável: plano amplo e pessoal), `usuario_id` (quem criou; FK),
  `is_solo` (BOOLEAN), `is_arquivado` (BOOLEAN), `descricao_tecnica`, `descricao_cliente`, `documentacao` (TEXT Markdown, anuláveis: o rascunho) e `versao`
  (INTEGER, sobe a cada gravação do documento; base da recusa de gravação sobre versão mais nova).
- **`plano_demanda`**: `plano_id`, `demanda_id` (FKs) e `publicacao_data` (TIMESTAMPTZ, anulável: ligado e ainda não publicado). Único
  `(plano_id, demanda_id)` com `is_deleted = false`; nesta guarda-chuva a service admite **uma** linha por plano. A demanda de destino
  pertence ao projeto do plano. É daqui que o detalhe da demanda tira o "nasceu do plano".
- **`plano_ponto`**: `plano_id`, `rotulo` (VARCHAR 60, **texto livre** escolhido pela IA: "Lacuna", "Risco"...), `texto` (TEXT),
  `situacao` (FK para tabela de referência `tipo_plano_ponto_situacao`: `ABERTO`, `RESOLVIDO`, `DISPENSADO`, `DECISAO`) e
  `resolucao_texto` (TEXT, anulável: resposta, motivo do dispensar ou a decisão).
- **`plano_fonte`**: `plano_id`, `titulo` (VARCHAR 255), `conteudo` (TEXT), `origem` (FK para `tipo_plano_fonte_origem`: `COLADO`,
  `ARQUIVO`), `usuario_id` (quem trouxe). Só texto: o arquivo é lido como texto e não fica guardado como binário.
- **`tipo_prompt`** ganha `PLANEJAMENTO` (a conversa), `PLANO_DESCRICAO_TECNICA`, `PLANO_DESCRICAO_CLIENTE` e `PLANO_DOCUMENTACAO`, com
  seed da versão 1 e nível analítico (confirmar o nível por tipo na task).
- **`tipo_proposta_ia`** ganha o tipo de alteração de trecho do plano; `dados` guarda `planoId`, o texto (aba), `trechoAntigo`,
  `trechoNovo` e a `versao` lida.

## 3. Conversa do plano

As mensagens ficam no `ArmazenamentoDeChat` (índice e tabela provisória de hoje), com uma chave de conversa própria do plano (formato a
definir na task, distinto de `<usuarioId>-<yyyy-mm-dd>`), `usuario_id` do autor de cada mensagem e uma referência opcional ao plano. A
listagem da conversa do plano não filtra por usuário; a autorização vem do acesso ao plano. A suíte de contrato ganha os cenários de
conversa de plano nas três implementações. Os tokens continuam gravados por mensagem, e a aba Custos (task 202) os atribui a quem enviou.

## 4. Regras de acesso

| Ação | Quem | Regra |
|---|---|---|
| Ver plano de projeto e a conversa dele | quem tem acesso ao projeto (gestor e administrador por tipo; desenvolvedor por `demanda_usuario` em alguma demanda do projeto) | com ou sem demanda ligada; se `is_solo`, só o criador |
| Editar plano de projeto | os mesmos | se `is_solo`, só o criador |
| Ver, editar e publicar a aba descrição do cliente | gestor e administrador | o desenvolvedor não vê a aba, e a IA não a lê nem escreve numa conversa dele (`SYSTEM.SPEC.md` §14) |
| Ver e editar plano amplo | só o criador | sem compartilhamento |
| Marcar e desmarcar solo | o criador | |
| Ligar ou trocar a demanda | quem pode editar o plano | e também pode editar a demanda escolhida |
| Arquivar e excluir | o criador, gestor e administrador | exclusão é soft delete |
| Aceitar ou rejeitar alteração de trecho | quem pode editar o plano | |
| Publicar | membro da demanda ligada, gestor e administrador | segue as permissões de edição de demanda de hoje |

## 5. Publicar

1. A pessoa escolhe quais dos três textos vão; cada um mostra o diff contra o texto atual da demanda.
2. Alteração de trecho ainda pendente fica de fora do que é publicado, com aviso.
3. A gravação passa pela `DemandaService` (as permissões de edição de demanda valem) e marca `plano_demanda.publicacao_data`.
4. Depois de publicar, o plano segue editável; a próxima publicação compara de novo com o texto atual da demanda.
