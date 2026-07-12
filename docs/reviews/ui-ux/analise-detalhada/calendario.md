# Calendário — dias não úteis (listagem/gestão) (/calendario (só gestor))

## Fluxos atuais
- **Cadastrar 1 dia não útil pelo botão do header (ex.: Natal)** (7 cliques): Clicar 'Novo Dia Não Útil' → clicar no campo/ícone Data → navegar até o mês (0–2 cliques) → clicar no dia → clicar em Descrição e digitar → (opcional: clicar Recorrente) → clicar Salvar. Sem autofocus e sem Enter, tudo a mouse.
- **Cadastrar via duplo clique no calendário (atalho existente, porém invisível)** (4 cliques): Navegar até o mês (0–2 cliques) → duplo clique no dia vazio (2 cliques) → clicar em Descrição e digitar → clicar Salvar. O usuário só descobre por acaso; clique simples em dia vazio não faz nada.
- **Carga anual: cadastrar os ~12 feriados nacionais do ano** (72 cliques): Repetir o fluxo completo 12 vezes (dialog abre e fecha a cada item, sem 'salvar e adicionar outro' nem importação).
- **Editar um dia (ex.: trocar duração para meio período)** (4 cliques): Localizar a linha na tabela → clicar no lápis → abrir o select Duração → escolher opção → clicar Salvar.
- **Excluir um dia** (2 cliques): Clicar na lixeira → confirmar 'Excluir' no dialog modal bloqueante (que ainda avisa, incorretamente, que 'não pode ser desfeita' num sistema de soft delete).
- **Consultar/planejar dezembro do ano seguinte (estando em julho)** (5 cliques): 17 cliques na seta de próximo mês, OU clicar no título mês/ano do datepicker para trocar ano e mês (2–3 cliques) — recurso do PrimeNG sem nenhuma affordance; não há botão 'Hoje' nem visão anual.
- **Ver o que é determinado dia marcado** (1 cliques): Hover no badge (tooltip) ou 1 clique para destacar/rolar até a linha da tabela; nenhuma ação direta (editar/excluir) a partir do calendário com clique simples.

## Problemas
- [ALTA] P1: Sem cadastro em série/lote: a tarefa mais comum desta tela (carga anual de feriados) exige reabrir o dialog inteiro a cada item (~72 cliques para 12 feriados). Não existe 'Salvar e adicionar outro' nem qualquer ação em massa.
- [ALTA] P2: A interação principal no ponto de decisão é invisível: criar/editar a partir do calendário exige DUPLO clique, sem nenhuma affordance (nenhum hint, cursor ou hover de '+'). Clique simples em dia vazio não faz nada — desperdiça o gesto mais natural da tela.
- [ALTA] P3: Dialog hostil ao teclado: sem autofocus no primeiro campo, sem submit com Enter (form sem ngSubmit), obrigando 100% mouse; o datepicker do campo Data ainda exige clique extra para abrir mesmo quando a data já poderia vir pré-preenchida do contexto (dia clicado/mês exibido).
- [MEDIA] P4: Exclusão com modal de confirmação bloqueante e mensagem factualmente errada ('Esta ação não pode ser desfeita') num sistema com soft delete em tudo. Padrão moderno de menor esforço seria excluir direto + toast com 'Desfazer'.
- [MEDIA] P5: Sem feedback otimista: cada criar/alterar/excluir dispara refetch completo (buscarDias) que liga o spinner e faz a tabela inteira piscar; após salvar, o calendário não navega para o mês do item salvo nem destaca a linha recém-criada — o usuário perde o contexto do que acabou de fazer.
- [MEDIA] P6: Navegação temporal lenta: sem botão 'Hoje', sem seletor de ano visível, sem visão anual; planejar o ano seguinte exige avançar mês a mês ou descobrir sozinho o clique no título do datepicker.
- [MEDIA] P7: Empty state não acionável: só ícone + 'Nenhum dia não útil neste mês', sem botão de cadastrar nem dica do atalho do calendário — viola o critério de empty state com ação principal.
- [MEDIA] P8: Corrigir uma data errada custa caro: como o backend não permite alterar diaData (DiaNaoUtilAlterarDto sem o campo), o usuário precisa excluir + confirmar + recriar do zero (~8 cliques); a UI não oferece nem um atalho 'Excluir e recriar' que pré-preencha o formulário.
- [MEDIA] P9: Cores sem legenda: os 3 tipos (feriado/recesso/facultativo) e as 2 durações (bolinha cheia vs. anel) são codificados só por cor/forma no calendário, decifráveis apenas via tooltip de hover — ruim para aprendizado e acessibilidade (não funciona em touch).
- [BAIXA] P10: Densidade baixa na tabela: colunas 'Duração' e 'Recorrente' inteiras para informação binária que caberia como badges compactos junto ao Tipo; a coluna Data repete o mês que já está no título do card.
- [BAIXA] P11: Sem atalhos de teclado na página (ex.: 'N' para novo) e sem indicação deles; a única aceleração existente (duplo clique) não é comunicada em lugar nenhum.
- [BAIXA] P12: Loading substitui a tabela inteira por spinner (layout shift); skeleton rows manteriam a estrutura estável.
- [BAIXA] P13: Ampliação do calendário via `zoom: 1.75` com ::ng-deep é frágil (renderização borrada em alguns navegadores, quebra com mudanças do PrimeNG); o dimensionamento deveria vir de tokens/fonte.
- [BAIXA] P14: Ícone 'check' verde na coluna Recorrente comunica estado apenas por cor/ícone com tooltip; e o hint informativo do checkbox Recorrente no dialog aparece como banner p-message que empurra o layout ao marcar — bastaria um texto auxiliar fixo curto.

## Sugestões (VERIFICAR: checar vs regras de negócio)
### S1 — Clique único no calendário cria/edita no ponto de decisão [impacto alto]
Clique simples em dia VAZIO abre imediatamente o dialog de criação com a Data já preenchida e foco na Descrição. Clique simples em dia MARCADO abre um popover ancorado na célula com resumo (descrição, tags de tipo/duração/recorrente) e botões 'Editar' e 'Excluir' — agir onde o dado é visto, sem caçar a linha na tabela. Hover em dia vazio mostra um '+' fantasma (affordance). O duplo clique deixa de ser necessário.
_Redução de esforço:_ criação: de ~7 para 3 cliques (dia → digitar → Enter); editar via calendário: 2 cliques

### S2 — Dialog com autofocus + Enter salva + Esc cancela [impacto alto]
Form com (ngSubmit)='salvar()', botão Salvar type=submit, autofocus na Descrição quando a Data vem pré-preenchida (ou na Data no fluxo do botão do header). Permite cadastrar sem tocar no mouse depois de abrir o dialog.
_Redução de esforço:_ de 6–7 para 3 interações por cadastro; fluxo 100% teclado

### S3 — Botão 'Salvar e adicionar outro' (cadastro contínuo) [impacto alto]
Terceiro botão no footer do dialog de criação: salva via criar() e reabre o form limpo (mantendo Tipo/Duração/Recorrente do último salvo como default inteligente), com foco de volta na Data. Atalho Ctrl+Enter. Resolve a carga anual de feriados sem nova feature de backend.
_Redução de esforço:_ carga de 12 feriados: de ~72 para ~40 cliques (e de 12 aberturas de dialog para 1)

### S4 — Excluir sem modal: ação direta + toast 'Desfazer' [impacto medio]
Remover o p-confirmDialog. Clicou na lixeira → remove otimisticamente da lista/calendário e mostra toast 'Natal excluído — Desfazer' por ~6s; o undo recria via criar() com os mesmos dados (viável com o backend atual). Alinha a UI ao soft delete real do sistema.
_Redução de esforço:_ de 2 cliques + modal bloqueante para 1 clique; erro é reversível

### S5 — Atualização otimista + manter contexto após salvar [impacto medio]
Atualizar o signal diasNaoUteis localmente após criar/alterar/excluir (refetch silencioso em background, sem ligar o spinner). Após salvar, navegar o calendário para o mês do dia salvo e destacar a linha na tabela (reusar diaDestacadoId). Loading inicial vira skeleton de 4–5 linhas em vez de spinner que some com a tabela.
_Redução de esforço:_ zero flashes/recarregamentos percebidos; elimina a busca visual pós-salvar

### S6 — Navegação temporal rápida: 'Hoje' + seletor de ano explícito [impacto medio]
Barra acima do calendário com botão 'Hoje' e stepper de ano ('‹ 2026 ›') que troca o ano mantendo o mês; o título 'Dezembro de 2026' da tabela vira também controle clicável (mesmo overlay mês/ano do PrimeNG). 
_Redução de esforço:_ ir a dezembro do ano seguinte: de 17 (ou 5) cliques para 2; voltar ao mês atual: 1 clique

### S7 — Empty state acionável [impacto medio]
No mês sem registros: ícone + 'Nenhum dia não útil em Julho de 2026' + botão primário 'Cadastrar dia não útil' (abre o dialog com o mês exibido pré-selecionado no datepicker) + dica secundária 'ou clique em um dia no calendário ao lado'.
_Redução de esforço:_ primeira ação a 1 clique do estado vazio, sem voltar ao header

### S8 — Legenda de cores/formas sob o calendário [impacto baixo]
Linha de legenda fixa: ● Feriado, ● Recesso, ● Ponto Facultativo (cores dos badges) e ◐/○ 'anel = meio período'. Elimina a dependência do tooltip para decodificar o calendário.
_Redução de esforço:_ 0 hovers para entender o mapa; acessível em touch

### S9 — Tabela mais densa: badges na linha, menos colunas [impacto baixo]
Fundir 'Duração' e 'Recorrente' em badges compactos ao lado do Tipo (tag 'Meio período' quando aplicável; tag/ícone '↻ Todo ano' para recorrente). Coluna Data exibe 'qui, 24/12'. Ações permanecem à direita, visíveis (não só em hover), mantendo o padrão das outras telas.
_Redução de esforço:_ leitura da linha num único passo de varredura; menos largura ocupada

### S10 — Atalho 'Excluir e recriar' para corrigir data [impacto baixo]
No dialog de edição, junto ao hint 'A data não pode ser alterada', link 'Precisa corrigir a data? Excluir e recriar' que exclui o registro e reabre o dialog de criação pré-preenchido com todos os dados (só a data editável). Contorna a limitação do DiaNaoUtilAlterarDto sem mudança de backend.
_Redução de esforço:_ correção de data: de ~8 cliques + redigitação para 3 cliques sem redigitar


## REDESIGN SPEC
# Redesign — Calendário de Dias Não Úteis (`/calendario`, só gestor)

Angular 21 + PrimeNG (tema Aura, primário azul) + Tailwind. Tema claro/escuro. Toasts em bottom-center. Nenhum dado novo de backend: tudo usa `DiaNaoUtilResumoDto { id, diaData, descricao, tipo, duracao, recorrente }`, `criar()`, `alterar()` (sem `diaData`), `excluir()`.

## Layout geral

Página com padding 1.5rem. Grid de 2 colunas (`~420px | 1fr`, empilha em <900px):

```
┌──────────────────────────────────────────────────────────────────────┐
│ Dias Não Úteis                       [ + Novo Dia Não Útil ]  (N)    │
├──────────────────────┬───────────────────────────────────────────────┤
│ [Hoje]  ‹ 2026 ›     │  Dezembro de 2026 ▾            3 registros    │
│ ┌──────────────────┐ │ ┌───────────────────────────────────────────┐ │
│ │  Dezembro 2026   │ │ │ Data       Descrição      Tipo    Ações   │ │
│ │  calendário      │ │ │ qui,24/12  Véspera de …   badges  ✎ 🗑    │ │
│ │  mensal grande   │ │ │ sex,25/12  Natal          badges  ✎ 🗑    │ │
│ └──────────────────┘ │ │ qui,31/12  Véspera de …   badges  ✎ 🗑    │ │
│ ● Feriado ● Recesso  │ └───────────────────────────────────────────┘ │
│ ● Facultativo        │                                               │
│ ○ anel = meio período│                                               │
└──────────────────────┴───────────────────────────────────────────────┘
```

## 1. Header da página

- Esquerda: `h1` **"Dias Não Úteis"** (1.5rem, semibold, cor primária) + subtítulo muted opcional "Feriados, recessos e pontos facultativos que ajustam a meta do ponto".
- Direita: `p-button` primário **"Novo Dia Não Útil"** (ícone `pi-plus`). Tooltip: "Atalho: N". Tecla **N** abre o dialog de criação.

## 2. Coluna esquerda — calendário

**Barra de navegação rápida (nova)** acima do card: botão outlined **"Hoje"** (volta ao mês atual e destaca o dia) + stepper de ano **"‹ 2026 ›"** (troca o ano mantendo o mês). ⑤

**Card do calendário**: `p-datepicker` inline mensal (dimensionado por tokens de fonte, sem `zoom`). Células:
- Dia comum: número simples; **hover (gestor)** mostra um `+` fantasma discreto no canto da célula, cursor pointer — affordance de criação. ①
- Dia marcado: badge circular — Feriado (azul primário cheio), Recesso (tom mais escuro), Ponto Facultativo (tom claro); **duração MEIO_PERIODO = anel** (contorno, sem preenchimento). Exemplos no mockup: 24 e 31 com anel (meio período), 25 cheio.
- Dia de hoje: contorno padrão do Aura.

**Interações (clique único, sem duplo clique):**
- Clique em **dia vazio** → abre o dialog "Novo Dia Não Útil" com Data = dia clicado e foco na Descrição. ①
- Clique em **dia marcado** → abre **popover** ancorado na célula (ver seção 4) e destaca a linha correspondente na tabela (fundo primário 8%, scroll suave). ②

**Legenda (nova)**, sob o card, texto 0.8rem: `● Feriado   ● Recesso   ● Ponto Facultativo   ○ anel = meio período`. ⑤

## 3. Coluna direita — tabela do mês

Card com header em linha: título **"Dezembro de 2026"** clicável com caret `▾` (abre o overlay mês/ano — mesma navegação do calendário) + contador muted à direita **"3 registros"**.

`p-table` compacta, colunas:

| Data | Descrição | Tipo | Ações |
|---|---|---|---|
| qui, 24/12 | Véspera de Natal | `Recesso` `Meio período` `↻ Todo ano` | ✎ 🗑 |
| sex, 25/12 | Natal | `Feriado` `↻ Todo ano` | ✎ 🗑 |
| qui, 31/12 | Véspera de Ano Novo | `Recesso` `Meio período` | ✎ 🗑 |

- **Data**: dia da semana abreviado + `dd/MM` (o ano já está no título; recorrentes usam o ano navegado).
- **Tipo**: badges compactos na mesma célula — tag do tipo (cores da legenda), tag neutra "Meio período" só quando `duracao = MEIO_PERIODO`, tag outlined "↻ Todo ano" só quando `recorrente = true` (disclosure progressivo: o caso comum não gera ruído). Colunas separadas "Duração" e "Recorrente" deixam de existir.
- **Ações**: icon-buttons text sempre visíveis — ✎ Editar (abre dialog) e 🗑 Excluir (ação direta, ver seção 6).
- Linha destacada quando selecionada via calendário/popover ou recém-salva.

**Estados:**
- **Carregando**: 4 linhas skeleton (`p-skeleton`) mantendo as colunas — sem spinner que colapsa o layout.
- **Vazio (acionável)** ⑥: ícone `pi-calendar-times`, texto "Nenhum dia não útil em Julho de 2026", botão primário **"Cadastrar dia não útil"** (abre o dialog com o datepicker já no mês exibido) e dica muted "ou clique em um dia no calendário ao lado".
- **Com dados**: como na tabela acima.

## 4. Popover de dia marcado (novo) ②

`p-popover` ancorado à célula clicada, ~280px:
- Linha 1: **"Natal"** (semibold) + data "sex, 25/12/2026".
- Linha 2: badges `Feriado` `↻ Todo ano` (e `Meio período` quando houver, com hint "meta do ponto reduzida à metade").
- Rodapé: `p-button` text **"Editar"** (✎) e text danger **"Excluir"** (🗑). Esc/clique fora fecha.

## 5. Dialog Criar/Editar — sobre a página com fundo escurecido

Modal `p-dialog` 460px, centralizado, **página visível atrás com overlay escuro (rgba preto ~50%)** — o calendário e a tabela aparecem esmaecidos ao fundo. Header: "Novo Dia Não Útil" (ou "Editar Dia Não Útil"), X fecha, **Esc cancela**.

Campos (form reativo, `(ngSubmit)`):
1. **Data*** — `p-datepicker dd/mm/aaaa` com ícone. Pré-preenchida quando aberto via célula do calendário ou empty state (mês exibido). Na edição: desabilitada, hint "A data não pode ser alterada após o cadastro. Precisa corrigir? **Excluir e recriar**" (link que exclui e reabre a criação pré-preenchida com todos os dados).
2. **Descrição*** — `input pInputText`, placeholder "ex: Natal". **Autofocus** quando a Data já veio preenchida (senão, foco na Data). ③
3. **Tipo*** + **Duração*** — dois `p-select` lado a lado. Opções Tipo: Feriado (default), Recesso, Ponto Facultativo. Duração: Integral (default), Meio período. Hint fixo condicional sob Duração: "Meio período: a meta diária do ponto cai pela metade."
4. **Recorrente** — checkbox com label "Recorrente" + texto auxiliar fixo muted "repete todo ano no mesmo dia/mês" (sem banner que empurra o layout).

Footer: **Cancelar** (outlined) · **Salvar e adicionar outro** (outlined, só na criação; salva, mantém Tipo/Duração/Recorrente como defaults, limpa Data/Descrição, foco na Data; atalho Ctrl+Enter) ③ · **Salvar** (primário, type submit — **Enter salva**, com loading). ③

Exemplo de preenchimento no mockup: Data `20/11/2026`, Descrição "Dia da Consciência Negra", Tipo Feriado, Duração Integral, Recorrente marcado.

## 6. Excluir sem modal + Desfazer ④

Sem `p-confirmDialog`. Clique no 🗑 (tabela ou popover) → remoção **otimista** (linha some, badge do calendário some) → toast bottom-center: **"\"Véspera de Natal\" excluído · [Desfazer]"** (~6s). Desfazer recria via `criar()` com os mesmos dados e restaura a linha. Falha na API → item volta + toast de erro.

## 7. Feedback e consistência

- Criar/editar: atualização **otimista** do signal local (refetch silencioso em background, sem skeleton/spinner); após salvar, o calendário navega para o mês do dia salvo e a linha fica destacada por ~3s. Toast: "\"Natal\" cadastrado".
- Padrões idênticos às demais telas: header título+botão primário à direita, tabela em card, dialog 460px com footer Cancelar/Salvar, toasts bottom-center.
- Teclado: **N** novo · **Enter** salva · **Ctrl+Enter** salva e adiciona outro · **Esc** fecha dialog/popover.

## Callouts numerados para o mockup

- **① Clique único cria** — seta apontando um dia vazio do calendário com o `+` fantasma: "1 clique abre o cadastro com a data preenchida (antes: duplo clique oculto + 7 cliques)".
- **② Popover no ponto de decisão** — sobre o popover do dia 25: "ver, editar e excluir direto no calendário, sem caçar a linha".
- **③ Teclado primeiro** — no dialog: "autofocus + Enter salva + 'Salvar e adicionar outro' para a carga anual de feriados (12 feriados: ~72 → ~40 cliques)".
- **④ Excluir com Desfazer** — no toast: "sem modal de confirmação; soft delete de verdade, reversível em 1 clique".
- **⑤ Navegação rápida + legenda** — na barra "Hoje ‹ 2026 ›" e na legenda: "dezembro do ano que vem em 2 cliques; cores decifráveis sem hover".
- **⑥ Empty state acionável** — no estado vazio da tabela: "a ação principal a 1 clique, com dica do atalho do calendário".
