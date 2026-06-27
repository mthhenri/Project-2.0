# Task 74 — Seed dos feriados nacionais de data fixa (recorrentes)

## Objetivo

Popular a tabela `dia_nao_util` com os **feriados nacionais brasileiros de data fixa**
— aqueles que caem **sempre no mesmo dia/mês, todo ano** (Natal, Ano Novo, etc.) — para
que o gestor não precise cadastrá-los manualmente um a um. Todos entram como
`recorrente = true` (a verificação de dia útil já casa por mês/dia em qualquer ano,
ver `CalendarioRepository.ehDiaNaoUtil`), `tipo = FERIADO` e `duracao = INTEGRAL`.

> **Referência:** módulo Calendario (spec `16-calendario-module`), que na seção
> "NÃO implementar" deixou de fora a "Geração automática de feriados nacionais".
> Esta task entrega **apenas o seed dos feriados de data fixa** — não há integração
> com API externa nem cálculo de feriados móveis.

---

## Contexto

A tabela `dia_nao_util` (migrations `20240012` + `20240014`) tem as colunas de negócio
`dia_data DATE`, `descricao VARCHAR(255)`, `tipo VARCHAR(30)` (CHECK
`FERIADO|RECESSO|PONTO_FACULTATIVO`), `recorrente BOOLEAN` e `duracao VARCHAR(20)`
(CHECK `INTEGRAL|MEIO_PERIODO`), além dos campos de BaseEntity.

Para `recorrente = true`, o `ehDiaNaoUtil` casa **apenas mês e dia** (`EXTRACT(MONTH …)`
/ `EXTRACT(DAY …)`), ignorando o ano — então o ano gravado em `dia_data` é apenas uma
referência e **não** afeta o comportamento. Os seeds existentes
(`20240015_seed_usuario_gestor_inicial`, `20240017`/`20240018_seed_tags_padrao*`) já
estabelecem o padrão: o seed é uma **migration idempotente** com `INSERT … SELECT …
WHERE NOT EXISTS` no `up` e remoção das linhas ativas semeadas no `down`.

**Feriados móveis ficam de fora.** Carnaval, Sexta-feira Santa e Corpus Christi dependem
da data da Páscoa e **não** têm dia/mês fixo — não cabem no modelo `recorrente` por
mês/dia e portanto não entram neste seed.

---

## Escopo

### Migration NOVA — `20240021_seed_feriados_nacionais.ts`

Seguir **exatamente** o padrão de `20240017_seed_tags_padrao.ts`:

- Constante `ReadonlyArray` com os feriados (mês/dia + descrição).
- `up`: para cada feriado, `INSERT INTO dia_nao_util (…) SELECT …, NOW(), NOW(), false
  WHERE NOT EXISTS (SELECT 1 FROM dia_nao_util WHERE … is_deleted = false)` — idempotente.
- `down`: remove apenas as linhas **ativas** semeadas (`is_deleted = false`), pelo mesmo
  critério de identidade usado no `WHERE NOT EXISTS`.
- Parâmetros nomeados (`:nome`) — nunca `?` posicional nem interpolação de string.
- Sem `VALUES`, sem `DEFAULT`: a aplicação fornece todos os valores explicitamente
  (`created_date`, `updated_date`, `is_deleted`, `dia_data`, `descricao`, `tipo`,
  `recorrente`, `duracao`).

**Valores fixos para todas as linhas:**
- `tipo = 'FERIADO'`
- `recorrente = true`
- `duracao = 'INTEGRAL'`

**`dia_data`:** usar um **ano de referência fixo** (ex.: `2024`) montando a data
`YYYY-MM-DD`; como `recorrente = true`, só mês/dia importam. Documentar esse fato em
comentário no topo da migration (como o comentário explicativo de `20240017`).

**Critério de idempotência / identidade da linha** (no `WHERE NOT EXISTS` do `up` e no
`down`): casar por **mês e dia** de `dia_data` **e** `recorrente = true` **e**
`is_deleted = false` — assim o seed não duplica um feriado de data fixa já cadastrado,
e não apaga um eventual registro não-recorrente homônimo. Ex.:
```sql
WHERE NOT EXISTS (
  SELECT 1 FROM dia_nao_util
  WHERE dia_nao_util.recorrente = true
    AND dia_nao_util.is_deleted = false
    AND EXTRACT(MONTH FROM dia_nao_util.dia_data) = :mes
    AND EXTRACT(DAY   FROM dia_nao_util.dia_data) = :dia
)
```

### Feriados a semear (data fixa, nacionais)

| dia/mês | descrição                          | base legal |
|---------|------------------------------------|------------|
| 01/01   | Confraternização Universal         | Lei 662/1949 |
| 21/04   | Tiradentes                         | Lei 662/1949 |
| 01/05   | Dia do Trabalho                    | Lei 662/1949 |
| 07/09   | Independência do Brasil            | Lei 662/1949 |
| 12/10   | Nossa Senhora Aparecida            | Lei 6.802/1980 |
| 02/11   | Finados                            | Lei 662/1949 |
| 15/11   | Proclamação da República           | Lei 662/1949 |
| 20/11   | Dia Nacional de Zumbi e da Consciência Negra | Lei 14.759/2024 |
| 25/12   | Natal                              | Lei 662/1949 |

> A coluna "base legal" é só justificativa do recorte — **não** vai para o banco.
> As descrições gravadas são as da coluna "descrição".

---

## Atualização de Documentação (obrigatória)

1. **`docs/CONTEXT.md`** — registrar a task concluída na seção de última atualização
   (migration nova `20240020`, seed dos feriados fixos, idempotência por mês/dia).
2. **`docs/SCHEMA.md`** — se houver seção que documenta dados pré-populados
   (seeds de usuário gestor / tags), acrescentar uma linha sobre os feriados nacionais
   semeados; caso não exista, não criar seção nova.

---

## Verificação

1. `npm run build --workspace=backend` (nest build) sem erros.
2. `npm run db:migrate --workspace=backend` aplica a migration sem erro; consulta
   `SELECT dia_data, descricao, tipo, recorrente, duracao FROM dia_nao_util WHERE recorrente = true`
   retorna as 9 linhas, todas `FERIADO` / `true` / `INTEGRAL`.
3. **Idempotência:** rodar `db:rollback` e `db:migrate` de novo não duplica linhas
   (contagem de feriados recorrentes permanece 9).
4. `GET /api/v1/calendario/verificar?data=2030-12-25` retorna `ehDiaUtil: false`
   (ano arbitrário, casa por mês/dia via `recorrente`); idem `?data=2031-01-01`.
5. Um dia útil comum (ex.: `?data=2030-03-10`, uma quarta-feira) retorna `ehDiaUtil: true`.

---

## NÃO implementar nesta task

- Feriados **móveis** (Carnaval, Sexta-feira Santa, Corpus Christi) — dependem da Páscoa,
  não têm data fixa, fora do modelo `recorrente` por mês/dia.
- Feriados estaduais/municipais.
- Integração com API externa de feriados ou geração automática por ano.
- Qualquer mudança em DTO, service, repository, controller ou frontend — a task é
  **somente** a migration de seed (+ doc).
