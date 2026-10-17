# Task 125 — Pad estruturado: modelo de dados e API das seções

> Origem: guarda-chuva [`rework-chat-ia.spec.md`](rework-chat-ia.spec.md), bloco 8 (1 de 4), e a seção
> "Pad estruturado" da [`modelagem.md`](rework-chat-ia/modelagem.md). **Só estrutura e backend**: a tela
> segue usando `usuario.anotacoes` até a task 126.

## Objetivo

Criar o pad em **cinco seções** de Markdown (Em andamento, Feito, Pendências, Lembretes e Pessoal) e a
API que lê e altera cada seção, inclusive as operações pontuais que a IA vai usar (trocar um trecho,
anexar ao fim, escrever no "Feito" do dia) e a de mover um trecho entre seções. Nada de IA aqui: são
operações comuns do backend, com permissão e concorrência.

## Entregáveis

### 1. Migration `0030` (schema)

Seguir a skill `sql-migrations` (`-- UP`/`-- DOWN`, sem `DEFAULT`, `INSERT ... SELECT`, índices parciais
com `is_deleted = false`, nomes `pk_`/`fk_`/`uix_`/`ix_`):

- `tipo_anotacao` (molde das tabelas `tipo_*`: `codigo` + `descricao`), seeds nesta ordem: `EM_ANDAMENTO`
  ("Em andamento"), `FEITO` ("Feito"), `PENDENCIA` ("Pendências"), `LEMBRETE` ("Lembretes"), `PESSOAL`
  ("Pessoal"). A ordem de exibição é a do seed (coluna `ordem`, como em `tipo_atividade_prioridade`, se a
  task preferir não depender do `id`).
- `anotacao`: BaseEntity, `usuario_id` (FK), `tipo_anotacao_id` (FK), `texto TEXT NOT NULL` (Markdown,
  seção vazia é `''`) e `uix_anotacao_usuario_tipo_ativa (usuario_id, tipo_anotacao_id) WHERE is_deleted = false`.
- **As 5 linhas de cada usuário que já existe**, com `texto = ''`, na própria migration. O texto atual de
  `usuario.anotacoes` **não** é copiado aqui (vai na 126, junto com a troca da tela, para não ficar
  defasado entre as duas).
- `DOWN` desfaz tudo (drop das duas tabelas).

### 2. Backend (módulo `anotacao`)

Controller fino, service com regra e permissão, repository só SQL (`BaseRepository`), DTOs conforme a skill
`project20-dto-conventions` (nomes confirmados na task).

- **Linhas por usuário:** `UsuarioService.criar` cria as 5 seções junto com o usuário, na mesma transação
  (padrão de `DemandaRepository.inserirComAtribuicao`). Excluir o usuário não apaga as seções (a restauração
  devolve o pad).
- **Ler:** todas as seções do usuário, ou só as pedidas (a IA carrega só o que precisa, para gastar menos
  token). Cada seção traz `tipo`, `texto` e `updatedDate`.
- **Alterar a seção inteira:** recebe o texto e o `updatedDate` que a tela leu. Se a seção mudou no
  meio-tempo, **recusa** com um erro que a tela distingue (ver decisão 1). A comparação usa a data com a
  precisão do JavaScript (`date_trunc('milliseconds', anotacao.updated_date) = :updatedDateLido`): o Postgres
  guarda microssegundos, e a data que o navegador devolve perdeu os três últimos dígitos.
- **Trocar um trecho** (edição pontual): `trechoAntigo` → `trechoNovo` dentro de uma seção, sem reescrever o
  resto. Recusa se o trecho antigo não existir ou aparecer mais de uma vez (ambíguo).
- **Anexar** ao fim de uma seção (com uma linha em branco antes, se a seção não estiver vazia).
- **Escrever no "Feito" do dia:** garante o título `## dd/MM` do dia em `FEITO` (no fuso `APP_TIMEZONE`) e
  anexa o texto debaixo dele, para a IA ler só o dia de hoje.
- **Mover um trecho entre seções:** remove o trecho da origem (precisa aparecer uma vez) e o anexa ao fim do
  destino, **numa transação só**, conferindo o `updatedDate` das duas seções.
- **"Tem anotações"** (`UsuarioResumoDto.temAnotacoes` da listagem de usuários): passa a ser "alguma das 5
  seções tem texto além de espaços" (subconsulta `EXISTS`), em vez de olhar `usuario.anotacoes`.
- **Permissão:** o dono lê e altera o próprio pad; gestor e administrador leem e alteram o de qualquer um
  (como hoje); desenvolvedor não toca no pad de outro (403).

### 3. Testes e documentação

- Testes de `node:test` para as regras puras e de service: concorrência (mesma data aceita, data velha
  recusada), trecho ausente e ambíguo, anexar em seção vazia e não vazia, título do dia criado uma vez e
  reaproveitado, mover trecho (sucesso, e falha numa das duas seções não altera nenhuma), permissão por tipo.
- `docs/SCHEMA.md` (tabelas e seeds), `docs/SYSTEM.SPEC.md` (módulo e regras) e `docs/context/`.

## Decisões em aberto

1. **Conflito de concorrência:** hoje só existem `BusinessException` (400), `ResourceNotFoundException` e
   `UnauthorizedAccessException`. Proposta: nova `ConflictException` (409), tratada pelo filtro de exceções
   como as outras.
2. **Quem altera o pad de outro usuário:** proposta de manter o comportamento atual (gestor e administrador).

## Critérios de Aceite

- `db:migrate` cria as tabelas e as 5 linhas de cada usuário existente; `db:rollback` e novo `db:migrate`
  rodam sem erro.
- Via API real: ler as seções; alterar uma seção com a data lida (200) e com a data velha (409, nada
  gravado); trocar trecho (ok, ausente e ambíguo); anexar; escrever no "Feito" duas vezes no mesmo dia
  (um título só); mover trecho entre duas seções; criar usuário novo já com as 5 seções; listagem de
  usuários com `temAnotacoes` correto.
- Desenvolvedor lê e altera o próprio pad e recebe 403 no de outro; gestor e administrador alteram o de
  qualquer um.
- Testes de `shared` e `backend` e build do backend passam.

## Fora de Escopo

- A tela (task 126) e o menu "Enviar para" (127); remover `usuario.anotacoes` (128).
- Expor estas operações como ferramentas da IA (blocos 5 e 6) e a regra "a IA só escreve em Pessoal quando o
  usuário pede".
- Histórico de versões das seções.

## Dependências

Nenhuma de código (os blocos 1 a 3 já estão prontos). Bloqueia 126, 127 e 128. Fontes:
`rework-chat-ia/modelagem.md` (seção "Pad"), `docs/SCHEMA.md` e `docs/SYSTEM.SPEC.md` §14.
