# 27 — Frontend Ponto

**Depende de:** 26
**Entrega:** dashboard de ponto diário

---

## Arquivos a Criar

```
frontend/src/app/modules/ponto/
  ponto.routes.ts
  pages/
    ponto-diario/
      ponto-diario.page.ts
      ponto-diario.page.html
  components/
    ponto-resumo-card/
      ponto-resumo-card.component.ts
      ponto-resumo-card.component.html
    ponto-intervalo-lista/
      ponto-intervalo-lista.component.ts
  services/
    ponto.service.ts
```

---

## ponto.service.ts

```typescript
consultarDiario(filtros: PontoConsultarDto): Observable<StandardResponse<PontoDiarioDto>>
```

---

## Tela ponto-diario

Página inicial após login. Exibida em `/ponto`.

**Header da página:**
- Date picker para selecionar a data (default = hoje)
- Dropdown de usuário visível apenas para gestores (para consultar ponto de outro dev)

**Cards de resumo** (componente `ponto-resumo-card`):
- **Meta:** `metaMinutos` em horas/minutos
- **Trabalhado:** `totalMinutosTrabalhados` em horas/minutos
- **Saldo:** `saldoMinutos` em horas/minutos — verde se positivo, vermelho se negativo
- **Dia útil:** badge "Dia útil" ou "Fim de semana" / nome do feriado

**Barra de progresso** (`p-progressBar`):
- `value = (totalMinutosTrabalhados / metaMinutos) * 100`
- Cor verde quando ≥ 100%, amarela quando ≥ 80%, vermelha abaixo

**Lista de execuções do dia:**
- `p-timeline` do PrimeNG com cada execução
- Exibe: horário início → fim, atividade (link), duração
- Execuções em andamento (sem `fimData`) exibidas com timer ao vivo usando `ExecucaoTimerComponent`

**Lista de intervalos:**
- Componente `ponto-intervalo-lista`
- Exibe cada intervalo detectado: horário início → fim, duração
- Título "Intervalos detectados (≥ X min)" onde X = mínimo configurado

**Estado sem dados:**
- Se `ehDiaUtil = false` e sem execuções: mensagem "Dia não útil — `motivoNaoUtil`"
- Se `ehDiaUtil = true` e sem execuções: mensagem encorajadora + botão "Iniciar execução"

---

## Fluxo de Dados

Ao entrar na página ou mudar a data:
1. Chamar `ponto.service.consultarDiario({ data, usuarioId? })`
2. Exibir `loading-spinner` durante a chamada
3. Renderizar os cards e listas com os dados retornados

Atualização automática: ao retornar à página após encerrar uma execução
(via `router.events` ou refresh manual com botão), recarregar os dados.

---

## NÃO implementar nesta task

- Resumo semanal ou mensal
- Gráfico de horas por projeto/demanda
- Exportação de relatório
- Banco de horas acumulado entre dias
