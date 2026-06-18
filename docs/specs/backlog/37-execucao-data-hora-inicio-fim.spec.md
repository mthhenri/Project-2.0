# 37 — Execução: data e hora de início e fim na listagem

**Depende de:** 28 (frontend-execucao)
**Entrega:** a tela de Execuções passa a exibir, para cada execução, a **data de início + horário de início** e a **data de fim + horário de fim**, deixando claro quando uma execução começa em um dia e termina em outro.

> Frontend apenas (template + estilo). Sem backend, sem mudança de DTO/endpoint.

---

## Contexto

Na tela de Execuções ([execucao-historico.page.html](../../../frontend/src/app/modules/execucao/pages/execucao-historico/execucao-historico.page.html)),
as colunas **"Início"** e **"Fim"** renderizam hoje apenas o **horário**:

```html
<td>{{ execucao.inicioData | date: 'HH:mm' }}</td>
<td>
  @if (execucao.fimData) { {{ execucao.fimData | date: 'HH:mm' }} }
  @else { <span ...>Em andamento</span> }
</td>
```

O problema: uma execução pode **começar em um dia e terminar no outro** (ex.: início 23:40,
fim 01:15 do dia seguinte). Mostrando só `HH:mm`, o fim "01:15" parece anterior ao início,
sem nenhuma indicação de que pertence a outro dia. A listagem é filtrada por dia (`inicio_data`),
mas o `fim_data` pode cair no dia seguinte.

`ExecucaoResumoDto` já entrega `inicioData: Date` e `fimData: Date | null` — toda a informação
necessária já está disponível, basta exibir a data junto da hora.

Pipes disponíveis no frontend: `DataBrasileiraPipe` ([data-brasileira.pipe.ts](../../../frontend/src/app/shared/pipes/data-brasileira.pipe.ts))
e `DatePipe` do Angular (já importado na página).

---

## Comportamento esperado

Nas colunas **"Início"** e **"Fim"** da tabela, exibir **data + horário**:

- **Início:** data (`dd/MM/yy`) **e** horário (`HH:mm`) de `inicioData`;
- **Fim:** data (`dd/MM/yy`) **e** horário (`HH:mm`) de `fimData`; execução em andamento
  (`fimData` nulo) mantém o indicador **"Em andamento"** no lugar atual;
- a data e o horário devem ficar visualmente distintos (ex.: data em fonte/cor secundária menor
  acima ou ao lado do horário em destaque), de modo que o caso de virada de dia fique evidente
  sem poluir a linha;
- manter o uso de `DatePipe` (`date: 'dd/MM/yy'` e `date: 'HH:mm'`) ou `DataBrasileiraPipe` para a data,
  conforme já praticado no projeto — sem reimplementar formatação de data manualmente.

O dialog de edição (gestor) já usa `p-datepicker` com `[showTime]` para início e fim e **não muda**.

---

## Arquivos afetados

```
frontend/src/app/modules/execucao/pages/execucao-historico/execucao-historico.page.html
frontend/src/app/modules/execucao/pages/execucao-historico/execucao-historico.page.scss
```

---

## NÃO implementar nesta task

- Qualquer mudança em `ExecucaoResumoDto`, no service ou no endpoint de listagem.
- Mudança no filtro por dia ou na navegação entre dias.
- Mudança no dialog de edição de execução.
