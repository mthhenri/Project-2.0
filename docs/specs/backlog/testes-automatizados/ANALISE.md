# Análise da cobertura de testes — 2026-10-18

> Anexo da guarda-chuva [`../testes-automatizados.spec.md`](../testes-automatizados.spec.md). Retrato do repositório em
> 2026-10-18 (commit `1d3ba12`), feito antes de especificar as tasks 171–187. É registro: as tasks conferem o estado real
> ao abrir, porque outras sessões continuam acrescentando testes.

## 1. O que já existe

| Workspace | Arquivos `*.test.ts` | Testes | Resultado | Roda em `npm test` | Roda no CI |
|---|---|---|---|---|---|
| `shared` | 5 | 68 | 68 ✓ | sim | sim |
| `backend` | 78 | 508 | 508 ✓ | sim | sim |
| `desktop` | 3 | 17 | 17 ✓ | sim | **não** |
| `frontend` | 8 | 61 | 61 ✓ | **não** | **não** |
| `scripts/` (repo) | 2 | 14 | 13 ✓, 1 pulado | sim | só `verificar-organizacao` |

Comandos usados: `node --test --test-reporter=tap` em cada workspace, com o mesmo carregador do script `test` dele.

Todos são testes de **unidade**: regras puras (`domain/`), services com repositório dublê
(`Object.create(Service.prototype)` + campos atribuídos à mão), executores de proposta e ferramentas da IA. Nenhum teste
toca um banco real, nenhum controller é testado (exceto `ia.controller`) e nenhum componente Angular é testado — no
frontend só há utilitários puros (`*.util.ts`, `destino-pos-login`, `retorno-da-ia`, `markdown-formatado` com jsdom).

### Documentação desatualizada

- `PROBLEMS.md` P-001 diz "18 casos no total" e "todo o frontend não tem teste" — hoje são 668 e o frontend tem 61.
- `CLAUDE.md`/`AGENTS.md` e a skill `task-flow` dizem "não há script de teste no `frontend`" — o script existe
  (`node --conditions=import --import tsx --test`), só não está na raiz nem no CI.

A task 172 corrige esses textos.

## 2. Lacunas por camada

| Camada | Situação | O que falta |
|---|---|---|
| Regra pura (`domain/`, `shared/utils`) | boa | `novo-pai-da-demanda`, `dias-nao-uteis-no-intervalo`, `conjunto-de-tags`, `execucao-ativa-detalhada`, `proposta-referenciada`, `validar-dados-da-proposta`, `esquema-da-classe`, `sem-exclusao`, `nivel-do-tipo-de-prompt`, `chat-mensagem.documento` |
| Service (dublê) | desigual | `execucao.service` (433 linhas) **sem teste direto**; `demanda.service` (835) só `restaurar`; `projeto`, `tag`, `calendario`, `atividade` só `restaurar` e prioridade; `ponto.service` só helpers; `autenticacao`, `assistente`, `relatorio`, `ponto-justificativa`, `checkin-agenda`, `checkin-suspensao` sem nada |
| Repository (SQL) | **nenhum** | 19 repositories, ~142 consultas; é onde moram `is_deleted = false`, o filtro de acesso do desenvolvedor por `demanda_usuario`, a CTE de ciclo, a trava de execução ativa, a sobreposição, a ordenação por prioridade, a busca `tsvector` do chat provisório e as transações (`anotacao`, `prompt`, `usuario`, `demanda`, `configuracao-ia`) |
| Controller | quase nenhum | 49 usos de `@GestorOnly`/`@AdministradorOnly`; nada garante que uma rota não perdeu o decorator. Guards: só `administrador.guard` |
| Executor / ferramenta da IA | boa nos recentes | sem teste: executores `alterar-atividade`, `atribuir-tag`, `corrigir/iniciar/pausar/registrar-execucao`, `alterar-demanda`, `atribuir-membro`, `suspender-checkin`; ferramentas de leitura `consultar-pad`, `consultar-demanda`, `consultar-grafo-do-projeto`, `listar-demandas-do-projeto`, `listar-projetos`, `listar-tags`, `listar-usuarios`, `consultar-ponto-do-dia/mes`, várias `propor-*` (parte é coberta por testes agregados como `ferramentas-de-execucao.test.ts`; cada task confere antes) |
| Núcleo backend | quase nenhum | `BaseRepository`, `GlobalExceptionFilter`, `ResponseFormatInterceptor`, exceções, `ConfigService` |
| Frontend lógica | parcial | sem teste: utils `configuracao-ia`, `demanda-arvore`, `demanda-datas`, `demanda-filtro`, `demanda-context-menu.factory`, `execucao`, `relatorio`, `tag`, `anotacoes`, `usuario-credenciais`, `atalhos`, `tipo-usuario`, `url-retorno`, `navegacao`; pipe `data-brasileira`; 3 guards; 4 interceptors; 25 services HTTP; 2 signals; 2 diretivas |
| Frontend componentes | **nenhum** | 60 componentes + 16 páginas; não há infraestrutura de teste de componente (o builder é `@angular-devkit/build-angular:application`) |

## 3. Decisões do autor (2026-10-18)

1. **Repositories ganham testes de integração contra PostgreSQL real** — infraestrutura na task 171.
2. **Frontend inclui componentes**, além da lógica pura — infraestrutura na task 172.
3. **Uma spec por domínio, backend e frontend juntos**; satélites pequenos entram no domínio dono
   (`atividade-prioridade` → atividade, `ponto-justificativa` → ponto, `configuracao-ia`/`prompt`/`ferramenta-ia`/
   `proposta-ia`/`assistente` → IA).

## 4. Armadilhas conhecidas para quem implementar

- **`NOW()` dentro de transação é o instante do início da transação.** Teste de repository que isola por transação e
  rollback congela o relógio: duas execuções "agora" têm o mesmo `inicio_data`. Testes de duração, sobreposição e
  auto-stop passam datas explícitas.
- **Repositories abrem transação própria** (`conexaoBancoDados.transaction`). Com a conexão trocada por uma transação de
  teste, o Knex vira savepoint — funciona, mas precisa ser comprovado na task 171 antes de virar padrão.
- **Nenhuma coluna tem `DEFAULT`**: as fábricas de dados de teste preenchem todos os campos de `BaseEntity`.
- **Datas de execução são `timestamptz`** e `COALESCE(fim_data, NOW())` é o padrão correto de duração de execução ativa.
- **Gestor não está em `demanda_usuario`**: acesso por tipo. Teste que "atribui o gestor" para dar acesso está errado.
- **Itens de `ContextMenu` são propriedade, nunca getter** (`demanda-context-menu.factory`): o teste de componente deve
  pegar a regressão.
- **Diretiva PrimeNG sem o módulo em `imports[]`** compila e não aplica; teste de componente que só confere o DOM pode não
  ver — conferir a presença do comportamento, não da classe.
- **O frontend só roda com `--conditions=import`** (pacote `@project20/shared` com exports condicionais).
- O **chat** usa OpenSearch/Elasticsearch: os testes ficam nos dublês de cliente que já existem; só o armazenamento
  `postgres` entra na integração (precisa da extensão `unaccent` no banco de teste).
