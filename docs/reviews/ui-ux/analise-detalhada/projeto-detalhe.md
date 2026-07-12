# Projeto — Detalhe (/projeto/:id)

## Fluxos atuais
- **Ver detalhes de uma demanda de 2º nível** (3 cliques): Expandir a raiz estrutural (1 clique) → botão direito na demanda (1) → item 'Visualizar' no menu (1). O botão direito é a única porta de entrada e não tem nenhuma affordance visível; clique esquerdo na folha não faz nada.
- **Criar demanda raiz (gestor)** (4 cliques): 'Nova Demanda' no cabeçalho (1) → clicar no campo Nome, pois não há autofocus (1) → digitar → 'Criar Demanda' (1) → fechar o dialog manualmente, pois ele permanece aberto após criar (1).
- **Criar sub-demanda de uma estrutural** (5 cliques): Botão direito na demanda estrutural (1) → 'Nova Sub-demanda' (1) → focar Nome (1) → digitar/preencher → 'Criar Demanda' (1) → fechar dialog (1). Se a estrutural estiver aninhada, somam-se cliques de expansão.
- **Alterar status do projeto (ex.: pausar)** (4 cliques): 'Editar' (1) → abrir select Status (1) → escolher 'Pausado' (1) → 'Salvar' (1) → aguardar refetch com spinner de página.
- **Editar tags de uma demanda** (5 cliques): Botão direito (1) → 'Tags' (1) → alternar 1–2 chips (2) → 'Salvar' (1).
- **Abrir/editar Descrição Técnica de uma demanda** (3 cliques): Botão direito (1) → 'Desc. Técnica' (1) → editar no Quill → 'Salvar' (1). Na linha não há indicador de quais demandas têm descrição, então achar as preenchidas exige abrir o menu uma a uma.
- **Localizar uma demanda específica em árvore profunda** (4 cliques): Sem busca nem filtro: expandir nó a nó (1 clique por nível estrutural, tipicamente 3–5) e varrer visualmente.
- **Ver progresso do projeto (estimado × executado, demandas por status)** (6 cliques): Impossível na tela: os números existem por demanda mas não há agregação; o usuário expande tudo e soma de cabeça, ou gera o Relatório (1 + 2–4 cliques de período + 1).
- **Abrir a visão Grafo/Planejamento deste projeto** (4 cliques): Topbar 'Demandas' (1) → abrir select de projeto (1) → escolher o projeto (1) → botão 'Grafo' ou 'Planejamento' (1). Nenhum atalho a partir do detalhe do projeto.
- **Gerar relatório de execuções (gestor)** (5 cliques): 'Relatório' (1) → escolher tipo de período (2) → ano/mês ou intervalo (1–2) → 'Pré-visualizar' ou 'Baixar CSV' (1).

## Problemas
- [ALTA] P1: Todas as ações por demanda (visualizar, editar, sub-demanda, tags, membros, descrições) estão escondidas num menu acessível apenas por botão direito, sem nenhuma affordance visível (nem kebab, nem hover actions). Usuários que não descobrem o right-click ficam sem acesso a 100% das ações da árvore.
- [ALTA] P2: Clique esquerdo em demanda folha não faz nada (alternarExpansao num nó sem filhos) — dead click no alvo mais óbvio da tela. O esperado (abrir o detalhe) exige 2 interações via menu oculto.
- [ALTA] P3: O dialog 'Nova Demanda' não fecha após criar: o form é resetado e o dialog fica aberto sem qualquer sinalização de modo 'criar vários', custando 1 clique extra por criação e causando dúvida se a ação funcionou (feedback só via toast em bottom-center).
- [ALTA] P4: Não existe busca nem filtro (nome/status/tag) na árvore, e todos os nós iniciam recolhidos sem 'expandir/recolher tudo' — localizar uma demanda em projeto grande custa 1 clique por nível + varredura visual.
- [MEDIA] P5: Nenhuma agregação no nível do projeto (total estimado × executado, % de progresso, contagem de demandas por status), embora horasEstimadas, minutosExecutados e status já venham em todos os nós do grafo — o dado mais consultado por um gestor é invisível.
- [MEDIA] P6: Alterar apenas o status do projeto (ação frequente) exige abrir o dialog de edição completo: 4 cliques + refetch com spinner, quando poderia ser 2 cliques inline na própria tag de status.
- [MEDIA] P7: Formulários dos dialogs sem autofocus no primeiro campo e sem submit com Enter (footer só com botões clicáveis); nenhum atalho de teclado na página.
- [MEDIA] P8: Inconsistência e navegação duplicada com a tela Demandas (/demanda): lá existem visões Grafo/Lista/Planejamento e seletor de projeto; aqui só a lista, sem atalho para as outras visões do MESMO projeto (4 cliques para chegar ao grafo).
- [MEDIA] P9: Os indicadores de descrição preenchida (temDescricaoTecnica/Cliente/Documentacao) só aparecem DENTRO do menu de contexto; na linha da árvore não há nenhum sinal, obrigando a abrir o menu demanda a demanda para saber o que está documentado.
- [MEDIA] P10: Sem ações em massa: atribuir tag, mudar status ou membros de várias demandas exige repetir o ciclo menu→dialog→salvar para cada uma (5+ cliques por item).
- [BAIXA] P11: Após salvar a edição do projeto, a tela refaz o GET e mostra spinner de página inteira em vez de aplicar o retorno do PUT (ProjetoAlteradoDto já traz todos os campos) — feedback lento e com 'piscada'.
- [BAIXA] P12: Quando o projeto não tem datas, a linha de metadados some por completo — o gestor não tem nenhum convite para 'Definir datas' no ponto onde a informação deveria estar.
- [BAIXA] P13: Carregamento com dois spinners centrais sequenciais (projeto + demandas) em vez de skeleton, causando salto de layout; 'X h est.' e 'X h exec.' são texto puro, sem relação visual (barra/percentual) entre estimado e executado.
- [BAIXA] P14: Hierarquia do cabeçalho: 'Relatório' e 'Editar' têm exatamente o mesmo peso visual (outlined secundário), e para o desenvolvedor o cabeçalho fica sem nenhuma ação/contexto — espaço desperdiçado nos dois perfis.

## Sugestões (VERIFICAR: checar vs regras de negócio)
### S1 — Linha da demanda 100% clicável + ações visíveis no hover (kebab e '+ Sub') [impacto alto]
Clique na linha abre o dialog de detalhe (folha ou estrutural); o chevron continua expandindo. No hover da linha aparecem: botão '+' (Nova sub-demanda, só estrutural/gestor) e kebab '⋯' com o mesmo menu do botão direito (que continua funcionando como atalho avançado). Elimina o dead click e a dependência do right-click oculto.
_Redução de esforço:_ ver detalhe: de 3 cliques (com menu oculto) para 1; criar sub-demanda: de 5 para 3

### S2 — Toolbar da árvore: busca instantânea, filtro por status e expandir/recolher tudo [impacto alto]
Acima da lista: input 'Buscar demanda…' (filtra client-side conforme digita e auto-expande os ramos com match, atalho '/'), chips de status clicáveis (Pendente/Planejada/Concluída/Cancelada) e botão 'Expandir tudo ⇄ Recolher tudo'. Tudo client-side sobre os nós do grafo já carregados; último filtro lembrado por projeto (localStorage).
_Redução de esforço:_ localizar demanda: de 3–5 cliques + varredura para digitar 2–3 letras (0 cliques)

### S3 — Faixa de resumo do projeto (agregado client-side do grafo) [impacto alto]
Entre o cabeçalho e a árvore: '24 demandas' + contadores por status (clicáveis, aplicam o filtro da S2) + barra de progresso 'Executado 268 h de 420 h estimadas (64%)', somando horasEstimadas e minutosExecutados dos nós já recebidos. Nenhuma chamada extra ao backend.
_Redução de esforço:_ progresso do projeto: de ~6 cliques (gerar relatório) ou impossível para 0 cliques, sempre visível

### S4 — Status do projeto editável inline com salvamento otimista [impacto medio]
A p-tag de status do cabeçalho vira um dropdown (gestor): 1 clique abre, 1 clique seleciona; PUT /projeto/:id só com {status}, atualização otimista da tag e toast com 'Desfazer'. O dialog Editar continua existindo para nome/cor/datas.
_Redução de esforço:_ de 4 cliques + refetch com spinner para 2 cliques sem recarregamento

### S5 — Dialog Nova Demanda: autofocus, Enter para criar e 'Criar outra em seguida' explícito [impacto alto]
Autofocus no Nome ao abrir, Enter submete, Esc cancela. Por padrão o dialog FECHA após criar; checkbox 'Criar outra em seguida' no rodapé (lembrado na sessão) mantém aberto e refoca o Nome — transforma o bug atual (fica aberto sem avisar) em recurso deliberado. Mesmo padrão no Editar Projeto.
_Redução de esforço:_ criação única: de 4 cliques para 2 (abrir + Enter); criação em série: 1 clique + Enter por item

### S6 — Indicadores de descrição na linha (T · C · D) clicáveis [impacto medio]
Três mini-ícones na linha da árvore (pi-code, pi-user, pi-book) usando os flags temDescricaoTecnica/Cliente/Documentacao que já vêm no DTO: coloridos quando preenchidos, cinza-fantasma quando vazios; clique abre direto o dialog da descrição correspondente. Padroniza com o dialog de detalhe, que já tem esses botões.
_Redução de esforço:_ abrir uma descrição: de 3 cliques (menu oculto) para 1; auditar documentação do projeto: de N aberturas de menu para 0 (visível de relance)

### S7 — Atalho para as visões Grafo e Planejamento no cabeçalho [impacto medio]
Grupo de botões 'Lista | Grafo | Planejamento*' (*gestor) ao lado do resumo, navegando para /demanda com o projeto já selecionado — mesmo padrão visual do toggle que já existe na tela Demandas, eliminando a rota topbar→Demandas→select→visão.
_Redução de esforço:_ abrir grafo do projeto: de 4 cliques para 1

### S8 — Feedback otimista e skeleton em vez de spinners e refetchs [impacto baixo]
Editar projeto aplica o ProjetoAlteradoDto retornado pelo PUT sem novo GET; alterações na árvore (tags, edição) atualizam o nó localmente e reconciliam com o refetch em segundo plano; carregamento inicial com skeleton de 4 linhas no lugar dos dois spinners centrais.
_Redução de esforço:_ elimina 1 requisição e ~1s de spinner por edição; zero saltos de layout

### S9 — Metadados sempre presentes com edição no ponto ('Definir datas') [impacto baixo]
A linha de meta nunca some: sem datas, gestor vê link discreto '+ Definir datas' que abre o dialog Editar já focado na Data de Início. Com datas, ícone de lápis no hover.
_Redução de esforço:_ definir datas: de 'descobrir que é no Editar' (2+ cliques) para 1 clique no local esperado

### S10 — Atalhos de teclado da página [impacto baixo]
N = Nova Demanda (gestor), / = focar busca, E = expandir/recolher tudo, Esc fecha dialogs, Enter submete formulários. Dica dos atalhos em tooltip dos botões correspondentes.
_Redução de esforço:_ usuário frequente cria demanda ou busca sem nenhum clique de mouse


## REDESIGN SPEC
# Redesign — Projeto: Detalhe (`/projeto/:id`)

Angular 21 + PrimeNG (tema Aura, primário azul `#2563eb`) + Tailwind. Tema claro/escuro. Toasts bottom-center. Página com padding 24px, largura fluida, abaixo da topbar global (Ponto · Calendário · Projetos · Demandas · Atividades · Execuções · Tags · Usuários).

Dados de exemplo usados em todo o mockup: projeto **"Portal do Cliente"**, código **PORTAL-01**, cor `#2563eb`, status **Ativo**, início 02/03/2026, término 18/12/2026. Pessoas: **Ana Souza**, **Bruno Lima**, **Carla Mendes** (desenvolvedores), **Diego Ferreira** (gestor logado).

---

## 1. Cabeçalho (header da página)

Linha única, `justify-between`, alinhada ao centro vertical.

**Esquerda:**
- Botão texto secundário `← Projetos` (volta à listagem).
- Bolinha de cor 16px `#2563eb` • Título H1 `Portal do Cliente` (1.5rem, semibold) • chip de código `PORTAL-01` (caixa alta, fundo surface-100, 0.75rem).
- **① Tag de status interativa**: p-tag verde `Ativo` com caret `▾` sutil à direita (só gestor). Clique abre dropdown com `Ativo · Pausado · Concluído · Cancelado`; selecionar aplica na hora (PUT otimista) e mostra toast `Status alterado para Pausado — Desfazer`. Para desenvolvedor, tag estática sem caret.
- Linha de meta logo abaixo do título (0.875rem, muted): `📅 Início 02/03/2026 · 🚩 Término 18/12/2026` com lápis no hover (abre Editar Projeto focado nas datas). **Estado sem datas (gestor):** link discreto `+ Definir datas`. Desenvolvedor sem datas: linha omitida.

**Direita (só gestor):**
- `Nova Demanda` — botão primário azul, ícone `pi-plus`, tooltip `Atalho: N`.
- `Relatório` — outlined secundário, ícone `pi-file`.
- `Editar` — outlined secundário, ícone `pi-pencil`.

Desenvolvedor: direita vazia (sem botões).

## 2. ② Faixa de resumo do projeto

Card horizontal (surface-0, borda surface-200, radius 8px, padding 12px 16px) entre o cabeçalho e a toolbar. Tudo calculado client-side dos nós do grafo já carregados — zero chamadas extras.

- **Contadores por status (chips clicáveis, aplicam filtro da toolbar):** `24 demandas` (total, negrito) · `● 6 Pendentes` (cinza) · `● 10 Planejadas` (azul) · `● 7 Concluídas` (verde) · `● 1 Cancelada` (vermelho). Chip ativo ganha fundo preenchido.
- **Progresso (lado direito do card):** `Executado 268 h de 420 h estimadas` + barra de progresso fina (p-progressbar, 64%, azul; passa a âmbar se >100%).

## 3. ③ Toolbar da árvore

Linha entre o resumo e a lista, `justify-between`:

**Esquerda:**
- Input `🔍 Buscar demanda…` (p-inputtext, ~280px, atalho `/`). Filtra conforme digita, auto-expande ramos com correspondência e destaca o trecho encontrado; mostra `4 resultados` à direita do campo. Botão `×` limpa.
- Botão texto `⤢ Expandir tudo` (alterna para `⤡ Recolher tudo`, atalho `E`).

**Direita:**
- Toggle de visões (mesmo padrão da tela Demandas): `▤ Lista` (ativo/preenchido) · `⚯ Grafo` · `▥ Planejamento` (este só gestor). Grafo/Planejamento navegam para `/demanda` com o projeto já selecionado.

Filtros e busca são lembrados por projeto (localStorage).

## 4. ④ Corpo — árvore de demandas

Lista vertical de linhas-cartão (surface-0, borda surface-200, radius 6px, gap 8px; indentação 24px por nível). Anatomia da linha, esquerda → direita:

`[chevron ▸/▾ (só estrutural)] [📁 (estrutural)] Nome da demanda [chips de tags] ......... [T C D] [tag status] [barra + "26h / 24h"] [+ ] [⋯]`

- **Clique na linha inteira** abre o dialog de detalhe da demanda (folha ou estrutural). **Chevron** expande/recolhe (área de clique 32px). Botão direito segue abrindo o mesmo menu do kebab (atalho avançado).
- **Ícones T · C · D** (pi-code, pi-user, pi-book, 0.8rem): coloridos (azul/roxo/verde-azulado) quando a descrição existe, cinza-fantasma 30% quando vazia; clique abre direto o dialog daquela descrição. Tooltip: `Descrição técnica — preenchida`.
- **Tempo:** micro-barra de progresso (60px) + texto `26h / 24h` (executado/estimado; barra âmbar quando estoura). Oculta se estimado = 0.
- **Ações no hover (fora do hover ficam invisíveis):** `+` (Nova sub-demanda — só estrutural e gestor, tooltip) e kebab `⋯` com menu: `👁 Visualizar · ✏ Editar* · ➕ Nova Sub-demanda* · ─ · 🏷 Tags* · 👥 Membros* · ─ · ⌨ Desc. Técnica · 👤 Desc. Cliente · 📖 Documentação` (* = gestor).

**Dados de exemplo da árvore:**
- ▾ 📁 **Autenticação e Contas** — tag status `Planejada` — `40h / 96h` — [+][⋯]
  - **Login com e-mail e senha** — chip tag `backend` (roxo) — `Concluída` — T●C●D○ — `26h / 24h` (barra âmbar, estourou)
  - **Recuperação de senha** — chip `backend` — `Planejada` — T●C○D○ — `2h / 16h`
  - **Tela de cadastro** — chip `frontend` (verde) — `Pendente` — T○C○D○ — `0h / 20h`
- ▸ 📁 **Área do Cliente** — `Planejada` — `12h / 52h`
- **Integração com gateway de pagamento** — chip `integração` (laranja) — `Planejada` — T●C●D● — `9h / 32h`

**Estados:**
- **Carregando:** ⑥ skeleton de 4 linhas (barras cinza pulsantes na altura das linhas reais) — sem spinner central, sem salto de layout.
- **Vazio (gestor):** ícone pi-inbox + `Nenhuma demanda ainda` + botão **primário** `+ Criar primeira demanda`.
- **Vazio (dev):** `Nenhuma demanda neste projeto. Fale com o gestor para receber atribuições.`
- **Busca sem resultado:** `Nenhuma demanda encontrada para "pagamento"` + link `Limpar busca`.

## 5. ⑤ Dialog "Nova Demanda" (mostrar ABERTO sobre a página escurecida)

O mockup deve exibir este dialog sobreposto: página de fundo visível porém escurecida por overlay `rgba(0,0,0,0.4)`; dialog centralizado, 560px, surface-0, radius 12px, sombra alta.

- **Header:** `Nova Demanda` + botão `×`.
- **Corpo (form):**
  - `Nome *` — input com **autofocus** (mostrar cursor), placeholder `Nome da demanda`, dica pequena de caracteres proibidos abaixo.
  - `Demanda Pai` — select `Autenticação e Contas` (pré-preenchida quando aberto pelo `+` da linha; `Nenhuma (raiz)` quando pelo botão do cabeçalho).
  - Linha tripla: `Status *` (select, default `Planejada`) · `Previsão de Término` (datepicker dd/mm/aa) · `Horas Estimadas *` (inputnumber, sufixo `h`).
  - `Membros` (gestor) — multiselect com busca; exemplo selecionados: `Ana Souza, Bruno Lima` (gestores nunca aparecem na lista).
  - `Tags` (gestor) — chips clicáveis: `backend` (roxo, selecionada ✓), `frontend` (verde), `integração` (laranja), `ux` (rosa).
  - Checkbox `Demanda estrutural (agrupa sub-demandas)`.
- **Footer:** à esquerda checkbox `☐ Criar outra em seguida`; à direita `Cancelar` (outlined) e `Criar Demanda` (primário, ícone ✓) com hint `Enter ↵` sutil dentro do botão.
- **Interações:** Enter submete de qualquer campo; Esc cancela; ao criar, fecha por padrão e a nova demanda aparece na árvore com highlight amarelo de 2s; com 'Criar outra' marcado, permanece aberto, reseta e refoca o Nome.

**Dialog "Editar Projeto"** (mesmo esqueleto, 520px, não precisa aparecer aberto no mockup): Nome (autofocus) · Status · Cor (seletor de bolinhas) · Data de Início · Previsão de Término (validação `Deve ser posterior ao início`); footer `Cancelar / Salvar (Enter ↵)`; salvar aplica o retorno do PUT sem refetch/spinner.

## 6. Atalhos de teclado (rodapé discreto ou tooltips)

`N` Nova Demanda (gestor) · `/` Buscar · `E` Expandir/recolher tudo · `Enter` confirmar dialog · `Esc` fechar.

---

## Callouts numerados do mockup

- **① Status inline com undo** — a tag `Ativo ▾` do cabeçalho: mudar status do projeto em 2 cliques com toast `Desfazer` (antes: 4 cliques + dialog + refetch).
- **② Resumo sempre visível** — chips por status clicáveis + barra `268 h / 420 h (64%)`: progresso do projeto em 0 cliques, calculado do grafo já carregado.
- **③ Busca + expandir tudo + visões** — localizar demanda digitando 2–3 letras (antes 3–5 cliques de expansão) e pular para Grafo/Planejamento em 1 clique.
- **④ Ação no ponto de decisão** — linha clicável abre o detalhe (antes: right-click oculto + menu), hover revela `+ Sub` e `⋯`, ícones T·C·D mostram e abrem as descrições em 1 clique.
- **⑤ Dialog de baixo atrito** — autofocus + `Enter ↵` + `Criar outra em seguida`: criação de demanda em 2 interações, série de demandas sem fechar/reabrir.
- **⑥ Feedback sem espera** — skeleton no carregamento, criação com highlight na árvore, salvamento otimista sem spinner de página.
