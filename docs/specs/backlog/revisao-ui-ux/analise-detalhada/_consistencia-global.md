# Consistência global — achados transversais

> Produzido por um agente com visão de todas as 15 análises, após a verificação adversarial.

## Achados globais

### [ALTO] Execução ativa (timer) invisível fora da tela de Execuções
A regra de negócio mais central do sistema — 'nunca duas execuções ativas por usuário' — não tem representação global. O backend já expõe GET /execucao/ativa, mas nem a topbar, nem Atividades (listagem/detalhe), nem Ponto mostram um indicador vivo. O usuário descobre o conflito só no erro do backend, e pausar exige navegar 4+ passos. Isso aparece como problema independente em layout-topbar (P1), atividade-listagem (P05), atividade-detalhe (P1–P4) e execucao-historico (P4). Solução transversal: um único chip de execução ativa na topbar (timer vivo + pausa em 1 clique) que serve todas as telas, mais reuso do mesmo componente como banner/faixa nas telas de Atividades.

### [ALTO] Nenhum formulário do sistema tem autofocus nem submit por Enter
Padrão sistematicamente ausente em TODAS as 15 telas: login, justificativa de ponto, criar/editar usuário, projeto, demanda, atividade, execução, dia não útil, tag, anotações. Todo fluxo de criação exige 1 clique para focar + 1 clique no botão que o Enter dispensaria. É a correção transversal de melhor custo-benefício do sistema: um comportamento padrão de dialog (autofocus no primeiro campo editável, ngSubmit no form, Enter confirma, Esc cancela, Ctrl+Enter para 'salvar e criar outra') implementado uma vez e aplicado em ~20 dialogs.

### [ALTO] Confirm dialogs com mensagem factualmente falsa ('não pode ser desfeita') num sistema 100% soft delete
Usuários (P05), Projetos (P5), Demandas (P11), Atividades (P10), Calendário (P4), Tags (P4), Anotações (P6) — todas as exclusões usam p-confirmDialog bloqueante com texto que contradiz o comportamento real (soft delete em tudo). Padrão global correto: exclusão otimista imediata + toast com 'Desfazer' (DELETE adiado ~6s no cliente, já que não há endpoint de restauração). Elimina 2 cliques por exclusão, remove o mouse travel até o modal central e corrige a desinformação.

### [ALTO] Feedback destrutivo: refetch completo + spinner de página em toda mutação
Padrão repetido em Ponto (P5), Usuários (P15), Projetos (P9), Projeto-detalhe (P11), Demandas (P05/P14 — árvore colapsa ao recarregar), Atividades (P02), Calendário (P5), Tags (P6): cada criar/alterar/excluir dispara buscar*() completo, liga spinner central, causa flicker, perde scroll e estado de expansão. Os DTOs de retorno (CriadoDto/AlteradoDto) já trazem o registro completo — dá para atualizar o signal localmente. Regra global: mutações atualizam o estado local otimisticamente (com rollback em erro); GETs iniciais usam skeleton; recargas em visibilitychange são silenciosas quando já há conteúdo.

### [ALTO] Ações escondidas sem affordance: context menu de botão-direito e edição enterrada em dialogs aninhados
Projeto-detalhe (P1: 100% das ações da árvore só por right-click) e Demandas (P01) usam context menu invisível; Usuários enterra edição em 2 níveis de dialog (P01); Demanda-detalhe é 100% somente leitura exigindo dialog aninhado para qualquer campo (P1). Padrão global: linha/card 100% clicável abre o detalhe; ações secundárias em kebab '⋯' visível no hover/focus; ações de 1 dado (status, tag, cor) inline no ponto onde o dado é exibido. Right-click pode permanecer como atalho redundante, nunca como único caminho.

### [ALTO] Nenhum filtro/contexto sobrevive à navegação — e faltam buscas onde há listas
Filtros não persistem em Usuários (P07), Projetos (P4), Demandas (P06/P13), Atividades (P03), Execuções (P5); não existe busca textual em Projetos (P2), Demandas (P03), Tags (P2), árvore do Projeto-detalhe (P4); e p-selects de usuário/demanda não têm [filter] com até 100–200 opções (Ponto P3, Execuções P5, Demanda-conexões P5). Padrão global: (a) busca client-side com atalho '/' em toda listagem; (b) filtros segmentados de 1 clique (p-selectButton) para enums de ≤4 opções; (c) estado refletido em queryParams + último contexto (projeto, usuário, modo de visão) em localStorage; (d) [filter] obrigatório em qualquer p-select com >10 opções.

### [ALTO] Regras de permissão e negócio aplicadas de forma divergente entre telas
Atividade-detalhe ignora podeExecutar/podeIniciarExecucao/podeTrocarStatus que a listagem implementa (P3, P8); descrição de execução é obrigatória no detalhe e opcional na listagem (P5); default de status é PLANEJADA na página órfã e DESENVOLVENDO no dialog (P4 do formulário); dev não consegue imprimir o próprio ponto por um @if indevido (Ponto P2). As regras de exibição/permissão precisam viver em serviços/computed compartilhados, nunca duplicadas por tela.

### [ALTO] Dialogs de criação com comportamento pós-salvar imprevisível e sem 'criar outra' explícito
Nova Demanda não fecha após criar (modo 'criar vários' implícito e não comunicado — parece bug: projeto-detalhe P3, demanda-dialogs P2); Tags e Calendário fecham sempre, punindo a criação em série (~4 cliques/tag, ~72 cliques para 12 feriados); Atividade navega para outra página. Padrão global único: salvar fecha o dialog + toast; botão secundário 'Criar e adicionar outra' (Ctrl+Enter) mantém o dialog aberto preservando o contexto (pai, demanda, status, tags) e mostra confirmação inline do item recém-criado.

### [MEDIO] Formulários duplicados para a mesma tarefa (criar × editar, página × dialog)
Usuários tem dialog de criação e formulário de edição diferentes dentro do perfil (P04); Projetos tem criação na listagem e edição só no detalhe (P1); Tags tem dois dialogs quase idênticos (P7); Atividade tem rota órfã /atividade/nova duplicando o dialog da listagem com MENOS recursos (P1); dialogs criar × editar de demanda divergem em largura, campos e labels (P6). Consolidar em componentes únicos com modo criar/editar elimina inconsistência e metade da manutenção.

### [MEDIO] Empty states não acionáveis em todas as telas
Padrão idêntico repetido: ícone + texto 'Nenhum X encontrado', sem CTA, sem distinguir 'lista realmente vazia' (oferecer 'Novo X') de 'filtros esconderam tudo' (oferecer 'Limpar filtros') — Usuários P06, Projetos P8, Demandas P07 (que ainda confunde 'sem projeto selecionado' com 'projeto vazio'), Atividades P09, Execuções P7, Calendário P7, Tags P9, Ponto P11. Um componente compartilhado <app-empty-state> com variantes (vazio absoluto / filtro sem resultado / sem contexto) e CTA gated por perfil resolve todos de uma vez.

### [ALTO] Status editável inline existe em UMA tela e falta nas demais
O chip de status → popover (2 cliques) já existe no Planejamento de Demandas, mas mudar status na Lista custa 5 cliques (demanda P04), no card/detalhe de Projeto exige dialog completo (P3/P6), no detalhe de Demanda idem (P1), e em Atividades a troca recarrega a lista inteira. O padrão bom deve ser extraído como componente (tag colorida + caret ▾ + popover de opções + PUT otimista com rollback) e reutilizado em demandas, projetos e atividades — visível apenas para quem pode editar.

### [MEDIO] Navegação e 'início' inconsistentes: 3 destinos diferentes de home + rotas órfãs
Rota padrão é /ponto, o logo da topbar leva a /atividade, o pós-login leva hard-coded a /atividade e não há returnUrl (deep links são descartados). Existem rotas mortas (/atividade/nova sem link de entrada; /usuario/:id/anotacoes que redireciona ignorando o :id). Projeto-detalhe e /demanda duplicam a navegação do mesmo grafo sem atalho entre si (projeto-detalhe P8). Unificar: logo e pós-login → /ponto; guard e interceptor 401 preservam returnUrl; rotas órfãs removidas ou transformadas em deep-links funcionais.

### [MEDIO] Nenhum atalho de teclado no sistema inteiro
Zero atalhos globais ou locais: sem 'N' para novo item, '/' para busca, ←/→ para navegar dia/mês (Ponto, Execuções, Calendário), Ctrl+S nas anotações, Enter nos dialogs. Oportunidade global: convenção única em todas as telas (N = criar, / = buscar, ←/→ = período, T/Home = hoje, Esc = fechar) + tooltips com hint do atalho + futura paleta de comandos Ctrl+K para navegação entre módulos respeitando o perfil.

### [MEDIO] Ruído informacional padrão: datas repetidas, dicas permanentes e dados duplicados
Três micro-padrões repetidos: (1) datas completas 'dd/MM HH:mm' em contextos onde o dia já é conhecido (Ponto P6, Execuções P3) — usar só HH:mm; (2) dica de 'caracteres proibidos' permanentemente visível sob campos Nome em 5+ formulários (projetos, demandas, atividades, tags) — mostrar apenas no erro; (3) o mesmo dado renderizado duas vezes no mesmo dialog (Status no header e no grid do detalhe de demanda P7, 'Estrutural' ícone + texto).

### [MEDIO] Ações em massa inexistentes em todas as listas
Nenhuma tela tem seleção múltipla: inativar N usuários (P14), trocar status/tag de N demandas (P10/P18), N atividades (P15), excluir N tags (P15) custa N× o ciclo completo. Padrão global: checkbox de seleção nas tabelas de gestão (gestor) + barra de ações em massa flutuante quando ≥1 selecionado, iterando os endpoints unitários existentes.

### [MEDIO] Dados já retornados pelo backend não exibidos (custo zero de API)
Padrão recorrente de subutilização do DTO: metaMinutos do dia no Ponto (P9), anotacoes/createdDate no perfil de usuário (P08), nomeUsuario e horários nas execuções recentes do detalhe de atividade (P10), agregados do grafo (horasEstimadas/minutosExecutados) nunca somados no nível do projeto (projeto-detalhe P5), indicadores temDescricao* invisíveis na linha (P9). Antes de pedir endpoint novo, exibir o que já chega.

### [MEDIO] Toasts bottom-center como único canal de feedback, longe do ponto de ação
Toast em bottom-center colide com footers de dialogs (topbar P14), serve de único aviso para erros estruturais de formulário (atividade-formulario P12, execucoes P8 — validação fim>início via toast) e para confirmar criações em dialogs que não fecham. Padrão global: toasts em bottom-right; erros de validação inline junto ao campo; toasts de sucesso carregam 'Desfazer' quando aplicável.

### [BAIXO] Tema e tokens violados por cores hardcoded e hacks de dimensionamento
O grafo de demandas usa dark hardcoded (#0d1117, #4a9eff) quebrando o tema claro (demanda P10); o calendário usa zoom:1.75 com ::ng-deep (P13); a tela de login não oferece toggle de tema (P12). Regra: todo componente usa tokens Aura/surface-*, nunca hex fixo fora da paleta de dados (cores de projeto/tag).

### [BAIXO] Seletor de cor duplicado e sem disclosure progressivo (Projetos + Tags)
Ambas as telas exibem simultaneamente colorpicker inline + hex + paleta ocupando 1/3–1/2 do dialog, quando o caso dominante é 1 clique na paleta (projeto P7, tag P5, com hex falhando silenciosamente — tag P13). Extrair um componente único: paleta de swatches visível + 'Cor personalizada' colapsado revelando picker/hex com validação.

### [MEDIO] Onboarding e diferenciação de perfil invisíveis
A identidade do usuário (nome/tipo) só aparece via hover no ícone genérico da topbar (P7), embora o perfil mude radicalmente o que cada tela mostra. Botões que somem sem explicação (play oculto por status — atividade P17) não ensinam as regras. Padrão: avatar com iniciais + nome na topbar; controles não aplicáveis ficam desabilitados com tooltip explicando a regra (nunca somem causando layout shift — cf. Ponto P12).

## Top 10 prioridades do sistema (impacto × frequência)

1. **Chip de execução ativa na topbar com timer vivo e pausa em 1 clique** _(layout-topbar (afeta todas as telas))_
   Torna visível, de qualquer tela, a regra de negócio mais central do sistema ('nunca duas execuções ativas'). Elimina os 4+ passos para conferir/pausar o timer, previne timers esquecidos e conflitos descobertos só no erro do backend. O endpoint GET /execucao/ativa já existe — impacto máximo, usado dezenas de vezes por dia por todos os perfis.
2. **Padrão único de formulário: autofocus + Enter submete + footer padronizado + defaults inteligentes** _(global (todos os ~20 dialogs))_
   Ausência sistemática nas 15 telas: cada criação paga 2+ cliques evitáveis (focar campo + mirar botão). Um comportamento base implementado uma vez (autofocus, ngSubmit, Esc, Ctrl+Enter, botão com verbo específico, defaults de data/usuário/contexto) corrige o app inteiro e é o maior redutor agregado de cliques do sistema.
3. **Substituir confirm dialogs por exclusão otimista com 'Desfazer' no toast** _(global (Usuários, Projetos, Demandas, Atividades, Calendário, Tags))_
   Todas as exclusões usam modal bloqueante com mensagem factualmente falsa ('não pode ser desfeita') num sistema 100% soft delete. Undo economiza 2 cliques + mouse travel por exclusão, corrige a desinformação e é mais seguro que o confirm que os usuários clicam no automático.
4. **Ações visíveis na árvore/lista de demandas: clique abre detalhe, kebab no hover, fim do botão-direito obrigatório** _(demanda-pagina + projeto-detalhe + demanda-dialogs)_
   Hoje 100% das ações da árvore estão atrás de context menu sem nenhuma affordance — usuários que não descobrem o right-click ficam sem acesso a editar/tags/membros/descrições, e o clique mais óbvio da tela (linha da demanda) é dead click. É a área de trabalho principal do produto (grafo projeto→demanda) inutilizável para novatos e touch.
5. **Chip de status editável inline (tag + ▾ + popover, PUT otimista) reutilizado em demandas, projetos e atividades** _(global (extraído do Planejamento de Demandas))_
   Trocar status é a micro-ação mais frequente do sistema e custa 4–6 cliques via dialogs de edição completos em quase todas as telas, sendo que o padrão bom (2 cliques) já existe no Planejamento. Extrair como componente compartilhado ataca de uma vez demanda P04, projeto P3/P6, projeto-detalhe P6, demanda-dialogs P1 e atividade-detalhe.
6. **Busca em toda listagem + [filter] em todo select longo + filtros persistidos em URL/localStorage** _(global (todas as listagens e selects))_
   Não há busca em Projetos, Tags, árvore de demandas; selects de 100+ usuários/200 demandas sem filtro digitável; e NENHUMA tela lembra filtros/contexto entre visitas (2–6 cliques refeitos a cada navegação/F5). Localizar-e-agir é o loop básico de todas as telas — este pacote reduz o custo de entrada de todas elas.
7. **Feedback otimista + skeleton: fim do ciclo 'mutação → refetch completo → spinner → tela pisca'** _(global (mutações e cargas))_
   Toda ação hoje recarrega a lista inteira, perde scroll e colapsa a árvore de demandas (o caso mais doloroso: mexer numa demanda profunda e reexpandir tudo). Os DTOs de retorno já trazem o registro — atualizar o signal localmente elimina a latência percebida em TODAS as ações e viabiliza os padrões inline das prioridades 3 e 5.
8. **Fluxo de execução sem atrito: defaults no registro manual, 'usar descrição anterior' ao iniciar, permanecer no contexto** _(atividade-listagem + atividade-detalhe)_
   É o coração operacional do dia a dia dos devs. Registrar execução manual parte de 2 datetimes vazios (~10–14 cliques); iniciar execução exige redigitar a descrição toda vez apesar de as últimas execuções estarem na tela; e iniciar do detalhe EXPULSA o usuário para /execucao. Defaults (hoje/agora + chips de duração), botão 'Usar esta descrição' e permanência na página cortam o custo da tarefa mais repetida do sistema.
9. **returnUrl no guard/interceptor + destino único /ponto (pós-login e logo) + nunca persistir senha** _(login + layout-topbar)_
   Acontece em todo início de sessão de todos os usuários: deep links são descartados (2+ cliques perdidos), o app tem 3 'inícios' diferentes quebrando o modelo mental, e a senha em texto puro no localStorage é um risco de segurança real disfarçado de conveniência. Correção barata, frequência máxima, e elimina o problema de gravidade mais alta do sistema.
10. **Comportamento pós-criar único: fechar + toast, com 'Criar e adicionar outra' explícito preservando contexto** _(global (dialogs de criação: Demandas, Tags, Calendário, Atividades))_
   Hoje o pós-salvar é imprevisível: Nova Demanda fica aberta silenciosamente (parece bug), Tags/Calendário fecham sempre punindo a carga em série (~72 cliques para 12 feriados), Atividade navega para fora. Um único padrão resolve a insegurança ('salvou?') e transforma a criação em lote — caso de uso real de gestores — em Ctrl+Enter repetido.

## Diretrizes de padronização visual/interação

DIRETRIZES OBRIGATÓRIAS PARA TODOS OS MOCKUPS — Project 2.0 (um único produto)

## 0. Base visual
- PrimeNG Aura, primário azul #3B82F6 (hover #2563eb). Tailwind para utilitários. Ambos os temas devem funcionar; mockup padrão em tema CLARO salvo indicação da spec da tela.
- Fundo da página: surface-50 (claro) / surface-950 (escuro). Superfícies elevadas (cards, tabelas, dialogs): surface-0 / surface-900, borda 1px surface-200/800, radius 8px (cards) e 12px (dialogs).
- Tipografia: Inter/system. H1 de página 1.5rem semibold; título de dialog 1.125rem semibold; corpo 0.875rem; metadados/muted 0.8125rem cor text-muted. Fonte mono apenas para relógios/timers e códigos (PORTAL-01).
- Espaçamento: página com padding 24px; gap vertical entre regiões 20px; dentro de cards 16px. Container: telas de gestão são fluidas; telas de leitura (Ponto, detalhe de atividade) max-width 960–1120px centralizado.
- NUNCA usar emojis como ícones funcionais — sempre PrimeIcons (pi-*).

## 1. Topbar (idêntica em todas as telas autenticadas)
64px, fixa, surface-0, borda inferior. Esquerda→direita: logo "P2.0" (link para /ponto) · itens de navegação com o item ativo em pill azul suave (Ponto, Calendário*, Projetos*, Demandas, Atividades, Execuções, Tags*, Usuários* — * só gestor) · CHIP DE EXECUÇÃO ATIVA quando houver (pill âmbar/azul: ícone pi-play pulsando + descrição truncada + timer mono HH:MM:SS + botão pause) · relógio "14:32 · 10/07/2026" (link para /ponto) · ícone sol/lua (toggle tema, 1 clique) · ícone pi-file-edit (Minhas Anotações) · avatar circular 32px com iniciais (ex.: "AS") que abre menu de perfil (nome, tipo, switch "Tempos em dias", Sair). Sem botão de logout exposto.

## 2. Header de página (anatomia única)
Linha única flex space-between:
- ESQUERDA: H1 substantivo puro ("Usuários", "Projetos", "Tags", "Execuções" — nunca "Gerenciar X") + contador muted ao lado ("12 tags", "128 atividades · 3 em execução"). Subtítulo opcional muted abaixo (data por extenso, breadcrumb).
- DIREITA: no MÁXIMO 1 botão primário sólido azul (a ação de criação: "Novo Usuário", "Nova Demanda") com tooltip incluindo atalho "(N)"; demais ações como outlined/secondary à esquerda dele (Imprimir, Relatório). Controles condicionais ficam DESABILITADOS com tooltip, nunca somem (sem layout shift).
- Telas de detalhe: botão texto "← [Listagem]" acima do H1; breadcrumb muted 0.85rem (Projeto › Demanda) na linha 1; H1 na linha 2 com p-tag de status colorida ao lado (com caret ▾ se editável).

## 3. Toolbar de filtros (abaixo do header, linha única com wrap, gap 12px)
Ordem fixa: (1) busca à esquerda, input com pi-search embutido, placeholder "Buscar…  ( / )", × interno para limpar, flex-1 max-width ~380px; (2) filtros segmentados p-selectButton para enums ≤4 opções com contadores ("Todos (8) · Ativos (5)"), opção ativa em azul sólido; (3) p-select com [filter] para listas >10 itens (usuário, projeto), largura ~240px, com × de clear; (4) navegação temporal como grupo segmentado [◀][ data 📅 ][▶] + botão texto "Hoje" desabilitado quando já em hoje; (5) link discreto "Limpar filtros" SOMENTE quando algum filtro ≠ default. Filtros ativos por deep-link aparecem como chip removível ("Demanda: Checkout ×"). Estado sempre refletido em queryParams.

## 4. Tabelas (p-table)
- Header de coluna 0.75rem uppercase muted. Linhas 44–48px, zebra sutil opcional, hover surface-100.
- Linha inteira clicável abre o detalhe (cursor pointer); nome/título em peso 500 cor padrão (não azul).
- Coluna de identidade de pessoa: avatar de iniciais 28px + nome + subtexto (login/cargo) fundidos numa célula.
- Status: p-tag colorida (verde=ativo/concluída, azul=info/desenvolvendo, âmbar=pausado/pendente, cinza=inativo/cancelado — NUNCA vermelho para estados neutros; vermelho só para erro/destrutivo).
- AÇÕES: máx. 2 icon-buttons visíveis (a ação frequente — play/pause, editar) + kebab "⋯" com o resto; aparecem com opacidade plena no hover/focus da linha (60% em repouso). Ícones 32px com tooltip sempre.
- Célula de status/tag editável inline: tag com caret ▾ → popover de opções, salvamento otimista.
- Horários dentro de contexto de um dia: só HH:mm. Durações: pipe de horas (1h35), nunca minutos crus.
- Linhas "em execução": fixadas no topo, borda esquerda 3px azul, timer vivo mono.
- Paginação 25/página default; paginador oculto quando ≤1 página.

## 5. Grades de cards (Projetos, Tags, Ponto-equipe)
Grid responsivo minmax(280px,1fr) gap 16px. Card: borda 1px, radius 8px, hover eleva sombra + revela kebab "⋯" no canto sup. direito (ações: Editar, Excluir…). Elemento de status/cor clicável para edição inline quando o perfil permite. Card inteiro clicável navega ao detalhe (role=button, tabindex=0).

## 6. Dialogs (p-dialog)
- Larguras padronizadas: FORM SIMPLES 480px · FORM PADRÃO 560px · DETALHE RICO 960–1100px (maximizável) · nunca 95vw genérico. Sempre min(96vw, X).
- Header: título 1.125rem + X. Esc fecha, clique-fora fecha (dismissableMask) — exceto quando há edição não salva SEM auto-save, caso em que pergunta ANTES de fechar com 3 opções (Salvar / Descartar / Continuar editando).
- FOOTER ÚNICO E OBRIGATÓRIO para forms, alinhado à direita: [texto "Cancelar"] [outlined "Criar e adicionar outra" — só em criação, quando fizer sentido] [primário sólido com verbo específico: "Criar projeto", "Salvar alterações" — nunca "Salvar" genérico]. Nenhum botão de ação no corpo.
- Comportamento: autofocus no primeiro campo editável; Enter submete; Ctrl+Enter = criar e adicionar outra; botão primário desabilitado com form inválido; campos com defaults inteligentes pré-preenchidos (data=hoje, usuário=logado, contexto=tela de origem).
- Disclosure progressivo: campos raros/opcionais atrás de link "Mais opções ▾" colapsado. Dicas de restrição (caracteres proibidos) só aparecem como erro inline vermelho sob o campo, nunca permanentes.
- Detalhes ricos: sem footer (X/Esc fecham); edição inline nos próprios elementos (título click-to-edit com lápis no hover, tag de status com ▾, chips de tags com "+ Tag").

## 7. Empty states (componente único)
Centrado, ícone pi-* 2.5rem muted, título 1rem, texto 0.875rem muted, e SEMPRE uma ação: (a) lista vazia → botão primário da criação ("+ Nova Tag") se o perfil permite; (b) filtro sem resultado → texto "Nenhum resultado para os filtros atuais" + botão outlined "Limpar filtros"; (c) sem contexto selecionado → instrução + apontar o seletor ("Escolha um projeto acima"). Nunca ícone+texto sozinhos.

## 8. Feedback
- Toasts: bottom-right, 5s; sucesso de remoção/alteração destrutiva SEMPRE com botão "Desfazer" embutido. Sem confirm dialog para ações soft-delete — exclusão imediata otimista + undo. Confirm modal SÓ para ações realmente definitivas, com o nome do item na mensagem e texto fiel ao comportamento real.
- Loading: skeleton na primeira carga (mesma estrutura da tabela/cards); recargas mantêm o conteúdo anterior esmaecido (opacity .5) com barra fina de progresso — nunca spinner central substituindo tudo.
- Mutações: atualização local otimista do signal com rollback + toast de erro. Erros de validação inline junto ao campo, não em toast.
- Indicador de salvamento automático (anotações): texto vivo único no header do painel — "Salvando…" → "Salvo às 14:32" — sem botão Salvar manual redundante.

## 9. Atalhos de teclado (convenção única, exibidos em tooltips)
N = novo item da tela · / = focar busca · ←/→ = período anterior/seguinte · T = hoje · Enter = confirmar dialog · Ctrl+Enter = criar e adicionar outra · Esc = fechar/limpar busca. Ícone pi-question-circle no header lista os atalhos da tela.

## 10. Callouts numerados dos mockups
Balões circulares âmbar (#F59E0B, texto branco, 24px, semibold) com números ① ② ③ ④ ⑤ ⑥, posicionados FORA do fluxo (absolute) apontando para a melhoria, com legenda numerada correspondente num painel âmbar-claro fixo no rodapé ou lateral do mockup ("① Status editável inline — antes: 5 cliques via dialog"). Máx. 6 callouts por mockup; numerar em ordem de leitura (topo→baixo, esquerda→direita). O callout descreve o GANHO (antes → depois em cliques), não só o elemento.

## 11. Conteúdo de exemplo canônico (usar em TODOS os mockups)
Gestora logada: Ana Souza (@ana.souza, iniciais AS). Devs: Bruno Lima, Carla Mendes, Diego Ramos, Elisa Castro. Projeto em contexto: "Portal do Cliente" (PORTAL-01, cor #2563eb, Ativo); secundários: "App de Campo", "Faturamento". Demandas: "Área Logada" › "Autenticação de Usuários", "Checkout com um clique" (#42). Atividade: #317 "Implementar validação de cartão" (Desenvolvendo). Tags: Backend (azul #3B82F6), Frontend (verde #22C55E), Urgente (vermelho #EF4444), Refatoração (roxo #8B5CF6), Pagamentos (verde #10B981). Data de referência: quinta-feira, 10/07/2026, 14:32. Timer de exemplo: 01:47:32. Não inventar dados além dos DTOs citados em cada spec (ex.: sem contagem de uso de tags).
