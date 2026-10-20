# Demandas — página principal (árvore de demandas, painel de planejamento, grafo de conexões) (/demanda)

> ✅ Sugestões verificadas adversarialmente contra o código e as regras de negócio.

## Fluxos atuais
- **Abrir a tela e ver as demandas de um projeto (freq. diária)** (3 cliques): Clicar em 'Demandas' na topbar → clicar no select de projeto → escolher o projeto na lista. Nenhum projeto default: o último usado não é lembrado (só via queryParam se veio de link), e mesmo com um único projeto disponível não há auto-seleção.
- **Trocar o status de uma demanda no modo Lista (gestor, freq. alta)** (5 cliques): Botão-direito na linha → 'Editar' → dialog de edição abre → clicar no select de Status → escolher opção → clicar 'Salvar'. (No modo Planejamento a mesma tarefa custa 2 cliques: chip → opção.)
- **Ver o detalhe de uma demanda pela Lista** (2 cliques): Botão-direito na linha → 'Visualizar'. Clique simples na linha só expande/colapsa (inconsistente com o Grafo, onde 1 clique no nó abre o detalhe).
- **Criar demanda raiz (gestor)** (5 cliques): Clicar 'Nova Demanda' → clicar no campo Nome (sem autofocus) → digitar → ajustar campos desejados → clicar 'Criar Demanda' → dialog fica aberto sem aviso → clicar X/Cancelar para fechar.
- **Criar sub-demanda de uma estrutural** (6 cliques): Botão-direito na demanda estrutural → 'Nova Sub-demanda' → campo Nome (sem autofocus) → digitar → 'Criar Demanda' → fechar dialog manualmente. Pai vem pré-preenchido (bom).
- **Editar tags de uma demanda (gestor)** (4 cliques): Botão-direito → 'Tags' → aguardar carregamento → alternar 1+ chips → 'Salvar'.
- **Localizar uma demanda específica numa árvore com 3 níveis** (4 cliques): Sem busca ou filtro: expandir manualmente cada nó estrutural do caminho (1 clique por nível) e escanear visualmente. Se qualquer alteração for feita, a árvore colapsa toda e o processo recomeça.
- **Ver quem está executando agora no projeto (gestor)** (1 cliques): Clicar no modo 'Planejamento' (informação não existe na Lista nem no Grafo).
- **Editar a descrição técnica de uma demanda** (3 cliques): Botão-direito → 'Desc. Técnica' → aguardar GET da demanda → editar no editor → 'Salvar'.
- **Filtrar o grafo por status (ex.: esconder concluídas)** (0 cliques): Impossível hoje: o componente do grafo aceita filtroStatus, mas não há nenhum controle na UI.

## Problemas
- [ALTA] P01: Todas as ações da Lista estão escondidas atrás de context menu (botão-direito), sem nenhum affordance visível — nem ícones no hover, nem botão '⋯'. Usuário novo não descobre Editar/Tags/Membros/Descrições; inviável em touch.
- [ALTA] P02: Clique simples na linha da árvore expande/colapsa em vez de abrir o detalhe — inconsistente com o Grafo (1 clique no nó abre detalhe) e contraria a expectativa de listas (clique = abrir).
- [ALTA] P03: Não há busca textual nem filtros (status, tag) em nenhum modo. O filtro de status do grafo existe no código (@Input filtroStatus) mas nunca ganhou UI. Localizar demanda exige expandir e escanear.
- [ALTA] P04: Troca rápida de status (chip → popover, 2 cliques) existe só no Planejamento; na Lista a mesma ação custa 5 cliques via dialog de edição completo. Padrão bom não reaproveitado onde o usuário mais está.
- [ALTA] P05: A árvore perde todo o estado de expansão após qualquer alteração (recarga integral do grafo reconstrói os itens e os signals 'expandido' resetam). Usuário mexe numa demanda profunda e tem que reexpandir tudo.
- [MEDIA] P06: Último projeto usado não é lembrado (só queryParam); com um único projeto disponível não há auto-seleção. Toda visita começa com 2 cliques extras de seleção.
- [MEDIA] P07: Empty state 'Nenhuma demanda encontrada' não tem ação (sem botão 'Nova Demanda') e aparece indevidamente também quando nenhum projeto foi selecionado — mensagem enganosa nesse caso.
- [MEDIA] P08: Dialog Nova Demanda: sem autofocus no Nome, sem submit com Enter, e após criar o dialog permanece aberto silenciosamente (form resetado) — parece bug; não existe distinção 'Criar' × 'Criar e adicionar outra'.
- [MEDIA] P09: Formulário de criação mostra tudo de uma vez (pai, status, previsão, horas, membros, tags, estrutural) + dica de caracteres proibidos permanente — sem disclosure progressivo; o caminho feliz (nome + horas) fica poluído.
- [MEDIA] P10: Grafo e fundo da página usam cores dark hardcoded (#0d1117, #b0bec5, #4a9eff) — quebram o tema claro e destoam do padrão Aura/tokens usado no resto do app.
- [MEDIA] P11: Painel de Legenda ocupa 240px permanentes (aberto por default) para conteúdo estático de consulta rara; além disso a legenda é só informativa quando poderia ser filtro clicável por status.
- [MEDIA] P12: No Grafo, os dados do nó (status, estimado, executado, tags) só aparecem em tooltip nativo <title> — com delay do navegador, sem formatação e sem ações; nenhum caminho para editar direto do grafo além de abrir o detalhe.
- [MEDIA] P13: Modo de visualização não persiste (nem em URL nem em preferência): refresh ou retorno à tela sempre volta para Lista; F5 no Planejamento perde o contexto.
- [MEDIA] P14: Feedback não otimista: cada mudança dispara toast + recarga completa do grafo/planejamento (tela 'pisca', árvore colapsa — ver P05); exclusão usa confirm dialog em vez de undo.
- [BAIXA] P15: Toggle Grafo/Lista/Planejamento são 3 botões independentes (não um segmented control real); estados outlined/text pouco contrastantes entre si dificultam saber qual modo está ativo.
- [BAIXA] P16: Botão de seta-esquerda com tooltip 'Abrir projeto' tem aparência de 'voltar' de navegação — affordance ambígua para uma ação de ir ao detalhe do projeto.
- [BAIXA] P17: Nenhum atalho de teclado: sem 'N' para nova demanda, '/' para busca, setas para navegar/expandir árvore, Esc já fecha dialogs (PrimeNG) mas Enter não confirma.
- [BAIXA] P18: Sem ações em massa: não dá para selecionar várias demandas e trocar status/tag/membros de uma vez, apesar de listas potencialmente grandes.
- [BAIXA] P19: Dialog de detalhe repete o Status duas vezes (chip no cabeçalho + campo no grid de metadados) e o botão 'Nova Demanda' some no modo Grafo/Planejamento para gestor? (segue visível, ok) — mas 'Executando agora' e progresso não existem na Lista, forçando troca de modo para ver o dado mais operacional.
- [BAIXA] P20: No Planejamento o chip de status clicável não parece clicável (sem borda/ícone de dropdown) — o recurso de 2 cliques mais eficiente da tela é invisível sem tooltip.

## Sugestões aprovadas na verificação
### S01 — Clique na linha abre detalhe + ações inline no hover (com correções de permissão) [impacto alto]
Validado: hoje o clique na linha só expande/recolhe e TODAS as ações vivem escondidas no botão-direito (context menu). Aprovado: clique na linha/nome abre o dialog de Detalhe (consistente com o Grafo, onde clique no nó já abre); chevron vira o único alvo de expansão com hitbox ampliada (hoje ele só existe quando há filhos — manter assim). No hover: botão '+' Nova sub-demanda em estruturais VISÍVEL PARA TODOS os perfis (correção: o backend permite dev criar sub-demanda em projeto que acessa — POST /demanda só proíbe dev criar raiz — e o context menu atual já exibe a opção sem gate de gestor) e menu '⋯' reaproveitando construirMenuDemanda (Visualizar, Editar*, Tags*, Membros*, Descrições p/ todos; * = gestor-only, como no factory atual). Adicionar 'Excluir' ao '⋯' apenas para gestor (DELETE /demanda/:id é @GestorOnly) MANTENDO o ConfirmDialog — não há endpoint de restauração, então undo é inviável para exclusão. Botão-direito continua como atalho (mesmo menu). O chip de status clicável fica descrito em S02.
_Redução de esforço:_ Ver detalhe: de 2 interações com mira (botão-direito + Visualizar) para 1 clique; ações deixam de ser 100% invisíveis (hoje nada indica que o botão-direito funciona); criar sub-demanda passa a ter alvo visível para gestor E dev

### S02 — Chip de status com popover reutilizado da tabela de Planejamento + atualização otimista [impacto alto]
Validado: o popover de troca rápida JÁ existe, mas só no Planejamento (gestor-only por natureza — endpoint @GestorOnly), e hoje cada troca dispara recarga dupla (grafo inteiro + planejamento), com o grafo D3 destruído e recriado (posições resetam). Aprovado: extrair o popover para componente compartilhado e usá-lo (1) na linha da árvore e (2) no card/nó do Grafo — nesses dois lugares CLICÁVEL SÓ PARA GESTOR, pois DemandaArvoreItemDto/DemandaGrafoNoDto não trazem podeEditar e o front não sabe se o dev é membro (dev vê chip estático); (3) no cabeçalho do dialog de Detalhe habilitado para gestor E dev-membro via DemandaRecuperadaDto.podeEditar — o backend permite membro alterar status (PUT /demanda/:id só restringe descricaoCliente a gestor). Atualização otimista: trocar o chip imediatamente, PUT em background, reverter com toast de erro; no grafo, atualizar cor/estado do nó in-place via d3 select em vez de recriar a simulação. Toast 'Status alterado — Desfazer' (undo = PUT com o status anterior; requer template custom no p-toast global bottom-center, que hoje é padrão sem botão).
_Redução de esforço:_ Na Lista: troca de status de ~5 interações (botão-direito → Editar → abrir select → escolher → Salvar) para 2 cliques; no Planejamento (onde já eram 2) elimina as 2 recargas e a perda de posições do grafo

### S03 — Toolbar de busca client-side, chips de status com contador, filtro por tags e expandir/recolher tudo [impacto alto]
Validado: não existe busca nem filtro algum na tela; o grafo carrega TODOS os nós do projeto de uma vez (sem paginação), então filtrar client-side é viável; os nós já trazem tags e status (DemandaGrafoNoDto). O @Input filtroStatus do grafo existe e está OCIOSO (a página nunca o passa) — aproveitá-lo exige correção: ngOnChanges do DemandaGrafoComponent só reage a mudanças de 'grafo', precisa reagir também a 'filtroStatus'. Aprovado: campo de busca com destaque do termo e auto-expansão dos ramos com match; chips-contador por status (toggle) valendo para Lista e Grafo; multiselect de tags; 'Expandir tudo/Recolher tudo' no modo Lista — este último exige elevar o estado de expansão (hoje signal local de cada demanda-arvore-item) para um Set<id> no painel, refactor que também habilita S04 e S10. Atalho '/' foca a busca. Filtros persistem ao alternar modos (estado na página).
_Redução de esforço:_ Localizar demanda em árvore colapsada: de expandir N ramos manualmente + varredura visual para '/' + digitar; filtrar o grafo por status: de impossível para 1 clique

### S04 — Defaults de contexto (projeto lembrado, modo na URL) + expansão persistida entre visitas [impacto alto]
Validado com correções: o projetoId JÁ persiste na URL hoje (selecionarProjeto grava query param e o init o lê) — o que falta e fica aprovado: (1) lembrar o último projeto em localStorage e usá-lo quando a rota abrir SEM query (caso típico: clique em 'Demandas' na topbar); (2) auto-selecionar quando o usuário só tem 1 projeto (relevante para dev, que só vê projetos onde tem demanda_usuario); (3) persistir o modo em ?modo= e como preferência ('planejamento' só aplicável a gestor — fallback para lista se dev). Sobre expansão, CORREÇÃO do claim original: após alterações a árvore JÁ preserva a expansão (recarregarGrafo não desmonta o painel e os @for usam track por id, mantendo os signals locais) — o ganho real é persistir o conjunto de IDs expandidos por projeto (sessionStorage) para sobreviver à troca de projeto (carregarGrafo desmonta tudo via carregando=true) e ao reload da página.
_Redução de esforço:_ Abrir a tela pronta para trabalhar: elimina 2 interações de seleção de projeto em toda visita vinda da topbar + reexpansão após troca de projeto/reload; claim original de '4-8 cliques por edição' estava incorreto (já preservado)

### S05 — Dialog Nova Demanda enxuto: autofocus, Enter cria, 'Criar e adicionar outra' explícito, 'Mais opções' colapsado [impacto alto]
Validado: hoje não há autofocus nem submit por Enter (botões só com onClick); a dica de caracteres proibidos fica SEMPRE visível (mesmo com a diretiva que já bloqueia a digitação); e o dialog NÃO fecha ao criar — reseta o form e permanece aberto (criação em série implícita e surpreendente no caso comum). Aprovado: autofocus no Nome; Enter = Criar; dica de caracteres só quando o bloqueio/erro de pattern ocorrer (ex.: colar texto); visíveis por padrão Nome, Demanda Pai (pré-preenchida quando aberto via '+' — comportamento demandaPaiIdInicial já existente), Estimativa (sufixo h/dia(s) conforme preferência já implementada) e checkbox Estrutural; 'Mais opções' colapsado com Status (default PLANEJADA — já é o default do form atual), Previsão, Membros e Tags (estes dois já são gestor-only no form). Footer: Cancelar · 'Criar e adicionar outra' (mantém aberto, foco volta ao Nome — formaliza o comportamento atual) · 'Criar Demanda' (primário, FECHA). CORREÇÃO de permissão: quando quem abre é dev (via Nova Sub-demanda), o campo Demanda Pai é OBRIGATÓRIO e não pode ficar vazio — o backend rejeita dev criando demanda raiz.
_Redução de esforço:_ Criação única: de ~5 interações (clicar botão → clicar campo → digitar → clicar Criar → clicar X para fechar, já que hoje não fecha) para 2 (digitar → Enter); formulário de 8 campos visíveis para 4

### S06 — Empty states distintos e acionáveis (sem projeto / projeto vazio / busca sem resultado) [impacto medio]
Validado: hoje 'Nenhuma demanda encontrada' aparece MESMO SEM projeto selecionado (o template só checa arvoreRaizes().length === 0 / grafo() null, nos modos Lista e Grafo) — leitura enganosa confirmada. Aprovado: (1) sem projeto: 'Selecione um projeto para ver as demandas' + botão que foca/abre o p-select do header; (2) projeto sem demandas: CTA central 'Nova Demanda' para GESTOR e texto informativo para DEV — correto com o backend, pois dev não pode criar demanda raiz (só sub-demandas), então não há CTA possível para dev num projeto vazio; (3) busca/filtros sem resultado (depende de S03): 'Nenhuma demanda para "x"' + botão 'Limpar filtros'.
_Redução de esforço:_ Primeira demanda do projeto: CTA central óbvio em 1 clique (hoje o botão fica no canto do header); elimina a interpretação errada do vazio atual — que hoje afirma não haver demandas quando nenhum projeto foi escolhido

### S07 — Legenda vira popover-filtro e tooltip nativo do grafo vira hover-card rico [impacto medio]
Validado: o painel lateral fixo tem exatamente 240px (page.scss) e só contém legenda estática; o tooltip do nó é <title> nativo do SVG (delay do browser, sem formatação, já contém nome/status/horas/tags). Aprovado: remover o painel; legenda em popover ancorado no botão 'i', com cada status clicável ligando/desligando o mesmo filtroStatus da toolbar (S03); hover-card HTML posicionado no mouseover do nó com nome completo, chip de status, estimado × executado com percentual e tags — todos os dados já estão em DemandaGrafoNoDto. CORREÇÃO do claim: clique no nó abrir o Detalhe JÁ EXISTE hoje (demandaSelecionada → painel.abrirDetalhe) — não é ganho novo. Botões de zoom +/−/centralizar são adição fina sobre o d3.zoom já existente.
_Redução de esforço:_ +240px de área útil de grafo; dados do nó em hover imediato e legível em vez do delay do tooltip nativo; legenda passa de decorativa a filtro em 1 clique

### S08 — Tokens de tema no grafo, no fundo da página e nas cores dos nós [impacto baixo]
Validado: .demanda-projeto tem background #0d1117 FIXO (a página inteira fica escura mesmo no tema claro — quebra real, não detalhe), o SVG do grafo hardcoda #0d1117/#1a2332/#4a9eff/#b0bec5/#4a5568/#e6edf3 e demanda-cores.constants.ts define paleta exclusivamente dark para preenchimento/borda dos nós. Aprovado com notas técnicas: usar --app-surface-*/--p-primary-* no SCSS; para o SVG, aplicar cores via classes CSS ou .style() do d3 (custom properties não são confiáveis em .attr() de atributos SVG); as constantes de cor dos nós precisam de variante clara/escura (tokens ou leitura via getComputedStyle). Impacto rebaixado de 'medio' para 'baixo': é consistência visual (critério 10) sem redução de cliques — aprovável nesse enquadramento.
_Redução de esforço:_ Zero cliques; corrige o corpo da página permanentemente escuro no tema claro e alinha o grafo ao tema do restante do app

### S09 — Mini-barra de progresso com escala de risco na linha da árvore [impacto medio]
Validado com correções: horasEstimadas e minutosExecutados JÁ existem em DemandaArvoreItemDto/DemandaGrafoNoDto e JÁ são exibidos na Lista — como dois textos separados ('16h est.' / '12h exec.') sem percentual, cor ou indicação de estouro. O ganho real é a leitura de risco, não o dado em si. Aprovado: substituir os textos pela mini-barra compacta reutilizando a lógica de cor do Planejamento (corParaPercentual: azul→amarelo→laranja→vermelho) + rótulo '12h / 16h' + ⚠ quando estourou. CORREÇÃO IMPORTANTE: minutosExecutados vem só das atividades DIRETAS da demanda (SQL: WHERE atividade.demanda_id = demanda.id, sem rollup recursivo) — a barra de uma estrutural mostra o próprio esforço, NÃO o agregado da subárvore; exibir valores próprios (mesma semântica do Planejamento). Executores ativos: existem apenas em DemandaPlanejamentoDto, cujo endpoint é @GestorOnly — v1 SEM a bolinha na Lista; v2 opcional carregando o planejamento em paralelo só para gestor.
_Redução de esforço:_ Gestor e dev leem risco (%, cor, estouro) direto na Lista sem alternar para o Planejamento; claim original corrigido: os números crus já estavam na Lista — o que se elimina é a troca de modo para avaliar risco

### S10 — Atalhos de teclado com guardas de contexto [impacto baixo]
Validado: nenhum atalho existe na tela; Esc fechar dialogs já é nativo do p-dialog (closeOnEscape). Aprovado: 'N' abre Nova Demanda APENAS para gestor com projeto selecionado (mesmas condições do botão) e ignorado quando o foco está em input ou há dialog aberto; '/' foca a busca (S03); ↑↓ navegam os itens visíveis, → expande / ← recolhe (requer o estado de expansão centralizado de S03 e roving tabindex), Enter abre o detalhe do item focado. Tooltip '?' com a legenda de atalhos.
_Redução de esforço:_ Usuário frequente opera a árvore sem mouse; nova demanda de 1 clique com mira para 1 tecla

### S11 — p-selectbutton para os modos + desambiguar o botão de projeto [impacto baixo]
Validado: o toggle atual são 3 p-buttons (ordem Grafo | Lista | Planejamento) cujo estado ativo é só a ausência de outlined/text — contraste fraco confirmado; o botão pi-arrow-left com tooltip 'Abrir projeto' parece um 'voltar' (ambiguidade real). Aprovado: p-selectbutton (componente PrimeNG disponível; nota: não é usado em nenhuma outra tela ainda, então o argumento é affordance, não consistência) na ordem Lista | Grafo | Planejamento — Planejamento continua renderizado só para gestor, como hoje; trocar o ícone para pi-external-link com label curto. Manter a lógica alternarModo existente.
_Redução de esforço:_ Elimina cliques desperdiçados por não perceber o modo ativo e a interpretação do botão de seta como 'voltar'


## Ajustes de implementação apontados pelo verificador
1) Barra de progresso (seções 3 e 5): minutosExecutados/horasEstimadas de uma demanda estrutural referem-se SÓ às atividades diretas dela (SQL do grafo/planejamento não faz rollup recursivo) — o exemplo '[▓▓▓ 22h30/40h]' na linha da pasta 'Autenticação e Acesso' sugere agregado da subárvore, o que o dado não representa; exibir valores próprios (mesma semântica do Planejamento) ou remover a barra de estruturais sem estimativa própria. 2) Chip de status (seções 3 e 8-②): 'gestor-only, dev chip estático' está correto na Lista e no Grafo (DTOs sem podeEditar), mas no dialog de Detalhe o chip deve ser clicável também para dev-membro usando DemandaRecuperadaDto.podeEditar — o backend permite membro alterar status. 3) Ações da linha (seção 3, item 7): o '+' Nova sub-demanda NÃO é gestor-only — dev pode criar sub-demanda (backend só proíbe dev criar demanda raiz; o context menu atual já exibe a opção para dev); no menu '⋯', marcar como gestor-only apenas Editar, Tags, Membros e Excluir. 4) Excluir: DELETE é gestor-only e NÃO há endpoint de restauração — o padrão 'toast com Desfazer' (seção 7) não pode se aplicar à exclusão; manter dialog de confirmação para Excluir e restringir o Desfazer a status e tags (reversíveis via PUT). 5) Toast com 'Desfazer': o p-toast global (bottom-center) usa template padrão sem botão de ação — prever template customizado. 6) Grafo: o @Input filtroStatus existe mas o componente não reage a mudanças dele (ngOnChanges só observa 'grafo') — especificar que o filtro deve ser reativo; e a atualização otimista de status exige atualizar o nó in-place, pois hoje qualquer recarga recria a simulação e reseta as posições. 7) Persistência (seção 1-④): a URL JÁ persiste projetoId hoje — o novo é ?modo=, o localStorage do último projeto (para rotas abertas sem query) e a auto-seleção com projeto único; e a expansão da árvore JÁ sobrevive a alterações (recarga in-place com track por id) — a persistência proposta vale para troca de projeto e reload, não 'após qualquer alteração' como implícito na seção 3. 8) Dialog Nova Demanda (seção 6): quando aberto por desenvolvedor (via '+'), o campo Demanda Pai é obrigatório — o backend rejeita dev criando raiz; a spec deve registrar essa validação condicionalmente por perfil. 9) Seção 4 (Grafo): 'clique abre o Detalhe' já é o comportamento atual — manter no desenho, mas não contabilizar como ganho no callout ⑥. 10) Cores por tokens (seção 4): incluir demanda-cores.constants.ts na migração (paleta clara/escura para preenchimento/borda dos nós) e aplicar cores no SVG via classes CSS ou style() do d3, não via attr() com var().

## Especificação do redesign
# Redesign — Demandas do Projeto (/demanda)

Tela de trabalho densa (desktop-first), tema claro/escuro via tokens (PrimeNG Aura, primário azul). Persona dos exemplos: gestora **Marina Castro** logada; projeto em contexto **"Portal do Cliente"**; devs **Ana Souza**, **Bruno Lima**, **Carla Mendes**.

---

## 1. Header da página (56px, surface-0, borda inferior 1px)

Linha única, 3 grupos:

**Esquerda:**
- Seletor de projeto: `p-select` largo (260px) com label flutuante embutida "Projeto", valor atual **"Portal do Cliente"**. Ao lado, botão-ícone `pi-external-link` (tooltip "Abrir página do projeto"). ④ O último projeto usado é pré-selecionado automaticamente (localStorage); com um único projeto disponível, auto-seleciona.
- Segmented control (p-selectbutton): **Lista | Grafo | Planejamento** — ativo com fundo primário sólido (ex.: "Lista" ativo). "Planejamento" só para gestor. Modo persiste na URL: `/demanda?projetoId=4&modo=lista`.

**Direita:**
- Botão-ícone `pi-question-circle` (tooltip "Atalhos: N nova demanda · / busca · ↑↓→← navegar").
- Botão primário **"Nova Demanda"** (`pi-plus`), gestor-only. Atalho **N**.

## 2. Toolbar de busca e filtros ① (48px, abaixo do header, surface-0)

- Campo de busca (320px, ícone `pi-search`): placeholder **"Buscar demanda…  ( / )"**. Filtra client-side em tempo real; na Lista auto-expande os ramos com resultado e destaca o termo em amarelo; no Grafo esmaece nós sem match.
- Chips-contador de status, clicáveis (toggle multi): `Pendente 3` (cinza) · `Planejada 5` (azul) · `Concluída 2` (verde) · `Cancelada 1` (vermelho). Ativo = preenchido; inativo = outline. Filtram Lista E Grafo (usa o filtroStatus já existente).
- Multiselect compacto **"Tags"** (opções ex.: Backend, Frontend, UX, Integração — com bolinha colorida).
- À direita: botões-texto **"Expandir tudo"** / **"Recolher tudo"** (só no modo Lista).
- Estado dos filtros persiste enquanto navega entre modos.

## 3. Corpo — modo Lista (árvore) ②③

Fundo surface-50, cartão branco/surface-0 com raio 8px contendo a árvore. Cada linha (40px, hover realça):

```
[›] 📁 Autenticação e Acesso                    [▓▓▓▓▓▓░░░ 22h30/40h]  [Planejada ▾]   (+) (⋯)
      [›]  Implementar login com e-mail e senha  ⦿Backend  [▓▓▓▓▓▓▓░ 12h/16h]  [Planejada ▾]  (⋯)
      [ ]  Recuperação de senha                  ⦿Backend  [░░░░░░░░ 0h/8h]    [Pendente ▾]   (⋯)
      [ ]  Tela de login responsiva  ● Ana Souza ⦿Frontend [▓▓▓▓▓▓▓▓ 10h30/12h] [Planejada ▾] (⋯)
[›] 📁 Área do Cliente                           [░░░ 0h/64h]           [Pendente ▾]    (+) (⋯)
[ ]  Integração com gateway de pagamento ⦿Integração [▓▓▓▓▓▓▓▓▓ 26h10/24h ⚠] [Planejada ▾] (⋯)
```

Anatomia da linha, esquerda → direita:
1. **Chevron** `pi-chevron-right` (rotaciona 90° expandido) — ÚNICO alvo de expandir/recolher, hitbox 32px. ③
2. Ícone `pi-folder` se estrutural.
3. **Nome** (clique em nome/linha abre o dialog de Detalhe — 1 clique). ③
4. Chips de tag pequenos (bolinha + nome, cor da tag).
5. **Mini-barra de progresso** (96px) com a escala de cor do Planejamento (azul→amarelo→laranja→vermelho) + rótulo `12h / 16h`; `⚠` vermelho quando estourou; tooltip com percentual e "restam Xh". (Dados: horasEstimadas × minutosExecutados do nó.)
6. **Chip de status clicável** com caret `▾` ② — abre popover com as 4 opções (Pendente/Planejada/Concluída/Cancelada, check na atual). Troca é **otimista**: chip muda na hora, toast bottom-center "Status alterado — Desfazer". Gestor-only; para dev, chip estático sem caret.
7. Ações no hover (fora do hover ficam invisíveis): **`+`** "Nova sub-demanda" (só estruturais) e **`⋯`** menu (Visualizar, Editar*, Tags*, Membros*, ─, Desc. Técnica, Desc. Cliente, Documentação, ─, Excluir* — * = gestor; ícones de descrição com glow azul quando preenchidas). Botão-direito na linha abre o mesmo menu.
8. Bolinha pulsante `●` + nome quando alguém executa agora (visível para gestor com dados do planejamento carregados).

Estado de expansão é preservado após qualquer alteração (recarga reaplica os IDs expandidos). ②

Navegação por teclado: ↑↓ move foco, → expande, ← recolhe, Enter abre detalhe.

## 4. Corpo — modo Grafo ⑥

- Canvas SVG ocupando toda a área (sem painel lateral fixo), fundo `--app-surface-50` com pontilhado sutil — segue tema claro/escuro.
- Nós: círculos por status (mesmas cores dos chips); estrutural = maior + borda tracejada; canceladas com 40% opacidade. Rótulo abaixo, truncado.
- **Hover** em nó: card flutuante estilizado (substitui o tooltip nativo): nome completo, chip de status, `12h / 16h est. (75%)`, tags. Some no mouseout; **clique** abre o Detalhe (1 clique, igual à Lista).
- Filtros da toolbar (status/tags/busca) atuam no grafo: nós fora do filtro somem, arestas órfãs também.
- Canto inferior-direito: botão flutuante `pi-info-circle` abre **popover de Legenda** (não painel): lista de status (cada item clicável = liga/desliga o filtro daquele status ⑥), nó comum × estrutural, aresta hierarquia (azul sólida →) × conexão (cinza tracejada). Canto inferior-esquerdo: controles de zoom `+ / − / ⌂ centralizar`.

## 5. Corpo — modo Planejamento (gestor)

Mantém a tabela atual com melhorias pontuais:
- Chip de status ganha caret `▾` explícito (affordance do popover — já existia, ficava invisível). ②
- Coluna "Demanda": caminho com últimos 2 níveis em negrito, ancestrais esmaecidos ("Autenticação e Acesso › **Tela de login responsiva**"); clique na célula abre o Detalhe.
- Coluna "Executando agora": `● Ana Souza` com pulso (como hoje).
- Linhas respondem à busca/filtros da toolbar ①.
- Exemplo de linhas: "Tela de login responsiva — Planejada — 10h30 / 12h est. (88%) · restam 1h30 — barra amarela — ● Ana Souza"; "Integração com gateway de pagamento — Planejada — 26h10 / 24h est. (109%) — barra vermelha — tag Estourou ⚠ — —".

## 6. Dialog "Nova Demanda" ⑤ (560px, sobre a página com overlay escurecido rgba(0,0,0,.5); a Lista fica visível esmaecida ao fundo)

Header: **"Nova Demanda — Portal do Cliente"** (projeto do contexto, não editável) + X.

Corpo (form curto, o essencial):
- **Nome*** — input com AUTOFOCUS, placeholder "Ex.: Exportação de relatórios em PDF". Erro de caracteres proibidos só aparece se ocorrer.
- **Demanda pai** — select de estruturais ("Nenhuma (raiz)" | "Autenticação e Acesso" | "Área do Cliente"); pré-preenchida quando aberto via `+` de uma estrutural.
- **Estimativa*** — inputnumber com sufixo "h" (ou "dia(s)" conforme preferência), default vazio com hint "0h = sem estimativa".
- **☐ Demanda estrutural (agrupa sub-demandas)**.
- Link expansor **"Mais opções ▾"** (colapsado por padrão) contendo: Status (default "Planejada"), Previsão de término (datepicker dd/mm/aaaa), Membros (multiselect com busca: Ana Souza, Bruno Lima, Carla Mendes), Tags (chips toggle coloridos: Backend, Frontend, UX, Integração).

Footer: `Cancelar` (texto) · **`Criar e adicionar outra`** (outline — cria, toast de sucesso, limpa o form e devolve o foco ao Nome) · **`Criar Demanda`** (primário — cria e FECHA). **Enter = Criar Demanda**; Esc fecha (com guarda se houver texto digitado).

## 7. Estados

- **Sem projeto selecionado:** ilustração leve + "Selecione um projeto para ver as demandas" + botão "Escolher projeto" que abre o dropdown do seletor no header. (Nunca mostrar "Nenhuma demanda encontrada" aqui.)
- **Carregando:** skeleton de 6 linhas de árvore (não spinner central) no modo Lista; spinner central apenas no Grafo.
- **Projeto sem demandas:** ícone `pi-inbox` + "Este projeto ainda não tem demandas" + botão primário central **"Nova Demanda"** (gestor) / "Peça a um gestor para criar a primeira demanda" (dev).
- **Busca/filtros sem resultado:** "Nenhuma demanda para 'gateway'" + botão-texto **"Limpar filtros"**.
- **Erro de rede:** faixa inline com "Não foi possível carregar as demandas" + botão "Tentar novamente".
- **Após alteração:** atualização otimista; toast bottom-center com **"Desfazer"** para status/tags; sem colapso da árvore.

## 8. Callouts numerados para o mockup

- **① Toolbar de busca + chips de status com contadores** — localizar/filtrar em 1 tecla ou 1 clique, valendo para Lista e Grafo (antes: inexistente).
- **② Chip de status clicável em toda linha com popover + atualização otimista** — troca de status de 5 cliques → 2, sem reload e sem colapsar a árvore.
- **③ Clique na linha abre o detalhe; chevron expande; ações `+` e `⋯` visíveis no hover** — fim das ações escondidas só no botão-direito; consistente com o Grafo.
- **④ Projeto lembrado + modo persistido na URL** — a tela abre pronta para trabalhar, 2-3 cliques a menos em toda visita.
- **⑤ Dialog enxuto com autofocus, Enter para criar, 'Criar e adicionar outra' e 'Mais opções' colapsado** — criação simples em 2 interações; criação em série explícita.
- **⑥ Legenda como popover-filtro e hover-card rico no Grafo** — +240px de canvas, legenda que também filtra, dados do nó sem delay de tooltip nativo.
