# 91 — Ponto: nome do dia não útil na listagem/impressão + revisão de impressão cross-browser

**Depende de:** 17/29 (ponto backend/frontend), 38 (dia não útil / fração de meta), 74 (seed feriados nacionais), 82 (ponto imprimir e justificar)
**Entrega:** duas frentes na tela de **Ponto**:
1. Quando um dia é marcado como não útil (feriado/recesso/ponto facultativo), o **motivo exibido passa a incluir o nome específico** cadastrado no calendário — ex.: em vez de `Feriado`, mostrar `Feriado - Dia do Trabalho` — na visão mensal (usuário filtrado pelo gestor ou o próprio desenvolvedor vendo o próprio ponto) e na **impressão** do espelho de ponto.
2. **Revisão de compatibilidade de impressão** entre navegadores do espelho de ponto (`PontoImpressaoComponent`), corrigindo divergências encontradas (páginas em branco, cores de fundo que não imprimem, quebra de página no meio da tabela/assinaturas, corte horizontal, etc.).

---

## Contexto

Hoje o motivo de dia não útil é derivado só do **tipo** (`TipoDiaNaoUtilEnum`) via `PontoService.mapearTipoParaMotivo` ([ponto.service.ts](../../../backend/src/modules/ponto/services/ponto.service.ts)), que devolve um rótulo fixo por tipo (`'Feriado'`, `'Recesso'`, `'Ponto facultativo'`). O **nome específico do dia** (coluna `dia_nao_util.descricao`, ex.: "Dia do Trabalho", "Confraternização Universal" — ver seed da task 74) nunca chega ao front. O mesmo texto (`motivoNaoUtil`) é usado, sem alteração, em vários lugares:

- `ponto-usuario-card.component.html` ("todos hoje");
- `ponto-mes-dia.component.html` (mensal, badge do dia);
- `ponto-impressao.component.html` (impressão do mês);
- visão diária (`PontoDiarioDto.motivoNaoUtil`), que reusa a mesma função.

`descricao` já existe na tabela `dia_nao_util` (`NOT NULL`) e no DTO de calendário (`DiaNaoUtilResumoDto.descricao`), mas as duas consultas usadas pelo módulo Ponto **não a selecionam**:
- `CalendarioRepository.listarDiasNaoUteisDoMes` (usada em `consultarMensal`) — retorna só `dia`, `tipo`, `duracao` (`CalendarioDiaNaoUtilMesDto`);
- `CalendarioRepository.recuperarTipo` (usada em `resolverInfoDia`, alimenta diário e "todos") — retorna só `tipo`, `duracao` (`DiaNaoUtilInfo`, interface interna do repositório, não um DTO compartilhado).

Sobre impressão: o espelho (`PontoImpressaoComponent`) usa o padrão "esconder a página inteira, mostrar só a folha" — `body * { visibility: hidden }` + `.ponto-impressao { visibility: visible; position: absolute }` (regra global em [styles.scss](../../../frontend/src/styles.scss)). Esse padrão é uma fonte conhecida de divergência entre navegadores: páginas em branco causadas por elementos escondidos que ainda reservam espaço de layout, cores de fundo (`th` cinza, linha `--nao-util`) que alguns navegadores não imprimem por padrão sem `print-color-adjust`, e ausência de qualquer `@page`/`break-inside` que poderia quebrar a tabela do mês ou o bloco de assinaturas no meio. A única verificação registrada até hoje (task 82) foi "Playwright dirigindo o Edge" — nunca testado em outro navegador.

---

## Decisões de escopo

1. **O enriquecimento do motivo é feito na origem (`PontoService`), não em cada template.** Os lugares que exibem `motivoNaoUtil` já interpolam a string tal como o backend devolve; corrigir a única função que a gera (`mapearTipoParaMotivo`, chamada tanto por `resolverInfoDia` quanto por `consultarMensal`) propaga o ganho para diário e "todos hoje" além do mensal/impressão pedidos explicitamente — não é escopo extra, é a mesma correção aplicada uma única vez na fonte.
2. **Formato:** `"<Rótulo do tipo> - <descrição>"` (ex.: `Feriado - Dia do Trabalho`). Quando o dia é meio período, o sufixo existente continua depois: `Feriado - Dia do Trabalho (meio período)`. **Fim de semana não muda** (`'Fim de semana'`) — não vem de `dia_nao_util`, não tem descrição associada.
3. **A revisão de impressão é exploratória, não uma lista fechada de fixes.** A entrega é testar a impressão real (usando o preview de impressão do navegador, não só o layout em tela) em pelo menos Chrome, Edge e Firefox — Safari também, se houver ambiente disponível — e corrigir o que for efetivamente encontrado quebrado, usando as causas conhecidas do padrão atual (listadas no Contexto) como roteiro de verificação, não como diagnóstico presumido a aplicar às cegas.
4. **Fora do escopo:** motor de geração de PDF no servidor (a impressão continua via `window.print()` do navegador); mudança de dados do calendário/seed; qualquer campo novo em DTOs de negócio além do necessário para carregar `descricao` até o front.

---

## Shared

- **`CalendarioDiaNaoUtilMesDto`** ([arquivo](../../../shared/src/dtos/calendario/CalendarioDiaNaoUtilMesDto.ts)) — acrescentar `descricao: string`.
- Nenhum outro DTO muda: `motivoNaoUtil` (em `PontoDiaResumoDto`/`PontoDiarioDto`) já é `string | null` e passa a carregar a string composta; nenhum campo de saída novo é necessário nesses DTOs.

## Backend

### `CalendarioRepository` ([calendario.repository.ts](../../../backend/src/modules/calendario/repositories/calendario.repository.ts))

- **`listarDiasNaoUteisDoMes`** — acrescentar `dia_nao_util.descricao` ao `SELECT DISTINCT` (mantendo os demais campos, `JOIN`s, `WHERE` e `ORDER BY` como estão).
- **`recuperarTipo`** — acrescentar `dia_nao_util.descricao` ao `SELECT`; a interface interna `DiaNaoUtilInfo` ganha `descricao: string`.

### `PontoService` ([ponto.service.ts](../../../backend/src/modules/ponto/services/ponto.service.ts))

- **`mapearTipoParaMotivo`** passa a receber também a `descricao` e compor `"<rótulo> - <descricao>"` em vez de devolver só o rótulo — atualizar as duas chamadas (`resolverInfoDia` e o laço de `consultarMensal`) para passar `diaNaoUtil.descricao`.
- Sem mudança nas fórmulas de fração de meta/meta efetiva/saldo — só o texto do motivo muda.

## Frontend

- **Nenhuma mudança de template esperada** — `ponto-usuario-card`, `ponto-mes-dia` e `ponto-impressao` já interpolam `motivoNaoUtil` diretamente; conferir visualmente que o texto mais longo cabe nos badges/células existentes e ajustar CSS **só** se algo realmente estourar (ex. `white-space`/`overflow` do badge do mensal).

### Revisão de impressão cross-browser (`PontoImpressaoComponent` + regra global em `styles.scss`)

Verificar ao vivo (preview de impressão, não só a tela) em Chrome, Edge e Firefox — e Safari se disponível —, usando dados reais de um mês com dias não úteis, execuções e ao menos uma justificativa. Pontos a checar, a partir das causas conhecidas do padrão `visibility:hidden` + `position:absolute`:
- **Páginas em branco** antes/depois da folha impressa.
- **Cores de fundo não impressas** (`th` cinza, linha `--nao-util`) — se sumirem em algum navegador, avaliar `print-color-adjust: exact` (+ prefixo `-webkit-`) no bloco `.ponto-impressao`.
- **Quebra de página no meio da tabela do mês ou do bloco de assinaturas** — avaliar `break-inside: avoid` nas linhas (`tr`) e no `&__assinaturas`.
- **Corte horizontal** da tabela (data, entrada/saída, intervalos, trabalhado, saldo, motivo/justificativa) em papel retrato — avaliar `@page` (tamanho/orientação/margem) se o conteúdo estourar em algum navegador testado.
- Corrigir apenas o que for **efetivamente observado quebrado** em pelo menos um navegador testado — não aplicar mudanças especulativas em navegadores onde já imprime corretamente.

## NÃO implementar nesta task

- Geração de PDF no servidor ou qualquer alternativa a `window.print()`.
- Edição/cadastro de novos dias não úteis ou mudança no seed de feriados.
- Outros enriquecimentos do motivo além de acrescentar a descrição (ex. ícone por tipo, incluir o ano).
- Correções de impressão em telas fora do espelho de ponto (`PontoImpressaoComponent` é o único ponto de impressão do sistema hoje).
