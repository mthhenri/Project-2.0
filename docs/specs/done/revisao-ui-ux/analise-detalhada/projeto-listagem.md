# Projetos — listagem + dialog de formulário criar/editar (/projeto (só gestor))

> ✅ Sugestões verificadas adversarialmente contra o código e as regras de negócio.

## Fluxos atuais
- **Criar projeto novo (com defaults: status Ativo, cor azul, código auto)** (3 cliques): Clicar 'Novo Projeto' → clicar no campo Nome (sem autofocus) → digitar nome (código se auto-preenche) → clicar 'Salvar' (Enter não envia) → navegação automática para o detalhe
- **Editar um projeto (ex.: mudar status de Ativo para Pausado)** (6 cliques): Clicar no card (navega p/ detalhe, aguarda load) → clicar 'Editar' → abrir select de Status → clicar 'Pausado' → clicar 'Salvar' → clicar '← Projetos' para voltar (e o filtro/página da listagem foi perdido)
- **Excluir um projeto** (2 cliques): Clicar na lixeira do card → clicar 'Excluir' no confirm dialog bloqueante → toast + refetch da lista inteira
- **Filtrar por status** (2 cliques): Clicar no select de Status → clicar na opção. Ao entrar num projeto e voltar, o filtro reseta e é preciso repetir os 2 cliques
- **Localizar um projeto específico pelo nome/código** (3 cliques): Sem campo de busca: varredura visual da grade + cliques de paginação (12 por página). Com ~40 projetos, até 3 cliques de página + varredura
- **Trocar de página na grade** (1 cliques): Clicar no número/seta do paginador; a grade inteira é substituída por spinner durante o fetch

## Problemas
- [ALTA] P1: Editar exige sair da tela: não há ação de edição no card nem na listagem; o dialog da listagem é só de criação, apesar de o backend já ter ProjetoAlterarDto/PUT. O fluxo mais frequente de gestão (mudar status/nome/cor) custa 6+ cliques e 2 navegações, e o formulário de edição é uma segunda implementação duplicada dentro de projeto-detalhe.page (inconsistência e custo de manutenção).
- [ALTA] P2: Não existe busca por nome/código. Com paginação fixa de 12 itens, localizar um projeto vira varredura visual + cliques de paginação. O backend já suporta allRows=true, que permitiria busca instantânea client-side sem mudança de API.
- [ALTA] P3: Mudança de status (pausar/concluir projeto) não é possível no ponto de decisão: o tag de status no card é somente leitura; a informação está visível mas a ação exige navegar até o detalhe e abrir outro dialog.
- [MEDIA] P4: Filtro e página não sobrevivem à navegação: voltar do detalhe recria o componente e reseta status/página (nada em queryParams/storage), forçando o usuário a refazer o contexto toda vez — viola o critério de 'último filtro usado'.
- [MEDIA] P5: Exclusão usa confirm dialog bloqueante com mensagem factualmente errada ('Esta ação não pode ser desfeita') num sistema de soft delete; o padrão recomendado é remoção otimista + toast com 'Desfazer'. Além disso, o único botão sempre visível no card é a lixeira — a ação destrutiva tem mais affordance que a edição (inexistente).
- [MEDIA] P6: Dialog sem ergonomia de teclado: sem autofocus no campo Nome (primeiro clique desperdiçado), sem submit com Enter (form sem ngSubmit), sem atalho para abrir (ex.: tecla N), rótulo genérico 'Salvar' em vez de 'Criar projeto'.
- [MEDIA] P7: Formulário sem disclosure progressivo: o seletor de cor (colorpicker inline + hex + paleta) fica totalmente expandido ocupando ~1/3 do dialog para um campo que quase sempre usa uma cor da paleta; a dica de caracteres proibidos fica permanentemente visível como ruído (deveria aparecer só no erro); as datas opcionais e raramente preenchidas têm o mesmo peso visual dos campos essenciais.
- [MEDIA] P8: Empty state não acionável: só ícone + 'Nenhum projeto encontrado', sem botão 'Novo Projeto' e sem distinguir lista realmente vazia de filtro sem resultados (sem 'Limpar filtro').
- [BAIXA] P9: Carregamento substitui a grade inteira por um spinner central (layout shift a cada filtro/página) em vez de skeleton cards; exclusão refaz o fetch completo em vez de remover otimisticamente o item.
- [BAIXA] P10: Sem contagem de resultados ('X projetos') nem indicação visual do filtro ativo; itensPorPagina fixo em 12 (divergente do default 20 do backend) e sem opção de ajuste.
- [BAIXA] P11: Acessibilidade: o card clicável é uma div com (click), sem role, tabindex ou tratamento de Enter/Espaço — a navegação principal da tela é inoperável por teclado.
- [BAIXA] P12: Código duplicado só é detectado após o submit (validação apenas no backend); não há feedback assíncrono no blur do campo Código, então o usuário perde o formulário preenchido para descobrir a colisão.

## Sugestões aprovadas na verificação
### S1 — Dialog unico criar/editar acionavel direto do card (kebab no hover/foco, gestor apenas) [impacto alto]
Confirmado no codigo: o ProjetoFormularioDialogComponent atual e so-criacao (abrir() reseta e salvar() chama POST), e o projeto-detalhe.page mantem um segundo dialog de edicao com formulario duplicado (formularioEditar + p-dialog proprio). Aprovado: adicionar modo edicao ao componente (abrirParaEditar(projeto) faz patchValue e salvar() chama PUT com ProjetoAlterarDto, que existe e nao aceita codigo — campo Codigo desabilitado nesse modo), reutiliza-lo tambem no detalhe eliminando a duplicacao, e expor no card um menu kebab (p-menu popup) visivel em hover/foco (sempre visivel em touch) com Editar e Excluir, substituindo a lixeira permanente. O menu inteiro fica dentro do @if (sessao.eGestor()) ja usado hoje para a lixeira, pois PUT/DELETE sao @GestorOnly e a rota /projeto nao tem gestorGuard (dev alcanca por URL). Apos salvar, atualizar o card in-place com o ProjetoAlteradoDto retornado pelo PUT (contem id, nome, codigo, cor, status), sem refetch. Cliques precisam de stopPropagation para nao disparar a navegacao do card.
_Redução de esforço:_ editar: de ~4 cliques + 2 carregamentos de pagina (ir ao detalhe, editar, voltar — perdendo filtros) para 2-3 cliques sem sair da listagem; de quebra remove um formulario duplicado do codigo

### S2 — Troca rapida de status inline no tag do card (gestor apenas, otimista com rollback) [impacto alto]
Validado: o p-tag hoje e estatico e mudar status exige a viagem completa ao detalhe. ProjetoAlterarDto tem todos os campos opcionais e o ProjetoRepository.alterar monta o SET dinamicamente so com campos definidos — PUT parcial { status } e plenamente suportado, e o service backend preserva as datas existentes na validacao. Aprovado: tag clicavel (com caret sutil) abre menu com os 4 status; escolher aplica atualizacao otimista do signal projetos + PUT; em erro, reverte o tag e mostra toast de falha. Obrigatorio: renderizar a affordance clicavel somente para sessao.eGestor() (PUT e @GestorOnly; para dev o tag permanece estatico) e stopPropagation para nao navegar. Ressalva honesta: 'tarefa mais frequente do gestor' e suposicao nao verificavel no codigo, mas o corte de esforco e real e a mudanca e barata.
_Redução de esforço:_ mudar status: de ~6 cliques + 2 navegacoes (card, lapis, dropdown, opcao, salvar, voltar) para 2 cliques no proprio card

### S3 — Busca instantanea por nome/codigo com carga allRows e filtro client-side [impacto alto]
Validado: nao existe busca alguma na listagem e o backend nao tem filtro por nome — filtrar client-side e o unico caminho sem mexer no backend. ProjetoListarDto.allRows existe e o backend honra nas duas consultas (listarTodos e listarPorUsuario, sem LIMIT). Correcao necessaria: o ProjetoService.listar do frontend hoje NAO envia allRows — adicionar o mapeamento do parametro no HttpParams. Aprovado: input de busca no topo (icone pi-search, placeholder 'Buscar por nome ou codigo…', botao interno de limpar), filtrando computed sobre nome+codigo do ProjetoResumoDto conforme digita; atalho '/' foca o campo (ignorado quando o foco ja esta em input/textarea ou ha dialog aberto). Volume de sistema interno torna allRows seguro; manter paginacao client-side ('Carregar mais') como valvula de escape se a base crescer.
_Redução de esforço:_ localizar projeto: de varredura visual + cliques de paginacao (12 por pagina hoje) para digitar 2-3 letras com 0 cliques (atalho /)

### S4 — Filtro de status segmentado (p-selectButton) com contadores + estado em queryParams [impacto medio]
Validado: hoje o filtro e um p-select com label (2 cliques: abrir + escolher) e NENHUM estado sobrevive ao ir-e-voltar do detalhe (ngOnInit refaz a busca na pagina 1 sem filtros) — e o fluxo pos-criacao navega ao detalhe, entao voltar e frequente. Aprovado: p-selectButton 'Todos | Ativos | Pausados | Concluidos | Cancelados' com contadores derivados client-side dos dados allRows (refletindo a busca ativa, para os numeros baterem com a grade); com allRows carregado, o proprio filtro de status vira client-side e instantaneo (zero requisicoes). Gravar busca/status (e paginacao, se mantida) em queryParams e restaura-los no init. Depende de S3 (mesma carga allRows).
_Redução de esforço:_ filtrar: de 2 cliques para 1, sem roundtrip ao servidor; retomar contexto ao voltar do detalhe: de refazer filtro/pagina manualmente para 0 cliques

### S5 — Excluir com Desfazer via DELETE adiado (sem confirm dialog, sem endpoint novo) [impacto medio]
Validado: exclusao e soft delete (executarSoftDelete), mas o confirm atual afirma 'Esta acao nao pode ser desfeita' — mensagem factualmente enganosa que precisa sumir de qualquer forma. Correcao obrigatoria na proposta: NAO existe endpoint de restauracao no backend (ProjetoRecuperarDto/RecuperadoDto sao busca por id, nao undelete), entao a variante 'chama-se restauracao' e inviavel; implementar exclusivamente como DELETE adiado: remover o card do signal imediatamente, toast bottom-center 'Projeto X excluido' com botao Desfazer por ~6s; ao expirar, dispara o DELETE; Desfazer cancela o timer e devolve o card. Fazer flush do DELETE pendente em navegacao de rota e beforeunload (pior caso se o flush falhar: o projeto reaparece no reload — falha segura, oposta a exclusao acidental). Acao continua atras de sessao.eGestor() como hoje.
_Redução de esforço:_ excluir: de 2 cliques + modal bloqueante para 1 clique; recuperar exclusao acidental: de impossivel na UI para 1 clique dentro da janela de 6s

### S6 — Ergonomia do dialog: autofocus, Enter envia, rotulos por modo, cor e periodo sob demanda [impacto medio]
Depurado contra o codigo — parte do proposto JA existe e sai da sugestao: status default ATIVO e cor azul ja vem pre-selecionados (abrir() reseta com esses valores) e o codigo auto-derivado do nome ja funciona (gerarCodigoDoNome + sub-rotulo que some na edicao manual). Aprovado o que falta: (1) autofocus no campo Nome no onShow do p-dialog; (2) form com ngSubmit para Enter salvar (com excecao quando overlay de datepicker/select estiver aberto); (3) rotulo do botao por modo: 'Criar projeto' / 'Salvar alteracoes' (hoje e 'Salvar' generico) — casa com o modo edicao de S1; (4) atalho 'N' na pagina de listagem (nao global do app) abrindo o dialog, apenas para gestor e ignorado com foco em input; (5) Status vira p-selectButton (1 clique em vez de abrir dropdown); (6) cor: recolher o colorpicker inline do SeletorCorComponent (hoje sempre aberto e dominando o dialog) atras de 'Outra cor…', mantendo a linha de swatches — atencao: componente compartilhado com Tag e Projeto-detalhe, a mudanca propaga (positivo para consistencia, mas e decisao de escopo); (7) datas agrupadas em 'Periodo (opcional)' colapsado na criacao e expandido na edicao quando houver datas; (8) correcao a proposta: a dica de caracteres proibidos NAO pode virar 'so no erro' — a diretiva appBloquearCaracteresProibidos remove os caracteres na digitacao/colagem, entao o erro de pattern quase nunca dispara e o bloqueio ficaria silencioso e inexplicado; trocar a linha permanente por feedback transitorio exibido no momento em que um caractere e bloqueado.
_Redução de esforço:_ criar: de 3 cliques + digitacao (abrir, clicar no Nome, clicar Salvar) para 1 clique + digitacao + Enter; dialog sensivelmente mais curto (colorpicker e datas so sob demanda), beneficiando tambem a edicao vinda de S1

### S7 — Empty states acionaveis e diferenciados (CTA gated por perfil) [impacto baixo]
Validado: o empty state atual e um so ('Nenhum projeto encontrado', icone + texto, sem acao) e nao distingue lista vazia de filtro sem resultado. Aprovado com ajuste de permissao: (1) vazio absoluto: titulo + botao primario 'Criar primeiro projeto' abrindo o dialog — somente para gestor; para dev que alcanca /projeto por URL (rota sem gestorGuard), texto neutro 'Voce ainda nao tem projetos com demandas atribuidas', sem CTA; (2) busca/filtro sem resultado: mensagem citando o termo + botao 'Limpar filtros' que zera busca e status num clique (depende de S3/S4). Impacto rebaixado de medio para baixo: o vazio absoluto ocorre raramente; o valor recorrente e o 'Limpar filtros' pos-busca, um ganho de 1-2 cliques por ocorrencia — custo de implementacao minimo, vale acoplar a S3/S4.
_Redução de esforço:_ sair de resultado vazio: 1 clique no ponto de atencao em vez de reconfigurar busca/filtro no topo; lista vazia deixa de ser beco sem saida para o gestor

### S8 — Skeleton cards, grade esmaecida em refiltro e contador de projetos [impacto baixo]
Validado: o carregamento atual troca a grade inteira por um spinner centralizado (layout shift real a cada busca) e cada exclusao dispara refetch completo (buscarProjetos()). Aprovado, com escopo enxuto para nao duplicar S1/S5 (que ja definem atualizacao local pos-editar/excluir): (1) skeletons (p-skeleton) com as dimensoes reais do card no primeiro carregamento; (2) em refiltro/busca — praticamente eliminados pelo filtro client-side de S3/S4 — manter a grade anterior esmaecida ate a resposta quando houver requisicao; (3) contador 'N projetos' junto ao titulo refletindo busca/filtro. Nota: 'criacao atualiza a lista localmente' e irrelevante no fluxo real — apos criar, o app navega para /projeto/:id (aoCriar -> router.navigate), comportamento que a spec mantem.
_Redução de esforço:_ zero saltos de layout, nenhuma espera de refetch pos-acao (1 requisicao a menos por exclusao/edicao) e contagem visivel sem contar cards


## Ajustes de implementação apontados pelo verificador
1) PERMISSOES: o rotulo 'Rota /projeto (so gestor)' e impreciso — nao ha gestorGuard aplicado (projeto.routes.ts/app.routes.ts); a topbar apenas oculta o link e o GET /projeto atende desenvolvedor (listarPorUsuario). A spec deve condicionar a sessao.eGestor() toda affordance de escrita (tag de status clicavel, kebab Editar/Excluir, botao Novo Projeto, CTA 'Criar primeiro projeto', atalho N) — como o codigo atual ja faz com a lixeira — ou declarar explicitamente a adicao do gestorGuard como mudanca de escopo. 2) DESFAZER EXCLUSAO: nao existe endpoint de restauracao no backend (ProjetoRecuperar/RecuperadoDto = busca por id); especificar que o undo adia o DELETE ate o fim da janela do toast, com flush do pendente em troca de rota/beforeunload — nunca 'chamar restauracao'. 3) COR: a spec diz '8 swatches (os mesmos hex da paleta atual)', mas a paleta atual do SeletorCorComponent tem 15 cores — contradicao a resolver (escolher 8 ou manter 15 compactas); registrar que o componente e compartilhado com Tag-listagem e Projeto-detalhe, logo o colapso do colorpicker muda essas telas tambem. 4) CODIGO AUTO-DERIVADO: ja existe (gerarCodigoDoNome + sub-rotulo que some na edicao manual + retorno ao automatico quando o campo e esvaziado — detalhe que a spec omite); marcar como comportamento existente a preservar, nao como novidade. 5) CARACTERES PROIBIDOS: a diretiva appBloquearCaracteresProibidos remove os caracteres na digitacao/colagem, entao o erro de pattern quase nunca dispara; 'mensagem so no erro' deixaria o bloqueio silencioso — especificar feedback transitorio no momento do bloqueio. 6) ALLROWS: suportado no DTO e no backend, mas o ProjetoService.listar do frontend nao envia o parametro hoje — a spec deve citar essa alteracao no service. 7) CONTADORES do selectButton devem refletir a busca ativa (os numeros estaticos do mockup sugerem contagem global e conflitariam com a grade filtrada). 8) ENTER ENVIA: prever excecao com overlay aberto (datepicker/menu), para Enter selecionar no overlay e nao submeter o form. 9) Menor: a faixa de cor do card atual tem 8px (SCSS), o mockup diz 6px — alinhar ao existente ou assumir a mudanca deliberadamente.

## Especificação do redesign
# Redesign — Projetos (listagem + dialog criar/editar)

**Rota:** `/projeto` (só gestor) · **Stack:** Angular 21 + PrimeNG (Aura, primário azul) + Tailwind · Tema claro/escuro · Toasts bottom-center.
**Dados disponíveis (não inventar além disso):** card usa `ProjetoResumoDto` = { id, nome, codigo, cor, status }; dialog usa `ProjetoCriarDto`/`ProjetoAlterarDto` = { nome, codigo (só criação), cor, status, inicioData?, previsaoFimData? }.

---

## 1. Header da página (padrão de todas as telas)

Linha única, alinhada pela base, padding 1.5rem:

- **Esquerda:** `h1` **"Projetos"** (1.5rem, semibold) + contador muted ao lado: **"8 projetos"** (reflete busca/filtro ativos).
- **Direita:** botão primário **"Novo Projeto"** (ícone `pi pi-plus`) com hint de atalho no tooltip: *"Novo projeto (N)"*.

## 2. Toolbar de busca e filtro (logo abaixo do header)

Linha flex com wrap, gap 0.75rem:

- **Busca** (esquerda, flex-1, max-width 380px): input com ícone `pi pi-search`, placeholder **"Buscar por nome ou código…  ( / )"**. Filtra client-side conforme digita (dados carregados com `allRows=true`), sem botão de submit. Botão "×" interno limpa. Atalho `/` foca o campo.
- **Filtro de status** (direita): `p-selectButton` segmentado: **Todos (8) · Ativos (5) · Pausados (1) · Concluídos (1) · Cancelados (1)** — um clique alterna; opção ativa em azul primário.
- Busca, status e página são refletidos em **queryParams** (`?busca=portal&status=ATIVO`) — voltar do detalhe restaura exatamente o contexto.

## 3. Corpo — grade de cards

Grid `repeat(auto-fill, minmax(280px, 1fr))`, gap 1.25rem.

### Anatomia do card (dados reais do ProjetoResumoDto)

```
┌──────────────────────────────────────┐
│ ████████ faixa 6px na cor do projeto │
│                                      │
│  PORTAL-CLIENTE          [Ativo ▾]   │  ← código muted caps + tag de status CLICÁVEL
│  Portal do Cliente            (⋮)    │  ← nome semibold; kebab aparece no hover/foco
└──────────────────────────────────────┘
```

- **Card inteiro clicável** → navega para `/projeto/:id`. Elemento com `role="link"`, `tabindex="0"`, Enter/Espaço ativam. Hover: elevação + `translateY(-2px)` (mantido do atual).
- **Tag de status = ação inline (não navega):** clique abre menu flutuante com `Ativo · Pausado · Concluído · Cancelado`; escolher aplica PUT otimista (tag muda na hora) + toast discreto "Status de Portal do Cliente: Pausado". Caret `▾` sutil no tag sinaliza a affordance.
- **Menu kebab `⋮`** (canto inferior direito, visível em hover/foco do card, sempre visível em touch): itens **"Editar"** (`pi pi-pencil`) — abre o dialog em modo edição — e **"Excluir"** (`pi pi-trash`, vermelho). Substitui a lixeira permanente do design atual.
- Sem rodapé dedicado: card mais baixo e denso (2 linhas de conteúdo).

### Dados de exemplo da grade (8 cards)

| Cor | Código | Nome | Status |
|---|---|---|---|
| #3b82f6 azul | PORTAL-CLIENTE | Portal do Cliente | Ativo |
| #22c55e verde | APP-FIELD-SERVICE | App Field Service | Ativo |
| #f59e0b âmbar | MIGRACAO-ERP | Migração ERP | Pausado |
| #8b5cf6 roxo | INTEGRACAO-FISCAL | Integração Fiscal | Ativo |
| #06b6d4 ciano | DATA-LAKE-COMERCIAL | Data Lake Comercial | Ativo |
| #64748b cinza | SITE-INSTITUCIONAL | Site Institucional | Concluído |
| #ef4444 vermelho | LEGADO-FATURAMENTO | Legado Faturamento | Cancelado |
| #ec4899 rosa | ONBOARDING-DIGITAL | Onboarding Digital | Ativo |

### Estados do corpo

- **Carregando:** 8 **skeleton cards** (faixa cinza no topo, 2 barras de texto), mesmas dimensões dos reais — zero layout shift. Ao trocar filtro/busca, a grade atual fica esmaecida (opacity 0.5) até a resposta.
- **Vazio absoluto (nenhum projeto cadastrado):** ícone `pi pi-folder-open` grande, título **"Nenhum projeto ainda"**, subtítulo "Crie o primeiro projeto para começar a organizar demandas e atividades." + **botão primário "Criar primeiro projeto"** (abre o mesmo dialog).
- **Busca/filtro sem resultado:** ícone `pi pi-search`, **"Nenhum projeto corresponde a \"erp fiscal\""** + botão outlined **"Limpar filtros"** (zera busca e volta status para Todos em 1 clique).
- **Exclusão:** card some imediatamente (otimista) + toast bottom-center: *"Projeto \"Legado Faturamento\" excluído"* com botão **"Desfazer"** (6s). Sem confirm dialog.

## 4. Paginação

Com busca client-side sobre `allRows`, a paginação vira **"Carregar mais"** apenas se houver 30+ projetos (botão outlined centralizado sob a grade: "Mostrar mais 24 projetos"). Abaixo disso, a grade mostra tudo — cenário típico de sistema interno. (Fallback aceitável: manter `p-paginator`, mas com estado em queryParams.)

## 5. Dialog "Novo Projeto" / "Editar Projeto" (único componente, dois modos)

**Contexto visual do mockup:** o dialog aparece centralizado **sobre a página de fundo escurecida** (overlay rgba(0,0,0,0.4); a grade de cards visível e desfocada por trás). Largura 36rem (mais estreito que os 42rem atuais — formulário mais curto).

**Header:** "Novo Projeto" (criação) ou "Editar Projeto — Portal do Cliente" (edição) + botão fechar `×`. Esc fecha.

**Corpo (ordem e comportamento):**

1. **Nome*** — input full-width, **autofocus ao abrir**, placeholder "ex.: Portal do Cliente". Nenhuma dica permanente: a mensagem de caracteres proibidos só aparece como erro sob o campo quando ocorrer.
2. **Código*** — mesma linha do Nome (2 colunas em ≥sm). Valor de exemplo auto-derivado: digitar "Portal do Cliente" preenche **PORTAL-CLIENTE** em caixa alta muted-tinted; sub-rótulo "Gerado pelo nome — edite se quiser" some assim que o usuário edita. **Em modo edição o campo aparece desabilitado** com tooltip "O código não pode ser alterado" (o `ProjetoAlterarDto` não aceita código).
3. **Status*** — `p-selectButton` compacto com os 4 status (default **Ativo** pré-selecionado na criação) — 1 clique, sem abrir dropdown.
4. **Cor*** — linha de **8 swatches** (os mesmos hex da paleta atual: azul selecionado por padrão com anel) + botão texto **"Outra cor…"** que expande, sob demanda, o colorpicker + input hex (disclosure progressivo; recolhido por padrão).
5. **"Período (opcional)"** — grupo colapsado por padrão na criação: link discreto `▸ Definir período (opcional)`; ao expandir, dois datepickers lado a lado — **Início** e **Previsão de término** (dd/mm/aaaa) com validação "Previsão deve ser posterior ao início". Em edição, se o projeto tiver datas (ex.: Início 01/03/2026 · Término 30/11/2026), o grupo já abre expandido.

**Footer:** "Cancelar" (texto/outlined) + botão primário **"Criar projeto"** (criação) ou **"Salvar alterações"** (edição), com spinner de loading. **Enter em qualquer campo envia** (form com `ngSubmit`).

**Pós-ação:** criação → toast "Projeto criado" + navegação para `/projeto/:id` (mantida — o gestor segue criando demandas); edição → fecha, card atualizado in-place, toast "Alterações salvas", sem refetch.

**Exemplo preenchido para o mockup:** Nome "Portal do Cliente", Código PORTAL-CLIENTE (auto), Status Ativo, cor azul selecionada, período colapsado.

## 6. Atalhos de teclado

- `N` → abre "Novo Projeto" · `/` → foca a busca · `Esc` → fecha dialog/menus · `Enter` → envia o formulário · Tab/Enter navegam pelos cards.

---

## Callouts numerados para o mockup

① **Tag de status clicável no card** (com caret ▾ e menu aberto num dos cards, ex.: Migração ERP): mudar status em 2 cliques sem sair da listagem — antes eram 6 cliques e 2 navegações.
② **Menu ⋮ com "Editar" no card** abrindo o dialog unificado criar/editar na própria listagem — edição deixou de exigir viagem ao detalhe.
③ **Busca instantânea + filtro segmentado com contadores** no topo, persistidos na URL — localizar projeto digitando 2–3 letras; contexto sobrevive ao ir-e-voltar.
④ **Exclusão com "Desfazer" no toast** (mostrar o toast no mockup) no lugar do confirm dialog bloqueante — 1 clique, coerente com soft delete.
⑤ **Dialog encurtado com disclosure progressivo**: swatches de cor em linha + "Outra cor…", período opcional colapsado, autofocus no Nome e Enter envia ("Criar projeto").
⑥ **Empty state acionável** (variante busca sem resultado com botão "Limpar filtros") e skeleton cards no carregamento — nenhum beco sem saída, nenhum layout shift.
