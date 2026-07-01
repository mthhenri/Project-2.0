# 80 — Projeto: relatório de execuções por período (CSV/Excel) + base para revisão com IA

**Depende de:** 09 (projeto-module), 15 (execucao-module), 17 (ponto-module — padrão de service sem repositório próprio), 18 (assistente-module — padrão de chamada à Anthropic), 25/26 (frontend projeto/demanda), 41 (execucao: colunas projeto/demanda + total)

**Entrega:** dentro de um projeto (tela de detalhe), o usuário gera um **relatório de todas as execuções** realizadas num **período definido** — **anual** (escolhe o ano), **mensal** (escolhe ano + mês) ou **custom** (escolhe data início e data fim) — e **baixa um arquivo CSV/Excel** com as execuções do período. Além disso, esta task **deixa encaminhada** a base para uma futura **revisão do relatório por IA** (detectar inconsistências): DTOs, enum, endpoint e um service de revisão com prompt já estruturado, marcado claramente como groundwork.

> Backend: **novo módulo `relatorio`** (controller + service, **sem repositório próprio** — consome `ExecucaoRepository`/`ProjetoRepository`/`DemandaRepository`, no mesmo padrão do `ponto`). Shared: novos DTOs + enums. Frontend: dialog de relatório na tela de detalhe do projeto. **Sem migration** — nenhuma mudança de schema.

---

## Contexto

A tela [projeto-detalhe.page.ts](../../../frontend/src/app/modules/projeto/pages/projeto-detalhe/projeto-detalhe.page.ts) é o ponto de entrada de um projeto (árvore/grafo de demandas). É aqui que entra a ação "Relatório".

A cadeia `execucao → atividade → demanda → projeto → usuario` já é praticada por
[execucao.repository.ts](../../../backend/src/modules/execucao/repositories/execucao.repository.ts)
no método `listar()` (JOINs e filtro `is_deleted = false` em todas as tabelas, duração calculada via
`EXTRACT(EPOCH FROM (COALESCE(execucao.fim_data, ...) - execucao.inicio_data))::int / 60`).
O relatório reaproveita exatamente essa cadeia, mas **filtrando por `projeto.id` e por intervalo de datas**, **sem paginação**.

O `PontoService` já é a referência de **service que consome repositórios de outros módulos sem ter repositório próprio** (o módulo `ponto` "[sem repository próprio — consome execucao e calendario]"). O novo módulo `relatorio` segue esse padrão — portanto **não** viola a proibição #25 (a query de execução continua vivendo no `ExecucaoRepository`).

O `AssistenteService` ([assistente.service.ts](../../../backend/src/modules/assistente/services/assistente.service.ts)) é a referência de chamada à Anthropic via `ConfigService` (`obter().anthropic`) — modelo, `maxTokens` e `apiKey` lidos do config, nunca de `process.env`.

---

## Decisões de escopo (registradas)

1. **Controle de acesso — exclusivo de gestor:**
   - O relatório é **somente para gestor**. Desenvolvedor **não acessa** o relatório — aliás, nem tem acesso à própria tela de projetos. Todas as rotas de relatório levam **`@GestorOnly()`** (além do `JwtAuthGuard`), no mesmo padrão de `GET /ponto/todos` e das rotas gestor-only de execução.
   - O relatório traz **todas** as execuções do projeto no período (sem restrição por usuário).
   - Como é gestor-only, **não há** ramo de "desenvolvedor vê só as próprias", nem uso de `ExecucaoAcessoFiltrarDto`/`validarAcessoProjeto` neste fluxo.
2. **Formatos:** **CSV** é obrigatório (sem dependência nova — string montada no service, com BOM UTF-8 para abrir certo no Excel). **XLSX** é recomendado via dependência nova **`exceljs`** no `backend`. Se a inclusão da dependência não for desejada nesta task, entregar **só CSV** e deixar o XLSX como follow-up (o enum `RelatorioFormatoEnum` já prevê os dois).
3. **Revisão por IA = groundwork:** esta task entrega a **plumbing completa** (enum/DTOs/endpoint/service com prompt estruturado e parsing de findings) e uma **versão básica funcional**. O motor de heurísticas avançadas (ver "NÃO implementar") fica para uma task futura.
4. **Geração do arquivo no backend** (não no frontend): o backend já tem os dados e o acesso à IA, e centralizar a montagem garante CSV e XLSX idênticos em colunas.

---

## Shared

### Enums (`shared/src/enums/`)

```typescript
// relatorio-periodo-tipo.enum.ts
export enum RelatorioPeriodoTipoEnum {
  ANUAL  = 'ANUAL',
  MENSAL = 'MENSAL',
  CUSTOM = 'CUSTOM',
}

// relatorio-formato.enum.ts
export enum RelatorioFormatoEnum {
  CSV  = 'CSV',
  XLSX = 'XLSX',
}
```

Exportar ambos no barrel `shared/src/enums/index.ts`.

### DTOs (`shared/src/dtos/relatorio/` — novo diretório + `index.ts`)

> Lembrar §16 #23 / §5.1: nenhum DTO é alias/re-export nem herda outro DTO de **negócio** — cada um declara explicitamente seus campos (com os decorators `class-validator` de entrada e `@ApiProperty(Optional)` quando o módulo usa Swagger). DTOs de **relatório/recorte computado** não levam verbo no particípio (§5.1).

**Entrada (consulta — query params):**

```typescript
// RelatorioExecucaoConsultarDto.ts
// projetoId é injetado pela controller a partir de @Param/@Query; os campos de período
// são condicionais ao periodoTipo (validar com @ValidateIf).
export class RelatorioExecucaoConsultarDto {
  projetoId: number;                      // injetado pela controller
  periodoTipo: RelatorioPeriodoTipoEnum;  // @IsEnum

  ano?: number;        // @ValidateIf(ANUAL || MENSAL) @IsInt @Min(2000) @Max(2100)
  mes?: number;        // @ValidateIf(MENSAL)          @IsInt @Min(1)    @Max(12)
  dataInicio?: string; // @ValidateIf(CUSTOM)          @IsDateString  (YYYY-MM-DD)
  dataFim?: string;    // @ValidateIf(CUSTOM)          @IsDateString  (YYYY-MM-DD)
}
```

**Entrada (download):** mesmos campos do consultar **+ `formato`** (campos declarados explicitamente, **sem** `extends`):

```typescript
// RelatorioExecucaoBaixarDto.ts
export class RelatorioExecucaoBaixarDto {
  projetoId: number;
  periodoTipo: RelatorioPeriodoTipoEnum;
  ano?: number;
  mes?: number;
  dataInicio?: string;
  dataFim?: string;
  formato: RelatorioFormatoEnum;          // @IsEnum
}
```

**Filtro interno do repositório** (período já resolvido em datas concretas pelo service):

```typescript
// RelatorioExecucaoFiltrarDto.ts
export class RelatorioExecucaoFiltrarDto {
  projetoId: number;
  dataInicio: string;  // YYYY-MM-DD
  dataFim: string;     // YYYY-MM-DD
}
```
> Como o relatório é **gestor-only**, **não há** DTO de restrição por usuário — o filtro é só projeto + período.

**Saída — linha do relatório (value-object por execução):**

```typescript
// RelatorioExecucaoLinhaDto.ts
export class RelatorioExecucaoLinhaDto {
  nomeProjeto: string;        // extra útil
  nomeDemanda: string;        // demanda_nome   (pedido)
  nomeAtividade: string;      // atividade_nome (pedido)
  nomeUsuario: string;        // usuario_nome   (pedido)
  dataExecucao: string;       // data_execucao  (pedido) — DATE(inicio_data), YYYY-MM-DD
  inicioData: Date;           // extra: hora de início
  fimData: Date | null;       // extra: hora de fim (null = em andamento)
  duracaoMinutos: number;     // tempo_executado (pedido) — em minutos
  descricao: string;          // descricao_execucao (pedido)
  statusAtividade: AtividadeStatusEnum; // extra útil
}
```

**Saída — relatório (recorte computado, wrapper):**

```typescript
// RelatorioExecucaoDto.ts
export class RelatorioExecucaoDto {
  projetoId: number;
  nomeProjeto: string;
  periodoTipo: RelatorioPeriodoTipoEnum;
  periodoDescricao: string;   // ex.: "Ano 2026", "Junho/2026", "01/01/2026 a 30/06/2026"
  dataInicio: string;         // YYYY-MM-DD (resolvido)
  dataFim: string;            // YYYY-MM-DD (resolvido)
  totalExecucoes: number;
  totalMinutos: number;
  linhas: RelatorioExecucaoLinhaDto[];
}
```

**Saída — base para revisão com IA (groundwork):**

```typescript
// RelatorioRevisaoSolicitarDto.ts  (entrada — mesmos campos de período do consultar)
export class RelatorioRevisaoSolicitarDto {
  projetoId: number;
  periodoTipo: RelatorioPeriodoTipoEnum;
  ano?: number;
  mes?: number;
  dataInicio?: string;
  dataFim?: string;
}

// RelatorioInconsistenciaDto.ts  (value-object por achado)
export class RelatorioInconsistenciaDto {
  tipo: string;        // ex.: "DESCRICAO_VAGA", "DURACAO_SUSPEITA", "DIA_NAO_UTIL"
  severidade: string;  // "BAIXA" | "MEDIA" | "ALTA"  (string livre nesta fase)
  descricao: string;   // explicação legível do problema
  referencia: string | null; // identificação da linha (ex.: "demanda / atividade / data") ou null
}

// RelatorioRevisaoDto.ts  (recorte computado)
export class RelatorioRevisaoDto {
  resumo: string;
  inconsistencias: RelatorioInconsistenciaDto[];
}
```

Exportar tudo em `shared/src/dtos/relatorio/index.ts`.

---

## Backend — módulo `relatorio` (novo)

Estrutura (espelha `ponto`, sem `repositories/` próprio):

```
backend/src/modules/relatorio/
  controllers/relatorio.controller.ts
  services/relatorio.service.ts
  relatorio.module.ts
```

Registrar `RelatorioModule` em `app.module.ts`. O módulo importa o que expõe `ExecucaoRepository` e `ProjetoRepository` (seguir como o `PontoModule` resolve as dependências de outros módulos — `exports` nos módulos de origem + `imports` no `RelatorioModule`; ajustar `exports` onde algum repositório ainda não for exportado). `DemandaRepository` **não** é necessário (sem checagem de acesso por usuário — relatório é gestor-only).

### `ExecucaoRepository` — novo método (a query de execução é responsabilidade deste módulo, §25)

```typescript
/**
 * Lista TODAS as execuções de um projeto dentro de um intervalo de datas (sem paginação),
 * para fins de relatório. Uso restrito a gestor (garantido na camada de controller/service).
 */
async listarParaRelatorio(
  filtros: RelatorioExecucaoFiltrarDto,
): Promise<RelatorioExecucaoLinhaDto[]>
```

SQL (alias completos, parâmetros nomeados, `is_deleted = false` em todas as tabelas):

```sql
SELECT
  projeto.nome                                                                     AS "nomeProjeto",
  demanda.nome                                                                     AS "nomeDemanda",
  atividade.nome                                                                   AS "nomeAtividade",
  usuario.nome_completo                                                            AS "nomeUsuario",
  DATE(execucao.inicio_data)::text                                                 AS "dataExecucao",
  execucao.inicio_data                                                             AS "inicioData",
  execucao.fim_data                                                                AS "fimData",
  EXTRACT(EPOCH FROM (COALESCE(execucao.fim_data, CAST(:agora AS timestamp)) - execucao.inicio_data))::int / 60 AS "duracaoMinutos",
  execucao.descricao,
  atividade.status                                                                 AS "statusAtividade"
FROM execucao
INNER JOIN atividade ON atividade.id = execucao.atividade_id
INNER JOIN usuario   ON usuario.id   = atividade.usuario_id
INNER JOIN demanda   ON demanda.id   = atividade.demanda_id
INNER JOIN projeto   ON projeto.id   = demanda.projeto_id
WHERE execucao.is_deleted = false
  AND atividade.is_deleted = false
  AND usuario.is_deleted = false
  AND demanda.is_deleted = false
  AND projeto.is_deleted = false
  AND projeto.id = :projetoId
  AND DATE(execucao.inicio_data) BETWEEN :dataInicio::DATE AND :dataFim::DATE
ORDER BY usuario.nome_completo ASC, execucao.inicio_data ASC
```

> `:agora` = `new Date()` da aplicação (mesmo cuidado de fuso adotado no `listar` atual — não usar `NOW()` do banco para a duração de execuções em andamento).

### `RelatorioService`

Métodos públicos (todos com JSDoc — §16 #17). Recebe sempre DTO (§16 #21). Como o acesso gestor-only é resolvido pelo `@GestorOnly()` na controller e o relatório não filtra por usuário, os métodos **não** precisam de `usuarioAtivo`.

```typescript
// 1) Dados do relatório (preview e base da revisão)
async gerarRelatorio(
  dto: RelatorioExecucaoConsultarDto,
): Promise<StandardResponse<RelatorioExecucaoDto>>

// 2) Arquivo para download (CSV/XLSX). Devolve conteúdo + metadados; o controller só seta headers.
async baixarRelatorio(
  dto: RelatorioExecucaoBaixarDto,
): Promise<{ conteudo: Buffer; nomeArquivo: string; mimeType: string }>

// 3) Groundwork — revisão por IA
async revisarRelatorio(
  dto: RelatorioRevisaoSolicitarDto,
): Promise<StandardResponse<RelatorioRevisaoDto>>
```

Lógica compartilhada (privada):
- **`validarEResolverPeriodo(dto)`** → calcula `{ dataInicio, dataFim, periodoDescricao }`:
  - `ANUAL`: `[ano-01-01, ano-12-31]`.
  - `MENSAL`: primeiro e último dia do mês (`mes` 1–12; usar último dia real do mês).
  - `CUSTOM`: usa `dataInicio`/`dataFim`; validar `dataFim >= dataInicio` → senão `BusinessException`.
  - Campos faltantes para o tipo escolhido → `BusinessException` (defesa em profundidade além do `@ValidateIf`).
- **Projeto:** recuperar o projeto (`ProjetoRepository.recuperar({ id: dto.projetoId })`); não achou → `ResourceNotFoundException('Projeto')`. O acesso gestor-only é garantido pelo `@GestorOnly()` na controller — **sem** ramo de desenvolvedor nem `validarAcessoProjeto` aqui.
- **Buscar linhas:** `execucaoRepositorio.listarParaRelatorio({ projetoId, dataInicio, dataFim })`.
- **Totais:** `totalExecucoes = linhas.length`, `totalMinutos = soma(duracaoMinutos)`.

`baixarRelatorio` reutiliza `gerarRelatorio` (mesmo acesso/dados) e serializa:
- **CSV:** cabeçalho + uma linha por execução; colunas na ordem
  `Projeto, Demanda, Atividade, Usuário, Data, Início, Fim, Tempo (h), Status, Descrição`.
  Escapar campos (aspas duplas, vírgula, quebra de linha — envolver em `"..."` e duplicar aspas internas); separador `,`; quebra `\r\n`; **prefixar BOM `﻿`** (Excel/acentos). `Tempo (h)` formatado `HH:MM` a partir de `duracaoMinutos`. `mimeType = 'text/csv; charset=utf-8'`.
- **XLSX (recomendado, dependência `exceljs`):** uma worksheet "Execuções", mesma ordem de colunas, cabeçalho em negrito, larguras razoáveis; `mimeType = 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'`. **Se `exceljs` não for adicionado nesta task**, `baixarRelatorio` com `formato = XLSX` lança `BusinessException('Formato XLSX ainda não disponível')` e o frontend oferece só CSV (deixar o caminho pronto).
- `nomeArquivo`: ex. `relatorio-execucoes_<codigoProjeto>_<dataInicio>_<dataFim>.<csv|xlsx>`.

`revisarRelatorio` (groundwork):
- Reusa `gerarRelatorio` para obter as `linhas`.
- Monta um prompt para a Anthropic (via `ConfigService.obter().anthropic`, mesmo padrão do `AssistenteService`) pedindo para **apontar inconsistências** no relatório e responder **em JSON** no formato de `RelatorioRevisaoDto` (`{ resumo, inconsistencias: [{ tipo, severidade, descricao, referencia }] }`). Exemplos de inconsistências a citar no prompt: descrições vazias/vagas/genéricas, durações desproporcionais à atividade, execuções concentradas fora do horário usual, possíveis sobreposições, descrição que não condiz com o nome da atividade/demanda.
- Fazer parse defensivo do JSON retornado; em falha de parse ou de rede → `BusinessException('Serviço de IA temporariamente indisponível')` (mesmo tratamento do `AssistenteService`).
- **Limite de payload:** truncar/limitar o número de linhas enviadas ao modelo (ex.: as N primeiras + agregados) para caber em `maximoTokens`; deixar comentado que o refinamento de chunking é follow-up.

### `RelatorioController` (`@Controller('relatorio')`, `@UseGuards(JwtAuthGuard)`)

Controller burra (§7.2). **Todas as rotas levam `@GestorOnly()`** (relatório é exclusivo de gestor). A **única microinteligência** é montar o DTO injetando `projetoId` (vindo de `@Query('projetoId')` com `ParseIntPipe`) e, no download, setar os headers HTTP a partir do retorno do service.

```typescript
@GestorOnly()
@Get('execucao')
gerar(@Query() dto: RelatorioExecucaoConsultarDto, @Query('projetoId', ParseIntPipe) projetoId: number) {
  return this.relatorioService.gerarRelatorio({ ...dto, projetoId });
}

@GestorOnly()
@Get('execucao/download')
async baixar(@Query() dto: RelatorioExecucaoBaixarDto, @Query('projetoId', ParseIntPipe) projetoId: number,
             @Res({ passthrough: true }) resposta: Response) {
  const arquivo = await this.relatorioService.baixarRelatorio({ ...dto, projetoId });
  resposta.setHeader('Content-Type', arquivo.mimeType);
  resposta.setHeader('Content-Disposition', `attachment; filename="${arquivo.nomeArquivo}"`);
  return new StreamableFile(arquivo.conteudo);
}

@GestorOnly()
@Post('execucao/revisar')
revisar(@Body() dto: RelatorioRevisaoSolicitarDto, @Query('projetoId', ParseIntPipe) projetoId: number) {
  return this.relatorioService.revisarRelatorio({ ...dto, projetoId });
}
```

> O `@Res`/`StreamableFile` da rota de download é o único ponto fora do `response-format.interceptor` (resposta binária, não envelopada) — comportamento esperado para download de arquivo. As demais rotas seguem o envelope `StandardResponse` normal.

---

## Frontend

### `RelatorioService` (`frontend/src/app/modules/relatorio/services/relatorio.service.ts` — novo, ou dentro de `modules/projeto/services/`)

- `gerarRelatorio(params): Observable<StandardResponse<RelatorioExecucaoDto>>` → `GET /relatorio/execucao` (monta `HttpParams` com `projetoId`, `periodoTipo` e os campos do período).
- `baixarRelatorio(params, formato): Observable<Blob>` → `GET /relatorio/execucao/download` com `responseType: 'blob'`; disparar o download no componente (criar `objectURL`, `<a download>`, revogar).
- `revisarRelatorio(params): Observable<StandardResponse<RelatorioRevisaoDto>>` → `POST /relatorio/execucao/revisar`.

### `RelatorioExecucaoDialogComponent` (novo, standalone)

- Botão **"Relatório"** na [projeto-detalhe.page.html](../../../frontend/src/app/modules/projeto/pages/projeto-detalhe/projeto-detalhe.page.html) (junto às ações do cabeçalho) abre o dialog via método imperativo `abrir(projetoId)` (mesmo padrão dos dialogs recentes — `ProjetoFormularioDialogComponent`, `UsuarioPerfilDialogComponent`).
- **Reactive Form** com `periodoTipo` (`p-select`/radio: Anual/Mensal/Custom) e campos condicionais por `@if`:
  - Anual: `p-select` de ano (lista de anos, ex. atual −5 … atual).
  - Mensal: `p-select` de ano + `p-select` de mês.
  - Custom: dois `p-datepicker` (início/fim) com cross-validator `fim >= início`.
- **Pré-visualização:** botão "Pré-visualizar" chama `gerarRelatorio`, exibe `p-table` com as colunas e um rodapé com `totalExecucoes` e `totalMinutos | minutosParaHoras` (pipe `MinutosParaHorasPipe` já existe).
- **Download:** botões "Baixar CSV" e "Baixar Excel" (Excel só habilitado se o backend tiver XLSX; senão ocultar/desabilitar) chamam `baixarRelatorio(params, formato)`.
- **Revisar com IA (groundwork):** botão "Revisar com IA" chama `revisarRelatorio`, mostra `resumo` + lista de `inconsistencias` (tipo/severidade/descrição/referência) num painel. Estado de carregamento próprio.
- Estilos `.scss` com BEM em português + Tailwind para layout; mixins de `shared/styles/_form` quando aplicável; `appendTo="body"` nos selects/datepickers dentro do dialog.

> Acesso no front: o botão "Relatório" vive dentro da tela de detalhe do projeto, que já é **gestor-only** (desenvolvedor não acessa a área de projetos). Ainda assim, o backend (`@GestorOnly()`) é a fonte da verdade — nenhuma checagem extra de tipo é necessária no componente.

---

## Arquivos afetados

```
shared/src/enums/relatorio-periodo-tipo.enum.ts                         (novo)
shared/src/enums/relatorio-formato.enum.ts                              (novo)
shared/src/enums/index.ts                                               (exportar os 2 enums)
shared/src/dtos/relatorio/RelatorioExecucaoConsultarDto.ts             (novo)
shared/src/dtos/relatorio/RelatorioExecucaoBaixarDto.ts                (novo)
shared/src/dtos/relatorio/RelatorioExecucaoFiltrarDto.ts              (novo)
shared/src/dtos/relatorio/RelatorioExecucaoLinhaDto.ts               (novo)
shared/src/dtos/relatorio/RelatorioExecucaoDto.ts                    (novo)
shared/src/dtos/relatorio/RelatorioRevisaoSolicitarDto.ts          (novo)
shared/src/dtos/relatorio/RelatorioInconsistenciaDto.ts           (novo)
shared/src/dtos/relatorio/RelatorioRevisaoDto.ts                 (novo)
shared/src/dtos/relatorio/index.ts                              (novo barrel)

backend/src/modules/relatorio/relatorio.module.ts                     (novo)
backend/src/modules/relatorio/controllers/relatorio.controller.ts     (novo)
backend/src/modules/relatorio/services/relatorio.service.ts          (novo)
backend/src/modules/execucao/repositories/execucao.repository.ts    (+ listarParaRelatorio)
backend/src/app.module.ts                                          (registrar RelatorioModule)
backend/src/modules/{execucao,projeto}/*.module.ts               (exports de repositório se faltarem)
backend/package.json                                              (exceljs — se XLSX nesta task)

frontend/src/app/modules/relatorio/services/relatorio.service.ts                         (novo)
frontend/src/app/modules/relatorio/components/relatorio-execucao-dialog/*.{ts,html,scss} (novo)
frontend/src/app/modules/projeto/pages/projeto-detalhe/projeto-detalhe.page.{ts,html}    (botão + dialog)
```

Sem migration — nenhuma mudança de schema.

---

## Verificação

1. `npm run build --workspace=backend` (nest build — cobre o type-check do `shared`) sem erros.
2. `npm run build --workspace=frontend` OK (só warnings pré-existentes de budget/CommonJS).
3. `GET /relatorio/execucao?projetoId=…&periodoTipo=MENSAL&ano=2026&mes=6` retorna `RelatorioExecucaoDto` com `linhas`, `totalExecucoes`, `totalMinutos` e `periodoDescricao` corretos; ANUAL e CUSTOM idem.
4. **Acesso:** gestor recebe todas as execuções do projeto no período; desenvolvedor (qualquer rota de relatório) → **403** (`@GestorOnly()`).
5. `GET /relatorio/execucao/download?...&formato=CSV` baixa um `.csv` que abre no Excel com acentos corretos (BOM) e colunas na ordem definida; o conteúdo bate com o preview.
6. (Se XLSX nesta task) `formato=XLSX` baixa um `.xlsx` válido; senão, retorna `BusinessException` e o front não oferece Excel.
7. `POST /relatorio/execucao/revisar` retorna `RelatorioRevisaoDto` (`resumo` + `inconsistencias[]`) a partir das linhas do período; falha de IA/parse → `BusinessException` tratada, sem derrubar a request.
8. Linguagem: nomes de módulo/arquivo de negócio em português; nada de DTO redefinido fora do `shared`; SELECTs com `is_deleted = false` e parâmetros nomeados; nenhum `VALUES`/`DEFAULT`/alias abreviado.

---

## NÃO implementar nesta task

- **Motor de inconsistências determinístico** (sem IA): detecção algorítmica de sobreposição, dias não úteis (cruzamento com `dia_nao_util`), metas diárias, etc. — a revisão desta task é **IA-only e groundwork**.
- **Chunking/streaming sofisticado** do relatório para a IA além do limite simples de linhas descrito.
- **Agendamento/envio por e-mail** do relatório, histórico de relatórios gerados ou persistência do relatório em tabela (nada de migration).
- **Relatórios de outras entidades** (ponto consolidado, por usuário fora do projeto, por demanda isolada) — escopo é execuções **de um projeto** por período.
- **Filtros adicionais** no relatório (por usuário específico, por demanda, por status) além do período — podem ser uma task futura.
- Alterar o fluxo/colunas da listagem de execuções existente (`execucao-historico`) ou o módulo `assistente` (a revisão vive no novo módulo `relatorio`).
- **Qualquer acesso de desenvolvedor ao relatório** — é exclusivo de gestor (`@GestorOnly()` em todas as rotas); não criar caminho de dev nem restrição por usuário.
