# 29 — Ponto: visão "todos hoje" e visão mensal

**Depende de:** 28
**Entrega:** dashboard de ponto com dois modos (todos os usuários hoje / mensal por usuário) — backend + frontend

> **Nota:** esta spec substitui o desenho original (resumo diário de um único dia). Após
> alinhamento, o módulo de ponto passou a ter dois modos de visualização. O resumo de um
> único dia deixa de ser tela standalone — vira conteúdo reaproveitado dentro dos dois modos.

---

## Modos da tela

| Quem | Sem filtro de usuário | Com filtro de usuário |
|---|---|---|
| **Gestor** | **Todos hoje** — grid compacto de todos os usuários ativos, fixo em hoje, sem controle de data | **Mensal** do usuário escolhido |
| **Desenvolvedor** | sempre **Mensal de si mesmo** — sem dropdown de usuário, sem acesso à visão "todos" | — |

- O filtro de data só existe no modo Mensal e é um **seletor de mês/ano** (não dia), com máximo = mês atual (sem meses futuros).
- No modo "Todos hoje" não há seletor de data (fixo em hoje).

---

## Backend (novo)

### Endpoints (`PontoController`)

```
GET /ponto/diario?data=&usuarioId?          → PontoDiarioDto         (já existe — mantido)
GET /ponto/todos?data=                       → PontoDiarioDto[]       (@GestorOnly)
GET /ponto/mensal?ano=&mes=&usuarioId?       → PontoMensalDto
```

- **`/todos`** (gestor): roda a lógica do diário para **cada usuário ativo** e retorna o array. Cada card consome timeline + intervalos + total que `PontoDiarioDto` já carrega.
- **`/mensal`**: desenvolvedor é forçado ao próprio `usuarioId`; gestor escolhe qualquer um. Retorna o cabeçalho com totais do mês + lista de dias resumidos. O detalhe (timeline + intervalos) de um dia é carregado sob demanda reusando `GET /ponto/diario`.

### DTOs novos no `shared/src/dtos/ponto/`

- `PontoTodosConsultarDto` — `{ data: string }` (`@IsDateString`).
- `PontoMensalConsultarDto` — `{ ano: number; mes: number; usuarioId?: number }` (validados; `mes` 1–12).
- `PontoDiaResumoDto` — `{ data: string; ehDiaUtil: boolean; motivoNaoUtil: string | null; primeiroInicioData: Date | null; ultimoFimData: Date | null; totalMinutosTrabalhados: number; saldoMinutos: number }`.
- `PontoMensalDto` — `{ usuarioId; nomeUsuario; ano; mes; diasUteisMes; metaMinutosMes; totalMinutosTrabalhadosMes; saldoMinutosMes; dias: PontoDiaResumoDto[] }`.

### Cálculo do saldo do mês

- `totalMinutosTrabalhadosMes` = soma das execuções **encerradas** do mês.
- `metaMinutosMes` = `horasDiariasNecessarias × diasUteisMes`, onde `diasUteisMes` = dias de semana (seg–sex) do **mês inteiro** **menos** os dias cadastrados em `dia_nao_util` (feriado/recesso/ponto facultativo, exatos ou recorrentes) que caiam em dia de semana.
- `saldoMinutosMes` = `totalMinutosTrabalhadosMes − metaMinutosMes`.
- Saldo por dia (`PontoDiaResumoDto.saldoMinutos`) = `totalMinutosTrabalhados − (ehDiaUtil ? horasDiarias×60 : 0)`.

### Queries novas (cada uma no repositório do seu módulo)

- `ExecucaoRepository.agruparPorDia({ usuarioId, dataInicio, dataFim })` → por dia com execução: `{ dia, primeiroInicioData, ultimoFimData, totalMinutosTrabalhados }` (soma só de execuções encerradas).
- `CalendarioRepository.listarDiasNaoUteisDoMes({ ano, mes })` → `{ dia: number; tipo }[]` com os dias-do-mês não úteis (exatos do ano/mês + recorrentes do mês).

### `PontoService`

- Extrair o núcleo de `consultarDiario` em helpers privados `resolverInfoDia(data)` e `montarPontoDiario(usuario, data, infoDia)`.
- `consultarTodos`: lista usuários ativos, resolve `infoDia` de hoje uma única vez, monta o diário de cada usuário.
- `consultarMensal`: resolve usuário (autorização dev), busca agregação mensal + dias não úteis do mês, constrói todos os dias do mês mesclando, calcula totais e saldo.

---

## Frontend

### `ponto.service.ts`

```typescript
consultarDiario(filtros: PontoConsultarDto): Observable<StandardResponse<PontoDiarioDto>>        // mantido
consultarMensal(filtros: PontoMensalConsultarDto): Observable<StandardResponse<PontoMensalDto>>
consultarTodos(data: string): Observable<StandardResponse<PontoDiarioDto[]>>
```

### Página container

`pages/ponto/ponto.page.ts` decide o modo a partir da sessão (gestor/dev) e do filtro de usuário:

- **Header:** título; dropdown de usuário (só gestor); seletor de mês/ano (só no modo mensal, `maxDate` = mês atual).
- **Modo "Todos hoje"** (gestor, sem usuário): grid de `ponto-usuario-card` (um por usuário ativo). Recarrega ao voltar para a aba.
- **Modo "Mensal"** (gestor com usuário OU desenvolvedor sempre): cards de resumo do mês (`ponto-resumo-card`: Meta, Trabalhado, Saldo) + lista de `ponto-mes-dia`.

### Componentes

- **`ponto-usuario-card`** (novo) — card compacto de um `PontoDiarioDto`: nome, total, saldo do dia, lista compacta de execuções (início→fim + atividade; timer ao vivo via `ExecucaoTimerComponent` para execução sem fim) e total de intervalos. Compacto o suficiente para 5–10 caberem na tela.
- **`ponto-mes-dia`** (novo) — linha de um `PontoDiaResumoDto`: data, dia da semana, início, fim, total, saldo (verde/vermelho). Expansível → chama `consultarDiario({ data, usuarioId })` e renderiza a timeline do dia + `ponto-intervalo-lista`.
- **`ponto-resumo-card`** (mantido) — reaproveitado nos totais do mês.
- **`ponto-intervalo-lista`** (mantido).

### Reaproveitados

`ExecucaoTimerComponent`, `MinutosParaHorasPipe`, `ponto-resumo-card`, `ponto-intervalo-lista`.

---

## Fluxo de dados

- Gestor entra sem filtro → `consultarTodos(hoje)` → grid.
- Seleciona usuário → modo mensal → `consultarMensal({ ano, mes, usuarioId })`.
- Desenvolvedor entra → `consultarMensal({ ano, mes })` (próprio).
- Expandir um dia no mensal → `consultarDiario({ data, usuarioId })` sob demanda.
- Trocar mês → recarrega o mensal. Voltar para a aba (visibilitychange) → recarrega o modo atual.

---

## NÃO implementar nesta task

- Gráfico de horas por projeto/demanda
- Exportação de relatório
- Banco de horas acumulado entre meses
- Edição de execução a partir da tela de ponto (continua no módulo de execução)
