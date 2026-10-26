# 232-plano-modelo-e-api.spec.md

> Task 2/7 da guarda-chuva [`chat-planejamento.spec.md`](../backlog/chat-planejamento.spec.md) (a 224 é a 1/7): o modelo do plano, do banco à API.
> Sem tela e sem IA. Modelagem de partida em [`chat-planejamento/modelagem.md`](../backlog/chat-planejamento/modelagem.md) (tabelas `plano` e
> `plano_demanda`; as demais ficam para as tasks 235 e 236).

## Objetivo

Existir o **plano** como entidade: documento com três textos Markdown, ligado a um projeto (ou amplo e pessoal), a no máximo uma demanda,
com regras de acesso, solo, arquivar e excluir. A tela e a IA usam esta API nas tasks seguintes.

## Entregáveis

1. **Migration** (a próxima livre na hora, skill `sql-migrations`) com `plano` (`titulo`, `projeto_id` anulável, `usuario_id`, `is_solo`,
   `is_arquivado`, `descricao_tecnica`, `descricao_cliente`, `documentacao` anuláveis, `versao`) e `plano_demanda` (`plano_id`,
   `demanda_id`, `publicacao_data` anulável; único `(plano_id, demanda_id)` com `is_deleted = false`). Nenhuma coluna com `DEFAULT`.
   `docs/SCHEMA.md` atualizado.
2. **`shared`:** DTOs em `shared/src/dtos/plano` (criar, alterar título e textos, `ResumoDto` para o seletor, detalhe, marcar solo,
   arquivar, ligar demanda), seguindo a skill `project20-dto-conventions`. A regra pura de **quem enxerga cada aba** (descrição do
   cliente só para gestor e administrador) fica no `shared`, com teste.
3. **Módulo `plano` no backend** (`backend/src/modules/plano/`: controller fino, service, repository):
   - Criar plano de projeto, plano **amplo** (sem projeto, pessoal) e plano com demanda já ligada.
   - Listar para o seletor: planos que a pessoa vê (projeto com acesso, exceto solo alheio; amplos próprios), com busca por título,
     filtro de arquivados e `ResumoDto`.
   - Ler e **alterar o documento** com a `versao` lida: gravação sobre versão mais nova é recusada (`BusinessException`); cada
     gravação sobe a versão.
   - **Acesso** conforme a tabela "Regras de acesso" da modelagem: projeto (gestor e administrador por tipo; desenvolvedor com linha em
     `demanda_usuario` no projeto), solo (só o criador), amplo (só o criador). O desenvolvedor não recebe nem grava `descricao_cliente`.
   - **Solo:** só o criador marca e desmarca.
   - **Ligar ou trocar a demanda:** quem edita o plano, desde que possa editar a demanda e ela pertença ao projeto do plano. A service
     admite uma linha por plano. **Ponto de partida:** ao ligar a uma demanda com texto, cada aba vazia do plano começa com o texto
     atual da demanda; aba já escrita não é sobrescrita.
   - **Plano amplo ganha projeto** depois, só pelo criador, com confirmação explícita na API (campo do DTO); não volta a ser pessoal.
   - **Arquivar** (sai do seletor, continua na busca) e **excluir** (soft delete): criador, gestor e administrador.
   - **Ciclo com a demanda e o projeto:** demanda excluída deixa o plano sem demanda; projeto excluído leva os planos dele (conferir
     como a exclusão de projeto já cascateia e estender no mesmo ponto).
4. **Repository** só com SQL (`executarConsulta`, `executarComando`, `executarSoftDelete`), `is_deleted = false` em todo `SELECT`,
   `INSERT ... SELECT`.
5. **Testes:** unitários da service (acesso por perfil, solo, amplo, versão, aba do cliente, ligar demanda, ciclo de vida) e do
   `shared`; **teste de integração** dos repositories (`npm run test:integracao`).

## Critérios de Aceite

- `npm run test --workspace=shared` e `--workspace=backend` aprovados; `npm run test:integracao` aprovado com o banco no ar;
  `npm run build --workspace=backend` aprovado. A migration aplica e reverte (`db:migrate` e `db:rollback`).
- Matriz de acesso testada para desenvolvedor com e sem acesso ao projeto, gestor, administrador e criador, em plano de projeto, solo
  e amplo.
- Chamadas reais na API (migration aplicada) mostrando a recusa de versão antiga e a aba do cliente ausente para o desenvolvedor.
- Lint não existe no projeto (`PROBLEMS.md` P-001); declarar no fecho.

## Fora de Escopo

Tela, IA, conversa do plano, pontos em aberto, fontes e publicar (tasks 233 a 237). Mover plano entre projetos. Várias demandas por
plano. Criar a demanda nova a partir do plano (entra na 237, junto da publicação).

## Dependências

Nenhuma de código. Leitura: `SYSTEM.SPEC.md` §14, `docs/SCHEMA.md`, `demanda.service` (permissão de edição de demanda).

## Pontos em aberto (o autor confirma ao abrir a task)

- Título quando a pessoa não dá um (padrão proposto: "Plano sem título"; a IA sugere um depois, na 234).
- Como a exclusão de projeto cascateia hoje (conferir antes de estender).
