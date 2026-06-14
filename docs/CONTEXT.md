# CONTEXT.md — Project 2.0

> **Leia este arquivo após o SYSTEM.SPEC.md e CONVENTIONS.md.**
> Ele reflete o estado atual do projeto. Ao finalizar uma sessão, atualize as seções
> correspondentes antes de encerrar — a próxima sessão depende dessa informação.

---

## Última Atualização

**Data:** 2026-06-13
**Task concluída:** 11-demanda-hierarquia
**Sessão:** Módulo demanda — CTEs recursivos para árvore e ancestrais

---

## Stack em Uso

| Camada | Tecnologia | Versão |
|---|---|---|
| Backend | NestJS + TypeScript | — |
| Frontend | Angular | 21 |
| UI | PrimeNG | 21 |
| Banco | PostgreSQL | 16 |
| Query layer | Knex.js | — |
| Monorepo | npm workspaces | — |
| Container | Docker + Docker Compose | — |

---

## Implementado

- **00-monorepo-docker** — `package.json` raiz com npm workspaces, `docker-compose.yml` com PostgreSQL 16, `.env`, `.env.example` e `.gitignore`
- **01-shared-package** — pacote `@project20/shared` com 7 enums de negócio, interfaces `StandardResponse` e `PaginatedResult`, e estrutura de pastas de DTOs (9 módulos, prontos para ser populados)
- **02-backend-scaffold** — projeto NestJS estruturado com `package.json`, `tsconfig.json`, `nest-cli.json`, `knexfile.ts`; módulo `DatabaseModule` com Knex configurado; `main.ts` com `ValidationPipe` e `GlobalPrefix`; 10 módulos de negócio esqueleto; placeholders de `core/` (BaseEntity, BaseRepository, exceções, filtro, interceptor) e `config/`
- **03-migrations** — 12 arquivos de migration Knex criados e executados com sucesso; função `fn_atualizar_updated_date()` + 11 tabelas com campos BaseEntity, CHECKs, índices filtrados por `is_deleted = false` e triggers `updated_date`; fix no `knexfile.ts` para usar `path.resolve(__dirname)` e carregar o `.env` corretamente
- **04-core-module** — `BaseEntity`, `BaseRepository` (com `@Inject(DATABASE_CONNECTION)`, JSDoc e todos os métodos protegidos), 3 exceptions (`BusinessException`, `ResourceNotFoundException`, `UnauthorizedAccessException`), `GlobalExceptionFilter` (com tratamento específico para erros de ValidationPipe), `ResponseFormatInterceptor` (com verificação de resposta já encapsulada), re-exports de `StandardResponse` e `PaginatedResult` em `core/interfaces/`, e `CoreModule` registrando filter e interceptor globalmente via `APP_FILTER`/`APP_INTERCEPTOR`; `CoreModule` importado no `AppModule`
- **05-config-service** — `config.interface.ts` com interfaces em português (`ConfiguracaoBancoDados`, `ConfiguracaoJwt`, `ConfiguracaoAnthropic`, `ConfiguracaoAplicacao`, `ConfiguracaoNegocio`, `Configuracao`); `ConfigService` com todas as vars carregadas no constructor e expostas via `obter()`; `ConfigModule` global; `database.provider.ts` e `main.ts` atualizados para usar `configService.obter()`
- **06-usuario-module** — 9 DTOs em `shared/src/dtos/usuario/` (`UsuarioCriarDto`, `UsuarioCriadoDto`, `UsuarioResumoDto`, `UsuarioRecuperadoDto`, `UsuarioListarDto`, `UsuarioAtualizarDto`, `UsuarioAtualizadoDto`, `UsuarioSenhaAlterarDto`, `UsuarioSenhaAlteradaDto`); `Usuario` model em `backend/`; `UsuarioRepository` com SQL bruto (existeLogin, buscarLogin, buscarComSenha, buscarIdentificador, listar, inserir, atualizar, atualizarSenha, excluir, listarGestoresAtivos); `UsuarioService` com regras de negócio (login único, bcrypt rounds=10, validação de senha atual); `UsuarioController` com 6 endpoints (POST, GET, GET/:id, PUT/:id, DELETE/:id, PATCH/:id/senha); `UsuarioModule` registrado no `AppModule`
- **07-autenticacao-module** — 2 DTOs em `shared/src/dtos/autenticacao/` (`AutenticacaoLoginDto`, `AutenticacaoTokenDto`); `JwtPayload` interface; `JwtStrategy` (passport-jwt); `JwtAuthGuard` (global, verifica @Public()); `GestorGuard` (global, verifica @GestorOnly()); decorators `@Public()`, `@GestorOnly()`, `@ActiveUser()`; `AutenticacaoService` (validarCredenciais, gerarToken, login); `AutenticacaoController` com `POST /autenticacao/login` público; `AutenticacaoModule` com `PassportModule`, `JwtModule.registerAsync`, guards globais via `APP_GUARD`; `UsuarioController` e `UsuarioService` atualizados com guards e validação de permissão por tipo de usuário
- **08-tag-module** — 6 DTOs em `shared/src/dtos/tag/` (`TagCriarDto`, `TagCriadaDto`, `TagAtualizarDto`, `TagAtualizadaDto`, `TagResumoDto`, `TagRecuperadaDto`); `Tag` model no backend; `TagRepository` com SQL bruto (existeNome, inserir, buscarIdentificador, listar, atualizar, excluir); `TagService` com regras de negócio (nome duplicado → BusinessException, tag não encontrada → ResourceNotFoundException); `TagController` com 5 endpoints (POST restrito a gestor, GET, GET/:id, PUT/:id restrito a gestor, DELETE/:id restrito a gestor); `TagModule` registrado no `AppModule`
- **09-projeto-module** — 7 DTOs em `shared/src/dtos/projeto/` (`ProjetoCriarDto`, `ProjetoCriadoDto`, `ProjetoResumoDto`, `ProjetoRecuperadoDto`, `ProjetoListarDto`, `ProjetoAtualizarDto`, `ProjetoAtualizadoDto`); `Projeto` model no backend; `ProjetoRepository` com SQL bruto (existeCodigo, inserir, buscarIdentificador, listarTodos, listarPorUsuario, atualizar, excluir); `ProjetoService` com regras de negócio (código duplicado → BusinessException, acesso por tipo de usuário via listarTodos/listarPorUsuario, desenvolvedor sem acesso → ResourceNotFoundException, validação de datas); `ProjetoController` com 5 endpoints (POST/PUT/DELETE restritos a gestor, GET e GET/:id com @ActiveUser para controle de escopo); `ProjetoModule` registrado no `AppModule`
- **10-demanda-crud** — `BaseRepository` atualizado para aceitar `Knex.Transaction` opcional em `executarConsulta` e `executarComando`; 10 DTOs em `shared/src/dtos/demanda/` (`DemandaCriarDto`, `DemandaCriadaDto`, `DemandaResumoDto`, `DemandaRecuperadaDto`, `DemandaListarDto`, `DemandaAtualizarDto`, `DemandaAtualizadaDto`, `DemandaGrafoNoDto`, `DemandaGrafoArestaDto`, `DemandaGrafoDto`); `Demanda` model no backend; `DemandaRepository` com SQL bruto (inserir, inserirDemandaUsuario, inserirComAtribuicao transacional, buscarIdentificador com filtro opcional de usuário, listar com JOIN condicional em demanda_usuario, atualizar, excluir, buscarIdGestoresAtivos, usuarioTemAcessoProjeto, recuperarGrafo); `DemandaService` com regras de negócio (verificação de acesso de desenvolvedor via demanda_usuario, validação de demanda pai no mesmo projeto, auto-atribuição atômica do criador + gestores ativos, controle de acesso no listar/recuperar/atualizar por tipo); `DemandaController` com 6 endpoints (POST, GET, GET/grafo, GET/:id, PUT/:id, DELETE/:id restrito a gestor); `DemandaModule` registrado no `AppModule`
- **11-demanda-hierarquia** — 2 DTOs em `shared/src/dtos/demanda/` (`DemandaArvoreItemDto` com campo recursivo `filhos`, `DemandaAncestralDto`); `DemandaRepository` com `buscarDescendentes` (CTE recursivo descendente — inclui raiz com nível 0) e `buscarAncestral` (CTE recursivo invertido — apenas ancestrais com nível > 0, ordem raiz-para-pai invertida); `DemandaService` com `recuperarArvore` (converte lista plana em árvore aninhada via Map) e `recuperarAncestral` (repassa lista ordenada); `DemandaController` com 2 endpoints (`GET /:id/arvore`, `GET /:id/ancestral`), declarados antes de `GET /:id` para garantir rota correta no NestJS

---

## Em Andamento

*Nenhuma task em andamento.*

---

## Próxima Task

**`docs/specs/backlog/12-demanda-conexao.spec.md`** (grafo de conexões entre demandas — DemandaConexao)

---

## Estrutura de Pastas Atual

```
project-2.0/
  docs/               ✅ criado
  backend/            ✅ criado (task 02)
  frontend/           ⬜ aguardando task 18
  shared/             ✅ criado (task 01)
  docker-compose.yml  ✅ criado
  package.json        ✅ criado
  .env                ✅ criado
  .env.example        ✅ criado
  .gitignore          ✅ criado
```

---

## Módulos do Backend

| Módulo | Status |
|---|---|
| core (base, exceptions, filters, interceptors) | ✅ implementado (task 04) |
| config | ✅ implementado (task 05) |
| database (DatabaseModule + Knex) | ✅ implementado (task 02) |
| autenticacao | ✅ implementado (task 07) |
| usuario | ✅ implementado (task 06) |
| projeto | ✅ implementado (task 09) |
| demanda | ✅ implementado (task 10) |
| atividade | ⬜ pendente |
| execucao | ⬜ pendente |
| ponto | ⬜ pendente |
| calendario | ⬜ pendente |
| tag | ✅ implementado (task 08) |
| assistente | ⬜ pendente |

---

## Módulos do Frontend

| Módulo | Status |
|---|---|
| core (interceptors, guards, signals) | ⬜ pendente |
| shared (components, pipes) | ⬜ pendente |
| autenticacao | ⬜ pendente |
| usuario | ⬜ pendente |
| projeto | ⬜ pendente |
| demanda | ⬜ pendente |
| atividade | ⬜ pendente |
| execucao | ⬜ pendente |
| ponto | ⬜ pendente |
| calendario | ⬜ pendente |
| tag | ⬜ pendente |

---

## Banco de Dados

| Item | Status |
|---|---|
| Migrations criadas | ✅ 12 arquivos (task 03) |
| Tabelas no banco | ✅ 11 tabelas + trigger fn (task 03) |
| Conexão configurada | ✅ DatabaseModule com Knex (task 02) |

---

## Decisões Tomadas

> Decisões registradas ao longo das sessões de implementação.

- Todas as decisões de arquitetura estão documentadas em `docs/SYSTEM.SPEC.md`
- Schema completo em `docs/SCHEMA.md`
- Convenções de código em `docs/CONVENTIONS.md`
- `knexfile.ts` usa `path.resolve(__dirname, '../../../.env')` para carregar o `.env` da raiz corretamente; o path relativo `'../.env'` não funcionava porque o Knex muda o cwd para o diretório do knexfile
- Os arquivos em `core/` (base, exceptions, filters, interceptors) foram criados já com implementação conforme `SYSTEM.SPEC.md`, antecipando a task 04
- Os 9 DTO index files em `shared/src/dtos/*/index.ts` estavam vazios (placeholders da task 01), causando erro de build assim que o primeiro import de `@project20/shared` foi adicionado; corrigidos com `export {};` mínimo — serão substituídos com os DTOs reais nas tasks futuras
- Subpath imports (`@project20/shared/dtos/usuario`) não funcionam com o setup atual (sem `exports` field no package.json nem `paths` no tsconfig); todos os imports do shared usam `@project20/shared` diretamente, que resolve para `src/index.ts` via campo `"main"`
- `UsuarioRepository` tem método `buscarComSenha(id)` além do especificado: necessário para o fluxo `alterarSenha` que precisa comparar a senha atual via bcrypt
- Guards globais (`JwtAuthGuard` e `GestorGuard`) registrados via `APP_GUARD` no próprio `AutenticacaoModule` — padrão NestJS que mantém a lógica de auth coesa no módulo correto; `AutenticacaoModule` importado no `AppModule`
- `UsuarioModule` permanece importado diretamente no `AppModule` além de ser importado transitivamente via `AutenticacaoModule`; NestJS deduplica o módulo no grafo, sem duplicação de providers/controllers
- No `ProjetoService.recuperar`, quando o usuário é DESENVOLVEDOR, a verificação de acesso reutiliza `listarPorUsuario` para checar se o projeto aparece na lista do usuário; isso é semanticamente correto mas realiza uma query extra — aceito pois é consistente com a regra de negócio e evita query SQL inline duplicada
- `BaseRepository.executarConsulta` e `executarComando` passaram a aceitar `Knex.Transaction` como terceiro parâmetro opcional; quando fornecido, usa o executor da transação em vez de `conexaoBancoDados` diretamente
- `DemandaRepository.inserirComAtribuicao` centraliza a transação no repositório, mantendo o serviço limpo e sem injeção de Knex; a service busca os gestores ativos e passa os IDs para o repositório executar atomicamente
- `DemandaRepository.buscarIdentificador` e `listar` aceitam `usuarioId` opcional: quando fornecido, fazem JOIN com `demanda_usuario` para filtrar acesso de desenvolvedor — evita método duplicado e mantém o controle de acesso no SQL
- Rota `GET /demanda/grafo` declarada antes de `GET /demanda/:id` no controller para evitar conflito de rotas no NestJS (ParseIntPipe rejeitaria "grafo" mas a ordem garante a rota correta)
- `DemandaGrafoDto` retorna `arestas: []` nesta task; as conexões explícitas (DemandaConexao) serão adicionadas na task 12
- `DemandaArvoreItemDto.filhos` usa `@ApiProperty({ type: () => DemandaArvoreItemDto, isArray: true })` com lazy getter para suporte a tipos recursivos no Swagger
- A construção da árvore na service usa um `Map<number, DemandaArvoreItemDto>` para O(n) em vez de busca recursiva; o nó raiz é identificado quando `demandaPaiId` é null ou não está no mapa (CTE inicia em demandaId, então seu pai nunca estará no resultado)

---

## Problemas Conhecidos

*Nenhum problema conhecido.*

---

## Notas para a Próxima Sessão

- Ler `SYSTEM.SPEC.md` e `CONVENTIONS.md` antes de iniciar
- Verificar a seção "Próxima Task" acima
- Mover a spec de `backlog/` para `active/` antes de implementar
- Após concluir, mover spec de `active/` para `done/` e atualizar este arquivo

---

## Como Atualizar Este Arquivo

Ao finalizar uma sessão, o Claude Code deve:

1. Mover a task de `active/` para `done/`
2. Adicionar o item em **Implementado** com breve descrição
3. Atualizar o status do módulo correspondente (⬜ → ✅)
4. Atualizar **Próxima Task** com a task seguinte do backlog
5. Registrar em **Decisões Tomadas** qualquer decisão relevante feita durante a implementação
6. Registrar em **Problemas Conhecidos** qualquer dívida técnica ou bug identificado
7. Atualizar **Última Atualização** com data e nome da task concluída
