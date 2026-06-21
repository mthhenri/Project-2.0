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

### Frontend
- **Framework:** Angular 21 — standalone components obrigatório
- **UI:** PrimeNG 21
- **Estado:** Angular Signals (signal, computed, effect)
- **Formulários:** Reactive Forms
- **HTTP:** Angular HttpClient com interceptores
- **Editor rico:** p-editor do PrimeNG (campos HTML)
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
    CONTEXT.md            ← estado atual do projeto (atualizado após cada sessão)
    specs/
      backlog/            ← tasks a implementar
      active/             ← task em andamento na sessão atual
      done/               ← tasks concluídas (histórico)
  package.json                  ← workspaces root (npm workspaces)
  docker-compose.yml
  .gitignore
  README.md
```

---

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
| Exceptions genéricas: `BusinessException`, `ResourceNotFoundException` | Valores de enum: `DESENVOLVEDOR`, `GESTOR`, `PLANEJADA`, `EM_DESENVOLVIMENTO` |
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

```typescript
// usuario-tipo.enum.ts
export enum UsuarioTipoEnum {
  DESENVOLVEDOR = 'DESENVOLVEDOR',
  GESTOR        = 'GESTOR',
}

// demanda-status.enum.ts
export enum DemandaStatusEnum {
  PLANEJADA         = 'PLANEJADA',
  EM_DESENVOLVIMENTO = 'EM_DESENVOLVIMENTO',
  CONCLUIDA         = 'CONCLUIDA',
}

// atividade-status.enum.ts
export enum AtividadeStatusEnum {
  PLANEJADA    = 'PLANEJADA',
  PENDENTE     = 'PENDENTE',
  DESENVOLVENDO = 'DESENVOLVENDO',
  DESENVOLVIDA = 'DESENVOLVIDA',
}
```

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
    demanda-prioridade.enum.ts
    atividade-status.enum.ts
    projeto-status.enum.ts
    dia-nao-util-tipo.enum.ts
  interfaces/
    standard-response.interface.ts
    paginated-result.interface.ts
```

### 6.3 Configuração de Workspace

```json
// package.json (raiz)
{
  "workspaces": ["shared", "backend", "frontend"]
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

### 8.1 Estrutura de Pastas

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
      layout.component.ts           ← shell: topbar + router-outlet + toast
      topbar/
        topbar.component.ts         ← navegação horizontal, relógio, perfil, logout
        topbar.component.html
        topbar.component.scss
    components/
      loading-spinner/
        loading-spinner.component.ts
      error-message/
        error-message.component.ts
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
- **p-editor** do PrimeNG para campos que salvam HTML (ex: `anotacoes`)
- **Lazy loading** por módulo via rotas com `loadComponent`

### 8.3 Componente Assistente de Descrição

O componente `assistente-descricao` é reutilizável nos formulários de execução, atividade e demanda:

```typescript
// Recebe o texto atual e contexto
@Input() textoAtual: string = '';
@Input() tipoEntidade: 'execucao' | 'atividade' | 'demanda' = 'execucao';
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
**Dark mode:** permanentemente desabilitado (`darkModeSelector: false`) — o sistema é sempre claro.

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

**Regra de uso de cores — surface como base, primary como acento:**

| Token | Uso |
|---|---|
| `bg-surface-0` | Fundo de painéis e topbar (branco) |
| `bg-surface-50` | Fundo de página / área de conteúdo (cinza claríssimo) |
| `border-surface-200` | Bordas e divisores |
| `text-surface-700` | Texto de interface (labels, itens de nav) |
| `text-surface-600` | Texto secundário (horário, subtítulos) |
| `var(--p-primary-50)` | Fundo de item ativo na navegação |
| `var(--p-primary-600)` | Cor do ícone/texto de item ativo, títulos em destaque |

A cor `primary` aparece **apenas em pontos de destaque**: estado ativo na navegação, botões de ação principal, títulos que representam a identidade do produto. Fundos estruturais usam sempre tokens `surface`.

---

## 9. Banco de Dados

### 9.1 BaseEntity — Campos Obrigatórios em Toda Tabela

Nomes em inglês por serem genéricos. **Sem DEFAULT** — todos os valores fornecidos explicitamente no INSERT.

```sql
id            SERIAL    PRIMARY KEY,
created_date  TIMESTAMP NOT NULL,
updated_date  TIMESTAMP NOT NULL,
is_deleted    BOOLEAN   NOT NULL,
deleted_date  TIMESTAMP
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
6. **Sem DEFAULT** em nenhuma coluna — a aplicação sempre fornece todos os valores explicitamente
7. **Sem aliases abreviados** em queries — usar nome completo da tabela ou alias descritivo (`demanda_filho`, não `d`)
8. **Parâmetros nomeados** `:nome` com objeto (Knex) — nunca `?` posicional, nunca interpolação de string
9. **INSERT sempre com SELECT** — nunca `VALUES`: `INSERT INTO tabela (...) SELECT :campo1, :campo2 RETURNING ...`
10. **Hierarquias e grafos** via CTEs recursivos do PostgreSQL
11. **Soft delete** via `executarSoftDelete()` do BaseRepository — nunca DELETE físico
12. **Objetos genéricos de banco** (funções/triggers de infraestrutura) em **inglês** — `fn_set_updated_date()`, `trg_usuario_updated_date` ✅; `fn_atualizar_updated_date()` ❌ (idioma misto em mecanismo genérico, §16 #12). Apenas tabelas e colunas de negócio são em português

### 9.3 Paginação Padrão

Query params sempre nomeados assim: `pagina`, `itensPorPagina`, `ordenarPor`, `direcao`

### 10.4 Configuração de Ambiente (.env)

```env
# Banco de dados
DB_HOST=localhost
DB_PORT=5432
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
- **`@GestorOnly()`** — decorator que restringe a rota a usuários do tipo GESTOR
- **`@ActiveUser()`** — injeta o payload do JWT decodificado no parâmetro do método

---

## 12. Módulos do Sistema

| Módulo | Responsabilidade Principal |
|---|---|
| `autenticacao` | Login e geração de JWT |
| `usuario` | CRUD de usuários, anotações em HTML, troca de senha |
| `projeto` | CRUD de projetos — apenas gestor cria |
| `demanda` | CRUD, hierarquia, grafo force-directed (D3), tags, atribuições |
| `atividade` | CRUD de atividades vinculadas a demandas, tags, controle de status |
| `execucao` | Iniciar e encerrar execuções, histórico por atividade |
| `ponto` | Resumo diário: horas trabalhadas, intervalos calculados, comparativo com meta |
| `calendario` | Gestão de dias não úteis (feriados, recessos) |
| `tag` | CRUD de tags — apenas gestor cria e atribui |
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
| `anotacoes` | TEXT \| NULL | HTML gerado pelo p-editor |
| `horas_diarias_necessarias` | INTEGER | em horas (ex: 8) |
| `tipo` | ENUM | DESENVOLVEDOR, GESTOR |
| `status` | ENUM | ATIVO, INATIVO |

### Projeto

| Coluna SQL | Tipo | Notas |
|---|---|---|
| `nome` | VARCHAR | |
| `codigo` | VARCHAR | referência curta, ex: "PROJ-001" |
| `cor` | VARCHAR | hex, para identificação visual |
| `status` | ENUM | ATIVO, PAUSADO, CONCLUIDO, CANCELADO |
| `inicio_data` | DATE \| NULL | |
| `previsao_fim_data` | DATE \| NULL | |

> **Sem tabela `projeto_usuario`** — acesso a projeto é derivado de `demanda_usuario`

### Demanda

| Coluna SQL | Tipo | Notas |
|---|---|---|
| `projeto_id` | INTEGER FK | → projeto |
| `demanda_pai_id` | INTEGER FK \| NULL | → demanda (hierarquia recursiva) |
| `nome` | VARCHAR | |
| `descricao_tecnica` | TEXT \| NULL | |
| `descricao_cliente` | TEXT \| NULL | |
| `documentacao` | TEXT \| NULL | markdown |
| `horas_estimadas` | INTEGER | |
| `prioridade` | ENUM | BAIXA, MEDIA, ALTA, CRITICA |
| `status` | ENUM | PLANEJADA, EM_DESENVOLVIMENTO, CONCLUIDA |
| `is_estrutural` | BOOLEAN | demanda-container que agrupa sub-demandas |
| `previsao_fim_data` | DATE \| NULL | |
| `ordem_exibicao` | INTEGER | para ordenação em listas e kanban |

### DemandaUsuario

| Coluna SQL | Tipo | Notas |
|---|---|---|
| `demanda_id` | INTEGER FK | → demanda |
| `usuario_id` | INTEGER FK | → usuario |

> Essa tabela deriva o acesso ao projeto: desenvolvedor vê um projeto se tiver ao menos uma linha aqui vinculada a uma demanda desse projeto.

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
| `descricao` | TEXT \| NULL | opcional |
| `status` | ENUM | PLANEJADA, PENDENTE, DESENVOLVENDO, DESENVOLVIDA |
| `ordem_exibicao` | INTEGER | |

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
| `inicio_data` | TIMESTAMP | |
| `fim_data` | TIMESTAMP \| NULL | NULL = execução em andamento |

### DiaNaoUtil

| Coluna SQL | Tipo | Notas |
|---|---|---|
| `dia_data` | DATE | |
| `descricao` | VARCHAR | ex: "Natal", "Recesso de fim de ano" |
| `tipo` | ENUM | FERIADO, RECESSO, PONTO_FACULTATIVO |
| `recorrente` | BOOLEAN | se true, repete no mesmo dia todo ano |

---

## 14. Regras de Negócio Fundamentais

### Acesso e Permissões

| Regra | Gestor | Desenvolvedor |
|---|---|---|
| Criar projeto | ✅ | ❌ |
| Ver todos os projetos | ✅ | ❌ ver apenas projetos com ao menos uma demanda atribuída |
| Criar demanda | ✅ | ✅ em projetos com acesso |
| Atribuir usuário a demanda manualmente | ✅ | ❌ |
| Criar e atribuir tag | ✅ | ❌ |
| Ver execuções de todos | ✅ | ❌ ver apenas próprias |
| Editar execuções de outros | ✅ | ❌ |
| Cadastrar dia não útil | ✅ | ❌ |
| Ver ponto de todos | ✅ | ❌ ver apenas próprio |
| Gerenciar usuários | ✅ | ❌ |

### Demandas

- Ao criar uma demanda, o sistema **auto-atribui automaticamente** o criador (desenvolvedor ou gestor) e **todos os gestores ativos** via `demanda_usuario`
- Gestor pode atribuir e remover usuários manualmente após a criação
- Desenvolvedor não pode gerenciar atribuições — apenas visualiza os membros da demanda

- Um usuário **não pode ter duas execuções ativas** (sem `fim_data`) simultaneamente
- O campo `fim_data` é obrigatório para fechar uma execução
- Execuções em finais de semana são permitidas mas marcadas como horas extras (não contam na meta diária)

### Intervalos

- Calculados automaticamente pelos gaps entre execuções no mesmo dia
- Gap mínimo para ser considerado intervalo: `INTERVALO_MINIMO_MINUTOS` (configurado via env)
- Podem existir múltiplos intervalos no mesmo dia

### Dias Não Úteis

- Finais de semana não precisam ser cadastrados — são ignorados automaticamente pelo módulo de ponto
- Feriados com `recorrente = true` são considerados em qualquer ano
- O módulo de ponto cruza as execuções com `dia_nao_util` para calcular métricas corretas

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
| 4 | **Nunca omitir** `is_deleted = false` em qualquer SELECT |
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
| 23 | **Nunca criar DTO como alias ou re-export** de outro DTO — cada DTO define explicitamente todos os seus campos |
| 24 | **Nunca usar `atualizar`** em nomes de DTO ou método de negócio — usar `alterar` (`UsuarioAlterarDto`, `alterar()`) |
| 25 | **Nunca colocar em repositório A** uma query cuja responsabilidade é do módulo B — usar o repositório do módulo correto |