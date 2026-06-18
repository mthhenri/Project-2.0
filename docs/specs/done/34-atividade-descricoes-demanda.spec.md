# 34 — Atividade: botões das três descrições da demanda

**Depende de:** 27 (frontend-atividade)
**Entrega:** na coluna Demanda da listagem de atividades, três botões pequenos que abrem (somente leitura) cada uma das descrições da demanda.

> Frontend apenas. `DemandaService.recuperar` já retorna os três campos — sem backend.

---

## Princípio de UX

As descrições abrem **em dialog na própria listagem** — sem navegar para a tela da demanda.

---

## Contexto

A demanda tem três descrições de texto rico, em `DemandaRecuperadaDto`:
`descricaoCliente`, `descricaoTecnica`, `documentacao`.

Na listagem de atividades, a coluna **Demanda** mostra hoje só o nome da demanda. O `DemandaService`
(módulo demanda, `providedIn: 'root'`) já está injetado na página e tem `recuperar(demandaId)`.

---

## Comportamento esperado

Na coluna **Demanda**, ao lado do nome, adicionar **três botões pequenos** (apenas ícone + tooltip,
sem texto), visualmente **distintos entre si**:

| Botão | Campo | Ícone sugerido | Cor/severidade sugerida |
|---|---|---|---|
| Descrição do cliente | `descricaoCliente` | `pi pi-user` | `info` (azul) |
| Descrição técnica    | `descricaoTecnica` | `pi pi-code` | `help` (roxo) |
| Documentação         | `documentacao`     | `pi pi-book` | `warn` (âmbar) |

> Ícones/cores são sugestões; o importante é serem distintos. Botões pequenos (`size="small"`, `[rounded]="true"` ou `[text]="true"`).

**Ao clicar:**
- Carregar a demanda via `DemandaService.recuperar(atividade.demandaId)`. Usar cache simples por `demandaId` para não refazer a chamada ao alternar entre os três botões da mesma linha.
- Abrir uma dialog (`p-dialog`, modal) exibindo o conteúdo da descrição correspondente como **HTML renderizado** (campos de `p-editor`) — via `[innerHTML]`, no mesmo padrão de exibição de texto rico já usado no projeto.
- Cabeçalho da dialog: nome da demanda + rótulo da descrição (ex.: "Portal do Cliente — Descrição técnica").
- Se o campo correspondente for `null`/vazio, exibir "Sem conteúdo" no corpo. Os três botões aparecem sempre, independentemente de ter conteúdo.

---

## Arquivos afetados

```
frontend/src/app/modules/atividade/pages/atividade-listagem/atividade-listagem.page.ts
frontend/src/app/modules/atividade/pages/atividade-listagem/atividade-listagem.page.html
frontend/src/app/modules/atividade/pages/atividade-listagem/atividade-listagem.page.scss   (se necessário)
```

---

## NÃO implementar nesta task

- Edição das descrições da demanda a partir daqui — os botões são **somente leitura** (edição continua na tela da demanda).
- Indicar visualmente se a descrição tem ou não conteúdo antes de abrir (sem flags no `AtividadeResumoDto`).
