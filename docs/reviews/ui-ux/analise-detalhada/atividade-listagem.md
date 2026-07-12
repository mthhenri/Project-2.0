# Atividades — listagem + dialog de visualização rápida (/atividade)

## Fluxos atuais
- **Iniciar execução da própria atividade (fluxo mais frequente do dev)** (2 cliques): Localizar a linha → clique no play → dialog abre → digitar a descrição do que vai desenvolver (obrigatória para dev; sem reaproveitamento da anterior) → clique em 'Iniciar'
- **Encerrar execução em andamento** (2 cliques): Clique no pause → dialog abre com descrição pré-preenchida → revisar → clique em 'Encerrar'
- **Criar nova atividade** (5 cliques): Clique 'Nova Atividade' → clicar no campo Nome (sem autofocus) → digitar → abrir select Demanda → digitar filtro → clicar na opção → (opcional: usuário/status/tags/descrição) → clique 'Criar' (Enter não submete)
- **Trocar status de uma atividade** (2 cliques): Clique na tag de status → clique na opção do popover (salva na hora, mas recarrega a lista inteira e perde a posição de scroll)
- **Atribuir/editar tags** (4 cliques): Clique no ícone pi-plus-circle → dialog abre → N cliques nos chips → clique 'Salvar'
- **Registrar execução manual (gestor)** (12 cliques): Clique no pi-calendar-plus → abrir datepicker Início → navegar/selecionar dia → ajustar hora e minuto → abrir datepicker Fim → selecionar dia → ajustar hora e minuto → digitar descrição → clique 'Registrar' (nenhum default de data/hora)
- **Ver detalhes e editar descrição da atividade** (2 cliques): Clique no olho → aguardar 3 requests → editar no Quill → clique 'Salvar descrição'
- **Editar nome da atividade (gestor)** (3 cliques): Clique no olho → clique no lápis do header → digitar → clique no check (ou Enter)
- **Consultar descrição do cliente / técnica / documentação da demanda** (1 cliques): Clique no ícone correspondente na coluna Demanda → dialog fullscreen 95vw abre
- **Excluir atividade (gestor)** (2 cliques): Clique na lixeira → clique 'Excluir' no confirm dialog
- **Gestor filtrar só as próprias atividades** (3 cliques): Abrir select Usuário → digitar/rolar → clicar no próprio nome (repetir a cada visita, pois o filtro não persiste)

## Problemas
- [ALTA] P01: Registrar execução manual (gestor) parte de dois datetimes vazios: ~10-14 cliques só nos datepickers. Não há default (hoje/agora), nem campo de duração, nem atalhos ('hoje 09:00-12:00'). É o fluxo mais caro da tela.
- [ALTA] P02: Nenhum update otimista fora das tags: trocar status, criar, registrar execução e excluir chamam buscarAtividades() e recarregam a lista inteira — flicker, perda de posição de scroll e sensação de lentidão em ações de 1 clique.
- [ALTA] P03: Filtros não persistem (URL ou localStorage). Ao navegar para outra tela e voltar, ou dar F5, o gestor perde usuário/busca/período selecionados e refaz 2-6 cliques por visita. O filtro ?demandaId ativo também é invisível — não há chip indicando 'filtrando pela demanda X' nem como removê-lo.
- [ALTA] P04: Coluna Ações com até 5 icon-buttons sem rótulo (play, olho, plus-circle, calendar-plus, lixeira), alguns condicionais por perfil/estado — alta carga cognitiva, alvos pequenos, hierarquia inexistente entre ação frequente (play) e rara (excluir). O ícone pi-plus-circle para 'Atribuir tags' tem affordance ruim (parece 'adicionar item').
- [ALTA] P05: A regra 'nunca duas execuções ativas por usuário' não tem representação na UI: não há indicador de 'você tem execução em andamento'. O usuário precisa caçar a linha com pause na tabela (que pode estar em outra página da paginação) para encerrar, e só descobre o conflito quando o backend rejeita o novo play.
- [MEDIA] P06: Dialog Visualizar é um beco sem saída: não mostra projeto/demanda/tempo total (dados que a linha já tem) e não permite nenhuma ação além de editar nome/descrição — sem trocar status, sem play/pause, sem editar tags. O usuário fecha e volta para a linha para agir.
- [MEDIA] P07: Aba Descrição do Visualizar exibe o editor Quill sempre em modo edição com botão 'Salvar descrição', mesmo para leitura rápida — pesado, lento e sem verificação de permissão no front (dev não-dono vê o editor e o erro só viria do backend).
- [MEDIA] P08: Dialog Nova Atividade sem autofocus no campo Nome e sem submit via Enter; o usuário obrigatoriamente alterna mouse/teclado. Padrão inconsistente com o dialog de Registro, que já implementa autofocus na descrição.
- [MEDIA] P09: Empty state não acionável: só ícone + 'Nenhuma atividade encontrada'. Não diferencia 'não existe nada' (deveria oferecer 'Nova Atividade') de 'os filtros esconderam tudo' (deveria oferecer 'Limpar filtros').
- [MEDIA] P10: Exclusão usa confirm dialog de 2 passos apesar de o sistema inteiro ser soft delete — o caminho seguro e mais barato seria excluir direto com toast 'Desfazer' (undo).
- [MEDIA] P11: Tags editáveis em um dialog próprio (3+ cliques com Salvar) mas somente leitura no Visualizar — dois lugares, dois comportamentos. A edição poderia ser um popover inline na própria célula, aproveitando que a atualização in-place já existe.
- [MEDIA] P12: Dialog de descrição da demanda ocupa 95vw×95vh mesmo para 2 parágrafos — desproporcional e desorientador. Os 3 ícones por linha (cliente/técnica/doc) multiplicados por 10-50 linhas geram forte ruído visual na coluna Demanda.
- [MEDIA] P13: Iniciar execução exige digitar descrição do zero toda vez (obrigatória para dev), embora o dialog já carregue e exiba as últimas execuções — não há botão de 'reutilizar' a descrição anterior, um clique que economizaria a digitação inteira em retomadas de trabalho.
- [BAIXA] P14: Nenhum atalho de teclado: '/' não foca a busca, 'N' não abre Nova Atividade, Esc funciona só pelo dismissableMask do PrimeNG.
- [BAIXA] P15: Sem seleção múltipla/ações em massa: mudar status ou tags de 5 atividades custa 5× o fluxo individual.
- [BAIXA] P16: Botão 'Limpar' filtros sempre visível mesmo sem filtro ativo, e não há contador/indicador de quantos filtros estão aplicados sobre o resultado.
- [BAIXA] P17: Play com visibility:hidden mantém o espaço, mas a ausência silenciosa do botão (status Pendente/Desenvolvida) não explica o porquê — um disabled com tooltip 'Mude o status para Planejada ou Desenvolvendo' ensinaria a regra.
- [BAIXA] P18: Para gestor a tabela tem 8 colunas densas sem estratégia responsiva (sem prioridade de colunas ou colapso) — em notebooks de 13" a coluna Ações espreme as demais.

## Sugestões (VERIFICAR: checar vs regras de negócio)
### S01 — Defaults inteligentes + chips de duração no Registrar execução [impacto alto]
Pré-preencher Fim = agora e Início = agora − 1h, e adicionar chips de duração rápida (30min · 1h · 2h · 4h · Hoje 9h-12h) que recalculam o Início a partir do Fim. Datepickers permanecem para ajuste fino. Descrição continua com autofocus.
_Redução de esforço:_ de ~12 cliques para 3 (calendar-plus → chip de duração → Registrar)

### S02 — Banner fixo de execução em andamento com cronômetro [impacto alto]
Faixa acima dos filtros (dados de GET /execucao/ativa + AtividadeResumoDto): 'Em execução: Portal do Cliente · Corrigir cálculo de juros — 01:23:45' com botão 'Encerrar'. Torna visível a regra de execução única, evita o erro do backend e permite encerrar sem procurar a linha em outra página da tabela.
_Redução de esforço:_ encerrar: de 'paginar + procurar linha + 2 cliques' para 1 clique fixo; evita 1 fluxo de erro inteiro

### S03 — Update otimista + toast com Desfazer (elimina confirm de exclusão) [impacto alto]
Trocar status atualiza a p-tag da linha imediatamente (rollback em caso de erro), como já é feito com tags. Excluir remove a linha na hora e mostra toast 'Atividade excluída · Desfazer' por 6s (soft delete já garante reversibilidade). Zero recarregamento de lista, zero perda de scroll.
_Redução de esforço:_ exclusão de 2 cliques para 1; troca de status deixa de custar um reload completo da tabela

### S04 — Reutilizar a última descrição ao iniciar execução [impacto alto]
No dialog de iniciar, cada item de 'Últimas execuções' (já carregadas) ganha um botão 'Usar esta descrição' que copia o texto para o textarea. Retomar o trabalho de ontem vira 3 cliques sem digitação.
_Redução de esforço:_ elimina a digitação obrigatória (~50-200 caracteres) nas retomadas — de digitar tudo para 1 clique

### S05 — Consolidar ações da linha em 2 botões visíveis + menu kebab [impacto medio]
Visíveis: Play/Pause (a ação nº 1, agora maior e com estado disabled+tooltip explicativo quando o status não permite) e Visualizar. No kebab (⋮): Atribuir tags, Registrar execução (gestor), Excluir (gestor). O ícone de tags passa a ser pi-tag e vira popover inline (chips + salvar ao fechar), sem dialog.
_Redução de esforço:_ de 5 alvos pequenos para 2 + menu; tags de 4 cliques para 2-3; leitura da tabela muito mais limpa

### S06 — Persistir filtros na URL + chip de contexto de demanda + atalho 'Minhas' [impacto alto]
Serializar busca/status/usuário/período como query params (restaurados ao voltar); exibir chip removível 'Demanda: Tela de extrato ✕' quando houver ?demandaId; para gestor, chip-toggle 'Minhas atividades' que aplica usuarioId = eu em 1 clique. 'Limpar filtros (3)' só aparece com filtros ativos.
_Redução de esforço:_ de 2-6 cliques de refiltragem por visita para 0; 'Minhas' de 3 cliques para 1

### S07 — Dialog Visualizar acionável e completo [impacto medio]
Adicionar linha de contexto Projeto · Demanda e o Tempo total executado (dados já presentes no resumo); status vira o mesmo seletor inline da tabela; botão primário Play/Pause no footer; tags editáveis ali mesmo (mesmo popover da S05). Descrição abre em modo leitura com botão 'Editar' (disclosure progressivo) — o Quill só carrega ao editar, e apenas para quem pode.
_Redução de esforço:_ agir a partir do detalhe: de 'fechar dialog + achar linha + 2 cliques' para 1 clique dentro do próprio dialog

### S08 — Autofocus + Enter para submeter em todos os dialogs e atalhos globais [impacto medio]
Nova Atividade: foco no Nome ao abrir, Enter submete (Ctrl+Enter nos textareas de execução). Atalhos globais: '/' foca a busca, 'N' abre Nova Atividade. Padrão único de foco em todos os 6 dialogs da tela.
_Redução de esforço:_ criar atividade sem tocar no mouse depois do 1º clique: de 5 cliques para 2 (abrir + selecionar demanda)

### S09 — Empty state acionável e sensível a filtros [impacto medio]
Sem registros e sem filtros: ilustração + 'Nenhuma atividade ainda' + botão primário 'Nova Atividade'. Com filtros ativos: 'Nenhuma atividade corresponde aos filtros' + botões 'Limpar filtros' e 'Nova Atividade'.
_Redução de esforço:_ do beco sem saída para a próxima ação em 1 clique

### S10 — Indicador compacto de descrições da demanda e dialog proporcional [impacto baixo]
Substituir os 3 icon-buttons por linha por um único indicador discreto (ícone pi-file com 1-3 pontos coloridos) que abre um popover com as três opções nomeadas — só as com conteúdo em destaque. O dialog de leitura passa de 95vw×95vh para 56rem com altura automática (máx. 80vh).
_Redução de esforço:_ mesmo 1-2 cliques, mas -66% de ruído visual na coluna Demanda e leitura sem desorientação

### S11 — Seleção múltipla com barra de ações em massa (gestor) [impacto medio]
Checkbox por linha + barra flutuante 'N selecionadas: Mudar status · Atribuir tags · Excluir'. Usa os endpoints existentes em lote de chamadas (PUT /atividade/:id e /atividade/:id/tag por item).
_Redução de esforço:_ mudar status de 5 atividades: de 10 cliques para 4


## REDESIGN SPEC
# Redesign — Atividades (listagem + visualização rápida) · rota /atividade

Tema Aura (primário azul), claro/escuro, Tailwind + PrimeNG. Densidade média. Toasts em bottom-center. Perfil de referência do mockup: **GESTOR logado como "Ana Souza"** (mostra tudo; anotar o que some para dev).

---

## 1. Header da página

Linha única, `padding: 1.5rem 1.5rem 0`:

- **Esquerda:** título `Atividades` (h1, 1.5rem, semibold, cor primária-600) + subtítulo discreto ao lado em texto muted: `128 atividades · 3 em execução` (contadores vindos do total da listagem).
- **Direita:** botão primário `+ Nova Atividade` (abre dialog §6). Tooltip: `Atalho: N`.

## 2. Banner de execução em andamento ①

Faixa destacada entre o header e os filtros, visível apenas quando `GET /execucao/ativa` retorna algo (para dev: a própria; para gestor: a própria — execuções do time aparecem pelo pause na linha). Fundo azul-50 (escuro: azul-900/30), borda esquerda 3px primária, cantos arredondados:

- Ícone `pi-play-circle` pulsando + texto: **`Em execução:`** `Portal do Cliente · Corrigir cálculo de juros do extrato` — cronômetro vivo `01:23:45` (fonte mono, calculado de `inicioData`).
- À direita: botão `Encerrar` (severity warn, ícone pi-stop) → abre o dialog de encerrar (§8) já preenchido.
- Estado sem execução: banner não renderiza (sem espaço reservado).

## 3. Toolbar de filtros ②

Linha única com wrap, alinhada à base:

| Campo | Componente | Conteúdo de exemplo |
|---|---|---|
| Busca | input com ícone pi-search, placeholder `Buscar por projeto, demanda ou atividade  ( / )` | `extrato` |
| Status | multiselect, default `Planejada, Pendente, Desenvolvendo` | chip `3 status` |
| Usuário (só gestor) | select filtrável, placeholder `Todos os usuários` | `Bruno Lima` |
| Período de criação | datepicker range | `01/07/2026 – 10/07/2026` |

À direita dos campos:
- **Chip-toggle `Minhas atividades`** (só gestor): 1 clique aplica `usuarioId = eu`; ativo = fundo primário suave.
- **Chip de contexto removível** quando a tela chega com `?demandaId`: `Demanda: Tela de extrato ✕`.
- Botão texto `Limpar filtros (3)` — **só aparece** com algum filtro fora do default; o número conta os filtros ativos.

Comportamento: todos os filtros são serializados na URL (`/atividade?busca=extrato&status=DESENVOLVENDO&usuarioId=7`) e restaurados ao voltar. Busca com debounce 400ms.

## 4. Tabela ③④

p-table lazy, paginator 10/25/50, report `Mostrando 1 a 10 de 42 atividades`. Colunas (gestor):

`[✓] | Projeto | Demanda | Atividade | Usuário | Status | Tempo | Tags | Ações`

- **[✓] Checkbox de seleção** (gestor): marca linhas para a barra de ações em massa (§4.1).
- **Projeto:** texto. Ex.: `Portal do Cliente`, `App Financeiro`.
- **Demanda:** nome + **um único indicador de documentos**: ícone `pi-file` com até 3 pontinhos coloridos (azul = descrição do cliente, índigo = técnica, ciano = documentação; apenas os existentes). Clique abre popover com as 3 entradas nomeadas (`Descrição do cliente`, `Descrição técnica`, `Documentação` — as vazias em muted com sufixo `— vazio`); clicar numa abre o dialog de leitura em **56rem, máx. 80vh** (não mais 95vw), com botão `Editar` no rodapé para técnica/doc quando permitido. Ex. de demandas: `Tela de extrato`, `Implementar módulo de login`, `Exportação de relatórios`.
- **Atividade:** nome, link-style (clique = abre Visualizar, mesmo destino do olho). Ex.: `Corrigir cálculo de juros do extrato`, `Criar endpoint de autenticação`, `Testes E2E do fluxo de login`.
- **Usuário (só gestor):** avatar de iniciais + nome. Ex.: `AS Ana Souza`, `BL Bruno Lima`, `CM Carla Mendes`.
- **Status:** p-tag clicável com chevron (mantido — já é ótimo): `Planejada` (cinza), `Pendente` (âmbar), `Desenvolvendo` (azul), `Desenvolvida` (verde). Popover com as 4 opções + check na atual. **Troca é otimista**: a tag muda na hora, sem reload; rollback + toast de erro se falhar. Durante execução ativa: tag estática com tooltip `Status bloqueado durante execução em andamento`.
- **Tempo:** `12h 30min` com tooltip `750 minutos`.
- **Tags:** chips coloridos (`Backend` azul, `Urgente` vermelho, `Frontend` verde, `Refatoração` roxo). Célula clicável (quem pode editar): abre **popover de tags inline** com os chips selecionáveis e salvamento ao fechar (update in-place já existente).
- **Ações (2 botões + kebab):**
  - `▶ / ⏸` Play/Pause — botão maior (2.25rem), primário-suave. Quando o status não permite iniciar: **disabled com tooltip** `Mude o status para Planejada ou Desenvolvendo para iniciar` (em vez de sumir). Pause sempre disponível com execução ativa.
  - `👁 Visualizar` — abre dialog §7.
  - `⋮` kebab: `pi-tag Atribuir tags` (abre o mesmo popover), `pi-calendar-plus Registrar execução` (gestor), `pi-trash Excluir` (gestor, vermelho).

### 4.1 Barra de ações em massa (gestor)
Ao marcar ≥1 checkbox, barra flutuante ancorada na base da tabela: `3 selecionadas — [Mudar status ▾] [Atribuir tags] [Excluir] [✕]`.

### 4.2 Exclusão com undo ⑤
Excluir (linha ou massa) **não abre confirm**: remove otimisticamente e mostra toast bottom-center `Atividade "Testes E2E do fluxo de login" excluída · [Desfazer]` por 6s. Desfazer restaura a linha (soft delete garante reversibilidade).

### 4.3 Estados
- **Carregando:** skeleton de 8 linhas (shimmer nas células), paginator visível.
- **Vazio sem filtros:** ícone pi-list grande + `Nenhuma atividade ainda` + subtexto `Crie a primeira atividade para começar a registrar o trabalho.` + **botão primário `+ Nova Atividade`**.
- **Vazio com filtros:** `Nenhuma atividade corresponde aos filtros` + botões `Limpar filtros` (outlined) e `+ Nova Atividade` (texto).

## 5. Atalhos de teclado ⑥
`/` foca a busca · `N` abre Nova Atividade · `Esc` fecha dialogs/popovers · `Enter` submete o formulário do dialog aberto · `Ctrl+Enter` submete a partir de textareas.

---

## 6. Dialog "Nova Atividade" (40rem) — sobre a página com overlay escurecido (rgba preto 40%)

Header: `Nova Atividade` + ✕. Corpo:
1. `Nome *` — input, **autofocus**, dica de caracteres proibidos abaixo. Ex. digitado: `Ajustar máscara de CPF no cadastro`.
2. `Demanda *` — select filtrável `Portal do Cliente — Tela de extrato`. Pré-selecionada quando a tela está filtrada por demanda (chip §3).
3. Linha: `Usuário` (gestor; **placeholder `Meu próprio usuário` = default eu**, ex. selecionado `Bruno Lima`) · `Status *` (default `Desenvolvendo`).
4. `Tags` — chips clicáveis (`Backend`, `Frontend`, `Urgente`, `Refatoração`), estado ativo preenchido com a cor.
5. `Descrição` — textarea 5 linhas + assistente de descrição IA (componente existente).

Footer: `Cancelar` (texto) · `Criar` (primário, ícone check, loading no submit). **Enter em qualquer input submete.** Após criar: dialog fecha, linha nova entra no topo da lista com highlight suave de 2s, toast `Atividade criada com sucesso`.

## 7. Dialog "Visualizar atividade" (46rem) — sobre a página escurecida ⑦

**Header:** nome `Corrigir cálculo de juros do extrato` + lápis (gestor, edição inline com check/✕ e Enter para salvar, autofocus no input).

**Linha de contexto (novo):** `Portal do Cliente · Tela de extrato` (muted, com ícone pi-folder) — dados já disponíveis na linha que abriu o dialog.

**Linha de infos:** avatar `BL Bruno Lima` · `3ª atividade` · **seletor de status inline** (mesma tag+chevron+popover da tabela, não mais somente leitura) · **`Tempo total: 12h 30min`** (novo, ícone pi-clock).

**Tags:** chips coloridos + botão fantasma `+ editar` que abre o mesmo popover de tags inline (§4).

**Abas:**
- `Descrição` — **modo leitura por padrão**: HTML renderizado do Quill, com botão `Editar` no canto (visível só para quem pode alterar). Ao editar: Quill + `Salvar` / `Cancelar`. Vazio: `Sem descrição` + botão `Adicionar descrição`.
- `Últimas execuções` — lista `09/07/2026 · 2h 15min — Ajuste da fórmula de juros compostos`, `08/07/2026 · em andamento — Revisão dos testes de borda` (em andamento em azul). Vazio: `Nenhuma execução registrada.`

**Footer (novo):** botão primário contextual `▶ Iniciar execução` ou `⏸ Encerrar execução` (respeitando permissão/status) — agir sem sair do detalhe. À esquerda, texto muted `Criada em 02/07/2026`.

## 8. Dialog "Iniciar / Encerrar execução" (42rem) — sobre a página escurecida

Contexto no topo: `Portal do Cliente · Corrigir cálculo de juros do extrato` + avatar do dono (gestor).

- `O que você vai desenvolver? *` (iniciar) / `Revise a descrição da execução` (encerrar; pré-preenchida) — textarea com **autofocus** e `Ctrl+Enter` para confirmar. Opcional quando o dono é gestor.
- `Últimas execuções desta atividade` — cada item ganha botão fantasma **`↩ Usar esta descrição`** ⑧ que copia o texto para o textarea (1 clique substitui toda a digitação em retomadas). Ex.: `09/07 · 2h 15min — Ajuste da fórmula de juros compostos [↩ Usar]`.

Footer: `Cancelar` · `Iniciar` (pi-play) ou `Encerrar` (pi-stop). Ao iniciar, o banner §2 aparece imediatamente (otimista).

## 9. Dialog "Registrar execução" (gestor, 42rem) — sobre a página escurecida

Contexto + avatar como §8. Campos:
1. **Chips de duração rápida (novo):** `30min · 1h · 2h · 4h · Manhã (9h–12h)` — clicar preenche `Início`/`Fim` retroativamente a partir de agora (ou do período nomeado de hoje).
2. Linha: `Início *` (**default: agora − 1h**) · `Fim *` (**default: agora**) — datepickers com hora para ajuste fino; validação `O fim deve ser posterior ao início`.
3. `Descrição *` — textarea com autofocus (mantido) + assistente IA.

Footer: `Cancelar` · `Registrar` (pi-calendar-plus). Fluxo típico: 1 chip + descrição + Registrar = 3 cliques.

---

## Callouts numerados do mockup

① **Banner de execução ativa com cronômetro e Encerrar em 1 clique** — a regra "uma execução por vez" agora é visível; nada de caçar a linha na paginação.
② **Filtros persistentes na URL + chips `Minhas atividades` e contexto de demanda** — voltar à tela custa 0 cliques de refiltragem.
③ **Coluna Ações enxuta: Play/Pause grande + Visualizar + kebab** — a ação nº 1 é óbvia; raras ficam no ⋮; play impossível vira disabled com tooltip que ensina a regra.
④ **Status e tags editáveis inline com update otimista** — a tag muda na hora, sem reload nem perda de scroll; tags em popover, sem dialog.
⑤ **Excluir sem confirm, com toast "Desfazer"** — soft delete a favor do usuário: 1 clique, reversível por 6s.
⑥ **Registrar execução com chips de duração e datas pré-preenchidas** — de ~12 cliques para 3.
⑦ **Dialog Visualizar acionável** — projeto/demanda, tempo total, status inline, tags editáveis e Play/Pause no footer; descrição em modo leitura com Editar (disclosure progressivo).
⑧ **"Usar esta descrição" nas últimas execuções** — retomar o trabalho de ontem sem digitar nada.
