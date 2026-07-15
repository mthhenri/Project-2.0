# Calendário — dias não úteis (listagem/gestão) (/calendario (só gestor))

> ✅ Sugestões verificadas adversarialmente contra o código e as regras de negócio.

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

## Sugestões aprovadas na verificação
### S1 — Clique único no calendário cria (dia vazio) e abre popover com ações (dia marcado) [impacto alto]
Aproveitável, mas reformulada: o duplo clique JÁ faz criar-com-data-preenchida e editar (onDuploCliqueDia, restrito a gestor) — o ganho real é trocar um gesto oculto e não descobrível por clique único + affordance visível, e adicionar exclusão no ponto de decisão (hoje inexistente via calendário). Versão final: (1) clique simples em dia VAZIO abre o dialog de criação com a Data preenchida e foco na Descrição — SOMENTE gestor (a rota /calendario não tem guard e a página funciona em modo leitura para desenvolvedor; manter o early-return por eGestor() como no código atual); (2) clique simples em dia MARCADO abre p-popover ancorado na célula com descrição, data e badges, mantendo o destaque+scroll da linha na tabela que já existe (diaDestacadoId/rolarParaLinha); os botões Editar/Excluir do popover aparecem SÓ para gestor — para desenvolvedor o popover é somente-leitura (substitui o pTooltip atual, com bônus de funcionar em touch); (3) '+' fantasma no hover de dia vazio apenas para gestor. Remover o handler de dblclick.
_Redução de esforço:_ criação via calendário: 3 interações (clique no dia → digitar descrição → Enter) num fluxo descobrível — hoje o caminho descobrível é o botão do header (~5-7 interações) e o duplo clique é invisível; editar/excluir a partir do calendário: 2 cliques sem caçar a linha na tabela

### S2 — Autofocus no primeiro campo pendente + Enter salva [impacto alto]
Reformulada porque 1/3 já existe: Esc JÁ fecha o dialog (closeOnEscape é default do p-dialog) — não contar como ganho. O que não existe e foi aprovado: form com (ngSubmit)='salvar()' e Enter submetendo (hoje o Salvar é (onClick) sem type submit), autofocus na Descrição quando a Data vem pré-preenchida (fluxo do calendário/empty state) e na Data no fluxo do botão do header. Detalhe de implementação obrigatório: o footer do p-dialog (pTemplate='footer') fica FORA do <form> — usar (keydown.enter) no form ou atributo form no botão nativo, senão o submit não dispara.
_Redução de esforço:_ cadastro sem tocar no mouse após abrir o dialog: de 6-7 interações (2 delas de mouse obrigatório) para 3, em toda criação/edição — a ação mais frequente da tela

### S3 — Botão 'Salvar e adicionar outro' no dialog de criação (Ctrl+Enter) [impacto alto]
Aprovada como proposta — não existe no código, não requer backend (loop de criar()), e ataca o caso de uso real da tela (carga anual de feriados). Versão final: terceiro botão outlined no footer, apenas em modo criação; salva, mantém Tipo/Duração/Recorrente do último salvo como defaults, limpa Data/Descrição, devolve o foco à Data; atalho Ctrl+Enter; o toast de sucesso confirma cada item salvo. A tabela/calendário atualizam a cada salvamento (ver S5) para feedback de progresso.
_Redução de esforço:_ carga de 12 feriados: 1 abertura de dialog em vez de 12 e ~40 interações em vez de ~72; cada item subsequente custa só data+descrição+Ctrl+Enter

### S4 — Excluir sem modal de confirmação: ação direta + toast 'Desfazer' (piloto) [impacto medio]
Aprovada com correções. Validado no backend: exclusão é soft delete e a tabela dia_nao_util NÃO tem UNIQUE em dia_data (só índice parcial não-único, migration 0012) e não tem FKs dependentes — recriar via criar() com os mesmos dados (incluindo diaData original, o que preserva recorrentes) é seguro e não colide. Bônus: o texto atual do confirm ('Esta ação não pode ser desfeita') é factualmente falso dado o soft delete. Correções obrigatórias: (1) o undo gera um NOVO id — atualizar o item local com o id retornado por criar() e limpar diaDestacadoId se apontava para o id antigo; (2) falha na API de exclusão → restaurar o item na lista + toast de erro; (3) CONSISTÊNCIA: p-confirmDialog é o padrão de exclusão nas 22 ocorrências das demais telas — aprovar como piloto no calendário (lista de baixo risco) com recomendação explícita de estender o padrão undo às outras listagens simples depois, para não fragmentar a UX.
_Redução de esforço:_ de 2 cliques + modal bloqueante para 1 clique; erro recuperável em 1 clique por ~6s

### S5 — Atualização local do signal (sem spinner) + skeleton no load inicial + destaque pós-salvar [impacto medio]
Aprovada — hoje TODO buscarDias() liga carregando() que substitui a tabela inteira pelo spinner (flash a cada criar/alterar/excluir), e nada indica onde o item salvo foi parar. Versão final: (1) após criar/alterar/excluir, atualizar o signal diasNaoUteis localmente (criar() já retorna DiaNaoUtilCriadoDto com id) e fazer refetch silencioso sem ligar o spinner; (2) skeleton de 4-5 linhas (p-skeleton) só no carregamento inicial, preservando as colunas; (3) após salvar, exibir o mês do dia salvo e destacar a linha reusando o mecanismo diaDestacadoId/rolarParaLinha existente. Ressalva técnica: 'navegar o calendário' programaticamente não tem API pública no p-datepicker inline do PrimeNG — exige ViewChild com membros internos (currentMonth/currentYear + createMonths) ou rebind de defaultDate com recriação; a spec deve definir a estratégia.
_Redução de esforço:_ zero flashes de spinner após cada operação; elimina a busca visual pós-salvar (linha destacada e visível)

### S6 — Botão 'Hoje' + stepper de ano acima do calendário [impacto medio]
Aprovada com estimativa corrigida e escopo reduzido. O header nativo do p-datepicker JÁ oferece ‹ › e título clicável com month/year view — 'dezembro do ano seguinte' custa ~3 cliques hoje, não 17 como alegado. Ganhos reais que não existem: 'Hoje' (voltar ao mês atual em 1 clique — considerar o [showButtonBar] nativo do PrimeNG, cujo botão Today já dispara onTodayClick, antes de construir botão próprio) e stepper de ano '‹ 2026 ›' que troca o ano mantendo o mês (1 clique vs 3 — útil no planejamento anual). REMOVIDO da proposta: título da tabela como controle que abre o overlay mês/ano do datepicker — abrir a view de outro elemento não tem API pública no PrimeNG e é redundante com o header do próprio calendário; o título da tabela permanece texto (com o contador de registros).
_Redução de esforço:_ voltar ao mês atual: 1 clique (antes 3-6); mesmo mês em outro ano: 1 clique (antes 3)

### S7 — Empty state acionável (botão de cadastro só para gestor) [impacto medio]
Aprovada com correção de permissão. Hoje o empty state é só ícone + 'Nenhum dia não útil neste mês'. Versão final: texto com o mês corrente ('Nenhum dia não útil em Julho de 2026') e, SOMENTE para gestor, botão primário 'Cadastrar dia não útil' que abre o dialog com o datepicker exibindo o mês navegado (campo Data vazio com defaultDate no mês exibido — NÃO pré-preencher dia arbitrário, para não induzir data errada) + dica muted 'ou clique em um dia no calendário ao lado'. Para desenvolvedor (a rota é acessível sem guard, modo leitura), manter apenas ícone + texto; o colspan do emptymessage já é condicional a eGestor() no código atual.
_Redução de esforço:_ primeira ação a 1 clique a partir do estado vazio, sem voltar ao header

### S8 — Legenda de cores/formas sob o calendário [impacto baixo]
Aprovada — hoje a decodificação dos badges (feriado/recesso/facultativo por tonalidade, anel = meio período) depende exclusivamente do pTooltip em hover, inacessível em touch. Legenda fixa de linha única sob o card usando os aliases de tema existentes (--app-marca-feriado/recesso/facultativo-*): '● Feriado ● Recesso ● Ponto Facultativo ○ anel = meio período'. Beneficia também o desenvolvedor em modo leitura. É ganho informacional (critério 9: dado visível sem hover), não estética pura.
_Redução de esforço:_ 0 hovers para decodificar o mapa mensal; funciona em touch

### S9 — Tabela densa: Duração/Recorrente viram badges na coluna Tipo; Data com dia da semana [impacto baixo]
Aprovada com uma correção factual: 'Ações permanecem visíveis (não só em hover)' descreve o comportamento ATUAL — não é mudança. O que muda de verdade: fundir as colunas Duração (que hoje exibe 'Integral' na maioria das linhas) e Recorrente (ícone/—) em badges condicionais junto ao Tipo — tag 'Meio período' só quando duracao=MEIO_PERIODO, tag '↻ Todo ano' só quando recorrente=true (disclosure progressivo: o caso comum não gera ruído); Data como 'qui, 24/12' (dia da semana derivado no cliente; para recorrentes usar o ano navegado, como dataExibicao() já faz; o ano completo já está no título do card). Tudo disponível no DiaNaoUtilResumoDto.
_Redução de esforço:_ leitura da linha em um único passo de varredura; 2 colunas a menos; dia da semana visível sem consultar o calendário

### S10 — Correção de data via 'recriar' — exclusão só no Salvar, na ordem criar → excluir [impacto baixo]
Aprovada com correção de fluxo obrigatória: a versão proposta ('exclui o registro e reabre o dialog de criação') destrói o registro se o usuário cancelar em seguida. Versão final: no dialog de edição, junto ao hint 'A data não pode ser alterada', link 'Precisa corrigir a data? Recriar com outra data' que apenas TRANSFORMA o dialog em modo recriação (todos os campos pré-preenchidos, Data habilitada) sem tocar no backend; ao Salvar, executar criar() com os novos dados e, só após sucesso, excluir() o registro antigo (criar falhou → nada muda; excluir falhou → toast de erro apontando a duplicata a remover — janela pequena e visível). Viável com o backend atual: sem UNIQUE em dia_data e DiaNaoUtilResumoDto contém todos os campos. Contorna a ausência de diaData no DiaNaoUtilAlterarDto sem mudança de backend.
_Redução de esforço:_ correção de data: de ~8 cliques + redigitação completa para ~3 cliques sem redigitar; sem risco de perda do registro no cancelamento


## Ajustes de implementação apontados pelo verificador
1) PERMISSÕES/MODO LEITURA: a rota /calendario não tem guard (calendario.routes.ts) e GET /calendario é liberado a qualquer autenticado — a página atual funciona como somente-leitura para desenvolvedor (botão do header, coluna Ações e duplo clique condicionados a eGestor()). A spec precisa condicionar a gestor: '+' fantasma no hover, clique em dia vazio abrindo criação, botões Editar/Excluir do popover (seção 4 não os condiciona — para dev o popover deve ser somente resumo), botão do empty state (seção 3) e atalho de teclado N; a coluna Ações e o colspan do empty continuam condicionais. 2) FLUXO 'EXCLUIR E RECRIAR' (seção 5, campo Data): como escrito ('link que exclui e reabre a criação'), cancelar o dialog após o clique perde o registro — trocar por: o link só alterna o dialog para modo recriação; a sequência criar novo → excluir antigo roda apenas no Salvar, nessa ordem. 3) 'ESC CANCELA' (seções 5 e 7) já é comportamento default do p-dialog (closeOnEscape) — manter, mas não apresentar como melhoria nem callout. 4) NAVEGAÇÃO PROGRAMÁTICA DO CALENDÁRIO (seções 2 e 7): o p-datepicker inline do PrimeNG não expõe API pública para navegar para um mês ('calendário navega para o mês do dia salvo', stepper de ano, botão Hoje) — especificar a estratégia (ViewChild com membros internos currentMonth/currentYear + createMonths, ou rebind de defaultDate com recriação; para 'Hoje', avaliar o [showButtonBar] nativo). 5) REMOVER da seção 3 o título da tabela clicável com caret ▾ abrindo 'o mesmo overlay mês/ano': não há API pública para abrir a month/year view a partir de outro elemento e é redundante — o header do próprio datepicker já tem título clicável nativo com essa view; ajustar também o callout ⑤, que afirma um custo atual inflado (dezembro do ano seguinte custa ~3 cliques hoje via view nativa, não 17). 6) UNDO DO EXCLUIR (seção 6): a recriação via criar() gera NOVO id (o soft delete não é revertido) — o item restaurado deve usar o id retornado e o diaDestacadoId antigo deve ser limpo; confirmado que não há UNIQUE em dia_data (migration 0012), então não há colisão. Corrigir também a mensagem herdada do confirm atual ('Esta ação não pode ser desfeita'), que contradiz o soft delete. 7) CONSISTÊNCIA ENTRE TELAS (seção 7 promete 'padrões idênticos às demais telas'): remover o p-confirmDialog só no calendário quebra o padrão usado em todas as outras listagens (22 ocorrências) — registrar na spec que é piloto do padrão 'ação direta + Desfazer' com plano de extensão às demais telas de exclusão de baixo risco. 8) SUBMIT COM ENTER (seção 5): o footer do p-dialog renderiza fora do <form>; 'Salvar (type submit)' não funciona como escrito — especificar (keydown.enter) no form ou botão com atributo form apontando para o id do form. 9) 'DIMENSIONADO POR TOKENS DE FONTE, SEM ZOOM' (seção 2): o zoom: 1.75 atual foi deliberado ('zoom reflui o layout e preserva os cliques', comentário no SCSS) — a troca por tokens exige validar cliques/hover nas células templatadas do datepicker em ambos os temas antes de fixar na spec.

## Especificação do redesign
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
