# Usuários — listagem (cartão de usuário, dialog de formulário criar/editar, dialog de perfil) (/usuario (só gestor))

## Fluxos atuais
- **Criar usuário novo** (5 cliques): Clicar 'Novo Usuário' → clicar no campo Login (sem autofocus) → digitar login, senha, nome, cargo (Tab entre campos) → abrir select Tipo → escolher tipo → clicar 'Salvar' (Enter não envia)
- **Ver perfil de um usuário** (1 cliques): Clicar no ícone de olho na linha (nome não é clicável; aguarda GET com spinner)
- **Editar nome/cargo/horas de um usuário** (4 cliques): Olho (abre perfil, espera carregar) → 'Editar' (2º dialog) → clicar no campo a alterar → digitar → 'Salvar' (refaz GET do perfil + reload da lista)
- **Ativar/Inativar um usuário** (5 cliques): Olho → 'Editar' → abrir select Status → escolher Ativo/Inativo → 'Salvar' — 5 cliques e 2 dialogs para um toggle binário
- **Alterar senha de um usuário** (4 cliques): Olho → 'Alterar Senha' → clicar campo Nova Senha (sem autofocus) → digitar a senha 2 vezes (campo de confirmação) → 'Confirmar'
- **Ver/editar anotações de um usuário** (3 cliques): Clicar ícone de anotações na linha → editar no rich text → 'Salvar Anotações' → fechar (X)
- **Excluir usuário** (2 cliques): Clicar lixeira → confirmar no dialog 'Excluir' (mensagem diz que não pode ser desfeito, mas é soft delete)
- **Filtrar por tipo ou status** (2 cliques): Abrir o dropdown → escolher a opção (2 cliques por filtro; escolha não é lembrada na próxima visita)
- **Buscar por nome/login** (1 cliques): Clicar no campo Buscar (sem autofocus/atalho) → digitar (debounce 400ms aplica sozinho)

## Problemas
- [ALTA] P01: Toda edição está enterrada em 2 níveis de dialog: para mudar qualquer campo é preciso abrir o Perfil (com espera de GET) e só então clicar 'Editar'. Não existe ação de edição direta na linha da tabela — o ponto onde o gestor vê o dado errado.
- [ALTA] P02: Ativar/Inativar usuário — a ação administrativa mais frequente — custa 5 cliques através de 2 dialogs e um select, quando é um toggle binário que poderia ser 1 clique inline na coluna Status.
- [ALTA] P03: Dialog de criação sem autofocus no primeiro campo, sem submit por Enter (nenhum dialog da tela tem), Tipo sem default (a maioria dos cadastros é Desenvolvedor) e login não sugerido a partir do nome — cada cadastro paga cliques e digitação evitáveis.
- [MEDIA] P04: Inconsistência de formulários: criação usa um dialog próprio (6 campos) e edição usa outro formulário dentro do perfil (5 campos), com campos sobrepostos duplicados (nome, cargo, horas, tipo) e larguras/headers diferentes — dobra manutenção e quebra o padrão entre telas.
- [MEDIA] P05: Exclusão usa confirmDialog bloqueante com mensagem incorreta ('Esta ação não pode ser desfeita') — o sistema é soft delete em tudo; o padrão correto de menor esforço é exclusão imediata com Desfazer no toast.
- [MEDIA] P06: Empty state não acionável: só ícone + 'Nenhum usuário encontrado', sem botão 'Novo Usuário' nem 'Limpar filtros', e sem diferenciar 'lista vazia' de 'filtros sem resultado'.
- [MEDIA] P07: Filtros Tipo/Status são dropdowns de 2 cliques com apenas 3 opções cada (caso ideal para SelectButton segmentado de 1 clique) e nenhum filtro/paginação é persistido entre visitas ou refletido na URL.
- [MEDIA] P08: O perfil subutiliza o GET: UsuarioRecuperadoDto retorna anotacoes, anotacoesAlteracaoData e createdDate, mas o dialog não mostra nenhum dos três — o gestor precisa abrir o dialog de anotações (95vw) só para saber o que está escrito.
- [MEDIA] P09: Alterar senha exige digitar a senha 2 vezes (campo de confirmação) mesmo havendo toggleMask para conferir visualmente, e não há gerador de senha — relevante porque é o gestor quem define senha inicial/reset de outros usuários.
- [BAIXA] P10: Nome do usuário na linha não é clicável (affordance baixa); o único alvo para abrir o perfil é um botão-ícone de 32px na última coluna.
- [BAIXA] P11: Nenhuma coluna é ordenável (pSortableColumn ausente) apesar da tabela lazy, e a página default é de só 10 itens — baixa densidade para uma tela administrativa.
- [BAIXA] P12: Status Inativo usa severity 'danger' (vermelho) — inativo é um estado neutro, não um erro; vermelho compete com a lixeira e polui a leitura da tabela.
- [BAIXA] P13: Componente usuario-cartao (avatar + nome + cargo + tag) existe mas não é usado em nenhum template — a tabela espalha os mesmos dados em 3 colunas de texto cru em vez de reaproveitá-lo.
- [BAIXA] P14: Sem seleção múltipla/ações em massa (ex.: inativar vários de uma vez) — cada usuário exige o ciclo completo de 5 cliques.
- [BAIXA] P15: Refetch em todo visibilitychange reexibe o loading da tabela mesmo com dados na tela (flicker); atualização deveria ser silenciosa quando já há conteúdo.
- [BAIXA] P16: Ordem dos campos do formulário de criação começa por Login/Senha em vez de Nome — inverte o fluxo mental natural (identidade → credenciais) e impede sugerir o login a partir do nome.

## Sugestões (JÁ VERIFICADAS)
### S01 — Toggle de status inline na linha com undo (via p-toggleswitch) [impacto alto]
Substituir a p-tag estática de Status por p-toggleswitch pequeno + rótulo. Clique dispara PUT /usuario/:id { status } de forma otimista (UsuarioAlterarDto.status já existe e o endpoint aceita alteração parcial — verificado no controller/service do backend) e toast 'Elisa Rocha inativada — Desfazer', onde Desfazer é um PUT reverso (sem backend novo). Reverter o switch se o backend retornar erro. Linha inativa com opacidade 0.6 e rótulo cinza neutro (hoje a tag usa severity danger/vermelho). Atenção: PrimeNG 21 não tem mais InputSwitch — o componente é ToggleSwitch. Nota: o backend hoje só bloqueia rebaixamento de tipo do último gestor, não a inativação por status — o undo mitiga acidente, mas vale registrar a lacuna.
_Redução de esforço:_ de 5 cliques (olho → Editar → abrir select → escolher → Salvar) para 1 clique

### S02 — Editar e Alterar Senha direto na linha, sem pedágio do perfil [impacto alto]
Adicionar pi-pencil e pi-lock nas ações da linha (reveladas no hover, sempre visíveis em touch). O cadeado abre o Dialog C direto (só precisa de id + nomeCompleto, ambos no UsuarioResumoDto). O lápis abre o Dialog A em modo edição, MAS precisa chamar GET /usuario/:id antes de preencher, porque UsuarioResumoDto não traz horasDiariasNecessarias — exibir skeleton breve no dialog durante o fetch (1 request, mesmo custo do fluxo atual via perfil). No modo edição pela linha, manter a regra já implementada em podeEditarTipo(): campo Tipo oculto quando o gestor edita a própria linha (backend bloqueia auto-rebaixamento e exige 1 gestor ativo). Perfil vira atalho de leitura.
_Redução de esforço:_ edição: de 4 cliques para 2; senha: de 4 para 2 (fluxo atual confirmado no código: só se chega a editar/senha por dentro do perfil)

### S03 — Formulário unificado criar/editar com defaults, autofocus e Enter [impacto alto]
Hoje existem DOIS formulários duplicados (usuario-formulario-dialog para criar; form de edição embutido no usuario-perfil-dialog) — unificar elimina a duplicação real. Criar: autofocus em Nome Completo (não existe hoje), login auto-sugerido 'nome.sobrenome' normalizado (minúsculas, sem acentos), parando de sincronizar ao editar manualmente — não há endpoint público de validação de login, então duplicidade continua tratada no submit (BusinessException 'Login já está em uso' exibida inline no campo); Tipo como SelectButton com default DESENVOLVEDOR (hoje é p-select sem default); botão Gerar senha forte + copiar; form com ngSubmit para Enter enviar (hoje não há submit por Enter). Horas Diárias default 8 JÁ existe — não vender como ganho novo; Esc fechar também já é comportamento default do p-dialog. Editar: mesmos campos pré-preenchidos, sem Senha, Login como texto imutável (UsuarioAlterarDto não aceita login — correto), acrescenta Status e Tipo (Tipo só para perfil alheio).
_Redução de esforço:_ criação: de ~5 cliques para 2 e ~15 teclas a menos (login auto-sugerido + tipo pré-selecionado)

### S04 — Filtros segmentados de 1 clique, persistidos em localStorage [impacto medio]
Trocar os dois p-select (que hoje exigem abrir dropdown + escolher) por SelectButtons [Todos|Desenvolvedores|Gestores] e [Todos|Ativos|Inativos] na linha da busca, sem labels em cima (hoje há labels que dobram a altura da toolbar). Persistir tipo, status e itensPorPagina em localStorage. CORREÇÃO ao proposto: no primeiro acesso o default deve ser 'Todos' (não 'Ativos') — esconder usuários inativos sem o gestor nunca ter escolhido isso gera 'usuário sumiu'; a partir daí, persistir a última escolha. Busca com autofocus ao entrar na tela e atalho '/' (ignorar o atalho quando o foco já está em um input).
_Redução de esforço:_ de 2 cliques para 1 por filtro; 0 cliques nas visitas seguintes (filtros lembrados)

### S05 — Excluir com Desfazer via DELETE adiado (não há endpoint de restauração) [impacto medio]
A mensagem atual 'Esta ação não pode ser desfeita' é comprovadamente enganosa (backend faz soft delete via executarSoftDelete). PORÉM o controller não expõe nenhum endpoint de restauração, então o Desfazer NÃO pode ser 'restaurar depois' — reformular para DELETE adiado no cliente: clique na lixeira remove a linha otimisticamente e mostra toast de 6s 'Usuário "Diego Ferreira" excluído — Desfazer'; o DELETE só é enviado quando o toast expira (ou imediatamente em beforeunload/pagehide); Desfazer cancela o request pendente e devolve a linha. Alternativa se preferir undo verdadeiro: criar PATCH /usuario/:id/restaurar no backend. Em ambos os casos, remover o p-confirmDialog.
_Redução de esforço:_ de 2 cliques + interrupção modal para 1 clique

### S06 — Empty states acionáveis e contextuais [impacto medio]
O empty state atual é só ícone + 'Nenhum usuário encontrado', sem ação (verificado no template). Sem filtros ativos: 'Nenhum usuário cadastrado ainda' + botão primário 'Novo Usuário' (reusa formularioDialog.abrir()). Com filtros/busca ativos (condição trivialmente derivável do formularioFiltros): 'Nenhum resultado para "joana" em Inativos' + botão 'Limpar filtros' que reseta o form e recarrega. Complementa o S04: com filtro Status persistido, este estado é a rede de segurança contra 'cadê o usuário'.
_Redução de esforço:_ recuperação em 1 clique no lugar de reorientar-se pela toolbar

### S07 — Perfil enriquecido com dados já retornados + linha clicável + coluna Usuário fundida [impacto medio]
Todos os dados propostos EXISTEM em UsuarioRecuperadoDto (já consumido pelo perfil): createdDate → 'Membro desde {data}' no subtítulo; anotacoes + anotacoesAlteracaoData → seção com preview + 'Atualizado em' + link 'Abrir anotações' (o dialog de anotações é de fato 95vw/95vh, caro para uma leitura rápida). CORREÇÕES: (1) anotacoes vem como HTML do p-editor/Quill — o preview deve remover as tags; (2) o usuario-cartao atual mostra avatar + nome + CARGO + tag 'Gestor' (não login) e é componente órfão sem nenhum uso no app — adaptá-lo (input para a linha secundária exibir login e flag para ocultar a tag, já que Tipo tem coluna própria) em vez de 'reutilizar' como está. Linha inteira clicável para abrir o perfil, com stopPropagation nas células do switch de status e das ações.
_Redução de esforço:_ ler anotações: preview a 1 clique no lugar de abrir dialog 95vw; alvo de clique do perfil passa do ícone 2rem para a linha inteira

### S08 — Densidade 25/página persistida + refetch silencioso (sem colunas ordenáveis) [impacto baixo]
Default de 25 itens/página persistido em localStorage (hoje 10, com opções [10,25,50] já existentes). Refetch silencioso: o listener de visibilitychange JÁ existe (linhas 69-72 da page), mas chama buscarUsuarios() que sempre seta carregando=true e pisca o loading da tabela — corrigir para não ligar o loading quando usuarios().length > 0. DESCARTADA a parte de colunas ordenáveis: UsuarioListarDto não tem parâmetro de ordenação, a tabela é lazy e o repositório ordena fixo por nome_completo ASC — exigiria backend novo para valor marginal em listas pequenas; se um dia for necessário, adicionar ordenarPor/direcao ao DTO. A fusão Nome+Login foi absorvida pelo S07 (coluna Usuário).
_Redução de esforço:_ menos paginação (10→25) e zero flicker ao voltar para a aba

### S09 — Alterar senha em 1 campo com gerador e Enter [impacto baixo]
O campo 'Confirmar Nova Senha' e o validador de igualdade são puramente client-side — UsuarioSenhaAlterarDto só exige senhaNova (min 8). Como é o gestor redefinindo senha de terceiros e o p-password já tem toggleMask para conferência visual, remover a confirmação é seguro. Adicionar botão 'Gerar senha' (preenche, revela e habilita pi-copy via navigator.clipboard) + autofocus no campo + ngSubmit para Enter enviar (nenhum dos três existe hoje). Header contextual 'Alterar senha — Bruno Lima'.
_Redução de esforço:_ metade da digitação (1 campo em vez de 2); com gerador, fluxo completo em 2 cliques


## Ajustes na spec (verificador)
1) Componente irreal: a spec cita 'InputSwitch', que não existe no PrimeNG 21 usado pelo projeto — usar p-toggleswitch (ToggleSwitch). 2) Dado inexistente no header: o contador '7 usuários · 6 ativos' não é fornecido pela API — a resposta paginada só traz totalItens do filtro corrente; exibir apenas '{totalItens} usuários' ou prever requisição extra de contagem (status=ATIVO, itensPorPagina=1). 3) Afirmação incorreta na seção 8: 'soft delete garante restauração' — não existe endpoint de restauração no backend; trocar por DELETE adiado no cliente (enviar ao expirar o toast de 6s ou em beforeunload; Desfazer cancela o request) ou especificar a criação de PATCH /usuario/:id/restaurar. 4) Dialog A modo edição aberto pelo lápis da linha: UsuarioResumoDto não contém horasDiariasNecessarias — especificar fetch de GET /usuario/:id com skeleton breve antes de preencher o formulário. 5) Seção 3, colunas 'ordenáveis' (Usuário e Cargo): UsuarioListarDto não tem parâmetros de ordenação e a tabela é lazy (backend ordena fixo por nome_completo ASC) — remover a ordenação da spec ou condicioná-la a novos campos ordenarPor/direcao no DTO e no repositório. 6) Seção 3, coluna Usuário: o usuario-cartao real mostra avatar + nome + cargo + tag 'Gestor' (não login) e hoje não é usado em nenhuma tela — a spec deve prever adaptação do componente (linha secundária configurável login/cargo e supressão da tag, pois Tipo tem coluna própria). 7) Seção 6, preview de anotações: o campo anotacoes é HTML gerado pelo p-editor (Quill) — especificar remoção de tags no preview. 8) Seção 9, atalho 'N': deve ser ignorado quando o foco está em um input (senão digitar 'n' na busca abre o dialog); o mesmo vale para '/'. 9) Seção 2: default 'Ativos' sugerido para o filtro Status só deve valer como persistência de escolha do usuário — primeira visita deve abrir em 'Todos' para não esconder usuários inativos sem ação explícita do gestor. 10) Seção 5: 'Esc fecha' e 'Horas Diárias default 8' já são comportamento atual (p-dialog closeOnEscape default e form com default 8) — não apresentar como melhorias novas no mockup/callouts. 11) Toggle de status (seção 3/callout ①): especificar reversão do switch em caso de erro do backend; registrar que o backend hoje permite inativar o último gestor ativo via status (a regra de 'mínimo 1 gestor' só cobre rebaixamento de tipo) — lacuna a validar com o time de backend.

## REDESIGN SPEC
# Redesign — Usuários (listagem + dialogs) · rota `/usuario` (só gestor)

Tela administrativa de contas do Project 2.0. Princípios do redesign: **toda ação frequente a 1 clique da linha** (status, editar, senha, excluir), **criação com defaults e Enter**, **filtros de 1 clique persistidos**, **undo no lugar de confirmação** (soft delete). Stack visual: PrimeNG Aura (primário azul) + Tailwind, tema claro/escuro, toasts bottom-center.

---

## 1. Header da página

- Linha única, mesma anatomia das demais telas (Projetos, Tags): à esquerda, título **"Usuários"** (h1, 1.5rem, semibold) seguido do contador muted **"7 usuários · 6 ativos"**.
- À direita, botão primário azul **"Novo Usuário"** (ícone `pi-plus`), tooltip "Novo Usuário (N)". Atalho de teclado **N** abre o dialog.

## 2. Toolbar de filtros (linha única, sem labels acima)

Da esquerda para a direita:
- **Busca** (flex-1): input com ícone `pi-search` embutido, placeholder `Buscar por nome ou login…  ( / )`, botão **×** para limpar quando preenchido. Debounce 400ms. Autofocus ao entrar na tela; tecla **/** foca de qualquer lugar.
- **Tipo** — SelectButton segmentado: `[ Todos ] [ Desenvolvedores ] [ Gestores ]` — 1 clique. ④
- **Status** — SelectButton segmentado: `[ Todos ] [ Ativos ] [ Inativos ]` — 1 clique; **default persistido da última visita** (localStorage), sugerido "Ativos". ④
- Quando qualquer filtro ≠ default: link discreto **"Limpar filtros"** no fim da toolbar.

## 3. Tabela (corpo principal)

`p-table` paginada, **25 itens/página default** (persistido), rodapé "Mostrando 1 a 7 de 7 usuários". Colunas:

| Coluna | Conteúdo | Interação |
|---|---|---|
| **Usuário** (ordenável) | Reutiliza o padrão do `usuario-cartao`: avatar circular 32px com iniciais (fundo azul suave) + **nome** (semibold) em cima e **login** (muted, 0.75rem) embaixo | Linha inteira clicável → abre **Dialog B (Perfil)** |
| **Cargo** (ordenável) | Texto simples | — |
| **Tipo** | Tag `Gestor` (âmbar) ou `Desenvolvedor` (azul info) | — |
| **Status** | **InputSwitch pequeno** + rótulo "Ativo"/"Inativo" (rótulo em cinza neutro quando inativo — nunca vermelho) | Clique alterna direto (otimista) + toast com **Desfazer**; linha inativa fica com opacidade 0.6 ① |
| **Anotações** | Ícone `pi-file-edit` azul-céu **só quando `temAnotacoes=true`**; no hover da linha, célula vazia mostra ícone fantasma "+" | Clique abre o dialog de anotações direto |
| **Ações** (reveladas no hover da linha; sempre visíveis em touch) | `pi-pencil` "Editar" → **Dialog A modo edição, direto** · `pi-lock` "Alterar senha" → **Dialog C, direto** · `pi-trash` "Excluir" → remoção imediata + undo ②⑤ | tooltips à esquerda |

### Dados de exemplo (7 linhas)

| Usuário | Cargo | Tipo | Status | Anotações |
|---|---|---|---|---|
| **Ana Souza** · ana.souza | Gestora de Projetos | Gestor | Ativo | ✦ tem |
| **Bruno Lima** · bruno.lima | Desenvolvedor Sênior | Desenvolvedor | Ativo | — |
| **Carla Mendes** · carla.mendes | Desenvolvedora Pleno | Desenvolvedor | Ativo | ✦ tem |
| **Diego Ferreira** · diego.ferreira | Desenvolvedor Júnior | Desenvolvedor | Ativo | — |
| **Elisa Rocha** · elisa.rocha | Analista de QA | Desenvolvedor | **Inativo** (linha esmaecida) | — |
| **Fábio Martins** · fabio.martins | Tech Lead | Desenvolvedor | Ativo | — |
| **Gustavo Nunes** · gustavo.nunes | Gestor de Operações | Gestor | Ativo | — |

## 4. Estados

- **Carregando (primeira carga)**: 6 linhas skeleton (círculo do avatar + 2 barras de texto), sem spinner bloqueante.
- **Atualização em segundo plano** (volta para a aba): refetch **silencioso**, sem esconder os dados existentes.
- **Vazio sem filtros**: ícone `pi-users` grande, texto "Nenhum usuário cadastrado ainda" e botão primário **"Novo Usuário"** centralizado. ⑥
- **Vazio com filtros/busca**: texto "Nenhum resultado para 'joana' em Inativos" e botão secundário **"Limpar filtros"**. ⑥

## 5. Dialog A — "Novo Usuário" / "Editar Usuário" (unificado) ③

Sobre a página de fundo **escurecida** (overlay ~40% preto; a tabela permanece visível esmaecida atrás). Dialog 36rem, cantos arredondados, header com título contextual.

**Modo criar** (header "Novo Usuário"):
1. **Nome Completo*** — `Helena Prado` — **autofocus**.
2. **Login*** — auto-preenchido **`helena.prado`** conforme o nome é digitado (para de sincronizar se editado manualmente); hint muted "Gerado a partir do nome — pode editar".
3. **Senha*** — p-password com olho (toggleMask) + botão **"Gerar"** (preenche senha forte, revela e mostra `pi-copy` para copiar); hint "Mínimo 8 caracteres".
4. Linha 2 colunas: **Cargo*** (`Desenvolvedora Pleno`) | **Horas Diárias** (stepper, **default 8**, sufixo "h/dia").
5. **Tipo*** — SelectButton `[ Desenvolvedor ] [ Gestor ]` com **"Desenvolvedor" já selecionado**.

Footer: `Cancelar` (ghost) · **`Criar Usuário`** (primário). **Enter envia de qualquer campo; Esc fecha.** Erros inline abaixo do campo (ex.: "Mínimo de 8 caracteres").

**Modo editar** (header "Editar Usuário — Bruno Lima", aberto pelo lápis da linha ou pelo botão Editar do perfil): mesmos campos **pré-preenchidos**, sem Senha (tem dialog próprio) e com Login exibido como texto muted imutável no topo; acrescenta **Status** (SelectButton `[ Ativo ] [ Inativo ]`) e **Tipo** (visível só para gestor editando perfil alheio — nunca o próprio). Botão primário **"Salvar Alterações"**. Ao salvar: fecha, toast de sucesso, linha atualizada com flash suave.

## 6. Dialog B — Perfil (leitura rápida)

Sobre fundo escurecido, 40rem. Aberto ao clicar em qualquer ponto da linha (avatar/nome).

- **Header**: avatar 56px "CM" + **"Carla Mendes"** + tags `Desenvolvedor` (azul) e `Ativo` (verde) na mesma linha; subtítulo muted **"carla.mendes · Membro desde 13/06/2026"** (usa `createdDate`).
- **Grid de fatos** (2 colunas): `CARGO — Desenvolvedora Pleno` · `HORAS DIÁRIAS — 8h/dia`.
- **Seção "Anotações"**: preview das primeiras ~3 linhas ("Responsável pelo módulo de autenticação. Ponto focal das integrações com o Portal do Cliente…") + "Atualizado em 25/06/2026" (usa `anotacoes` e `anotacoesAlteracaoData`) + botão link **"Abrir anotações"**. Se vazio: "Sem anotações" + botão **"+ Adicionar"**.
- **Footer**: **"Editar"** (primário → Dialog A modo edição) · "Alterar Senha" (ghost → Dialog C). Fecha por X, Esc ou clique fora.
- É atalho de leitura: **nenhuma edição exige passar por ele** — lápis e cadeado da linha vão direto. ②

## 7. Dialog C — Alterar Senha

Sobre fundo escurecido, ~380px. Header **"Alterar senha — Bruno Lima"**.
- Campo único **"Nova Senha"*** (autofocus, olho para revelar) + botão **"Gerar senha"** que preenche, revela e habilita `pi-copy` "Copiar" (sem campo de confirmação — o toggle de visibilidade cumpre o papel).
- Footer: `Cancelar` · **`Alterar Senha`** (primário). Enter envia.

## 8. Feedback e undo

- Toasts **bottom-center** (padrão do app). **Excluir**: sem dialog de confirmação — a linha some na hora e o toast de 6s mostra `Usuário "Diego Ferreira" excluído — [Desfazer]` (soft delete garante restauração). ⑤
- **Toggle de status**: mesmo padrão — `Elisa Rocha inativada — [Desfazer]`. ①
- Criação: linha nova entra na tabela com destaque temporário (flash azul suave).

## 9. Atalhos de teclado

`N` novo usuário · `/` foca a busca · `Enter` envia o dialog aberto · `Esc` fecha o dialog.

---

## Callouts numerados (destacar no mockup)

- **① Status vira switch inline na linha** — ativar/inativar cai de 5 cliques (2 dialogs + select) para **1 clique**, com Desfazer no toast.
- **② Ações diretas no hover da linha** (lápis, cadeado, lixeira) — editar sem pedágio do perfil: de 4 cliques para **2**.
- **③ Dialog unificado com defaults**: autofocus no Nome, login auto-gerado (`helena.prado`), Tipo pré-selecionado "Desenvolvedor", gerador de senha, **Enter salva** — criação de 5 cliques para **2**.
- **④ Filtros segmentados de 1 clique**, lembrados entre visitas (default "Ativos") — o gestor nunca reconfigura a tela.
- **⑤ Exclusão sem confirmação bloqueante** — remoção otimista + "Desfazer" no toast (coerente com o soft delete do sistema).
- **⑥ Empty states acionáveis** — botão "Novo Usuário" (lista vazia) ou "Limpar filtros" (busca sem resultado) direto no corpo da tabela.
