# 16 — Módulo Calendario

**Depende de:** 07
**Entrega:** gerenciamento de dias não úteis

---

## Objetivo

Módulo simples para cadastro e consulta de dias não úteis (feriados, recessos,
pontos facultativos). Apenas gestores criam e excluem. Todos os autenticados
podem consultar. Finais de semana são tratados como não úteis automaticamente
pela lógica da aplicação, sem necessidade de cadastro.

---

## DTOs a Criar em `shared/src/dtos/calendario/`

```typescript
// DiaNaoUtilCriarDto.ts
diaData: string          @IsDateString
descricao: string        @IsString @IsNotEmpty @MaxLength(255)
tipo: DiaNaoUtilTipoEnum @IsEnum
recorrente: boolean      @IsBoolean

// DiaNaoUtilCriadoDto.ts
id, diaData, descricao, tipo, recorrente, createdDate

// DiaNaoUtilResumoDto.ts
id, diaData, descricao, tipo, recorrente

// DiaNaoUtilAtualizarDto.ts
descricao?: string       @IsOptional
tipo?: DiaNaoUtilTipoEnum @IsOptional @IsEnum
recorrente?: boolean     @IsOptional @IsBoolean

// DiaNaoUtilAtualizadoDto.ts = DiaNaoUtilCriadoDto

// CalendarioConsultarDto.ts — para consultar se uma data é útil
data: string             @IsDateString
```

---

## Model — `dia-nao-util.model.ts`

Campos: `id`, `diaData`, `descricao`, `tipo`, `recorrente`. Mais BaseEntity.

---

## Repository — `calendario.repository.ts`

```typescript
async inserir(dados: DiaNaoUtilInserirDados): Promise<DiaNaoUtilCriadoDto>
async buscarIdentificador(id: number): Promise<DiaNaoUtilCriadoDto | null>
async listar(): Promise<DiaNaoUtilResumoDto[]>
async atualizar(id: number, dados: Partial<DiaNaoUtil>): Promise<DiaNaoUtilAtualizadoDto>
async excluir(id: number): Promise<void>

/**
 * Verifica se uma data específica está cadastrada como não útil.
 * Considera tanto dias exatos quanto recorrentes (mesmo mês/dia, qualquer ano).
 */
async ehDiaNaoUtil(data: Date): Promise<boolean>
```

**SQL de `ehDiaNaoUtil`:**

```sql
SELECT EXISTS (
  SELECT 1
  FROM dia_nao_util
  WHERE is_deleted = false
    AND (
      (recorrente = false AND dia_data = :data)
      OR
      (
        recorrente = true
        AND EXTRACT(MONTH FROM dia_data) = EXTRACT(MONTH FROM :data::DATE)
        AND EXTRACT(DAY FROM dia_data) = EXTRACT(DAY FROM :data::DATE)
      )
    )
) AS eh_dia_nao_util
```

---

## Service — `calendario.service.ts`

```typescript
async criar(dto: DiaNaoUtilCriarDto): Promise<StandardResponse<DiaNaoUtilCriadoDto>>
async listar(): Promise<StandardResponse<DiaNaoUtilResumoDto[]>>
async recuperar(id: number): Promise<StandardResponse<DiaNaoUtilCriadoDto>>
async atualizar(id: number, dto: DiaNaoUtilAtualizarDto): Promise<StandardResponse<DiaNaoUtilAtualizadoDto>>
async excluir(id: number): Promise<StandardResponse<void>>

/**
 * Retorna se uma data é considerada dia útil pelo sistema.
 * Dia útil = não é fim de semana E não está em dia_nao_util.
 */
async verificarDiaUtil(data: string): Promise<StandardResponse<{
  data: string;
  ehDiaUtil: boolean;
  motivo: string | null;  // 'Fim de semana' | 'Feriado' | 'Recesso' | etc.
}>>
```

**Regra de `verificarDiaUtil`:**
1. Se é sábado (getDay() === 6) ou domingo (getDay() === 0) → não é dia útil, motivo = 'Fim de semana'
2. Consultar `ehDiaNaoUtil` no repositório → se encontrado, não é dia útil, motivo = tipo do dia

---

## Controller — `calendario.controller.ts`

```
POST   /api/v1/calendario          @GestorOnly() → criar
GET    /api/v1/calendario          → listar
GET    /api/v1/calendario/:id      → recuperar
PUT    /api/v1/calendario/:id      @GestorOnly() → atualizar
DELETE /api/v1/calendario/:id      @GestorOnly() → excluir
GET    /api/v1/calendario/verificar → verificarDiaUtil (query param: data)
```

---

## NÃO implementar nesta task

- Geração automática de feriados nacionais
- Integração com API de feriados
- Calendário de visualização mensal (frontend)
