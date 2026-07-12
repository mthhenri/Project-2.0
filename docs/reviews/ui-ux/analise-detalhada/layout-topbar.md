# Layout global + Topbar (navegação, perfil, anotações, tema) ((todas as telas))

## Fluxos atuais
- **Navegar para outro módulo (ex.: Atividades)** (1 cliques): Clicar no item da nav na topbar; visível de qualquer tela
- **Verificar se há uma execução (timer) rodando e pausá-la** (4 cliques): Clicar em 'Execuções' na nav → aguardar carregamento da listagem → localizar a execução ativa → clicar em pausar → (dev) preencher descrição e confirmar
- **Alternar tema claro/escuro** (2 cliques): Clicar no ícone de perfil → clicar em 'Tema escuro/claro' no popover
- **Alternar exibição de tempos (horas ↔ dias)** (2 cliques): Clicar no ícone de perfil → clicar em 'Ver tempos em dias/horas'
- **Abrir anotações, editar e fechar salvando** (3 cliques): Clicar em 'Minhas Anotações' → digitar → clicar em 'Salvar Anotações' → clicar no X (ESC e clique fora desabilitados). Se fechar sem salvar: X → decidir no confirm 'Salvar/Descartar' (+1 clique)
- **Ver quem está logado e o tipo do perfil** (1 cliques): Hover no ícone de perfil (tooltip só com nome) ou 1 clique para abrir o popover com nome, @login e tipo
- **Sair do sistema** (1 cliques): Clicar no ícone de sair (imediato, sem confirmação — sujeito a logout acidental por ficar colado ao ícone de perfil)
- **Trocar a cor primária do tema (recurso oculto)** (4 cliques): Abrir popover de perfil → botão DIREITO no toggle de tema → clicar em '???' → clicar num swatch ou usar o colorpicker
- **Voltar à tela inicial pelo logo** (1 cliques): Clicar no logo → cai em /atividade, que NÃO é a rota padrão (/ponto)

## Problemas
- [ALTA] P1: A informação mais crítica do sistema — a execução (timer) ativa do usuário — é invisível na topbar. O backend já expõe GET /execucao/ativa (ExecucaoAtivaDto: id, atividadeId, descricao, inicioData) e a regra 'nunca duas execuções ativas' torna essencial saber, de qualquer tela, se há timer rodando. Hoje o usuário precisa navegar até Execuções (4+ passos) só para conferir/pausar, e é fácil esquecer um timer aberto.
- [ALTA] P2: Logo aponta para /atividade, mas a rota padrão do app é /ponto (redirect de ''). Dois 'inícios' diferentes quebram o modelo mental de navegação e a consistência.
- [MEDIA] P3: Toggle de tema claro/escuro escondido no popover de perfil (2 cliques + baixa descobribilidade). Padrão consolidado é um ícone sol/lua de 1 clique direto na topbar. O mesmo vale para o toggle horas/dias, que é uma preferência de exibição usada com frequência por quem analisa demandas.
- [MEDIA] P4: Nenhum tratamento responsivo/overflow na navegação: 8 itens com whitespace-nowrap + relógio + 3 botões estouram em janelas menores, sem menu 'Mais', sem colapso para ícones e sem hambúrguer.
- [MEDIA] P5: Dialog de anotações em 95vw×95vh bloqueia todo o contexto para uma nota pessoal; closeOnEscape=false e dismissableMask=false obrigam a mirar no X. Fechar com edições pendentes fecha o dialog ANTES de perguntar e o confirm oferece só 'Salvar/Descartar' — sem 'Cancelar/voltar a editar'; um clique errado em Descartar perde texto sem undo.
- [MEDIA] P6: Fluxo de salvamento das anotações é redundante e ruidoso: existe auto-save a cada 30s (que aliás envia PUT mesmo SEM alterações — salvarSilencioso não checa temAlteracoesNaoSalvas), mas ainda há botão 'Salvar' manual + confirmDialog ao fechar. Com auto-save de verdade, fechar deveria simplesmente salvar (ou salvar ao fechar) sem perguntar nada.
- [MEDIA] P7: Identidade do usuário invisível sem interação: só um ícone genérico pi-user; nome/tipo exigem hover ou clique. Num sistema com dois perfis (Gestor × Desenvolvedor) que mudam o que a tela mostra, exibir iniciais/nome custa pouco e elimina o hover.
- [MEDIA] P8: Loading global com scrim de tela inteira em toda requisição contradiz o critério de feedback imediato/otimista: qualquer GET bloqueia a interação com o conteúdo (a topbar fica clicável, mas o corpo não). Sem skeletons ou loading localizado.
- [BAIXA] P9: Nenhum atalho de teclado global: não há como navegar entre módulos, abrir anotações ou alternar tema pelo teclado; no editor de anotações Ctrl+S não salva e ESC não fecha.
- [BAIXA] P10: Botão de logout de 1 clique, sem confirmação nem undo, posicionado colado ao ícone de perfil — alvo fácil de clique acidental que derruba a sessão. Melhor dentro do menu de perfil (ação rara não merece espaço permanente — disclosure progressivo).
- [BAIXA] P11: Inconsistência visual na região direita: 'Minhas Anotações' é o único botão com label textual; relógio em font-mono precisa de nudge de 1px para alinhar baseline; os demais são só-ícone. A hierarquia não reflete a frequência de uso real.
- [BAIXA] P12: Labels dos toggles no popover são ambíguos: 'Ver tempos em dias' descreve a AÇÃO, não o estado atual — o usuário precisa raciocinar sobre o que está ativo. Switches com estado explícito eliminam a ambiguidade.
- [BAIXA] P13: Relógio (hora + data) ocupa espaço nobre da topbar sem ser acionável — poderia ao menos linkar para o Ponto (registro de ponto é a rota padrão e o caso de uso natural de 'olhei a hora').
- [BAIXA] P14: Toast global em bottom-center pode sobrepor os footers de dialogs (que ficam na mesma região central inferior), cobrindo botões primários logo após uma ação.
- [BAIXA] P15: Tema personalizado é um easter egg (botão direito + '???'): se for feature de verdade, tem descobribilidade zero; se for brincadeira intencional, ok — mas o custo de 4 interações para trocar uma cor não atende usuário nenhum que a queira de fato.
- [BAIXA] P16: Estado de carregamento do dialog de anotações é apenas spinner + texto; sem skeleton do editor, causando salto de layout quando o conteúdo chega.

## Sugestões (JÁ VERIFICADAS)
### S1 — Chip de execução ativa com timer e pausa inline na topbar [impacto alto]
Consumir GET /execucao/ativa no boot do layout via serviço/signal compartilhado (hoje cada tela chama recuperarExecucaoAtiva isoladamente) e renderizar chip persistente entre a nav e as ações: ponto verde pulsante + descrição DA EXECUÇÃO truncada (ExecucaoAtivaDto.descricao — o DTO não traz nome da atividade; fallback 'Execução em andamento' quando vazia, caso possível para gestor) + cronômetro ao vivo desde inicioData + botão Pausar. Clique no corpo → /execucao. Pausar abre popover com textarea PRÉ-PREENCHIDA com a descrição atual (PATCH /execucao/:id/encerrar sobrescreve a descrição — enviar vazio apagaria a existente; a tela de Atividades já pré-preenche assim), foco automático, Enter envia; obrigatória quando o dono da atividade é desenvolvedor, opcional quando gestor (regra real do service — no chip o dono é sempre o usuário logado, pois GET /execucao/ativa filtra por atividade.usuario_id). Atualização otimista com rollback em erro. Chip deve se atualizar em document:visibilitychange/window:focus (padrão já usado em Ponto/Atividades/Execuções), pois o backend auto-encerra execuções abertas às 23:59:59 — sem isso o cronômetro fica falso após a virada do dia. Sem execução ativa: texto discreto 'Sem execução ativa' linkando para /atividade. Não viola permissões: o endpoint só retorna execução de atividade do próprio usuário, então dev nunca pausa execução alheia pelo chip; gestor pausando execuções de terceiros permanece nas telas de Atividades/Execuções.
_Redução de esforço:_ conferir/pausar o timer: de 4+ cliques (navegar até Atividades, achar a linha, abrir dialog, confirmar) para 1–2 cliques de qualquer tela; pré-preenchimento elimina redigitação da descrição já informada no início; reduz timers esquecidos rodando

### S2 — Toggle de tema sol/lua direto na topbar + switch 'Tempos em dias' no menu [impacto medio]
Mover a alternância claro/escuro do popover de perfil para botão-ícone na região direita (pi-moon no claro, pi-sun no escuro, tooltip); TemaService.alternarTema()/eEscuro() já existem e persistem em localStorage. O easter egg do tema personalizado (contextmenu que revela '???') hoje está no botão de tema DENTRO do popover — deve migrar junto: contextmenu no novo botão sol/lua da topbar revela o desbloqueio; a seção de tema personalizado (swatches + colorpicker + Voltar ao azul/Esquecer) permanece no menu de perfil quando desbloqueada. O toggle horas/dias vira p-toggleswitch rotulado 'Tempos em dias' no menu de perfil (VisualizacaoTempoService.alternar()/emDias() já existem), substituindo a frase-ação ambígua 'Ver tempos em dias/horas'.
_Redução de esforço:_ tema: de 2 cliques (abrir popover + clicar) para 1; descobribilidade imediata; switch com estado legível elimina a dúvida sobre o modo atual

### S3 — Logo → rota padrão /ponto (consistência de 'início') [impacto baixo]
Trocar o routerLink do logo de /atividade para /ponto em topbar.component.html:3, alinhando com o redirect padrão do app ({ path: '', redirectTo: 'ponto' } em app.routes.ts:27). Adicionar tooltip 'Início — Ponto'. Mudança de 1 linha, sem dependência de backend.
_Redução de esforço:_ elimina a navegação-surpresa (clicar no logo esperando a home e cair em Atividades custa 1 clique extra de correção); consistência entre 'início' do redirect e do logo

### S4 — Avatar de iniciais no gatilho do perfil + 'Sair' movido para dentro do menu [impacto medio]
Substituir o ícone genérico pi-user por avatar circular com iniciais derivadas de sessao.nomeCompleto() (dados já disponíveis no UsuarioSessaoService) + primeiro nome visível em ≥1280px. Mover o botão 'Sair' — hoje exposto na topbar ao lado do perfil, com mesmo estilo/tamanho, sujeito a clique acidental cujo custo é relogar — para o final do menu de perfil, como item com pi-sign-out separado por divisor. Sem dialog de confirmação: a ação rara fica a 2 cliques, o erro acidental de 1 clique desaparece. O topo do menu mantém nome, @login e tipo (Gestor/Desenvolvedor), que já existem no popover atual.
_Redução de esforço:_ identificar quem está logado: de 1 hover/clique para 0; logout acidental eliminado sem adicionar confirmação

### S5 — Anotações: dialog compacto, fechar salva automaticamente, indicador vivo de salvamento [impacto alto]
Confirmado no código: o dialog atual é 95vw×95vh com closeOnEscape=false, dismissableMask=false, confirmDialog Salvar/Descartar ao fechar com pendências, e auto-save INCONDICIONAL a cada 30s (salvarSilencioso não checa temAlteracoesNaoSalvas — faz PUT mesmo sem mudanças). Reformular: reduzir para ~840px × 70vh; reabilitar ESC e clique no scrim; ao fechar com alterações pendentes, salvar automaticamente e mostrar toast 'Anotações salvas' — COM tratamento de falha: se o PUT falhar após o fechamento, exibir toast de erro com ação 'Reabrir' preservando o conteúdo do editor (hoje aoTentarFechar fecha o dialog antes de decidir; salvar-ao-fechar sem tratamento de erro perderia texto silenciosamente). Remover o confirmDialog de fechamento. Auto-save a cada 30s apenas quando temAlteracoesNaoSalvas()=true. Ctrl+S salva; foco automático no editor ao abrir. Rodapé com indicador vivo 'Salvo às HH:mm' (anotacoesAlteracaoData já vem na resposta do PUT) ↔ 'Salvando…' ↔ 'Alterações não salvas', substituindo a dica estática e a tag 'Alterado' do header. Skeleton do editor no carregamento (hoje é spinner com texto). 'Limpar' mantém confirmação — correto, pois é campo de texto sem undo no backend.
_Redução de esforço:_ fechar salvando: de 2–3 cliques mirados (Salvar + X, ou X + decidir no confirm) para 1 tecla (ESC) ou 1 clique fora; risco de perda por 'Descartar' acidental eliminado; elimina PUTs desnecessários a cada 30s sem mudanças

### S6 — Atalhos de teclado globais de navegação (respeitando o perfil) [impacto medio]
Não existe nenhum atalho global hoje (nenhum HostListener de keydown no layout). Registrar no layout: 'g' seguido de p/d/a/e (Ponto, Demandas, Atividades, Execuções) para todos, e g+c/j/t/u (Calendário, Projetos, Tags, Usuários) APENAS para gestor — mesmo filtro somenteGestor da nav; para desenvolvedor esses atalhos são ignorados, não apenas bloqueados pelo guard de rota. 'n' abre Minhas Anotações. Ignorar atalhos quando o foco está em input/textarea/elemento contenteditable (o editor Quill das anotações é contenteditable) e quando há dialog/popover aberto. Exibir o atalho nos tooltips dos itens de nav ('Atividades — g a'). Implementação 100% local, sem backend.
_Redução de esforço:_ navegação para usuários frequentes: de 1 clique de mouse para 2 teclas sem mover o mouse; descobrível via tooltips já existentes

### S7 — Navegação responsiva com overflow 'Mais' [impacto medio]
A nav atual usa whitespace-nowrap sem nenhum tratamento responsivo; o gestor tem 8 itens que estouram em janelas médias. Em 1024–1280px, esconder labels e manter ícones com tooltip; abaixo de ~900px, colapsar os itens menos frequentes (Calendário, Projetos, Tags, Usuários — justamente os somenteGestor) em item 'Mais ▾' com menu. Para desenvolvedor restam 4 itens e o 'Mais' simplesmente não aparece — o colapso deve ser condicional ao excedente, não fixo. Ponto, Demandas, Atividades e Execuções permanecem sempre a 1 clique.
_Redução de esforço:_ evita itens de navegação inacessíveis/estourados em janelas menores ou lado a lado; mantém 1 clique para os itens frequentes em qualquer largura

### S8 — Toast bottom-right + scrim global apenas em mutações [impacto baixo]
Mover o p-toast de bottom-center (layout.component.html:7) para bottom-right, evitando cobrir footers de dialogs centralizados. Restringir o scrim global do loadingInterceptor — que hoje dispara em TODA requisição, GETs incluídos, após 250ms — a mutações (checagem trivial de requisicao.method no interceptor), deixando GETs com os skeletons/signals de carregando locais que várias telas já possuem. NOTA: 'topbar segue clicável durante carregamento' já é o comportamento atual (topbar z-index 801 acima do overlay 800, documentado no SCSS) — não apresentar como melhoria nova.
_Redução de esforço:_ elimina o bloqueio de tela inteira em listagens lentas e toasts cobrindo os botões de rodapé que o usuário acabou de usar


## Ajustes na spec (verificador)
1) §2.3 — O chip NÃO pode exibir "descrição da atividade": ExecucaoAtivaDto traz apenas {id, atividadeId, descricao, inicioData} — não há nome da atividade. Exibir a descrição DA EXECUÇÃO truncada, com fallback "Execução em andamento" quando vazia (gestor pode iniciar sem descrição). Rotular o exemplo "Checkout do carrinho" como descrição da execução. 2) §2.3 — O popover Pausar deve PRÉ-PREENCHER a textarea com a descrição atual da execução: PATCH /execucao/:id/encerrar sobrescreve a descrição com o valor enviado (execucao.service.ts:211) — enviar vazio apaga a descrição existente e o dev (obrigado a descrever no início) teria que redigitar; a tela de Atividades já pré-preenche assim (atividade-listagem.page.ts:592). 3) §2.3 — Adicionar refresh do chip em document:visibilitychange/window:focus (padrão já usado em Ponto/Atividades/Execuções): o backend auto-encerra execuções abertas às 23:59:59 (cron em execucao.service.ts:53); sem refresh o cronômetro exibe tempo falso após a virada do dia. 4) §2.3 — Formular a regra da descrição como no service: "obrigatória quando o DONO DA ATIVIDADE é desenvolvedor, opcional quando é gestor" (descricaoObrigatoria consulta o tipo do dono); no chip isso equivale ao usuário logado porque GET /execucao/ativa filtra por atividade.usuario_id, mas a spec deve citar a regra real. 5) §2.5/§2.7 — O easter egg diz "botão direito no item de tema" do menu, mas com o toggle movido para a topbar não existe mais item de tema no menu: especificar que o contextmenu passa para o botão sol/lua da topbar (revelarEnigma hoje está atrelado ao botão de tema do popover). 6) §3 — Atalhos g+c, g+j, g+t, g+u devem existir apenas para gestor (mesmo filtro somenteGestor da nav); acrescentar que atalhos são ignorados também com dialog/popover aberto, além de foco em input/contenteditable (o editor Quill é contenteditable). 7) §4 — O fechar-salvando precisa de tratamento de falha: se o PUT falhar após ESC/clique fora, exibir toast de erro com ação "Reabrir" preservando o conteúdo (o fluxo atual fecha o dialog antes de qualquer decisão; a spec não cobre falha de rede/validação e perderia texto silenciosamente). 8) §1/§6 — "Topbar sempre clicável" já é comportamento atual (z-index 801 acima do overlay 800, documentado em topbar.component.scss); apresentar apenas a restrição do scrim a mutações como mudança. 9) §2.4 — O relógio atual mostra hora E data completa ("14:32 10/07/2026"); a spec reduz para só hora com data no tooltip — manter, mas registrar como mudança consciente, não como estado atual. 10) §2.2 — Item ativo atual TEM glow (text-shadow em topbar.component.scss:31); a spec diz "mantém o padrão atual, sem glow" — contraditório: ou remove o glow (mudança) ou mantém o padrão atual (com glow); recomendo declarar a remoção do glow como decisão explícita.

## REDESIGN SPEC
# Redesign — Layout global + Topbar (Project 2.0)

Aplica-se a todas as telas autenticadas. Stack: Angular 21 standalone + Signals, PrimeNG (Aura, primário azul `#3b82f6`) + Tailwind, temas claro/escuro. Usuária de exemplo logada: **Ana Souza** (@ana.souza, **Gestora**). Dev de exemplo: **Bruno Lima** (@bruno.lima).

---

## 1. Estrutura geral da página

```
┌──────────────────────────────────────────────────────────────────────────────┐
│ TOPBAR (64px, fixa, surface-0, sombra sutil, borda inferior)                  │
├──────────────────────────────────────────────────────────────────────────────┤
│ CONTEÚDO (router-outlet, p-6, bg surface-50 / surface-950, overflow-auto)     │
│                                                                              │
│                                                  [toasts: bottom-right]      │
└──────────────────────────────────────────────────────────────────────────────┘
```

- **Toasts:** `p-toast position="bottom-right"` (não cobre footers de dialog centralizados). Toasts de sucesso com ação **Desfazer** quando aplicável.
- **Loading:** scrim global apenas em mutações; GETs usam skeleton local nas telas. Topbar sempre clicável.

---

## 2. Topbar — região por região (desktop ≥1280px)

```
┌──────────────────────────────────────────────────────────────────────────────────────────┐
│ [◆ P2.0] Ponto Calendário Projetos Demandas Atividades Execuções Tags Usuários            │
│                    ①[● Checkout do carrinho · 01:47:32  ⏸ Pausar]  14:32 ②🌙 ③📝 ④(AS) Ana │
└──────────────────────────────────────────────────────────────────────────────────────────┘
```

### 2.1 Logo (esquerda)
- Marca 32px + wordmark "Project 2.0" (esconde a wordmark <1280px).
- **Link: `/ponto`** (rota padrão do app — corrige o atual `/atividade`). Tooltip: "Início — Ponto".

### 2.2 Navegação (centro-esquerda)
- Itens (ícone + label, 1 clique): **Ponto** `pi-clock` · **Calendário** `pi-calendar`* · **Projetos** `pi-folder`* · **Demandas** `pi-sitemap` · **Atividades** `pi-check-square` · **Execuções** `pi-play` · **Tags** `pi-tag`* · **Usuários** `pi-users`* (* somente gestor — para Bruno Lima aparecem só 4 itens).
- Item ativo: fundo translúcido primário + texto/ícone na cor primária, peso 600 (mantém o padrão atual, sem glow).
- Tooltips com atalho: "Atividades — g a".
- **Responsivo:** 1024–1280px → só ícones com tooltip; <900px → mantém Ponto, Demandas, Atividades, Execuções e agrupa o resto em **"Mais ▾"** (menu com Calendário, Projetos, Tags, Usuários).

### 2.3 ① Chip de execução ativa (centro-direita) — NOVO
Fonte: `GET /execucao/ativa` → `ExecucaoAtivaDto { id, atividadeId, descricao, inicioData }`, atualizado por signal compartilhado após iniciar/pausar em qualquer tela.

- **Com execução ativa:** pill com fundo `primary-50`/borda `primary-200` (escuro: `primary-950`/`primary-800`): `● (verde pulsante)` + descrição truncada em ~28ch ("Checkout do carrinho…") + cronômetro tabular ao vivo `01:47:32` (desde `inicioData`, ex.: iniciado 09:12) + botão-ícone `⏸` "Pausar".
  - Clique no corpo do chip → navega para `/execucao`.
  - Clique em **Pausar** → popover ancorado no chip: título "Pausar execução", campo **Descrição do trabalho** (textarea 2 linhas, foco automático; obrigatório para desenvolvedor, opcional para gestor — regra do `ExecucaoEncerrarDto`), dica "Enter para confirmar · Esc para cancelar", botão primário **Pausar** com loading. Encerra via `PATCH /execucao/:id/encerrar`, remove o chip otimisticamente e mostra toast "Execução pausada — 01:47 registradas".
- **Sem execução ativa:** texto discreto `○ Sem execução ativa` (muted, clicável → `/atividade` para iniciar uma). Some <1024px.
- **Carregando (boot):** skeleton pill de 220px.

### 2.4 Relógio
- `14:32` (só hora, tabular; a data completa vive no Ponto). Clicável → `/ponto`. Tooltip: "qui, 10/07/2026 — ir para Ponto". Some <1024px.

### 2.5 ② Toggle de tema (1 clique) — MOVIDO DO POPOVER
- Botão-ícone: `pi-moon` no tema claro / `pi-sun` no escuro. Tooltip "Tema escuro"/"Tema claro". Alterna na hora (já persiste em localStorage).

### 2.6 ③ Minhas Anotações
- Botão-ícone `pi-file-edit` com tooltip "Minhas anotações (n)". Abre o dialog da §4. (Sem label textual — consistência com os demais ícones; libera ~140px.)

### 2.7 ④ Menu de perfil
- Gatilho: **avatar circular com iniciais "AS"** (fundo primário, texto branco) + "Ana" ao lado (≥1280px) + caret. 1 clique abre o menu:

```
┌──────────────────────────────┐
│ Ana Souza                    │
│ @ana.souza · Gestora         │
├──────────────────────────────┤
│ Tempos em dias        [◯––]  │  ← switch com estado explícito (off = horas)
├──────────────────────────────┤
│ Tema personalizado           │  ← seção visível SÓ se desbloqueado (easter egg mantido:
│  ⬤⬤⬤⬤⬤⬤  (swatches)        │     botão direito no item de tema + "???")
│  [colorpicker inline]        │
│  Voltar ao azul · Esquecer   │
├──────────────────────────────┤
│ ⎋ Sair                       │  ← logout movido para cá (sem botão exposto na topbar)
└──────────────────────────────┘
```

- Identidade (nome, @login, tipo) visível no topo do menu — e as iniciais + primeiro nome já visíveis sem nenhum clique.
- "Tempos em dias" como `p-toggleswitch` — estado legível, sem frase-ação ambígua.
- **Sair** no fim do menu, separado por divisor (elimina o clique acidental do botão exposto).

---

## 3. Atalhos de teclado globais (⑥)

- `g` seguido de: `p` Ponto · `c` Calendário · `j` Projetos · `d` Demandas · `a` Atividades · `e` Execuções · `t` Tags · `u` Usuários.
- `n` → Minhas Anotações. `Shift+D` → alternar tema.
- Exibidos nos tooltips. Ignorados quando o foco está em input/editor.

---

## 4. Dialog "Minhas Anotações" (sobre a página de fundo escurecida)

Modal `p-dialog` **840px × 70vh**, centralizado sobre o conteúdo escurecido (scrim 50%). A página por trás (ex.: listagem de Atividades) permanece visível e desfocada nas bordas.

```
┌────────────────────────────────────────────────────────────┐
│ Anotações — Ana Souza                    [Alterado]     ✕  │
│ 🕘 Última alteração: 09/07/2026 17:42                       │
├────────────────────────────────────────────────────────────┤
│ [toolbar Quill: B I U · listas · links]                    │
│                                                            │
│ Reunião com Bruno Lima (10/07): revisar estimativas da     │
│ demanda "Integração de Pagamentos" do Portal do Cliente.   │
│ Pendências: validar conexões de demanda antes da sprint.   │
│                                                            │
├────────────────────────────────────────────────────────────┤
│ [Limpar]                    ✓ Salvo às 14:31    [Salvar ⌘S]│
└────────────────────────────────────────────────────────────┘
```

- **Fechar sem fricção (⑤):** `ESC`, clique no scrim ou no ✕ — se houver alterações pendentes, **salva automaticamente** e mostra toast "Anotações salvas". Sem confirmDialog Salvar/Descartar.
- **Indicador vivo no rodapé:** "✓ Salvo às 14:31" ↔ "● Salvando…" ↔ "Alterações não salvas" (substitui a dica estática dos 30s). Auto-save a cada 30s **apenas quando há alterações**.
- `Ctrl+S`/`⌘S` salva; foco automático no editor ao abrir.
- **Carregando:** skeleton do editor (toolbar + 4 linhas), sem salto de layout.
- **Vazio:** placeholder no editor "Escreva lembretes, pendências e links úteis — salvamos automaticamente." (o foco já está no editor; nenhum clique extra).
- **Limpar:** mantém confirmação (destrutivo, sem undo no backend): "Apagar todas as anotações? Esta ação não pode ser desfeita." [Cancelar] [**Limpar**].

---

## 5. Estados globais

- **Boot/carregando:** topbar renderiza imediatamente; chip de execução como skeleton; conteúdo com skeleton local por tela.
- **Sem dados de sessão** (token expirado): redirect para `/autenticacao` — a topbar nunca renderiza vazia.
- **Perfil desenvolvedor (Bruno Lima):** nav com 4 itens (Ponto, Demandas, Atividades, Execuções); todo o resto idêntico; popover Pausar exige descrição.
- **Tema escuro:** topbar `surface-900`, chip de execução `primary-950/800`, mesmos componentes.

---

## 6. Callouts para o mockup

- **① Chip de execução ativa na topbar** — timer ao vivo + Pausar inline com popover de descrição: a ação mais frequente cai de 4+ cliques para 1–2, de qualquer tela (usa `GET /execucao/ativa` e `PATCH /execucao/:id/encerrar` já existentes).
- **② Toggle de tema sol/lua exposto** — 1 clique em vez de 2 (saiu do popover de perfil).
- **③ Anotações só-ícone** — consistência da região direita e ~140px liberados para o chip ①.
- **④ Avatar com iniciais + Sair dentro do menu** — identidade visível sem hover; logout acidental eliminado sem dialog de confirmação.
- **⑤ Anotações fecham com ESC salvando automaticamente** — some o confirm Salvar/Descartar; indicador vivo "Salvo às HH:mm" no rodapé.
- **⑥ Atalhos de teclado (`g`+letra, `n`)** exibidos nos tooltips — navegação em 0 cliques para usuários frequentes.
