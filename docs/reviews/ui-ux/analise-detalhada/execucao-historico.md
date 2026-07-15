# Execuções — histórico diário + dialog "Relatório de Execuções" (com revisão por IA) (/execucao)

> ✅ Sugestões verificadas adversarialmente contra o código e as regras de negócio.

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

## Sugestões aprovadas na verificação
### S1 — Botão 'Relatório' no header de /execucao (gestor) + select de Projeto dentro do dialog [impacto alto]
Confirmado no código: hoje o dialog só abre a partir do detalhe do projeto (projeto-detalhe.page.html:46, `relatorioDialog.abrir(projeto()!.id)`) e `abrir(projetoId)` exige o id (signal projetoId). Todos os endpoints /relatorio são @GestorOnly, então o botão no header de /execucao deve ficar sob `@if (sessao.eGestor())`. Refatorar para `abrir(projetoId?: number)`: com id, o p-select 'Projeto' (com [filter]) abre pré-selecionado; sem id, é o primeiro campo, obrigatório. Fonte de dados: ProjetoService.listar — não existe allRows em ProjetoListarDto, carregar com itensPorPagina alto (mesmo padrão já usado com usuários na página). Sem projeto selecionado, a área de resultado exibe 'Selecione um projeto' e o auto-preview (S2) não dispara.
_Redução de esforço:_ gerar relatório a partir de /execucao cai de ~4-5 cliques + 2 navegações (Projetos → detalhe → Relatório) para 2 cliques sem sair da tela

### S2 — Auto-preview no dialog de relatório + invalidação do resultado e da revisão obsoletos [impacto alto]
Problema confirmado: mudar filtros hoje mantém o preview antigo na tela (o signal `relatorio` não é limpo ao trocar período; só `revisao` é limpa, e apenas dentro de preVisualizar()) — dá para ler/baixar achando ser outro período. Gerar preview ao abrir (o reset do form já é MENSAL/ano/mês atuais, válidos) e a cada mudança válida de filtro com debounce ~400ms e switchMap (cancela o request anterior — GET /relatorio/execucao é a mesma query do preview manual). Não disparar com projeto ausente (abertura via /execucao) nem com CUSTOM incompleto (validador `periodoIncompleto` já existe). Durante refetch: resultado com opacidade reduzida + indicador de progresso. Remover 'Pré-visualizar'; 'Baixar CSV' vira ação primária. A revisão IA também é limpa a cada mudança de filtro.
_Redução de esforço:_ elimina 1 clique obrigatório em 100% dos usos do dialog e o estado obsoleto entre filtro e resultado

### S3 — Só hora em Início/Fim + linhas ativas fixadas no topo com duração ao vivo [impacto alto]
Hoje cada célula empilha data dd/MM/yy + hora, e a duração da execução ativa vem congelada do fetch (SQL usa COALESCE(fim_data, NOW()) no momento da consulta). Correções sobre a proposta: (1) a listagem filtra por DATE(inicio_data) = dia (execucao.repository:223), logo o Início é sempre do dia filtrado — a data pequena em muted só se aplica à coluna Fim, quando DATE(fim) ≠ DATE(início), caso raro possível apenas via edição/registro manual do gestor (o cron auto-stop encerra tudo às 23:59:59). (2) Pode haver VÁRIAS linhas 'Em andamento' simultâneas na visão do gestor (a unicidade é por usuário) — fixar todas no topo, client-side, dentro da página carregada (ordenação do backend é nome do usuário + início). (3) Linhas ativas só ocorrem com o dia = hoje; o cronômetro HH:mm:ss usa segundosDecorridos()/formatarRelogio() (confirmados em execucao.model.ts) + ticker de 1s a partir de inicioData, nunca somando sobre duracaoMinutos congelado. Tag verde com ponto pulsante substitui o texto simples atual na coluna Fim.
_Redução de esforço:_ quem está ativo agora e há quanto tempo fica legível a 0 interações; remove a data repetida em todas as linhas

### S4 — Filtros persistidos na URL + busca no select de usuário + chip 'Minhas' (gestor) [impacto medio]
Confirmado que nada existe: F5 reseta os filtros (estado só em signals, rota sem query params), o p-select de usuário não tem [filter] e carrega até 100 ativos (itensPorPagina: 100 — acima disso a lista trunca; a busca digitável mitiga mas não resolve a fonte). Refletir ?data=YYYY-MM-DD&usuario=ID via Router/ActivatedRoute, validando data ≤ hoje ao restaurar (coerente com o maxDate atual). Adicionar [filter]="true" no select e chip 'Minhas' que aplica sessao.id() — só para gestor: para desenvolvedor o backend já força usuarioId = próprio (execucao.service.ts, restricao por tipo) e o filtro nem é renderizado.
_Redução de esforço:_ achar um usuário passa de scroll em lista longa para digitação; filtrar-se a si próprio vira 1 clique; F5/link compartilhado preserva o contexto (hoje: retrabalho total)

### S5 — Atalhos de teclado ← / → / Home para navegar dias [impacto medio]
Não existe (os únicos HostListeners são visibilitychange/focus para refetch). Adicionar HostListener de keydown: ArrowLeft → retornarDia(), ArrowRight → avancarDia() (já bloqueado em hoje), Home → voltarParaHoje(). Padronizar apenas Home (descartada a alternativa 'tecla H' da proposta original — conflitaria com o campo de busca do select do S4). Guardas obrigatórias: ignorar com foco em input/textarea/select, com qualquer dialog aberto (edição E visualização de atividade) e com o overlay do datepicker aberto (as setas navegam o calendário do PrimeNG). Tooltips dos chevrons passam a exibir a tecla: 'Dia anterior (←)', 'Próximo dia (→)'.
_Redução de esforço:_ revisar N dias passa de N cliques precisos em botões pequenos para N teclas

### S6 — Célula de descrição clicável para editar (gestor) + validação de período inline [impacto medio]
Confirmado: hoje o único alvo é o lápis na coluna Ações e a regra fim > início só falha por toast pós-submit (execucao-historico.page.ts:218-225). Tornar a célula Descrição clicável para gestor (abrirEdicao já tem guarda eGestor), mantendo o lápis visível no hover da linha como affordance e não disparando o clique quando houver seleção de texto ativa (window.getSelection), para não impedir copiar a descrição; remover a coluna Ações. No dialog de edição: validador cross-field no FormGroup com mensagem 'O fim deve ser posterior ao início' sob o campo Fim e Salvar desabilitado nesse erro, espelhando também as regras do backend 'início/fim não podem estar no futuro' (maxDate do datepicker já cobre a maior parte). Ctrl+Enter submete; Esc já fecha. Manter edição gestor-only no front — nota: o endpoint PUT /execucao/:id permitiria dev editar a própria execução (restrição atual é de UI), mas ampliar isso é mudança de produto fora do escopo.
_Redução de esforço:_ alvo de clique passa do ícone (~2rem) para a célula inteira; erro de período detectado antes do submit, eliminando 1 ciclo submit-erro-corrigir

### S7 — Empty state acionável [impacto medio]
Confirmado: o vazio atual é texto puro ('Nenhuma execução encontrada para este dia.'). Novo: ícone pi pi-calendar em muted + 'Nenhuma execução em {data selecionada}' + botão '◀ Ver dia anterior' (retornarDia()). Correção sobre a proposta: 'Voltar para hoje' só aparece quando o dia exibido ≠ hoje (em hoje o botão seria inútil — hoje o equivalente da toolbar fica disabled). Com filtro de usuário ativo (só gestor), linha extra 'Filtro ativo: {nome}' + botão 'Limpar filtro' (patch usuarioId = null + aoMudarFiltro()), explicitando o que está esvaziando a lista.
_Redução de esforço:_ a próxima ação provável fica a 1 clique dentro do próprio vazio, sem reorientar o olhar para a toolbar

### S8 — Habilitar 'Revisar com IA' + achados priorizados por severidade [impacto medio]
Confirmado que é destravamento, não construção: POST /relatorio/execucao/revisar existe, é @GestorOnly e está implementado de ponta a ponta (cliente Anthropic, prompt, parse defensivo em relatorio.service.ts do backend); o frontend já tem service, signal `revisao` e render completo — o botão está apenas [disabled]="true" com tooltip 'Em breve'. Habilitar e adicionar: contadores por severidade e ordenação ALTA→MÉDIA→BAIXA normalizando com toUpperCase e agrupando valores fora do padrão ao final (severidade é string LIVRE no DTO — comentário explícito em RelatorioInconsistenciaDto; severidadeInconsistencia() já faz esse fallback para a cor). Sem API key configurada o backend lança BusinessException ('Recurso de IA não está configurado neste ambiente') — o toast padrão cobre o erro. Exibir nota de amostra quando totalExecucoes > 200 (backend envia no máximo 200 linhas à IA — LIMITE_LINHAS_IA). Remover 'Fechar' do rodapé exige acrescentar [dismissableMask]="true" ao p-dialog: hoje clique-fora NÃO fecha este dialog (X e Esc sim).
_Redução de esforço:_ libera funcionalidade pronta e hoje inacessível; achados críticos visíveis sem varrer a lista

### S9 — Chips de período rápido no dialog de relatório [impacto medio]
Mapeiam 1:1 para o backend (RelatorioPeriodoTipoEnum): 'Este mês' → MENSAL(ano/mês atuais — exatamente o default atual do form), 'Mês passado' → MENSAL com rollover janeiro → dezembro/ano-1, 'Este ano' → ANUAL(ano atual), 'Personalizado…' → CUSTOM revelando o range picker que já existe. Os selects Ano/Mês permanecem como ajuste fino em disclosure progressivo (necessários para períodos como 'junho/2024' ou 'ano de 2025' — capacidade que não pode ser perdida); editar Ano/Mês manualmente desmarca o chip ativo. Combinado com o auto-preview (S2), trocar de período vira 1 interação total.
_Redução de esforço:_ 'mês passado' cai de 2-3 interações (selects período/ano/mês) para 1 clique

### S10 — Subtítulo com contexto do dia + toolbar consolidada [impacto baixo]
Dados confirmados: totalRegistros (total do dia em todas as páginas) e totalMinutosDia são signals existentes, e o pipe minutosParagHoras formata o total. Correção obrigatória: o frontend NÃO registra locale pt-BR (nenhum registerLocaleData/LOCALE_ID no código) — 'Quinta-feira, 10 de julho' via DatePipe 'EEEE' sairia em inglês; registrar localePt no app.config ou formatar com arrays de nomes (padrão já usado em mesOpcoes/NOMES_MESES). Toolbar: agrupar ◀ [data] ▶ visualmente como grupo único; 'Hoje' oculto quando já se está em hoje (atualmente fica disabled ocupando espaço); refresh como text button discreto. O ganho não estético é real: o total do dia hoje só existe no rodapé da tabela, que com até 50 linhas por página exige scroll.
_Redução de esforço:_ contexto e total do dia a 0 interações (antes: scroll até o rodapé); demais mudanças são de hierarquia visual


## Ajustes de implementação apontados pelo verificador
1) Locale: o subtítulo 'Quinta-feira, 10 de julho de 2026' pressupõe locale pt-BR, mas o frontend não registra registerLocaleData(localePt)/LOCALE_ID em lugar nenhum — a spec deve exigir o registro no app.config (ou formatação manual com arrays de nomes, padrão já existente em mesOpcoes/NOMES_MESES). 2) Linha ativa: o mockup mostra UMA execução 'Em andamento', mas a regra de unicidade é POR USUÁRIO — na visão do gestor pode haver várias linhas ativas simultâneas (uma por usuário); a spec deve prever N linhas fixadas no topo, e registrar que a fixação é client-side dentro da página carregada (a ordenação do backend é nome do usuário + início). 3) Cruzamento de meia-noite: a listagem é por DATE(inicio_data) = dia filtrado, logo o INÍCIO é sempre do próprio dia — a data pequena em muted ('09/07 23:40') só pode ocorrer na coluna FIM (quando DATE(fim) ≠ DATE(início)), e só via edição/registro manual do gestor, pois o cron auto-stop encerra todas as execuções abertas às 23:59:59; corrigir a regra de renderização que a spec descreve como genérica. 4) 'Em andamento' + cronômetro ao vivo só existem quando o dia exibido = hoje (consequência do auto-stop na virada) — condicionar na spec; e o cronômetro deve partir de inicioData via segundosDecorridos(), nunca de duracaoMinutos (que vem congelado do fetch: COALESCE(fim_data, NOW()) na consulta SQL). 5) Dialog de relatório: para 'X, Esc e clique fora bastam' é preciso adicionar [dismissableMask]=\"true\" — hoje clique-fora NÃO fecha esse dialog. 6) Auto-preview: especificar que a revisão IA também é limpa/invalidada a cada mudança de filtro (hoje só é limpa dentro de preVisualizar()), que sem projeto selecionado (abertura via /execucao) o preview não dispara (estado 'Selecione um projeto') e que CUSTOM incompleto não dispara (validador periodoIncompleto existente); usar debounce + cancelamento do request anterior (switchMap). 7) Revisão IA: severidade é string LIVRE no DTO (RelatorioInconsistenciaDto: '\"BAIXA\" | \"MEDIA\" | \"ALTA\" (string livre nesta fase)') — os contadores '1 ALTA · 1 MÉDIA · 1 BAIXA' e a ordenação devem normalizar case e agrupar valores desconhecidos ao final; incluir nota de amostra quando totalExecucoes > 200 (o backend envia no máximo 200 linhas à IA — LIMITE_LINHAS_IA). 8) Select de Projeto do dialog: não existe listagem de projetos sem paginação (ProjetoListarDto só tem status/pagina/itensPorPagina, sem allRows) — a spec deve indicar a fonte: listar com itensPorPagina alto (padrão já usado com usuários) ou criar suporte a allRows. 9) Empty state: o botão 'Voltar para hoje' só deve aparecer quando o dia exibido ≠ hoje. 10) A afirmação 'Edição de execução permanece exclusiva do gestor' atribuída ao contrato está imprecisa: o endpoint PUT /execucao/:id NÃO é @GestorOnly (desenvolvedor pode alterar a própria execução; só é bloqueado nas de outros) — a exclusividade é decisão do frontend atual; manter, mas corrigir a justificativa na spec (restrição de UI, não de DTO/endpoint). 11) Validação inline do dialog de edição deve espelhar também 'início não pode estar no futuro' e 'fim não pode estar no futuro' (regras do ExecucaoService.alterar), além de 'fim > início'. 12) Atalhos de teclado: as guardas devem cobrir também o overlay do datepicker aberto (as setas navegam o calendário) e o dialog de visualização de atividade — não apenas 'input/dialog de edição'; padronizar somente Home (remover a alternativa 'tecla H' citada na sugestão original). 13) Chips de período: definir a sincronização — editar Ano/Mês manualmente desmarca o chip ativo, e 'Mês passado' em janeiro faz rollover para dezembro/ano-1.

## Especificação do redesign
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
