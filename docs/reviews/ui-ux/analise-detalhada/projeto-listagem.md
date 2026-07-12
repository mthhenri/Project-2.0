# Projetos — listagem + dialog de formulário criar/editar (/projeto (só gestor))

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

## Sugestões (VERIFICAR: checar vs regras de negócio)
### S1 — Dialog único criar/editar acionável direto do card [impacto alto]
Adicionar no card um menu de ações (kebab ou ícone de lápis visível no hover) com 'Editar' e 'Excluir'. 'Editar' abre o MESMO ProjetoFormularioDialogComponent pré-preenchido (modo edição usa ProjetoAlterarDto/PUT já existentes), eliminando o dialog duplicado do projeto-detalhe. Salvar atualiza o card in-place, sem refetch.
_Redução de esforço:_ editar: de 6 cliques + 2 navegações para 2 cliques, permanecendo na listagem

### S2 — Troca rápida de status inline no tag do card [impacto alto]
Tornar o p-tag de status clicável: clique abre um menu com Ativo/Pausado/Concluído/Cancelado; escolher dispara PUT parcial (ProjetoAlterarDto.status) com atualização otimista do tag e toast discreto. É a ação no ponto de decisão para a tarefa mais frequente do gestor.
_Redução de esforço:_ mudar status: de 6 cliques para 2

### S3 — Busca instantânea por nome/código [impacto alto]
Campo de busca no topo (placeholder 'Buscar por nome ou código…', atalho '/', ícone pi-search). Carregar os projetos com allRows=true (já suportado pelo ProjetoListarDto) e filtrar client-side por nome/código conforme digita — volume de projetos é pequeno num sistema interno. Elimina a caça via paginação.
_Redução de esforço:_ localizar projeto: de ~3 cliques + varredura visual para digitar 2–3 letras (0 cliques)

### S4 — Filtro de status como botões segmentados + estado persistido em queryParams [impacto medio]
Substituir o p-select por p-selectButton: 'Todos | Ativos | Pausados | Concluídos | Cancelados' (com contadores). Um clique em vez de dois, filtro visível sem abrir dropdown. Gravar status/busca/página em queryParams para sobreviver ao ir-e-voltar do detalhe.
_Redução de esforço:_ filtrar: de 2 cliques para 1; refazer contexto ao voltar do detalhe: de 2–3 cliques para 0

### S5 — Excluir com desfazer (sem confirm dialog) [impacto medio]
Como é soft delete, remover o card otimisticamente e mostrar toast 'Projeto "X" excluído — Desfazer' por ~6s (undo recoloca o item; a chamada DELETE só efetiva após o timeout, ou chama-se restauração). Remove o modal bloqueante e corrige a mensagem enganosa 'não pode ser desfeita'.
_Redução de esforço:_ excluir: de 2 cliques + modal para 1 clique; recuperação de erro: de impossível para 1 clique

### S6 — Ergonomia do dialog: autofocus, Enter envia, disclosure progressivo [impacto medio]
Autofocus no campo Nome ao abrir; form com ngSubmit para Enter salvar; botão 'Criar projeto'/'Salvar alterações' conforme o modo; atalho global 'N' abre o dialog. Cor vira uma linha de 8 swatches + botão 'Outra cor…' que expande o colorpicker/hex sob demanda; dica de caracteres proibidos só aparece no erro; datas opcionais agrupadas numa linha compacta com rótulo 'Período (opcional)'.
_Redução de esforço:_ criar projeto: de 3 cliques para 1 clique + digitação (abrir → digitar → Enter); dialog ~40% mais curto

### S7 — Empty states acionáveis e diferenciados [impacto medio]
Lista realmente vazia: ilustração + 'Nenhum projeto ainda' + botão primário 'Criar primeiro projeto'. Filtro/busca sem resultado: 'Nenhum projeto corresponde a "xyz"' + botão 'Limpar filtros' que reseta busca e status num clique.
_Redução de esforço:_ sair do beco sem saída: de 2–3 cliques (reabrir filtro/achar botão no topo) para 1 clique no ponto de atenção

### S8 — Skeleton cards e atualização otimista [impacto baixo]
No carregamento, renderizar 8 skeleton cards com o mesmo tamanho dos reais (sem layout shift); trocas de filtro/busca mantêm a grade anterior esmaecida até a resposta. Criação/edição/exclusão atualizam a lista localmente sem refetch completo. Exibir contagem 'N projetos' ao lado do título.
_Redução de esforço:_ percepção de espera menor e zero saltos de layout; nenhuma espera de refetch após ações (economia de 1–2s por ação)


## REDESIGN SPEC
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
