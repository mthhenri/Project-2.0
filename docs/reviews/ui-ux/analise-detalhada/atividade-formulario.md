# Atividade — formulário de criação (inclui assistente de descrição com IA) (/atividade/nova)

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

## Sugestões (VERIFICAR: checar vs regras de negócio)
### S1 — Unificar a criação de atividade em um único componente (dialog reutilizável) [impacto alto]
Extrair o formulário do dialog da listagem para um componente compartilhado e fazer /atividade/nova apenas abrir esse dialog sobre a listagem (deep-link com ?demandaId pré-selecionando). Elimina a página duplicada e a divergência de defaults/recursos. Um só código, um só padrão.
_Redução de esforço:_ elimina inconsistência total entre 2 fluxos; gestor com tags: de ~9 cliques para 4

### S2 — Demanda como seletor com busca, pré-preenchida pelo contexto [impacto alto]
Trocar a caixa somente leitura por p-select com filtro, opções de demandaService.listarAtribuidas() rotuladas 'Projeto — Demanda' (já existe na listagem). Pré-selecionar via ?demandaId; sem param, o campo fica editável com foco e mensagem inline — nunca beco sem saída.
_Redução de esforço:_ de fluxo perdido (6+ cliques jogados fora + retrabalho) para 2 cliques de correção inline

### S3 — Expor Responsável (gestor) e Tags na criação [impacto alto]
Adicionar select 'Responsável' (visível só para gestor, placeholder 'Eu mesmo — Ana Souza', showClear) usando usuarioId do AtividadeCriarDto, e as tags em chips clicáveis (tagIds) idênticos aos do dialog da listagem. Elimina o dialog posterior de tags e torna possível atribuir a outro dev.
_Redução de esforço:_ tags: de +5 cliques em outro fluxo para +1 clique por tag inline; responsável: de impossível para 2 cliques

### S4 — Status como botões segmentados com default 'Desenvolvendo' [impacto medio]
Substituir o dropdown por 4 botões segmentados (Pendente | Planejada | Desenvolvendo | Desenvolvida) com DESENVOLVENDO pré-selecionado (alinhado ao dialog da listagem). Trocar status vira 1 clique visível, sem abrir camada.
_Redução de esforço:_ de 2 cliques (abrir dropdown + escolher) para 1 clique; caso default: 0 cliques

### S5 — Autofocus + submissão por teclado [impacto medio]
Foco automático no campo Nome ao abrir; Enter no input salva (já funciona, manter); Ctrl+Enter salva a partir da textarea de descrição; Esc cancela (com confirmação apenas se houver texto digitado). Criação mínima passa a ser 100% teclado.
_Redução de esforço:_ criação mínima: de 2-4 cliques para 0 cliques (digitar nome + Enter)

### S6 — Assistente IA: gate correto, resultado editável, Regenerar e Desfazer [impacto medio]
Habilitar o botão só com ≥10 caracteres (tooltip 'Escreva ao menos 10 caracteres para usar a IA'); enviar contextoEntidade sempre preenchido (nome da demanda selecionada ou o próprio nome da atividade); exibir a comparação em dialog modal com o texto sugerido em textarea EDITÁVEL, botões 'Usar este texto', 'Regenerar' e 'Cancelar'; após aceitar, toast com 'Desfazer' por 5s em vez de substituição destrutiva.
_Redução de esforço:_ elimina erros 400 silenciosos (retrabalho de todo o fluxo de IA) e o ciclo descartar→reescrever→regerar (3+ cliques) quando a sugestão precisa de ajuste pequeno

### S7 — 'Salvar e criar outra' para criação em série [impacto medio]
Ao lado de 'Salvar', ação secundária 'Salvar e criar outra' (ou checkbox 'criar outra'): persiste, limpa apenas Nome/Descrição e mantém Demanda, Responsável, Status e Tags, com foco de volta no Nome. Toast de sucesso com link 'Ver atividade'.
_Redução de esforço:_ 3 atividades na mesma demanda: de 3 navegações completas (~15 cliques) para ~6 cliques sem sair da tela

### S8 — Reduzir ruído: dica sob demanda e navegação única [impacto baixo]
Mover a dica de caracteres proibidos para tooltip no ícone (i) do label ou exibi-la apenas quando o erro de pattern ocorrer; remover o botão 'Cancelar' do rodapé mantendo só o back do cabeçalho (ou vice-versa), liberando o rodapé para 'Salvar e criar outra' + 'Salvar'.
_Redução de esforço:_ menos 2 elementos permanentes de ruído visual; hierarquia da ação primária mais óbvia


## REDESIGN SPEC
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
