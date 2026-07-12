# Atividade — detalhe (com timer de execução iniciar/pausar) (/atividade/:id)

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

## Sugestões (VERIFICAR: checar vs regras de negócio)
### S1 — Barra de execução com timer ao vivo e Pausar em 1 clique [impacto alto]
Adicionar no topo do conteúdo uma faixa de execução: quando houver execução ativa NESTA atividade, exibir ExecucaoTimerComponent tamanho 'grande' + descrição da execução + botão primário 'Pausar' que encerra imediatamente (PATCH /execucao/:id/encerrar reaproveitando a descrição existente — o DTO a torna opcional/atualizável), com toast 'Execução pausada · 2h15'. Sem dialog no caso comum; editar a descrição ao pausar vira ação secundária.
_Redução de esforço:_ pausar: de 3 cliques + troca de tela para 1 clique sem sair da página

### S2 — Início rápido inline, sem dialog, com Enter e reutilização da última descrição [impacto alto]
Substituir o dialog 'Iniciar execução' por um campo inline na própria faixa: input 'O que você vai fazer?' com autofocus ao clicar em Iniciar, submit por Enter, e chip 'Reutilizar última: "<descrição da execução mais recente>"' que pré-preenche em 1 clique (dado já carregado em execucoesRecentes). Descrição opcional quando o dono da atividade é gestor (regra do DTO).
_Redução de esforço:_ iniciar: de 3 cliques + dialog para 1–2 cliques (retomada de trabalho recorrente: 2 cliques e zero digitação)

### S3 — Permanecer na página após iniciar (update otimista) [impacto alto]
Remover o router.navigate(['/execucao']) do iniciarExecucao: ao confirmar, a faixa vira imediatamente o timer em 00:00:01 (otimista, com o id retornado pelo POST) e a lista de execuções ganha a nova linha 'em andamento'. O usuário inicia o trabalho e já está na tela do trabalho.
_Redução de esforço:_ elimina 2 cliques de retorno ao contexto + 1 recarregamento de página em todo início de execução

### S4 — Guarda de execução ativa com troca em 1 clique [impacto alto]
No carregamento, chamar GET /execucao/ativa (ExecucaoAtivaDto). Se o usuário já tem execução em OUTRA atividade, a faixa mostra aviso 'Você já está executando: <descrição> (há 1h07)' e o botão vira 'Pausar lá e iniciar aqui' — o frontend encadeia encerrar + iniciar (endpoints existentes). Evita o erro tardio do backend e resolve o caso mais frequente de troca de contexto.
_Redução de esforço:_ trocar de atividade: de ~6 cliques em 2 telas (pausar na listagem + voltar + iniciar) para 1 clique

### S5 — Mesmas regras de exibição da listagem no botão de execução [impacto medio]
Replicar podeExecutar (gestor ou dono), podeIniciarExecucao (status Planejada/Desenvolvendo) e atividadeEmExecucao: esconder o botão para dev sem posse; desabilitar com tooltip 'Disponível apenas em atividades Planejadas ou em Desenvolvimento' quando o status não permite; e bloquear o select de status durante execução ativa com tooltip 'Pause a execução para mudar o status'.
_Redução de esforço:_ elimina o ciclo preencher → erro do backend → refazer (economiza um fluxo inteiro desperdiçado)

### S6 — Descrição click-to-edit inline (sem dialog) [impacto medio]
Clicar no texto da descrição (ou no lápis) transforma o bloco em textarea no lugar, com autofocus, Ctrl+Enter salva, Esc cancela, e o AssistenteDescricaoComponent abaixo. Remove o dialog inteiro.
_Redução de esforço:_ de 3 cliques + overlay para 2 cliques no lugar onde o dado é lido

### S7 — Tags como chips alternáveis em popover (padrão da listagem) [impacto medio]
Trocar o dialog + multiselect por um popover ancorado no botão '+' do bloco de tags: todas as tags disponíveis como chips clicáveis (1 clique alterna), salvando ao fechar (PUT /atividade/:id/tag) — mesmo padrão alternarTagSelecao já existente na listagem.
_Redução de esforço:_ de 5 cliques para 2–3 (abrir + alternar), e consistência entre telas

### S8 — Cabeçalho com breadcrumb correto, tag de status e metadados [impacto medio]
Breadcrumb 'Atividades › Demanda #42' onde o link da demanda leva à demanda de fato (ou, no mínimo, renomear para 'Atividades da demanda #42'); exibir p-tag colorida de status (funções já importadas) ao lado do select; mostrar 'Criada em <createdDate>'. Enriquecer AtividadeRecuperadaDto com nomeDemanda/nomeProjeto (o backend já expõe esses nomes no AtividadeResumoDto e no ExecucaoItemDto).
_Redução de esforço:_ orientação em 0 cliques: usuário identifica projeto/demanda/status sem navegar para descobrir onde está

### S9 — Execuções recentes ricas: executor, horários, duração formatada, timer na linha ativa [impacto medio]
Cada linha: avatar+nome do executor (ExecucaoItemDto.nomeUsuario — essencial para gestor), 'hoje 09:12 → 11:27', duração via pipe (2h15 em vez de 135 min), e na linha em andamento o ExecucaoTimerComponent 'compacto' + botão de pausa inline. Empty state com botão 'Iniciar primeira execução'.
_Redução de esforço:_ dados mais usados visíveis sem hover/clique; pausa também disponível na linha (0 navegação)

### S10 — Skeleton no carregamento + empty acionável + refresh ao focar a aba [impacto baixo]
Skeleton do layout (header + 3 blocos) durante o forkJoin; 'Atividade não encontrada' ganha botão 'Voltar para Atividades'; replicar o @HostListener de visibilitychange/focus da listagem para re-sincronizar a execução ativa ao voltar à aba.
_Redução de esforço:_ elimina tela em branco e beco sem saída no erro; estado do timer nunca fica obsoleto

### S11 — Registrar tempo manualmente (gestor) direto do detalhe [impacto baixo]
Botão secundário 'Registrar tempo' no bloco de execuções (visível só para gestor) abrindo o mesmo dialog início/fim/descrição da listagem (POST /execucao/registro), com foco inicial na descrição como já feito lá.
_Redução de esforço:_ de 5+ cliques com volta à listagem para 2 cliques na própria tela


## REDESIGN SPEC
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
