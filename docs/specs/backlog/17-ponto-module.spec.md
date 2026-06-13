# 17 — Módulo Ponto

**Depende de:** 15, 16
**Entrega:** resumo diário de horas trabalhadas com cálculo de intervalos

---

## Objetivo

Calcula e retorna o resumo do ponto diário de um usuário: execuções do dia,
horas trabalhadas, intervalos entre execuções e comparativo com a meta.
Não tem tabela própria — consome dados de `execucao`, `atividade` e `dia_nao_util`.

---

## DTOs a Criar em `shared/src/dtos/ponto/`

```typescript
// PontoConsultarDto.ts
data: string              @IsDateString
usuarioId?: number        @IsOptional @IsNumber (gestores podem consultar qualquer um)

// IntervaloDto.ts
inicioData: Date
fimData: Date
duracaoMinutos: number

// PontoDiarioDto.ts — resposta completa do resumo do dia
data: string
usuarioId: number
nomeUsuario: string
ehDiaUtil: boolean
motivoNaoUtil: string | null     // 'Fim de semana' | nome do feriado | null
metaMinutos: number              // horasDiariasNecessarias × 60
minutosTrabalhadosDiaUtil: number // soma das execuções em dias úteis
minutosTrabalhadosExtra: number  // soma das execuções em fins de semana
totalMinutosTrabalhados: number  // minutosTrabalhadosDiaUtil + minutosTrabalhadosExtra
saldoMinutos: number             // totalMinutosTrabalhados - metaMinutos (pode ser negativo)
intervalos: IntervaloDto[]
execucoes: ExecucaoResumoDto[]
```

---

## Sem Repository Próprio

O módulo ponto injeta `ExecucaoRepository` e `CalendarioRepository` diretamente.
Nenhuma query nova precisa ser criada — reutiliza os repositórios existentes.

Métodos necessários que já existem:
- `ExecucaoRepository.listar(filtros)` — para buscar execuções do dia
- `CalendarioRepository.ehDiaNaoUtil(data)` — para verificar se é dia útil

---

## Service — `ponto.service.ts`

```typescript
async consultarDiario(
  dto: PontoConsultarDto,
  usuarioAtivo: JwtPayload,
): Promise<StandardResponse<PontoDiarioDto>>
```

**Regras:**
1. Se desenvolvedor tentar consultar `usuarioId` diferente do próprio → `UnauthorizedAccessException()`
2. Buscar usuário para obter `horasDiariasNecessarias` e `nomeCompleto`
3. Verificar se a data é dia útil via `CalendarioRepository`
4. Buscar todas as execuções do usuário na data informada, ordenadas por `inicio_data`
5. Calcular `totalMinutosTrabalhados`: somar `(fim_data - inicio_data)` em minutos para cada execução encerrada
6. Calcular intervalos: iterar pelas execuções em ordem, identificar gaps entre `fim_data[n]` e `inicio_data[n+1]`, incluir apenas gaps ≥ `INTERVALO_MINIMO_MINUTOS`
7. Se a data for fim de semana ou dia não útil: todos os minutos vão para `minutosTrabalhadosExtra`, `minutosTrabalhadosDiaUtil = 0`
8. Calcular `saldoMinutos = totalMinutosTrabalhados - metaMinutos`
9. Execuções ainda abertas (sem `fimData`) são incluídas na listagem mas não contam nas horas

**Cálculo de intervalos:**

```typescript
private calcularIntervalos(
  execucoes: ExecucaoResumoDto[],
  intervaloMinimoMinutos: number,
): IntervaloDto[] {
  const intervalos: IntervaloDto[] = [];
  const execucoesEncerradas = execucoes.filter(
    (execucao) => execucao.fimData !== null,
  );

  for (let indice = 0; indice < execucoesEncerradas.length - 1; indice++) {
    const fimExecucaoAtual = new Date(execucoesEncerradas[indice].fimData);
    const inicioProximaExecucao = new Date(execucoesEncerradas[indice + 1].inicioData);
    const duracaoMinutos = Math.floor(
      (inicioProximaExecucao.getTime() - fimExecucaoAtual.getTime()) / 60000,
    );

    if (duracaoMinutos >= intervaloMinimoMinutos) {
      intervalos.push({
        inicioData: fimExecucaoAtual,
        fimData: inicioProximaExecucao,
        duracaoMinutos,
      });
    }
  }

  return intervalos;
}
```

O valor de `INTERVALO_MINIMO_MINUTOS` vem do `ConfigService`.

---

## Controller — `ponto.controller.ts`

```
GET /api/v1/ponto/diario → consultarDiario (query params: data, usuarioId?)
```

---

## NÃO implementar nesta task

- Resumo semanal ou mensal
- Exportação de relatório
- Gráficos (frontend)
- Banco de horas acumulado
