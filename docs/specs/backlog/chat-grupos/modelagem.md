# Modelagem — grupos no chat entre colaboradores

> Rascunho para revisão do autor (2026-10-23). Estende [`../chat-colaboradores/modelagem.md`](../chat-colaboradores/modelagem.md); nomes
> e tipos seguem `docs/CONVENTIONS.md` e ainda passam pela skill `sql-migrations` antes da migration.

## 1. Por que entidade nova

A conversa um a um tem `conversa_id = <menor>-<maior>`, sem tabela. Isso não serve a grupo: o conjunto de membros muda e há nome. Além
disso, `mensagem_direta_leitura` exige `outro_usuario_id NOT NULL` e `CHECK (usuario_id <> outro_usuario_id)`, e o documento da
mensagem tem `participantes integer[2]`. Em vez de relaxar essas regras, o grupo ganha tabelas próprias e a conversa um a um não muda.

## 2. Tabelas (PostgreSQL)

- **`grupo`**: `nome`, `tipo` (FK para `tipo_grupo`: `LIVRE`, `PROJETO`, `DEMANDA`), `criador_usuario_id`, `projeto_id` e `demanda_id`
  (opcionais, preenchidos só nos canais; um canal por projeto ou demanda, com índice único parcial `is_deleted = false`).
- **`grupo_membro`**: só do grupo livre (`grupo_id`, `usuario_id`, `entrada_date`, `saida_date`). Nos canais, os membros vêm de
  `demanda_usuario` e não existe linha aqui. Único `(grupo_id, usuario_id)` com `is_deleted = false`; sair é soft delete.
- **`grupo_leitura`**: até onde cada membro leu (`lida_ate_date`) e `silenciada`; o ponto de partida das não lidas é `entrada_date`.
- **`grupo_fixada`**: mensagens fixadas (`grupo_id`, `mensagem_id`, `fixada_por_usuario_id`).
- **`grupo_resumo`**: registro de cada resumo (período, quem acionou, se enviou código, tokens), base do "último resumo" e da aba Custos.

## 3. Mensagem

Mesmo índice ou tabela provisória, com `conversa_tipo` (`DIRETA` | `GRUPO`) e `grupo_id`; `participantes` fica vazio no grupo e a
autorização vem de `grupo_membro` (livre) ou de `demanda_usuario` (canal). `autor`: `USUARIO` ou `SISTEMA` (entrada, saída,
gestor entrou, resumo gravado). A suíte de contrato ganha cenários de grupo nas três implementações.

## 4. Regras de acesso

| Ação | Quem | Regra |
|---|---|---|
| Criar grupo livre | qualquer usuário | criador vira membro |
| Adicionar membro | qualquer membro | inclui gestor e administrador; gestor/admin entrando gera mensagem do sistema |
| Sair | o próprio membro | último a sair fecha o grupo |
| Renomear | qualquer membro | |
| Criar canal | quem tem acesso ao projeto/demanda | um por projeto/demanda |
| Ler/escrever canal | membros por `demanda_usuario`; gestor e administrador leem por tipo | gestor só vira membro ao escrever |
| Supervisão | gestor e administrador | grupo livre sem gestor/admin entre os membros atuais; canal sempre; auditoria e aviso como na task 214 |
| Resumir | qualquer membro | grava só se puder editar a demanda de destino |

## 5. Resumo com a IA

1. Membro escolhe o período (a data do último resumo aparece), se envia código e vê a estimativa; confirma.
2. O servidor lê as mensagens, troca os blocos de código por `[trecho de código omitido]` se necessário, divide em blocos, resume cada
   um e resume os resumos. Cada chamada entra nos custos da IA.
3. Canal de demanda ou de projeto com destino: cria **proposta** de alterar `documentacao` (acrescentar ao fim, com data e período);
   ao confirmar, o canal recebe a mensagem do sistema com o cartão da demanda. Grupo livre: devolve o texto.

## 6. Pontos para decidir na spec de cada task

Limite de membros, saída de `demanda_usuario`, autores no resumo, retenção de `grupo_resumo`, e a mudança no seletor do Desktop (task 213
está em `done/`: a alteração vira task nova).
