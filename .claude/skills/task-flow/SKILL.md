---
name: task-flow
description: >
  Conduz uma tarefa do início ao fecho auditável: abrir a spec, implementar exatamente o que ela
  define, rodar os gates certos e registrar o resultado em docs/context/ no formato de cada
  arquivo. Use ao começar a task, implementar a spec, concluir, fechar, atualizar o contexto ou
  registrar no histórico — não só quando a palavra "spec" aparece.
---

# Fluxo de Task — Abrir, Implementar, Gates, Fechar

> A regra em si vive em `CLAUDE.md`/`AGENTS.md` ("Fluxo orientado por especificação" e "Gate
> obrigatório de qualidade e conclusão") — em conflito, o documento vence e esta skill é
> corrigida. O que esta skill acrescenta é a **ordem de execução** e os **formatos copiáveis**
> de `docs/context/`.
>
> Destinos e artefatos seguem `docs/SYSTEM.SPEC.md` §3.1, inclusive quando uma skill ou plugin
> externo sugerir suas próprias pastas.
>
> Nota de adoção: ao copiar esta skill para um projeto novo, preencha a tabela de gates da
> seção 3 com os comandos reais (`npm run test`, `pytest`, `go test`, etc.) e apague qualquer
> menção a UI/gate visual se o projeto não tiver front-end.

## 1. Abrir

- Mover `docs/specs/backlog/<tarefa>.spec.md` → `docs/specs/active/`.
- Spec de fase/milestone ou guarda-chuva: **quebrar em tasks numeradas antes de implementar** —
  não implementar o arquivo guarda-chuva direto.
- Spec em `docs/specs/done/` é registro histórico — nunca reescrever, só ler.
- Spec em `docs/specs/discarded/` foi descartada pelo autor: **não implementar** nem puxar para `active/`.
  Para descartar, mova para `discarded/` e acrescente no topo a nota de data e motivo, sem reescrever o corpo.
- Sem spec ainda para o pedido? Escrever uma nova com `docs/specs/TEMPLATE.spec.md` antes de
  tocar código (seções obrigatórias marcadas no próprio template).

- Antes de gravar plano/design/revisão/auditoria, localizar a spec proprietária e usar
  `docs/specs/<estado>/<tarefa>/`. Não aceitar destinos padrão de plugins quando criarem outro
  ciclo. Anexo não é uma segunda spec.
- Antes da verificação, criar `.artifacts/<tarefa>/` para capturas, logs, dumps e cenários
  temporários. Gravar só o relatório textual junto da spec. Não usar `git add -f` para evidência.

## 2. Implementar

Exatamente o que a spec define — sem extrapolar, sem "já que estou aqui". Achado fora do escopo
vira entrada em `PROBLEMS.md` (defeito) ou `IDEAS.md` (melhoria), nunca diff desta task. Para
nomear um contrato/DTO, use a skill `project20-dto-conventions`.

## 3. Gates — comandos reais

| Workspace | Teste focado | Suíte completa | Lint / compilação |
|---|---|---|---|
| `shared` | `cd shared && node --import tsx --test src/<arquivo>.test.ts` | `npm run test --workspace=shared` | compila junto com o consumidor (`npm run build --workspace=backend`) |
| `backend` | `cd backend && node --require ts-node/register --test src/<arquivo>.test.ts` | `npm run test --workspace=backend` | `npm run build --workspace=backend` |
| `frontend` | — (não há testes) | — (não há testes) | `npm run build --workspace=frontend` |

> Raiz: `npm test` roda shared + backend + `repo:test`. Os testes usam `node:test` e ficam em
> `*.test.ts` ao lado do código; no backend, `import * as assert from 'node:assert/strict'` (o
> tsconfig dele não tem `esModuleInterop`). Não há **lint** nem testes no frontend (`PROBLEMS.md`
> P-001): o gate nessas áreas é build + verificação ao vivo (skill `verify`). Declare a lacuna no
> fecho — "sem testes" é uma limitação a relatar, não um item verde.

- Um comando de raiz que roda tudo de uma vez, para o gate de integração/conclusão — não repita
  build/lint/teste sem mudança relevante desde a última rodada.
- Durante a implementação, teste focado no que mudou; suíte ampla e lint completos no gate de
  integração e no fecho.
- Falha existente **antes** da task: relatar separada da falha causada pela task — nunca misturar
  as duas no mesmo relato nem "consertar de passagem" a preexistente sem registrar em
  `PROBLEMS.md`.
- UI/estilo, se o projeto tiver o gate de fidelidade visual documentado: cumprir o processo
  visual obrigatório do `CLAUDE.md`/`AGENTS.md` antes de declarar pronto — build/lint/teste
  verdes não substituem essa etapa.

## 4. Fechar

1. Mover a spec para `docs/specs/done/`, junto da pasta de anexos, corrigindo os ponteiros. Não
   mover avaliação parcial para `done/` só porque já existe relatório.
2. `HISTORY.md`: bloco novo **no topo** (nunca no fim).
3. `CONTEXT.md`: editar **só as seções afetadas** — nunca um bullet de diário acrescentado sem
   reorganizar a seção existente.
4. `PROBLEMS.md`: remover da lista de Ativos todo item que a task corrigiu (o relato da correção
   vai para `HISTORY.md`, não fica repetido aqui).
5. `IDEAS.md`: mover de "Abertas" para "Promovidas" a ideia que virou spec nesta task.
6. `MEMORY.md`: só se algo descoberto sobreviver à tarefa (onde uma regra/código/doc passou a
   viver) — é ponteiro, nunca cópia de conteúdo.

## 5. Fecho auditável

Antes de declarar pronto, listar o que foi verificado e o que ficou pendente. Item sem
verificação obrigatória (gate de teste que não rodou, gate visual não executado) fica **aberto**,
não "concluído" — mesmo que o resto da task esteja pronto.

Rodar `npm run repo:verificar` (ver `scripts/verificar-organizacao.template.mjs`). O relatório
versionado registra resultados e limites e não depende de uma captura ausente para explicar o
veredito.

## Formatos copiáveis de `docs/context/`

O cabeçalho de cada arquivo já traz o bloco oficial — abaixo, só o essencial para não abrir os
três arquivos toda vez. Numeração é sequencial por arquivo e **número removido nunca é
reaproveitado**.

```markdown
### P-0NN — <título curto> · `ABERTO|CONTORNADO|ACEITO` · <área>
- **Sintoma:** — **Causa:** — **Contorno:** — **Correção:** — **Desde:**
```

```markdown
### I-0NN — <título curto> · <área>
- **Ideia:** — **Origem:** — **Por quê:** — **Custo aparente:**
```

`HISTORY.md` não tem bloco de campos fixos — é narrativa livre, mas todo bloco bom cobre: o que
mudou e por quê, o que foi testado (números), o que foi verificado ao vivo (quando aplicável) e —
quando existir — o achado que só apareceu **na** verificação, não antes dela. Título do bloco:
`## AAAA-MM-DD — <task ou assunto>: <resumo de uma linha>`.

## Trabalho que chegou fora do fluxo de spec

Registrar em `HISTORY.md` mesmo assim — um histórico com buraco silencioso é pior que incompleto
sabido.

## Commit

Se o projeto exigir coautoria de agente em commits, todo commit leva o trailer correspondente.
Antes, com os arquivos preparados, `npm run repo:verificar -- --staged` (o modo padrão confere a
árvore local; `--staged` confere o que será de fato commitado). Depois de commitar, confira com `git log -1` ou `git show` que o trailer foi gravado de verdade —
não assuma que a mensagem passada ao comando chegou intacta.
