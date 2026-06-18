# 38 — Calendário: Dia Não Útil de Meio Período

**Depende de:** 16 (backend calendário), 17/29 (ponto), 30 (frontend calendário)
**Entrega:** suporte a dia não útil de **meio período** — uma duração que compõe com qualquer tipo (feriado, recesso, ponto facultativo) e reduz a meta diária à metade, **independente de manhã ou tarde**.

---

## Contexto

Hoje `dia_nao_util` tem apenas `tipo` (FERIADO / RECESSO / PONTO_FACULTATIVO) e é sempre **dia inteiro**. O módulo de ponto trata qualquer dia não útil como meta zero (tudo trabalhado vira extra). Esta task adiciona a noção de **duração** — integral ou meio período — sem qualquer distinção de turno.

## Decisões de Design (já validadas)

- Meio período é um **atributo de duração separado**, não um novo valor de `tipo`. Qualquer feriado, recesso ou ponto facultativo pode ser de meio período.
- **Não há distinção manhã/tarde** — meio período é apenas "metade da jornada".
- **Impacto no ponto — meta pela metade:**
  - `metaMinutos do dia = jornada × ½`
  - Trabalho até a meta conta na meta; acima da meta vira extra. O saldo do dia **nunca é positivo** num dia de meio período (espelha o tratamento de dia não útil, onde trabalho excedente é extra e não soma à meta).
  - No mensal, o dia conta como **0,5 dia útil** na meta do mês.
  - Dias **integrais** (úteis ou não úteis) preservam exatamente o comportamento atual.

---

## Shared

### Novo enum — `shared/src/enums/dia-nao-util-duracao.enum.ts`

```typescript
export enum DiaNaoUtilDuracaoEnum {
  INTEGRAL     = 'INTEGRAL',
  MEIO_PERIODO = 'MEIO_PERIODO',
}
```

Exportar no barrel `shared/src/enums/index.ts`.

### DTOs — adicionar campo `duracao`

- `DiaNaoUtilCriarDto` — `@IsEnum(DiaNaoUtilDuracaoEnum) duracao: DiaNaoUtilDuracaoEnum` (obrigatório).
- `DiaNaoUtilAlterarDto` — `@IsOptional() @IsEnum(DiaNaoUtilDuracaoEnum) duracao?: DiaNaoUtilDuracaoEnum`.
- `DiaNaoUtilResumoDto`, `DiaNaoUtilCriadoDto`, `DiaNaoUtilAlteradoDto` — `duracao: DiaNaoUtilDuracaoEnum`.
- `CalendarioDiaNaoUtilMesDto` — adicionar `duracao: DiaNaoUtilDuracaoEnum` (necessário para o cálculo de 0,5 dia útil no mensal).

---

## Banco de Dados

### Nova migration

Adiciona a coluna `duracao` em `dia_nao_util`. Respeitar a regra de **sem DEFAULT** — backfill explícito dos registros existentes:

1. `ALTER TABLE dia_nao_util ADD COLUMN duracao VARCHAR(20)` (nullable temporariamente).
2. `UPDATE dia_nao_util SET duracao = 'INTEGRAL'` (todos os registros existentes são dia inteiro).
3. `ALTER TABLE dia_nao_util ALTER COLUMN duracao SET NOT NULL`.
4. CHECK constraint: `duracao IN ('INTEGRAL', 'MEIO_PERIODO')`.

**Rollback:** `DROP COLUMN duracao` (e a constraint).

---

## Backend — Módulo Calendário

- **Model** `dia-nao-util.model.ts`: campo `duracao: DiaNaoUtilDuracaoEnum`.
- **`CalendarioRepository`:**
  - `inserir` — incluir `duracao` no `INSERT ... SELECT` e no `RETURNING`.
  - `alterar` — incluir `duracao` no SET dinâmico (igual ao tratamento de `tipo`/`recorrente`).
  - `recuperar` / `listar` — SELECT passa a retornar `dia_nao_util.duracao AS "duracao"`.
  - `listarDiasNaoUteisDoMes` — retornar `duracao` junto de `dia` e `tipo`.
- **`CalendarioService`** `criar` / `alterar` — repassar `duracao` ao repositório.

---

## Backend — Módulo Ponto

O núcleo muda de "o dia é útil (booleano)" para "**fração de meta do dia**" (`fracaoMeta` ∈ {0, 0.5, 1}).

- **`resolverInfoDia(data)`** passa a expor a `fracaoMeta`:
  - `1` — dia útil normal (dia de semana, sem registro em `dia_nao_util`).
  - `0` — fim de semana **ou** dia não útil `INTEGRAL`.
  - `0.5` — dia não útil de duração `MEIO_PERIODO`.
  - `motivo` continua preenchido; para meio período, sufixar o motivo (ex.: `'Feriado (meio período)'`).
  - Requer que o repositório/serviço resolva também a **duração** da data (estender `recuperarTipo` para devolver `{ tipo, duracao }` ou criar helper análogo que considere recorrência exata/mensal, como já faz `recuperarTipo`).
- **`montarPontoDiario(usuario, data, infoDia)`:**
  - `metaMinutos = round(horasDiariasNecessarias × 60 × fracaoMeta)`.
  - **Capacidade útil do dia** (minutos que contam na meta):
    - `fracaoMeta === 1` → **ilimitada** (preserva o comportamento atual: saldo pode ser positivo num dia útil integral).
    - `fracaoMeta === 0.5` → limitada a `metaMinutos`.
    - `fracaoMeta === 0` → `0`.
  - `minutosTrabalhadosDiaUtil = min(totalTrabalhado, capacidadeUtil)`.
  - `minutosTrabalhadosExtra   = totalTrabalhado − minutosTrabalhadosDiaUtil`.
  - `saldoMinutos = minutosTrabalhadosDiaUtil − metaMinutos`.

  > Verificação obrigatória: para `fracaoMeta` igual a 0 e 1, o resultado deve permanecer **idêntico** ao comportamento atual. O único caso novo é `0.5`.
- **`consultarMensal`** — `metaMinutosMes` passa a somar **frações** de dia útil: cada dia de semana sem registro = `1`, meio período = `0.5`, integral não útil/fim de semana = `0`. Usar a `duracao` vinda de `listarDiasNaoUteisDoMes`.
- **`verificarDiaUtil`** (`GET /calendario/verificar`) — para um dia de meio período, retornar `ehDiaUtil = false` com `motivo` indicando meio período (ex.: `'Feriado (meio período)'`). Sem novo campo no contrato.

---

## Frontend — Módulo Calendário

- **`dia-nao-util.model.ts`:**
  - `DIA_NAO_UTIL_DURACAO_OPCOES` (Integral / Meio período) e helper `rotuloDuracaoDiaNaoUtil`.
- **`CalendarioListagemPage`:**
  - **Dialog criação/edição** — novo campo **Duração** (`p-select` com Integral / Meio período); default `INTEGRAL` na criação. Incluir `duracao` nos DTOs enviados em `criar`/`alterar`.
  - **Tabela** — indicar meio período (ex.: badge "½ dia" ou coluna Duração) quando `duracao === MEIO_PERIODO`.
  - **Calendário** — o painel de detalhe do dia exibe a duração; opcionalmente diferenciar visualmente o dia marcado de meio período (sufixo no tooltip já basta).

## Frontend — Módulo Ponto

Meta e saldo do dia/mês são calculados no backend — a maior parte é exibição automática.

- `PontoMesDiaComponent` / cards: exibir o `motivo` já sufixado com "(meio período)" e os totais/saldo retornados pelo backend, sem recálculo no frontend.

---

## NÃO implementar nesta task

- Distinção entre manhã e tarde (meio período é sempre "metade da jornada").
- Frações de jornada diferentes de ½ (ex.: ¼ de dia, expediente reduzido configurável).
- Configuração de qual metade do dia é livre.
- Importação de feriados de meio período via API externa.
