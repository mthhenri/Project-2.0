# SYSTEM.SPEC.md — Project 2.0

> **Leia este arquivo integralmente antes de iniciar qualquer sessão de implementação.**
> Este é o documento de constituição do projeto. Toda decisão técnica e de negócio relevante está aqui documentada.
> Em caso de dúvida sobre qualquer padrão, este arquivo tem precedência sobre qualquer outra fonte.

---

## 1. Visão Geral

**Nome:** Project 2.0
**Tipo:** Sistema de Controle de Ponto e Gestão de Projetos
**Descrição:** Plataforma web para registro e controle do tempo de desenvolvedores, com gestão hierárquica de projetos, demandas e atividades. Permite registro de execuções com controle de início e fim, cálculo automático de horas trabalhadas e intervalos do dia, e auxílio de inteligência artificial para refinamento de descrições escritas pelo usuário.

---

## 2. Stack Técnica

### Backend
- **Runtime:** Node.js
- **Framework:** NestJS (TypeScript)
- **Banco de dados:** PostgreSQL 16
- **Query layer:** Knex.js — SQL bruto obrigatório, sem ORM
- **Autenticação:** JWT via Passport.js
- **Validação:** class-validator + class-transformer
- **Encriptação:** bcrypt
- **IA:** @anthropic-ai/sdk
- **Histórico das conversas do chat (stack final):** **Elasticsearch**. Hoje o armazenamento é trocável por `CHAT_ARMAZENAMENTO` (task 162): `opensearch` no desenvolvimento, `postgres` (tabelas provisórias `chat_mensagem` e `chat_conversa`, que **não existem na produção final**) na produção de teste sem custo, e `elasticsearch` na produção de verdade (task 163; outra implementação do mesmo contrato `ArmazenamentoDeChat`, cliente `@elastic/elasticsearch` 9)

### Frontend
- **Framework:** Angular 21 — standalone components obrigatório
- **UI:** PrimeNG 21
- **Estado:** Angular Signals (signal, computed, effect)
- **Formulários:** Reactive Forms
- **HTTP:** Angular HttpClient com interceptores
- **Editor rico:** `app-markdown-editor` próprio (campos Markdown; ver §8.2)
- **Estilos**: SCSS + Tailwind CSS + BEM
- **Visualização de grafo**: D3.js (force simulation)

### Infraestrutura
- **Containers:** Docker + Docker Compose
- **Banco:** PostgreSQL 16 em container

---

## 3. Estrutura do Repositório

```
project-2.0/
  shared/                       ← pacote compartilhado entre backend e frontend
    src/
      dtos/
        usuario/
        projeto/
        demanda/
        atividade/
        execucao/
        ponto/
        calendario/
        tag/
        assistente/
      enums/
      interfaces/
        standard-response.interface.ts
        paginated-result.interface.ts
    package.json
    tsconfig.json
  backend/
  frontend/
  docs/
    SYSTEM.SPEC.md        ← este arquivo — lido no início de toda sessão
    CONVENTIONS.md        ← referência rápida de convenções
    SCHEMA.md             ← schema SQL completo e comentado
    DEPLOY.md             ← deploy e ambientes
    assets/               ← mídia versionada de documentação (ex.: prints da revisão de UI/UX)
    context/              ← contexto persistente entre sessões
      CONTEXT.md          ← o que é verdade agora (lido após este arquivo e o CONVENTIONS)
      HISTORY.md          ← o que aconteceu e por quê (acrescenta no topo)
      PROBLEMS.md         ← o que está quebrado agora
      MEMORY.md           ← onde as coisas vivem (somente ponteiros)
      IDEAS.md            ← o que ainda não é sistema
    specs/
      backlog/            ← tasks a implementar
      active/             ← task em andamento na sessão atual
      done/               ← tasks concluídas (histórico)
      discarded/          ← tasks descartadas por decisão do autor (registro; não implementar)
  desktop/                      ← Project Desktop (Electron): abre o front numa janela própria (task 152)
  scripts/                      ← repo:verificar, impacto e hooks de agente
  .claude/                      ← skills, subagentes e settings do Claude Code
  .agents/skills/               ← cópia idêntica de .claude/skills (agentes compatíveis com AGENTS.md)
  CLAUDE.md, AGENTS.md          ← orientação aos agentes — cópias idênticas
  package.json                  ← workspaces root (npm workspaces)
  docker-compose.yml
  .gitignore
  README.md
```

### 3.1 Documentação de tarefa e artefatos de execução

Todo trabalho executável tem uma única spec em `docs/specs/{backlog,active,done,discarded}/<tarefa>.spec.md`.
Uma spec **descartada** (`discarded/`) é decisão do autor de não fazer a task: ela leva no topo uma nota
com data e motivo, o corpo não é reescrito, e nada mais depende dela.
Planos, decisões de design da tarefa, propostas, revisões, auditorias e relatórios de verificação
são **anexos** em `docs/specs/<estado>/<tarefa>/`, com a spec proprietária ao lado. Mova spec e
anexos juntos ao mudar de estado; corrija os ponteiros de forma mecânica. Não crie ciclos
paralelos por ferramenta ou tipo de atividade (`reviews/`, `auditorias/`, `plans/`, `propostas/`
ou equivalentes) — essa regra prevalece sobre destinos padrão de plugins e skills externas.

A spec define escopo e aceite; o plano só ordena a execução. Auditoria parcial continua em
`active/`, mesmo com relatório produzido. Spec concluída preserva requisitos e decisões: numa
realocação só os ponteiros mudam.

Capturas, vídeos, logs, dumps, cenários temporários e JSONs de resultado bruto ficam em
`.artifacts/<tarefa>/`, **ignorada pelo Git**. Nunca force sua inclusão. O relatório textual
versionado registra método, comandos/resultados, estados verificados, achados e limites, e avisa
quando a evidência é local e não vem no clone. Arquivo gerado só vira fonte versionada quando for
asset do produto, fonte canônica ou fixture reproduzível definida pela spec.

Rode `npm run repo:verificar` antes do fecho e `npm run repo:verificar -- --staged` depois de
preparar um commit. O CI confere os caminhos versionados e os espelhos; `.gitignore` sozinho não
protege contra arquivo já rastreado ou inclusão forçada.

---

### 3.2 Project Desktop (`desktop/`)

Aplicativo Electron (TypeScript, `desktop/src/main.ts`) que abre o front do Project numa janela própria; o front continua sendo o
centro e o desktop só aponta para a URL fixa (`desktop/src/config.ts`). A janela abre cobrindo o monitor principal, sempre por cima, sem arrastar
nem redimensionar pela borda; pode maximizar (e restaurar volta ao tamanho de abertura); **fechar, Alt+F4 e minimizar ocultam a janela** (ela some da barra de tarefas e o app segue vivo na bandeja, que a traz de volta) e a única saída é "Fechar completamente" no ícone da bandeja,
com confirmação numa janelinha própria, no tema do sistema. O desligamento do sistema operacional nunca é impedido. Uma única instância, sem iniciar com o Windows. A lógica de
decisão (fechar ou ocultar, janela fora do lugar, destino de um link, URL, texto do tempo) mora em funções puras com `node:test`
(`desktop/src/politica-da-janela.ts`); o executável portátil sai de `npm run pack --workspace=desktop` e não tem atualização
automática (task 198): o backend serve o `Project-Desktop-<versão>.exe` de maior versão da pasta `DESKTOP_PASTA_EXECUTAVEIS` (`GET /desktop/versao` e `GET /desktop/download`, qualquer usuário autenticado; módulo `desktop`), o menu do perfil tem "Baixar Project Desktop" e o app avisa na bandeja quando há versão mais nova (confere de hora em hora; o front inicia o download). Com o Project minimizado e o check-in disparado pelo backend, o desktop abre a **janelinha do check-in** (480 × 560, sem moldura, sempre por cima, arrastável, sem fechar nem minimizar; `src/politica-do-checkin.ts` decide quando abrir e fechar); com o Project à tela, o check-in é o diálogo dentro dele (task 161). O desktop lê a situação em `GET /checkin/situacao` com o token que a página guarda, e a página `/checkin` avisa o fim por `window.projectDesktop.encerrarCheckin()` (`src/preload.ts`) (task 160).

## 4. Regras de Linguagem

### Princípio

**Teste:** "Esse conceito existiria em qualquer projeto de software?"
- **Sim** → inglês
- **Não** → português

### Tabela de Referência

| Inglês (genérico / arquitetural) | Português (negócio / projeto) |
|---|---|
| Nomes de pastas: `controllers/`, `services/`, `repositories/`, `domain/`, `dtos/`, `core/`, `shared/`, `base/`, `modules/`, `config/` | Nomes de arquivo com entidade: `usuario.service.ts`, `demanda.repository.ts`, `execucao.controller.ts` |
| Classes genéricas: `BaseEntity`, `BaseRepository`, `StandardResponse`, `PaginatedResult` | Nomes de método: `criarUsuario()`, `listarDemandas()`, `encerrarExecucao()` |
| Campos de BaseEntity em TypeScript: `id`, `isDeleted`, `createdDate`, `updatedDate`, `deletedDate` | DTOs de negócio: `UsuarioCriarDto`, `DemandaAlterarDto`, `ExecucaoIniciarDto` |
| Colunas BaseEntity em SQL: `id`, `is_deleted`, `created_date`, `updated_date`, `deleted_date` | Tabelas e colunas de negócio em SQL: `usuario`, `nome_completo`, `horas_estimadas`, `is_estrutural` |
| Padrões técnicos: `global-exception.filter.ts`, `auth-token.interceptor.ts`, `base.repository.ts` | Propriedades de modelo: `nomeCompleto`, `descricaoTecnica`, `horasDiariasNecessarias` |
| Exceptions genéricas: `BusinessException`, `ResourceNotFoundException` | Valores de enum: `DESENVOLVEDOR`, `GESTOR`, `PLANEJADA`, `DESENVOLVENDO` |
| Decorators: `@Public()`, `@GestorOnly()`, `@ActiveUser()` | Nomes de módulo de negócio (pasta): `usuario/`, `demanda/`, `execucao/` |

### Exemplos Concretos

```
✅ usuario.service.ts          — entidade de negócio, arquivo em português
✅ base.repository.ts          — padrão genérico, arquivo em inglês
✅ global-exception.filter.ts  — padrão técnico, arquivo em inglês
✅ autenticacao.guard.ts       — comportamento de negócio, arquivo em português
✅ auth-token.interceptor.ts   — padrão técnico genérico, arquivo em inglês
✅ data-brasileira.pipe.ts     — específico do projeto, arquivo em português
✅ fn_set_updated_date()       — objeto genérico de banco (infra de BaseEntity), em inglês
❌ fn_atualizar_updated_date() — idioma misto em objeto genérico, proibido (§16 #12)
✅ dia_nao_util / nome_completo — tabela/coluna de negócio, em português
```

A regra alcança também **objetos de banco**: funções e triggers de **infraestrutura** (mecanismos genéricos como a manutenção de `updated_date` da BaseEntity) são nomeados em **inglês**; **tabelas e colunas de negócio** permanecem em português.

---

## 5. Convenções de Nomenclatura

### 5.1 DTOs

Padrão: **`Entidade + Complemento (se necessário) + Verbo + Dto`**

O complemento só aparece quando a operação atinge um sub-aspecto específico da entidade, não o modelo inteiro.

**Quando o complemento envolve múltiplos campos:**

Se a operação afeta dois ou mais campos relacionados, o complemento deve ser agrupado num substantivo semântico que os represente — nunca concatenar dois complementos:

```
senha + email       → Credenciais   → UsuarioCredenciaisAlterarDto
nome + cargoTitulo  → Perfil        → UsuarioPerfilAlterarDto
```

Se não existe um substantivo natural que agrupe os campos, é sinal de que a operação provavelmente é uma alteração completa do modelo (`UsuarioAlterarDto`) e o complemento deve ser omitido.

**Quando o complemento é uma coleção:**

Use o plural do complemento quando a operação lida com múltiplos itens daquele sub-aspecto de uma vez:

```
AtribuirUmaTag     → DemandaTagAtribuirDto
AtribuirVáriasTags → DemandaTagsAtribuirDto
```

**Quando o complemento tem mais de uma palavra:**

O complemento inteiro — todas as palavras — vem antes do verbo, sem exceção. Qualificadores como "Interno" fazem parte do complemento quando modificam o substantivo do complemento:

```
membro + interno → complemento "MembroInterno" → DemandaMembroInternoAtribuirDto  ✅
                                               → DemandaMembroAtribuirInternoDto  ❌
tag    + interno → complemento "TagInterno"    → DemandaTagInternoRemoverDto      ✅
tags   + interno → complemento "TagsInterno"   → DemandaTagsInternoAtribuirDto    ✅
```

A mesma ordem vale quando `Interno` é o **único** complemento (sem outro substantivo): o qualificador continua antes do verbo, nunca depois:

```
interno → complemento "Interno" → ExecucaoInternoAlterarDto   ✅  / ExecucaoAlterarInternoDto   ❌
interno → complemento "Interno" → ExecucaoInternoEncerrarDto  ✅  / ExecucaoEncerrarInternoDto  ❌
```

**Entrada (verbo no infinitivo):**
```
UsuarioCriarDto                   ← operação pura no modelo inteiro
UsuarioAlterarDto                 ← alteração do modelo inteiro (nunca "Atualizar")
UsuarioRecuperarDto               ← recuperação individual — sempre { id: number }
UsuarioListarDto                  ← filtros e parâmetros de listagem
DemandaCriarDto
ExecucaoIniciarDto
ExecucaoEncerrarDto
UsuarioSenhaAlterarDto            ← com complemento: opera só na senha
AssistenteDescricaoAuxiliarDto    ← com complemento: auxilia descrição
```

**Saída (verbo no particípio):**
```
UsuarioCriadoDto                  ← resposta de criação
UsuarioRecuperadoDto              ← resposta de busca individual
UsuarioResumoDto                  ← item de listagem (resumido)
UsuarioAlteradoDto                ← resposta de alteração (nunca "Atualizado")
DemandaRecuperadaDto
ExecucaoIniciadaDto
AssistenteDescricaoAuxiliadaDto
```

**DTOs de relatório / consulta computada (sem verbo de operação):**

Relatórios e consultas agregadas não representam uma operação CRUD sobre a entidade — eles **descrevem um recorte calculado**. Não recebem verbo no particípio; o nome é `Entidade + Recorte + Dto`, onde o recorte é o substantivo que qualifica o relatório:

```
PontoDiarioDto      ← resumo de ponto de um dia (horas, intervalos, meta)
PontoMensalDto      ← resumo de ponto de um mês
```

O lado de entrada desses relatórios, quando existe, continua sendo um DTO de parâmetros no padrão normal (`PontoDiarioConsultarDto`, `PontoMensalListarDto`).

**Value-objects / sub-estruturas (sem entidade nem verbo):**

Estruturas reutilizáveis que não são entidade de domínio — apenas agrupam campos calculados — recebem nome do **conceito que representam**, sem prefixo de entidade nem verbo:

```
IntervaloDto        ← { inicioData, fimData, duracaoMinutos } — gap entre execuções
```

Use esta forma apenas para value-objects genuínos (sem ciclo de vida próprio, sem operação CRUD). Se a estrutura ganhar operações, ela vira entidade e volta ao padrão `Entidade + Verbo + Dto`.

**Regras adicionais de DTO:**
- Toda recuperação individual de entidade usa `EntidadeRecuperarDto { id: number }` — nunca parâmetro primitivo
- Toda operação que recebe parâmetros, mesmo que seja um único campo, usa DTO — zero primitivos em assinaturas de service e repository
- Nenhum DTO pode ser alias ou re-export de outro — mesmo que os campos sejam idênticos, cada DTO define os seus próprios campos explicitamente

**Herança de DTO — negócio nunca herda negócio; negócio herda core:**

Um DTO de **negócio** (`UsuarioAlteradoDto`, `DemandaRecuperadaDto`, `ProjetoCriadoDto`…)
**nunca** herda outro DTO de **negócio** — cada um **declara os seus próprios campos
explicitamente**, mesmo que sejam idênticos aos de outro DTO. Pares como `Criado`/`Alterado`
tendem a divergir com o tempo; herança permanente entre eles cria acoplamento frágil e
viola a regra de campos explícitos.

```typescript
// ❌ Proibido — DTO de negócio estendendo DTO de negócio (mesmo vazio)
export class UsuarioAlteradoDto extends UsuarioRecuperadoDto {}
export class ProjetoRecuperadoDto extends ProjetoCriadoDto {}

// ✅ Cada DTO de negócio declara os seus campos
export class UsuarioAlteradoDto {
  id: number; login: string; /* … todos os campos, com @ApiProperty */
}
```

Um DTO de negócio **pode e deve** herdar um DTO **core** (genérico/arquitetural de
`shared/src/interfaces/`, como `PaginatedResult<TItem>` e `StandardResponse<TData>`) — aí a
herança **evita duplicar** os campos genéricos. O teste é o de linguagem (§4): a base
existiria em qualquer projeto → é core → herança permitida.

```typescript
// ✅ Wrapper de listagem herdando o core PaginatedResult (não redeclara itens/totalItens/…)
export class ExecucaoResumoDto extends PaginatedResult<ExecucaoItemDto> {
  totalMinutosDia: number;
}
```

O par **item/wrapper** de listagem segue este molde: o **item** é um DTO de negócio com
campos explícitos (`ExecucaoItemDto`); o **wrapper** (`ExecucaoResumoDto`) herda
`PaginatedResult<ExecucaoItemDto>` e acrescenta só o que é específico (`totalMinutosDia`).
`PaginatedResult` é **classe** (não interface) para poder ser estendida; retornos por
object-literal nos services continuam válidos por tipagem estrutural. `StandardResponse`
permanece interface — nenhum DTO de negócio a herda (o wrapper de resposta é montado pelo
interceptor).

### 5.2 Métodos

Sempre `verbo + entidade`, em português, sem abreviações:

```typescript
// ✅ Correto
criarUsuario()
listarUsuarios()
recuperarUsuario()
alterarUsuario()              // nunca "atualizar"
excluirUsuario()
buscarLogin()
validarLogin()                // nunca "existeLogin" — sempre verbo de ação
validarNome()                 // nunca "existeNome"
validarCodigo()               // nunca "existeCodigo"
verificarLoginDisponivel()
iniciarExecucao()
encerrarExecucao()
calcularHorasTrabalhadas()
identificarIntervalos()
verificarCriariaCiclo()
```

### 5.3 Variáveis

Sem abreviações. Sempre explícitas e legíveis:

```typescript
// ✅ Correto
const usuarioEncontrado = await this.usuarioRepositorio.buscarPorLogin(login);
const totalPaginas = Math.ceil(totalItens / itensPorPagina);
const deslocamento = (pagina - 1) * itensPorPagina;
const senhaEstaCorreta = await bcrypt.compare(senhaNaoEncriptada, senhaEncriptada);
const execucoesNoDia = await this.execucaoRepositorio.listarPorUsuarioEData(usuarioId, data);

// ❌ Proibido
const u = await this.repo.find(l);
const tp = Math.ceil(ti / ipp);
const ok = await bcrypt.compare(p, h);
const execs = await this.repo.list(id, d);
```

### 5.4 Enums

**Nome do enum TS = nome da tabela de referência (PascalCase) + `Enum`.** Como toda tabela de
enum é `tipo_<tabela>_<complemento?>`, o enum sempre começa por `Tipo`. O arquivo segue o nome
da tabela em kebab-case + `.enum.ts`.

```typescript
// tipo-usuario.enum.ts            ← tabela tipo_usuario
export enum TipoUsuarioEnum {
  DESENVOLVEDOR = 'DESENVOLVEDOR',
  GESTOR        = 'GESTOR',
  ADMINISTRADOR = 'ADMINISTRADOR',
}

// tipo-demanda-status.enum.ts     ← tabela tipo_demanda_status
export enum TipoDemandaStatusEnum {
  PENDENTE  = 'PENDENTE',
  PLANEJADA = 'PLANEJADA',
  CONCLUIDA = 'CONCLUIDA',
  CANCELADA = 'CANCELADA',
}

// tipo-atividade-status.enum.ts   ← tabela tipo_atividade_status
export enum TipoAtividadeStatusEnum {
  PLANEJADA    = 'PLANEJADA',
  PENDENTE     = 'PENDENTE',
  DESENVOLVENDO = 'DESENVOLVENDO',
  DESENVOLVIDA = 'DESENVOLVIDA',
}
```

#### Enums são sempre tabelas de referência

Todo enum de domínio fechado existe, no banco, como uma **tabela de referência** —
**nunca** `VARCHAR + CHECK` nem tipo `ENUM` nativo do PostgreSQL. O enum TypeScript em
`shared/src/enums/` permanece como **contrato tipado** (usado em `@IsEnum`, DTOs e frontend)
e espelha exatamente os `codigo` da tabela. A tradução `codigo ⇄ id` acontece **só no
repositório** (SQL) — DTOs, services e frontend continuam usando o **valor do enum**, nunca o id.

**Nome da tabela:** `tipo_<tabela>_<complemento?>` — sempre começa por `tipo`, snake_case
singular português (`TIPO + TABELA + COMPLEMENTO`):

| Coluna de negócio | Tabela de referência | Enum TypeScript | Coluna FK |
|---|---|---|---|
| `usuario.tipo` | `tipo_usuario` | `TipoUsuarioEnum` | `tipo_usuario_id` |
| `usuario.status` | `tipo_usuario_status` | `TipoUsuarioStatusEnum` | `tipo_usuario_status_id` |
| `projeto.status` | `tipo_projeto_status` | `TipoProjetoStatusEnum` | `tipo_projeto_status_id` |
| `demanda.status` | `tipo_demanda_status` | `TipoDemandaStatusEnum` | `tipo_demanda_status_id` |
| `atividade.status` | `tipo_atividade_status` | `TipoAtividadeStatusEnum` | `tipo_atividade_status_id` |
| `dia_nao_util.tipo` | `tipo_dia_nao_util` | `TipoDiaNaoUtilEnum` | `tipo_dia_nao_util_id` |
| `dia_nao_util.duracao` | `tipo_dia_nao_util_duracao` | `TipoDiaNaoUtilDuracaoEnum` | `tipo_dia_nao_util_duracao_id` |

O enum TS é nomeado a partir da **tabela** (não da coluna de origem): `tipo_dia_nao_util` →
`TipoDiaNaoUtilEnum` (não `DiaNaoUtilTipoEnum`). A tabela de referência segue a BaseEntity e tem
`codigo` (valor SCREAMING_SNAKE, **igual** ao valor do enum TS) e `descricao` (rótulo legível). A
coluna de negócio é um `INTEGER` FK para o `id` dessa tabela, nomeada `<tabela_referencia>_id`. No
repositório: subselect por `codigo` no INSERT/UPDATE; JOIN expondo `tabela_referencia.codigo AS
<campo>` no SELECT/RETURNING.

---

## 6. Pacote Compartilhado (`shared/`)

O `shared/` é um pacote npm workspace importado tanto pelo `backend/` quanto pelo `frontend/`. Nele ficam todos os artefatos que precisam ser consistentes nos dois lados da aplicação.

### 6.1 O que fica no shared

- **DTOs** — todas as interfaces de entrada e saída da API
- **Enums de negócio** — valores compartilhados entre backend e frontend
- **Interfaces genéricas** — `StandardResponse`, `PaginatedResult`

### 6.2 Estrutura de Pastas

```
shared/src/
  dtos/
    usuario/
      UsuarioCriarDto.ts
      UsuarioCriadoDto.ts
      UsuarioRecuperarDto.ts        ← { id: number } — padrão para recuperação individual
      UsuarioRecuperadoDto.ts
      UsuarioAlterarDto.ts          ← nunca "Atualizar"
      UsuarioAlteradoDto.ts         ← nunca "Atualizado"
      UsuarioListarDto.ts
      UsuarioResumoDto.ts
      UsuarioSenhaAlterarDto.ts
      UsuarioSenhaAlteradaDto.ts
      UsuarioCredenciaisAlterarDto.ts
    projeto/
    demanda/
      DemandaGrafoDto.ts
      DemandaGrafoNoDto.ts
      DemandaGrafoArestaDto.ts
    atividade/
    execucao/
    ponto/
    calendario/
    tag/
    assistente/
  enums/
    usuario-tipo.enum.ts
    usuario-status.enum.ts
    demanda-status.enum.ts
    atividade-status.enum.ts
    projeto-status.enum.ts
    dia-nao-util-tipo.enum.ts
    dia-nao-util-duracao.enum.ts
  interfaces/
    standard-response.interface.ts
    paginated-result.interface.ts
```

### 6.3 Configuração de Workspace

```json
// package.json (raiz)
{
  "workspaces": ["shared", "backend", "frontend", "desktop"]
}
```

```json
// backend/package.json e frontend/package.json
{
  "dependencies": {
    "@project20/shared": "*"
  }
}
```

### 6.4 Importação

```typescript
// em qualquer arquivo do backend ou frontend
import { UsuarioCriarDto }         from '@project20/shared/dtos/usuario';
import { UsuarioTipoEnum }         from '@project20/shared/enums';
import { StandardResponse }        from '@project20/shared/interfaces';
```

### 6.5 O que NÃO fica no shared

- Decorators NestJS (`@Controller`, `@Injectable`, etc.)
- Componentes Angular
- Lógica de negócio
- Configurações de framework
- Models de banco de dados (backend only)

---

## 7. Arquitetura do Backend

### 7.1 Estrutura de Pastas

> DTOs e enums de negócio vivem em `shared/` e são importados via `@project20/shared`. O backend mantém apenas o que é exclusivo de sua camada.

```
backend/src/
  modules/
    autenticacao/
      controllers/
        autenticacao.controller.ts
      services/
        autenticacao.service.ts
    usuario/
      controllers/
        usuario.controller.ts
      services/
        usuario.service.ts
      repositories/
        usuario.repository.ts
      domain/
        models/
          usuario.model.ts   ← modelo de banco, exclusivo do backend
    projeto/
      controllers/
        projeto.controller.ts
      services/
        projeto.service.ts
      repositories/
        projeto.repository.ts
      domain/
        models/
          projeto.model.ts
    demanda/
      [mesma estrutura]
    atividade/
      [mesma estrutura]
    execucao/
      [mesma estrutura]
    ponto/
      [sem repository próprio — consome execucao e calendario]
    calendario/
      [mesma estrutura]
    tag/
      [mesma estrutura]
    assistente/
      controllers/
        assistente.controller.ts
      services/
        assistente.service.ts
  core/
    base/
      base.entity.ts
      base.repository.ts
    exceptions/
      business.exception.ts
      resource-not-found.exception.ts
      unauthorized-access.exception.ts
    filters/
      global-exception.filter.ts
    interceptors/
      response-format.interceptor.ts
    interfaces/
      standard-response.interface.ts
      paginated-result.interface.ts
    database/
      database.module.ts
      database.provider.ts
  config/
    config.module.ts
    config.service.ts
    config.interface.ts
  app.module.ts
  main.ts
```

### 7.2 Regra da Controller — Obrigatória

A controller é **burra**. Apenas expõe o endpoint, aplica guards/decorators e repassa para a service. Sem lógica de negócio, sem if, sem try/catch, sem validação, sem acesso a repositório.

**Única "microinteligência" sancionada:** montar o DTO. A service e o repositório **nunca** recebem primitivo (§16 #21); portanto, quando o identificador chega pela rota (`@Param('id')`) ou pela query (`@Query('projetoId')`), é a controller que o injeta dentro do DTO antes de repassar. Isso **não** é exceção ao §16 #21 — é exatamente o ponto onde o DTO nasce. O service sempre recebe **um único DTO** (objetos de contexto como o payload do JWT via `@ActiveUser()` são permitidos por não serem primitivos).

```typescript
// ✅ Correto
@Controller('usuario')
@UseGuards(JwtAuthGuard)
export class UsuarioController {
  constructor(private readonly usuarioService: UsuarioService) {}

  @Post()
  @GestorOnly()
  criar(@Body() dto: UsuarioCriarDto) {
    return this.usuarioService.criar(dto);
  }

  @Get()
  listar(@Query() dto: UsuarioListarDto) {
    return this.usuarioService.listar(dto);
  }

  @Get(':id')
  recuperarPorIdentificador(@Param('id', ParseIntPipe) id: number, @ActiveUser() usuarioAtivo: JwtPayload) {
    // microinteligência permitida: o id da rota entra no DTO { id }
    return this.usuarioService.recuperar({ id }, usuarioAtivo);
  }

  @Put(':id')
  @GestorOnly()
  alterar(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UsuarioAlterarDto,
    @ActiveUser() usuarioAtivo: JwtPayload,
  ) {
    // o id da rota é mesclado ao corpo, formando o DTO interno repassado à service
    return this.usuarioService.alterar({ ...dto, id }, usuarioAtivo);
  }

  @Delete(':id')
  @GestorOnly()
  excluir(@Param('id', ParseIntPipe) id: number) {
    return this.usuarioService.excluir({ id });
  }
}

// ❌ Proibido — passar o primitivo adiante (viola §16 #21)
@Put(':id')
alterar(@Param('id', ParseIntPipe) id: number, @Body() dto: UsuarioAlterarDto) {
  return this.usuarioService.alterar(id, dto);   // id solto na assinatura da service
}

// ❌ Proibido — lógica de negócio na controller
@Post()
async criar(@Body() dto: UsuarioCriarDto) {
  try {
    const loginExistente = await this.usuarioRepository.findByLogin(dto.login);
    if (loginExistente) {
      return { erro: 'Login já existe' };
    }
    // lógica na controller — NUNCA fazer isso
  } catch (erro) {
    throw erro;
  }
}
```

> **DTO de recuperação/exclusão individual:** o controller monta `{ id }` reutilizando `EntidadeRecuperarDto` — não se cria primitivo na assinatura de `recuperar`/`excluir`.
> **DTO de alteração:** o controller mescla `{ ...dto, id }` num DTO interno que carrega o `id` + os campos alteráveis (ver `EntidadeInternoAlterarDto` em §7.4).

### 7.3 Regra da Service — Obrigatória

Toda inteligência de negócio vive na service. Ela valida regras, orquestra repositórios e lança exceções:

```typescript
// ✅ Correto
async criar(dto: UsuarioCriarDto): Promise<StandardResponse<UsuarioCriadoDto>> {
  const loginJaExiste = await this.usuarioRepositorio.validarLogin({ login: dto.login });

  if (loginJaExiste) {
    throw new BusinessException('Login já está em uso');
  }

  const senhaEncriptada = await bcrypt.hash(dto.senhaNaoEncriptada, 10);

  const usuarioCriado = await this.usuarioRepositorio.inserir({
    login: dto.login,
    senhaEncriptada,
    nomeCompleto: dto.nomeCompleto,
    cargoTitulo: dto.cargoTitulo,
    tipo: dto.tipo,
    horasDiariasNecessarias: dto.horasDiariasNecessarias,
  });

  return {
    sucesso: true,
    dados: usuarioCriado,
    mensagem: 'Usuário criado com sucesso',
  };
}
```

### 7.4 Regra do Repositório — Obrigatória

O repositório **apenas executa SQL**. Sem lógica de negócio, sem if de validação:

```typescript
// ✅ Correto
async validarLogin(dto: UsuarioValidarLoginDto): Promise<boolean> {
  const resultado = await this.executarConsulta<{ existe: boolean }>(
    `SELECT EXISTS(
       SELECT 1 FROM usuario
       WHERE login = :login
         AND is_deleted = false
     ) AS existe`,
    { login: dto.login },
  );
  return resultado[0].existe;
}

async recuperar(dto: UsuarioRecuperarDto): Promise<UsuarioRecuperadoDto | null> {
  // busca por id — único ponto de entrada para recuperação individual
}

async inserir(dados: Omit<Usuario, keyof BaseEntity>): Promise<UsuarioCriadoDto> {
  const resultado = await this.executarConsulta<UsuarioCriadoDto>(
    `INSERT INTO usuario (login, senha_encriptada, nome_completo, cargo_titulo, tipo, horas_diarias_necessarias, status, created_date, updated_date, is_deleted)
     SELECT :login, :senhaEncriptada, :nomeCompleto, :cargoTitulo, :tipo, :horasDiariasNecessarias, :status, NOW(), NOW(), false
     RETURNING id, login, nome_completo, cargo_titulo, tipo, horas_diarias_necessarias, status, created_date`,
    {
      login:                    dados.login,
      senhaEncriptada:          dados.senhaEncriptada,
      nomeCompleto:             dados.nomeCompleto,
      cargoTitulo:              dados.cargoTitulo,
      tipo:                     dados.tipo,
      horasDiariasNecessarias:  dados.horasDiariasNecessarias,
      status:                   dados.status,
    },
  );
  return resultado[0];
}
```

**`alterar` segue a mesma regra DTO de `recuperar` — zero primitivos, id dentro do DTO:**

```typescript
// ✅ Correto — DTO único carregando id + campos alteráveis
async alterar(dto: UsuarioInternoAlterarDto): Promise<UsuarioAlteradoDto> {
  // dto.id no WHERE; demais campos no SET dinâmico
}

// ❌ Proibido — primitivo id + objeto anônimo inline
async alterar(id: number, dados: { nomeCompleto?: string; status?: UsuarioStatusEnum }) { ... }
```

O DTO interno usa o padrão de nomenclatura **verbo no fim** (§5.1): o qualificador `Interno` faz parte do complemento, então `UsuarioInternoAlterarDto` ✅ (nunca `UsuarioAlterarInternoDto` ❌). O controller monta `{ ...dto, id }`; service e repositório consomem o mesmo DTO.

### 7.5 BaseRepository

```typescript
// core/base/base.repository.ts
export abstract class BaseRepository<TEntity> {
  constructor(
    protected readonly conexaoBancoDados: Knex,
    protected readonly nomeTabela: string,
  ) {}

  protected async executarConsulta<TResult = TEntity>(
    consultaSQL: string,
    parametros: Record<string, unknown> | unknown[] = {},
  ): Promise<TResult[]> {
    const resultado = await this.conexaoBancoDados.raw(consultaSQL, parametros);
    return resultado.rows as TResult[];
  }

  protected async executarComando(
    consultaSQL: string,
    parametros: Record<string, unknown> | unknown[] = {},
  ): Promise<void> {
    await this.conexaoBancoDados.raw(consultaSQL, parametros);
  }

  protected construirPaginacao(pagina: number, itensPorPagina: number): string {
    const deslocamento = (pagina - 1) * itensPorPagina;
    return `LIMIT ${itensPorPagina} OFFSET ${deslocamento}`;
  }

  protected construirOrdenacao(
    campo: string,
    direcao: 'ASC' | 'DESC' = 'ASC',
  ): string {
    return `ORDER BY ${campo} ${direcao}`;
  }

  protected async executarSoftDelete(identificador: number): Promise<void> {
    await this.executarComando(
      `UPDATE ${this.nomeTabela}
       SET is_deleted = true,
           deleted_date = NOW(),
           updated_date = NOW()
       WHERE id = :identificador`,
      { identificador },
    );
  }
}
```

### 7.6 Respostas Padronizadas

```typescript
// core/interfaces/standard-response.interface.ts
export interface StandardResponse<TData = void> {
  sucesso: boolean;
  dados: TData | null;
  mensagem: string;
  erros?: string[];
}

// core/interfaces/paginated-result.interface.ts
export interface PaginatedResult<TItem> {
  itens: TItem[];
  totalItens: number;
  paginaAtual: number;
  itensPorPagina: number;
  totalPaginas: number;
}
```

O interceptor `response-format.interceptor.ts` encapsula toda resposta bem-sucedida nesse formato automaticamente. A service não precisa montar o wrapper manualmente — apenas retorna os dados.

### 7.7 Exceções

```typescript
// core/exceptions/business.exception.ts
export class BusinessException extends HttpException {
  constructor(mensagem: string) {
    super({ sucesso: false, mensagem, dados: null, erros: [] }, HttpStatus.BAD_REQUEST);
  }
}

// core/exceptions/resource-not-found.exception.ts
export class ResourceNotFoundException extends HttpException {
  constructor(nomeEntidade: string) {
    super(
      { sucesso: false, mensagem: `${nomeEntidade} não encontrado`, dados: null, erros: [] },
      HttpStatus.NOT_FOUND,
    );
  }
}

// core/exceptions/unauthorized-access.exception.ts
export class UnauthorizedAccessException extends HttpException {
  constructor(mensagem = 'Acesso não autorizado') {
    super({ sucesso: false, mensagem, dados: null, erros: [] }, HttpStatus.FORBIDDEN);
  }
}
```

---

## 8. Arquitetura do Frontend

### 8.1 Estrutura de Pastas

> DTOs e enums de negócio são importados de `@project20/shared`. O frontend não duplica essas definições.

```
frontend/src/app/
  modules/
    usuario/
      components/
        usuario-formulario/
          usuario-formulario.component.ts
          usuario-formulario.component.html
        usuario-cartao/
          usuario-cartao.component.ts
          usuario-cartao.component.html
      pages/
        usuario-listagem/
          usuario-listagem.page.ts
          usuario-listagem.page.html
        usuario-detalhe/
          usuario-detalhe.page.ts
          usuario-detalhe.page.html
        usuario-anotacoes/
          usuario-anotacoes.page.ts
          usuario-anotacoes.page.html
      services/
        usuario.service.ts
      models/
        usuario.model.ts   ← mapeamento/extensão local se necessário
    [outros módulos seguem o mesmo padrão]
  core/
    services/
      autenticacao.service.ts
    interceptors/
      auth-token.interceptor.ts        ← adiciona JWT no header
      error-handler.interceptor.ts     ← trata erros HTTP globalmente
      loading.interceptor.ts           ← controla indicador de carregamento
    guards/
      autenticacao.guard.ts
      gestor.guard.ts
    signals/
      carregamento.signal.ts
      usuario-autenticado.signal.ts
  shared/
    layout/
      layout.component.ts           ← shell: barra lateral + topbar + router-outlet + toast
      navegacao.ts                  ← itens da navegação (rota, ícone, tecla do atalho, só gestor)
      sidebar/
        sidebar.component.ts        ← navegação vertical recolhível, atalho g + letra
      topbar/
        topbar.component.ts         ← execução ativa, relógio, tema, anotações, perfil, logout
        topbar.component.html
        topbar.component.scss
    components/
      loading-spinner/
        loading-spinner.component.ts
      error-message/
        error-message.component.ts
      markdown-visualizador/
        markdown-visualizador.component.ts   ← única forma de exibir Markdown (sem HTML cru)
      markdown-editor/
        markdown-editor.component.ts         ← editor de Markdown (CVA): edição **formatada** (Milkdown, carregado sob demanda via `markdown-formatado.ts`) e modo Markdown cru alternável; `emitirMenuContexto` + `aoMenuContexto` (botão direito sobre seleção)
      assistente-descricao/
        assistente-descricao.component.ts   ← componente de IA reutilizável
        assistente-descricao.component.html
    pipes/
      data-brasileira.pipe.ts
      moeda-real.pipe.ts
    directives/
```

### 8.2 Regras Angular 21

- **Standalone components** em todos os componentes e páginas — sem NgModule por feature
- **Signals** para estado reativo — evitar Subject/BehaviorSubject onde signal resolve
- **Reactive Forms** para todos os formulários — sem template-driven forms
- **`app-markdown-editor`** para campos de texto rico (Markdown: as cinco seções do pad, descrições e documentação da demanda); exibição só por `app-markdown-visualizador`
- **Lazy loading** por módulo via rotas com `loadComponent`

### 8.3 Componente Assistente de Descrição

O componente `assistente-descricao` é reutilizável nos formulários de execução e demanda:

```typescript
// Recebe o texto atual e contexto
@Input() textoAtual: string = '';
@Input() tipoEntidade: 'execucao' | 'demanda' = 'execucao';
@Input() contextoEntidade: string = '';

// Emite o texto auxiliado quando o usuário aceita
@Output() textoAuxiliadoAceito = new EventEmitter<string>();
```

O usuário compara o texto original com o auxiliado lado a lado antes de aceitar.

### 8.4 SCSS + Tailwind + BEM

Todo arquivo de estilo usa `.scss`. Tailwind para utilitários de layout e espaçamento. Classes customizadas seguem BEM (`bloco__elemento--modificador`) em português. Nunca `style=""` inline, nunca seletores de ID.

Estilos globais ficam em `src/styles.scss`. Estilos de componente ficam no arquivo `.scss` do próprio componente — nunca em `styles.scss`.

### 8.5 Tema e Paleta de Cores

**Tema base:** PrimeNG Aura, sobrescrito com preset `TemaAzul` via `definePreset` em `app.config.ts`.
**Tema claro/escuro:** habilitado (`darkModeSelector: '.app-escuro'` em `app.config.ts`). O tema escuro ativa pela classe `app-escuro` no `<html>`, controlada pelo `TemaService` (`core/services/tema.service.ts` + `core/models/tema.model.ts`, Signals) e persistida em `localStorage`; o toggle fica no popover de perfil da topbar (`shared/layout/topbar/topbar.component.html`, `(click)="tema.alternarTema()"`). Um `<script>` inline no `index.html` aplica a classe antes do bootstrap para evitar flash. O tema padrão é claro.

**Paleta primária — azul:**
O Aura usa índigo por padrão. O projeto sobrescreve para azul puro via `{blue.*}`:

```typescript
const TemaAzul = definePreset(Aura, {
  semantic: {
    primary: {
      50: '{blue.50}', 100: '{blue.100}', 200: '{blue.200}',
      300: '{blue.300}', 400: '{blue.400}', 500: '{blue.500}',
      600: '{blue.600}', 700: '{blue.700}', 800: '{blue.800}',
      900: '{blue.900}', 950: '{blue.950}',
    },
  },
});
```

**Regra de uso de cores — aliases semânticos que funcionam nos dois temas:**

No Aura/PrimeNG 21 a escala bruta `--p-surface-0..950` é **fixa** nos dois temas (não inverte) — só os semânticos invertem. Por isso, em SCSS **nunca** se usa `var(--p-surface-N)` direto: usa-se os aliases `var(--app-surface-N)` definidos em `frontend/src/styles.scss` (claro = igual ao PrimeNG; escuro = invertido num único lugar). Em templates (Tailwind), usa-se os utilitários semânticos que invertem (`text-color`, `text-muted-color`, `bg-emphasis`, `border-surface`) ou o par explícito `bg-surface-0 dark:bg-surface-900`.

| Token (alias) | Uso |
|---|---|
| `var(--app-surface-0)` | Fundo de painéis e topbar (cartão/painel) |
| `var(--app-surface-50)` | Fundo de página / área de conteúdo |
| `var(--app-surface-200)` | Bordas e divisores |
| `var(--app-surface-700)` | Texto de interface (labels, itens de nav) |
| `var(--app-surface-600)` | Texto secundário (horário, subtítulos) |
| `var(--app-realce-sutil)` | Fundo de realce sutil (item ativo, hover de linha) |
| `var(--app-realce-primario)` | Ícone/texto de item ativo, títulos em destaque |

A cor `primary` aparece **apenas em pontos de destaque**: estado ativo na navegação, botões de ação principal, títulos que representam a identidade do produto. Fundos estruturais usam sempre os aliases `--app-surface-*`. Aliases adicionais: `--app-avatar-fundo`/`--app-avatar-cor` (avatares) e `--app-fundo` (fundo de página). **Exceção:** a página do grafo (`demanda-projeto`/`demanda-grafo`) é canvas escuro proposital com hex fixos.

---

## 9. Banco de Dados

### 9.1 BaseEntity — Campos Obrigatórios em Toda Tabela

Nomes em inglês por serem genéricos. **Sem DEFAULT** — todos os valores fornecidos explicitamente no INSERT.

```sql
id            SERIAL      PRIMARY KEY,
created_date  TIMESTAMPTZ NOT NULL,
updated_date  TIMESTAMPTZ NOT NULL,
is_deleted    BOOLEAN     NOT NULL,
deleted_date  TIMESTAMPTZ
```

Em TypeScript:

```typescript
export abstract class BaseEntity {
  id: number;
  createdDate: Date;
  updatedDate: Date;
  isDeleted: boolean;
  deletedDate: Date | null;
}
```

### 9.2 Regras SQL — Todas Obrigatórias

1. **Todo SELECT inclui** `WHERE [tabela].is_deleted = false`
2. **Nomes de tabelas** em snake_case português singular: `usuario`, `demanda`, `dia_nao_util`
3. **Colunas de negócio** em snake_case português: `nome_completo`, `horas_estimadas`
4. **Colunas de BaseEntity** em snake_case inglês: `is_deleted`, `created_date`, `updated_date`
5. **Campos de data** seguem o padrão `[contexto]_date` (inglês) ou `[contexto]_data` (português): `created_date`, `inicio_data`, `fim_data`, `previsao_fim_data`
   - **Tipo:** colunas de data/hora (com instante) são `timestamptz` — o banco armazena **UTC** e devolve o instante; o front converte para o fuso local. A **sessão do banco** roda no fuso da aplicação (`APP_TIMEZONE`, fixado via `afterCreate` do pool e do `knexfile.ts`), para que `NOW()` e o bucketing por dia (`DATE(...)`/`::date`) extraiam o **dia local** correto. Colunas de **calendário puro** (sem hora/fuso) permanecem `date`: `projeto.inicio_data`, `projeto.previsao_fim_data`, `demanda.previsao_fim_data`, `dia_nao_util.dia_data`
6. **Sem DEFAULT** em nenhuma coluna — a aplicação sempre fornece todos os valores explicitamente
7. **Sem aliases abreviados** em queries — usar nome completo da tabela ou alias descritivo (`demanda_filho`, não `d`)
8. **Parâmetros nomeados** `:nome` com objeto (Knex) — nunca `?` posicional, nunca interpolação de string
9. **INSERT sempre com SELECT** — nunca `VALUES`: `INSERT INTO tabela (...) SELECT :campo1, :campo2 RETURNING ...`
10. **Hierarquias e grafos** via CTEs recursivos do PostgreSQL
11. **Soft delete** via `executarSoftDelete()` do BaseRepository — nunca DELETE físico. O caminho de volta é `PATCH /<recurso>/:id/restaurar` (gestor): o repositório faz `UPDATE ... SET is_deleted = false, deleted_date = NULL ... WHERE id = :id AND is_deleted = true RETURNING ...`; a **única leitura com `is_deleted = true`** é `recuperarExcluid[oa]()`, usada pela service para validar unicidade (nome/código/login ativos) e dependências (demanda ou projeto pai ativo) antes de restaurar. Restaurar **não é em cascata** (uma demanda não reativa filhos). Disponível em atividade, projeto, usuário, tag, dia não útil e demanda; o frontend o usa no "Desfazer" do toast de exclusão (6 s)
12. **Objetos genéricos de banco** (funções/triggers de infraestrutura) em **inglês** — `fn_set_updated_date()`, `trg_usuario_updated_date` ✅; `fn_atualizar_updated_date()` ❌ (idioma misto em mecanismo genérico, §16 #12). Apenas tabelas e colunas de negócio são em português
13. **Enums sempre como tabela de referência** — toda coluna de domínio fechado é `INTEGER` FK para uma tabela `tipo_<tabela>_<complemento?>` (com `codigo` + `descricao`), **nunca** `VARCHAR + CHECK` nem tipo `ENUM` nativo. O enum TypeScript de `shared/` espelha os `codigo`; o repositório traduz `codigo ⇄ id` no SQL (ver §5.4)

### 9.3 Paginação Padrão

Query params sempre nomeados assim: `pagina`, `itensPorPagina`, `ordenarPor`, `direcao`

**`allRows` — ignorar a paginação (padrão de todo o sistema):** todo DTO de filtro de uma listagem
paginada expõe também um campo opcional `allRows?: boolean`. Quando `allRows = true`, o repositório
**omite `LIMIT`/`OFFSET`** e devolve **todos** os registros que casam com os filtros, e o service
preenche o `PaginatedResult<T>` de forma coerente — `totalItens = itensPorPagina = itens.length`,
`paginaAtual = totalPaginas = 1`. A **estrutura da resposta `PaginatedResult<T>` não muda**: quem
consome continua lendo apenas `itens`. O comportamento sem a flag (ou com `allRows = false`)
permanece idêntico à paginação normal.

- **Nome em inglês** (§4): `allRows` é conceito técnico genérico (existiria em qualquer software) —
  nunca `todasAsLinhas`.
- O campo vive no DTO de filtro em `shared/` (`UsuarioListarDto`, `ProjetoListarDto`,
  `AtividadeListarDto`, `ExecucaoListarDto`, `DemandaListarDto`, …). Como todo query param chega
  como **string**, o campo usa o mesmo `@Transform` de boolean de `DemandaListarDto.isEstrutural`
  (converte `'true'`/`'false'`), senão `@IsBoolean()` rejeitaria a query:

  ```typescript
  @IsOptional()
  @IsBoolean()
  @Transform(({ value }) => {
    if (value === 'true') return true;
    if (value === 'false') return false;
    return value;
  })
  allRows?: boolean;
  ```
- Aplica-se **apenas** a listagens que retornam `PaginatedResult<T>`. Listagens que **já** devolvem
  todos os registros sem paginação (`tag.listar`, `demanda.listarAtribuidas`/`listarDescendentes`,
  `recuperarArvore`, `recuperarGrafo`, …) **não** recebem `allRows` — elas já são "allRows" por
  natureza.
- O frontend decide quando enviar `allRows: true` (ex.: selects de múltipla escolha, exportações,
  relatórios) — em vez de forçar um `itensPorPagina` artificialmente alto.

### 9.4 Configuração de Ambiente (.env)

```env
# Banco de dados
DB_HOST=localhost
DB_PORT=5433
DB_NOME=project20
DB_USUARIO=postgres
DB_SENHA=postgres

# JWT
JWT_SECRETO=troque-em-producao
JWT_EXPIRACAO=8h

# Regras de negócio
INTERVALO_MINIMO_MINUTOS=15

# Anthropic
ANTHROPIC_API_KEY=sk-ant-...
ANTHROPIC_MODELO=claude-sonnet-4-6
ANTHROPIC_MAXIMO_TOKENS=1024

# Aplicação
APP_PORTA=3000
APP_AMBIENTE=development
```

### 9.5 Migrations

Cada migration é um **arquivo `.sql` puro** em `backend/src/database/migrations/`, nomeado
`NNNN - Nome descritivo.sql` — prefixo inteiro sequencial de 4 dígitos (ordem de execução) +
`" - "` + frase legível em português com inicial maiúscula. O Knex continua orquestrando
`db:migrate`/`db:rollback` via um `Knex.MigrationSource` customizado (`sql-migration-source.ts`),
registrado em `knexfile.ts` (CLI) e `database.provider.ts` (runtime). A tabela de controle
continua sendo a `knex_migrations` interna do Knex.

O arquivo tem duas seções, cada marcador sozinho na linha: `-- UP` (obrigatória) e `-- DOWN`
(obrigatória, salvo justificativa em comentário no arquivo). A próxima migration nova começa em
`0028`.

```sql
-- UP

CREATE TABLE exemplo_tabela (
  id            SERIAL      PRIMARY KEY,
  created_date  TIMESTAMPTZ NOT NULL,
  updated_date  TIMESTAMPTZ NOT NULL,
  is_deleted    BOOLEAN     NOT NULL,
  deleted_date  TIMESTAMPTZ,

  nome          VARCHAR(255) NOT NULL
);

CREATE TRIGGER trg_exemplo_tabela_updated_date
  BEFORE UPDATE ON exemplo_tabela
  FOR EACH ROW EXECUTE FUNCTION fn_set_updated_date();

-- DOWN

DROP TRIGGER IF EXISTS trg_exemplo_tabela_updated_date ON exemplo_tabela;
DROP TABLE IF EXISTS exemplo_tabela CASCADE;
```

**Transação automática via Knex — nunca escrita no `.sql`.** O Knex abre uma transação por
migration antes de invocar `up`/`down`; se qualquer instrução do bloco falhar, ele emite `ROLLBACK`
sozinho (tudo ou nada). Por isso o arquivo **nunca** contém `BEGIN`/`COMMIT`/`ROLLBACK` — um
`COMMIT` manual encerraria a transação que o Knex acredita estar aberta e quebraria a garantia.
Única exceção: instruções proibidas dentro de transação (ex.: `CREATE INDEX CONCURRENTLY`) sinalizam
com `-- NO TRANSACTION` logo após o marcador, e o `SqlMigrationSource` desabilita a transação só
naquela migration.

**Exceção de valores literais (só dentro de `migrations/`).** Como migration não recebe input de
usuário, os valores (nomes de tag, feriados, códigos de enum) são **literais SQL** escritos direto
no arquivo (`'Backend'`, `'#3b82f6'`, escapando `'` como `''`) — a única exceção à regra de
parâmetros nomeados (§9.2 #8). O runtime (repositórios) continua 100% `:nomeParametro`. Todas as
demais regras SQL (§9.1/§9.2) valem sem afrouxamento.

---

## 10. Validações

### Camada 1 — Estrutural (class-validator no DTO)

Valida formato, tipo, obrigatoriedade e tamanhos. Configurado globalmente no `main.ts`:

```typescript
app.useGlobalPipes(new ValidationPipe({
  whitelist: true,             // remove campos não declarados no DTO
  forbidNonWhitelisted: true,  // rejeita campos desconhecidos
  transform: true,             // converte tipos automaticamente
}));
```

Uso nos DTOs:

```typescript
export class UsuarioCriarDto {
  @Transform(({ value }) => value?.toLowerCase().trim())
  @IsString()
  @MinLength(4)
  login: string;

  @IsString()
  @MinLength(8)
  senhaNaoEncriptada: string;

  @IsString()
  @IsNotEmpty()
  @MinLength(3)
  nomeCompleto: string;

  @IsEnum(UsuarioTipoEnum)
  tipo: UsuarioTipoEnum;
}
```

#### Caracteres proibidos em nomes e descrição de execução

Os **nomes** de projeto, demanda, atividade e tag e a **descrição de execução** não aceitam os
caracteres `` '  "  `  ~  ^  \  ´ `` (aspas simples, aspas duplas, crase, til, circunflexo, barra
invertida e acento agudo) — regra de **higiene de dados** (evita ruído em SQL/JSON/markdown e na exibição; a
defesa contra SQL injection continua sendo os parâmetros nomeados). A rejeição é **autoritativa no
backend** e **espelhada no frontend** para feedback imediato.

**Fonte única:** o conjunto de caracteres (regex) e a mensagem vivem em um só lugar no `shared` —
`shared/src/validators/caracteres-proibidos.validator.ts` — exportando `REGEX_SEM_CARACTERES_PROIBIDOS`
e `MENSAGEM_CARACTERES_PROIBIDOS` (constantes puras, sem `class-validator`, pois o `shared` também é
consumido pelo frontend). **Nunca** redeclarar a regex por DTO ou no frontend. A pasta `validators/`
é inglês (conceito arquitetural); os identificadores do conteúdo são português de negócio.

```typescript
// no DTO de entrada (shared/src/dtos/...) — @IsOptional antes, em campos opcionais
@Matches(REGEX_SEM_CARACTERES_PROIBIDOS, { message: MENSAGEM_CARACTERES_PROIBIDOS })
nome: string; // (ou descricao)
```

DTOs de entrada cobertos: `ProjetoCriarDto`/`ProjetoAlterarDto`, `DemandaCriarDto`/`DemandaAlterarDto`,
`AtividadeCriarDto`/`AtividadeAlterarDto`, `TagCriarDto`/`TagAlterarDto` (campo `nome`) e
`ExecucaoIniciarDto`/`ExecucaoEncerrarDto`/`ExecucaoRegistrarDto`/`ExecucaoAlterarDto` (campo
`descricao`). DTOs internos (`*InternoAlterarDto`) e de saída não recebem `@Matches`. No frontend,
`Validators.pattern(REGEX_SEM_CARACTERES_PROIBIDOS)` espelha a regra nos Reactive Forms. Cor, código
de projeto, descrições de demanda, anotações e login/senha estão **fora** do
escopo desta regra.

### Camada 2 — Negócio (Service)

Regras que exigem consulta ao banco ou lógica de domínio:

- Login duplicado → `BusinessException('Login já está em uso')`
- Ciclo no grafo de demandas → `BusinessException('Essa conexão criaria um ciclo no grafo')`
- Execução já encerrada → `BusinessException('Execução já foi encerrada')`
- Desenvolvedor sem acesso ao projeto → `UnauthorizedAccessException()`

### Formato de Erro Padronizado

```json
{
  "sucesso": false,
  "dados": null,
  "mensagem": "Dados inválidos",
  "erros": [
    "login: deve ter no mínimo 4 caracteres",
    "tipo: valor inválido"
  ]
}
```

---

## 11. Autenticação e Autorização

- **JWT** com Passport.js — token gerado no login, válido por `JWT_EXPIRACAO`
- **Guard global** `JwtAuthGuard` aplicado em toda a aplicação via `APP_GUARD`
- **`@Public()`** — decorator para rotas sem autenticação (somente login)
- **`@GestorOnly()`** — decorator que restringe a rota a quem tem permissão de gestor (`temPermissaoDeGestor`, em `@project20/shared`; hoje, o tipo GESTOR)
- **`@ActiveUser()`** — injeta o payload do JWT decodificado no parâmetro do método

---

## 12. Módulos do Sistema

| Módulo | Responsabilidade Principal |
|---|---|
| `autenticacao` | Login e geração de JWT |
| `usuario` | CRUD de usuários, troca de senha (o pad é do módulo `anotacao`; `PUT /usuario/:id` é só de gestor e administrador, nem o desenvolvedor altera o próprio perfil) |
| `projeto` | CRUD de projetos — apenas gestor cria. `GET /projeto/volume?ano&mes` (`@GestorOnly`, task 197): por projeto, os minutos das execuções **encerradas** do mês (pelo dia de `inicio_data` no fuso do sistema, o critério do relatório) e o `volumeEsperadoHorasMes`; declarada antes de `:id`. `GET /projeto/volume/anual?ano` (`@GestorOnly`, task 199): o mesmo critério, mês a mês (12 posições por projeto) |
| `demanda` | CRUD, hierarquia, grafo force-directed (D3), tags, atribuições |
| `atividade` | CRUD de atividades vinculadas a demandas, tags, controle de status e **prioridade** (task 142: `prioridade` opcional na criação e na alteração, INDEFINIDA quando não vem; os DTOs de saída devolvem o objeto `{ codigo, descricao, ordem, cor }`; a listagem ordena por `ordem` e depois pela ordem de antes) |
| `atividade-prioridade` | `GET /atividade-prioridade` (qualquer usuário autenticado, da mais para a menos urgente) e `PATCH /atividade-prioridade/:codigo` (`@AdministradorOnly`, só `cor` `#rrggbb`, gravada em minúsculas; `codigo`, `descricao` e `ordem` são fixos) |
| `execucao` | Iniciar e encerrar execuções, histórico por atividade. O **gestor** também pode **registrar manualmente** uma execução já encerrada (`@GestorOnly POST /execucao/registro`), informando início e fim para o dono da atividade (valida datas e sobreposição). A **edição** de execução (`PUT /execucao/:id`) altera `descricao`, `inicio_data` e `fim_data`. Um **job interno de auto-stop** (cron às 23:59:59 no fuso `APP_TIMEZONE`) encerra automaticamente todas as execuções abertas na virada do dia |
| `ponto` | Resumo de ponto em três modos: **diário** (`GET /ponto/diario`), **mensal** (`GET /ponto/mensal`) e **todos hoje** (`GET /ponto/todos`, `@GestorOnly`). Calcula horas trabalhadas, intervalos e comparativo com meta; a meta é ponderada por **fração de dia** (1 dia útil, 0.5 meio período, 0 não útil/fim de semana) |
| `calendario` | Gestão de dias não úteis (feriados, recessos) |
| `anotacao` | Pad do usuário em **cinco seções** de Markdown (quem não tem nenhuma, por ter entrado por SQL ou script em vez do cadastro, ganha as cinco vazias na primeira leitura ou anotação, em vez de 404; usuário inexistente ou excluído continua 404) (`GET /anotacao`, `PUT /anotacao/:usuarioId/:tipo`, `PATCH .../trecho`, `POST .../anexo`, `POST /anotacao/:usuarioId/feito`, `POST /anotacao/:usuarioId/mover`). Alterar a seção inteira exige o `updatedDate` lido (senão 409 `ConflictException`); trocar trecho e mover exigem que o trecho apareça **uma vez** (senão 400). Mover é atômico (as duas seções ou nenhuma); na tela do pad, botão direito sobre um trecho selecionado → "Enviar para" outra seção (Desfazer de 7 s). "Feito" escreve debaixo de `## dd/MM` do dia (fuso `APP_TIMEZONE`). O dono usa o próprio pad; gestor e administrador, o dos **desenvolvedores** (e o próprio), nunca o de outro gestor ou administrador (403; task 195) |
| `ia` | **Camada única de acesso à IA** (só duas rotas de leitura: `GET /ia/estado`, de administrador, para a tela de configurações, e `GET /ia/disponibilidade`, de **qualquer usuário autenticado**, que devolve só o `EstadoIaEnum` para o chat e, depois, o fallback): `IaService.gerar/transmitir` recebem o **nível** (`NivelIaEnum`: rápido, padrão, analítico), nunca o modelo; o modelo (e o esforço, só no analítico) vêm da `configuracao_ia` ativa a cada chamada. Provedor atrás da interface `IaProvedor`: `AnthropicProvedor` (`@anthropic-ai/sdk`), `GoogleProvedor` (`@google/genai`, Gemini) e `OpenAiProvedor` (`openai`, Chat Completions), com o `IaModule` como único importador dos SDKs; cada provedor traduz o contrato neutro (mensagens, ferramentas, esforço, tokens sem o cache contado duas vezes) e o erro do SDK pelo status HTTP (`traduzirErroDeProvedor`). **Fallback (task 203):** a configuração ativa define uma cadeia (provedor padrão + até 2 fallbacks, em ordem); a chamada que falha (`INDISPONIVEL`, `LIMITE` ou `CONFIGURACAO`) segue para o próximo com os modelos dele, o provedor sem chave é pulado, e se todos falham devolve a falha do primeiro provedor chamado (o padrão, quando tem chave; provedor pulado não conta como falha). No streaming, depois que um trecho já foi ao usuário não há fallback (repetiria a resposta). `FORA_DO_AR` só quando nenhum provedor da cadeia tem chave ou a cadeia inteira cai (com a detecção automática). O contrato já carrega ferramentas e blocos de ferramenta (uso no bloco 5). O estado `FORA_DO_AR` por falha do provedor só vale com a **detecção automática** ligada na configuração (desligada, só o desligamento manual troca as telas); o login leva ao chat com a IA no ar e a `/atividade` sem ela (task 157). Falhas viram `IaException` (`DESLIGADA`, `INDISPONIVEL`, `LIMITE`, `CONFIGURACAO`), nunca o erro do SDK; `traduzirFalhaDeIa` as converte em `BusinessException` para quem já tem contrato HTTP (assistente de descrição e revisão do relatório, nível padrão). `ia_desligada` recusa antes de qualquer requisição externa. Estado em memória (`EstadoIaEnum`: `NO_AR`, `FORA_DO_AR`, `DESLIGADA`) via `obterEstado()`. As chaves vêm de `ANTHROPIC_API_KEY`, `GOOGLE_API_KEY` e `OPENAI_API_KEY` (opcionais; sem a chave o provedor é pulado) |
| `chat` | **Conversa do dia com a IA** (qualquer usuário autenticado, sempre o próprio chat): `POST /chat/mensagem` (resposta `text/event-stream` sobre `POST`, porque `EventSource` só faz `GET` e não envia o cabeçalho de autorização; eventos `trecho`, `ferramenta` (`EXECUTANDO`, `CONCLUIDA`, `ERRO`), `proposta` e, no fim, `fim` com a mensagem gravada ou `erro`; o `nivel` da mensagem da IA é o **maior nível usado no turno** (task 188: `RAPIDO < PADRAO < ANALITICO`, contando as ferramentas que chamam a IA por baixo, coletadas num `TurnoIa` aberto pelo chat e lido pelo `IaService`; `modelo` é o da última chamada desse nível e os tokens da mensagem somam todas as chamadas do turno; a nomeação da conversa e as sugestões ficam fora da conta); depois do `fim`, no chat, o evento `sugestoes` com de 2 a 4 respostas curtas sugeridas por uma chamada rápida, nunca gravadas), `POST /chat/retomada` (task 158: depois de uma queda da IA, descarta as propostas pendentes obsoletas e a IA lê o que o usuário mudou à mão, pela ferramenta `consultar_mudancas_da_queda`, e continua a conversa do dia; a instrução não vira mensagem; 409 sem conversa hoje, com a IA desligada ou ainda respondendo), `POST /chat/bom-dia` (task 147: o bom dia proativo, mesmo formato de `mensagem`, só vale se a conversa de hoje ainda não tem mensagem da IA, senão 409; a instrução de abertura, com hora, dia e dia útil anterior, vai ao modelo como a primeira mensagem do usuário **sem ser gravada como mensagem do chat** e fica no conteúdo bruto da resposta, para as mensagens seguintes do dia terem o mesmo contexto; falha não grava mensagem do sistema), `GET /chat/hoje` (conversa do dia, sem o conteúdo bruto), `GET /chat/conversas` (as conversas do usuário, uma por dia, da mais recente para a mais antiga, até 100, por agregação por `conversa_id` só do contexto `CHAT`: dia, nome da conversa (sempre texto: o do usuário, o da IA ou o padrão) com `tituloEditado`, trecho da primeira mensagem, total e última data), `GET /chat/conversa/:data` (a conversa de qualquer dia `yyyy-mm-dd` do próprio usuário, mesmo formato de `hoje`, mais o nome da conversa; o dono vem sempre do token), `PUT /chat/conversa/:data/titulo` (task 192: o usuário renomeia a conversa de um dia dele, corpo `{ titulo }` de até 120 caracteres; em branco volta ao padrão; 404 sem mensagens do dono) e `GET /chat/busca?texto=&inicio=&fim=` (só mensagens do próprio usuário). **Fluxo:** a mensagem do usuário é gravada **antes** de chamar a IA; o contexto são as últimas 40 mensagens do dia; chamada no nível **rápido** com o prompt `CONVERSA` ativo e as ferramentas que o usuário pode usar, com laço de ferramentas de no máximo 8 voltas (tokens somados, o texto de cada volta vem separado do anterior por um parágrafo em branco, ferramenta de proposta emite o evento `proposta`); a mensagem da IA guarda nível, modelo, tokens, `propostas_ids` (todas as propostas do turno, na ordem em que nasceram; `proposta_id` guarda a primeira e basta nas mensagens anteriores à task 225, lidas como lista de um) e, em `conteudo_bruto`, as **trocas do turno** (chamadas e resultados de ferramenta) para remontar a conversa. Falha no meio vira o evento `erro` (mensagem traduzida de `IaException`, ou genérica, sem vazar detalhe), uma mensagem `SISTEMA` na conversa e as propostas criadas no turno são recusadas. IA **desligada** responde 409 antes de gravar; uma mensagem por conversa por vez (409 no segundo envio); cliente que fecha a conexão não interrompe a geração. `OpenSearch`: um documento por mensagem, gravado uma vez e nunca reescrito; o `ChatService` depende só do contrato `ArmazenamentoDeChat` (`gravar`, `listarConversa`, `listarConversas`, `gravarTitulo({ conversaId, usuarioId, titulo, editado })`, `listarTitulos` (devolve `{ titulo, editado }` por conversa), `buscar`; mensagens sem exclusão nem alteração) e `CHAT_ARMAZENAMENTO` escolhe a implementação (task 162): `ChatMensagemOpenSearchRepository` (padrão, único arquivo que importa o cliente do OpenSearch) `ChatMensagemElasticsearchRepository` (produção de verdade) ou `ChatMensagemPostgresRepository` (provisório; busca por `tsvector` em português com `unaccent`, mesma ordem, filtros e limites). OpenSearch e Elasticsearch compartilham a lógica em `ChatMensagemIndiceRepository` (mesmas consultas e mapeamentos de `chat-consultas.ts`; cada um só fala com o seu cliente); só o armazenamento escolhido é instanciado, e valor desconhecido derruba a subida. **Nome da conversa (task 192):** sem nome gravado vale o padrão `nomePadraoDaConversa`, "Chat do dia 19 de outubro de 2026" (tirado da data do `conversaId`, nunca gravado). A cada mensagem do usuário no chat (o check-in não) a service reavalia o nome com uma chamada rápida (instrução interna `INSTRUCOES_TITULO`, não editável) que recebe o nome atual e só as últimas 8 mensagens, cada uma cortada em 300 caracteres: a IA devolve o nome atual se ainda serve, o resultado é limpo por `limparTitulo` (60 caracteres) e só uma mudança é gravada no índice `chat-conversa` (um documento por conversa, id = `conversaId`, com `titulo_editado`). **O nome dado pelo usuário vale mais**: marcado `editado`, a IA nem é chamada para nomear essa conversa; salvar em branco apaga o nome gravado, desmarca `editado` e a renomeação automática volta. Se o usuário renomeia enquanto a IA pensa, o nome dele vence (a service relê `editado` antes de gravar). Falhar ao nomear nunca atrapalha o chat. O índice é criado de forma idempotente, com o texto analisado em português **sem acento** (`brazilian` com `asciifolding`). `conversaId` é `<usuarioId>-<yyyy-mm-dd>` no fuso `APP_TIMEZONE`. OpenSearch fora do ar não derruba o backend: o repository responde `BusinessException` clara. Variáveis: `CHAT_ARMAZENAMENTO` (`opensearch` padrão ou `postgres`), `OPENSEARCH_URL` (obrigatória só com `opensearch`), `OPENSEARCH_USUARIO`/`OPENSEARCH_SENHA` (opcionais), `ELASTICSEARCH_URL` (obrigatória só com `elasticsearch`) e `ELASTICSEARCH_API_KEY` ou `ELASTICSEARCH_USUARIO`/`ELASTICSEARCH_SENHA`. **Dúvidas de programação (task 191):** cada mensagem do chat leva um **assunto** (`AssuntoChatEnum`: `SISTEMA` ou `CODIGO`; campo `assunto` anulável nos três armazenamentos, `null` lido como `SISTEMA`; o índice que já existe ganha a propriedade `keyword` ao subir). Como as mensagens nunca são reescritas, o assunto é decidido **antes** de gravar a pergunta: com `duvidasCodigo` ligado e contexto `CHAT`, uma chamada no nível rápido, sem ferramentas e com teto de 10 tokens (`INSTRUCOES_DE_ASSUNTO`, em `domain/assunto-do-chat.ts`), vendo também as últimas mensagens, classifica a pergunta; a pergunta e a resposta do turno gravam o mesmo assunto. Falha da classificação (ou resposta que não é um assunto) usa o assunto da última mensagem marcada do dia, ou `SISTEMA`; com a flag desligada não há chamada. As instruções da conversa são o prompt `CONVERSA` mais o prompt ativo `DUVIDA_CODIGO` (ligado) ou uma instrução fixa que recusa com educação a pergunta de programação que não é sobre o Project (desligado); as ferramentas valem nos dois casos, e o check-in não classifica nem é marcado. O contexto enviado ao modelo segue `modoContextoChat`: `MISTURADO` manda as últimas `JANELA_DE_MENSAGENS` do dia; `SEPARADO` manda só as do assunto da pergunta atual (sem marca conta como `SISTEMA`), e então a janela; a retomada segue o mesmo modo, no assunto da última mensagem marcada. `MAXIMO_TOKENS_DO_CHAT` é 4096 **Conversas dos desenvolvedores para o gestor (task 201):** o módulo registra as ferramentas `listar_conversas_do_desenvolvedor`, `consultar_conversa_do_desenvolvedor` e `buscar_nas_conversas_do_desenvolvedor` (só gestor e administrador; `ChatDesenvolvedorService`), que leem o chat de um **desenvolvedor** (nunca o de outro gestor ou administrador, como no pad, task 195), só o contexto `CHAT` (o check-in e os avisos de falha ficam de fora), com o texto cortado e sem tokens, modelo nem conteúdo bruto. |
| `checkin` | **Check-in do desenvolvedor** (qualquer usuário autenticado, sempre o próprio): `GET /checkin/situacao` (execução ativa com atividade, demanda e minutos, o **próximo check-in sorteado pelo backend** (`proximoCheckinData`, em memória por usuário, entre o mínimo e o máximo da configuração, recomeçando a cada execução nova ou volta da reunião) e se ele já `disparado`; o Project mostra a janelinha do check-in num diálogo central com a tela escurecida (task 161); suspensão, `checkin_minimo/maximo_minutos`, `duracao_recomendada_minutos`, `rigor_proporcional` e `acimaDoRecomendado`; sem execução ativa, `haCheckin` falso), `GET /checkin/suspensao` (estado da suspensão por reunião, em memória) e `POST /checkin/mensagem` (a conversa do check-in, consumida pela tela `/checkin`, a janela do check-in da task 151: layout próprio, sem menu nem barra superior, autenticada, `text/event-stream` no formato do chat; **409** sem execução em andamento, antes de qualquer evento). As mensagens moram na conversa do dia com `contexto` `CHECKIN` e **o chat e o check-in não se leem** (a tela do chat, o histórico, o bom dia e o nome da conversa só consideram `CHAT`; o contexto do modelo só traz as mensagens do próprio contexto). Usa o prompt `CHECKIN` no nível rápido mais um **contexto calculado no backend e não gravado** (execução, tempo, duração recomendada, rigor proporcional: acima do recomendado pede mais detalhe antes de descrever, abaixo vai direto à descrição, desligado não pede; nunca é trava; regra de que a narrativa crua fica na conversa e só a descrição formal segue para a execução), com as mesmas ferramentas do chat |
| `mensagem-direta` | **Chat entre colaboradores** (tasks 205 a 215; hoje o armazenamento (tasks 206 e 207), a service com as rotas (208), o tempo real (209) o popup no Project (210), o compositor (211), os avisos no Project (212) e o Project Desktop (213); o módulo está no `AppModule`): conversa um a um entre quaisquer usuários; `conversa_id` é `<menorId>-<maiorId>` (`montarConversaDiretaId`, no `shared`). O `ArmazenamentoDeMensagemDireta` (`gravar` idempotente pelo `mensagemId` UUID do cliente, `listarConversa` com cursor opaco por `created_date` e `mensagem_id`, `listarConversasDoUsuario`, `contarNaoLidas`, `buscar`, `listarTodasConversas` para a supervisão; mensagens sem exclusão nem alteração) é escolhido por `CHAT_ARMAZENAMENTO`, a mesma variável do chat da IA: `MensagemDiretaOpenSearchRepository` (padrão) e `MensagemDiretaElasticsearchRepository` (produção final) compartilham a lógica em `MensagemDiretaIndiceRepository` e o índice próprio `mensagem-direta` (nunca o `chat-mensagem`), e `MensagemDiretaPostgresRepository` (**provisório**, tabela `mensagem_direta` da migration `0051`, busca por `tsvector` em português sem acento pelas funções da `0038`; sai junto com a tabela quando a produção final usar o Elasticsearch) atende a produção de teste. As regras de validação das consultas e a montagem da página ficam em `domain/mensagem-direta-consultas.ts`, iguais para os três. Uma só suíte de contrato (`armazenamento-de-mensagem-direta.contrato.ts`) roda nas três: contra o serviço real com `CHAT_INTEGRACAO=1` (OpenSearch e Elasticsearch) e sempre no banco de teste (Postgres). O estado que muda (leitura, silêncio, preferências, auditoria da supervisão) fica no PostgreSQL (migration `0050`). **Service e rotas (task 208)**, em `/api/v1/mensagem-direta`, para qualquer usuário autenticado e sempre como a pessoa do token (o `usuarioId` da rota é a OUTRA pessoa e entra no DTO pela controller): `GET conversas` (nome, última mensagem, não lidas e silêncio; só conversas com mensagem), `GET conversa/:usuarioId` (página com `cursor` e `limite`, mais o `lidaAteDate` **da outra pessoa**, de onde sai o "Lida"; abrir não marca como lida), `POST mensagem` (idempotente pelo `mensagemId`, gravado em minúsculas; destinatário existe, ativo e diferente de quem envia; `contemCodigo` calculado no servidor; menções só dos dois participantes; referência a `DEMANDA`/`ATIVIDADE` que o desenvolvedor remetente vê), `PUT conversa/:usuarioId/leitura` (data da última mensagem vista, limitada ao agora e **nunca recua**: `GREATEST` no banco), `PUT conversa/:usuarioId/silencio`, `POST conversa/:usuarioId/digitando` (task 219: o "digitando…", evento efêmero `DIGITANDO` entregue só à outra pessoa, sem gravar nada; o cliente avisa a cada 3 s e a tela mostra por 5 s), `GET busca` (sempre nas conversas de quem busca) e `GET`/`PUT preferencia` (sem linha vale o padrão do `shared`). Estado em `MensagemDiretaLeituraRepository` e `MensagemDiretaPreferenciaRepository`; `UsuarioRepository.listarNomesPorIds` dá os nomes da lista. **Tempo real (task 209)**: `GET eventos` (`text/event-stream`, `fetch` com cabeçalho; abre com `ABERTURA` = quem está online, batimento a cada 25 s) entrega `MENSAGEM` (as duas pontas, uma vez; o reenvio não repete), `LEITURA`, `PRESENCA`, `SINCRONIZAR` (reler a conversa ou todas: a mensagem não coube no `NOTIFY` ou a escuta caiu e voltou) e `ENCERRANDO` (parada da API). A service nunca fala com o stream: publica no `PublicadorDeEventosDiretos`, escolhido por **`CHAT_EVENTOS`** — `memoria` (padrão, uma instância) ou `postgres` (`LISTEN`/`NOTIFY` no canal `mensagem_direta_eventos`, conexão de escuta dedicada que reconecta com espera crescente; carga acima de 7.500 bytes vira `SINCRONIZAR`). Presença compartilhada: cada instância publica o conjunto de usuários com stream aberto nela e todas guardam o último conjunto de cada instância por 75 s (`PresencaGlobal`); online é a união, e uma instância que cai deixa de contar sozinha. `ConversaDiretaResumoDto.online` vem daí. `enableShutdownHooks` no `main.ts`: ao parar, a instância envia `ENCERRANDO`, fecha os streams e sai da presença. **Popup no Project (task 210)**: `GET pessoas` (qualquer usuário autenticado: pessoas ativas, menos quem pergunta, com nome, tipo e `online`; `GET /usuario` é só do gestor). No front, `modules/mensagem-direta/`: `MensagemDiretaService` (HTTP, sem overlay nem toast global), `MensagemDiretaEventosService` (stream por `fetch` com cabeçalho, reconexão de 1 a 30 s com sorteio, vigia de 70 s sem dado, 401 encerra), `MensagemDiretaEstadoService` (Signals: conversas, online, conversa aberta, envio otimista com reenvio pelo mesmo `mensagemId`, leitura da conversa à vista, recuperação ao reconectar e no `SINCRONIZAR`) e o popup (`app-mensagem-direta-popup`, 392×640, canto inferior direito, no layout; lista com busca, conversa, nova conversa; telas carregadas por `@defer`). O botão do topbar abre e fecha e mostra o total de não lidas. A lógica pura está em `utils/mensagem-direta.util.ts`. **Compositor (task 211)**: `GET referencias?texto=` (até 8 demandas e atividades cujo **nome** contém o texto, mínimo de 2 letras; desenvolvedor só no que vê, gestor e administrador em tudo; `ILIKE` com `%`, `_` e `\\` escapados) e `GET referencia/:tipo/:id` (o cartão **para quem está olhando**: `acessivel: false` e nenhum dado quando não há acesso ou não existe). A regra de acesso é uma só, `resolverReferencia` da service, usada pelo envio, pela busca e pelo cartão. No front, `app-mensagem-direta-compositor` (Enter envia, botão e colagem de código, `@` com as pessoas da conversa, `#` com demandas e atividades, só as menções e referências que ainda estão no texto vão no envio) e `app-mensagem-direta-referencia-cartao` (carregando, link para `/atividade/:id` ou `/demanda?projetoId=`, bloqueado, erro; cache por sessão). Lógica pura em `utils/compositor.util.ts`. **Project Desktop (task 213, versão 1.1.0 do executável)**: o atalho global (preferência `atalhoGlobal`, relida a cada 60 s) abre o popup interno com o Project à vista, abre a janela de chat (`/chat-popup`, 420×640, sem moldura, sempre por cima) com o Project minimizado ou oculto e a fecha se já aberta; a área de transferência é lida só no atalho e entregue à página, que decide se é código (`pareceCodigo`). Com o Project oculto, mensagem nova vira notificação do sistema (o Desktop avisa a página de que a janela sumiu, pois `visibilityState` não muda) e o clique abre a conversa; a janela de chat não notifica a conversa que está mostrando. A ponte `window.projectDesktop` é só de funções nomeadas, com remetente e payload conferidos no `main`; lógica pura em `desktop/src/politica-do-chat.ts`. **Responder (task 220)**: `POST mensagem` aceita `respondeAMensagemId` (UUID); a service lê a original com `armazenamento.recuperarMensagem({ conversaId, mensagemId })` (devolve a mensagem **só se for desta conversa**; senão `null`), recusa a que não existe, é de outra conversa ou é do sistema e monta `respondeA { mensagemId, autorUsuarioId, trecho }` no servidor com `trechoDaMensagemDireta` (`shared`: texto simples, código como `[código]`, até 200 caracteres); o cliente nunca envia o trecho. O documento é imutável: `responde_a_mensagem_id`, `responde_a_autor_usuario_id` e `responde_a_trecho` entram só na gravação (índices: campos novos; Postgres provisório: migration `0063`). No front, ação Responder no balão, barra "Respondendo a…" no compositor (Esc cancela) e citação clicável que rola até a original e a realça (carrega até 5 páginas mais antigas ao procurá-la); o campo, o botão de código e o de enviar vivem numa só barra com aparência de campo. Supervisão é a task 214. Regras do autor: gestor e administrador leem só conversas entre desenvolvedores; conversa que envolve gestor ou administrador é privada. Modelagem: `docs/specs/backlog/chat-colaboradores/modelagem.md`. |
| `ferramenta-ia` | **Ferramentas da IA** (sem rotas HTTP): contrato `FerramentaIa` (nome, descrição, tipo `LEITURA` ou `PROPOSTA`, permissão por tipo de usuário, classe de entrada validada com `class-validator` e `executar(entrada, usuário)`), e o `FerramentaIaRegistro`, onde cada módulo registra as suas na subida. A ferramenta roda **em nome do usuário** (recebe o `JwtPayload` e chama as mesmas services, com as mesmas permissões: princípio "a IA é só mais um cliente da API"). O esquema JSON mostrado ao modelo é **gerado da classe de entrada** (`gerarEsquemaDeClasse`; descrições com `@DescricaoCampoIa`), sem duplicar. `listarParaUsuario` devolve só o que o tipo de usuário pode usar; `executar` valida a entrada e **nunca lança**: nome desconhecido, falta de permissão, entrada inválida e falha da ferramenta voltam ao modelo como resultado de erro (erro interno vira texto genérico, sem vazar detalhe), e o resultado é cortado em 20 mil caracteres. `FerramentaPropostaIa` é a base das ferramentas de proposta: só enxerga a `PropostaIaService` e nunca chama uma service de domínio; entrega a proposta a `criarComAutonomia`, que a deixa pendente ou, no nível "Faz e avisa" (task 228), a confirma na hora em nome do usuário do token, e o resultado devolvido ao modelo diz "Feito" ou "Proposta criada" (o registro acrescenta à descrição de toda ferramenta de proposta uma nota para o modelo ler esse resultado). **Sem exclusão:** o registro recusa nome que sugira excluir, apagar, remover, deletar, eliminar ou descartar, **salvo a exceção nomeada da task 230** (`EXCECOES_DE_EXCLUSAO_DA_IA` em `ferramenta-ia/domain/sem-exclusao.ts`: uma lista fixa e fechada com as ferramentas `propor_desconectar_demanda` e `propor_excluir_atividade` e os tipos `DESCONECTAR_DEMANDA` e `EXCLUIR_ATIVIDADE`; o teste quebra se ela crescer sem uma spec que o aprove). Exclusão continua soft delete e desfazível; nenhuma outra exclusão é permitida à IA (demanda, projeto, execução, tag). Primeira ferramenta: `consultar_data_e_hora` (leitura, qualquer usuário, fuso `APP_TIMEZONE`) e, registradas pelos módulos de negócio na subida (task 144), as de leitura do desenvolvedor `listar_minhas_atividades` (só as do token, em aberto por padrão, na ordem de prioridade, até 30, com o `demandaId`), `consultar_execucao_ativa`, `listar_minhas_execucoes_do_dia` e `listar_minhas_demandas` (as em que o usuário pode criar atividades), `consultar_pad` (task 146: só as seções pedidas do pad do token; em Feito, só o bloco do dia, hoje por padrão; seção cortada em 8000 caracteres) e, de **proposta** (task 145; só criam a proposta, com os nomes para o cartão), `propor_criar_atividade`, `propor_iniciar_execucao`, `propor_pausar_execucao`, `propor_anotar_pad`, `propor_descrever_execucao` (task 150: recebe o **relato** do desenvolvedor, que não vai para a execução; o sistema redige a descrição formal numa chamada à parte no **nível padrão** com o prompt `DESCRICAO_EXECUCAO` mais instruções de rigor, sem aspas nem caracteres proibidos, e devolve erro se o relato não tem trabalho; a proposta leva a escolha `CONTINUAR` ou `TROCAR` e a execução descrita) e, só com a flag **check-in inteligente** ligada (task 148; `FerramentaIa.habilitada()` esconde a ferramenta da lista e o registro a recusa se chamada), `propor_suspender_checkin` e `propor_retomar_checkin` (a mesma proposta `SUSPENDER_CHECKIN` com `acao` `SUSPENDER` ou `RETOMAR`). O estado de suspensão fica **em memória** no `CheckinSuspensaoService` (por usuário, acaba ao voltar ou à meia-noite do fuso, perdido ao reiniciar o backend) e é lido por `GET /checkin/suspensao` (o próprio usuário) (operação pontual `ANEXAR` ou `TROCAR` num trecho que aparece uma única vez, conferido na hora de propor; Pessoal só com `pedidoExplicito`). O executor `DESCREVER_EXECUCAO` **encerra** a execução ativa com a descrição formal e abre o trecho seguinte na mesma atividade ou na escolhida (recusa a proposta velha se a execução em andamento mudou; se abrir o trecho seguinte falhar, reabre a execução; desfazer exclui o trecho novo se ainda ativo e reabre a descrita com a descrição provisória de antes). O executor `ANOTAR_PAD` edita pelo `AnotacaoService` no pad do token (em Feito, debaixo do título de hoje), guarda o texto da seção antes e depois e **desfaz** restaurando o antes só se a seção ainda está como a anotação a deixou. Os executores `CRIAR_ATIVIDADE` (nasce planejada; desfazer só sem execuções), `INICIAR_EXECUCAO` (**pausa antes** a ativa, com a descrição provisória; se iniciar falhar, reabre a anterior; desfazer exclui a nova se ainda ativa e reabre a pausada) e `PAUSAR_EXECUCAO` (descrição da proposta, o caso do almoço, ou a provisória; desfazer reabre se não há outra ativa) chamam `AtividadeService`/`ExecucaoService` com o usuário do token e validam os dados com as classes do `shared` (campo desconhecido é recusado) |
| `proposta-ia` | **Propostas da IA** (a IA propõe e o usuário resolve; só roda sem confirmação o que o nível de autonomia da task 228 libera): `GET /proposta-ia/:id`, `POST /proposta-ia/:id/confirmar`, `/ajustar` (dados corrigidos pelo usuário; situação `AJUSTADA`), `/recusar` (situação `EXPIRADA`, sem executar) e `/desfazer` (só depois de confirmada **e até 30 minutos depois de resolvida**, `PRAZO_PARA_DESFAZER_PROPOSTA_MINUTOS`; passado o prazo a API recusa e o botão do cartão fica desativado, task 194). **Justificar o ponto (task 231):** `JUSTIFICAR_PONTO` (`propor_justificar_ponto`, ferramenta **só do gestor e do administrador**, invisível ao desenvolvedor; nível fixo `SEMPRE_PERGUNTA`, escudo no painel de autonomia). É a ação da tela de justificativas, para o ponto de **outra pessoa** (a ferramenta e o executor recusam o próprio gestor): a ferramenta confere já a pessoa, as horas dentro da jornada e que o dia ainda não tem justificativa; o `JustificarPontoExecutor` (módulo `ponto`) exige gestor e cria pela `PontoJustificativaService.criar` com o token, que segue dona das regras. Desfazer exclui (soft delete) pela `excluir`, só se a justificativa ainda existe e continua com o mesmo título, motivo e horas; fica obsoleta se o dia já ganhou justificativa à mão. **Desconectar demandas e excluir atividade sem execução (task 230):** as duas **únicas exclusões** que a IA propõe, por exceção nomeada ao "sem exclusão". `DESCONECTAR_DEMANDA` (`propor_desconectar_demanda`; só gestor; nível `FAZ_E_AVISA`; a ferramenta confere que a conexão existe no sentido pedido; o executor chama `DemandaService.excluirConexao` com o token e as demandas não mudam de lugar; desfazer recria a conexão por `criarConexao`, que recusa conexão repetida e ciclo) e `EXCLUIR_ATIVIDADE` (`propor_excluir_atividade`; dono da atividade e gestor; nível `PERGUNTA`; **a ferramenta recusa atividade com execução, com o motivo, e o modelo explica que a exclusão é pela tela**; o executor recusa de novo se a atividade ganhou execução entre a proposta e o clique; chama `AtividadeService.excluir` com o token, que passou a exigir gestor ou dono; desfazer usa `AtividadeService.restaurar`, que também confere gestor ou dono, só se a atividade continua excluída e sem execução nova). A rota `DELETE/PATCH` de atividade segue `@GestorOnly`. **Concluir demanda e mover atividade (task 229):** `CONCLUIR_DEMANDA` (`propor_concluir_demanda`; quem é da demanda e o gestor, pela `DemandaService.alterar` com `CONCLUIDA`; o cartão avisa quantas atividades seguem abertas e **elas não mudam**; desfazer volta o status de antes, só se a demanda ainda está concluída) e `MOVER_ATIVIDADE` (`propor_mover_atividade`; só o dono da atividade e o gestor; a mudança de demanda é a operação `AtividadeService.alterar` com `demandaId`, que confere dono ou gestor, destino existente e **nem concluído nem cancelado**, e acesso do desenvolvedor ao destino; as execuções pertencem à atividade e vão junto; desfazer devolve à origem, só se a atividade ainda está no destino). Os dois são nível `PERGUNTA`. **Autonomia (task 228):** cada proposta tem um nível, decidido pelo backend (nunca pelo modelo) por `nivelDaProposta` do `shared` a partir do tipo, dos dados e da configuração ativa: `FAZ_E_AVISA` (`PropostaIaService.criarComAutonomia` cria a proposta marcada `aplicadaPelaIa` e a confirma na hora pelo mesmo caminho do cartão: mesmo executor, mesmas permissões, mesmo desfazer de 30 minutos; se a ação falha, a proposta expira e o erro volta ao modelo, que avisa o usuário), `PERGUNTA` (pendente até o cartão) e `SEMPRE_PERGUNTA` (fixo, ignora a configuração: registrar e corrigir execução, criar projeto, qualquer ação em nome de outra pessoa — `usuarioId` dos dados diferente de quem confirma — e a seção Pessoal do pad). Sem a configuração (banco indisponível), a IA pergunta. Marcar a **própria** atividade como desenvolvida é um caso de `ALTERAR_ATIVIDADE` com nível próprio (a proposta guarda `atividadeUsuarioId`). O mapa regra → nível vive em `configuracao_ia.niveis_proposta` (só o administrador altera, na aba Autonomia; nulo ou regra faltando vale o padrão do `shared`, tabela "Nível por tipo" de `chat-propostas.spec.md`). A proposta que a IA executou sozinha aparece como a linha azul de aviso, com o ícone da IA e Desfazer, e num grupo a linha azul de cima separa o que ela já fez do que espera o usuário. `DemandaService.criarConexao` e `excluirConexao` recebem o usuário e recusam quem não é gestor, além do `@GestorOnly` da rota. **Em grupo (task 227):** `POST /proposta-ia/grupo/confirmar`, `/grupo/recusar` e `/grupo/desfazer` recebem `propostaIds` (de 1 a 20, sem repetir, todas do usuário: uma que não existe ou é de outro recusa o grupo inteiro antes de executar qualquer uma) e devolvem, por proposta, `RESOLVIDA`, `FALHOU` ou `BLOQUEADA`, com o motivo e a proposta como ficou. Confirmar trata as propostas na ordem em que nasceram, cada uma pela confirmação atômica de sempre; se uma falha, as que dependem dela (`idsDasPropostasDeQueDepende`: hoje o `projetoPropostaId` e o `demandaPaiPropostaId` do `CRIAR_DEMANDA`) ficam `BLOQUEADA` e as independentes seguem; recusar não tem dependência; desfazer vai na ordem inversa e para na primeira que recusar (as que sobram ficam `BLOQUEADA`). As rotas do grupo vêm antes das de `:id` no controller. Qualquer usuário autenticado, **só as próprias** (nem o administrador resolve a de outro: 403). Criar é interno (`PropostaIaService.criar`, usado pelas ferramentas da IA), sem rota. **Confirmação atômica:** `UPDATE ... WHERE status = PENDENTE RETURNING` antes do executor; quem perde a corrida recebe 409. Se o executor falha, a proposta volta a `PENDENTE` (compensação) e o motivo vai ao usuário. Executores por tipo (`ExecutorPropostaIa`, registrados no `ExecutorPropostaIaRegistro`) chamam a service do domínio com o usuário do token; tipo sem executor é erro claro, nunca executa. Proposta `PENDENTE` de dia anterior (fuso `APP_TIMEZONE`) expira ao ser lida |
| `prompt` | Prompts da IA **versionados**, **exclusivos de administrador** (leitura e escrita): `GET /prompt` (tipos com ativa e rascunho), `GET /prompt/:tipo/versoes` (histórico), `POST /prompt/:tipo/rascunho` (cria ou substitui o texto do rascunho; um por tipo), `POST /prompt/:tipo/rascunho/ativar`, `POST /prompt/:tipo/restaurar-padrao` (reativa a versão 1; o histórico fica) e `DELETE /prompt/:tipo/rascunho`, mais `POST /prompt/:tipo/testar` (task 140: o texto candidato e de 1 a 5 narrativas; cada narrativa roda duas vezes, com o prompt **ativo** e com o **candidato**, no nível do tipo definido em `NIVEL_DO_TIPO_DE_PROMPT` do `shared`, só texto, sem ferramentas, proposta nem gravação no chat, com `MAXIMO_TOKENS_DO_TESTE` e os tokens gastos na resposta; a falha de uma chamada vira o erro só daquela saída; IA desligada responde 409). Cada operação trava a linha do tipo numa transação (uma só ativa por tipo, sem índice único). `PromptService.obterAtivo(tipo)` serve os outros módulos, do cache em memória renovado ao ativar/restaurar |
| `plano` | **Plano do modo planejamento** (tasks 232 a 234; qualquer usuário autenticado, a regra de acesso é da `PlanoService`): `POST/GET /plano`, `GET/PUT/DELETE /plano/:id`, `PATCH /plano/:id/solo`, `/arquivo` e `/projeto`, `PUT /plano/:id/demanda`. Plano de projeto é visto e editado por quem tem acesso ao projeto; **solo** e **amplo** (sem projeto) só pelo criador, nem gestor nem administrador entram; o que a pessoa não vê é 404. A **descrição do cliente** só existe para gestor e administrador (`podeVerAbaDoPlano`, do `shared`): para o desenvolvedor nem vem na resposta, e ele não a grava. Gravar o documento exige a `versao` lida (comparada e gravada no mesmo `UPDATE`); versão mais nova no banco é **409**. Ligar demanda exige poder editá-la e que seja do projeto do plano; as abas vazias começam com o texto da demanda. Projeto ou demanda excluídos somem da leitura do plano (não há cascata). **Conversa do plano (task 234):** `GET /chat/plano/:planoId` (mensagens de todos que têm acesso, com o nome de cada autor) e `POST /chat/plano/:planoId/mensagem` (`text/event-stream`, os mesmos eventos do chat), no `ChatPlanoService`. A conversa é `plano-<id>` com contexto `PLANEJAMENTO` no `ArmazenamentoDeChat` (lida **sem filtro de dono**; fora das conversas do dia e da busca); duas pessoas não enviam ao mesmo tempo (409). A IA roda no **nível analítico** com o prompt `PLANEJAMENTO`, como escrever cada aba que a pessoa vê (`PLANO_DESCRICAO_TECNICA`, `PLANO_DESCRICAO_CLIENTE` só para gestor e administrador, `PLANO_DOCUMENTACAO`; todos editáveis só pelo administrador) e o plano com o documento e a versão **de agora**. Ferramentas do escopo `PLANEJAMENTO`: as de leitura do sistema, `consultar_plano`, `escrever_no_plano` (rascunho, com a versão; nunca a demanda) e `propor_alterar_trecho_do_plano` (proposta `ALTERAR_TRECHO_PLANO`, nível fixo `SEMPRE_PERGUNTA`); o chat de perguntas não vê as do plano. A alteração de trecho exige o trecho antigo **uma vez só** no texto da aba; o executor usa a versão de agora, **expira** a proposta se o trecho mudou (`PropostaObsoletaException`) e o desfazer recusa se o trecho novo foi editado depois. Quem pode editar o plano resolve a proposta (`podeResolver` do executor), mesmo a criada a pedido de outra pessoa. O custo de cada resposta é de quem enviou a mensagem. **Pontos em aberto (task 235):** `GET/POST /plano/:id/ponto` e `PATCH /plano/:id/ponto/:pontoId/situacao` (`RESOLVIDO` e `DECISAO` exigem o texto; `DISPENSADO` aceita o motivo; `ABERTO` reabre e apaga a resolução), com o mesmo acesso do plano; o rótulo é texto livre. Ferramentas do planejamento `anotar_ponto_em_aberto`, `resolver_ponto_do_plano` e `listar_pontos_do_plano`; a orientação de uso fica no código (`ORIENTACAO_DOS_PONTOS`) e os pontos abertos, com os ids, entram nas instruções de cada resposta. **Publicar (task 237):** `POST /plano/:id/publicacao` (`versao` lida, `abas`, `abasParaApagar`) grava os textos escolhidos pela `DemandaService.alterar` (valem as permissões de edição da demanda; o módulo `plano` não grava nas colunas dela) e marca `plano_demanda.publicacao_data`; a descrição do cliente só passa para gestor e administrador, texto vazio no plano só apaga o da demanda se a aba vier em `abasParaApagar` (`situacaoDaAbaNaPublicacao`, do `shared`), versão diferente da lida é **409**, e a resposta traz quantas alterações de trecho da IA ficaram pendentes (de fora). `GET /plano/demanda/:demandaId` devolve o plano de que a demanda nasceu entre os que a pessoa vê (o "Nasceu do plano" do detalhe). |
| `configuracao-ia` | Configuração da IA **versionada**, **exclusiva de administrador** (leitura e escrita; gestor e desenvolvedor levam 403): `GET /configuracao-ia` (ativa), `GET /configuracao-ia/versoes` (histórico paginado) e `POST /configuracao-ia` (grava a versão seguinte, serializada por lock consultivo; intervalo mínimo < máximo do check-in; **provedor e modelos** conferidos por `validarProvedoresDaConfiguracaoIa` do `shared`: todo provedor da cadeia tem os três modelos, todo modelo guardado é do provedor em que está pelo prefixo — `claude-*`, `gemini-*`/`gemma-*`, `gpt-*`/`chatgpt-*`/`o<n>` — sem provedor repetido e no máximo 2 fallbacks; a versão nova **copia** o `precos_modelo` da anterior). A única alteração no lugar de uma versão é o preço por modelo (`configuracao_ia.precos_modelo`, task 202), editado pela aba Custos na versão ativa, sob o mesmo lock. A ativa fica em cache em memória, renovado ao gravar; `ConfiguracaoIaService.obterAtiva()` serve os outros módulos. Leva o **provedor padrão**, a **ordem do fallback** (`fallbacks`, array de provedores) e o **trio de modelos de cada provedor** (`modelosProvedor`, mapa provedor → rápido/padrão/analítico): o mapa guarda também os provedores fora da cadeia, então trocar o padrão e voltar reaproveita o que foi digitado (task 203). Leva também o **nível de autonomia da IA por regra de proposta** (`niveisProposta`, task 228): mapa regra → `FAZ_E_AVISA` ou `PERGUNTA`, sempre completo na leitura (o que a versão não guardou vem com o padrão do `shared`); o `POST` sem o campo copia o da versão anterior, e chave que não se configura ou nível fixo é recusado. Leva também as flags das dúvidas de programação (task 190): `duvidasCodigo` ("só Project" ou "Project e código") e `modoContextoChat` (`ModoContextoChatEnum`: `MISTURADO` ou `SEPARADO`), ambas na tela de configuração (seção "Chat"); só gravam a configuração, quem as usa é o chat (task 191). O tipo de prompt `DUVIDA_CODIGO` (nível rápido) é editável e testável na aba Prompts como os demais |
| `ia-custo` | **Custo da IA** (tasks 201 e 202), **exclusivo de administrador**: `GET /ia-custo?ano&mes` (sem `mes`, o ano inteiro) devolve totais (mensagens, tokens de entrada/saída/cache, custo estimado em dólar), uso por modelo e uso por dia (mês) ou por mês (ano); `PUT /ia-custo/preco` define o preço de um modelo (dólar por milhão de tokens de entrada, saída e cache). **Não há tabela de uso:** os tokens vêm das mensagens do chat (`ArmazenamentoDeChat.somarTokens`, nos três armazenamentos; cada resposta da IA grava os seus, somando as chamadas das ferramentas do turno, task 188) e o preço fica em `configuracao_ia.precos_modelo`, alterado **na versão ativa, no lugar**. O custo de uma mensagem usa o preço do modelo gravado nela (o id datado que o provedor devolve conta no nome da configuração de que é prefixo); é uma estimativa, aproximada quando um turno mistura níveis. Modelo sem preço fica fora da soma e é contado em `modelosSemPreco`. O dia é o do fuso `APP_TIMEZONE`. Só o chat entra: relatório, assistente de descrição, nomeação e sugestões não têm onde gravar tokens e não aparecem. |
| `modelagem` | **Diagrama do banco** (tela Modelagem, ferramenta sem spec). **A organização é do gestor e vale mais que o banco; o banco só traz o visual.** `GET /modelagem` (**qualquer usuário autenticado**) devolve `ModelagemDiagramaDto` (`shared/src/dtos/modelagem/`): tabelas, colunas (tipo abreviado, `?` se aceita nulo), marcas PK/FK e referências sem FK, grupos, posições e avisos. É montado **ao vivo** do catálogo do PostgreSQL (`information_schema` e `pg_catalog`, `ModelagemCatalogoRepository`, em cache de 60 s) pela lógica pura `domain/modelagem.ts` (colunas `*_id` inteiras sem FK viram referência lógica pelo nome), junto com os grupos e as posições em **`modelagem_grupo` e `modelagem_tabela`** (migrations `0052` e `0053`; sempre lidos frescos). Uma tabela está **na modelagem** quando tem linha ativa em `modelagem_tabela` (sempre com grupo e posição). **Tabela do banco sem linha** (criada por migration, ou tirada da modelagem) **não herda grupo de ninguém**: aparece no **canto de baixo do desenho**, em "Fora da modelagem" (`grupoId` nulo, posição calculada e nunca guardada), com um aviso no painel; tabela guardada que sumiu do banco é ignorada (a linha fica). **Só gestor e administrador alteram** (`@GestorOnly`): `POST /modelagem/grupo` (cria; título e rótulo, rótulo único sem diferenciar maiúsculas; ordem no fim e cor menos usada da paleta de 0 a 6), `PUT /modelagem/grupo/:id` (renomeia), `DELETE /modelagem/grupo/:id` (soft delete; **só grupo vazio**, conferido pelo diagrama resolvido), `PUT /modelagem/tabela/:nome` (põe a tabela na modelagem, ou muda grupo e/ou posição x e y; campo ausente = manter o que está gravado agora; tabela de fora exige grupo e, sem posição, cai embaixo das do grupo; a tabela tem de existir no catálogo e o grupo, no banco) e `DELETE /modelagem/tabela/:nome` (**tira só do desenho**: soft delete da linha de `modelagem_tabela`, a tabela do banco nunca é tocada; idempotente). O que o banco não diz e que não é escolha de ninguém (colunas ocultas e referências sem FK de nome ambíguo) fica em `domain/modelagem.configuracao.ts`. Tempo real entre usuários (ver quem está na tela, mouses e mudanças ao vivo) é ideia futura. |
| `tag` | CRUD de tags — apenas gestor cria; o gestor atribui em qualquer demanda ou atividade e o desenvolvedor, nas atividades que pode alterar e nas demandas de que é membro |
| `assistente` | Auxílio de IA para refinamento de descrições já escritas pelo usuário |

---

## 13. Entidades e Campos

> Todos os modelos incluem os campos de BaseEntity: `id`, `createdDate`, `updatedDate`, `isDeleted`, `deletedDate`

### Usuario

| Coluna SQL | Tipo | Notas |
|---|---|---|
| `login` | VARCHAR UNIQUE | identificador de acesso |
| `senha_encriptada` | VARCHAR | bcrypt |
| `nome_completo` | VARCHAR | |
| `cargo_titulo` | VARCHAR | ex: "Desenvolvedor Sênior" |
| `horas_diarias_necessarias` | INTEGER | em horas (ex: 8) |
| `tipo_usuario_id` | INTEGER FK | → `tipo_usuario` (DESENVOLVEDOR, GESTOR, ADMINISTRADOR) |
| `tipo_usuario_status_id` | INTEGER FK | → `tipo_usuario_status` (ATIVO, INATIVO) |

### Projeto

| Coluna SQL | Tipo | Notas |
|---|---|---|
| `nome` | VARCHAR | |
| `codigo` | VARCHAR | referência curta, **auto-derivada do nome** no formulário (ex: "Sistema de Gestão" → "SISTEMA-DE-GESTAO"), permanecendo editável; o backend valida unicidade |
| `cor` | VARCHAR | hex, para identificação visual |
| `tipo_projeto_status_id` | INTEGER FK | → `tipo_projeto_status` (ATIVO, PAUSADO, CONCLUIDO, CANCELADO) |
| `inicio_data` | DATE \| NULL | |
| `previsao_fim_data` | DATE \| NULL | |
| `volume_esperado_horas_mes` | INTEGER \| NULL | volume de trabalho esperado, em horas por mês (task 197); nulo = não definido; `CHECK` ≥ 0; só o gestor edita |

> **Sem tabela `projeto_usuario`** — acesso a projeto é derivado de `demanda_usuario`

### Demanda

| Coluna SQL | Tipo | Notas |
|---|---|---|
| `projeto_id` | INTEGER FK | → projeto |
| `demanda_pai_id` | INTEGER FK \| NULL | → demanda (hierarquia recursiva) |
| `nome` | VARCHAR | |
| `descricao_tecnica` | TEXT \| NULL | Markdown |
| `descricao_cliente` | TEXT \| NULL | Markdown |
| `documentacao` | TEXT \| NULL | Markdown |
| `horas_estimadas` | INTEGER | |
| `tipo_demanda_status_id` | INTEGER FK | → `tipo_demanda_status` (PENDENTE, PLANEJADA, CONCLUIDA, CANCELADA) |
| `is_estrutural` | BOOLEAN | demanda-container que agrupa sub-demandas |
| `previsao_fim_data` | DATE \| NULL | |

### DemandaUsuario

| Coluna SQL | Tipo | Notas |
|---|---|---|
| `demanda_id` | INTEGER FK | → demanda |
| `usuario_id` | INTEGER FK | → usuario |

> Essa tabela deriva o acesso ao projeto **do desenvolvedor**: ele vê um projeto se tiver ao menos uma linha aqui vinculada a uma demanda desse projeto. O **gestor não depende** desta tabela — tem acesso total a qualquer demanda/projeto por ser gestor.

### DemandaConexao

| Coluna SQL | Tipo | Notas |
|---|---|---|
| `demanda_origem_id` | INTEGER FK | → demanda |
| `demanda_destino_id` | INTEGER FK | → demanda |
| `eh_bidirecional` | BOOLEAN | se true, a conexão vale nos dois sentidos |

> Prevenção de ciclos: a service valida via CTE recursivo antes de inserir qualquer conexão.

### Tag

| Coluna SQL | Tipo |
|---|---|
| `nome` | VARCHAR |
| `cor` | VARCHAR (hex) |

### DemandaTag

| Coluna SQL | Tipo |
|---|---|
| `demanda_id` | INTEGER FK → demanda |
| `tag_id` | INTEGER FK → tag |

### Atividade

| Coluna SQL | Tipo | Notas |
|---|---|---|
| `demanda_id` | INTEGER FK | → demanda |
| `usuario_id` | INTEGER FK | → usuario (executor principal) |
| `nome` | VARCHAR | |
| `tipo_atividade_status_id` | INTEGER FK | → `tipo_atividade_status` (PLANEJADA, PENDENTE, DESENVOLVENDO, DESENVOLVIDA) |

### AtividadeTag

| Coluna SQL | Tipo |
|---|---|
| `atividade_id` | INTEGER FK → atividade |
| `tag_id` | INTEGER FK → tag |

### Execucao

| Coluna SQL | Tipo | Notas |
|---|---|---|
| `atividade_id` | INTEGER FK | → atividade |
| `descricao` | TEXT | obrigatória |
| `inicio_data` | TIMESTAMPTZ | editável na edição da execução |
| `fim_data` | TIMESTAMPTZ \| NULL | NULL = execução em andamento; editável na edição |

> A edição de execução (`PUT /execucao/:id`) altera `descricao`, `inicio_data` e `fim_data` — não apenas a descrição.

### DiaNaoUtil

| Coluna SQL | Tipo | Notas |
|---|---|---|
| `dia_data` | DATE | |
| `descricao` | VARCHAR | ex: "Natal", "Recesso de fim de ano" |
| `tipo_dia_nao_util_id` | INTEGER FK | → `tipo_dia_nao_util` (FERIADO, RECESSO, PONTO_FACULTATIVO) |
| `tipo_dia_nao_util_duracao_id` | INTEGER FK | → `tipo_dia_nao_util_duracao` (INTEGRAL, MEIO_PERIODO — meio período reduz a meta diária à metade) |
| `recorrente` | BOOLEAN | se true, repete no mesmo dia todo ano |

### Tabelas de Referência (Enums)

Todo enum de domínio fechado é uma **tabela de referência** (§5.4, §9.2 #13, §16 #26), criada pela
migration `20240025`. Cada uma segue a BaseEntity + `codigo` (VARCHAR — valor SCREAMING_SNAKE,
espelha o enum TS de `shared/`) + `descricao` (VARCHAR — rótulo legível). A coluna de negócio
correspondente é um `INTEGER` FK para o `id` dela; o repositório traduz `codigo ⇄ id` no SQL.

| Tabela de referência | Enum TypeScript | Usada por (coluna FK) |
|---|---|---|
| `tipo_usuario` | `TipoUsuarioEnum` | `usuario.tipo_usuario_id` |
| `tipo_usuario_status` | `TipoUsuarioStatusEnum` | `usuario.tipo_usuario_status_id` |
| `tipo_projeto_status` | `TipoProjetoStatusEnum` | `projeto.tipo_projeto_status_id` |
| `tipo_demanda_status` | `TipoDemandaStatusEnum` | `demanda.tipo_demanda_status_id` |
| `tipo_atividade_status` | `TipoAtividadeStatusEnum` | `atividade.tipo_atividade_status_id` |
| `tipo_dia_nao_util` | `TipoDiaNaoUtilEnum` | `dia_nao_util.tipo_dia_nao_util_id` |
| `tipo_dia_nao_util_duracao` | `TipoDiaNaoUtilDuracaoEnum` | `dia_nao_util.tipo_dia_nao_util_duracao_id` |

---

## 14. Regras de Negócio Fundamentais

### Acesso e Permissões

O **administrador** é um gestor com mais permissões: tem tudo o que a coluna "Gestor" abaixo concede e, além disso, é o único que cria, promove, altera, inativa, exclui, restaura e troca a senha de outros administradores. **Sempre existe ao menos um administrador ativo e não excluído** (`UsuarioService.validarPermanenciaDeAdministradorAtivo`): rebaixar, inativar ou excluir o último é recusado. Gestor deixou de ser obrigatório. Decisões de permissão usam `temPermissaoDeGestor`/`temPermissaoDeAdministrador` (`@project20/shared`).

| Regra | Gestor | Desenvolvedor |
|---|---|---|
| Criar projeto | ✅ | ❌ |
| Ver todos os projetos | ✅ | ❌ ver apenas projetos com ao menos uma demanda atribuída |
| Criar demanda raiz | ✅ | ❌ — só pode criar **sub-demanda** (`demandaPaiId` obrigatório) |
| Ver demanda | ✅ todas | ❌ ver qualquer demanda de **projeto acessível** (não só as que é membro) |
| Editar demanda | ✅ todas | ❌ editar apenas demandas das quais **é membro** (`podeEditar`) |
| Editar `descricaoCliente` da demanda | ✅ | ❌ — exclusiva do gestor (demais descrições liberadas ao membro) |
| Atribuir usuário a demanda manualmente | ✅ | ❌ — exceto **incluir/remover a si mesmo** como membro |
| Criar tag | ✅ | ❌ |
| Atribuir tag | ✅ | ✅ apenas em demandas das quais é membro (inclusive a que ele acabou de criar) e em atividades que pode alterar |
| Ver execuções de todos | ✅ | ❌ ver apenas próprias |
| Editar execuções de outros | ✅ | ❌ |
| Cadastrar dia não útil | ✅ | ❌ |
| Ver ponto de todos | ✅ | ❌ ver apenas próprio |
| Gerenciar usuários | ✅ | ❌ |

### Demandas

- Ao criar uma demanda, o sistema **auto-atribui apenas o criador desenvolvedor** via `demanda_usuario` (além de quaisquer membros explicitamente selecionados na criação). O **gestor não é atribuído** — tem acesso total a qualquer demanda/projeto por ser gestor, independentemente de `demanda_usuario`
- O desenvolvedor só cria **sub-demanda** (informando `demandaPaiId`); a criação de demanda raiz é exclusiva do gestor
- Desenvolvedor **vê** qualquer demanda de um projeto a que tem acesso, mas só **edita** as que é membro (a `descricaoCliente` é sempre exclusiva do gestor)
- Gestor pode atribuir e remover usuários manualmente após a criação
- Desenvolvedor não gerencia atribuições de terceiros, mas **pode incluir e remover a si mesmo** como membro de uma demanda em projeto acessível — esta é a exceção à regra "Atribuir usuário manualmente — Dev ❌"
- O **último membro** de uma demanda não pode ser removido
- O **gestor** tem acesso total a qualquer demanda/projeto **por ser gestor**, sem depender de `demanda_usuario` (task `done/71-demanda-gestor-acesso-total-sem-atribuicao`); por isso não é atribuído na criação de demandas.

- Um usuário **não pode ter duas execuções ativas** (sem `fim_data`) simultaneamente
- O campo `fim_data` é obrigatório para fechar uma execução
- Toda execução aberta (`fim_data IS NULL`) é encerrada automaticamente pelo servidor às 23:59:59 (fuso `APP_TIMEZONE`) — uma execução nunca atravessa a virada do dia
- Execuções em finais de semana são permitidas mas marcadas como horas extras (não contam na meta diária)

### Intervalos

- Calculados automaticamente pelos gaps entre execuções no mesmo dia
- Gap mínimo para ser considerado intervalo: `INTERVALO_MINIMO_MINUTOS` (configurado via env)
- Podem existir múltiplos intervalos no mesmo dia

### Dias Não Úteis

- Finais de semana não precisam ser cadastrados — são ignorados automaticamente pelo módulo de ponto
- Feriados com `recorrente = true` são considerados em qualquer ano
- O módulo de ponto cruza as execuções com `dia_nao_util` para calcular métricas corretas
- Cada `dia_nao_util` tem `duracao` (`INTEGRAL` / `MEIO_PERIODO`): **integral** zera a meta do dia (fração 0); **meio período** reduz a meta à metade (fração 0.5 — o excedente vira hora extra e o saldo do dia nunca fica positivo). A `duracao` é independente do `tipo` e não distingue turno

### Grafo de Demandas

- Ao inserir uma `DemandaConexao`, a service verifica via CTE recursivo se criaria um ciclo
- Ciclo detectado → `BusinessException` com mensagem explicativa
- A hierarquia (pai/filho via `demanda_pai_id`) é separada das conexões de grafo

---

## 15. Integração Anthropic (Módulo Assistente)

O assistente **refina, clarifica e complementa** texto já escrito pelo usuário. Não gera descrições do zero — o usuário sempre escreve primeiro.

### Endpoint

```
POST /assistente/auxiliar-descricao
```

### Fluxo Completo

1. Usuário escreve a descrição no formulário
2. Clica em "Auxiliar com IA"
3. Frontend envia o texto original + contexto da entidade
4. `AssistenteService` monta o prompt e chama a API Anthropic
5. Retorna texto refinado
6. Frontend exibe original vs. auxiliado lado a lado
7. Usuário aceita, edita ou descarta

### Markdown

Texto rico é **Markdown**, interpretado por `interpretarMarkdown` (`shared/src/markdown/`, sem biblioteca) e exibido por `app-markdown-visualizador`. Bloco de código cercado é o `app-markdown-bloco-codigo` (task 189): cabeçalho com a linguagem e o botão Copiar (Clipboard API, "Copiado" por 2 s, aviso se falhar) e realce de sintaxe por **Prism** (`Prism.tokenize` devolve tokens e o template monta `<span>` com classe por tipo, sem HTML injetado), com o núcleo e cada gramática baixados sob demanda só quando aparece um bloco com linguagem conhecida (TypeScript, JavaScript, PHP, C#, Java, Python, SQL, HTML/XML, CSS, SCSS, JSON, Bash e YAML, com os apelidos comuns); linguagem ausente ou desconhecida mostra o código sem cor, com o botão. O interpretador devolve uma árvore de nós e o componente monta elementos a partir dela: **HTML cru nunca entra na página** (nenhum `[innerHTML]`, nenhum desvio do sanitizador). Subconjunto: títulos `#` a `####`, parágrafos (quebra de linha vira quebra), **negrito**, *itálico*, ~~tachado~~, `código`, listas com aninhamento e tarefas, citação, bloco de código, régua e links `http`/`https`/`mailto`. `<tag>` e entidades são texto; imagens e tabelas não existem.

O editor é `app-markdown-editor` (Reactive Forms; o valor é a string Markdown, `''` quando vazio). **`Enter` insere linha; quem confirma um dialog de formulário é o `Ctrl+Enter`** (contrato de `dialogFormulario`). `Enter` no fim de um item continua a lista, `Tab`/`Shift+Tab` aninham itens, `Ctrl+B`/`Ctrl+I`/`Ctrl+K` formatam. As edições da barra do modo Markdown cru são funções puras em `shared/src/markdown/markdown.edicao.ts`. **No modo formatado (padrão, task 134)** o usuário vê o texto já formatado e o valor continua sendo Markdown: os botões são interruptores (negrito, itálico, tachado e código agem na palavra do cursor; título, citação e lista saem do bloco; lista troca de tipo; tarefa é caixa clicável) e a forma gravada é estável (`normalizarMarkdown`: ida e volta idempotente, sem `<br />`, sem HTML na página). Tabelas e imagens não são criadas pelo editor.

### Componente Reutilizável

`assistente-descricao` (em `shared/components/`) é usado nos formulários de:
- Execução
- Atividade
- Demanda (descricaoTecnica e descricaoCliente separadamente)

### Configuração

API key e modelo lidos via `ConfigService` — nunca `process.env` diretamente.

---

## 16. Proibições Absolutas

Estas regras **jamais** devem ser violadas. São inegociáveis independente do contexto:

| # | Proibição |
|---|---|
| 1 | **Nunca abreviar** nomes de variáveis, métodos, parâmetros, classes ou arquivos |
| 2 | **Nunca colocar lógica de negócio** na controller — apenas repasse para service |
| 3 | **Nunca usar ORM** — apenas SQL bruto via `knex.raw()` |
| 4 | **Nunca omitir** `is_deleted = false` em qualquer SELECT (exceção única: `recuperarExcluid[oa]()` da restauração, §9.2 #11) |
| 5 | **Nunca usar `?` posicional** em SQL — sempre parâmetros nomeados `:nome` com objeto |
| 6 | **Nunca usar `VALUES`** em INSERT — sempre `INSERT INTO ... SELECT :campo RETURNING` |
| 7 | **Nunca usar DEFAULT** em colunas SQL — a aplicação sempre fornece todos os valores |
| 8 | **Nunca abreviar aliases** em SQL — usar nome completo da tabela ou alias descritivo (`demanda_filho`, não `d`) |
| 9 | **Nunca nomear campo de data fora do padrão** — `[contexto]_date` (inglês) ou `[contexto]_data` (português) |
| 10 | **Nunca usar** `process.env` diretamente — sempre via `ConfigService` |
| 11 | **Nunca escrever** conceito de negócio em inglês |
| 12 | **Nunca escrever** conceito genérico/arquitetural em português |
| 13 | **Nunca criar** a tabela `projeto_usuario` — não existe neste projeto |
| 14 | **Nunca extrapolar** o escopo da task sendo implementada |
| 15 | **Nunca fazer** DELETE físico — sempre soft delete via `executarSoftDelete()` |
| 16 | **Nunca permitir** duas execuções ativas para o mesmo usuário simultaneamente |
| 17 | **Nunca escrever** código sem documentação JSDoc nos métodos públicos de service e repository |
| 18 | **Nunca criar** componente Angular com NgModule — sempre standalone |
| 19 | **Nunca usar** .css — todo arquivo de estilo é .scss |
| 20 | **Nunca usar** style="" inline no HTML — sempre SCSS ou Tailwind |
| 21 | **Nunca passar primitivos** como parâmetros em métodos de service ou repository — sempre DTO, mesmo que seja um único campo. O `id` que chega por `@Param`/`@Query` é injetado no DTO **pela controller** antes do repasse (ver §7.2); a service nunca recebe `id`/`*Id` solto. Objetos de contexto (payload do JWT via `@ActiveUser()`) não são primitivos e podem ser parâmetro próprio |
| 22 | **Nunca nomear métodos com `existe*`** — usar `validar*` (ex: `validarLogin`, `validarNome`, `validarCodigo`) |
| 23 | **Nunca criar DTO como alias, re-export ou subclasse de outro DTO de negócio** — cada DTO de negócio define explicitamente todos os seus campos (negócio nunca herda negócio, nem vazio). A **única** herança permitida é de um DTO **core** (`PaginatedResult`, `StandardResponse`), que evita duplicar campos genéricos (ver §5.1) |
| 24 | **Nunca usar `atualizar`** em nomes de DTO ou método de negócio — usar `alterar` (`UsuarioAlterarDto`, `alterar()`) |
| 25 | **Nunca colocar em repositório A** uma query cuja responsabilidade é do módulo B — usar o repositório do módulo correto |
| 26 | **Nunca representar enum como `VARCHAR + CHECK` ou `ENUM` nativo** — todo enum é uma tabela de referência `tipo_<tabela>_<complemento?>` (`codigo` + `descricao`) e a coluna de negócio é `INTEGER` FK para o `id` dela; o enum TypeScript de `shared/` é o contrato tipado que espelha os `codigo` (ver §5.4) |