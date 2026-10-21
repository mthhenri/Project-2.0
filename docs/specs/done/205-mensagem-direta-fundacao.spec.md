# 205-mensagem-direta-fundacao.spec.md

> Task 1/11 da guarda-chuva [`chat-colaboradores.spec.md`](../backlog/chat-colaboradores.spec.md) (chat entre colaboradores). Modelagem em
> [`chat-colaboradores/modelagem.md`](../backlog/chat-colaboradores/modelagem.md). Abre a trilha: tudo o que as tasks 206 a 215 compartilham (contrato em `shared/`
> e schema no PostgreSQL) para que o armazenamento, a service e as telas trabalhem sobre os mesmos nomes e tipos.

## Objetivo

Deixar pronta a **fundação** do chat entre colaboradores: os enums, as constantes, as regras puras e os DTOs no `shared/`, e a migration `0050` com as três tabelas permanentes
do PostgreSQL (`mensagem_direta_leitura`, `mensagem_direta_preferencia`, `mensagem_direta_supervisao`), com `docs/SCHEMA.md` atualizado. Sem repository, service, rota nem tela.

## Entregáveis

1. **Enums** em `shared/src/enums/`, exportados no índice:
   - `AutorMensagemDiretaEnum` (`USUARIO`, `SISTEMA`): quem escreveu; `SISTEMA` é o aviso de leitura pelo gestor (task 214). Mesmo molde do `AutorChatEnum`.
   - `ReferenciaMensagemDiretaEnum` (`DEMANDA`, `ATIVIDADE`): o que uma `#referência` aponta.
2. **Constantes e regras puras** em `shared/src/utils/mensagem-direta.ts`, com testes, exportadas no índice de `utils`:
   - Limites: texto (10.000 caracteres), menções e referências por mensagem (20 cada), tamanho de página da conversa (padrão 50, máximo 100), tamanho do atalho (40).
   - `PREFERENCIA_PADRAO_DA_MENSAGEM_DIRETA`: o que a service devolve quando o usuário ainda não tem linha em `mensagem_direta_preferencia`
     (avisos e aviso no Desktop ligados, som desligado, sem silêncio, atalho `Ctrl+Shift+Space`). O padrão vive aqui e nunca em `DEFAULT` do banco.
   - Conversa: `montarConversaDiretaId(usuarioA, usuarioB)` (`<menorId>-<maiorId>`, recusa ids inválidos e a mesma pessoa duas vezes),
     `lerConversaDiretaId(conversaId)` (devolve os dois ids ou `null`) e `outroParticipanteDaConversaDireta(conversaId, usuarioId)` (o outro id, ou `null` se a pessoa não é
     participante).
   - Referências: `formatarReferenciaDireta` e `lerReferenciaDireta` (`DEMANDA:212` ⇄ `{ tipo, id }`).
   - Silêncio: `estaSilenciado(silenciadoAteDate, agora)` e `silenciarAteDeReuniao(agora)` (1 hora, "reunião").
   - `contemBlocoDeCodigo(texto)`: vale quando o Markdown tem ao menos um bloco de código cercado (inclusive dentro de citação), usando o interpretador do `shared`; é o que a
     service grava em `contem_codigo`.
   - `REGEX_ATALHO_GLOBAL`: pelo menos um modificador mais uma tecla (`Ctrl+Shift+Space`, `Alt+F1`), para ninguém registrar uma tecla solta como atalho global.
3. **DTOs** em `shared/src/dtos/mensagem-direta/` (só os que o armazenamento e a service das tasks 206 e 208 consomem; os de evento e de supervisão ficam nas tasks 209 e 214):
   - Entrada (classes com `class-validator`): `MensagemDiretaEnviarDto`, `MensagemDiretaListarDto`, `MensagemDiretaBuscarDto`, `MensagemDiretaLeituraAlterarDto`,
     `MensagemDiretaSilencioAlterarDto`, `MensagemDiretaPreferenciaAlterarDto`, e o value-object `ReferenciaMensagemDto`.
   - Saída (interfaces): `MensagemDiretaResumoDto`, `MensagemDiretaEnviadaDto`, `MensagemDiretaListadasDto`, `MensagemDiretaBuscadoDto`, `ConversaDiretaResumoDto`,
     `ConversaDiretaListadasDto`, `MensagemDiretaPreferenciaRecuperadaDto`, `MensagemDiretaPreferenciaAlteradaDto`, `MensagemDiretaLeituraAlteradaDto`,
     `MensagemDiretaSilencioAlteradoDto`.
   - A pessoa da rota (`usuarioId`) é um campo **sem decorator**, preenchido pela controller; com `forbidNonWhitelisted` o corpo que o enviar é recusado.
   - O texto da mensagem **não** usa o validador de caracteres proibidos: código colado tem esses caracteres.
   - A paginação da conversa usa um **cursor opaco** (`cursor` na entrada, `proximoCursor` na saída); quem o monta e lê é o armazenamento (task 206), e o cliente só o devolve.
4. **Migration `0050 - Mensagem direta.sql`** (`-- UP` e `-- DOWN`) com as três tabelas da modelagem, campos de `BaseEntity` explícitos e sem `DEFAULT`, FKs para `usuario`,
   índices únicos parciais (`is_deleted = false`), `CHECK`s de consistência e o trigger `trg_*_updated_date` de cada tabela.
5. **`docs/SCHEMA.md`**: as três tabelas documentadas, a ordem de criação e o resumo de relacionamentos atualizados.
6. **Teste de integração do schema** (`backend/src/database/mensagem-direta.integracao.test.ts`): as constraints existem e funcionam (unicidade, `CHECK`s e FKs).
7. **Ajuste da modelagem**: `modelagem.md` e a guarda-chuva passam a usar os nomes finais (`autor` no lugar de `tipo`, `...PreferenciaRecuperada/AlteradaDto`, cursor opaco).

## Critérios de Aceite

- `npm run test --workspace=shared` passa, com testes novos para cada regra pura (conversa, referência, silêncio, bloco de código, atalho) e para a validação de cada DTO de entrada
  (aceita o válido, recusa o inválido, recusa o `usuarioId` vindo do corpo); o teste de convenção dos enums continua passando.
- Migration aplicada, revertida e aplicada de novo num PostgreSQL 16 real, sem erro; `npm run test:integracao` passa, inclusive o teste novo do schema.
- `npm run build --workspace=backend` e `npm run build --workspace=frontend` compilam com o `shared` novo.
- `npm run repo:verificar` passa. `CLAUDE.md` e `AGENTS.md` continuam idênticos.

## Fora de Escopo

- Contrato de armazenamento, repositories, service, controller, stream de eventos, presença, telas e Project Desktop (tasks 206 a 214).
- DTOs de evento do stream (209) e de supervisão (214); o campo de presença no resumo da conversa (209).
- Tabela provisória das mensagens no PostgreSQL (207).
- Índice do OpenSearch/Elasticsearch: o mapeamento nasce com o armazenamento (206).

## Dependências

Nenhuma task pendente. Fontes: a guarda-chuva e a `modelagem.md`, `docs/SYSTEM.SPEC.md` §5.4 e §9, `docs/SCHEMA.md` e as skills `sql-migrations` e `project20-dto-conventions`.

## Riscos e Mitigação

- **DTOs definidos antes de haver consumidor:** os campos podem precisar de ajuste na 206 ou na 208. Mitigação: o que mudar vira ajuste dentro das próprias tasks, registrado no
  `HISTORY.md`; nada é publicado antes do fim da guarda-chuva.
- **Migration já aplicada nunca é editada:** a `0050` só entra no ambiente depois de aplicada, revertida e reaplicada. Qualquer correção depois disso é uma migration nova.
- **Banco de teste local:** sem Docker no ambiente da sessão, a verificação usa um PostgreSQL 16 local na porta 5433; relatar no fecho.
