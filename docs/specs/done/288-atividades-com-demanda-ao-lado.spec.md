# 288-atividades-com-demanda-ao-lado.spec.md

> Task solta, na linha da `reduzir-dialogs` (modo Dividido, task 278). Origem: conversa com o autor em 2026-10-31, a partir do POC `288-atividades-com-demanda-ao-lado/poc.html` (artifact aprovado: lista encolhida à esquerda e demanda ao lado, cores das descrições derivadas do tema, ícones de status em quadradinho).

## Objetivo

Na tela de **Atividades**, abrir o texto da demanda (descrição do cliente, técnica ou documentação) deixa de ser um dialog por cima da lista: a lista **encolhe para a esquerda** e a demanda aparece **ao lado**, como na tela de Documentações. Na lista encolhida, prioridade e status continuam editáveis, num formato compacto. Junto, as três cores das descrições passam a acompanhar o tema com mais separação entre si.

## Entregáveis

1. **Modo dividido em `/atividade`.** Clicar num dos três ícones da linha (`app-atividade-documentos-indicador`) abre a demanda ao lado e **substitui o dialog "descrição da demanda"** de `atividade-listagem.page.html` (`abrirDescricaoDemanda`, `mostrarDialogDescricao` e o editor que ele carrega saem da página). O contêiner `app-modo-dividido` **não foi reusado** (decisão na implementação): ele é de altura fixa e coluna estreita fixa (16–24rem), e aqui a lista é uma `p-table` que rola com a página e tem a largura animada; a divisão é um `flex` da própria página, com o painel `app-atividade-demanda-painel` ao lado. O editor é o `app-demanda-descricao-editor` da 278.
2. **Comportamento do clique.** Clicar no ícone **já ativo** (mesma linha, mesma aba) fecha a visão e volta à lista completa. Clicar em outra aba da mesma linha troca a aba; em outra linha, troca a demanda mantendo a aba. Esc e o botão "Fechar" do painel também fecham. Com a demanda ao lado, clicar no **nome** de outra atividade passa a demanda dela para o painel, na mesma aba. Linha aberta fica realçada (`--app-realce-sutil`), o ícone ativo aceso.
3. **Lista encolhida (largura ~470 px, animada).** Somem as colunas Usuário, Tempo executado e Tags. A seleção em massa (gestor) fica. Cada linha mostra: nome da atividade, **bolinha de prioridade antes do nome** (cor da prioridade; nome no tooltip), **ícone do status** (tooltip com o nome) e a coluna de Ações (play e ⋮) no fim. A linha de baixo continua com os três ícones e "Projeto › Demanda". O cabeçalho "Atividade / Status / Ações" acompanha. Paginação compacta (anterior, página, próxima); os filtros ficam acima, em largura total.
4. **Prioridade e status editáveis nesse modo.** Clicar na bolinha abre o mesmo popover de prioridade de hoje (`abrirSeletorPrioridade`); clicar no ícone de status abre o popover de status (`abrirSeletorStatus`). Mesmas regras de permissão (`podeEditar`, `podeTrocarStatus`, bloqueio durante execução, tooltip do motivo). Sem chevron no modo compacto; o cursor e o tooltip dizem que é clicável.
5. **Ícones de status da atividade** (só no modo dividido; na tabela cheia continua o `p-tag` com o nome). Quadradinho de checklist, na cor do status: **Planejada** quadrado tracejado, cinza; **Pendente** quadrado com traço, âmbar (o `warn` de hoje); **Desenvolvendo** quadrado com play, na **cor do tema**; **Desenvolvida** quadrado preenchido com check, verde. Mapa único status → ícone/cor em `atividade.model.ts`, ao lado de `SEVERIDADE_POR_STATUS`/`ROTULO_POR_STATUS`.
6. **Painel da demanda ao lado.** Cabeçalho com trilha do projeto, nome, status da demanda (bolinha, `COR_NO_BORDA`/`ROTULO_STATUS_DEMANDA`), horas estimadas e "Fechar"; abas Cliente, Técnica e Documentação (cada uma na sua cor, ver 7); corpo com o texto em `app-markdown-visualizador`, ou "Sem conteúdo". Quem pode editar (`podeEditarCampoDescricao`) tem "Editar", que troca o corpo, no próprio painel, por `app-demanda-descricao-editor` (task 278: carrega e salva sozinho, avisa de texto não salvo). Trocar de aba, de linha ou fechar com texto não salvo pergunta Salvar/Descartar, como na 278 (`ConfirmationService`, chave própria).
7. **Cores das descrições derivadas do tema.** Em `styles.scss`: `--app-icone-tecnica` = cor primária do tema; `--app-icone-cliente` e `--app-icone-doc` = a primária com o **matiz girado em +30° e −30°** (`hsl(from var(--p-primary-600) calc(h + 30) s l)`; no escuro, o tom 400). **Giro de 30°, escolhido pelo autor no POC** (com o tema azul fica bom), guardado numa variável (`--app-giro-descricoes: 30`) para ajustar num lugar só. Tema **sem matiz** (preto/cinza): `max(s, 55)` dá saturação mínima ao giro, sem par fixo (no cinza, cliente fica dourado e documentação rosa).
8. **Testes.** Componente: clique no ícone ativo fecha; trocar de aba/linha; a lista encolhida esconde as colunas e mostra bolinha/ícone; popovers de prioridade e status abrem e alteram; confirmação de texto não salvo; mapa de status (teste de lógica). Ajustar `atividade-listagem.page.spec.ts` (hoje cobre o dialog de descrição).
9. **Fecho.** `HISTORY.md` (topo), `CONTEXT.md` (seção de Atividades e a das cores de descrição), `MEMORY.md` se algo mudar de lugar.

## Critérios de Aceite

- `npm run test --workspace=frontend`, `npm run build --workspace=frontend` e `npm run repo:verificar` verdes (declarar a ausência de lint, `PROBLEMS.md` P-001).
- `atividade-listagem.page.html` **não tem mais** o `p-dialog` de descrição da demanda; `grep` por `mostrarDialogDescricao` na página não acha nada.
- **Verificação ao vivo** (skill `verify`) em **1920×1080, 1366×768 e 1080×1920**, tema claro e escuro, **com o tema azul padrão e ao menos um tema escuro/preto e um de outra cor** (verde ou laranja), conferindo: abrir/fechar pelo ícone, trocar de linha e de aba, editar e salvar, texto não salvo, trocar prioridade e status na lista encolhida, gestor e desenvolvedor, lista vazia e com erro, a animação sem salto de layout. Análogo aprovado: tela de Documentações (divisão) e o POC anexo. Se a pane não alcançar algum viewport, registrar no relatório como limite e deixar a task aberta.
- Cores: no tema azul, as três descrições são distinguíveis lado a lado (ícones acesos e abas); conferir também nos demais consumidores do token (item "Dependências").
- Relatório em `docs/specs/<estado>/288-atividades-com-demanda-ao-lado/verificacao.md`.

## Fora de Escopo

- Mexer nas outras telas que abrem descrição por dialog (Execuções, Ponto, Controle de horas), nem trocar o modal de descrição do `demanda-arvore-painel` escondido (aberto em `reduzir-dialogs/verificacao.md`).
- Alterar a tabela cheia (colunas, `p-tag` de status, filtros) ou o fluxo de execução, atalhos, barra em massa.
- Tornar os ícones de status do quadradinho o padrão em outras telas (Execuções, chat). Só em Atividades, no modo dividido.
- Mexer na cor do status da **demanda** (bolinha) ou nos temas em si.
- Mobile (não é verificado neste projeto); no estreito a divisão empilha, sem desenho dedicado.
- Persistir "qual demanda está aberta" na URL (ideia à parte, se o autor quiser).

## Dependências

- `reduzir-dialogs` em `done/`: `app-modo-dividido` e `app-demanda-descricao-editor` (278).
- **Gerenciamento de impacto** (skill, `npm run impacto`): mudar `--app-icone-cliente/tecnica/doc` afeta todos os consumidores: `atividade-documentos-indicador`, `demanda-aberta`, `demanda-arvore-item`, `demanda-pasta-linha` e `demanda-context-menu.factory.ts`. A mudança de cor vale para todos; cada um é conferido e o que mudar além do pedido vai ao autor antes de aplicar.
- Fonte das cores de prioridade: `app-prioridade-selo` / `prioridadeService`; do status da demanda: `demanda-cores.constants.ts`.

## Riscos e Mitigação

- **`atividade-listagem.page.ts` já tem ~960 linhas.** Não acrescentar a lógica do painel nele: extrair um componente do painel da demanda (aberta, aba, edição) e deixar na página só o estado "linha aberta + aba" e a ligação com o modo dividido. Se a página crescer, registrar no fecho por quê.
- **`hsl(from …)` (cor relativa)** exige Chromium recente: o app roda em navegador atual e no Electron (confirmar a versão do Electron do Project Desktop antes). Se faltar, cair para `color-mix` com o vizinho da paleta.
- **Tema escuro/preto com o giro de 30°:** o autor aprovou só o azul; os demais podem ficar parecidos. Verificar cada tema da lista; se algum falhar, ajustar o par fixo dele, não o giro global.
- **Animação da grade** (`grid-template-columns`) com `p-table`: o `p-table` não é um grid. Se a animação das colunas custar caro, trocar por esconder as colunas sem animar, mantendo só a animação da largura da lista.
