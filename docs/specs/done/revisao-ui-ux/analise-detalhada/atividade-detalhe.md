# Atividade — detalhe (com timer de execução iniciar/pausar) (/atividade/:id)

> ✅ Sugestões verificadas adversarialmente contra o código e as regras de negócio.

## Fluxos atuais
- **Iniciar execução nesta atividade e continuar trabalhando nela** (5 cliques): Clicar 'Iniciar Execução' (1) → clicar no textarea sem autofocus (2) → digitar descrição (obrigatória sempre) → clicar 'Iniciar' (3) → a página redireciona para /execucao → para voltar ao contexto: menu Atividades (4) → localizar e abrir a atividade (5)
- **Pausar/encerrar a execução em andamento da atividade** (3 cliques): Impossível nesta tela. Voltar para a listagem de Atividades (1) → localizar a linha → clicar no botão pause (2) → dialog abre com descrição pré-preenchida → clicar 'Encerrar' (3). Mínimo 3 cliques com troca de tela e busca visual da linha
- **Alterar o status da atividade** (2 cliques): Abrir o select de status (1) → escolher a opção (2); salva no onChange com toast — já é inline
- **Editar a descrição da atividade** (3 cliques): Clicar 'Editar' (1) → dialog abre sem foco → clicar no textarea (2) → digitar → clicar 'Salvar' (3); sem Ctrl+Enter
- **Editar tags (gestor)** (5 cliques): Clicar 'Editar' (1) → clicar para abrir o multiselect (2) → marcar 1 tag (3) → fechar o dropdown (4) → clicar 'Salvar' (5)
- **Ver histórico completo de execuções da atividade** (1 cliques): Clicar 'Ver histórico completo' (1) → navega para /execucao?atividadeId=X
- **Registrar tempo retroativo (gestor)** (5 cliques): Impossível nesta tela: voltar à listagem de Atividades (1) → localizar linha → abrir ação de registro manual (2) → preencher início/fim/descrição (3+ cliques nos datepickers) → salvar (4+)

## Problemas
- [ALTA] P1: A tela não tem timer nem ação de pausar: execução em andamento aparece só como tag estática 'Em andamento'. O ExecucaoTimerComponent (HH:mm:ss ao vivo, já pronto) não é usado. Pausar exige sair da tela — quebra o critério 'agir no ponto de decisão'.
- [ALTA] P2: Iniciar execução redireciona para /execucao (router.navigate em iniciarExecucao), expulsando o usuário do contexto da atividade em que ele vai trabalhar; voltar custa mais 2 cliques.
- [ALTA] P3: O botão 'Iniciar Execução' ignora permissões e regras de negócio: aparece para desenvolvedor em atividade alheia, em status não executável (Pendente/Desenvolvida) e mesmo quando já há execução ativa na atividade — todas as validações que a listagem faz (podeExecutar, podeIniciarExecucao, atividadeEmExecucao) estão ausentes; o erro só aparece após submeter.
- [ALTA] P4: Não consulta GET /execucao/ativa: se o usuário já tem execução ativa em OUTRA atividade (regra: nunca duas simultâneas), ele preenche o dialog e só descobre o conflito no erro do backend.
- [MEDIA] P5: Descrição da execução é obrigatória incondicionalmente (Validators.required), mas o ExecucaoIniciarDto e a listagem tratam-na como opcional quando o dono da atividade é gestor — digitação forçada e inconsistência entre telas.
- [MEDIA] P6: Nenhum dialog tem autofocus no primeiro campo nem submit por Enter/Ctrl+Enter; todo fluxo exige um clique extra para focar e outro no botão de confirmação.
- [MEDIA] P7: Affordance enganosa: o link 'Demanda #42' não navega para a demanda — chama voltar() (listagem de atividades filtrada), duplicando o botão '← Atividades'. Também não mostra nome da demanda/projeto (AtividadeRecuperadaDto só traz demandaId; AtividadeResumoDto já traz nomeDemanda, então o dado existe no backend).
- [MEDIA] P8: O select de status permite trocar status com execução em andamento; a listagem bloqueia isso (podeTrocarStatus). Regra de negócio inconsistente entre telas.
- [MEDIA] P9: Sem estado de carregamento: durante o forkJoin a tela fica em branco (só o botão voltar). O empty 'Atividade não encontrada' não tem botão de ação (ex.: voltar para a lista).
- [MEDIA] P10: Execuções recentes pobres: não mostram o executor (nomeUsuario existe no ExecucaoItemDto — relevante para gestor), nem hora de início/fim; duração exibida como minutos crus ('135 min') em vez dos pipes MinutosParaHoras/TempoExibicao já existentes; linha ativa não tem timer ao vivo nem botão de pausa inline.
- [MEDIA] P11: Edição de tags via dialog + p-multiSelect exige ~5 cliques para 1 tag; a listagem já usa seletor de chips clicáveis (alternarTagSelecao) — padrão inconsistente e mais custoso.
- [BAIXA] P12: Hierarquia fraca no cabeçalho: sem tag colorida de status (severidadeStatus/rotuloStatus importados e nunca usados), sem data de criação (createdDate disponível no DTO), título em azul competindo com links.
- [BAIXA] P13: alterarStatus sem rollback: se a requisição falha, o select continua exibindo o status novo enquanto a entidade permanece com o antigo.
- [BAIXA] P14: Gestor não consegue registrar execução retroativa daqui (POST /execucao/registro existe e a listagem tem o dialog) — precisa voltar à listagem.
- [BAIXA] P15: O dialog 'Iniciar execução' do detalhe não tem o AssistenteDescricaoComponent nem mostra execuções anteriores como referência — o dialog equivalente da listagem tem ambos.
- [BAIXA] P16: Empty state de execuções ('Nenhuma execução registrada ainda.') é texto puro, sem CTA; e a listagem recarrega dados ao focar a aba (visibilitychange/focus) enquanto o detalhe pode exibir estado obsoleto de execução indefinidamente.

## Sugestões aprovadas na verificação
### S1 — Barra de execução com timer ao vivo e Pausar em 1 clique (reenviando a descrição atual) [impacto alto]
Faixa hero no topo: com execução ativa NESTA atividade, exibir ExecucaoTimerComponent tamanho 'grande' (existe, aceita inicioData) + descrição da execução + botão primário 'Pausar' que chama PATCH /execucao/:id/encerrar em 1 clique SEM dialog, REENVIANDO a descrição existente no body — correção obrigatória: o backend sobrescreve a descrição no encerrar e a exige quando o dono da atividade é desenvolvedor (dto.descricao opcional só para dono gestor); como o iniciar já obriga descrição para dono dev, sempre haverá texto a reenviar. Toast 'Execução pausada · 2h15' usando duracaoMinutos retornado em ExecucaoEncerradaDto + MinutosParaHorasPipe (existe). 'Editar descrição ao pausar' vira ação secundária (popover). Dados da execução ativa: GET /execucao/ativa cobre o próprio usuário; para gestor vendo atividade de terceiro, enriquecer AtividadeRecuperadaDto com execucaoAtivaId/execucaoAtivaDescricao/execucaoAtivaInicioData (precedente: AtividadeResumoDto já expõe os dois primeiros; falta inicioData). Esconder o Pausar para dev sem posse (encerrar de terceiro é 403 para dev).
_Redução de esforço:_ pausar nesta tela hoje é impossível (exige ir à listagem/execuções: 3+ cliques e troca de tela) → 1 clique sem sair da página

### S2 — Início rápido inline com Enter e chip 'Reutilizar última' (exige corrigir a ordenação das execuções) [impacto alto]
Substituir o dialog 'Iniciar execução' por input inline na faixa, com autofocus, submit por Enter e validação REGEX_SEM_CARACTERES_PROIBIDOS + BloquearCaracteresProibidosDirective (padrão da listagem — o formulário atual do detalhe nem valida isso). Chip 'Reutilizar última: <descrição>' pré-preenche em 1 clique — CORREÇÃO: execucoesRecentes hoje vem de GET /execucao com ORDER BY inicio_data ASC e LIMIT 5, ou seja, as 5 MAIS ANTIGAS; a última descrição pode nem estar no payload. O chip só é viável corrigindo a ordenação no backend (DESC quando filtrado por atividade, ou parâmetro de ordenação). Descrição opcional apenas quando o DONO da atividade é gestor (regra validada no service pelo tipo do dono, não do logado): como AtividadeRecuperadaDto não tem usuarioTipo, enriquecer o DTO (junto com S8) ou aplicar o relaxamento só quando sessao.eGestor() e o dono é o próprio logado. Input escondido para dev sem posse; desabilitado com aviso quando status não executável (S5).
_Redução de esforço:_ iniciar: de 3 cliques + dialog para 1–2 cliques (Enter); retomada recorrente: 2 cliques e zero digitação

### S3 — Permanecer na página após iniciar, com atualização imediata pela resposta do POST [impacto alto]
Remover o router.navigate(['/execucao']) de iniciarExecucao (atividade-detalhe.page.ts:207 — confirmado). Ao receber 201, a faixa vira o Estado A usando id/descricao/inicioData de ExecucaoIniciadaDto (campos confirmados no DTO) e a lista de execuções ganha a linha 'em andamento' composta client-side (executor = atividade.nomeUsuario, fimData null), sem refetch nem navegação. Atualização imediata com a resposta real (não otimista cega) — evita execução fantasma se o backend recusar (ex.: dono já com execução ativa).
_Redução de esforço:_ elimina o redirect para /execucao + ~2 cliques de retorno ao contexto em todo início de execução

### S4 — Guarda de execução ativa com troca em 1 clique — restrita ao caso 'usuário logado é o dono da atividade' [impacto alto]
No carregamento, chamar GET /execucao/ativa (ExecucaoService.buscarAtiva() já existe). Se a execução ativa do usuário logado é em OUTRA atividade E o usuário logado é o DONO da atividade da página, exibir aviso com a DESCRIÇÃO da execução ativa + tempo decorrido (ExecucaoAtivaDto tem só id/atividadeId/descricao/inicioData — NÃO tem nome de atividade nem demanda; exibir a descrição, opcionalmente buscar o nome via GET /atividade/:atividadeId) e botão 'Pausar lá e iniciar aqui' encadeando PATCH encerrar (reenviando a descrição existente, regra S1) + POST iniciar com o texto do input, mantendo o campo de descrição visível nesse estado. 'Ir para a outra atividade' navega para /atividade/:atividadeId (id disponível). CORREÇÃO ESSENCIAL: a regra 'sem duas execuções' recai sobre o DONO da atividade, e GET /execucao/ativa retorna a execução do LOGADO — para gestor vendo atividade de terceiro, NÃO exibir a guarda baseada na execução do próprio gestor (o backend permite iniciar nesse caso, e o encadeamento pausaria o trabalho do gestor indevidamente); o caso 'dono ocupado em outra atividade' não é detectável por endpoint atual — tratar o erro do backend ('O usuário desta atividade já tem uma execução em andamento...') com toast claro.
_Redução de esforço:_ trocar de atividade própria: de ~6 cliques em 2 telas para 1–2 cliques na própria página (caso mais frequente)

### S5 — Replicar no detalhe as regras de exibição já existentes na listagem [impacto medio]
Portar da listagem (funções confirmadas em atividade-listagem.page.ts): podeExecutar (gestor ou dono — esconder faixa/botões de execução para dev sem posse), podeIniciarExecucao (ATIVIDADE_STATUS_EXECUTAVEL: Planejada/Desenvolvendo — desabilitar início com aviso 'Disponível apenas em atividades Planejadas ou em Desenvolvimento'), atividadeEmExecucao e podeTrocarStatus (select de status desabilitado durante execução ativa com tooltip 'Pause a execução para mudar o status' — regra real do backend: BusinessException 'Não é possível alterar o status de uma atividade com execução em andamento'). Ambas as validações de status existem no ExecucaoService/AtividadeService do backend, então hoje o detalhe deixa o usuário preencher e falhar. Fonte do estado 'em execução': AtividadeRecuperadaDto não tem execucaoAtivaId — usar o enriquecimento do DTO (S8) ou a lista de execuções com ordenação corrigida (S2/S9). O select de status pode permanecer habilitado para qualquer dev com acesso à página (o backend permite autor OU membro da demanda, e o acesso à página já exige ser membro).
_Redução de esforço:_ elimina o ciclo preencher → erro 400 do backend → refazer, nos dois fluxos (iniciar execução e trocar status)

### S6 — Descrição click-to-edit inline, sem dialog [impacto medio]
Clicar no texto da descrição (ou no lápis, mantido para descoberta) troca o parágrafo por textarea no lugar (6 linhas, autofocus, spellcheck), com AssistenteDescricaoComponent abaixo (componente já usado no dialog atual), Ctrl+Enter salva via PUT /atividade/:id (AtividadeAlterarDto.descricao — fluxo já existente), Esc cancela. Remove o p-dialog de 40rem. Estado vazio: 'Sem descrição.' + ação text 'Adicionar descrição' com o mesmo comportamento. Sem problema de permissão: todo dev que acessa a página é membro da demanda, e o backend aceita autor ou membro.
_Redução de esforço:_ de 3 cliques + overlay para 2 cliques, editando no lugar onde o dado é lido

### S7 — Tags como chips alternáveis em popover, com visibilidade igual à da listagem (não só gestor) [impacto medio]
Trocar o dialog + p-multiSelect por popover ancorado no botão do bloco de tags, com todas as tags como chips clicáveis (1 clique alterna; selecionada ganha preenchimento + check) — o padrão alternarTagSelecao/tagEstaSelecionada com chips já existe na listagem (hoje dentro de dialogs; extrair os estilos locais .atividade-listagem__tag-chip para componente/estilo compartilhado). Salvar ao fechar via PUT /atividade/:id/tag (alterarTags existente), com tratamento de erro (reverter chips + toast). CORREÇÃO de permissão: a listagem exibe a edição de tags para podeEditar (gestor OU dev autor/membro) e o backend permite dev com acesso — o detalhe hoje restringe a gestor, o que é inconsistente; alinhar à regra da listagem em vez de manter 'só gestor'.
_Redução de esforço:_ de 5 cliques (abrir dialog, abrir multiselect, marcar, fechar, salvar) para 2–3, com consistência entre telas

### S8 — Cabeçalho com breadcrumb honesto, tag de status colorida, metadados e enriquecimento do AtividadeRecuperadaDto [impacto medio]
Exibir p-tag colorida de status ao lado do título (Tag, severidadeStatusAtividade e rotuloStatusAtividade já importados no detalhe e não usados para o status) e 'Criada em <createdDate>' (campo existente). Breadcrumb: 'Atividades' mantém o destino atual (/atividade?demandaId=X). CORREÇÃO: NÃO existe rota /demanda/:id — o módulo demanda é /demanda?projetoId=X (grafo por projeto); o trecho da demanda pode linkar para /demanda?projetoId=<projetoId> ou, sem enriquecimento, manter o destino atual com rótulo honesto ('Atividades da demanda #42'). Enriquecer AtividadeRecuperadaDto no backend com nomeDemanda, projetoId, nomeProjeto, usuarioTipo e execucaoAtivaId/execucaoAtivaDescricao/execucaoAtivaInicioData — os joins e subqueries já existem em AtividadeResumoDto/ExecucaoItemDto; esse único enriquecimento destrava S1 (timer p/ gestor), S2 (descrição opcional por tipo do dono), S4 e S5.
_Redução de esforço:_ orientação em 0 cliques (projeto/demanda/status visíveis sem navegar) e elimina o link enganoso atual 'Demanda #42' que leva à listagem de atividades

### S9 — Execuções recentes ricas (executor, horários, duração formatada, timer na linha ativa) — condicionada à correção da ordenação [impacto medio]
Cada linha: avatar + nomeUsuario (existe em ExecucaoItemDto — essencial para gestor), 'hoje 09:12 → 11:27' (inicioData/fimData existem), duração via MinutosParaHorasPipe (existe; nunca '135 min'), e na linha ativa (fimData === null — não usar duracaoMinutos, que o listar calcula com NOW() e nunca vem null) o ExecucaoTimerComponent 'compacto' (existe) + botão-ícone de pausa inline reutilizando a ação do S1, visível apenas quando podeExecutar. PRÉ-REQUISITO: corrigir a ordenação do GET /execucao (hoje ORDER BY usuario.nome ASC, inicio_data ASC + LIMIT 5 retorna as 5 MAIS ANTIGAS e a linha ativa pode ficar de fora do payload). Empty state com botão 'Iniciar primeira execução' focando o input da faixa — exibido apenas quando a faixa de início se aplica (podeExecutar e status executável); para dev não-dono o backend restringe o listar às próprias execuções, então o bloco dele fica naturalmente vazio e sem CTA.
_Redução de esforço:_ dados mais usados visíveis sem hover/clique; pausa disponível na própria linha (zero navegação); corrige de quebra o bug de 'recentes' mostrando as mais antigas

### S10 — Skeleton no carregamento, empty state acionável e re-sincronização ao focar a aba [impacto baixo]
Skeleton do layout (breadcrumb, título+tag, faixa e 3 cards) durante o forkJoin — padrão novo no app (nenhum p-skeleton em uso), usar PrimeNG Skeleton. 'Atividade não encontrada' ganha botão primário 'Voltar para Atividades' (hoje é beco sem saída, só texto). Replicar o par @HostListener('document:visibilitychange') + @HostListener('window:focus') com guarda de carregando (padrão confirmado na atividade-listagem) para re-buscar execução ativa e lista de execuções ao voltar à aba — crítico aqui porque o timer e o estado da faixa ficam obsoletos se a execução foi encerrada em outra aba/pelo auto-stop da virada do dia (cron real no backend).
_Redução de esforço:_ elimina tela em branco, beco sem saída no erro e estado de timer obsoleto após retorno à aba

### S11 — Registrar tempo manualmente (gestor) direto do detalhe, reutilizando o dialog da listagem [impacto baixo]
Botão outline 'Registrar tempo' no bloco de execuções, visível só para gestor (POST /execucao/registro é @GestorOnly — confirmado), abrindo o mesmo dialog da listagem: datepickers com hora, foco inicial na descrição via [focusOnShow]=false + (onShow) (padrão focarDescricaoRegistro confirmado), validador cross-field existente. Correções de regra: o fim deve ser ESTRITAMENTE posterior ao início (fim > início, não ≥) e nenhuma data pode estar no futuro (BusinessExceptions do backend); exibir também o erro de sobreposição ('Já existe uma execução deste usuário que se sobrepõe a este período'). Sucesso: fechar, toast com duração e inserir a linha na lista sem recarregar. Default de datas 'hoje' é melhoria válida (a listagem hoje abre vazio).
_Redução de esforço:_ de 5+ cliques com ida e volta à listagem para 2 cliques na própria tela


## Ajustes de implementação apontados pelo verificador
1) Região 1 — breadcrumb: não existe rota /demanda/:id; o módulo demanda é /demanda?projetoId=X (grafo por projeto). O link do trecho da demanda deve apontar para /demanda?projetoId=<projetoId> ou manter o destino atual (/atividade?demandaId) com rótulo honesto. Nomes de projeto/demanda e projetoId não existem em AtividadeRecuperadaDto — exigem enriquecimento do DTO no backend. 2) Região 2, Estado A — os dados da execução ativa da ATIVIDADE (id, descrição, início) não estão em AtividadeRecuperadaDto e GET /execucao/ativa só retorna a execução do usuário logado (insuficiente para gestor vendo atividade de terceiro): enriquecer o DTO com execucaoAtivaId/execucaoAtivaDescricao/execucaoAtivaInicioData (precedente em AtividadeResumoDto, que não tem o inicioData necessário ao timer). 3) Região 2, Estado A — 'Pausar mantém a descrição atual' precisa REENVIAR a descrição existente no PATCH /execucao/:id/encerrar: o backend sobrescreve a descrição e a exige quando o dono da atividade é desenvolvedor (opcional só para dono gestor). 4) Região 2, Estado B — o placeholder 'Descrição (opcional)' depende do TIPO DO DONO da atividade, não do usuário logado; requer usuarioTipo no DTO enriquecido (ou aplicar só quando o gestor logado é o dono). 5) Região 2, Estado C — restringir ao caso em que o usuário logado É o dono da atividade da página: a regra 'nunca duas execuções' recai sobre o dono, então para gestor em atividade de terceiro a execução ativa do próprio gestor não impede o início e 'Pausar lá e iniciar aqui' encerraria o trabalho do gestor indevidamente; o caso 'dono ocupado em outra atividade' não é detectável por endpoint atual — tratar o erro do backend com toast. Além disso, 'Revisar fluxo de estorno (Demanda #38)' usa dados inexistentes (ExecucaoAtivaDto tem apenas id/atividadeId/descricao/inicioData): exibir a DESCRIÇÃO da execução (nome da atividade só com GET /atividade/:id adicional). O Estado C também precisa manter o input de descrição visível — sem ele o 'iniciar' encadeado falha para dono desenvolvedor. 6) Região 5 — 'Execuções recentes' pressupõe ordenação decrescente, mas o GET /execucao ordena por usuario.nome ASC, inicio_data ASC com LIMIT 5: hoje retorna as 5 MAIS ANTIGAS e a linha ativa pode ficar fora do payload; corrigir a ordenação no backend é pré-requisito das Regiões 2 (chip 'Reutilizar última') e 5. 7) Região 5 — dev não-dono não vê execuções de terceiros (restrição do listar no backend): o bloco fica vazio para ele; ocultar o CTA 'Iniciar primeira execução' quando a faixa de início não se aplica (sem posse ou status não executável) e o ⏸ inline apenas quando podeExecutar; detectar 'em andamento' por fimData === null (o duracaoMinutos do listar nunca vem null, é calculado com NOW()). 8) Região 4 — '+ Editar visível só para gestor' contraria a listagem e o backend, que permitem dev autor/membro (podeEditar); alinhar à regra da listagem. 9) Região 6 — validação correta: fim ESTRITAMENTE posterior ao início (>) e datas não podem estar no futuro; prever o erro de sobreposição do backend; para consistência, reutilizar o dialog da listagem (lá a ordem é Início/Fim e depois Descrição, com foco na Descrição) ou alterar os dois juntos. 10) Estados — skeleton é padrão inexistente no app (nenhum p-skeleton hoje; ok introduzir PrimeNG Skeleton) e o refresh ao focar a aba deve re-buscar execução ativa + execuções com a guarda de 'carregando' (padrão exato da listagem, visibilitychange + window:focus).

## Especificação do redesign
# Redesign — Atividade: detalhe com timer de execução (rota /atividade/:id)

Tema Aura (primário azul), Tailwind, claro/escuro, toasts em bottom-center. Largura máx. do conteúdo: 960px centralizado. Dados de exemplo usados em todo o mockup:

- Projeto **"Portal do Cliente"** · Demanda **#42 "Checkout com um clique"**
- Atividade **#317 "Implementar validação de cartão"**, status **Desenvolvendo**, responsável **Ana Souza** (desenvolvedora, usuária logada), criada em **02/07/2026**
- Gestor: **Bruno Lima** · Tags: **Frontend** (azul #3B82F6), **Pagamentos** (verde #10B981)

---

## Região 1 — Cabeçalho da página

- **Breadcrumb** (linha 1, texto sm, cinza): `Atividades › Portal do Cliente · Demanda #42 — Checkout com um clique`. "Atividades" volta à listagem filtrada pela demanda; o trecho da demanda é link para a demanda. ①
- **Linha do título**: h1 "Implementar validação de cartão" (texto padrão, semibold, 1.5rem — não azul) + **p-tag de status colorida** ao lado (`Desenvolvendo`, severity info/azul).
- **Linha de metadados** (texto sm): avatar "AS" + "Ana Souza" · "Criada em 02/07/2026".
- **À direita**: select compacto "Status" (Pendente / Planejada / Desenvolvendo / Desenvolvida), salva no onChange com toast "Status atualizado". **Desabilitado enquanto houver execução ativa na atividade**, com tooltip "Pause a execução para mudar o status". ⑤

## Região 2 — Faixa de execução (hero, logo abaixo do cabeçalho) ①②③

Card destacado (borda esquerda azul 4px, fundo levemente azulado no claro / elevado no escuro). Três estados mutuamente exclusivos:

**Estado A — Execução ativa NESTA atividade:**
- Esquerda: ícone pi-stopwatch + **timer grande ao vivo `02:17:43`** (ExecucaoTimerComponent tamanho "grande", fonte mono, azul primário) + abaixo, em sm: "Ajustando regex do número do cartão · iniciada hoje às 09:12".
- Direita: botão primário grande **"⏸ Pausar"** — 1 clique encerra imediatamente (mantém a descrição atual), timer congela, toast "Execução pausada · 2h17". Ao lado, botão text "Editar descrição ao pausar" (raro → escondido atrás de 1 clique; abre um pequeno popover com textarea pré-preenchida + botão "Pausar e salvar").
- Otimista: ao pausar, a linha correspondente na Região 5 vira concluída na hora.

**Estado B — Sem execução ativa do usuário (caso padrão):**
- Esquerda: input de linha única com placeholder **"O que você vai fazer? (Enter inicia)"** + abaixo, chip clicável **"↻ Reutilizar última: 'Ajustando regex do número do cartão'"** (pré-preenche o input em 1 clique; oculto se não há execuções). ②
- Direita: botão primário **"▶ Iniciar execução"**. Enter no input também inicia. Para dono gestor a descrição é opcional (placeholder muda para "Descrição (opcional)").
- Ao iniciar: **permanece na página** — a faixa vira o Estado A com timer em 00:00:01 e a nova linha "em andamento" surge no topo da Região 5. Toast "Execução iniciada". ③
- Se o status da atividade for Pendente ou Desenvolvida: input e botão desabilitados + aviso inline "Disponível apenas em atividades Planejadas ou em Desenvolvimento — altere o status acima." ⑤
- Se o usuário for desenvolvedor e NÃO for o dono (Ana vendo atividade do time): a faixa não aparece.

**Estado C — Usuário já tem execução ativa em OUTRA atividade:** ④
- Aviso âmbar: ícone pi-exclamation-triangle + "Você já está executando **'Revisar fluxo de estorno'** (Demanda #38) — há 1h07."
- Botões: primário **"Pausar lá e iniciar aqui"** (encadeia encerrar + iniciar com a descrição do input acima; 1 clique) e text "Ir para a outra atividade".

## Região 3 — Bloco Descrição (click-to-edit) ⑥

- Card com título "Descrição" + ícone lápis discreto à direita.
- Texto da descrição: "Validar número, bandeira e CVV no front antes do envio, com máscara e mensagens de erro específicas." Clicar no texto (ou no lápis) troca o parágrafo por **textarea no lugar** (6 linhas, autofocus, spellcheck), com o Assistente de descrição abaixo e rodapé "Ctrl+Enter salva · Esc cancela" + botões "Cancelar" / "Salvar" (primário). Sem dialog.
- Vazio: "Sem descrição." + botão text "Adicionar descrição" (mesmo comportamento inline).

## Região 4 — Bloco Tags (popover de chips)

- Card com título "Tags"; chips **Frontend** e **Pagamentos** nas cores das tags + chip pontilhado **"+ Editar"** (visível só para gestor).
- Clicar em "+ Editar" abre **popover ancorado** com todas as tags disponíveis como chips alternáveis (1 clique liga/desliga; selecionadas ganham preenchimento e check). Fechar o popover salva automaticamente (PUT /atividade/:id/tag) com toast "Tags atualizadas". Sem dialog, sem multiselect.

## Região 5 — Bloco Execuções recentes

- Cabeçalho: título "Execuções recentes" + (gestor) botão outline sm **"＋ Registrar tempo"** (abre o dialog da Região 6) + botão text "Ver todas →" (/execucao?atividadeId=317).
- Lista (5 itens), cada linha:
  - **Linha ativa** (fundo azul-claro): timer compacto ao vivo `02:17:43` + "Ajustando regex do número do cartão" + "hoje 09:12 → agora" + avatar "AS" Ana Souza + **botão-ícone ⏸ inline** (mesma ação do Pausar da faixa).
  - Linhas concluídas: "Máscara de CVV e bandeira" · "ontem 14:03 → 16:18 · **2h15**" · avatar "AS" Ana Souza; "Setup do formulário de cartão" · "07/07 10:00 → 12:30 · **2h30**" · avatar "BL" Bruno Lima (executor visível — importa para o gestor). Duração sempre formatada em h/min, nunca "135 min".
- **Vazio**: ilustração leve + "Nenhuma execução registrada ainda." + botão primário **"▶ Iniciar primeira execução"** (foca o input da faixa).

## Região 6 — Dialog "Registrar tempo manualmente" (gestor)

Descrever sobre a **página de fundo escurecida** (overlay preto ~50%, página do detalhe visível desfocada atrás; o dialog centralizado, 36rem, cantos arredondados):
- Header: "Registrar tempo — Implementar validação de cartão" + X.
- Corpo: campo **Descrição** (textarea 3 linhas, autofocus — foco inicial aqui, não nas datas), depois lado a lado **Início** e **Fim** (datepickers com hora; default: hoje, Fim ≥ Início com erro inline "O fim deve ser posterior ao início").
- Exemplo preenchido: Descrição "Pareamento com a Ana na validação de bandeira", Início 09/07/2026 14:00, Fim 09/07/2026 15:30.
- Footer: "Cancelar" (outline) · **"Registrar"** (primário, Ctrl+Enter). Sucesso: fecha, toast bottom-center "Execução registrada · 1h30", nova linha aparece na Região 5 sem recarregar a página.

## Estados da página

- **Carregando**: skeleton — barra do breadcrumb, retângulo do título + tag, faixa de execução e 3 cards com blocos cinza pulsantes.
- **Não encontrada**: ícone pi-exclamation-circle + "Atividade não encontrada." + botão primário **"Voltar para Atividades"**.
- **Com dados**: como descrito; a faixa da Região 2 escolhe o estado A/B/C conforme GET /execucao/ativa + execuções da atividade.
- Ao voltar o foco para a aba, a página re-sincroniza execução ativa e lista (padrão já usado na listagem).

## Interações-chave (resumo)

- Enter no input da faixa inicia execução; Ctrl+Enter salva descrição/registro; Esc cancela edição inline.
- Pausar = 1 clique, sem dialog de confirmação (a descrição já existe; editar é opcional via popover).
- Nenhuma ação recarrega a página nem navega para outra rota, exceto os links explícitos (demanda, histórico).
- Toda regra visível: botões escondidos quando não permitidos (posse), desabilitados com tooltip quando o estado não permite (status/execução dupla).

## Callouts numerados para o mockup

- **① Breadcrumb correto + contexto de projeto/demanda no topo** — orientação sem cliques (antes: link "Demanda #42" enganoso).
- **② Início rápido inline com "Reutilizar última"** — iniciar em 1–2 cliques, zero digitação na retomada (antes: 3 cliques + dialog + descrição sempre obrigatória).
- **③ Timer ao vivo + permanece na página após iniciar** — atualização otimista, sem redirect para /execucao (antes: perdia o contexto, +2 cliques para voltar).
- **④ Pausar em 1 clique e troca de atividade em 1 clique** — a regra "nunca duas execuções" vira um botão, não um erro do backend (antes: pausar era impossível nesta tela, ~3–6 cliques em outra tela).
- **⑤ Regras visíveis: status bloqueado durante execução, play desabilitado com tooltip em status não executável** — impede fluxos desperdiçados.
- **⑥ Edição inline de descrição e tags (click-to-edit + popover de chips)** — agir onde o dado é lido, sem dialogs (de 3–5 cliques para 2–3).
