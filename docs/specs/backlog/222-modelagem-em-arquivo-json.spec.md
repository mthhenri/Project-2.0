# 222-modelagem-em-arquivo-json.spec.md

> Pedido do autor em 2026-10-24: a organização da tela Modelagem (grupos, tabelas na modelagem, posições) deixa de ser tabela do banco e
> passa a ser um **arquivo JSON local**, efêmero como o armazenamento provisório do chat. **Rascunho para aprovação; não foi implementada.**

## Objetivo

Hoje `modelagem_grupo` e `modelagem_tabela` (migrations `0052` e `0053`) guardam a organização do diagrama. Isso é dado de documentação,
não operacional: perdê-lo num reinício não tem custo de negócio, e as tabelas de uma ferramenta que descreve o banco poluem o próprio
schema de produção. A organização passa a viver em **um único JSON** gravado no disco de quem roda a API.

## Decisões do autor (2026-10-24)

1. **Um arquivo JSON**, com caminho configurável pelo `ConfigService` (padrão dentro da pasta do backend). Se a API morrer e o arquivo
   sumir (Render sem disco persistente), tudo bem. Em produção com volume no container, o arquivo persiste.
2. **Semente preguiçosa:** se o arquivo não existe quando a tela é aberta (ou antes da primeira gravação), a API o gera. Enquanto a API
   estiver viva, todas as edições vão para esse arquivo. Não há rotina de boot.
3. **Escrita segura:** grava num temporário no mesmo diretório e renomeia por cima do arquivo. As gravações dentro do processo são
   serializadas (uma de cada vez). **A última alteração vale**; não há controle de versão entre instâncias.
4. **Multi-instância fora do escopo:** hoje não existe; com mais de uma réplica o arquivo local diverge. Registrar como limite conhecido
   em `CONTEXT.md`.
5. **Isolamento em camadas:** controller e service da modelagem continuam como estão e continuam sem saber de onde vem o dado. Os
   repositories de SQL `ModelagemGrupoRepository` e `ModelagemTabelaRepository` saem, e entra um repository de arquivo. O
   `ModelagemCatalogoRepository` (lê o catálogo do PostgreSQL, o visual das tabelas) **não muda**.
6. **Fora do escopo:** Google Drive ou qualquer armazenamento externo.
7. **Tabelas antigas:** `modelagem_grupo` e `modelagem_tabela` ficam **órfãs no banco, sem DROP**, e são documentadas como mortas, que
   ninguém deve voltar a usar. Quem as lê hoje é só o repository que sai.

## Pontos a resolver na implementação

- **Apagar as migrations `0052` e `0053` (pedido do autor) esbarra no Knex.** O `knexfile.ts` e o `SqlMigrationSource` não ligam
  `disableMigrationsListValidation`, e o Knex, por padrão, recusa rodar quando `knex_migrations` registra uma migration cujo arquivo não
  existe mais ("The migration directory is corrupt"). Isso quebraria `db:migrate` (e o `db:rollback`) em todo ambiente que já aplicou as
  duas, inclusive o de produção. Além disso, o `CLAUDE.md` proíbe editar migration já aplicada. Opções, a decidir com o autor ao
  implementar:
  1. **Manter os arquivos** (recomendado): as duas migrations ficam no repositório como histórico; a documentação marca as tabelas como
     mortas. Zero risco.
  2. **Apagar os arquivos e ligar `disableMigrationsListValidation`:** funciona, mas desliga uma checagem de segurança do Knex para o
     projeto inteiro. Só vale se o autor aceitar esse custo.
  3. **Migration nova (`0054`) com `DROP` das duas tabelas** e manter os arquivos antigos: banco limpo, mas é a única opção que mexe em
     dado; irreversível sem backup.
- **De onde vem o estado inicial do arquivo.** Proposta: a semente é o que a `0052` já traz (6 grupos e as posições de cada tabela),
  transcrita para um arquivo versionado em `modelagem/domain/` (por exemplo `modelagem.semente.ts`). Tabela do banco que não está na
  semente aparece em "Fora da modelagem", como já acontece hoje. Alternativa: derivar do `information_schema`; descartada por perder o
  agrupamento já feito. **Confirmar com o autor.**
- **Formato e versão do JSON.** Um objeto com `versao`, `grupos[]` (id, título, rótulo, ordem, `corIndice`) e `tabelas[]`
  (`nomeTabela`, `grupoId`, `x`, `y`). Os ids dos grupos passam a ser gerados pela aplicação (próximo inteiro livre), pois não há mais
  `SERIAL`. Arquivo ilegível ou com `versao` desconhecida: a API o renomeia para `.corrompido` e gera a semente, sem derrubar a tela.
- **Soft delete deixa de existir** para esses dois conceitos: excluir grupo ou tirar tabela da modelagem remove a entrada do JSON. O
  critério "nunca DELETE físico" é do SQL; aqui não há linha, e o arquivo é descartável por decisão do autor. Registrar a exceção.
- **Soltar tabelas de um grupo excluído** mantém a regra atual do service (a conferir no código ao implementar).

## Escopo técnico

- `backend/src/modules/modelagem/repositories/`: novo repository de arquivo (lê, valida, gera a semente, grava atômico e serializado);
  remover `modelagem-grupo.repository.ts`, `modelagem-tabela.repository.ts` e os `*.integracao.test.ts` deles.
- `modelagem.service.ts` e `modelagem.module.ts`: trocar a injeção; a regra de negócio não muda. `modelagem.service.test.ts` ajusta os
  dublês.
- `ConfigService`: novo parâmetro do caminho do arquivo (e `.env.example`).
- `shared`: os DTOs da modelagem não mudam de forma, salvo se o id do grupo mudar de tipo (não deve).
- Documentação: `SCHEMA.md` (marca as duas tabelas como mortas e ajusta a lista da §19), `CONTEXT.md` (o que é verdade agora),
  `HISTORY.md`, `MEMORY.md` (onde vive o JSON) e `PROBLEMS.md` se surgir limite novo.

## Critérios de Aceite

1. A tela Modelagem funciona igual a hoje (criar, renomear e excluir grupo; mover tabela entre grupos; tirar e pôr tabela; arrastar
   posição), sem ler nem escrever em `modelagem_grupo` e `modelagem_tabela`.
2. Apagar o arquivo com a API no ar e abrir a tela gera a semente e a tela volta ao estado inicial, sem erro.
3. Duas gravações concorrentes não corrompem o arquivo; uma queda no meio da escrita deixa o arquivo anterior intacto.
4. Arquivo corrompido não derruba a tela.
5. `db:migrate` continua funcionando num banco que já aplicou `0052` e `0053` e num banco criado do zero.
6. Testes: unitários do repository de arquivo (diretório temporário: semente, gravação atômica, concorrência, arquivo corrompido),
   ajuste do teste da service e do controller. Sem teste de integração com banco para a modelagem, e `npm run test:integracao` segue
   passando sem os dois arquivos removidos.
7. Verificação ao vivo da tela Modelagem em 1920×1080, 1366×768 e 1080×1920, percorrendo vazio (arquivo apagado), cheio e edição.
8. `npm run repo:verificar`, build do backend e do frontend e testes dos workspaces afetados, com a lacuna de lint declarada (P-001).
