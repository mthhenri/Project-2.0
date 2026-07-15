# Atividade — formulário de criação (inclui assistente de descrição com IA) (/atividade/nova)

> ✅ Sugestões verificadas adversarialmente contra o código e as regras de negócio.

## Fluxos atuais
- **Criar atividade mínima (chegando com ?demandaId no URL) mantendo o status default** (4 cliques): Clicar no campo Nome (sem autofocus) → digitar → clicar Salvar (ou Enter). Se o status default PLANEJADA não servir (caso comum: vai desenvolver agora), somam-se abrir o dropdown Status e escolher a opção.
- **Criar atividade com descrição aprimorada pela IA** (5 cliques): Clicar Nome → digitar → clicar Descrição → digitar (≥10 caracteres, senão o backend retorna 400) → clicar 'Auxiliar com IA' → aguardar → ler comparação em 2 painéis → clicar 'Aceitar' → clicar 'Salvar'.
- **Gestor criar atividade para outro usuário com 2 tags** (9 cliques): IMPOSSÍVEL nesta tela: não há campo de responsável (e AtividadeAlterarDto não permite reatribuir depois) nem de tags. Caminho real: salvar aqui (4 cliques) → é levado ao detalhe → voltar à listagem (1) → localizar a linha → abrir dialog 'Atribuir tags' (1) → clicar 2 tags (2) → Salvar (1). Responsável: só recriando pelo dialog da listagem.
- **Chegar à página sem demandaId (URL direta/bookmark) e tentar salvar** (6 cliques): Preencher nome/status/descrição → clicar Salvar → toast warn 'Demanda não informada' bottom-center → beco sem saída: não existe seletor de demanda na página; o usuário precisa sair e perde tudo que digitou.
- **Cancelar e voltar para a listagem** (1 cliques): Clicar 'Cancelar' (rodapé) ou '← Atividades' (cabeçalho) — dois controles redundantes para a mesma ação; sem atalho Esc.

## Problemas
- [ALTA] P1: Rota órfã e experiência duplicada: nada no app navega para /atividade/nova; a listagem tem um dialog 'Nova Atividade' com MAIS recursos (seletor de demanda com busca, responsável para gestor, tags em chips, default de status diferente). Dois códigos e dois padrões para a mesma tarefa — inconsistência garantida (critério 10).
- [ALTA] P2: Demanda somente leitura sem seletor: sem ?demandaId a página é um beco sem saída — o erro só aparece no submit, como toast passageiro bottom-center, sem qualquer ação corretiva inline; o usuário perde o que digitou (critérios 2, 7, 8).
- [ALTA] P3: Campos suportados pelo backend ausentes: AtividadeCriarDto aceita usuarioId e tagIds, mas a tela não os expõe. Tags exigem um segundo fluxo na listagem (+4-5 cliques); responsável é impossível de definir aqui e impossível de corrigir depois (AtividadeAlterarDto não tem usuarioId) (critérios 1, 2, 4).
- [MEDIA] P4: Default de status inconsistente e provavelmente errado: PLANEJADA aqui vs DESENVOLVENDO no dialog da listagem. O caso mais frequente (criar a atividade que vai executar agora) exige 2 cliques extras no dropdown (critérios 3, 10).
- [MEDIA] P5: Sem autofocus no campo Nome e sem atalhos de teclado (Ctrl+Enter para salvar a partir da textarea, Esc para cancelar). Primeira interação sempre exige um clique de mira (critério 6).
- [MEDIA] P6: Assistente IA desalinhado do contrato do backend: botão habilita com 1 caractere, mas o DTO exige MinLength(10) e contextoEntidade não vazio → 400 sem mensagem amigável. Botão desabilitado não explica o porquê (sem tooltip) (critérios 8, 9).
- [MEDIA] P7: Resultado da IA empurra o formulário: dois p-panels lado a lado abaixo da textarea deslocam os botões de ação; texto sugerido não é editável antes de aceitar; sem 'Regenerar'; sem desfazer após aceitar (substituição destrutiva) (critérios 8, 9).
- [MEDIA] P8: Fluxo pós-salvar quebra criação em série: navega para a página de detalhe da atividade criada; não há 'Salvar e criar outra' mantendo demanda/status — criar 3 atividades na mesma demanda custa 3 navegações completas (critérios 1, 2).
- [BAIXA] P9: Dica de caracteres proibidos permanentemente visível sob o campo Nome — ruído constante para uma restrição rara; deveria aparecer apenas como erro ou tooltip (critério 4).
- [BAIXA] P10: Redundância de navegação: botão '← Atividades' no cabeçalho e 'Cancelar' no rodapé fazem exatamente o mesmo; nenhum protege contra perda de dados digitados.
- [BAIXA] P11: Resquícios de layout: grid __linha de 2 colunas contendo um único campo que ocupa as duas; card de 800px com muito espaço ocioso; sem breadcrumb Projeto > Demanda para dar contexto (critério 9).
- [BAIXA] P12: Toast de aviso ('Demanda não informada') em bottom-center para um erro estrutural do formulário — feedback fora do ponto de decisão; deveria ser estado inline persistente junto ao campo (critério 8).

## Sugestões aprovadas na verificação
### S1 — Unificar a criação num único componente compartilhado, tendo o dialog da listagem como base, com deep-link ?demandaId (funde S2) [impacto alto]
Validado no código: nada no app navega para /atividade/nova (rota órfã em frontend/src/app/modules/atividade/atividade.routes.ts; únicas referências estão em docs/reviews). O dialog da listagem (atividade-listagem.page.ts, formularioNova) já é o fluxo completo: p-select de demanda com filtro e rótulo 'Projeto - Demanda' via demandaService.listarAtribuidas(), pré-selecionado pelo ?demandaId da listagem; responsável gestor-only; tags em chips; default DESENVOLVENDO. A página (atividade-formulario.page.ts) duplica tudo pior: demanda somente leitura ('Demanda não informada' + toast warn no salvar = beco sem saída), default PLANEJADA, sem responsável/tags. Aprovado: extrair o formulário do dialog para componente compartilhado; /atividade/nova vira redirecionamento que abre o dialog sobre a listagem com ?demandaId pré-selecionado. Incorpora a S2: sem contexto, o seletor de demanda recebe o foco inicial com hint inline, e submit sem demanda destaca o campo com erro inline (o dialog já faz isso via markAllAsTouched) — nunca toast. Atenção: listarAtribuidas() só retorna demandas PLANEJADA/PENDENTE (demanda.repository.ts:296-321); prever deep-link de demanda fora desses status.
_Redução de esforço:_ elimina a divergência total entre 2 fluxos (defaults e campos diferentes) e o beco sem saída da página órfã; gestor criando com tags passa a ter um único caminho de ~4 interações em vez de dois padrões distintos

### S3 — Garantir paridade de Responsável e Tags no componente unificado, com default nomeado e empty state acionável [impacto medio]
Reformulada — a proposta original já existe no fluxo principal: o dialog da listagem tem select de usuário gestor-only (showClear, filtro, placeholder 'Meu próprio usuário') e tags em chips clicáveis; salvarNova envia usuarioId só se gestor e tagIds (atividade-listagem.page.ts:329-330), e o backend só honra usuarioId de gestor (backend/src/modules/atividade/services/atividade.service.ts:49-52 — dev enviando usuarioId é ignorado). 'Responsável: de impossível para 2 cliques' só valia para a página órfã. O que fica de novo: (1) garantir esses campos no componente unificado — usar a página como base os perderia; (2) placeholder com o nome real da sessão ('Eu mesma (Ana Souza)' via UsuarioSessaoService.nomeCompleto()) em vez de 'Meu próprio usuário'; (3) avatar de iniciais nas opções (helper iniciais() já existe na listagem); (4) empty state de tags com link 'Gerenciar tags →' para /tag quando gestor (hoje só texto muted 'Nenhuma tag cadastrada'). Sem violação de regra: gestores não entram em demanda_usuario e o backend não exige que o dev atribuído seja membro da demanda.
_Redução de esforço:_ evita regressão de +5 cliques (dialog posterior de tags) no fluxo unificado; empty state acionável poupa a navegação manual até /tag; default nomeado elimina dúvida (0 cliques para 'eu mesmo')

### S4 — Status como p-selectButton (botões segmentados) com default único DESENVOLVENDO [impacto medio]
Validado: hoje há dropdown p-select nos dois fluxos com defaults DIVERGENTES — página usa PLANEJADA (atividade-formulario.page.ts:49) e dialog usa DESENVOLVENDO (atividade-listagem.page.ts:141). São exatamente 4 opções fixas em ATIVIDADE_STATUS_OPCOES (atividade.model.ts:10-15) na ordem Pendente | Planejada | Desenvolvendo | Desenvolvida — caso ideal para botões segmentados. Usar p-selectButton do PrimeNG (já no stack, sem componente custom), reaproveitando ATIVIDADE_STATUS_OPCOES, default DESENVOLVENDO (alinha com o fluxo principal atual). Nenhuma regra de negócio impede criar atividade em qualquer dos 4 status.
_Redução de esforço:_ troca de status: 2 cliques (abrir dropdown + escolher) para 1 clique visível; 0 cliques no caso comum; elimina o default divergente entre os dois fluxos

### S5 — Autofocus + submissão por teclado no componente unificado (Enter precisa ser ligado no dialog) [impacto medio]
Corrigida: 'Enter no input salva (já funciona)' só vale para a página órfã (form com (ngSubmit) e botão type=submit); no dialog da listagem o form NÃO tem ngSubmit e os botões do rodapé usam (onClick) — Enter não salva no fluxo principal hoje. Nenhum campo do app usa autofocus (grep sem resultados para autofocus/pAutoFocus), mas há precedente de foco manual em dialog: [focusOnShow]=false + (onShow)=focarDescricaoRegistro() no dialog de registro (atividade-listagem.page.html:640-643). Implementar no componente unificado: foco no Nome ao abrir (ou no seletor de Demanda quando vazio), Enter no input salva, Ctrl+Enter salva a partir da textarea, Esc fecha com confirmação apenas se houver texto digitado — e aplicar a mesma guarda ao dismissableMask, pois hoje clicar fora do dialog fecha e perde tudo que foi digitado.
_Redução de esforço:_ criação mínima 100% teclado (digitar nome + Enter = 0 cliques); a guarda no clique-fora evita perda total do formulário digitado

### S6 — Assistente IA: consertar o contrato (contexto obrigatório + mínimo de 10 caracteres) e tornar o resultado editável e reversível [impacto alto]
Achado mais grave da revisão, confirmado no código: o backend exige textoOriginal @MinLength(10) E contextoEntidade @IsNotEmpty (shared/src/dtos/assistente/AssistenteDescricaoAuxiliarDto.ts, ValidationPipe global em backend/src/main.ts), mas: (1) o botão habilita com 1 caractere (disabled apenas com texto vazio — assistente-descricao.component.html:6); (2) o dialog de nova atividade da listagem NÃO passa [contextoEntidade] (atividade-listagem.page.html:411-415) — o componente envia '' e o botão de IA do fluxo principal retorna 400 SEMPRE; (3) na página, contextoEntidade = nomeDemanda(), vazio sem ?demandaId. Correção à alegação original: o 400 não é 'silencioso' — o error-handler.interceptor.ts exibe toast warn com a primeira mensagem técnica do class-validator; o problema é falhar após o clique, com mensagem críptica. Aprovado: habilitar o botão apenas com ≥10 caracteres E contexto disponível (demanda selecionada ou nome da atividade preenchido), com tooltip explicativo; enviar sempre contextoEntidade não-vazio (nome da demanda; fallback nome da atividade); exibir a sugestão em textarea EDITÁVEL com 'Usar este texto', 'Regenerar' e 'Cancelar' (hoje é <p> somente leitura com Aceitar/Descartar — assistente-descricao.component.html:11-35); pós-aceite reversível (hoje a substituição via patchValue é destrutiva).
_Redução de esforço:_ destrava função 100% quebrada no dialog do fluxo principal (falha garantida vira 0); texto editável elimina o ciclo descartar → reescrever → regerar quando a sugestão precisa de ajuste pequeno

### S7 — 'Salvar e criar outra' mantendo Demanda, Status, Responsável e Tags [impacto medio]
Validado: não existe em nenhum fluxo — a página navega para /atividade/:id após criar (atividade-formulario.page.ts:105) e o dialog fecha e recarrega a lista (atividade-listagem.page.ts:343-344); reabrir o dialog zera tags e responsável (abrirDialogNova faz reset). Sem conflito de regras: é apenas repetir POST /atividade com o estado do form; para desenvolvedor o campo responsável nem existe, então 'manter responsável' se aplica só a gestor. O link 'Ver atividade' é viável: criar() retorna dados.id e a rota /atividade/:id existe. Comportamento aprovado no componente unificado: persiste, limpa apenas Nome/Descrição, mantém Demanda/Status/Responsável/Tags, devolve o foco ao Nome e atualiza a lista ao fundo. Nota: ação clicável em toast exige template próprio no p-toast global (hoje sem template — ver ajustes).
_Redução de esforço:_ 3 atividades na mesma demanda: de 3 ciclos completos de dialog re-selecionando demanda/tags/responsável para ~2 interações extras por item, sem sair da tela

### S8 — Dica de caracteres proibidos vira tooltip (com a lista CORRETA) e rodapé com hierarquia de ação única [impacto baixo]
Validado com correção importante: a dica permanente ('Não é permitida a utilização de caracteres especiais') existe nos dois fluxos, e a diretiva appBloquearCaracteresProibidos já IMPEDE digitar/colar os caracteres proibidos — o erro de pattern praticamente nunca dispara para entrada digitada, tornando o texto permanente ruído puro; mover para tooltip no ícone (i) do label é seguro. Os caracteres reais são ' " ` ~ ^ \ ´ (REGEX_SEM_CARACTERES_PROIBIDOS em shared/src/validators/caracteres-proibidos.validator.ts) — NÃO '< > { } ;' como a spec de redesign escreveu. Sobre navegação única: na forma de página, remover o Cancelar do rodapé (duplicado com o back '← Atividades' do cabeçalho) vale; na forma de dialog (destino da S1), manter o padrão dos demais dialogs do app (X no header + Cancelar no rodapé) e apenas acrescentar 'Salvar e criar outra' ao lado de 'Salvar'.
_Redução de esforço:_ menos 2 elementos permanentes de ruído visual; hierarquia da ação primária mais óbvia — ganho majoritariamente estético/de consistência


## Descartadas/fundidas na verificação
- S2: Fundida na S1 por já existir no fluxo principal: o dialog da listagem já tem p-select de demanda com filtro, opções de demandaService.listarAtribuidas() rotuladas 'Projeto - Demanda', pré-seleção via ?demandaId e erro inline 'Selecione a demanda' no submit (atividade-listagem.page.html:318-336). O 'fluxo perdido de 6+ cliques' só existe na página órfã /atividade/nova, que nenhum código referencia — a S1 a elimina. O residual genuinamente novo (foco inicial no seletor quando vazio + hint inline) foi incorporado ao texto final da S1.

## Ajustes de implementação apontados pelo verificador
1) Tooltip de caracteres proibidos ERRADO: trocar 'Não use os caracteres < > { } ;' pelos caracteres reais ' \" ` ~ ^ \\ ´ (fonte única: shared/src/validators/caracteres-proibidos.validator.ts); registrar que a diretiva appBloquearCaracteresProibidos já bloqueia digitação/colagem desses caracteres, então o erro de pattern quase nunca ocorre. 2) Premissa estrutural desalinhada com a S1: a spec descreve uma página, mas a decisão aprovada é /atividade/nova abrir o DIALOG (componente compartilhado) sobre a listagem — o mockup deve retratar o dialog sobre a listagem, ou declarar que página e dialog renderizam exatamente o mesmo componente; no formato dialog, manter o padrão do app (X no header + Cancelar no rodapé) em vez de remover o Cancelar. 3) Seletor de demanda: as opções reais são lista plana com rótulo 'Projeto - Demanda' (hífen, montado no frontend), não 'agrupadas por projeto' — agrupar exigiria reestruturar para o modo group do p-select; além disso, listarAtribuidas() retorna SÓ demandas com status PLANEJADA/PENDENTE (demanda.repository.ts:318), então o deep-link de uma demanda em outro status não estaria nas opções — a spec deve definir esse caso (ex.: injetar a demanda do contexto na lista). O breadcrumb 'Projeto / Demanda' deve derivar da opção selecionada (DemandaAtribuidaDto.nomeProjeto), pois DemandaRecuperadaDto não traz nomeProjeto. 4) IA — gate incompleto na spec: contextoEntidade é @IsNotEmpty no backend; com demanda vazia E nome vazio, o fallback proposto ainda enviaria '' e tomaria 400. O botão deve habilitar somente com texto ≥10 caracteres E contexto disponível (demanda selecionada ou nome preenchido). Registrar explicitamente que o fix inclui passar [contextoEntidade] no dialog da listagem, que hoje o omite (botão de IA do fluxo principal falha sempre com 400). 5) Corrigir a narrativa 'erros 400 silenciosos': o interceptor global (error-handler.interceptor.ts) exibe toast warn com a primeira mensagem do class-validator — o problema é ser tardio e técnico, não invisível. 6) Toasts com ação ('Desfazer' por 5s, 'Ver atividade'): o p-toast global (layout.component.html:7, position bottom-center) não tem template de conteúdo — a spec deve exigir template/key próprios do PrimeNG Toast ou prever alternativa inline (ex.: botão 'Restaurar texto anterior' junto ao campo). 7) 'Enter salva' não existe no dialog atual (form sem ngSubmit, botões com onClick) — a spec deve exigir o wiring do submit por teclado no componente unificado; e a guarda do Esc ('confirmar só se houver texto digitado') deve valer também para o dismissableMask (clique fora), que hoje fecha perdendo os dados. 8) Responsável: manter a regra de não renderizar o campo para DESENVOLVEDOR e enviar usuarioId apenas quando gestor (o backend já ignora usuarioId de dev — atividade.service.ts:49-52); o placeholder com nome real é viável via UsuarioSessaoService.nomeCompleto(). O default DESENVOLVENDO da spec está correto e corrige a divergência atual (página usa PLANEJADA, dialog usa DESENVOLVENDO).

## Especificação do redesign
# Redesign — Nova Atividade (rota `/atividade/nova`)

> Premissa estrutural: o formulário passa a ser um componente único compartilhado com o dialog da listagem. Esta spec descreve a **página** (deep-link com contexto de demanda) e o **dialog do assistente de IA** sobre ela. Todos os campos existem no backend (`AtividadeCriarDto`: demandaId, usuarioId?, nome, descricao?, status, tagIds?).

## Dados de exemplo (usar no mockup)
- Usuária logada: **Ana Souza** (GESTORA)
- Projeto/Demanda em contexto: **Portal do Cliente — Autenticação de dois fatores**
- Outras demandas no seletor: "Portal do Cliente — Redefinição de senha", "App de Campo — Sincronização offline", "Faturamento — Emissão de NF-e"
- Usuários: Ana Souza (eu), **Bruno Lima**, **Carla Mendes**, **Diego Ferreira**
- Tags: `Backend` (azul #3B82F6), `Frontend` (verde #22C55E), `Urgente` (vermelho #EF4444), `Refatoração` (roxo #8B5CF6)

## Layout geral
Página com padding 1.5rem, card central max-width 800px (mesmo container atual), tema Aura claro/escuro. Toasts em bottom-center (padrão do app).

---

## 1. Cabeçalho da página
- Linha única: botão texto pequeno secundário `← Atividades` (única ação de voltar da tela — sem "Cancelar" duplicado no rodapé) + breadcrumb-título:
  - Linha 1 (muted, 0.85rem): `Portal do Cliente / Autenticação de dois fatores`
  - Linha 2 (h1, 1.5rem, primary-600): `Nova Atividade`
- **Callout ①** aponta para o breadcrumb: contexto do projeto/demanda sempre visível.

## 2. Card do formulário (coluna única, gap 1.25rem)

### 2.1 Campo "Demanda *" — agora um seletor
- `p-select` com filtro/busca, largura total. Valor pré-selecionado: `Portal do Cliente — Autenticação de dois fatores` (vindo de `?demandaId=42`).
- Opções agrupadas por projeto no formato `Projeto — Demanda` (fonte: `demandaService.listarAtribuidas()`).
- Ícone `pi-sitemap` à esquerda dentro do trigger.
- **Estado sem contexto (vazio)**: quando a URL não traz `demandaId`, o campo abre vazio com placeholder "Busque a demanda…", recebe o foco inicial e mostra hint inline azul-info abaixo: "Selecione a demanda para criar a atividade" — nunca toast, nunca beco sem saída.
- **Estado carregando**: skeleton de 1 linha no lugar do select.

### 2.2 Campo "Nome *"
- `pInputText` largura total, placeholder `ex: Implementar verificação por SMS`.
- **Autofocus** quando a demanda já vem do contexto (senão o foco vai no seletor de demanda).
- Label com ícone `(i)` discreto; tooltip do ícone: "Não use os caracteres < > { } ;" (a dica permanente some do fluxo).
- Erro inline apenas após blur/submit: "Nome é obrigatório (mín. 3 caracteres)".
- Enter neste campo submete o formulário.

### 2.3 Linha dupla (grid 2 colunas; empilha em <768px)
**Coluna A — "Status *" como botões segmentados** (substitui o dropdown):
- 4 segmentos: `Pendente | Planejada | Desenvolvendo | Desenvolvida`.
- Default pré-selecionado: **Desenvolvendo** (alinhado ao dialog da listagem; caso mais comum).
- Segmento ativo com fundo primário; 1 clique para trocar, sem camadas.
- **Callout ②** aponta aqui.

**Coluna B — "Responsável" (visível só para GESTOR)**:
- `p-select` com busca e `showClear`; placeholder/estado default: `Eu mesma (Ana Souza)`.
- Opções: Ana Souza (eu), Bruno Lima, Carla Mendes, Diego Ferreira — com avatar de iniciais (mesmo componente da listagem: círculo com "BL", "CM"…).
- Para DESENVOLVEDOR o campo não é renderizado (a coluna A ocupa a linha inteira).
- **Callout ③** aponta aqui: atribuição direta na criação (antes era impossível).

### 2.4 Campo "Tags"
- Chips clicáveis (mesmo padrão do dialog da listagem): bolinha colorida + nome; selecionada = fundo tinto da cor + check.
- Exemplo no mockup: `Backend` e `Urgente` selecionadas; `Frontend` e `Refatoração` não.
- Estado vazio: texto muted "Nenhuma tag cadastrada" + (se gestor) link "Gerenciar tags →" para /tag.
- **Callout ③** também cobre esta região (tags na criação eliminam o dialog posterior de +5 cliques).

### 2.5 Campo "Descrição" (opcional)
- Textarea 5 linhas, placeholder `Descreva a atividade… (Ctrl+Enter salva)`.
- Rodapé do campo (linha única, space-between):
  - Esquerda: botão outlined sm `✦ Auxiliar com IA` — **desabilitado até 10 caracteres**, com tooltip "Escreva ao menos 10 caracteres para usar a IA". Loading = spinner no botão + texto "Gerando…".
  - Direita: contador discreto muted `128 caracteres`.
- **Callout ⑤** aponta para o botão de IA.

### 2.6 Rodapé de ações (borda superior)
- Direita: `Salvar e criar outra` (outlined) + `Salvar` (primário, ícone check, loading no submit).
- Sem botão "Cancelar" (voltar fica só no cabeçalho; Esc também cancela — com confirm apenas se houver texto digitado).
- Legenda de atalhos muted à esquerda do rodapé: `Enter salva · Ctrl+Enter salva da descrição · Esc volta`.
- **Callout ④** aponta para os atalhos; **Callout ⑥** para "Salvar e criar outra".
- Pós-salvar: toast sucesso "Atividade criada" com ação `Ver atividade`; em "Salvar e criar outra", limpa Nome/Descrição, mantém Demanda/Status/Responsável/Tags e devolve o foco ao Nome.

## 3. Dialog do Assistente de IA (sobre a página com fundo escurecido)
Renderizar a página descrita acima ao fundo com overlay escurecido (rgba(0,0,0,.45)); dialog modal centralizado, largura 56rem, header `✦ Assistente de descrição`, botão X.

- **Corpo em 2 colunas** (empilha em telas estreitas):
  - Coluna esquerda — painel "Texto original" (somente leitura, fundo surface-50):
    > "implementar 2FA com sms e app autenticador pro login do portal"
  - Coluna direita — painel "Sugestão da IA" com **textarea editável** (borda primária sutil) já preenchida:
    > "Implementar autenticação de dois fatores (2FA) no login do Portal do Cliente, com envio de código por SMS e suporte a aplicativos autenticadores (TOTP). Inclui tela de configuração do segundo fator no perfil do usuário e fluxo de recuperação de acesso."
  - Sob a coluna direita, hint muted: "Você pode ajustar o texto antes de usar".
- **Estado carregando**: skeleton de 4 linhas na coluna direita + botão "Gerando…" desabilitado.
- **Rodapé do dialog**: esquerda `↻ Regenerar` (text); direita `Cancelar` (text) + `Usar este texto` (primário, ícone check).
- Ao aceitar: dialog fecha, textarea da página recebe o texto, e um toast bottom-center exibe "Descrição atualizada — **Desfazer**" por 5s (restaura o texto original).
- Contrato respeitado: envia sempre `textoOriginal` (≥10 chars), `tipoEntidade: 'atividade'` e `contextoEntidade` = nome da demanda selecionada (ou o nome digitado da atividade como fallback) — nunca vazio.
- **Callout ⑤** aponta para a textarea editável + Regenerar + Desfazer.

## 4. Estados da página
- **Com dados (default do mockup)**: demanda pré-selecionada, status Desenvolvendo ativo, 2 tags marcadas, descrição com texto de exemplo.
- **Vazio (sem `?demandaId`)**: seletor de demanda focado e vazio com hint informativo inline; demais campos habilitados; botão Salvar habilitado mas o submit foca e destaca o campo Demanda com erro inline "Selecione a demanda" (nada de toast).
- **Carregando**: skeletons no seletor de demanda, nas tags e no select de responsável; campos de texto habilitados desde o primeiro paint.
- **Salvando**: botão Salvar com spinner, formulário desabilitado; sem navegação até resposta.

## 5. Callouts numerados (o mockup deve destacá-los visualmente)
- **① Demanda com contexto e seletor**: breadcrumb Projeto/Demanda + campo de demanda buscável pré-preenchido pela URL — fim do beco sem saída e do toast tardio.
- **② Status em botões segmentados, default 'Desenvolvendo'**: de 2 cliques em dropdown para 1 clique visível (0 no caso comum), alinhado ao dialog da listagem.
- **③ Responsável + Tags direto na criação**: usa `usuarioId` e `tagIds` que o backend já aceita; elimina o fluxo posterior de atribuir tags (+5 cliques) e torna possível criar para outro dev.
- **④ Teclado de ponta a ponta**: autofocus no Nome, Enter salva, Ctrl+Enter salva da descrição, Esc volta — criação mínima com 0 cliques.
- **⑤ IA confiável e reversível**: botão só habilita com ≥10 caracteres (tooltip explica), sugestão em dialog com texto editável, 'Regenerar' e 'Desfazer' pós-aceite.
- **⑥ 'Salvar e criar outra'**: criação em série na mesma demanda mantendo demanda/status/responsável/tags — 3 atividades caem de ~15 para ~6 cliques.
