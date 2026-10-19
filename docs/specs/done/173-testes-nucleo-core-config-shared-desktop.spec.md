# Task 173 — Testes: núcleo (core, config, shared e desktop)

> Task 3/17 da guarda-chuva [`testes-automatizados.spec.md`](testes-automatizados.spec.md). Método comum na guarda-chuva.

## Objetivo

Cobrir o que todos os módulos usam: a base de repository, o formato de resposta e de erro, as exceções, a configuração,
os contratos do `shared` e as convenções que hoje só a revisão confere.

## Entregáveis

1. **`BaseRepository` (integração, task 171):** `executarConsulta` tipada com parâmetros nomeados; `executarComando`;
   `executarSoftDelete` marca `is_deleted`, `deleted_date` e `updated_date` e não apaga a linha; `construirPaginacao`
   (página 1 e N); uso com transação opcional.
2. **`GlobalExceptionFilter`:** cada exceção do projeto (`BusinessException`, `ResourceNotFoundException`,
   `UnauthorizedAccessException`, `ConflictException`), `HttpException` do Nest, erro de validação do `class-validator` e
   erro desconhecido viram o formato de erro de `SYSTEM.SPEC.md` §10 com o status certo; erro desconhecido não vaza
   mensagem interna nem stack.
3. **`ResponseFormatInterceptor`:** resposta embrulhada em `StandardResponse` (§7.6); resposta já padronizada e
   `text/event-stream` não são embrulhadas de novo.
4. **`ConfigService`:** variáveis obrigatórias ausentes derrubam com mensagem clara; padrões documentados em
   `.env.example` são os aplicados (`APP_TIMEZONE`, `INTERVALO_MINIMO_MINUTOS`, `CHAT_ARMAZENAMENTO`).
5. **`shared` — convenções como teste:**
   - todo enum de `shared/src/enums` é string enum com valores `SCREAMING_SNAKE_CASE` iguais aos nomes (§5.4);
   - todo enum com tabela de referência tem os mesmos valores na tabela depois das migrations (integração, task 171);
   - DTOs de entrada com campo de nome/descrição de execução aplicam o validador de caracteres proibidos (§10) — teste
     que percorre os DTOs e lista os que faltam;
   - `nivel-do-tipo-de-prompt`: todo `TipoPromptEnum` tem nível.
6. **`shared` — validação dos DTOs de entrada críticos** com `class-validator`: os de criação/alteração de usuário,
   projeto, demanda, atividade, execução (registro e alteração), dia não útil e tag recusam campo obrigatório ausente,
   tipo errado e campo desconhecido (quando o `ValidationPipe` usa `whitelist`/`forbidNonWhitelisted` — conferir em
   `main.ts`).
7. **`desktop`:** `config.ts` (se tiver decisão) e conferir que `main.ts`/`preload.ts` só delegam às funções puras já
   testadas; o que não for testável sem Electron fica listado no fecho.

## Critérios de Aceite

- Testes novos verdes em `npm test` e, os de integração, em `test:integracao`.
- Cada violação de convenção encontrada pelos testes do item 5 vira teste `todo` com item em `PROBLEMS.md`, não correção.
- Fecho lista as camadas e arquivos cobertos e os deixados de fora com motivo.

## Fora de Escopo

- Corrigir enums, DTOs ou filtros fora do padrão.
- Migrations (já têm `migrations.test.ts` e `sql-migration-source.test.ts`).
- Markdown, fuso e permissões do `shared` (já cobertos), exceto lacuna achada.

## Dependências

171 (itens 1 e o segundo subitem de 5), 172 (só para rodar o desktop na raiz). Fontes: `SYSTEM.SPEC.md` §5.4, §6, §7.5–§7.7,
§10.
