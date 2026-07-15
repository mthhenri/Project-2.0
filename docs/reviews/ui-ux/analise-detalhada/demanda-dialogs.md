# Demandas — dialogs (criar demanda, editar demanda, detalhe da demanda, lista de conexões, lista de membros) (/demanda (dialogs))

> ✅ Sugestões verificadas adversarialmente contra o código e as regras de negócio.

## Fluxos atuais
- **Criar demanda simples (gestor, botão 'Nova Demanda' da página)** (4 cliques): Clicar 'Nova Demanda' → clicar no campo Nome (sem autofocus) → digitar → clicar 'Criar Demanda' (Enter não submete) → dialog NÃO fecha (form reseta) → clicar X/Cancelar para fechar
- **Criar demanda completa (pai + 2 membros + 2 tags + previsão)** (13 cliques): Abrir dialog → Nome → abrir select Pai → escolher → abrir multiselect Membros → marcar 2 → fechar dropdown → clicar 2 chips de tag → abrir datepicker → navegar/escolher data → 'Criar Demanda' → fechar dialog
- **Marcar demanda como Concluída (a partir do detalhe)** (5 cliques): Abrir detalhe (clique na árvore) → 'Editar' → aguardar GET carregar → abrir select Status → 'Concluída' → 'Salvar'
- **Editar tags da demanda (gestor)** (5 cliques): Abrir detalhe → aba 'Tags' → 'Editar' (abre dialog com o MESMO seletor de chips) → toggle 1 chip → 'Salvar'
- **Adicionar 1 membro (gestor)** (7 cliques): Abrir detalhe → aba 'Membros' → 'Gerenciar' → abrir multiselect → digitar busca + marcar usuário → fechar dropdown → 'Salvar'
- **Dev entrar/sair de uma demanda** (3 cliques): Abrir detalhe → aba 'Membros' → 'Participar' (1 clique) ou 'Sair' + confirm (2 cliques)
- **Adicionar conexão entre demandas (gestor)** (7 cliques): Abrir detalhe → aba 'Conexões' → 'Adicionar' → abrir select destino → rolar lista de até 200 itens SEM busca → escolher → (opcional: checkbox bidirecional) → 'Adicionar'
- **Editar descrição técnica** (3 cliques): Abrir detalhe → 'Desc. Técnica' (abre dialog 95vw) → editar no Quill → 'Salvar'
- **Criar sub-demanda de uma estrutural** (5 cliques): Abrir detalhe → aba 'Sub-demandas' (se não for a inicial) → 'Nova Sub-demanda' → preencher nome → 'Criar Demanda' → fechar dialog de criação
- **Excluir demanda (gestor)** (3 cliques): Abrir detalhe → lixeira → confirmar no confirm-dialog (mensagem incorreta 'não pode ser desfeita' apesar do soft delete)

## Problemas
- [ALTA] P1: Detalhe 100% somente leitura: qualquer edição (status, nome, previsão, horas) exige abrir o dialog aninhado 'Editar Demanda' com GET + spinner. Mudar status — a ação mais frequente — custa 5 cliques quando poderia ser 2 (dropdown inline no próprio tag de status).
- [ALTA] P2: O dialog de criação não fecha após salvar: reseta o form silenciosamente (modo 'criar várias' implícito e não comunicado). Gera clique extra para fechar e insegurança sobre se a demanda foi criada (só o toast, em bottom-center, avisa).
- [ALTA] P3: Nenhum dos 5 formulários tem autofocus no primeiro campo nem submit com Enter (botões usam onClick, forms sem ngSubmit). Toda criação exige mouse do início ao fim.
- [ALTA] P4: Tags e Membros estão enterrados em abas E ainda exigem um dialog extra para editar. O dialog de tags reusa exatamente o mesmo seletor de chips da aba — camada 100% redundante; o dialog de membros duplica em multiselect a lista já exibida nos cards.
- [ALTA] P5: Select 'Demanda Destino' do dialog de conexão não tem filtro de busca ([filter] ausente) com até 200 demandas carregadas — achar o destino exige scroll manual em lista longa.
- [MEDIA] P6: Inconsistência criar × editar: criar tem Membros e Tags, editar não (para mudar tags a partir da edição é preciso fechar e reabrir via aba Tags); larguras diferentes (560 vs 600px); sufixo do campo horas 'h' vs vazio; showButtons só na edição; label do checkbox difere ('Demanda estrutural (agrupa sub-demandas)' vs 'Demanda Estrutural').
- [MEDIA] P7: Status aparece duas vezes no detalhe (tag no cabeçalho + célula do info-grid); 'Estrutural: Sim/Não' no grid duplica o ícone de pasta; 'Previsão de Término' some do grid quando nula em vez de mostrar '—' com ação de definir.
- [MEDIA] P8: Aba Atividades é somente leitura: não há 'Nova Atividade' e o botão 'Ver Atividades' fecha o dialog e navega para /atividade — perda total do contexto para uma consulta rápida.
- [MEDIA] P9: Empty states inconsistentes: Sub-demandas tem botão de ação, mas Conexões ('Nenhuma conexão'), Membros ('Nenhum membro atribuído'), Tags e Atividades são só ícone + texto, sem o CTA da ação principal.
- [MEDIA] P10: Confirm-dialogs modais para ações leves e reversíveis (remover conexão, remover membro, sair da demanda) — tudo é soft delete; deveria ser ação imediata com toast + Desfazer.
- [MEDIA] P11: Mensagem de exclusão da demanda afirma 'Esta ação não pode ser desfeita', o que é factualmente errado (soft delete em tudo) e intimida sem necessidade.
- [MEDIA] P12: Navegação interna frágil: clicar num ancestral/sub-demanda recarrega ~8 requests e não há 'voltar'; o link de conexão usa routerLink para /demanda/:id e troca a página por baixo do dialog aberto, em vez de navegar dentro do próprio detalhe.
- [MEDIA] P13: Formulário não se adapta: ao marcar 'Demanda estrutural', Horas Estimadas (obrigatório) e Previsão continuam exigidos/visíveis, embora uma estrutural agregue os valores dos filhos.
- [BAIXA] P14: Dica de caracteres proibidos permanentemente visível sob o campo Nome em criar e editar — ruído constante para um erro raro; deveria aparecer só na violação.
- [BAIXA] P15: Tag de tipo 'Dev' em cada card de membro é ruído: por regra de negócio gestores nunca entram em demanda_usuario, logo a tag é sempre igual.
- [BAIXA] P16: Ícones de direção da conexão (azul/verde/roxo, →/←/↔) não têm tooltip nem legenda — semântica 'depende de / bloqueia' fica implícita e exige aprendizado.
- [BAIXA] P17: Botão 'Adicionar' do dialog de conexão não desabilita com formulário inválido: clique sem destino selecionado falha silenciosamente, sem feedback.
- [BAIXA] P18: Footer do detalhe contém apenas 'Fechar', redundante com o X do header; botões 'Desc. Técnica'/'Desc. Cliente' usam labels truncadas e affordance fraca (glow sutil no ícone para indicar conteúdo preenchido).
- [BAIXA] P19: Datepicker de Previsão de Término sem atalhos rápidos (ex.: +1 semana, fim do mês) — datas frequentes exigem navegação no calendário.

## Sugestões aprovadas na verificação
### S1 — Edição inline no detalhe (status, nome, previsão, estimativa) com gate por podeEditar [impacto alto]
Transformar o detalhe em superfície editável para quem tem permissão usando a flag podeEditar já retornada pelo backend (DemandaRecuperadaDto.podeEditar: gestor sempre; dev quando membro): tag de status vira dropdown-clique (Pendente/Planejada/Concluída/Cancelada) com PUT parcial imediato (DemandaAlterarDto aceita campos opcionais) + toast; nome com lápis inline (Enter salva, Esc cancela); Estimado e Previsão click-to-edit no info-grid. O campo Estimado deve respeitar a conversão dias/horas do VisualizacaoTempoService, como o formulário atual. Após cada PUT, emitir demandaAlterada para atualizar grafo/árvore por baixo. Bônus de correção: hoje o botão Editar do detalhe é gestor-only no template, mas o backend permite dev membro editar (exceto descricaoCliente) — a edição inline via podeEditar alinha frontend e backend. O dialog 'Editar Demanda' permanece como 'Editar tudo'.
_Redução de esforço:_ marcar Concluída: de 4 cliques + 2 requests de carga do dialog para 2 cliques; alterar previsão: de 4 para 2; dev membro passa a conseguir editar pela UI (hoje não consegue)

### S2 — Autofocus no primeiro campo + submit com Enter (Esc já existe) [impacto alto]
Foco automático no campo Nome ao abrir criar/editar (diretiva pAutoFocus do PrimeNG — hoje nenhum template do módulo demanda tem autofocus), (ngSubmit)/keydown.enter ligado ao botão primário nos forms de criar demanda, editar, conexão e membros (hoje todos usam apenas (onClick), sem submit), e Ctrl+Enter para salvar no editor de descrição (onde Enter insere parágrafo). Cuidar para Enter não submeter com overlay de select/datepicker aberto. Removido da proposta original: 'Esc fecha' — já é comportamento default do p-dialog em todos os dialogs de demanda (nenhum define closeOnEscape=false).
_Redução de esforço:_ -2 cliques em toda criação/edição (clique inicial no campo e clique no botão primário)

### S3 — Fechar ao criar + botão secundário 'Criar e adicionar outra' preservando o pai escolhido [impacto alto]
Confirmado no código: hoje salvar() cria, exibe toast, reseta o form e MANTÉM o dialog aberto — criação única exige fechar manualmente e o usuário fica em dúvida se funcionou. Mudança: 'Criar Demanda' (primário) fecha após sucesso; 'Criar e adicionar outra' (ação secundária) mantém o dialog aberto com foco de volta no Nome. Correção sobre a proposta: preservar a demanda pai SELECIONADA no formulário no momento do submit (valor.demandaPaiId), não apenas o demandaPaiIdInicial do contexto — o reset atual descarta o pai que o usuário escolheu manualmente.
_Redução de esforço:_ criação única: de 2 cliques finais (Criar + fechar) para 1; lote de N demandas sob o mesmo pai: contexto preservado sem re-selecionar o pai

### S4 — Tags como chips-toggle com PUT imediato e membros com autocomplete inline (sem dialogs intermediários) [impacto alto]
Os chips-toggle JÁ existem, mas presos dentro do dialog 'Editar Tags' (abrir + togglar + Salvar). Mudança: exibir todos os chips direto na seção Tags em modo toggle; cada clique envia PUT /demanda/:id/tag com a lista sincronizada (endpoint já sincroniza adds/removes) — desabilitar o chip durante o request para evitar corrida. Correção de permissão: o backend permite gestor OU dev membro alterar tags (hoje o template restringe a gestor sem necessidade) — usar eMembro() como gate. Membros: 'Gerenciar' (dialog multiselect + forkJoin) vira autocomplete inline '+ Adicionar pessoa' no cabeçalho da lista, POST individual por seleção/Enter — somente gestor (GET /usuario é gestor-only, confirmado pelo guard do forkJoin); dev mantém 'Participar'/'Sair' (POST/DELETE de si mesmo, já implementados). X de cada card remove com toast + Desfazer (re-POST); a regra 'não remover o último membro' (400 do backend) deve ser exibida como toast de erro claro.
_Redução de esforço:_ toggle de 1 tag: de 4 cliques (aba + Editar + chip + Salvar) para 1-2; adicionar 1 membro: de ~6 cliques para 2-3

### S5 — Conexões: criação inline com busca + toggle uni/bidirecional + tooltips direcionais neutros [impacto alto]
Confirmado: o dialog atual usa p-select SEM [filter] sobre até 200 demandas (scroll cego) e checkbox 'Bidirecional'. Mudança: linha inline no topo da aba (gestor-only — POST/DELETE de conexão são @GestorOnly no controller): autocomplete client-side sobre todasDemandas (já carregadas), toggle de 2 botões que mapeia APENAS ehBidirecional ('→ Direcional' vs '↔ Bidirecional' — a origem é sempre a demanda atual; o endpoint não cria conexão no sentido inverso), botão Adicionar desabilitado sem destino, Enter confirma. Erro de ciclo ('Essa conexão criaria um ciclo no grafo de demandas') exibido inline capturando o 400. CORREÇÃO IMPORTANTE: os rótulos 'Depende de X'/'X depende desta' foram removidos — a semântica de dependência NÃO existe no domínio (SYSTEM.SPEC define demanda_conexao como conexão dirigida genérica com eh_bidirecional); usar tooltips direcionais neutros ('Conexão desta demanda para X' / 'Conexão de X para esta demanda' / 'Conexão bidirecional') até o time definir semântica oficial.
_Redução de esforço:_ adicionar conexão: de ~6 cliques com scroll cego em 200 itens para ~3 com busca digitável

### S6 — Promover tags e membros ao cabeçalho do detalhe; eliminar Status e 'Estrutural' duplicados [impacto medio]
Duplicações confirmadas no template: o status aparece 2x (linha de identidade E info-grid) e 'Estrutural: Sim/Não' duplica o ícone pi-folder da identidade. Mudança: cabeçalho com chips de tags (+ popover-toggle de S4) e pilha de avatares de membros (+ autocomplete de S4; 'Participar' para dev não-membro); remover o Status do info-grid (fica só o status-dropdown do título) e o campo 'Estrutural' (fica o ícone com tooltip). Membros precisam ser carregados no carregarTudo do detalhe (GET /demanda/:id/membro é acessível a qualquer usuário com acesso à demanda — hoje só o componente filho carrega). Cargo no hover vem de DemandaMembroDto.cargoTitulo (existe). Abas restantes: Sub-demandas (estrutural), Atividades (membro), Conexões — dev não-membro de demanda não-estrutural cai em Conexões, como hoje.
_Redução de esforço:_ ver tags/membros: de 1-2 cliques (trocar aba) para 0; menos 2 abas e 2 dialogs intermediários

### S7 — Empty states acionáveis nas seções que ainda não têm (Conexões, Membros, Atividades, Tags) [impacto medio]
Confirmado: só o empty de Sub-demandas tem botão ('Nova Sub-demanda'); Conexões, Membros, Atividades e Tags são só ícone + texto. Padronizar: Conexões vazio → botão 'Adicionar conexão' que foca a linha inline de S5 (exibido só para gestor, dono da permissão); Membros vazio → '+ Adicionar pessoa' (gestor) ou 'Participar desta demanda' (dev não-membro — ação já existente no header da lista); Atividades vazio → 'Nova Atividade' navegando para /atividade/nova?demandaId=X (rota existente com pré-preenchimento já implementado); Tags vazio → chips-toggle de S4 já resolvem (todas as tags visíveis); para gestor sem tags cadastradas, link 'Gerenciar tags' para /tag.
_Redução de esforço:_ primeira ação a partir do vazio: de 2-3 cliques (localizar o botão no header/aba) para 1 clique no próprio empty

### S8 — Undo em vez de confirm para remoções reversíveis + confirm de exclusão com nome e texto fiel ao comportamento real [impacto medio]
Remover membro, sair da demanda e excluir conexão executam na hora com toast 'Removido · Desfazer' — todos reversíveis por re-POST nos endpoints existentes (o undo de membro nunca viola a regra do último membro, pois re-adicionar é sempre permitido; tratar clique duplo no Desfazer para não gerar 400 de duplicidade). Exclusão de demanda mantém confirm por ser destrutiva e gestor-only, citando o nome da demanda. CORREÇÃO FACTUAL sobre a proposta: o texto 'Sub-demandas e atividades deixarão de ser exibidas' é FALSO — o soft delete atinge só a demanda (executarSoftDelete(id), sem cascata); sub-demandas continuam ativas e REAPARECEM como raízes na árvore/grafo, e as atividades continuam nas listagens (o JOIN de atividade não filtra demanda.is_deleted). Texto correto sugerido: 'Excluir a demanda X? As sub-demandas existentes serão promovidas a demandas raiz e as atividades já criadas serão mantidas.' (ou, alternativamente, especificar cascata no backend como tarefa separada antes de prometer sumiço).
_Redução de esforço:_ cada remoção de membro/conexão: de 2 cliques + leitura de modal para 1 clique com undo

### S9 — Formulário de criação adaptativo: ocultar Horas/Previsão para estruturais e dica de caracteres só no erro [impacto medio]
Ao marcar 'Demanda estrutural', ocultar Horas Estimadas e Previsão de Término e enviar horasEstimadas: 0 (o DTO exige o campo, e 0 já é o default do form; previsaoFimData é opcional). Na edição de estrutural, ocultar sem apagar (PUT parcial não envia o campo). Dica de caracteres proibidos (hoje sempre visível em criar E editar) passa a aparecer apenas quando o erro de pattern ocorre. Atalhos '+1 semana / +2 semanas / fim do mês' no footer do p-datepicker. DESCARTADO da proposta original: mover Status para um disclosure 'Mais opções' condicionado ao contexto — cria formulário inconsistente entre aberturas e adiciona 1 clique ao caso comum de criar como Pendente (default é Planejada); ganho não justifica a variabilidade.
_Redução de esforço:_ criação de estrutural: 2 campos a menos para escanear/preencher; forms sem texto de dica permanente

### S10 — Aba Atividades acionável: 'Nova Atividade' via rota pré-preenchida existente e 'Ver todas' em nova guia [impacto medio]
Adicionar botão primário 'Nova Atividade' na aba que navega para /atividade/nova?demandaId=X — a rota JÁ existe e JÁ pré-carrega a demanda pelo query param (atividade-formulario.page.ts), então a implementação é 1 navegação; abrir em nova guia para não destruir o dialog. 'Ver Atividades' (hoje fecha o dialog e navega) passa a abrir /atividade?demandaId=X em nova guia — como não existe rota /demanda/:id que restaure o dialog, nova guia é a única forma real de 'não perder contexto'. Permissões ok: POST /atividade permite dev criar para si (com validação de acesso no service) e a aba só aparece para eMembro(). Observação: 'dev vê apenas as próprias atividades' é restrição do frontend atual (filtro usuarioId adicionado no cliente), não do backend — o backend permite dev membro ver todas as atividades da demanda; manter ou relaxar é decisão de produto, sem custo técnico.
_Redução de esforço:_ criar atividade a partir do detalhe: de ~5-6 passos (fechar dialog, navegar, Nova, re-selecionar demanda) para 1 clique com form pré-preenchido

### S11 — Unificar criar/editar (largura, sufixos, campos-base) + navegação interna com 'Voltar' em cache e correção do link de conexão [impacto medio]
Inconsistências confirmadas: criar = 560px com sufixo 'h' nas horas; editar = 600px SEM sufixo e com showButtons — unificar num único componente de formulário com os campos-base (nome, pai, status, previsão, horas, estrutural). REFORMULADO: não incluir Tags/Membros no modo edição — os endpoints são separados (PUT /:id/tag, POST/DELETE /:id/membro) e, com S1/S4/S6, essas edições passam a viver no cabeçalho do detalhe; duplicá-las no form seria redundante. 'Voltar' no breadcrumb do detalhe restaurando o estado anterior de um cache em memória (pilha das ~9-10 chamadas já feitas: demanda, ancestrais, árvore, tags, conexões, membros, atividades), invalidado a cada mutação. Correção de BUG real: o link de conexão usa routerLink ['/demanda', id], rota que NÃO existe (demanda.routes só tem path '' — o clique cai no wildcard e redireciona para fora da tela); trocar por navegação interna no próprio dialog (navegarParaSubDemanda já implementa o padrão).
_Redução de esforço:_ voltar após navegar para sub-demanda: de re-navegação completa (~9 requests + espera) para 1 clique instantâneo; link de conexão deixa de quebrar a navegação


## Ajustes de implementação apontados pelo verificador
1) Seção 3 — semântica 'Depende de' inexistente no domínio: SYSTEM.SPEC define demanda_conexao apenas como conexão dirigida (origem→destino) com eh_bidirecional, sem significado de dependência; trocar os tooltips '→ Esta demanda depende de…' / '← …depende desta' por textos direcionais neutros ('Conexão desta demanda para X' / 'Conexão de X para esta demanda' / 'Conexão bidirecional') e o toggle '→ Depende de | ↔ Bidirecional' por '→ Direcional | ↔ Bidirecional' — o toggle mapeia somente ehBidirecional (não existe criar conexão no sentido inverso a partir da demanda atual). 2) Seção 1.2 — célula EXECUTADO: DemandaRecuperadaDto não traz horas executadas; obter de minutosExecutados da RAIZ de GET /demanda/:id/arvore (já carregada no carregarTudo do detalhe — zero chamadas novas), formatado com TempoExibicaoPipe. 3) Seção 1.1 — texto do confirm de exclusão está factualmente errado: 'Sub-demandas e atividades deixarão de ser exibidas' não corresponde ao comportamento — o soft delete não cascateia (repository: executarSoftDelete(id) apenas); sub-demandas viram RAÍZES na árvore/grafo e atividades continuam listadas (JOIN de atividade sem filtro demanda.is_deleted). Usar texto fiel (ex.: 'As sub-demandas serão promovidas a demandas raiz e as atividades existentes serão mantidas') ou especificar cascata no backend como tarefa própria. 4) Dialog 2 — remover 'Esc cancela' da lista de melhorias: já é default do p-dialog em todos os dialogs de demanda. 5) Dialog 2 em modo edição — retirar Tags/Membros do formulário: endpoints separados (PUT /:id/tag; POST/DELETE /:id/membro) e redundantes com a edição inline do cabeçalho; 'Editar tudo' cobre apenas os campos do DemandaAlterarDto. 6) Seção 1.1 — gates de permissão a explicitar: edição inline (título, status, métricas, tags) gated por podeEditar/eMembro (backend permite dev membro; apenas descricaoCliente é gestor-only), lixeira e conexões (criar/excluir) são gestor-only, '+' de membros é gestor-only (GET /usuario é gestor-only), autocomplete de pessoas já deve excluir gestores (regra task 71 — filtro já existe no código). Considerar exibir 'Editar tudo' também para dev membro (backend permite; hoje o template restringe a gestor sem necessidade). 7) Seção 4 — remoção da tag 'Dev': ok como default, mas o backend não impede membro gestor via API; renderizar indicador apenas quando tipo !== DESENVOLVEDOR como fallback. 8) Seção 4 — 'Sair da demanda'/remover membro podem falhar com 400 'Não é possível remover o último membro da demanda'; prever esse toast de erro no fluxo com undo. 9) Seção 1.3 — 'Ver todas ↗ sem fechar o dialog': inviável na mesma guia (não existe rota /demanda/:id que restaure o dialog); especificar abertura em nova guia (target _blank). 10) Seção 1.2 — célula ESTIMADO click-to-edit deve respeitar a preferência dias/horas do VisualizacaoTempoService (conversão HORAS_POR_DIA), como o formulário atual. 11) Dialog 2 — 'Criar e adicionar outra' deve preservar o pai SELECIONADO no form no momento do submit, não o demandaPaiIdInicial do contexto. 12) Seção 1.4/aba Atividades — 'dev vê apenas as próprias' é filtro do frontend atual, não regra do backend (dev membro pode ver todas as atividades da demanda via GET /atividade?demandaId=X); a spec não deve citar isso como regra de negócio.

## Especificação do redesign
# Redesign — Dialogs de Demandas (criar, detalhe, conexões, membros)

> Contexto visual geral: todos os dialogs flutuam sobre a **página Demandas do projeto "Portal do Cliente"** (árvore de demandas à esquerda, grafo à direita), escurecida por um overlay `rgba(0,0,0,0.4)`. Tema Aura (primário azul #3B82F6), Tailwind, cantos 12px, sombra `0 20px 60px rgba(0,0,0,.3)`. Suporte a tema claro/escuro. Toasts em bottom-center.

---

## DIALOG 1 — "Detalhe da Demanda" (peça principal do mockup)

`p-dialog` 1100px (min(96vw, 1100px)), maximizável, sem footer (o X do header fecha; Esc fecha).

### 1.1 Header do dialog
- Linha 1 — breadcrumb compacto (12px, azul-600): `← Voltar  ·  Portal do Cliente › Área Logada` — cada ancestral clicável navega dentro do dialog; **"← Voltar" restaura a demanda anterior instantaneamente (cache)**. ①
- Linha 2 — identidade:
  - Ícone `pi-folder` cinza com tooltip "Demanda estrutural" (só quando estrutural).
  - **Título editável**: `Autenticação de Usuários` (20px, semibold) com ícone de lápis fantasma que aparece no hover; clique transforma em input inline, Enter salva, Esc cancela. ②
  - **Status como dropdown-tag**: tag azul `Planejada ▾` — 1 clique abre menu (Pendente / Planejada / Concluída / Cancelada), seleção salva na hora com toast "Status atualizado". ②
- Linha 3 — **chips de tags + membros no cabeçalho** (sem abrir aba nenhuma): ③
  - Tags: `● Backend` (azul), `● Urgente` (vermelho) + chip fantasma `+ Tag` que abre popover com TODOS os chips em modo toggle (clicou, salvou — sem dialog com Cancelar/Salvar).
  - Membros: pilha de avatares `AS` (Ana Souza), `BL` (Bruno Lima), `CM` (Carla Mendes) + botão circular `+` que abre autocomplete inline "Buscar pessoa…" (Enter adiciona). Hover no avatar mostra nome/cargo e X de remover (gestor).
- Canto direito do header (ações):
  - 3 botões-ícone com badge de preenchimento: `pi-code` **Descrição Técnica** (ponto azul quando preenchida), `pi-user` **Descrição Cliente**, `pi-book` **Documentação** — tooltips com o nome completo (sem labels truncadas).
  - Gestor: `Editar tudo` (outlined, abre o formulário completo — Dialog 2 em modo edição) e ícone lixeira (confirm: *"Excluir a demanda 'Autenticação de Usuários'? Sub-demandas e atividades deixarão de ser exibidas."* — sem a frase falsa "não pode ser desfeita").

### 1.2 Faixa de métricas (info-grid enxuto)
4 células click-to-edit (borda tracejada no hover indica editável): ②
| Rótulo | Valor exemplo | Interação |
|---|---|---|
| ESTIMADO | `24h` | clique vira inputnumber inline |
| EXECUTADO | `9h 30min` | somente leitura (soma das atividades) |
| PREVISÃO DE TÉRMINO | `28/08/2026` ou `— definir` | clique abre datepicker com atalhos `+1 sem · +2 sem · fim do mês` |
| SUB-DEMANDAS | `3 (2 concluídas)` | clique ativa a aba Sub-demandas |
*(Status e "Estrutural" saem do grid — já estão no cabeçalho.)*

### 1.3 Abas (só listas pesadas)
`p-tabs`: **Sub-demandas** (se estrutural) · **Atividades** (se membro) · **Conexões**. Tags e Membros foram promovidos ao cabeçalho. ③

**Aba Sub-demandas** — árvore igual à atual (itens: nome, tag de status, horas, tags coloridas), com botão primário pequeno `+ Nova Sub-demanda` fixo no topo direito da aba (não duplicado no rodapé). Empty state: ícone `pi-sitemap` + "Nenhuma sub-demanda ainda" + botão `+ Nova Sub-demanda`.

**Aba Atividades** — header: `4 atividades` + botões `+ Nova Atividade` (primário, pré-preenchida com esta demanda) e `Ver todas ↗` (abre /atividade?demandaId=42 **sem fechar o dialog**). ④ Lista de cards: nome ("Implementar refresh token"), tag de status (`Em execução` verde), avatar+nome do executor (Bruno Lima), tempo (`pi-clock 3h 15min`). Empty state: "Nenhuma atividade nesta demanda" + botão `+ Nova Atividade`.

**Aba Conexões** — ver seção 3 abaixo.

### 1.4 Estados do Dialog 1
- **Carregando**: skeleton (título fantasma + 4 blocos de métrica + 3 linhas de lista), não spinner que esvazia tudo.
- **Vazio** (demanda recém-criada, não-estrutural): faixa de métricas + aba Atividades com empty acionável.
- **Com dados**: como descrito.
- **Dev não-membro**: cabeçalho sem lápis/ dropdown de status (somente leitura), membros com botão `Participar` no lugar do `+`, sem aba Atividades (cai em Conexões).

---

## DIALOG 2 — "Nova Demanda" (mesmo componente para edição: "Editar Demanda")

`p-dialog` 600px, mesma largura nos dois modos. Autofocus no Nome; **Enter submete**; Esc cancela. ⑤

Campos (de cima para baixo):
1. **Nome*** — input, placeholder "Ex.: Recuperação de senha por e-mail". Foco automático. Dica de caracteres proibidos só aparece se o erro ocorrer.
2. **Demanda Pai** — select com busca, opções com caminho: `Portal do Cliente › Área Logada`, `Portal do Cliente › Onboarding`; placeholder "Nenhuma (raiz)"; pré-preenchida quando aberta de contexto (sub-demanda / botão da árvore).
3. Linha tripla: **Status** (select, default `Planejada`) · **Previsão de Término** (datepicker `dd/mm/aaaa` com atalhos `+1 sem · +2 sem · fim do mês`) · **Horas Estimadas*** (inputnumber `16h`, sufixo `h` nos dois modos).
4. `☐ Demanda estrutural (agrupa sub-demandas)` — **ao marcar, a linha 3 esconde Horas e Previsão** (estruturais agregam filhos). ⑥
5. *(gestor)* **Membros** — multiselect com busca: chips `Ana Souza ×`, `Bruno Lima ×`.
6. *(gestor)* **Tags** — chips-toggle coloridos: `✓ Backend` (ativo, fundo azul), `● Frontend`, `● Urgente`, `● API`.

Footer:
- `Cancelar` (outlined) · `Criar e adicionar outra` (text, mantém o dialog com o mesmo pai e foco no Nome) · **`Criar Demanda`** (primário — **fecha o dialog** após sucesso + toast "Demanda criada"). ⑤
- Em modo edição o footer é `Cancelar · Salvar` e inclui Tags/Membros (gestor) — mesmíssimo formulário, sem divergências.

Estados: normal · salvando (spinner no primário, campos desabilitados) · erro de validação (borda vermelha + mensagem só no campo violado).

---

## SEÇÃO 3 — Painel "Conexões" (aba do Dialog 1)

Header da aba: `CONEXÕES  (3)`.

**Linha de criação inline no topo** (gestor) — sem dialog: ⑦
`[🔍 Buscar demanda…  ▾]  [→ Depende de | ↔ Bidirecional]  [Adicionar]`
- Autocomplete com filtro digitável (resolve as 200 opções sem busca de hoje); toggle de direção em 2 botões; `Adicionar` desabilitado até selecionar destino; Enter confirma. Erro de ciclo do backend aparece como mensagem inline vermelha: "Esta conexão criaria um ciclo no grafo".

**Lista** — cada item:
- Círculo de direção com **tooltip textual**: → azul "Esta demanda depende de…", ← verde "…depende desta demanda", ↔ roxo "Conexão bidirecional".
- Nome-link (`Cadastro de Clientes`, `Emissão de Notas`) que **abre a demanda dentro do próprio dialog de detalhe** (com "← Voltar"), em vez de trocar a rota por baixo.
- Lixeira (gestor): remove na hora + toast `Conexão removida · Desfazer` (sem confirm modal). ⑧

Empty state: ícone `pi-share-alt` + "Nenhuma conexão" + botão `+ Adicionar conexão` (foca a linha inline).

---

## SEÇÃO 4 — Membros (agora no cabeçalho do Dialog 1)

- Pilha de avatares com iniciais coloridas: `AS` Ana Souza — Desenvolvedora Sênior, `BL` Bruno Lima — Desenvolvedor Pleno, `CM` Carla Mendes — Analista de Requisitos. Sem tag "Dev" repetida (todos os membros são devs por regra).
- Gestor: botão `+` → autocomplete "Buscar pessoa…" (lista já filtra gestores fora); Enter adiciona com POST individual e toast. Hover no avatar → popover com nome/cargo + `Remover` (executa na hora + toast `Ana Souza removida · Desfazer`). ⑧
- Dev não-membro: botão `Participar` no lugar do `+`; dev membro: seu avatar tem `Sair da demanda` no popover (toast + Desfazer, sem confirm).
- Empty state (no popover/aba reduzida): "Nenhum membro atribuído" + `+ Adicionar pessoa` (gestor) ou `Participar desta demanda` (dev).

---

## Callouts numerados para o mockup

- **① Voltar instantâneo** — breadcrumb com "← Voltar" e navegação interna sem recarregar (antes: 8 requests e sem histórico).
- **② Edição inline no ponto de decisão** — status-dropdown no tag, título com lápis, métricas click-to-edit: marcar "Concluída" cai de 5 para 2 cliques.
- **③ Tags e membros promovidos ao cabeçalho** — visíveis sem clique e editáveis via popover-toggle, eliminando 2 abas e 2 dialogs intermediários (tags: 5 → 2 cliques).
- **④ Atividades acionáveis** — botão "+ Nova Atividade" pré-preenchido e "Ver todas ↗" sem fechar o dialog (antes: fechar, navegar e filtrar manualmente).
- **⑤ Criar sem fricção** — autofocus + Enter submete + "Criar Demanda" fecha e "Criar e adicionar outra" explícito (criação simples: 4 → 1 clique).
- **⑥ Formulário adaptativo** — marcar "estrutural" esconde Horas/Previsão; dica de caracteres só no erro.
- **⑦ Conexão inline com busca** — autocomplete + toggle de direção no lugar do dialog com select de 200 itens sem filtro (7 → 3 cliques).
- **⑧ Undo no lugar de confirm** — remoções de membro/conexão imediatas com toast "Desfazer" (soft delete garante reversibilidade).
