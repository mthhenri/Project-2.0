# Ponto (página principal, cartões de usuário/resumo, dia do mês, intervalos, dialog de justificativa, impressão) (/ponto (rota padrão))

## Fluxos atuais
- **Desenvolvedor confere seu saldo do dia/mês (tarefa mais frequente)** (1 cliques): Abre /ponto (rota padrão) → mensal do próprio usuário carrega com cards de resumo; a linha de hoje já vem destacada. Para ver o detalhe do dia: 1 clique para expandir (com fetch adicional).
- **Desenvolvedor consulta o mês anterior** (1 cliques): 1 clique no chevron-esquerda (ou 2–3 cliques via datepicker). Sem atalho de teclado. A tela inteira é substituída por spinner durante a carga.
- **Desenvolvedor imprime o próprio espelho de ponto** (0 cliques): IMPOSSÍVEL hoje: o botão Imprimir só existe para gestor com usuário selecionado. O dev precisa pedir ao gestor (fluxo humano de vários passos fora do sistema), embora os dados já estejam carregados na tela dele.
- **Gestor vê quem está trabalhando agora (equipe hoje)** (0 cliques): Abre /ponto → grid de cards carrega automaticamente. Porém precisa escanear card a card procurando timers ativos: não há ordenação, contagem nem filtro 'somente ativos'.
- **Gestor abre o mensal de um usuário específico** (3 cliques): Clique para abrir o p-select (1) → rolar a lista procurando o nome, sem campo de busca (1+) → clicar no nome (1). O nome no card do usuário, que ele já está vendo, não é clicável.
- **Gestor justifica a falta de um dia que acabou de ver na lista (saldo negativo)** (9 cliques): Com usuário já selecionado: clique em 'Justificar' no header (1) → clique no datepicker (1) → escolher o dia no calendário (1) → digitar horas no inputnumber (1+) → clicar/digitar Título (2) → clicar/digitar Motivo (2) → clicar 'Salvar justificativa' (1, Enter não envia). O dia visto na lista precisa ser re-informado manualmente; nenhum campo tem autofocus.
- **Gestor imprime o espelho de um usuário** (4 cliques): Selecionar usuário no dropdown (3 cliques, sem busca) → clicar 'Imprimir' (1) → diálogo do navegador. Se o usuário já estiver selecionado: 1 clique.
- **Gestor remove uma justificativa lançada errada** (3 cliques): Clicar 'Justificar' para abrir o dialog (1) → localizar o item na lista → clicar na lixeira (1) → confirmar no modal central que abre longe do ponteiro (1).
- **Ver detalhes de uma atividade a partir de uma execução no mensal** (2 cliques): Expandir a linha do dia (1, com fetch) → clicar no nome da atividade na timeline (1) → abre dialog de visualização.
- **Gestor volta do mensal de um usuário para a visão da equipe** (1 cliques): Clicar no '×' (clear) do p-select (1). Funciona, mas o affordance é fraco — nada indica que limpar o filtro muda o modo da tela.

## Problemas
- [ALTA] P1: Sem ação no ponto de decisão para justificar: o gestor vê o dia com saldo negativo na lista, mas precisa ir ao botão do header e RE-SELECIONAR a mesma data no datepicker do dialog (~9 passos). Nada na linha do dia permite justificá-lo diretamente, e o dialog nunca pré-preenche dia nem horas.
- [ALTA] P2: Desenvolvedor não consegue imprimir o próprio espelho de ponto: os botões Imprimir/Justificar estão dentro de `@if (sessao.eGestor() && usuarioId)`, embora o componente de impressão só precise do `pontoMensal` que já está carregado na tela do dev.
- [ALTA] P3: No modo 'todos hoje', o nome do usuário no card não é clicável — para abrir o mensal daquele usuário o gestor abandona o card que já está olhando e refaz a seleção no dropdown (3 cliques), que ainda por cima não tem campo de busca ([filter] ausente no p-select, com até 100 usuários).
- [MEDIA] P4: Dialog de justificativa sem ergonomia de formulário: nenhum autofocus, submit via (onClick) sem (ngSubmit) — Enter não salva; botão 'Salvar justificativa' no corpo e 'Fechar' no footer (ações primária e secundária em regiões diferentes, inconsistente com outros dialogs); 'Horas cobertas' exige digitação/spinner mesmo nos casos comuns (dia inteiro = jornada, ou o déficit exato do dia, ambos calculáveis).
- [MEDIA] P5: Feedback de carga destrutivo: o spinner central substitui TODO o conteúdo a cada troca de mês/usuário e também no reload automático de visibilitychange — a tela pisca ao voltar para a aba; não há skeleton nem preservação do conteúdo anterior com overlay.
- [MEDIA] P6: Densidade/ruído nos horários: execuções e períodos mostram 'dd/MM HH:mm' dentro de contextos onde o dia já é conhecido (linha do dia, card de hoje) — a data repetida consome espaço e dificulta a leitura rápida dos horários.
- [MEDIA] P7: Remover justificativa usa p-confirmDialog modal central: o ponteiro está na lixeira e o botão de confirmação abre no meio da tela (mouse travel desnecessário para uma exclusão que é soft delete no backend).
- [MEDIA] P8: Modo 'todos hoje' sem triagem: nenhuma contagem ('X trabalhando agora'), ordenação ou filtro de quem tem execução ativa — o gestor escaneia visualmente todos os cards procurando timers.
- [BAIXA] P9: Saldo sem contexto: `metaMinutos` do dia existe no DTO (já com justificativa descontada) mas não é exibida nem em tooltip; o usuário não sabe contra qual meta o saldo foi calculado. Também falta um 'saldo até hoje' no resumo mensal (o saldo do mês inteiro mistura dias futuros ainda não trabalhados — calculável no cliente somando os dias ≤ hoje).
- [BAIXA] P10: Badge de justificativa na linha do dia é apenas informativo (tooltip): não é clicável para abrir/editar/remover a justificativa correspondente; o gestor precisa achá-la de novo na lista dentro do dialog.
- [BAIXA] P11: Empty state do modo 'todos' não acionável: 'Nenhum usuário ativo encontrado.' sem botão para ir a /usuarios; contador de intervalos no card (pi-pause-circle + número) sem tooltip explicando o significado.
- [BAIXA] P12: Layout shift no header: botões Imprimir/Justificar e a navegação de mês aparecem/desaparecem conforme o filtro e o modo, movendo os demais controles de lugar; nenhum atalho de teclado (←/→ para mês, Enter no dialog, tecla para 'hoje').

## Sugestões (JÁ VERIFICADAS)
### S1 — Botão 'Justificar' inline na linha do dia, com dia e déficit pré-preenchidos (gestor) [impacto alto]
Verificado: hoje o único caminho é o botão 'Justificar' no header, e o dialog abre com diaData=null e horasCobertas=null (ponto-justificativa-dialog.component.ts, abrir()). Nada disso existe inline. Aprovado com correções: (1) o botão fantasma na linha do dia (visão mensal do gestor) chama abrir() com o dia da linha e sugestão de horas = max(0, -saldoMinutos) — usar saldoMinutos em vez de 'metaMinutos - totalMinutosTrabalhados' dá o mesmo valor e já existe no PontoDiaResumoDto; atenção: metaMinutos é a meta EFETIVA (já descontada justificativa), então a sugestão fica correta para complementar o restante. (2) Converter o déficit de minutos para horas decimais com 2 casas (o campo horasCobertas é p-inputnumber em horas, maxFractionDigits=2) e limitar ao teto maximoHoras — que carrega async via carregarJornadaUsuario(); aplicar o cap após a resposta. (3) stopPropagation no clique (a linha inteira já tem (click)='alternar()' para expandir). (4) Badge de justificativa clicável abre o dialog naquele dia — somente para gestor: todos os endpoints /ponto-justificativa são @GestorOnly; para dev o badge permanece só com tooltip. (5) Exibir o botão apenas em dia útil, sem justificativa existente e com déficit > 0. Autofocus no Título quando o dia vier pré-preenchido (junto com S4).
_Redução de esforço:_ de ~9 passos (abrir dialog genérico, escolher dia no datepicker, digitar horas, título, motivo, salvar) para ~4 (clique inline → título → motivo → Enter); dia e horas já corretos, sem consulta mental ao déficit

### S2 — Nome do usuário no card abre o mensal dele em 1 clique + busca no p-select + chip removível [impacto alto]
Verificado: no ponto-usuario-card.component.html o nome é um <span> com [title], não clicável; o p-select do header não tem [filter]; o título do mensal mostra '· nomeUsuario' como texto morto. Nada existe. Aprovado: (1) clique no nome/avatar do card faz formularioFiltros.patchValue({usuarioId: ponto.usuarioId}) + aoMudarUsuario() — PontoDiarioDto já traz usuarioId, é 100% client-side; o mês default (hoje) já é o comportamento atual. (2) [filter]='true' filterBy='nomeCompleto' no p-select (recurso nativo do PrimeNG Select). (3) O '· nomeUsuario' do título mensal vira chip com '×' que limpa usuarioId e volta ao modo 'todos' — redundante com o showClear do select, mas fica onde o olho do gestor está. Chip e clique no card são só do gestor (dev nunca vê o modo 'todos' nem o select).
_Redução de esforço:_ de 3+ cliques (abrir select sem busca, rolar até 100 usuários, clicar) para 1 clique no card; volta à equipe em 1 clique no ×

### S3 — Liberar 'Imprimir' para o desenvolvedor (próprio mês), com condição e assinatura corrigidas [impacto alto]
Verificado no backend: GET /ponto/mensal NÃO é @GestorOnly (dev recebe o próprio mês — é assim que a visão mensal do dev já funciona) e GET /usuario/:id permite dev acessar o próprio perfil (Swagger: 'desenvolvedor acessa apenas o próprio perfil') — como mensal.usuarioId é o próprio dev, a busca de cargo/jornada do ponto-impressao.component funciona sem nenhuma mudança de backend. Confirmado que hoje o botão só aparece com sessao.eGestor() && usuarioId (ponto.page.html linha 48). Aprovado com 2 correções obrigatórias: (1) condição de exibição = modo() === 'mensal' && pontoMensal() — o signal pontoMensal NÃO é limpo ao voltar para a visão Equipe, então 'sempre que houver pontoMensal carregado' imprimiria um mês obsoleto no modo 'todos'; (2) a assinatura 'Gestor responsável' recebe hoje sessao.nomeCompleto() — quando o dev imprime, isso estamparia o próprio dev como gestor; passar nomeGestor apenas quando sessao.eGestor(), deixando a linha de assinatura em branco no espelho impresso pelo dev.
_Redução de esforço:_ de impossível (pedir ao gestor) para 1 clique no próprio espelho de ponto

### S4 — Ergonomia do dialog: chips de horas rápidas, autofocus, Enter salva, salvar no footer, confirmação ancorada [impacto medio]
Verificado: o form não tem (ngSubmit) nem botão type=submit (salvar é (onClick) dentro do corpo); não há autofocus; a remoção usa p-confirmDialog modal central (key 'ponto-justificativa-remover'). Aprovado com correções: (1) chips sob 'Horas cobertas': [Dia inteiro · Nh] usa maximoHoras() (jornada já buscada por carregarJornadaUsuario — nenhum request novo), [Meio período] = jornada/2, [Faltante] só aparece quando há dia selecionado com déficit > 0 — o dialog não conhece o mensal, então o pai (ponto.page) deve passar o déficit/dias em abrir() e o dialog recalcula ao trocar o campo Dia; como horasCobertas é decimal (2 casas), o chip preenche p.ex. 3,92 h — exibir o rótulo no mesmo formato decimal para não prometer '3h 55min' e gravar 3,92. (2) (ngSubmit)='salvar()' — Enter no textarea continua inserindo quebra de linha (comportamento nativo), sem conflito. (3) Autofocus no primeiro campo vazio (Dia quando aberto pelo header; Título quando aberto pela linha, ver S1). (4) 'Salvar justificativa' movido para o footer ao lado de 'Fechar' — como o footer do p-dialog fica fora do <form>, o botão chama salvar() diretamente. (5) Trocar p-confirmDialog por p-confirmpopup ancorado na lixeira (componente real do PrimeNG).
_Redução de esforço:_ horas em 1 clique em vez de digitação/spinner; salvar sem tirar a mão do teclado; confirmação de remoção junto ao cursor em vez do centro da tela

### S5 — Carga não destrutiva (skeleton na 1ª visita, conteúdo preservado nas trocas) + atalhos ←/→ e botão 'Hoje' [impacto medio]
Verificado: o template usa @if (carregando()) { spinner } @else { conteúdo } — TODA recarga (troca de mês/usuário e o @HostListener de visibilitychange que já existe e recarrega ao voltar à aba) apaga a tela inteira e mostra spinner central. Problema real. Aprovado: (1) 1ª carga: skeleton (cards de resumo + ~8 linhas pulsantes); (2) recargas seguintes: manter conteúdo com opacity reduzida + barra de progresso indeterminada fina, trocando quando a resposta chegar (distinguir 'primeira carga' de 'recarga' com um signal simples); (3) botão-texto 'Hoje' na navegação de mês, desabilitado via visualizandoMesAtual() que já existe; (4) atalhos ←/→ (e T para hoje) SOMENTE no modo mensal e com guarda: ignorar quando o foco está em input/textarea/datepicker/select ou quando qualquer dialog está aberto — sem isso as setas conflitam com a digitação no filtro do select (S2) e com o datepicker.
_Redução de esforço:_ elimina o apagão visual a cada navegação e o piscar ao voltar para a aba; mês anterior/próximo com 0 cliques (teclado)

### S6 — Triagem no modo equipe: contagem, badge 'Trabalhando agora' e ordenação por atividade [impacto medio]
Verificado: o card atual não tem badge de status nem ordenação — o grid renderiza pontosTodos() na ordem do backend, e detectar execução ativa exige escanear a lista de execuções de cada card procurando o timer. Dado existe: PontoDiarioDto.execucoes[] é ExecucaoItemDto[] com fimData: Date | null — execução ativa = alguma com fimData === null; tudo computável client-side com um computed(). Aprovado: (1) barra acima do grid: 'N pessoas · M trabalhando agora' + toggle 'Somente ativos' (filtro client-side); (2) badge verde '● Trabalhando agora' no card com execução ativa, 'Pausado' (cinza) para quem tem registros sem execução ativa; (3) ordenação: ativos primeiro (sort estável sobre o array já recebido). Correção sobre o exemplo da spec: NÃO existe 'Férias' por usuário — dias não úteis são globais (TipoDiaNaoUtilEnum: FERIADO/RECESSO/PONTO_FACULTATIVO via motivoNaoUtil, igual para todos no mesmo dia); o 4º estado do card é apenas 'Sem registros hoje'.
_Redução de esforço:_ status da equipe legível em 0 cliques, sem escanear execução por execução de N cards

### S7 — Horários compactos HH:mm, tooltip de meta no saldo e card 'Saldo até hoje' [impacto medio]
Verificado: hoje TODOS os horários usam 'dd/MM HH:mm' (linha do dia, timeline expandida, card do usuário, intervalos e até a tabela de impressão que já tem coluna Dia) — a data é 100% redundante pois o dia é sempre o contexto da linha/card. Aprovado: (1) trocar para HH:mm nesses 6 pontos (ponto-mes-dia linhas 15-17 e 63-66, ponto-usuario-card 32-34, ponto-intervalo-lista 22-24, ponto-impressao 54-60). (2) Tooltip no saldo do dia — correção: metaMinutos do PontoDiaResumoDto JÁ É a meta efetiva (comentário no DTO: 'já descontada a justificativa'); o texto deve ser 'Meta do dia: Xh' com X = metaMinutos, e quando houver justificativa acrescentar '(original: metaMinutos + justificativaMinutosCobertos)' — nunca apresentar metaMinutos como se fosse a meta cheia. (3) 4º card 'Saldo até hoje' = soma client-side de dia.saldoMinutos para dias com data <= hoje — todos os campos existem; exibir apenas quando visualizandoMesAtual(), pois em meses passados é idêntico ao 'Saldo do mês' (duplicaria o card).
_Redução de esforço:_ leitura mais rápida por linha (menos ruído) e fim da conferência manual de meta/saldo parcial do mês

### S8 — Empty state acionável, header estável e tooltip no contador de intervalos [impacto baixo]
Verificado: o empty da visão equipe é só ícone + texto ('Nenhum usuário ativo encontrado.') sem ação; os controles do header aparecem/somem via @if (navegação de mês e ações só existem no DOM no modo mensal), causando layout shift; o contador '⏸ N' do card não tem tooltip. Aprovado com correções: (1) botão 'Gerenciar usuários' aponta para a rota real /usuario (singular — app.routes.ts), não /usuarios; visível só para gestor (o modo equipe já é gestor-only, e /usuario é @GestorOnly no backend); ressalva: esse empty é raríssimo na prática (exige zero usuários ativos), por isso impacto baixo. (2) Header com posições fixas: desabilitar em vez de remover navegação de mês/Imprimir/Justificar fora do modo aplicável. (3) Tooltip no contador: 'N pausas ≥ 15 min' — o limiar real é 15 (ambiente.intervaloMinimoMinutos = 15, espelho de INTERVALO_MINIMO_MINUTOS do backend), e o texto deve interpolar esse valor da config, nunca hardcode.
_Redução de esforço:_ 1 clique direto no empty state; fim do layout shift ao alternar modos; contador de pausas autoexplicativo sem sair da tela


## Ajustes na spec (verificador)
1) INTERVALOS ≥ 15 MIN, NÃO 10: a spec diz '2 pausas ≥ 10 min' e 'Intervalos (≥ 10 min)' — o valor real é ambiente.intervaloMinimoMinutos = 15 (espelho de INTERVALO_MINIMO_MINUTOS do backend; o componente atual já exibe 'Intervalos detectados (≥ 15 min)'); interpolar o valor da config em todos os textos. 2) BADGE 'FÉRIAS' NÃO EXISTE: dias não úteis são globais (TipoDiaNaoUtilEnum: FERIADO, RECESSO, PONTO_FACULTATIVO) via motivoNaoUtil — não há férias por usuário; trocar o card da 'Elisa Castro' por 'Sem registros hoje' (badge de dia não útil só faz sentido igual em todos os cards no mesmo dia). 3) ROTA /usuario (SINGULAR): o botão 'Gerenciar usuários' deve apontar para /usuario, não /usuarios. 4) CONDIÇÃO DO IMPRIMIR: 'sempre que houver mensal carregado' é perigoso — o signal pontoMensal não é limpo ao voltar à visão Equipe; a condição correta é modo mensal ativo + pontoMensal carregado (no modo Equipe o botão fica desabilitado). 5) ASSINATURA NA IMPRESSÃO DO DEV: a página passa sessao.nomeCompleto() como nomeGestor — quando o dev imprime, a linha 'Gestor responsável' estamparia o nome do próprio dev; passar nomeGestor apenas quando sessao.eGestor() e deixar a linha em branco no caso do dev. 6) CHIP 'FALTANTE · 3h 55min' vs CAMPO DECIMAL: horasCobertas é p-inputnumber em horas decimais (2 casas, máx = jornada carregada async) — o chip preencheria 3,92 h; exibir o rótulo do chip no mesmo formato decimal e aplicar o teto só após a resposta da jornada; chip 'Faltante' só com dia selecionado e déficit > 0, e o dialog precisa receber o déficit/dias do pai (não conhece o mensal). 7) TOOLTIP DE META: metaMinutos do PontoDiaResumoDto já é a meta EFETIVA (justificativa descontada) — 'Meta do dia: 8h (justificativa desconta 4h)' está invertido; o correto é 'Meta do dia: {metaMinutos}' e, se quiser mostrar a original, calcular metaMinutos + justificativaMinutosCobertos. 8) ATALHOS ←/→/T: adicionar guarda explícita — só no modo Mensal, ignorados com foco em input/textarea/datepicker/select-com-filtro e com qualquer dialog aberto (senão conflitam com a busca do select e o datepicker). 9) 'SALDO ATÉ HOJE': exibir o 4º card apenas no mês corrente — em meses passados é idêntico ao 'Saldo do mês'. 10) BADGE DE JUSTIFICATIVA CLICÁVEL E BOTÃO INLINE 'JUSTIFICAR': explicitar que são gestor-only em todos os pontos da spec (todos os endpoints /ponto-justificativa são @GestorOnly; para dev o badge mantém apenas tooltip). 11) DETALHES MENORES: container atual é max-width 1100px (spec diz 1120px) e o placeholder atual do select é 'Todos (hoje)' (spec propõe 'Equipe (hoje)' — ok como melhoria, manter consistente com a barra de triagem); o botão Salvar no footer do p-dialog fica fora do <form>, então deve chamar salvar() diretamente enquanto o (ngSubmit) cobre o Enter.

## REDESIGN SPEC
# Redesign — Tela "Ponto" (/ponto)

Sistema: Project 2.0 · Angular 21 + PrimeNG (tema Aura, primário azul) + Tailwind · tema claro/escuro · toasts bottom-center.
Página com **duas visões**: **Equipe · hoje** (gestor sem filtro) e **Mensal** (dev sempre; gestor com usuário escolhido). Container central max-width 1120px, padding 24px, espaçamento vertical 20px.

---

## 1. Header da página (padrão de todas as telas)

Linha única, flex space-between:

- **Esquerda**: H1 `Ponto` (1.5rem, semibold, azul primário) + subtítulo muted abaixo: `Quinta-feira, 10 de julho de 2026`.
- **Direita — toolbar em posições FIXAS** (controles não aplicáveis ficam desabilitados, nunca somem — sem layout shift):
  1. `p-select` de usuário (só gestor), largura 16rem, **com campo de busca interno** ([filter]), placeholder `Equipe (hoje)`, clear `×`. Opções: `Ana Souza`, `Bruno Lima`, `Diego Ramos`, `Elisa Castro`…
  2. Navegação de mês (só no modo Mensal): botão outlined `‹` · `p-datepicker` view=month exibindo `07/2026` (máx.: mês atual) · botão outlined `›` (desabilitado no mês atual) · botão-texto `Hoje` (desabilitado quando já é o mês atual). **Atalhos: ← / → mudam o mês, T volta a hoje.**
  3. Botão secundário outlined `Imprimir` (pi-print) — **visível para gestor E desenvolvedor** sempre que houver mensal carregado.
  4. Botão primário `Justificar` (pi-calendar-plus) — só gestor no modo Mensal.

---

## 2. Visão "Equipe · hoje" (gestor — estado inicial)

**Barra de triagem** acima do grid: texto `4 pessoas · 2 trabalhando agora` (contagem em verde) + toggle `Somente ativos`.

**Grid de cards** (2 colunas ≥768px, 1 coluna mobile). Anatomia do card:

- **Cabeçalho**: avatar de iniciais (`AS`) + **nome clicável** `Ana Souza` (hover azul, tooltip "Ver o mês de Ana") — clique abre o Mensal dela; à direita, badge de status: `● Trabalhando agora` (verde, pill) ou `Pausado` (cinza) ou badge do dia não útil (`Sábado`, `Feriado — Independência`).
- **Linha de números**: `Hoje: 6h 20min` (azul, 1.25rem) · saldo `−1h 40min` (vermelho) ou `+0h 12min` (verde) · `⏸ 2` com tooltip `2 pausas ≥ 10 min`.
- **Execuções do dia** (lista rolável, máx. ~4 visíveis): `08:02 → 11:45 · Implementar login OAuth` (atividade clicável → dialog de visualização); execução ativa: `13:05 → ⏱ 00:42:15` (timer ao vivo). Formato **HH:mm**, sem dd/MM.

**Dados de exemplo dos 4 cards**:
1. `Bruno Lima` — ● Trabalhando agora · Hoje: 5h 02min · +... · execução ativa `13:05 → ⏱ 00:42:15 · Implementar login OAuth` (projeto Portal do Cliente).
2. `Ana Souza` — ● Trabalhando agora · Hoje: 6h 20min · timer em `Ajustar layout do dashboard`.
3. `Diego Ramos` — Pausado · Hoje: 3h 45min · −4h 15min · 2 execuções encerradas em `Revisão de código — API de pedidos`.
4. `Elisa Castro` — badge `Férias` · `Sem registros hoje`.

Cards com execução ativa vêm ordenados primeiro.

**Estado vazio**: ícone pi-users + `Nenhum usuário ativo.` + botão primário `Gerenciar usuários` (→ /usuarios).

---

## 3. Visão "Mensal" (dev sempre; gestor com usuário escolhido)

**Linha de contexto**: `Julho de 2026 · 23 dias úteis` · para gestor, chip removível `Ana Souza ×` (clicar no × volta à Equipe).

**Cards de resumo (4)**, grid 4 colunas ≥768px:
| Card | Ícone | Valor exemplo | Cor |
|---|---|---|---|
| Meta do mês | pi-flag | `161h 0min` | neutro |
| Trabalhado | pi-clock | `52h 30min` | azul primário |
| **Saldo até hoje** | pi-calendar | `+1h 10min` | verde/vermelho (só dias ≤ hoje, calculado no cliente) |
| Saldo do mês | pi-chart-line | `−108h 30min` | verde/vermelho, tooltip "Considera todos os dias úteis do mês, inclusive futuros" |

**Lista de dias**: container com borda arredondada, cabeçalho de colunas fixo e discreto (`Dia · Período · Trabalhado · Saldo`), uma linha por dia:

- **Dia**: `Ter 01`, `Qua 02`… Hoje (`Qui 10`) com barra azul 3px à esquerda + fundo sutil.
- **Período**: `08:04 → 17:02` (**HH:mm**); dia em curso: `08:02 → em andamento ⏱ 00:42:15`; dia não útil: badge cinza `Sábado` / `Feriado — Independência`; dia com justificativa: badge azul clicável `🗓 Consulta médica · 4h` (tooltip "Consulta médica · 4h descontadas da meta do dia"; **clique do gestor abre o dialog já naquele dia**); dia útil vazio: `—`.
- **Trabalhado**: `8h 12min`. **Saldo**: `+0h 12min` verde / `−3h 55min` vermelho, tooltip `Meta do dia: 8h`.
- **Ações no hover (gestor)**: botão fantasma `Justificar` (pi-calendar-plus) que abre o dialog **pré-preenchido com o dia da linha e o déficit sugerido**; chevron de expandir (sempre visível quando há registro).

**Linhas de exemplo** (usuária Ana Souza):
```
Ter 01  08:04 → 17:02          8h 12min   +0h 12min  ⌄
Qua 02  08:10 → 17:00          7h 58min   −0h 02min  ⌄
Sáb 05  [Sábado]                   0h 0min   +0h 0min
Ter 08  09:30 → 14:20  [🗓 Consulta médica · 4h]  4h 05min  +0h 05min  ⌄
Qua 09  —                          0h 0min   −8h 0min   [Justificar]   ← hover
Qui 10  08:02 → em andamento ⏱  5h 40min   −2h 20min  ⌄   ← hoje, barra azul
```

**Expansão da linha** (clique): timeline vertical das execuções — `08:02 → 11:45 · Implementar login OAuth · Portal do Cliente` (atividade clicável → dialog de visualização) — seguida do card `Intervalos (≥ 10 min)` com itens `11:45 → 13:05 · 1h 20min`, ou `Nenhum intervalo detectado no dia.`

---

## 4. Dialog "Justificar ponto" (sobre a página escurecida)

**Fundo**: a visão Mensal permanece visível atrás, escurecida por overlay `rgba(0,0,0,0.4)` — a linha do dia `Qua 09` aparece ao fundo.

**Dialog** central, 40rem, header: `Justificar ponto — Ana Souza · Julho/2026` + botão ×. Esc fecha; clique na máscara fecha.

**Formulário** (envia com **Enter**):
- Linha 1 (2 colunas):
  - `Dia *` — datepicker limitado a 01–31/07/2026, **pré-preenchido com `09/07/2026`** quando aberto pela linha do dia.
  - `Horas cobertas *` — inputnumber sufixo ` h`, máx. 8 h; abaixo, **chips de 1 clique**: `[ Dia inteiro · 8h ]  [ Meio período · 4h ]  [ Faltante · 8h ]` (faltante = déficit do dia selecionado) + dica `Máximo: 8 h (jornada diária do usuário)`.
- `Título *` — input com **autofocus** (quando o dia veio pré-preenchido), placeholder `Ex.: Consulta médica`.
- `Motivo *` — textarea 3 linhas, placeholder `Descreva o motivo combinado com o usuário...`.
- Erros inline vermelhos sob cada campo (`Informe o dia justificado`, etc.).

**Seção "Justificativas do mês"** (abaixo, separada por divisor):
- Item: `08/07/2026 · Consulta médica · 4 h` + descrição muted `Atestado apresentado` + rodapé pequeno `Lançada por Carla Mendes em 08/07` + lixeira à direita.
- Lixeira abre **p-confirmpopup ancorado no próprio botão**: `Remover esta justificativa? [Remover] [Cancelar]` — sem modal central.
- Vazio: `Nenhuma justificativa neste mês.`

**Footer** (ações agrupadas): `Fechar` (secundário outlined) · **`Salvar justificativa`** (primário, pi-check, loading ao salvar).

**Pós-salvar**: toast bottom-center `Justificativa criada — a meta do dia foi ajustada`; a lista do dialog atualiza; a linha do dia ao fundo ganha o badge azul sem que a página "apague" (recarga silenciosa).

---

## 5. Impressão

Botão `Imprimir` (dev e gestor) busca cargo/jornada e chama a impressão do navegador com o espelho: cabeçalho (nome `Ana Souza`, cargo `Desenvolvedora Pleno`, `Julho de 2026`, `Jornada diária: 8h`, totais Meta/Trabalhado/Saldo), tabela `Dia | Entrada | Saída | Intervalos | Trabalhado | Saldo | Observação` e linhas de assinatura `Gestor responsável: Carla Mendes` / `Colaborador: Ana Souza`.

## 6. Estados

- **Carregando (1ª visita)**: skeleton — 4 cards de resumo pulsantes + 8 linhas de dia cinza (sem spinner central).
- **Troca de mês/usuário e retorno à aba**: conteúdo atual permanece com opacity 0.5 + barra de progresso fina no topo da lista; substituição sem flash.
- **Vazio (Equipe)**: ícone + `Nenhum usuário ativo.` + botão `Gerenciar usuários`.
- **Dia útil sem registro**: `—` na linha + ação hover `Justificar` (gestor).

## 7. Interações-chave

- Nome no card → Mensal do usuário (1 clique); chip `×` → volta à Equipe.
- Hover na linha do dia → `Justificar` pré-preenchido; badge de justificativa clicável.
- ← / → mês anterior/próximo · T = mês atual · Enter salva no dialog · Esc fecha.
- Toggle `Somente ativos` filtra a equipe client-side.

## Callouts do mockup

① **Nome clicável no card** — abre o mensal do usuário em 1 clique (antes: 3 cliques via dropdown sem busca).
② **"Justificar" inline na linha do dia** — dialog abre com dia e horas (déficit) pré-preenchidos: de ~9 passos para ~4.
③ **"Imprimir" para o desenvolvedor** — espelho do próprio mês em 1 clique (antes indisponível).
④ **Chips de horas rápidas + Enter salva + autofocus** no dialog de justificativa; confirmação de remoção inline (popup ancorado).
⑤ **Skeleton e transição sem apagar a tela** + atalhos ←/→/T e botão "Hoje" na navegação de mês.
⑥ **"Saldo até hoje" no resumo e horários compactos HH:mm** — leitura imediata, sem ruído de datas repetidas.
