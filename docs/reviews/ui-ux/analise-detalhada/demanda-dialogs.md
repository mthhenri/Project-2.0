# Demandas — dialogs (criar demanda, editar demanda, detalhe da demanda, lista de conexões, lista de membros) (/demanda (dialogs))

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

## Sugestões (VERIFICAR: checar vs regras de negócio)
### S1 — Edição inline no detalhe (status, nome, previsão, estimativa) [impacto alto]
Transformar o detalhe em superfície editável para quem tem permissão (podeEditar): o tag de status vira um dropdown-clique (Pendente/Planejada/Concluída/Cancelada) com PUT imediato e toast; nome editável com clique no lápis ao lado do título; Estimado e Previsão viram campos click-to-edit no info-grid. O dialog 'Editar Demanda' permanece só como fallback ('Editar tudo').
_Redução de esforço:_ marcar Concluída: de 5 cliques para 2; alterar previsão: de 5 para 2

### S2 — Autofocus + Enter para submeter + Esc em todos os dialogs [impacto alto]
Foco automático no campo Nome ao abrir criar/editar, (ngSubmit) ligado ao botão primário em todos os forms (criar demanda, editar, conexão, membros, tags), Ctrl+Enter no editor de descrição. Elimina o primeiro clique e o clique final de todo formulário.
_Redução de esforço:_ -2 cliques em toda criação/edição (ex.: criar simples de 4 para 1 clique + digitação)

### S3 — Fechar ao criar + botão secundário 'Criar e adicionar outra' [impacto alto]
O botão primário 'Criar Demanda' passa a fechar o dialog após sucesso; ao lado, ação secundária explícita 'Criar e adicionar outra' mantém o dialog aberto com o mesmo pai pré-selecionado e foco de volta no Nome. Resolve a ambiguidade atual e mantém o fluxo de cadastro em lote.
_Redução de esforço:_ criação única: de 4 para 2 cliques; lote de 5 demandas: mantém ~2 cliques por item com contexto preservado

### S4 — Tags como chips-toggle diretos e membros com autocomplete inline (sem dialogs intermediários) [impacto alto]
Aba/seção Tags mostra TODOS os chips disponíveis já em modo toggle (selecionado = preenchido) com PUT imediato — o dialog 'Editar Tags' morre. Na lista de Membros, o botão 'Gerenciar' vira um autocomplete inline '+ Adicionar pessoa' no cabeçalho (busca e adiciona com Enter, POST individual), e o X de cada card remove com toast + Desfazer.
_Redução de esforço:_ toggle de 1 tag: de 5 cliques para 2; adicionar 1 membro: de 7 cliques para 3

### S5 — Conexões: select com busca + criação inline + labels semânticos [impacto alto]
Trocar o dialog 'Adicionar Conexão' por uma linha inline no fim da lista: autocomplete com filtro ('Buscar demanda…'), seletor de direção em 2 botões-toggle ('→ Depende de' / '↔ Bidirecional') e Enter para confirmar. Cada item da lista ganha tooltip textual ('Esta demanda depende de X' / 'X depende desta demanda'). Botão desabilitado enquanto não houver destino.
_Redução de esforço:_ adicionar conexão: de 7 cliques para 3 (e elimina o scroll cego em 200 itens)

### S6 — Promover tags e membros ao cabeçalho do detalhe; eliminar duplicações [impacto medio]
Cabeçalho passa a exibir: breadcrumb, título com status-dropdown, chips de tags (com '+' para togglar) e pilha de avatares dos membros (com '+' abrindo o autocomplete). Remove o Status duplicado e o campo 'Estrutural' do info-grid (fica só o ícone de pasta com tooltip). Abas ficam apenas com listas pesadas: Sub-demandas, Atividades, Conexões.
_Redução de esforço:_ ver tags/membros: de 2 cliques (abrir aba) para 0 (visível de imediato)

### S7 — Empty states acionáveis em todas as seções [impacto medio]
Conexões vazias → botão 'Adicionar conexão'; Membros vazio → '+ Adicionar pessoa' (gestor) ou 'Participar desta demanda' (dev); Atividades vazio → 'Nova Atividade'; Tags vazio → link 'Gerenciar tags' (gestor). Padroniza com o empty state de Sub-demandas que já faz isso.
_Redução de esforço:_ primeira ação a partir do vazio: de 2-3 cliques (achar o botão no header) para 1

### S8 — Undo em vez de confirmação para ações reversíveis + texto de exclusão honesto [impacto medio]
Remover membro, sair da demanda e excluir conexão executam na hora com toast 'Removido · Desfazer' (re-POST no undo). Exclusão de demanda mantém confirm (efeito cascata), mas com texto correto: 'Excluir a demanda \'X\'? Sub-demandas e atividades deixarão de ser exibidas.'
_Redução de esforço:_ cada remoção: de 2 cliques + leitura de modal para 1 clique

### S9 — Formulário de criação adaptativo e mais curto [impacto medio]
Ao marcar 'Demanda estrutural', ocultar Horas Estimadas e Previsão (estruturais agregam filhos). Dica de caracteres proibidos só aparece quando o erro ocorre. Datepicker com atalhos '+1 semana / +2 semanas / fim do mês'. Status sai da linha principal (default Planejada) para um disclosure 'Mais opções' junto com o próprio checkbox estrutural quando a criação vem de contexto óbvio.
_Redução de esforço:_ criação estrutural: 3 campos a menos; formulário padrão 30% mais curto de escanear

### S10 — Aba Atividades acionável, sem perder contexto [impacto medio]
Adicionar botão primário 'Nova Atividade' (pré-preenchida com a demanda atual) e fazer 'Ver todas' abrir /atividade?demandaId=X sem fechar o dialog (ou em nova guia). Dev vê apenas as próprias, como hoje.
_Redução de esforço:_ criar atividade a partir do detalhe: de ~6 cliques (fechar, navegar, filtrar, criar) para 2

### S11 — Unificar criar/editar num único formulário e navegação interna com 'voltar' [impacto medio]
Mesmo componente de formulário para criar e editar (mesma largura 600px, mesmos campos incluindo Tags/Membros na edição para gestor, mesmo sufixo de horas). No detalhe, breadcrumb ganha botão '← Voltar' que restaura a demanda anterior sem refazer as ~8 chamadas (cache da última navegação); link de conexão navega DENTRO do dialog em vez de trocar a rota por baixo.
_Redução de esforço:_ voltar após navegar para sub-demanda: de reabrir tudo (3+ cliques + espera) para 1 clique instantâneo


## REDESIGN SPEC
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
