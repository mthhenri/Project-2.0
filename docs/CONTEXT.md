# CONTEXT.md — Project 2.0

> **Leia este arquivo após o SYSTEM.SPEC.md e CONVENTIONS.md.**
> Ele reflete o estado atual do projeto. Ao finalizar uma sessão, atualize as seções
> correspondentes antes de encerrar — a próxima sessão depende dessa informação.

---

## Última Atualização

**Data:** 2026-06-16
**Task concluída:** 26-frontend-demanda
**Sessão:** Frontend demanda — grafo D3 com force simulation, árvore recursiva, formulário, detalhe com 6 abas

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
- **12-demanda-grafo** — 3 DTOs em `shared/src/dtos/demanda/` (`DemandaConexaoCriarDto`, `DemandaConexaoCriadaDto`, `DemandaConexaoResumoDto`); `DemandaRepository` com `verificarCriariaCiclo` (CTE recursivo conforme SCHEMA.md), `existeConexao` (helper para prevenir duplicatas), `inserirConexao`, `listarConexoes` (CASE para identificar direção saída/entrada/bidirecional), `excluirConexao` (soft delete direto em `demanda_conexao`), `conexaoPertenceADemanda` (autorização no delete); `recuperarGrafo` atualizado para retornar arestas reais via JOIN com `demanda_conexao`; `DemandaService` com `criarConexao` (6 validações: acesso, existência origem/destino, auto-referência, duplicata, ciclo), `listarConexoes`, `excluirConexao`; `DemandaController` com 3 endpoints (`POST /:id/conexao`, `GET /:id/conexao`, `DELETE /:id/conexao/:conexaoId` restrito a gestor)
- **13-demanda-tags-atribuicoes** — 5 DTOs em `shared/src/dtos/demanda/` (`DemandaTagsAtribuirDto`, `DemandaTagsAtribuidasDto`, `DemandaUsuarioAtribuirDto`, `DemandaUsuarioAtribuidoDto`, `DemandaMembroDto`); `DemandaRepository` com 8 métodos novos (`listarTagsDemanda`, `atribuirTagsDemanda` com sync, `removerTagDemanda`, `listarMembrosDemanda`, `atribuirMembroDemanda`, `removerMembroDemanda`, `membroJaAtribuido`, `contarMembrosDemanda`); `DemandaModule` importa `TagModule` e `UsuarioModule`; `DemandaService` com 5 métodos (`atualizarTagsDemanda`, `listarTagsDemanda`, `listarMembros`, `atribuirMembro`, `removerMembro`) com injeção de `TagRepository` e `UsuarioRepository`; `DemandaController` com 5 endpoints (`PUT /:id/tag` gestor, `GET /:id/tag`, `GET /:id/membro`, `POST /:id/membro` gestor, `DELETE /:id/membro/:usuarioId` gestor)
- **14-atividade-module** — 9 DTOs em `shared/src/dtos/atividade/` (`AtividadeCriarDto`, `AtividadeCriadaDto`, `AtividadeResumoDto`, `AtividadeRecuperadaDto`, `AtividadeListarDto`, `AtividadeAtualizarDto`, `AtividadeAtualizadaDto` como re-export de Recuperada, `AtividadeTagsAtribuirDto`, `AtividadeTagsAtribuidasDto`); `Atividade` model no backend; `AtividadeRepository` com SQL bruto (inserir, buscarIdentificador com JOIN a usuario, listar com paginação e filtro de status, atualizar, excluir, usuarioTemAcessoDemanda via demanda_usuario, listarTags, atualizarTags com sync); `AtividadeService` com 7 métodos (criar com verificação de acesso via demanda_usuario, listar com restrição de desenvolvedor, recuperar, atualizar com regra autor-ou-membro para desenvolvedor, excluir, atualizarTags, listarTags); `AtividadeController` com 7 endpoints (POST, GET, GET/:id, PUT/:id, DELETE/:id gestor, PUT/:id/tag gestor, GET/:id/tag); `AtividadeModule` importa `DemandaModule` e `TagModule`; registrado no `AppModule`
- **15-execucao-module** — 8 DTOs em `shared/src/dtos/execucao/` (`ExecucaoIniciarDto`, `ExecucaoIniciadaDto`, `ExecucaoEncerrarDto`, `ExecucaoEncerradaDto`, `ExecucaoAtualizarDto`, `ExecucaoAtualizadaDto` como re-export de Encerrada, `ExecucaoListarDto`, `ExecucaoResumoDto`); `Execucao` model no backend; `ExecucaoRepository` com 8 métodos (inserir, encerrar, buscarIdentificador com `duracaoMinutos` calculado via EXTRACT EPOCH, listar com JOIN em atividade e usuario e filtros opcionais de atividadeId/usuarioId/data, buscarExecucaoAtiva via JOIN com atividade para checar usuario_id, atualizar, excluir, buscarUsuarioExecucao para autorização); `ExecucaoService` com 6 métodos (iniciar com validação de atividade + acesso demanda + concorrência, encerrar com validação fimData e dono, listar com restrição de desenvolvedor às próprias, recuperar, atualizar com regra de dono para desenvolvedor, excluir); `ExecucaoController` com 6 endpoints (POST, GET, GET/:id, PATCH/:id/encerrar, PUT/:id, DELETE/:id gestor); `ExecucaoModule` importa `AtividadeModule`; registrado no `AppModule`
- **16-calendario-module** — 6 DTOs em `shared/src/dtos/calendario/` (`DiaNaoUtilCriarDto`, `DiaNaoUtilCriadoDto`, `DiaNaoUtilResumoDto`, `DiaNaoUtilAtualizarDto`, `DiaNaoUtilAtualizadoDto` como re-export de Criado, `CalendarioConsultarDto`); `DiaNaoUtil` model no backend; `CalendarioRepository` com 7 métodos (inserir, buscarIdentificador, listar, atualizar com SET dinâmico, excluir, `ehDiaNaoUtil` com CTE de recorrência anual via EXTRACT MONTH/DAY, `buscarTipoPorData` para retornar tipo do dia ao serviço); `CalendarioService` com 6 métodos (criar, listar, recuperar, atualizar, excluir, `verificarDiaUtil` que detecta fim de semana via `getUTCDay()` e consulta repositório para obter motivo); `CalendarioController` com 6 endpoints (POST gestor, `GET /verificar` com query param `data` declarado antes de `GET /:id`, GET, GET/:id, PUT/:id gestor, DELETE/:id gestor); `CalendarioModule` registrado no `AppModule`
- **17-ponto-module** — 3 DTOs em `shared/src/dtos/ponto/` (`PontoConsultarDto`, `IntervaloDto`, `PontoDiarioDto`); sem repository próprio — injeta `ExecucaoRepository`, `CalendarioRepository` e `UsuarioRepository` diretamente; `PontoService` com `consultarDiario` (autorização, detecção de fim de semana via `getUTCDay()`, verificação de dia não útil via `CalendarioRepository.ehDiaNaoUtil`, obtenção de `motivoNaoUtil` via `buscarTipoPorData` mapeado para português, busca e reordenação ASC das execuções, cálculo de `totalMinutosTrabalhados`, cálculo de intervalos via `calcularIntervalos`, distribuição entre `minutosTrabalhadosDiaUtil` e `minutosTrabalhadosExtra`, cálculo de `saldoMinutos`); `PontoController` com `GET /ponto/diario`; `PontoModule` importa `ExecucaoModule`, `CalendarioModule` e `UsuarioModule`; registrado no `AppModule`
- **18-assistente-module** — 2 DTOs em `shared/src/dtos/assistente/` (`AssistenteDescricaoAuxiliarDto` com validação de `textoOriginal` ≥10 chars, `tipoEntidade` via `@IsIn` e `contextoEntidade`; `AssistenteDescricaoAuxiliadaDto` com `textoOriginal` e `textoAuxiliado`); `AssistenteService` instancia `Anthropic` no construtor via `ConfigService`, monta prompt contextualizado pelo tipo de entidade e chama `messages.create` com modelo e `max_tokens` lidos da configuração; erros da API Anthropic capturados e relançados como `BusinessException`; `AssistenteController` com `POST /assistente/auxiliar-descricao` protegido por `JwtAuthGuard`; `AssistenteModule` importa `ConfigModule`; registrado no `AppModule`
- **19-backend-correcao-nomenclatura** — correção pura de nomenclatura sem nova lógica de negócio: (1) 14 DTOs Atualizar/Atualizado renomeados para Alterar/Alterado em `shared/src/dtos/` (usuario, projeto, demanda, atividade, execucao, calendario, tag); (2) `AtividadeAlteradaDto`, `ExecucaoAlteradaDto`, `DiaNaoUtilAlteradoDto` deixaram de ser alias/re-export e passaram a ter campos próprios; (3) 4 DTOs de validação criados: `UsuarioValidarLoginDto`, `ProjetoValidarCodigoDto`, `DemandaValidarConexaoDto`, `TagValidarNomeDto`; (4) métodos `atualizar()` → `alterar()` em todos os repositórios, services e controllers (7 módulos); (5) métodos `existe*()` → `validar*(dto)` nos repositórios com parâmetro sempre DTO; (6) `DemandaRepository.buscarIdGestoresAtivos()` removido — `DemandaService` usa `UsuarioRepository.listarGestoresAtivos()` diretamente
- **20-backend-correcao-recuperar-dto** — zero primitivos em assinaturas de serviços e repositórios: (1) 34 novos DTOs internos criados em `shared/src/dtos/` para os módulos projeto, demanda, atividade, execucao, calendario, tag e usuario; (2) `buscarIdentificador(id: number)` renomeado para `recuperar(dto: EntidadeRecuperarDto)` em todos os repositórios (tag, calendario, projeto, usuario, atividade, execucao, demanda); (3) todos os helpers com parâmetros primitivos convertidos para DTO (`encerrar`, `buscarExecucaoAtiva`, `buscarUsuarioExecucao`, `alterarSenha`, `excluir`, `inserirDemandaUsuario`, `verificarCriariaCiclo`, `conexaoPertenceADemanda`, `excluirConexao`, `listarTagsDemanda`, `atribuirTagsDemanda`, `removerTagDemanda`, `listarMembrosDemanda`, `atribuirMembroDemanda`, `removerMembroDemanda`, `membroJaAtribuido`, `contarMembrosDemanda`, `listarPorUsuario`); (4) todos os serviços atualizados para usar as novas assinaturas DTO-based (usuario, projeto, tag, calendario, atividade, execucao, demanda, ponto)
- **21-frontend-scaffold** — projeto Angular 21 criado em `frontend/` com: `package.json` com dependências (PrimeNG 21, @primeng/themes, primeicons, d3, tailwindcss, postcss, autoprefixer); `angular.json` com builder `@angular-devkit/build-angular:application`, SCSS como estilo padrão; `tsconfig.json` e `tsconfig.app.json`; `tailwind.config.js`; `proxy.conf.json` para `/api → localhost:3000`; `src/styles.scss` com diretivas Tailwind e variáveis SCSS; `environments/environment.ts` e `environment.production.ts` com `ambiente.apiUrl`; `app.config.ts` com `provideRouter`, `provideHttpClient(withInterceptors)`, `provideAnimationsAsync` e `providePrimeNG` com tema Aura; `app.routes.ts` com rota `/autenticacao` (lazy), layout guard e lazy children para 8 módulos; `app.component.ts` standalone com `<router-outlet>`; `core/` e `shared/` com esqueletos de signals, interceptors, guards, componentes e serviços; `modules/` com rotas esqueleto para 8 módulos de negócio
- **22-frontend-core** — implementação completa da infraestrutura cross-cutting do frontend: (1) signal `carregamento` (renomeado de `carregamentoAtivo`) e `usuarioAutenticado` tipado como `UsuarioRecuperadoDto | null` via `@project20/shared`; (2) `authTokenInterceptor` com chave `access_token` e skip de `/autenticacao/login`; (3) `errorHandlerInterceptor` com `MessageService` do PrimeNG, tratando 401 (limpa token + redireciona), 403 (toast erro), 400 (toast com `erros[0]` ou `mensagem`), 404 (toast aviso), demais (toast erro genérico); (4) `loadingInterceptor` atualizado para usar signal `carregamento`; (5) `autenticacaoGuard` com chave `access_token`; (6) `gestorGuard` com `UsuarioTipoEnum.GESTOR`; (7) `AutenticacaoService` com `login()`, `logout()` e `estaAutenticado()`; (8) `LoadingSpinnerComponent` com `p-progressSpinner` do PrimeNG; (9) `ErrorMessageComponent` com `p-message` do PrimeNG; (10) `AssistenteDescricaoComponent` completo com signals `textoAuxiliado`, `carregandoAuxilio`, `mostrarComparacao`, métodos `auxiliar()`, `aceitar()`, `descartar()` e template de comparação lado a lado com `p-panel`; (11) `app.config.ts` com `MessageService` provider; (12) `LayoutComponent` com `<p-toast>` para exibição de mensagens; (13) `TopbarComponent` atualizado para usar `AutenticacaoService.logout()`
- **23-frontend-auth** — tela de login completa: (1) `LoginPage` standalone com `ReactiveFormsModule`, `CardModule`, `InputTextModule`, `PasswordModule`, `ButtonModule`, `MessageModule` do PrimeNG; (2) formulário reativo com signals `carregando` e `erroLogin`; (3) validação inline por campo (`required`, `minLength`) exibida apenas após `touched`; (4) `p-password` com `[feedback]="false"` e `[toggleMask]="true"`; (5) `p-button` com `[loading]="carregando()"`; (6) `p-message` exibindo erro de credenciais via signal; (7) redirecionamento para `/ponto` após login bem-sucedido; (8) `somentePublicoGuard` adicionado ao `autenticacao.guard.ts` — redireciona para `/` se já autenticado; (9) `app.routes.ts` atualizado para aplicar `somentePublicoGuard` na rota `/autenticacao`
- **24-frontend-usuario** — módulo de usuário completo: (1) `UsuarioService` com 6 métodos HTTP (`listar`, `criar`, `recuperar`, `alterar`, `excluir`, `alterarSenha`); (2) `usuario.routes.ts` com lazy loading para 4 rotas (`''`, `'novo'`, `':id'`, `':id/anotacoes'`); (3) `UsuarioListagemPage` com `p-table` lazy+paginada, filtros por tipo/status via `p-select` com Reactive Forms, badges `p-tag`, confirmação de exclusão via `p-confirmDialog`; (4) `UsuarioFormularioPage` para criação com todos os campos, `p-select` para tipo e horas diárias; (5) `UsuarioPerfilPage` com exibição de dados, `p-dialog` de edição e `p-dialog` de troca de senha com validador customizado `senhasNaoConferem`, permissão via `UsuarioSessaoService.eGestor()`; (6) `UsuarioAnotacoesPage` com `p-editor` (EditorModule) em Reactive Form, redirecionamento automático se não for o próprio usuário; (7) `UsuarioCartaoComponent` com avatar por iniciais, nome e cargo — para uso em listagens de membros
- **25-frontend-projeto** — módulos de projeto e tag completos: (1) `ProjetoService` com 5 métodos HTTP (`listar`, `criar`, `recuperar`, `alterar`, `excluir`); (2) `projeto.routes.ts` com rotas lazy para listagem (livre), formulário (`gestorGuard`) e detalhe; (3) `ProjetoListagemPage` com grid de cards — barra colorida no topo do card (`cor`), badge de status com severidade (verde/amarelo/azul/vermelho), filtro por status via `p-select`, botão "Novo Projeto" condicional para gestor, paginação com `p-paginator`, confirmação de exclusão; (4) `ProjetoFormularioPage` para criação com `p-colorpicker` (formato hex), `p-datepicker` para datas, validação cross-field `previsaoFimData > inicioData`, código uppercase via SCSS; (5) `ProjetoDetalhePage` com header contendo bolinha de cor + nome + código + badge de status, abas `p-tabs` com "Demandas" (lista das demandas via chamada HTTP direta a `/demanda?projetoId=X`) e "Informações" (dados completos), `p-dialog` de edição para gestores, botão "Nova Demanda" com queryParam `projetoId`; (6) `TagService` com 5 métodos HTTP; (7) `tag.routes.ts` com rota única protegida por `gestorGuard`; (8) `TagListagemPage` com `p-table`, preview de tag com cor (bolinha + badge estilizado com opacidade), dialogs para criação e edição com `p-colorpicker`, prévia em tempo real da tag, confirmação de exclusão
- **26-frontend-demanda** — módulo de demanda completo: (1) `DemandaGrafoNoDto` e `DemandaGrafoArestaDto` no shared atualizados com `horasEstimadas`, `demandaPaiId`, `id` e `tipo`; (2) backend `DemandaRepository.recuperarGrafo` atualizado com UNION ALL combinando arestas de `demanda_conexao` (tipo `conexao`) e relações pai→filho via `demanda_pai_id` (tipo `hierarquia`); (3) `DemandaService` com 13 métodos HTTP incluindo `listarTags`, `criarConexao`, `excluirConexao`, `listarMembros`, `atribuirMembro`, `removerMembro`; (4) `DemandaGrafoComponent` com D3 v7 force simulation, zoom/pan, drag, nós circulares coloridos por status com raio proporcional a `horasEstimadas`, arestas hierarquia (azul) vs conexão (cinza tracejado), estética Obsidian dark; (5) `DemandaArvoreItemComponent` recursivo via `forwardRef`, exibe badge de status/prioridade, horas e filhos aninhados; (6) `DemandaConexaoListaComponent` para CRUD de conexões; (7) `DemandaMembroListaComponent` para CRUD de membros; (8) `DemandaProjetoPage` com toggle grafo/lista, painel lateral de filtros e legenda, `construirArvore()` O(n) via Map a partir do grafo; (9) `DemandaFormularioPage` para criação e edição com 3 abas de descrição + `AssistenteDescricaoComponent`; (10) `DemandaDetalhePage` com 6 abas (Visão Geral, Sub-demandas, Atividades, Conexões, Tags, Membros), `forkJoin` para carga paralela

---

## Em Andamento

*Nenhuma task em andamento.*

---

## Próxima Task

**27-frontend-atividade** — módulo de atividade no frontend: listagem, formulário e detalhe de atividades com tags e execuções

---

## Estrutura de Pastas Atual

```
project-2.0/
  docs/               ✅ criado
  backend/            ✅ criado (task 02)
  frontend/           ✅ criado (task 21)
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
| atividade | ✅ implementado (task 14) |
| execucao | ✅ implementado (task 15) |
| ponto | ✅ implementado (task 17) |
| calendario | ✅ implementado (task 16) |
| tag | ✅ implementado (task 08) |
| assistente | ✅ implementado (task 18) |

---

## Módulos do Frontend

| Módulo | Status |
|---|---|
| core (interceptors, guards, signals) | ✅ implementado (task 22) |
| shared (components, pipes) | ✅ implementado (task 22) |
| autenticacao | ✅ implementado (task 23) |
| usuario | ✅ implementado (task 24) |
| projeto | ✅ implementado (task 25) |
| demanda | ✅ implementado (task 26) |
| atividade | 🔧 esqueleto (task 21) |
| execucao | 🔧 esqueleto (task 21) |
| ponto | 🔧 esqueleto (task 21) |
| calendario | 🔧 esqueleto (task 21) |
| tag | ✅ implementado (task 25) |

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

- **[revisão pós-18]** Junction tables (`demanda_tag`, `atividade_tag`, `demanda_usuario`) ficam no módulo pai — sem módulo NestJS próprio
- **[revisão pós-18]** `atualizar`/`atualizado` renomeado para `alterar`/`alterado` em toda nomenclatura de DTOs e métodos de negócio
- **[revisão pós-18]** Métodos de existência (`existe*`) renomeados para `validar*` — método é sempre verbo de ação
- **[revisão pós-18]** Zero primitivos em qualquer assinatura de método de service ou repository — sempre DTO mesmo para um único campo
- **[revisão pós-18]** Nenhum DTO pode ser alias/re-export de outro — campos próprios obrigatórios em cada DTO
- **[revisão pós-18]** Recuperação individual de entidade sempre via `EntidadeRecuperarDto { id: number }` e método `recuperar()`
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
- `DemandaGrafoDto` retornava `arestas: []` até a task 11; a task 12 atualizou `recuperarGrafo` para incluir arestas reais via JOIN com `demanda_conexao` (filtrado por projeto nas duas pontas)
- `DemandaArvoreItemDto.filhos` usa `@ApiProperty({ type: () => DemandaArvoreItemDto, isArray: true })` com lazy getter para suporte a tipos recursivos no Swagger
- A construção da árvore na service usa um `Map<number, DemandaArvoreItemDto>` para O(n) em vez de busca recursiva; o nó raiz é identificado quando `demandaPaiId` é null ou não está no mapa (CTE inicia em demandaId, então seu pai nunca estará no resultado)
- `DemandaRepository.existeConexao` não está listada na spec mas é necessária para implementar a validação de duplicata (#4 de `criarConexao`) com mensagem amigável antes de atingir a constraint do banco
- `listarConexoes` usa `:demandaId` 4 vezes no SQL; Knex com named bindings substitui cada ocorrência pelo valor do objeto — comportamento correto com pg driver
- Arestas do grafo são filtradas com INNER JOIN nas duas pontas (origem e destino no mesmo projeto) — conexões cross-projeto não aparecem no grafo do projeto
- `DemandaService` passa a injetar `TagRepository` e `UsuarioRepository` via `DemandaModule` que importa `TagModule` e `UsuarioModule`; essa dependência entre módulos é necessária para validar existência de tags e usuários antes das operações de atribuição, sem duplicar SQL no repositório de demanda
- `atribuirTagsDemanda` do repositório implementa sync: lista tags atuais, faz soft delete das que saíram, insere apenas as novas — tags que permanecem na lista não são tocadas e não violam a UNIQUE INDEX filtrada por `is_deleted = false`
- `contarMembrosDemanda` não estava na spec mas é necessário para implementar a regra "não remover o último membro" sem trazer toda a lista de membros para a service
- `AtividadeRepository.atualizar` executa dois SELECTs: o UPDATE ... RETURNING não inclui `nome_completo` do usuário (que está em outra tabela), então uma segunda query busca o nome após o UPDATE; alternativa seria um UPDATE com JOIN mas PostgreSQL não suporta JOIN diretamente em UPDATE ... RETURNING sem CTE
- `AtividadeAtualizadaDto` é re-exportado como alias de `AtividadeRecuperadaDto` — mesma estrutura, sem duplicação
- `AtividadeModule` importa `DemandaModule` (para `DemandaRepository` verificar existência da demanda) e `TagModule` (para `TagRepository` validar tags antes do sync)
- `ExecucaoAtualizadaDto` é re-exportado como alias de `ExecucaoEncerradaDto` — mesma estrutura conforme spec
- `ExecucaoRepository.buscarExecucaoAtiva` faz JOIN com atividade para checar `atividade.usuario_id = :usuarioId`, garantindo que apenas execuções do próprio usuário sejam consideradas ativas — sem coluna `usuario_id` na tabela `execucao`
- `ExecucaoRepository.buscarUsuarioExecucao` centraliza a busca do dono da execução via JOIN com atividade, usada nas três operações que exigem verificação de propriedade (encerrar, recuperar, atualizar)
- `duracaoMinutos` é calculado em SQL via `EXTRACT(EPOCH FROM (fim_data - inicio_data))::int / 60` no RETURNING do UPDATE e no SELECT do buscarIdentificador; quando `fim_data IS NULL` retorna NULL
- `ExecucaoService.listar` passa `usuarioAtivo.sub` como `usuarioIdRestricao` quando o tipo é DESENVOLVEDOR, sobrescrevendo qualquer `usuarioId` que o desenvolvedor tente passar nos filtros
- `ExecucaoModule` importa apenas `AtividadeModule` — usa `AtividadeRepository.buscarIdentificador` e `usuarioTemAcessoDemanda` para validar existência e acesso na operação de iniciar
- `CalendarioRepository` expõe tanto `ehDiaNaoUtil(data)` (bool, para uso futuro pelo módulo ponto) quanto `buscarTipoPorData(data)` (retorna o tipo, para `verificarDiaUtil` da service que precisa do motivo); rota `GET /calendario/verificar` declarada antes de `GET /calendario/:id` para evitar que "verificar" seja interpretado como ID pelo ParseIntPipe; `verificarDiaUtil` usa `getUTCDay()` (não `getDay()`) para evitar variações de fuso horário ao detectar fim de semana
- `PontoService` cria `filtrosListagem: ExecucaoListarDto` como objeto literal com `itensPorPagina: 500` para buscar todas as execuções do dia (o repositório usa o valor passado, não aplica validação do class-validator); execuções chegam em DESC do repositório e são reordenadas ASC in-memory para o cálculo de intervalos — volume diário não justifica query adicional
- `motivoNaoUtil` usa `buscarTipoPorData` (que já existia desde task 16) mapeado via `mapearTipoParaMotivo` para strings legíveis em português ('Feriado', 'Recesso', 'Ponto facultativo') — sem query nova; fim de semana retorna fixo 'Fim de semana'
- `PontoDiarioDto` importa `ExecucaoResumoDto` por import relativo direto (`../execucao/ExecucaoResumoDto`) em vez do barrel `@project20/shared` para evitar dependência circular dentro do pacote shared
- **[task 20]** `DemandaRecuperarDto` aceita apenas `{ id: number }` — o filtro de acesso por usuário é separado em `DemandaFiltroAcessoDto`, passado como segundo parâmetro opcional em `recuperar(dto, filtro?)`; isso mantém o padrão `recuperar({ id })` uniforme sem carregar o dto com semântica de autorização
- **[task 20]** `DemandaInserirAtribuicaoDto` contém apenas `{ criadorId, gestorIds }` — o `dados` da demanda é mantido como parâmetro separado pois é um tipo backend-only (`DemandaCriarDados`) que não pode ser colocado no shared
- **[task 20]** `DemandaExcluirDto` criado após revisão — `excluir(id: number)` no repositório de demanda era o único método sem DTO; criado para manter consistência com todos os outros módulos
- **[pós-task 20]** Regra de complemento multi-palavra: o complemento inteiro — mesmo com duas palavras — vem antes do verbo sem exceção. Ex: `membro interno` = complemento composto → `DemandaMembroInternoAtribuirDto` ✅, não `DemandaMembroAtribuirInternoDto` ❌. Documentado em `SYSTEM.SPEC.md` e `CONVENTIONS.md`
- **[task 22]** Signal `carregamento` (renomeado de `carregamentoAtivo` que estava no scaffold) — todos os arquivos que referenciam o signal foram atualizados
- **[task 22]** Signal `usuarioAutenticado` usa `UsuarioRecuperadoDto | null` mas o `login()` do service faz `set(resposta.dados.usuario as any)` pois o token retorna apenas `{ id, login, nomeCompleto, tipo }`, não o DTO completo — casting intencional conforme spec
- **[task 22]** `MessageService` do PrimeNG adicionado como provider no `app.config.ts`; `<p-toast>` adicionado ao `LayoutComponent` — necessário para o `errorHandlerInterceptor` exibir mensagens via `MessageService.add()`
- **[task 22]** `TopbarComponent` atualizado para usar `AutenticacaoService.logout()` em vez de `localStorage.removeItem('token')` direto — necessário para consistência com chave `access_token`
- **[task 22]** `AssistenteDescricaoComponent` usa `templateUrl` com arquivo HTML separado criado nesta task; scaffold da task 21 tinha `template: ''` inline
- **[task 23]** `somentePublicoGuard` exportado do mesmo arquivo `autenticacao.guard.ts` — mantém a lógica de guarda pública/privada coesa no mesmo arquivo; aplicado na rota `/autenticacao` em `app.routes.ts`
- **[task 23]** Redirecionamento pós-login vai para `/ponto` (não `/`) — a rota raiz `''` já redireciona para `ponto`, mas ir direto evita uma navegação dupla
- **[task 24]** `UsuarioFormularioPage` é usada apenas para criação (`/usuario/novo`); edição é feita via `p-dialog` dentro da `UsuarioPerfilPage` — as rotas da spec não definem rota de edição separada
- **[task 24]** `ConfirmationService` fornecido localmente via `providers: [ConfirmationService]` na `UsuarioListagemPage` — não está no `app.config.ts` global
- **[task 24]** `UsuarioAnotacoesPage` redireciona para `/usuario/:id` se o usuário da sessão não for o dono — proteção client-side; o backend também bloqueia via autorização
- **[task 24]** `p-select` (PrimeNG 21) em vez de `p-dropdown` (deprecated) para todos os dropdowns; `styleClass` deprecated substituído por `class` nos elementos de seleção
- **[task 24]** Validador customizado `validarSenhasIguais` declarado como método privado e passado ao segundo argumento de `FormBuilder.group()` para validação cross-field sem classe separada
- **[task 25]** `ProjetoListagemPage` usa grid de cards com `p-paginator` (em vez de `p-table` com paginação integrada) — cards são mais adequados para projetos com cor e código visual; `p-table` reservado para dados tabulares como usuários e tags
- **[task 25]** `ProjetoDetalhePage` faz chamada HTTP direta a `/demanda?projetoId=X` via `HttpClient` injetado — o módulo demanda do frontend ainda não existe; evita criar dependência prematura em serviço de outro módulo
- **[task 25]** `p-colorpicker` usa `format="hex"` para garantir retorno no formato `#RRGGBB` compatível com a validação do backend (`Matches(/^#[0-9A-Fa-f]{6}$/)`)
- **[task 25]** Validação cross-field `previsaoFimData > inicioData` implementada como validador privado no grupo do form, padrão idêntico ao `validarSenhasIguais` da task 24
- **[task 25]** `TagListagemPage` usa dialogs para criação e edição (não edição inline em linha de tabela) — mais simples e evita complexidade de estado de edição por linha; spec dizia "Edição inline ou via dialog"
- **[task 25]** Preview de tag no dialog usa `cor + '22'` e `cor + '55'` (opacidade em hex) para simular aspecto de badge colorido sem variáveis CSS adicionais
- **[task 26]** `DemandaGrafoComponent` usa D3 v7 force simulation; nós importados do backend já incluem `demandaPaiId` e `horasEstimadas` no `DemandaGrafoNoDto`, evitando segunda chamada HTTP para construção do grafo e da árvore
- **[task 26]** `DemandaRepository.recuperarGrafo` usa UNION ALL para combinar dois tipos de aresta: `demanda_conexao` (tipo `conexao`) e relações hierárquicas pai→filho via `demanda_pai_id` (tipo `hierarquia`); o campo `tipo` é literal SQL string na mesma query
- **[task 26]** `DemandaProjetoPage.construirArvore()` constrói a árvore client-side a partir do grafo já carregado via `DemandaGrafoNoDto.demandaPaiId` — elimina chamada extra a `recuperarArvore()` na listagem do projeto
- **[task 26]** `DemandaArvoreItemComponent` usa `forwardRef(() => DemandaArvoreItemComponent)` no array `imports` para permitir recursão sem erro de referência circular no Angular
- **[task 26]** `UsuarioListarDto.itensPorPagina` tem `@Max(100)` — a carga de usuários na `DemandaDetalhePage` usa `{ itensPorPagina: 100 }`, não 200
- **[task 26]** `DemandaDetalhePage` usa `forkJoin` para carregar demanda, ancestrais, arvore, tags disponíveis e usuários em paralelo; tags da demanda (`listarTags`) são carregadas separadamente após o forkJoin pois dependem do `demandaId` confirmado
- **[task 26]** `subDemandas` na `DemandaDetalhePage` é extraído de `arvore.dados[0]?.filhos` — `recuperarArvore` retorna árvore com a própria demanda como raiz (nivel=0) e seus filhos diretos dentro do nó raiz

---

## Problemas Conhecidos

Violações de padrão identificadas na revisão pós-task 18. Corrigidas pelas tasks 19 e 20:

*Nenhum problema conhecido no momento.*

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
