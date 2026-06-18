# 35 — Atividade: lista de execuções compacta

**Depende de:** 27 (frontend-atividade)
**Entrega:** a lista "Últimas execuções desta atividade" passa a ocupar uma linha por execução, cabendo mais execuções sem aumentar a dialog.

> Frontend apenas (template + estilo). Sem backend.

---

## Contexto

Na dialog de iniciar/encerrar execução ([atividade-listagem.page.html](../../../frontend/src/app/modules/atividade/pages/atividade-listagem/atividade-listagem.page.html)), a seção
**"Últimas execuções desta atividade"** (`execucoesDialogExecucao`) renderiza hoje cada execução
como um bloco com cabeçalho (data + duração) **mais** um parágrafo de descrição — ocupando muito
espaço vertical, deixando só ~3 execuções visíveis. A aba "Últimas execuções" da dialog de
visualizar usa o mesmo formato.

Pipes disponíveis na página: `MinutosParaHorasPipe` (duração) e `DataBrasileiraPipe` (data).

---

## Comportamento esperado

Tornar a lista **mais compacta**, com cada execução em **uma única linha**:
- conteúdo: **data** · **duração** · **descrição** (tudo na mesma linha);
- duração via `MinutosParaHorasPipe`; execução em andamento (sem `fimData`) mantém o indicador "em andamento" no lugar da duração;
- descrição truncada com ellipsis na linha, com tooltip exibindo o texto completo (padrão já usado no histórico de execução da task 28);
- reduzir paddings/margens entre itens para caber **mais execuções sem aumentar a dialog**; manter o scroll já existente.

Aplicar o **mesmo formato compacto** nas duas listas (dialog de iniciar/encerrar execução e aba
"Últimas execuções" da dialog de visualizar), para consistência.

---

## Arquivos afetados

```
frontend/src/app/modules/atividade/pages/atividade-listagem/atividade-listagem.page.html
frontend/src/app/modules/atividade/pages/atividade-listagem/atividade-listagem.page.scss
```

---

## NÃO implementar nesta task

- Paginação/scroll infinito das execuções (mantém o carregamento atual).
- Mudança no contrato de execução (DTO/endpoint).
