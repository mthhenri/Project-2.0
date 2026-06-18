# 42 — Ponto: linhas do filtro mensal compactas

**Depende de:** 29 (frontend-ponto)
**Entrega:** as linhas de dia do filtro mensal do ponto ficam mais compactas, de modo que **o mês inteiro caiba na tela** sem rolagem (ou com rolagem mínima).

> Frontend apenas (template + estilo). Sem backend, sem DTO, sem migration.

---

## Contexto

No modo mensal do ponto ([ponto.page.html](../../../frontend/src/app/modules/ponto/pages/ponto/ponto.page.html)),
cada dia do mês é renderizado por uma instância de
[ponto-mes-dia.component](../../../frontend/src/app/modules/ponto/components/ponto-mes-dia/) —
uma linha (`&__linha`) com semana/número, período início→fim, total, saldo e chevron.

Hoje cada linha usa `padding: 0.625rem 0.875rem`, `gap: 0.75rem` e fontes relativamente grandes
(`&__numero` em `1rem`, total em `0.875rem`). Com 28–31 dias somados aos 3 cards de resumo
(Meta / Trabalhado / Saldo) e ao seletor de mês, **o mês inteiro não cabe na tela** — é preciso
rolar bastante para ver os últimos dias.

---

## Comportamento esperado

Tornar a **linha de dia mais compacta**, reduzindo a altura de cada uma para que o mês inteiro
caiba na tela (alvo: ~31 linhas visíveis junto com os cards de resumo, sem rolagem ou com rolagem
mínima):

- reduzir o **padding vertical** da linha (`&__linha`) e o `gap` entre colunas;
- reduzir as **fontes** de número do dia, semana, período, total e saldo para um tamanho mais denso,
  mantendo legibilidade e a hierarquia visual atual (número do dia ainda em destaque, semana/período
  em `--p-text-muted-color`, saldo positivo/negativo coloridos);
- manter o **grid de colunas** e o alinhamento atuais (semana+número · período · total · saldo · chevron);
- manter intactos o **estado expansível** (clique → `p-timeline` + intervalos), o destaque de dia não
  útil (`--nao-util`), o hover de linha clicável e todos os comportamentos/binds existentes;
- a densidade extra vale **apenas para a linha**; o conteúdo expandido (detalhe) pode manter o
  espaçamento atual.

Ajustar `min-height` / `align-items` se necessário para que as linhas fiquem visualmente uniformes
após a redução.

---

## Arquivos afetados

```
frontend/src/app/modules/ponto/components/ponto-mes-dia/ponto-mes-dia.component.scss
```

(Apenas estilo. Se algum ajuste de marcação for indispensável, também
`ponto-mes-dia.component.html` — mas a meta é resolver no SCSS.)

---

## NÃO implementar nesta task

- Mudança no contrato do ponto (DTO/endpoint) ou no cálculo de meta/saldo.
- Alteração do modo "todos hoje" (cards de usuário) — só o modo mensal.
- Virtual scroll / paginação da lista de dias.
- Remoção de colunas ou de informação da linha (continua mostrando semana, número, período, total e saldo).
