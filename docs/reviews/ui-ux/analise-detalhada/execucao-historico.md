# Execuções — histórico diário + dialog "Relatório de Execuções" (com revisão por IA) (/execucao)

## Fluxos atuais
- **Ver minhas execuções de hoje (dev ou gestor)** (1 cliques): Clicar 'Execuções' na topbar → lista já carrega o dia atual com defaults corretos (bom).
- **Ver execuções de ontem (já na tela)** (1 cliques): Clicar no chevron ◀. Não há atalho de teclado.
- **Ver um dia arbitrário (ex.: 15/06)** (3 cliques): Clicar no campo de data → navegar 1 mês para trás → clicar o dia. Estado não persiste (F5 volta para hoje).
- **Gestor: filtrar execuções de um usuário específico** (2 cliques): Abrir o select 'Usuário' → rolar lista de até 100 nomes SEM campo de busca → clicar o nome. Refazer a cada visita (não persiste).
- **Gestor: corrigir a descrição de uma execução** (2 cliques): Mirar no ícone de lápis pequeno no fim da linha → dialog abre com textarea focada (bom) → digitar → clicar Salvar.
- **Gestor: ajustar horário de fim de uma execução** (5 cliques): Lápis → clicar no campo Fim → ajustar hora/minuto/segundo nos spinners do datepicker (2 a 4 interações) → Salvar. Erro 'fim antes do início' só aparece como toast APÓS clicar Salvar.
- **Ver detalhes da atividade de uma execução** (1 cliques): Clicar no nome da atividade (link) → abre dialog de visualização da atividade (bom padrão de ação inline).
- **Gestor: pré-visualizar relatório mensal de um projeto (estando em /execucao)** (5 cliques): Topbar 'Projetos' → localizar e clicar o projeto (1–2 cliques) → botão 'Relatório' → dialog abre com mês atual pré-selecionado mas VAZIO → clicar 'Pré-visualizar'. Duas trocas de tela + 5 cliques.
- **Gestor: baixar CSV do relatório do mês** (6 cliques): Mesmo caminho do preview + clicar 'Baixar CSV'.
- **Gestor: revisar relatório com IA** (0 cliques): Impossível hoje — botão desabilitado ('Em breve'), apesar de o endpoint e os DTOs existirem.
- **Voltar para hoje / atualizar lista** (1 cliques): Botão 'Hoje' (1 clique) ou refresh manual (1 clique); há auto-refresh ao refocar a janela (bom).

## Problemas
- [ALTA] P1: Relatório inacessível do próprio contexto: o gestor que está olhando execuções precisa sair da tela (Projetos → detalhe do projeto → Relatório) para gerar o relatório do que está vendo. São 2 trocas de tela e 3–4 cliques só para chegar ao dialog.
- [ALTA] P2: Dialog de relatório abre vazio mesmo com defaults 100% válidos (Mensal + mês/ano atuais): o clique em 'Pré-visualizar' é obrigatório e sempre desperdiçado. Pior: ao trocar período depois de um preview, o resultado antigo continua na tela sem nenhuma marca de obsoleto — risco de leitura errada e de baixar CSV de período diferente do exibido.
- [ALTA] P3: Ruído de dados repetidos: as colunas Início/Fim mostram a data (dd/MM/yy) em TODAS as linhas, mas a tela é sempre de um único dia — a data é idêntica em todas e igual à do filtro. Custo de leitura alto, densidade desperdiçada.
- [MEDIA] P4: Execução 'Em andamento' (o dado mais quente para o gestor: quem está trabalhando agora) aparece como texto pequeno na coluna Fim, sem destaque de linha, sem duração ao vivo (o helper segundosDecorridos/formatarRelogio já existe no módulo) e sem prioridade de ordenação.
- [MEDIA] P5: Select de usuário (gestor) sem busca digitável ([filter]) com até 100 usuários — obriga scroll; sem default inteligente e sem persistência (URL/localStorage): o filtro é refeito a cada visita, e F5 zera data e usuário.
- [MEDIA] P6: Sem atalhos de teclado: ← / → para trocar de dia e tecla para 'Hoje' não existem, embora navegação de dia seja a interação mais frequente da tela.
- [MEDIA] P7: Empty state não acionável: apenas o texto 'Nenhuma execução encontrada para este dia.' — não oferece 'Ver dia anterior', 'Voltar para hoje' nem 'Limpar filtro de usuário' quando é o filtro que esvazia a lista.
- [MEDIA] P8: Edição exige mirar num ícone de lápis pequeno na última coluna; a descrição (campo mais editado) não é clicável nem tem affordance de edição. Validação 'fim > início' só ao submeter e via toast bottom-center, longe dos campos.
- [MEDIA] P9: Botão 'Revisar com IA' permanentemente desabilitado ('Em breve') ocupa posição de destaque no dialog — affordance morta; o endpoint POST /relatorio/execucao/revisar e os DTOs (RelatorioRevisaoDto, RelatorioInconsistenciaDto) já existem no backend.
- [BAIXA] P10: Coluna Descrição quebra livremente até 360px — execuções com descrições longas criam linhas de alturas muito díspares, dificultando o scan vertical; não há line-clamp com tooltip/expansão.
- [BAIXA] P11: Hierarquia da toolbar dispersa: 5 controles de navegação de dia com o mesmo peso visual (todos secondary/outlined), 'Hoje' sempre visível mesmo desabilitado, refresh manual redundante com o auto-refresh no focus; filtro de usuário isolado no canto oposto.
- [BAIXA] P12: Cabeçalho da página sem contexto: não informa o dia em exibição por extenso, quantidade de execuções nem o total de horas (que só aparece no rodapé da tabela, após scroll em listas longas).
- [BAIXA] P13: No dialog de relatório: botão 'Fechar' no rodapé redundante com o X/Esc/clique-fora; inconsistências da IA sem ordenação por severidade nem contadores-resumo; totais em texto simples no rodapé em vez de destaque visível.
- [BAIXA] P14: Paginador da tabela sempre visível (opções 50/100/200) mesmo quando o dia tem meia dúzia de execuções — ruído; e a troca de página dispara refetch sem preservar posição de leitura.

## Sugestões (VERIFICAR: checar vs regras de negócio)
### S1 — Botão 'Relatório' no cabeçalho de /execucao + select de Projeto dentro do dialog [impacto alto]
Adicionar (gestor) o botão 'Relatório' no header da tela, abrindo o mesmo relatorio-execucao-dialog com um p-select 'Projeto' (com busca) como primeiro campo — pré-selecionado quando aberto do detalhe do projeto, obrigatório quando aberto daqui. Usa apenas endpoints existentes (listar projetos + GET /relatorio/execucao com projetoId).
_Redução de esforço:_ de 5 cliques + 2 trocas de tela para 2 cliques sem sair da tela

### S2 — Auto-preview no dialog de relatório (e invalidação do resultado obsoleto) [impacto alto]
Gerar o preview automaticamente ao abrir (defaults já são válidos: Mensal/mês atual) e a cada mudança de filtro (debounce ~400ms). O botão 'Pré-visualizar' desaparece; 'Baixar CSV' vira a ação primária. Enquanto recarrega, o resultado antigo fica com opacity reduzida + skeleton, eliminando o risco de ler/baixar período errado.
_Redução de esforço:_ elimina 1 clique obrigatório em 100% dos usos do dialog e o estado obsoleto

### S3 — Só hora nas colunas Início/Fim + linha ativa destacada com duração ao vivo [impacto alto]
Mostrar apenas HH:mm (a data é sempre a do filtro; exibir '09/07 23:40' em cinza somente quando cruzar a meia-noite). Execução sem fimData: linha fixada no topo, fundo primário sutil, tag verde 'Em andamento' com ponto pulsante e duração ao vivo via segundosDecorridos()/formatarRelogio() já existentes no módulo.
_Redução de esforço:_ leitura instantânea de quem está ativo agora; ~40% menos ruído por linha

### S4 — Persistência de filtros na URL + select de usuário com busca e atalho 'Minhas' [impacto medio]
Refletir data e usuarioId em query params (?data=2026-07-09&usuario=12) para F5/link compartilhável; adicionar [filter]='true' no select de usuário e um chip 'Minhas execuções' que aplica o usuário logado em 1 clique (gestor).
_Redução de esforço:_ de 2 cliques + scroll em lista de 100 nomes para 1 clique; 0 retrabalho após F5

### S5 — Atalhos de teclado ← / → / Home para navegar dias [impacto medio]
HostListener global na página: ArrowLeft = dia anterior, ArrowRight = próximo (bloqueado em hoje), Home ou tecla H = hoje. Tooltips dos chevrons passam a exibir a tecla ('Dia anterior (←)'). Ignorar quando o foco está em input/dialog aberto.
_Redução de esforço:_ de 1 clique por dia navegado para 0 (tecla); revisão de uma semana: 7 teclas vs 7 cliques precisos

### S6 — Edição no ponto de decisão: célula de descrição clicável + validação inline [impacto medio]
Para gestor, a célula Descrição inteira vira alvo clicável (cursor pointer + ícone lápis no hover da linha) abrindo o dialog de edição já focado na descrição. A regra 'fim > início' passa a validar no formulário (mensagem vermelha sob o campo Fim, botão Salvar desabilitado) em vez de toast pós-submit. Ctrl+Enter salva.
_Redução de esforço:_ alvo ~20x maior que o ícone atual; erro de período detectado antes do clique em Salvar (economiza 1 ciclo submit-erro-corrigir)

### S7 — Empty state acionável [impacto medio]
Trocar o texto puro por: ícone de calendário + 'Nenhuma execução em 09/07/2026' + botões '◀ Ver dia anterior' e 'Voltar para hoje'; quando houver filtro de usuário ativo, acrescentar 'Limpar filtro de usuário' e informar qual filtro está esvaziando a lista.
_Redução de esforço:_ próxima ação provável a 1 clique dentro do próprio vazio, sem reorientar o olhar para a toolbar

### S8 — Habilitar 'Revisar com IA' + apresentação priorizada dos achados [impacto medio]
Ativar o botão (endpoint já existe) e apresentar a revisão com: contadores por severidade (ex.: '1 ALTA · 2 MÉDIAS'), lista ordenada ALTA→BAIXA, e resumo da IA em destaque. Remover o botão 'Fechar' do rodapé do dialog (X/Esc/clique-fora bastam) e promover os totais a stat-tiles no topo do resultado.
_Redução de esforço:_ libera funcionalidade hoje inacessível; achados críticos visíveis sem varrer a lista

### S9 — Chips de período rápido no relatório [impacto medio]
Acima dos selects, chips de 1 clique: 'Este mês' (default ativo), 'Mês passado', 'Este ano', 'Personalizado…' (revela o range). Os selects Ano/Mês ficam como ajuste fino em disclosure progressivo. Combinado com o auto-preview, trocar de período vira 1 clique total.
_Redução de esforço:_ 'mês passado' passa de 3 interações (select período→ano→mês) para 1 clique

### S10 — Cabeçalho com contexto do dia e toolbar consolidada [impacto baixo]
Subtítulo sob o título: 'Quinta-feira, 10 de julho de 2026 · 5 execuções · 12h24' (dados já disponíveis: totalRegistros + totalMinutosDia). Agrupar ◀ [data] ▶ como um segmented control único; 'Hoje' aparece apenas quando fora de hoje; refresh vira ícone discreto. Total do dia visível sem scroll.
_Redução de esforço:_ total do dia e contexto a 0 interações (antes: scroll até o rodapé da tabela)


## REDESIGN SPEC
# Redesign — Execuções (/execucao) + Dialog "Relatório de Execuções"

Sistema interno Project 2.0 · PrimeNG (tema Aura, primário azul) + Tailwind · tema claro/escuro · toasts em bottom-center. Perfil retratado no mockup: **GESTOR** (vê coluna Usuário, filtro de usuário, edição e Relatório). Data de referência: **quinta-feira, 10/07/2026**.

---

## VISÃO 1 — Página de fundo (histórico do dia)

Container com padding 24px, largura fluida.

### Região A — Cabeçalho da página
- **Esquerda:** título `Execuções` (1.5rem, semibold, cor primária). Logo abaixo, subtítulo em texto muted (0.875rem): `Quinta-feira, 10 de julho de 2026 · 5 execuções · 12h24 no dia` — contexto e total do dia visíveis sem scroll (dados de `totalRegistros` + `totalMinutosDia`).
- **Direita (só gestor):** botão `Relatório` (ícone `pi pi-file`, severidade primária outlined). **① Abre o dialog de relatório direto desta tela** — antes exigia navegar Projetos → detalhe do projeto.

### Região B — Toolbar de filtros (uma linha, abaixo do cabeçalho)
Da esquerda para a direita:
1. **Filtro Usuário (só gestor):** `p-select` com **busca digitável embutida** ([filter]), placeholder `Todos os usuários`, com X para limpar, largura ~240px. Ao lado, chip-botão `Minhas` que aplica o usuário logado em 1 clique.
2. **Espaço flexível.**
3. **Navegação de dia** como grupo único (segmented): `[◀]` `[ 10/07/2026 📅 ]` `[▶]` — o campo central abre o datepicker (maxDate = hoje); ▶ desabilitado quando em hoje. Tooltips com atalhos: `Dia anterior (←)`, `Próximo dia (→)`.
4. Botão `Hoje` **aparece somente quando o dia exibido ≠ hoje** (texto + ícone `pi pi-calendar`).
5. Ícone refresh discreto (text button) com spinner durante carregamento.

Estado persistido na URL: `?data=2026-07-10&usuario=3`. **④ Atalhos de teclado:** `←`/`→` trocam o dia, `Home` volta para hoje (ignorados com dialog aberto ou foco em input).

### Região C — Tabela de execuções
`p-table` com hover de linha. Colunas (gestor):

| Usuário | Projeto | Demanda | Atividade | Início | Fim | Duração | Descrição |
|---|---|---|---|---|---|---|---|

Regras de renderização:
- **Início/Fim: apenas hora `HH:mm`** (semibold). **③ A data não se repete linha a linha** — ela já está no filtro/subtítulo. Exceção: execução que cruza a meia-noite mostra a data pequena em muted antes da hora (ex.: `09/07 23:40`).
- **Atividade** é link azul (abre o dialog de visualização da atividade — comportamento mantido).
- **Descrição:** line-clamp de 2 linhas + tooltip com texto completo. Para gestor, a célula inteira é clicável (cursor pointer) e um ícone de lápis aparece no hover da linha, à direita — **⑤ edição no ponto de decisão**, sem coluna "Ações" dedicada.
- **Linha ativa (fimData = null):** fixada no topo da lista, fundo primário sutil (~8% opacidade), tag verde `● Em andamento` com ponto pulsante na coluna Fim e **duração ao vivo `02:41:12`** (contador HH:mm:ss no cliente) na coluna Duração.
- Paginador só aparece com mais de 50 registros.

**Dados de exemplo (5 linhas):**

| Usuário | Projeto | Demanda | Atividade | Início | Fim | Duração | Descrição |
|---|---|---|---|---|---|---|---|
| Ana Souza | Portal do Cliente | Cadastro de clientes | Implementar validação de CPF | 13:05 | ● Em andamento | 02:41:12 (ao vivo) | Validação de dígitos verificadores e máscara no formulário |
| Bruno Lima | Portal do Cliente | API de autenticação | Testes de integração OAuth | 09:02 | 12:15 | 3h13 | Cobertura dos fluxos de refresh token e expiração |
| Carla Mendes | App de Vendas | Dashboard de métricas | Ajustar layout responsivo | 08:30 | 11:47 | 3h17 | Grid quebrando em telas menores que 1280px |
| Diego Rocha | Integração ERP | Sincronização de pedidos | Mapear campos do pedido | 10:12 | 12:00 | 1h48 | De-para dos campos de item e frete com o ERP |
| Bruno Lima | Portal do Cliente | API de autenticação | Revisão de código do PR #142 | 14:00 | 15:25 | 1h25 | Ajustes de segurança apontados na revisão |

**Rodapé da tabela:** `Total do dia` alinhado à direita + valor `12h24` em destaque primário (bold).

### Estados da Região C
- **Carregando:** skeleton de 6 linhas (barras cinza animadas respeitando as larguras das colunas); toolbar permanece interativa.
- **Vazio:** **⑥ empty state acionável** — ícone `pi pi-calendar` grande em muted, texto `Nenhuma execução em 09/07/2026`, e abaixo dois botões: `◀ Ver dia anterior` (outlined) e `Voltar para hoje` (text). Se houver filtro de usuário ativo, linha extra: `Filtro ativo: Bruno Lima` + botão `Limpar filtro`.
- **Com dados:** conforme tabela acima.

### Dialog secundário — "Editar execução" (gestor, 34rem)
Mantido, com ajustes: campos `Início` e `Fim` lado a lado (datepicker com hora), `Descrição` (textarea, foco automático ao abrir — mantido). **Validação inline:** se Fim ≤ Início, mensagem vermelha sob o campo Fim (`O fim deve ser posterior ao início`) e Salvar desabilitado — sem toast pós-submit. Rodapé: `Cancelar` (text) + `Salvar` (primário). `Ctrl+Enter` salva, `Esc` fecha.

---

## VISÃO 2 — Dialog "Relatório de Execuções" (estado principal do mockup)

**A página da Visão 1 fica ao fundo, escurecida por backdrop `rgba(0,0,0,0.4)`.** Dialog centrado, 920px, cantos arredondados, header `Relatório de Execuções` + botão X. **Sem botão "Fechar" no rodapé** (X, Esc e clique fora bastam).

### Linha 1 — Contexto e período
- **Projeto:** `p-select` com busca, valor `Portal do Cliente`. Pré-selecionado quando o dialog vem do detalhe do projeto; selecionável quando aberto da tela de Execuções (**①**).
- **Chips de período rápido (②):** `[ Este mês ]` (ativo, preenchido azul) `[ Mês passado ]` `[ Este ano ]` `[ Personalizado… ]`. Os selects `Ano`/`Mês` aparecem como ajuste fino somente quando um chip mensal/anual está ativo; `Personalizado…` revela o range datepicker (dd/mm/aa – dd/mm/aa).

### Linha 2 — Ações
- `Baixar CSV` (primário, ícone `pi pi-download`) — ação principal, pois **② o preview é automático**: carrega ao abrir (defaults: Este mês) e recarrega a cada mudança de filtro com debounce; durante o refetch o resultado fica com opacidade 50% + barra de progresso fina, nunca exibindo dados obsoletos como atuais.
- `Revisar com IA` (ícone `pi pi-sparkles`, severidade help outlined) — **habilitado** (endpoint existente).

### Região Resultado (carregada automaticamente)
- **Stat-tiles (3 cartões horizontais):** `Período — Junho/2026` · `Execuções — 47` · `Tempo total — 182h20`.
- **Tabela compacta** (scroll interno 320px): colunas `Demanda | Atividade | Usuário | Início | Fim | Tempo | Descrição`. Linhas de exemplo:
  - Cadastro de clientes · Implementar validação de CPF · Ana Souza · 03/06/2026 09:10 · 03/06/2026 12:02 · 2h52 · Máscara e validação no formulário
  - API de autenticação · Testes de integração OAuth · Bruno Lima · 12/06/2026 08:00 · 12/06/2026 19:30 · 11h30 · ajustes
  - Dashboard de métricas · Gráfico de horas por demanda · Carla Mendes · 19/06/2026 10:00 · 19/06/2026 13:15 · 3h15 · Série temporal com totais diários
- **Estado vazio do resultado:** `Nenhuma execução encontrada no período.` + sugestão `Tente ampliar o período` com chip `Este ano` inline.
- **Estado carregando:** skeleton nos tiles e 4 linhas fantasma na tabela.

### Região Revisão por IA (após clicar "Revisar com IA")
Painel separado por borda superior, título `✦ Revisão por IA` + **contadores por severidade: `1 ALTA · 1 MÉDIA · 1 BAIXA`** (③ da lista de callouts abaixo — achados priorizados).
- **Resumo (parágrafo):** `O período apresenta 47 execuções consistentes no geral, com três pontos de atenção: uma jornada acima de 11h sem pausa, descrições genéricas recorrentes e um registro em dia não útil.`
- **Cards de inconsistência, ordenados ALTA → BAIXA:**
  1. Tag vermelha `ALTA` · tipo `DURACAO_SUSPEITA` · `Execução de 11h30 sem pausa registrada em 12/06 — acima da jornada esperada.` · ref monospace `API de autenticação / Testes de integração OAuth / 12/06/2026`
  2. Tag amarela `MEDIA` · tipo `DESCRICAO_VAGA` · `3 execuções com descrição "ajustes" não permitem auditoria do trabalho realizado.` · ref `API de autenticação / Bruno Lima`
  3. Tag cinza `BAIXA` · tipo `DIA_NAO_UTIL` · `Execução registrada em 19/06 (feriado de Corpus Christi).` · ref `Dashboard de métricas / 19/06/2026`

---

## Callouts numerados do mockup
- **① Relatório sem sair da tela** — botão `Relatório` no header de /execucao abre o dialog com select de Projeto; antes: 5 cliques e 2 telas, agora 2 cliques.
- **② Preview automático + chips de período** — o dialog abre já carregado (Este mês); trocar para "Mês passado" é 1 clique e recarrega sozinho; `Baixar CSV` promovido a ação primária.
- **③ Linha ativa em destaque + só horas** — execução em andamento fixada no topo com tag pulsante e cronômetro ao vivo; colunas Início/Fim sem data repetida.
- **④ Navegação de dia por teclado e URL** — ←/→/Home, estado em query params, `Hoje` só aparece quando faz sentido.
- **⑤ Edição no ponto de decisão** — célula de descrição clicável com lápis no hover; validação de período inline no dialog de edição.
- **⑥ Empty state acionável** — vazio oferece `Ver dia anterior`, `Voltar para hoje` e `Limpar filtro` em vez de texto morto.

## Restrições respeitadas (backend)
- Listagem continua por **dia único + usuário** (`ExecucaoListarDto`: data, usuarioId, paginação) — nenhum filtro de intervalo foi inventado na página; visão de período permanece no relatório.
- Relatório continua **por projeto** (`projetoId` obrigatório) com períodos ANUAL/MENSAL/CUSTOM (`RelatorioPeriodoTipoEnum`) e download **CSV** (`RelatorioFormatoEnum`).
- Revisão IA usa exatamente `RelatorioRevisaoDto { resumo, inconsistencias[{tipo, severidade, descricao, referencia}] }` — sem links clicáveis para linhas (referencia é texto livre).
- Edição de execução permanece exclusiva do gestor (`ExecucaoAlterarDto`: descricao, inicioData, fimData opcional/null para manter em andamento). Duração ao vivo usa helpers já existentes em `execucao.model.ts`.
