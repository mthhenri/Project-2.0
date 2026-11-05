# 277 — Remover os triggers de `updated_date`: a aplicação grava a data de alteração

> Decisão do autor (2026-11-04): o banco não carrega lógica. As datas genéricas (`created_date`,
> `updated_date`, `deleted_date`) e `is_deleted` são todas gravadas pela aplicação; `updated_date` é a única
> exceção hoje, mantida por 43 triggers `trg_<tabela>_updated_date` que chamam `fn_set_updated_date()`.
> Irmã da 276 (auditoria do `is_deleted`): as duas compartilham a trava mecânica de SQL.

## Objetivo

Tirar todos os triggers e a função `fn_set_updated_date()` do banco, de modo que todo `UPDATE` do sistema
grave `updated_date = NOW()` explicitamente, sem nenhuma coluna ou data mudar de significado.

## Entregáveis

1. **Inventário dos `UPDATE`s.** Todo `UPDATE` do backend e dos scripts (`repositories`, `services` com SQL,
   `database/scripts/*.sql` e `*.ts`, seeds, `converter-descricoes.ts`) em
   `docs/specs/<estado>/277-remover-triggers-updated-date/INVENTARIO.md`: arquivo, método, tabela, se já grava
   `updated_date` e se o `SET` é montado dinamicamente (caso de `UsuarioRepository.alterar`). Estimativa de partida:
   ~47 `UPDATE`s, 28 já gravam; os outros 19 são limite superior, porque parte monta o `SET` por fragmentos.
2. **Correção.** Todo `UPDATE` passa a gravar `updated_date = NOW()`; o `SET` dinâmico inclui a data por
   construção, não por lembrança. Teste de integração por repository que altera linha: depois do `UPDATE`,
   `updated_date` é maior que `created_date`. Os leitores de `updatedDate` (`plano`, `plano_ponto`, `usuario`,
   `anotacao`) são conferidos um a um.
3. **Migration 0079.** `-- UP`: remove os 43 triggers (por laço sobre `pg_trigger` com o nome `trg_%_updated_date`)
   e a função `fn_set_updated_date()`. `-- DOWN`: recria a função e o trigger de toda tabela pública com coluna
   `updated_date`. Rollback testado de verdade (aplicar, reverter, aplicar de novo). Nenhuma migration antiga é
   editada. Migration nova não cria trigger (o modelo em `SYSTEM.SPEC.md` §9.5 muda).
4. **Testes que citavam o trigger.** `mensagem-direta.integracao.test.ts` e
   `mensagem-direta-provisoria.integracao.test.ts` ("atualizam `updated_date` no UPDATE (trigger)") passam a
   provar que o repository grava a data; um teste de esquema confirma que não sobrou nenhum trigger de negócio
   no banco migrado.
5. **Documentação.** A regra nova já está escrita (2026-11-04) em `SYSTEM.SPEC.md` §9.2 #14 e §16 #27, `CONVENTIONS.md`,
   `SCHEMA.md`, `CLAUDE.md`/`AGENTS.md` e nas skills. Esta spec retira o **legado**: a seção "Função de Trigger" e os
   blocos `CREATE TRIGGER` de cada tabela em `SCHEMA.md`, as menções a `fn_set_updated_date`/`trg_*` em `SYSTEM.SPEC.md`
   (§ de nomes, §9.2 #12) e `CONVENTIONS.md`, e as marcas "(legado)" dos prefixos `trg_`/`fn_`.
6. **Trava mecânica.** O verificador estático de SQL da 276 ganha a regra: `UPDATE` de tabela de negócio sem
   `updated_date` é reprovado (exceto o soft delete e a restauração do `BaseRepository`, que já gravam), ligado ao
   `npm run lint:tudo`. Se a 276 ainda não estiver pronta, esta spec cria o verificador e a 276 o estende.

## Critérios de Aceite

- Banco migrado sem nenhum trigger e sem `fn_set_updated_date` (consulta a `pg_trigger` e `pg_proc` no teste);
  `fn_chat_texto_busca`, `fn_chat_texto_consulta` e a extensão `unaccent` permanecem.
- `npm run test --workspace=backend`, `npm run test:integracao`, `npm run build --workspace=backend`,
  `npm run repo:test`, `npm run lint:tudo` e `npm run repo:verificar` sem falha; o verificador falha de propósito
  num `UPDATE` sem a data (teste) e passa no código real.
- Ao vivo, com o backend real: alterar um registro de cada módulo que altera dado (usuário, projeto, tag, demanda,
  atividade, execução, plano, prompt, proposta) e conferir `updated_date` mudando.
- Inventário cobre 100% dos `UPDATE`s, conferido por busca (`UPDATE`) e batendo com a tabela.
- Revisão independente (agente `revisor`), por tocar SQL em vários módulos e uma migration.

## Fora de Escopo

- Qualquer outra função ou trigger futura; as funções de busca do chat e a `unaccent` ficam.
- Corrigir dado histórico de `updated_date`.
- Mudar o significado de `updated_date` (continua sendo o momento da última alteração da linha).

## Dependências

Nenhuma bloqueante; conversa com a 276 pelo verificador estático. **Regra do autor de 2026-11-05 (P-074 em `PROBLEMS.md`):** excluir não é alterar, então a exclusão não deve gravar `updated_date`. O trigger removido aqui é o que hoje força a data em toda exclusão; ao implementar esta spec, o soft delete (`BaseRepository.executarSoftDelete`) e as exclusões escritas à mão ficam **isentos** da regra "todo `UPDATE` grava `updated_date`" (o verificador do entregável 6 os trata como isentos, não como obrigados a gravar), e a correção do P-074 entra aqui ou logo depois, com o autor. Fontes: `docs/SCHEMA.md`, `docs/SYSTEM.SPEC.md`
§9, `docs/CONVENTIONS.md` e as skills `sql-migrations` e `gerenciamento-de-impacto`.

## Riscos e Mitigação

- **`UPDATE` esquecido deixa a data velha em silêncio.** Mitigação: inventário completo, teste de integração por
  repository e a trava mecânica do entregável 6.
- **`SET` dinâmico** (`UsuarioRepository.alterar`): a data entra na construção da lista de colunas, com teste.
- **Escrita manual no banco** (SQL de suporte, seeds) deixa de atualizar a data sozinha: os scripts do repositório
  são corrigidos aqui; o uso manual passa a ser responsabilidade de quem o faz e fica dito na documentação.
- **Rollback**: o `DOWN` recria os 43 triggers exatamente como estavam; testado em banco real, não só lido.
