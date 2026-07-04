# 93 — Visualização dos tempos de demanda em dias (preferência no menu do usuário)

**Depende de:** 83 (visão de Planejamento + horas executadas) e seus ajustes de acompanhamento (gradiente, tempo restante); 45 (padrão `TemaService` — preferência em `localStorage` togglada pelo menu do usuário)

**Entrega:** uma opção no **menu do usuário** (o popover do ícone de perfil na topbar) que alterna a **unidade de exibição** dos tempos de **demanda** entre **horas/minutos** (padrão) e **dias**, onde **1 dia = 8 horas**. Com a opção ligada, os tempos de demanda passam a aparecer em dias — ex.: uma demanda "planejada 8h" vira "planejada **1 dia**"; "16h" vira "**2 dias**". A preferência é **puramente de apresentação no frontend** (nenhum valor muda no backend/DB) e fica gravada no **`localStorage`**, **persistindo entre logins** (se um usuário liga e desloga, o próximo usuário no mesmo navegador continua vendo em dias até **desmarcar**).

> Frontend apenas. **Sem** backend, **sem** shared, **sem** migration, **sem** mudança de contrato. Os valores continuam vindo do backend em horas (`horasEstimadas`) e minutos (`minutosExecutados`/`minutosRestantes`); a conversão para dias é só formatação.

---

## Contexto

Hoje os tempos de demanda são exibidos sempre em horas/minutos:

- **Planejamento** ([demanda-planejamento-painel](../../../frontend/src/app/modules/demanda/components/demanda-planejamento-painel/demanda-planejamento-painel.component.html)): legenda `{exec} / {est}h est. ({%}) · restam {restante}`.
- **Lista** ([demanda-arvore-item](../../../frontend/src/app/modules/demanda/components/demanda-arvore-item/demanda-arvore-item.component.html)): `{horasEstimadas}h est.` e `{minutosExecutados} exec.`.
- **Grafo** (tooltip em [demanda-grafo.component.ts](../../../frontend/src/app/modules/demanda/components/demanda-grafo/demanda-grafo.component.ts) — `<title>` d3): `{est}h estimadas • {exec}h executadas`.
- **Detalhe da demanda** ([demanda-detalhe-dialog](../../../frontend/src/app/modules/demanda/components/demanda-detalhe-dialog/demanda-detalhe-dialog.component.html)): campo "Horas Estimadas" = `{horasEstimadas}h`.

A formatação de minutos usa o pipe existente `minutosParagHoras` (`MinutosParaHorasPipe`, retorna `"{h}h {min}min"`). As **horas estimadas** vêm inteiras (`horasEstimadas: number`) e são renderizadas como `"{h}h"`.

O padrão de preferência-em-`localStorage`-com-toggle-no-menu **já existe** no `TemaService` ([tema.service.ts](../../../frontend/src/app/core/services/tema.service.ts)) + botão no popover de perfil da [topbar](../../../frontend/src/app/shared/layout/topbar/topbar.component.html) (linhas ~59-68). Esta task espelha esse padrão.

---

## Decisões de escopo (registradas)

1. **1 dia = 8 horas**, fixo por ora numa constante `HORAS_POR_DIA = 8`. **Não** é configurável nesta task (nem por usuário, nem por projeto). Serve de base para conversão e para o padrão pedido.
2. **Padrão = horas/minutos.** Sem valor em `localStorage`, a preferência começa **desligada** (h/min). Precisa ser **marcada** para ver em dias.
3. **Persistência entre usuários.** A chave fica no `localStorage` do **navegador**, não vinculada ao usuário logado. O `logout` **não** pode apagá-la (mesma garantia que o tema já tem hoje — o logout só limpa as chaves de autenticação). Consequência intencional: o próximo usuário herda a preferência até **desmarcar**.
4. **"Tudo em dias" na demanda.** Com a opção ligada, viram dias os **três** tempos de demanda: **estimado**, **executado** e **restante** — na **Planejamento**, na **Lista** e no **Grafo**; e o **estimado** no **Detalhe**. (Escolha do usuário sobre as duas alternativas mais restritas.)
5. **Fora de escopo (sempre h/min, nunca dias):** durações de trabalho que **não são tempos de planejamento de demanda** — **Ponto** (horas trabalhadas/meta), **histórico de Execuções**, **listagem de Atividades**, **relatórios**, e as **durações por atividade** listadas *dentro* do dialog de detalhe da demanda ([demanda-detalhe-dialog.html:233](../../../frontend/src/app/modules/demanda/components/demanda-detalhe-dialog/demanda-detalhe-dialog.component.html#L233), `atividade.totalMinutosExecutados`). Converter essas para dias produziria coisas como "0,03 dia" e não é o que a feature pede. **O pipe global `minutosParagHoras` NÃO é alterado** — a conversão é aplicada só nos pontos de demanda listados abaixo.
6. **Campos de edição continuam em horas.** Os `p-inputnumber` de `horasEstimadas` nos dialogs de **criação** ([demanda-formulario-dialog](../../../frontend/src/app/modules/demanda/components/demanda-formulario-dialog/demanda-formulario-dialog.component.html)) e **edição** ([demanda-edicao-dialog](../../../frontend/src/app/modules/demanda/components/demanda-edicao-dialog/demanda-edicao-dialog.component.html)) **não** mudam — digita-se em horas (evita entrada fracionária de dias e mantém o contrato). A preferência afeta só **exibição read-only**.
7. **Sem regressão no modo horas.** Com a opção **desligada** (padrão), a renderização é **byte-a-byte igual à de hoje**. A formatação nova só entra no modo dias.
8. **Reatividade.** Alternar a opção atualiza na hora as telas visíveis que leem tempos de demanda (via signal). Exceção aceitável: o `<title>` do **grafo** (d3) reflete a preferência **no momento do desenho** — reabrir/re-render do grafo pega o valor novo; não precisa redesenhar o grafo ao togglar.
9. **Tooltip mostra o horário.** No **modo dias**, passar o mouse sobre um tempo de demanda exibe, via tooltip, o **valor em h/min** correspondente (ex.: hover em `2 dias` → `16h 0min`; em `0,5 dias` → `4h 0min`). No **modo horas** não há tooltip novo (o valor já é o horário). O texto do tooltip reusa `formatarTempoDemanda(valor, false, unidade)`.

---

## Formatação em dias

`dias = minutos / (HORAS_POR_DIA * 60)`. Regras de texto (pt-BR):

- Vírgula decimal, **até 2 casas**, zeros à direita omitidos.
- **Singular** só quando o valor for exatamente `1` ("1 dia"); caso contrário **plural** ("2 dias", "0,5 dias", "1,25 dias", "0 dias").

| entrada | dias | texto |
|---|---|---|
| 8h (480min) | 1 | `1 dia` |
| 16h | 2 | `2 dias` |
| 4h | 0,5 | `0,5 dias` |
| 6h | 0,75 | `0,75 dias` |
| 2h | 0,25 | `0,25 dias` |
| 11h 1min (661min) | ~1,38 | `1,38 dias` |
| 0 | 0 | `0 dias` |

---

## Frontend

### Novo: preferência em `core/`

**`core/models/visualizacao-tempo.model.ts`**
- `HORAS_POR_DIA = 8`.
- `VISUALIZACAO_TEMPO_CHAVE_LOCAL_STORAGE = 'preferencia.tempo-em-dias'`.
- Função pura `formatarTempoDemanda(valor: number, emDias: boolean, unidade: 'horas' | 'minutos'): string`:
  - `emDias === false` → **reproduz o formato atual**: `'horas'` → `` `${valor}h` ``; `'minutos'` → `"{h}h {min}min"` (mesma lógica do `MinutosParaHorasPipe`).
  - `emDias === true` → converte para minutos (`unidade === 'horas' ? valor*60 : valor`) e formata em dias pelas regras acima.

**`core/services/visualizacao-tempo.service.ts`** (espelha `TemaService`, `providedIn: 'root'`)
- Signal privado `emDiasSelecionado = signal<boolean>(this.lerSalvo())`.
- `readonly emDias = computed(() => this.emDiasSelecionado())`.
- `definir(emDias: boolean)` → set + `localStorage.setItem(chave, String(emDias))`.
- `alternar()` → `definir(!emDiasSelecionado())`.
- `lerSalvo()` → `localStorage.getItem(chave) === 'true'` (ausente/qualquer outro = `false`).

### Novo: pipe

**`shared/pipes/tempo-demanda.pipe.ts`** — `TempoDemandaPipe` (name `tempoDemanda`, standalone, **puro**):
```
transform(valor: number, emDias: boolean, unidade: 'horas' | 'minutos'): string
  → formatarTempoDemanda(valor, emDias, unidade)
```
Puro de propósito: recebe `emDias` como **argumento** (lido do signal no template), então re-executa quando a preferência muda, sem ser impuro.

Uso nos templates: `{{ horasEstimadas | tempoDemanda: unidadeTempo.emDias() : 'horas' }}` e `{{ minutosExecutados | tempoDemanda: unidadeTempo.emDias() : 'minutos' }}`, com o componente injetando `readonly unidadeTempo = inject(VisualizacaoTempoService)`.

**Tooltip do horário (modo dias, Decisão #9):** no mesmo elemento, `[pTooltip]="unidadeTempo.emDias() ? (valor | tempoDemanda: false : unidade) : ''"` — em dias o tooltip traz o h/min; em horas o tooltip fica vazio (não aparece). Ex.: `<span [pTooltip]="unidadeTempo.emDias() ? (linha.horasEstimadas | tempoDemanda: false : 'horas') : ''">{{ linha.horasEstimadas | tempoDemanda: unidadeTempo.emDias() : 'horas' }} est.</span>`. Onde já existe `pTooltip` (ex.: `demanda-planejamento__restante`), concatenar o h/min no texto quando em dias, sem perder o tooltip atual.

### Topbar — opção no menu do usuário

Em [topbar.component.html](../../../frontend/src/app/shared/layout/topbar/topbar.component.html), dentro do `perfilPopover` (bloco `@if (sessao.usuarioAtual())`), adicionar um botão análogo ao de tema:
```html
<button type="button" class="topbar__unidade flex items-center gap-2 text-sm" (click)="unidadeTempo.alternar()">
  <i class="text-xs" [class]="unidadeTempo.emDias() ? 'pi pi-clock' : 'pi pi-calendar'"></i>
  <span>{{ unidadeTempo.emDias() ? 'Ver em horas' : 'Ver em dias' }}</span>
</button>
```
[topbar.component.ts](../../../frontend/src/app/shared/layout/topbar/topbar.component.ts): `readonly unidadeTempo = inject(VisualizacaoTempoService)`. Disponível para **todos** os usuários (é preferência pessoal de exibição; horas de demanda aparecem também para desenvolvedores).

### Pontos de exibição a converter (injetar `VisualizacaoTempoService` em cada um)

1. **`demanda-planejamento-painel`** — na legenda: `minutosExecutados` (`:'minutos'`), `horasEstimadas` (`:'horas'`, substituindo o literal `{{ linha.horasEstimadas }}h est.` por `{{ linha.horasEstimadas | tempoDemanda: ... : 'horas' }} est.`), `minutosRestantes` (`:'minutos'`). `%`, `estourou`, `corBarra` e "sem estimativa"/"restam —" **inalterados**.
2. **`demanda-arvore-item`** — `horasEstimadas` (`:'horas'`) e `minutosExecutados` (`:'minutos'`).
3. **`demanda-grafo.component.ts`** — no builder do `<title>`, injetar o service e usar `formatarTempoDemanda(no.horasEstimadas, emDias, 'horas')` e `formatarTempoDemanda(no.minutosExecutados, emDias, 'minutos')`; ajustar o texto (ex.: `"{est} estimadas • {exec} executadas"` continua, só muda a unidade). Ler `this.unidadeTempo.emDias()` no momento do desenho. Como o `<title>` **é** a própria tooltip nativa, em modo dias incluir o h/min entre parênteses (ex.: `2 dias (16h 0min) estimadas`) — assim o hover mostra o horário sem elemento extra.
4. **`demanda-detalhe-dialog`** — campo "Horas Estimadas": `{{ demanda()!.horasEstimadas | tempoDemanda: unidadeTempo.emDias() : 'horas' }}` (rótulo "Horas Estimadas" pode virar só "Estimado" para não fixar unidade — opcional). A duração **por atividade** na lista interna (`totalMinutosExecutados`) **fica em h/min** (Decisão #5).

Rótulos com "h"/"est." nos templates: onde o sufixo `h` estava **colado** ao número (ex.: `{{...}}h`), passar a vir **de dentro** do pipe (o pipe já devolve a unidade). Ajustar os templates para não duplicar "h"/"dias".

---

## Arquivos afetados

```
frontend/src/app/core/models/visualizacao-tempo.model.ts                    (novo: constantes + formatarTempoDemanda)
frontend/src/app/core/services/visualizacao-tempo.service.ts                 (novo: signal + localStorage)
frontend/src/app/shared/pipes/tempo-demanda.pipe.ts                          (novo: TempoDemandaPipe)
frontend/src/app/shared/layout/topbar/topbar.component.ts                    (inject service)
frontend/src/app/shared/layout/topbar/topbar.component.html                  (botão no popover de perfil)
frontend/src/app/modules/demanda/components/demanda-planejamento-painel/…    (est/exec/restante via pipe)
frontend/src/app/modules/demanda/components/demanda-arvore-item/…            (est/exec via pipe)
frontend/src/app/modules/demanda/components/demanda-grafo/demanda-grafo.component.ts   (tooltip via função)
frontend/src/app/modules/demanda/components/demanda-detalhe-dialog/…         (estimado via pipe)
```

Sem backend, sem shared, sem migration.

---

## Verificação

1. `npm run build --workspace=frontend` sem erros novos.
2. **Padrão (sem `localStorage`)**: tudo em h/min, **idêntico** ao atual (Decisão #7).
3. **Menu do usuário**: abrir o popover de perfil → existe a opção "Ver em dias"; clicar alterna o rótulo para "Ver em horas".
4. **Ligado**: na **Planejamento**, uma demanda de 8h estimadas mostra `1 dia est.`; 16h → `2 dias`; 4h → `0,5 dias`. Executado e restante também em dias; `%` e barra (cor/estouro) inalterados; "sem estimativa" e "restam —" inalterados.
5. **Lista** e **Grafo** (tooltip, ao reabrir/redesenhar) mostram estimado/executado em dias.
6. **Detalhe** mostra "Horas Estimadas" em dias; as durações **por atividade** dentro do dialog continuam em **h/min**.
7. **Fora de escopo intactos**: Ponto, histórico de Execuções, listagem de Atividades e relatórios seguem em h/min com a opção ligada.
8. **Reatividade**: com a Planejamento aberta, togglar no menu atualiza a tabela na hora (sem reload).
8b. **Tooltip do horário (modo dias)**: hover sobre `2 dias` mostra `16h 0min`; sobre `0,5 dias`, `4h 0min`. No modo horas não surge tooltip novo. No grafo, o hover do nó traz o horário entre parênteses.
9. **Persistência entre logins**: ligar → **deslogar** → logar com **outro** usuário no mesmo navegador → continua em dias; desmarcar volta para h/min. (Confirmar que `AutenticacaoService.logout` não remove a chave `preferencia.tempo-em-dias`.)
10. **Reload**: com a opção ligada, F5 mantém em dias (lida do `localStorage`).

---

## NÃO implementar nesta task

- **Backend/shared/migration** — nenhum. Valores continuam em horas/minutos no contrato.
- **Configurar horas-por-dia** (por usuário/projeto/global) — fixo em 8; eventual configuração é outra task.
- **Converter durações fora da demanda** (Ponto, Execuções, Atividades, relatórios, durações por atividade no detalhe) — Decisão #5.
- ~~**Alterar os inputs de `horasEstimadas`** nos dialogs de criar/editar — Decisão #6.~~ **Revogado no ajuste pós-entrega abaixo.**
- **Alterar o pipe global `minutosParagHoras`** ou seu comportamento atual.
- **Redesenhar o grafo ao togglar** — o tooltip pega a preferência no próximo desenho (Decisão #8).

---

## Ajuste pós-entrega (mesma sessão) — estimativa **em dias** nos formulários

A pedido do usuário, a preferência **também** vale nos **formulários de criar e editar demanda** (revoga a Decisão #6). Com a opção em dias:

- Rótulo vira **"Dias Estimados"**; o `p-inputnumber` aceita **decimais** (passo `0.5`, `maxFractionDigits=2`, `locale="pt-BR"` → vírgula) com sufixo `" dia(s)"`. Em horas, permanece **idêntico** (inteiro, passo 1, sufixo `h`/vazio).
- **Conversão para horas no envio** (`Math.round(valor * HORAS_POR_DIA)`) — o backend continua recebendo/armazenando **horas**, sem mudança de contrato. Ex.: `1,5 dias → 12h`, `4 dias → 32h`.
- Na **edição**, ao abrir com a opção em dias, o valor em horas é convertido para dias na exibição (`horas / HORAS_POR_DIA`).
- Arquivos: `demanda-formulario-dialog.component.{ts,html}`, `demanda-edicao-dialog.component.{ts,html}`.
- **Verificado ao vivo:** em dias, criar com `1,5 dias` → `POST /demanda` com `horasEstimadas: 12` (demanda de teste removida em seguida).

### Tempo executado da **atividade** em dias (revoga parcialmente a Decisão #5)

A pedido do usuário, o **tempo executado total da atividade** (`totalMinutosExecutados`) também passa a aparecer em dias: coluna **"Tempo executado"** da listagem de atividades (`atividade-listagem`) e o total por atividade dentro do dialog de detalhe da demanda (`demanda-detalhe-dialog`, linha do `pi-clock`). Ambos com o mesmo `tempoDemanda` + tooltip do h/min no hover. **Continuam em h/min** (fora do "das atividades"): as durações de **cada execução** (`duracaoMinutos`) nas sub-listas de execução (0,05 dias p/ 24min é ruim), o **Ponto** (frequência) e o **histórico de Execuções**. **Verificado ao vivo:** listagem em dias → "0,04 dias", "20,33 dias", "1,05 dias".

### Renomeação (pós-entrega) — o pipe passou a cobrir demanda **e** atividade

Como a formatação passou a servir também o tempo executado de atividade, os identificadores foram renomeados de `*Demanda*` para `*Exibicao*` (nome neutro): `tempo-demanda.pipe.ts` → **`tempo-exibicao.pipe.ts`**, `TempoDemandaPipe` → **`TempoExibicaoPipe`**, pipe `tempoDemanda` → **`tempoExibicao`**, função `formatarTempoDemanda` → **`formatarTempoExibicao`**. As menções acima ao nome antigo referem-se ao estado no momento da implementação.
