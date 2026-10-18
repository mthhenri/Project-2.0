# AGENTS.md / CLAUDE.md

Este arquivo é a orientação canônica para agentes de código que trabalham no repositório
Project 2.0. As instruções valem para o Claude Code, para o Codex e para qualquer outro agente
compatível com `AGENTS.md`.

## Sincronização com CLAUDE.md

`AGENTS.md` e `CLAUDE.md` são cópias integrais e devem permanecer idênticos. Ao alterar qualquer
um, aplique exatamente a mesma alteração ao outro na mesma tarefa e confirme que não há diferença
antes de concluir. Não use um arquivo como redirecionamento, resumo ou complemento do outro.

A mesma regra vale para `.claude/skills/` e `.agents/skills/`: cópias integrais, arquivo a
arquivo, incluindo auxiliares em `references/`. `diff -r .claude/skills .agents/skills` deve sair
vazio antes de concluir. (`npm run repo:verificar` confere isso.)

### Contrato comum a toda skill do projeto

- **Duas cópias idênticas** em `.claude/skills/<nome>/SKILL.md` e `.agents/skills/<nome>/SKILL.md`.
- **`description` escrita como gatilho**: em português, dizendo quando usar a skill com as palavras
  que a tarefa real usa — é o que faz a skill disparar, não uma descrição curta e genérica.
- **Ponteiro, não cópia**: a skill aponta para a fonte da verdade (`docs/SYSTEM.SPEC.md`,
  `docs/CONVENTIONS.md`) em vez de reescrevê-la.
- **O que a skill carrega de próprio** é ordem de execução, checklist de conferência e armadilha de
  campo — o que a documentação não carrega.
- **Tamanho**: `SKILL.md` até ~150 linhas; excedente vai para `<skill>/references/<assunto>.md`.
- **Em conflito** com a documentação, o documento vence e a skill é corrigida na mesma tarefa.
- **Validação por uso**: uma skill só fecha depois de exercitada em um recorte real de trabalho.

Skills do projeto: `task-flow` (fluxo da tarefa e fecho), `conventions-check` (passe final do diff),
`project20-dto-conventions` (nomear e organizar DTOs), `sql-migrations` (schema, migrations e SQL),
`gerenciamento-de-impacto` (consumidores antes de alterar algo compartilhado) e `verify` (subir e
dirigir a aplicação real).

## Início obrigatório da sessão

Antes de implementar qualquer mudança, leia nesta ordem:

1. `docs/SYSTEM.SPEC.md` — constituição do projeto e autoridade máxima.
2. `docs/CONVENTIONS.md` — referência rápida de convenções.
3. `docs/context/CONTEXT.md` — estado atual e próxima tarefa.

Leia também, conforme a pergunta: `docs/context/PROBLEMS.md` (defeitos conhecidos — antes de
investigar falhas), `HISTORY.md` (decisões e histórico — procure por código da tarefa, sem ler o
arquivo inteiro), `MEMORY.md` (mapa de onde as coisas vivem), `IDEAS.md` (o que ainda não é
sistema) e, para o banco, `docs/SCHEMA.md`.

## Fontes da verdade

As regras de negócio estão em `docs/SYSTEM.SPEC.md` §14 e o esquema do banco em `docs/SCHEMA.md`.
Antes de alterar permissão, regra de execução, demanda, ponto ou dias não úteis, consulte esses
documentos; **em caso de conflito, o documento vence o código**. O relatório de auditoria de 2026-06-19
(`docs/specs/done/44-auditoria-conformidade-padroes/AUDITORIA.md`) é histórico, não fonte de regra.

## Contexto persistente

`docs/context/` tem responsabilidades separadas:

| Arquivo | Responsabilidade | Operação |
|---|---|---|
| `CONTEXT.md` | o que é verdade agora | editar/reorganizar, teto ~400 linhas |
| `HISTORY.md` | o que aconteceu e por quê | acrescentar no topo |
| `PROBLEMS.md` | o que está quebrado | registrar; remover ao corrigir |
| `MEMORY.md` | onde as coisas vivem | somente ponteiros |
| `IDEAS.md` | o que ainda não é sistema | retirar de abertas ao especificar |

Ao concluir uma tarefa, registre a narrativa completa em `HISTORY.md`, edite somente as seções
afetadas de `CONTEXT.md` e atualize os demais quando algo descoberto sobreviver à tarefa. Não
acrescente um diário em `CONTEXT.md`. A documentação do projeto é em português.

## Fluxo orientado por especificação

1. Mova `docs/specs/backlog/<tarefa>.spec.md` para `docs/specs/active/`.
2. Implemente exatamente o que a especificação define; não extrapole.
3. Mova a especificação para `docs/specs/done/` ao terminar.
4. Atualize `docs/context/` conforme as regras acima.

Todo material da tarefa fica junto da spec: planos, designs pontuais, propostas, revisões,
auditorias e verificação em `docs/specs/<estado>/<tarefa>/`, com `<tarefa>.spec.md` ao lado. Mova
spec e anexos juntos. A política canônica está em `docs/SYSTEM.SPEC.md` §3.1 e prevalece sobre
destinos padrão de plugins. Nunca crie depósitos paralelos por ferramenta/atividade. Capturas e
saídas brutas ficam em `.artifacts/<tarefa>/`, ignorada pelo Git; o relatório textual registra as
evidências e seus limites. Antes do fecho rode `npm run repo:verificar`; antes do commit, após
preparar os arquivos, `npm run repo:verificar -- --staged`.

Specs de fase/milestone são divididas em tarefas numeradas antes da implementação. Specs em
`done/` são registro histórico e não são reescritas. Specs em `discarded/` foram descartadas pelo
autor e não são implementadas (o corpo também não é reescrito).

O backlog está em `docs/specs/backlog/` (a revisão de UI/UX 94–117 foi concluída, inclusive 110 e 111 reativadas em 2026-10-17;
restam o guarda-chuva e o `INDEX-revisao-ux.md`, mapa em `docs/context/MEMORY.md` §3). A guarda-chuva
`rework-chat-ia.spec.md` (chat com IA, 2026-10-17) já tem as tasks dos blocos 1 a 3 especificadas (**118–124**: permissão de gestor
centralizada, administrador, layout, Markdown), do bloco 8 (**125–128**, pad estruturado, já implementado) do bloco 4 (**129–133**,
fundação da IA, já implementado), da **134** (editor de Markdown formatado, que troca o editor em todo o sistema) e do bloco 5
(**135–141**, chat: OpenSearch, propostas, ferramentas, conversa com streaming, tela, teste de prompts e histórico, já implementados) e dos blocos 6, 7, 9 e 10
(**142–161**: prioridade e ferramentas do desenvolvedor, check-in e Electron, lado do gestor e fallback, todas já implementadas). Confira o próximo número livre antes de criar
uma spec nova: o maior em uso é 169 (162 e 163: armazenamento do chat trocável, já implementado; 164–169, bloco 11 da guarda-chuva, no backlog: a IA lê ponto, calendário, tags e equipe e propõe alterar atividade e demanda, registrar e corrigir execuções e atribuir membros e tags).

## Gate obrigatório de qualidade e conclusão

Uma tarefa de código **não está concluída** enquanto não houver evidência de que respeita a
especificação, a arquitetura e as convenções. Não declare sucesso porque compila.

### Prioridade absoluta: qualidade acima de velocidade

Qualidade, fidelidade ao sistema e aderência às regras têm prioridade sobre velocidade. Prazo,
pressa, tamanho da spec, limite de contexto, delegação ou custo **nunca** justificam pular
leitura, verificação ou revisão. Quando não houver tempo ou ambiente para cumprir todos os gates,
a tarefa permanece **aberta**: relate o avanço e a pendência.

### Rigor com eficiência

Qualidade não significa maximizar etapas, agentes ou contexto. O caminho preferido é o menor
processo que produza evidência suficiente e confiável.

- Subagentes só com ganho concreto (ver "Subagentes"); mande a cada um só o contexto necessário e
  não deixe vários investigarem o mesmo recorte.
- Não replique documentos extensos nem saídas de ferramentas quando um resumo e referências a
  arquivos bastarem.
- Durante a implementação, verificação focada; build dos workspaces afetados nos gates de
  integração e conclusão, sem repetir o que nada relevante mudou.
- Consolide revisões e verificações; repita só para confirmar correções.
- Limite logs e saídas ao trecho necessário para decidir ou comprovar.

Antes de alterar código:

1. Identifique a fonte de verdade da mudança: spec ativa, `SYSTEM.SPEC.md`, convenção.
2. Delimite a responsabilidade: contratos (DTOs, enums, interfaces) em `shared/`; regra de negócio,
   permissão e orquestração na service; SQL só no repository; UI só apresenta estado e encaminha
   interações. Não duplique regra de domínio entre camadas.
3. Ao tocar um componente/arquivo já extenso, não acrescente nova responsabilidade sem avaliar
   extraí-la; se a extração não for proporcional, registre no fecho por que o acréscimo é seguro.
4. Ao alterar algo usado em vários lugares (componente compartilhado, estilo global, regra pura,
   DTO, enum, service) ou reaproveitar um item existente num uso novo, aplique a skill
   `gerenciamento-de-impacto`: todo consumidor é avaliado e o que mudar além do pedido vai ao autor
   antes de aplicar (`npm run impacto`).

### UI e estilo

O frontend usa PrimeNG 21 com tema próprio e Tailwind; ainda **não** há biblioteca interna de
componentes (`docs/context/IDEAS.md` I-001). Para qualquer tela nova ou alterada:

1. Escolha e registre uma tela já existente e aprovada como análogo (shell, densidade, hierarquia,
   controles, estados) e reaproveite os componentes dela antes de criar variação.
2. Rode a aplicação real (skill `verify`) e verifique no mínimo `1920×1080` (desktop), `1366×768` (notebook) e `1080×1920` (desktop vertical);
   mobile não é verificado neste projeto. Além do que
   a spec exigir, percorrendo os estados relevantes — vazio, carregando, cheio, erro.
3. Compare a tela renderizada com o análogo; corrija divergências **antes** de apresentar ao autor.

Relato ou screenshot de subagente não encerra o gate; o agente principal inspeciona pessoalmente.
Sem app executável, a tarefa visual permanece **aberta**.

### Antes de declarar pronta

1. Revise o diff completo contra a spec e as convenções (skill `conventions-check`); sem hardcodes
   nem atalhos que contornem a fonte de verdade.
2. Rode os testes e o build dos workspaces afetados e a verificação ao vivo proporcional ao risco.
   `shared` e `backend` têm testes (Node test runner); o `frontend` não tem testes e o projeto
   **não tem lint** (`docs/context/PROBLEMS.md` P-001): declare essas lacunas no fecho. Regra pura
   ou helper de service que mudou ganha teste no mesmo commit. Relate comandos, resultados e falhas
   preexistentes **separadamente**.
3. Para UI, cumpra o processo visual acima.
4. No fecho, liste de forma auditável o que foi verificado e o que ficou pendente. Item sem
   verificação obrigatória fica **aberto**, não "concluído".

## Subagentes

O agente que recebe o pedido do autor é o **orquestrador**: interpreta, planeja, decide a
arquitetura, sintetiza e responde pelo resultado. Os subagentes ficam em `.claude/agents/`
(`implementador`, `revisor`, `testador`) mais o `Explore` embutido.

- Execução direta é o padrão. Delegue só com ganho concreto: paralelismo real, busca mecânica
  ampla, saída longa de build, bug sem progresso após duas tentativas, ou revisão independente de
  alteração relevante ou de risco (permissão, SQL/migration, refactor amplo).
- Na revisão independente, passe problema, requisitos e onde está o diff — nunca a sua conclusão.
- Agente delegado não delega, não faz commit nem push e não repete consulta equivalente sem
  informação nova.
- Resultado de agente é evidência a verificar, não verdade; o gate acima vale integralmente.
- Havendo delegação significativa, informe ao autor em uma linha: agente, modelo, para quê e o
  resultado relevante.

## Estrutura e arquitetura

Monorepo com quatro workspaces npm:

- `shared/` (`@project20/shared`): DTOs, enums, interfaces e validadores usados por backend e
  frontend. DTOs e enums nunca são redefinidos em `backend/` ou `frontend/`.
- `backend/`: API NestJS. Fluxo: `controller (fino) → service (regra de negócio) → repository
  (SQL puro)`. Módulos em `backend/src/modules/`.
- `frontend/`: SPA Angular 21 com componentes standalone e Signals.
- `desktop/`: Project Desktop, app Electron que abre o front numa janela própria, fixa e com ícone na bandeja
  (`desktop/README.md`; a lógica de decisão fica em funções puras testáveis).

Detalhes e árvore completa: `docs/SYSTEM.SPEC.md` §3, §6–§8.

## Regras de idioma e nomenclatura

Teste: "este conceito existiria em qualquer projeto de software?" Sim → inglês (pastas, classes
genéricas, campos de `BaseEntity`, exceções, decorators). Não → português (entidades, métodos,
variáveis, DTOs, valores de enum, tabelas, colunas).

- DTOs: `Entidade + Complemento? + Verbo + Dto`. Entrada no infinitivo (`UsuarioCriarDto`,
  `UsuarioSenhaAlterarDto`); saída no particípio (`UsuarioCriadoDto`, `ExecucaoIniciadaDto`);
  listagem sempre `ResumoDto`. Consulte a skill `project20-dto-conventions` antes de nomear um DTO.
- Métodos: `verbo + entidade` (`criarUsuario()`, `encerrarExecucao()`); use `alterar`, nunca
  `atualizar`; métodos de existência são `validar*`.
- Variáveis nunca abreviadas (`usuarioEncontrado`, não `u`). Zero primitivos em assinatura de
  service ou repository: sempre DTO, mesmo para um único campo.
- Enums: string enums em `shared/src/enums/`, valores `SCREAMING_SNAKE_CASE` iguais aos nomes.

Importações do pacote compartilhado:

```typescript
import { UsuarioCriarDto }  from '@project20/shared/dtos/usuario';
import { UsuarioTipoEnum }  from '@project20/shared/enums';
import { StandardResponse } from '@project20/shared/interfaces';
```

## Backend, SQL e dados

- **Controller** fino: sem regra, `if` ou `try/catch`; só repassa o DTO à service.
- **Service** concentra validações, permissões e orquestração; lança `BusinessException`,
  `ResourceNotFoundException` ou `UnauthorizedAccessException`.
- **Repository** só SQL, estende `BaseRepository`; use `executarConsulta<T>()`,
  `executarComando()` e `executarSoftDelete(id)`. Nunca DELETE físico.
- Todo `SELECT` filtra `is_deleted = false`. Parâmetros nomeados (`:nomeParametro`), nunca `?` nem
  interpolação. INSERT é `INSERT ... SELECT :campo ... RETURNING`, nunca `VALUES`. Nenhuma coluna
  tem `DEFAULT`: a aplicação fornece todos os valores.
- Aliases descritivos, sem abreviar (`demanda_filho`, não `d`). Tabelas no singular, em português
  snake_case. Datas genéricas `_date`, de negócio `_data` — nunca `_at`/`_em`.
- Hierarquias e grafos: CTEs recursivas do PostgreSQL.
- Migrations: arquivos `.sql` numerados em `backend/src/database/migrations/` (skill
  `sql-migrations`; `SYSTEM.SPEC.md` §9.5).
- A configuração do backend passa por `ConfigService`; nunca `process.env` direto.

Frontend: componentes standalone (nunca NgModule por feature), Signals no lugar de
Subject/BehaviorSubject, apenas Reactive Forms, estilos `.scss` com Tailwind para utilitários e
BEM em português para classes próprias, sem `style=""` inline nem seletor de ID, rotas com
`loadComponent`.

Regras de negócio que mais são violadas:

- Nunca duas execuções ativas (sem `fim_data`) para o mesmo usuário; a trava vale para o **dono da
  atividade** (`atividade.usuario_id`), pois a execução não tem coluna de usuário.
- Gestor inicia/pausa a execução de **qualquer** atividade; desenvolvedor só das próprias. A
  autorização é por tipo de usuário + dono da atividade, nunca via `demanda_usuario`.
- Desenvolvedor só vê projetos em que tem ao menos uma linha em `demanda_usuario`. Gestores **não**
  entram em `demanda_usuario`: o acesso deles é por tipo (total). Não existe `projeto_usuario`.
- Conexões do grafo de demandas (`DemandaConexao`) são validadas contra ciclos por CTE recursiva
  antes do INSERT.
- Exclusões são sempre soft delete.

## Comandos úteis

```bash
npm install
npm run db:up                              # PostgreSQL 16 via Docker Compose
npm run db:migrate --workspace=backend     # aplica migrations pendentes
npm run db:rollback --workspace=backend    # reverte o último lote
npm run db:converter-descricoes --workspace=backend  # HTML do Quill → Markdown (dry-run; ver README)
npm run backend:dev                        # API em http://localhost:3000
npm run frontend:dev                       # SPA em http://localhost:4200 (proxy /api → :3000)
npm run dev                                # backend e frontend juntos
npm test                                   # shared + backend + scripts de repositório
npm run test --workspace=shared            # só o shared
npm run test --workspace=backend           # só o backend
npm run build --workspace=backend          # compilação do backend (usada como gate)
npm run build --workspace=frontend         # compilação do frontend (usada como gate)
npm run test --workspace=desktop           # funções puras do Project Desktop
npm run pack --workspace=desktop           # executável portátil do Project Desktop (Windows)
npm run repo:verificar                     # organização de specs/artefatos e espelhos
npm run repo:test                          # testes dos scripts de verificação e impacto
npm run impacto -- <arquivo>               # consumidores antes de alterar algo compartilhado
```

Testes ficam ao lado do código, em `*.test.ts`, com `node:test` e `node:assert/strict` (sem Jest);
não há script de teste no `frontend` nem lint em nenhum workspace (`PROBLEMS.md` P-001). Variáveis de ambiente:
`.env.example` e `README.md`. Para verificação manual da aplicação real, consulte
`.agents/skills/verify/SKILL.md`; build não a substitui quando a tarefa exige observar o app.

## Segurança operacional

Preserve alterações existentes do usuário. Antes de qualquer comando destrutivo, confirme o alvo e
a necessidade. Não use reset destrutivo nem apague arquivos fora do escopo. Nunca rode formatador
de escopo amplo (glob) nem descarte alterações sem ver o diff antes — outra sessão pode estar
editando o mesmo checkout. Migration já aplicada nunca é editada. Após alterar código, rode a
verificação proporcional ao risco e relate claramente o que foi validado.

## Coautoria de commits

Todo commit criado por um agente neste repositório inclui um trailer `Co-authored-by:` que
identifique o agente responsável (por exemplo, `Codex <noreply@openai.com>` ou a identidade
configurada para Claude). Antes de concluir um commit, confira a mensagem efetivamente gravada com
`git log -1` ou `git show`.
