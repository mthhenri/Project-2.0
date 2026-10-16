# Anotações do usuário (página órfã + dialog de anotações acessível pela topbar e pela listagem de usuários) (/usuario/:id/anotacoes)

> ✅ Sugestões verificadas adversarialmente contra o código e as regras de negócio.

## Fluxos atuais
- **Registrar uma anotação rápida nas próprias notas (a partir de qualquer tela)** (4 cliques): 1) Clicar em 'Minhas Anotações' na topbar; 2) aguardar carregar (spinner cobre tudo); 3) clicar dentro do editor para dar foco (não há autofoco); 4) digitar; 5) clicar 'Salvar Anotações' (ou esperar até 30s pelo auto-save); 6) clicar no X para fechar (Esc e clique-fora desabilitados).
- **Gestor consultar as anotações de um usuário** (3 cliques): 1) Clicar em 'Usuários' na topbar; 2) localizar a linha e clicar no ícone de anotações (pi-file-edit); 3) ler no dialog de 95vw que cobre a listagem; 4) clicar no X para fechar.
- **Gestor editar as anotações de um usuário** (5 cliques): 1) 'Usuários' na topbar; 2) ícone de anotações na linha; 3) clicar no editor para focar; 4) digitar; 5) 'Salvar Anotações'; 6) X para fechar (e a listagem inteira recarrega).
- **Fechar o dialog tendo texto recém-digitado (não salvo)** (2 cliques): 1) Clicar no X (o dialog FECHA na hora, perdendo o editor de vista); 2) decidir no confirm 'Alterações não salvas' entre 'Salvar' e 'Descartar'. Se o auto-save de 30s tiver acabado de rodar, o confirm nem aparece — comportamento imprevisível para o usuário.
- **Apagar todas as anotações** (4 cliques): 1) Abrir o dialog (topbar ou listagem); 2) clicar 'Limpar Anotações'; 3) confirmar 'Limpar' no confirm dialog (persiste vazio imediatamente, sem undo); 4) fechar no X.
- **Acessar anotações via URL direta /usuario/:id/anotacoes (deep-link/favorito)** (0 cliques): 0 cliques, porém quebrado: a página redireciona para /usuario ignorando o :id; desenvolvedor ainda é barrado pelo gestorGuard e a intenção (abrir anotações) se perde completamente.

## Problemas
- [ALTA] P1: Rota /usuario/:id/anotacoes está morta: o componente redireciona para /usuario ignorando o :id, e o .html/.scss da página são código órfão (template: '' no TS) que diverge do dialog real. Deep-link/favorito não funciona e desenvolvedor é barrado pelo gestorGuard após o redirect.
- [ALTA] P2: O dialog modal de 95vw×95vh cobre o app inteiro: é impossível anotar OLHANDO os dados (uma execução, uma demanda, a listagem) — exatamente o caso de uso de anotações. Viola 'ação no ponto de decisão' e força ciclos abrir→memorizar→fechar→conferir→reabrir.
- [ALTA] P3: Fechar é caro e imprevisível: Esc e clique-fora estão desabilitados (só o X fecha); o fluxo aoTentarFechar FECHA o dialog primeiro e só depois pergunta 'Deseja salvar antes de fechar?' — o usuário decide sem ver o texto; e a resposta depende de o auto-save de 30s ter rodado ou não.
- [ALTA] P4: Auto-save cego por interval(30000): envia PUT a cada 30s mesmo sem nenhuma alteração, corrompe 'Última alteração' (atualiza a data sem edição real), seta houveAlteracao=true e força reload completo da listagem ao fechar; também amplia risco de last-write-wins se gestor e o próprio usuário abrirem as mesmas anotações.
- [MEDIA] P5: Zero suporte a teclado: sem autofoco no editor ao abrir (exige um clique só para começar a digitar), sem Ctrl+S para salvar, sem Esc para fechar, sem atalho global para abrir as anotações de qualquer tela.
- [MEDIA] P6: 'Limpar Anotações' persiste o vazio imediatamente após o confirm ('Esta ação não pode ser desfeita') — padrão confirm+irreversível em vez de ação otimista com Desfazer; dois p-confirmDialog para uma tela de nota pessoal.
- [MEDIA] P7: Feedback de salvamento fragmentado em 4 lugares: tag 'Alterado' no header, dica estática 'Salvo automaticamente a cada 30 segundos' no rodapé, toast no salvamento manual e data de última alteração com segundos — o usuário nunca sabe com certeza se o texto atual já está salvo.
- [MEDIA] P8: Toolbar padrão completa do Quill (fontes, cores, imagem, vídeo, code-block...) para um bloco de notas pessoal: ruído visual e opções que geram conteúdo problemático (imagem base64 num campo texto); sem placeholder nem empty state acionável — editor abre em branco absoluto.
- [BAIXA] P9: Microtextos verbosos/redundantes: 'Anotações — Ana Souza' quando o próprio usuário abre as SUAS notas (deveria ser 'Minhas anotações'); botões 'Salvar Anotações'/'Limpar Anotações' repetem a palavra do título; data absoluta com segundos em vez de tempo relativo ('há 2 h').
- [BAIXA] P10: Estado de carregamento substitui tudo por spinner central (sem skeleton do editor), causando salto de layout; altura mágica calc(95vh - 10rem) deixa folga inconsistente.
- [BAIXA] P11: Ao fechar após qualquer salvamento (inclusive os auto-saves sem mudança), aoAlterar dispara buscarUsuarios() e recarrega a listagem inteira — sendo que o único dado derivado é o booleano temAnotacoes da linha.

## Sugestões aprovadas na verificação
### S1 — Auto-save por mudança (debounce ~2s) + indicador de salvamento único e vivo [impacto alto]
Substituir o interval(30000) — que hoje dispara PUT /usuario/:id a cada 30s MESMO SEM MUDANÇA (salvarSilencioso não checa temAlteracoesNaoSalvas) — por auto-save via valueChanges com debounce ~2s e flush imediato ao fechar/perder foco. Sem mudança = zero requisição. CORREÇÃO FACTUAL: o backend já protege o timestamp (usuario.repository.ts usa IS DISTINCT FROM no anotacoes_alteracao_data), então o ganho real não é 'não corromper Última alteração', e sim: (1) eliminar PUTs inúteis; (2) corrigir o houveAlteracao=true indevido que hoje força reload da listagem inteira ao fechar mesmo sem edição real — só emitir aoAlterar quando o conteúdo efetivamente mudou. Rodapé ganha indicador único 'Editando…' → 'Salvando…' (spinner) → '✓ Salvo às 14:32', substituindo a tag 'Alterado', a dica estática dos 30s e o toast de sucesso. Botão 'Salvar' vira fallback (Ctrl+S). O confirm 'Alterações não salvas' (aoTentarFechar + p-confirmDialog key anotacoes-fechar) é eliminado — nunca há mais que ~2s de texto não salvo.
_Redução de esforço:_ Fluxo 'anotar rápido': de 4 cliques + decisão de confirm para 2 cliques (abrir, fechar); elimina 1 confirm dialog, o toast repetitivo e o reload desnecessário da listagem a cada fechamento

### S2 — Trocar o modal de 95vw por drawer lateral (~520px) que deixa a tela visível [impacto alto]
Renderizar as anotações num p-drawer (PrimeNG 21 confirmado no package.json) ancorado à direita com scrim leve — o usuário continua vendo execução/demanda/listagem atrás enquanto digita. Hoje o p-dialog de 95vw/95vh cobre tudo e ainda bloqueia Esc (closeOnEscape=false) e clique fora (dismissableMask=false). Esc e clique no scrim passam a fechar (seguro porque S1 garante flush no fechamento). Compatível com permissões verificadas no backend: dev lê/altera só as próprias anotações (403 caso contrário), gestor as de qualquer um — os dois contextos (topbar e listagem) usam o mesmo componente sem mudança de API.
_Redução de esforço:_ Elimina os ciclos fechar→conferir dado→reabrir (hoje 2+ cliques e perda de contexto por ciclo); anotar consultando a tela passa a custar 0 cliques extras

### S3 — Autofoco no editor + atalhos de teclado (Ctrl+S, Esc, atalho global) [impacto medio]
Nada disso existe hoje: sem autofocus, closeOnEscape=false, sem Ctrl+S, sem atalho global. Ao abrir, foco automático no editor com cursor no fim do texto (funde o autofoco que a S6 duplicava). Ctrl+S salva imediatamente; Esc fecha (com flush da S1); atalho global abre/fecha 'Minhas anotações' de qualquer tela. RESSALVA: Alt+N conflita com accesskeys/menus nativos em alguns navegadores (Firefox) — validar ou preferir combinação segura (ex.: Ctrl+Alt+N). Documentar os atalhos no tooltip do botão da topbar (hoje 'Suas anotações pessoais').
_Redução de esforço:_ -1 clique por sessão de anotação (foco) e abertura/fechamento com 0 cliques via teclado

### S4 — 'Limpar' otimista com Desfazer no lugar do confirm irreversível [impacto medio]
Hoje limpar() exige confirm 'Esta ação não pode ser desfeita' (p-confirmDialog key anotacoes-limpar) e ainda dispara o toast enganoso 'Anotações salvas com sucesso'. Passa a: 1 clique zera o editor + toast bottom-center (padrão já usado no app) 'Anotações limpas — Desfazer' (7s); a persistência do vazio ocorre pelo auto-save da S1 só APÓS a janela de undo. REGRA ADICIONAL obrigatória: fechar o drawer durante a janela de 7s não pode deixar o flush-ao-fechar atropelar o undo — o toast e o prazo permanecem, e o vazio só persiste quando a janela expira sem Desfazer. Remove o segundo p-confirmDialog.
_Redução de esforço:_ De 2 cliques + leitura de aviso ameaçador para 1 clique reversível

### S5 — Deep-link /usuario/:id/anotacoes que abre o drawer + remoção do código órfão [impacto medio]
Confirmado quebrado: a rota carrega UsuarioAnotacoesPage (template: '') que só redireciona para /usuario — rota com gestorGuard, então desenvolvedor é rebatido para '/'. Os arquivos usuario-anotacoes.page.html/.scss são órfãos (o HTML referencia carregando(), formulario, cancelar() e salvar() que não existem no stub) — excluir. Nova resolução: gestor → listagem de Usuários com o drawer já aberto para o :id (mantendo gestorGuard nessa variante); usuário comum com id PRÓPRIO → rota padrão /ponto com o drawer aberto; usuário comum com id ALHEIO → redirecionar para /ponto SEM abrir o drawer (o backend retorna 403 no GET /usuario/:id, verificado no usuario.service.ts do backend). URLs viram atalhos compartilháveis entre gestores.
_Redução de esforço:_ Deep-link: de quebrado (redirect + guard que expulsa) para 0 cliques até o conteúdo; remove ~60 linhas de código morto

### S6 — Toolbar enxuta de 1 linha + placeholder acionável no vazio [impacto medio]
Hoje o p-editor não define header customizado, então renderiza a toolbar padrão completa do Quill (fontes, cores, imagem, vídeo, code-block etc.) e não há placeholder — o estado vazio é um editor em branco mudo. Restringir via ng-template de header a: H2, Negrito, Itálico, Sublinhado, Tachado, lista com marcadores, lista numerada, link, limpar formatação. Placeholder do p-editor: 'Escreva lembretes, pendências, links… O texto salva sozinho.' — o empty state é o próprio campo pronto para digitar (o autofoco fica na S3, sem duplicar aqui).
_Redução de esforço:_ Remove ~15 controles de ruído irrelevantes para nota pessoal; empty state acionável = 0 cliques para começar a digitar

### S7 — Header contextual e microtextos curtos [impacto baixo]
Hoje o título é sempre 'Anotações — {nome}' mesmo quando o próprio usuário abre pela topbar (que passa sessao.nomeCompleto). Passa a: 'Minhas anotações' quando usuarioId === sessao.id(); 'Anotações de {nome}' quando gestor abre as de outro. Última alteração em tempo relativo ('Editado há 2 h') com tooltip dd/MM/yyyy HH:mm — o dado existe (anotacoesAlteracaoData em UsuarioRecuperadoDto e UsuarioAlteradoDto), só requer pipe de tempo relativo no frontend. Botões encurtados: 'Salvar' e 'Limpar' (hoje 'Salvar Anotações'/'Limpar Anotações'). Melhoria majoritariamente de leitura/estética — por isso impacto baixo.
_Redução de esforço:_ Leitura mais rápida do estado e do contexto (de quem são as notas); rótulos 1-2 palavras mais curtos sem perda de clareza


## Ajustes de implementação apontados pelo verificador
1) Corrigir a justificativa do auto-save (seção 4.1 e callout ③): o backend JÁ protege anotacoes_alteracao_data com 'IS DISTINCT FROM' no UPDATE (usuario.repository.ts), portanto salvar sem mudança não corrompe 'Editado há…'; o ganho real é eliminar PUTs inúteis a cada 30s e o houveAlteracao=true indevido que hoje força reload da listagem inteira ao fechar — a spec deve mandar emitir aoAlterar apenas quando houve mudança real. 2) Deep-link (seção 4.5): especificar o caso de desenvolvedor acessando /usuario/:id/anotacoes com id de OUTRO usuário — o backend responde 403 no GET /usuario/:id; redirecionar para /ponto sem abrir o drawer. A variante do gestor sobre a listagem deve preservar o gestorGuard existente. 3) Conflito entre flush-ao-fechar (4.2) e undo do Limpar (4.3): se o usuário fechar o drawer durante a janela de 7s, o flush não pode persistir o vazio imediatamente — definir que o undo tem precedência (toast permanece; vazio só persiste após expirar sem Desfazer). 4) Atualização local do ícone temAnotacoes (4.2): a regra do backend considera 'vazio efetivo' via regexp que descarta tags HTML, &nbsp; e espaços — a spec deve mandar replicar essa regra no frontend ou derivar do campo anotacoes retornado no PUT (UsuarioAlteradoDto traz anotacoes e anotacoesAlteracaoData), senão um conteúdo '<p><br></p>' deixaria o ícone azul indevidamente. 5) Atalho Alt+N (4.4): conflita com accesskeys nativos em navegadores como Firefox — validar ou trocar por combinação segura (ex.: Ctrl+Alt+N), mantendo a documentação no tooltip. 6) Mockup do Contexto B (seção 1): a tabela real de Usuários tem colunas Nome, Login, Cargo, Tipo, Status, Ações — incluir Login e Cargo nas linhas de exemplo para fidelidade; o destaque azul do ícone pi-file-edit quando temAnotacoes=true já existe hoje (styleClass usuario-listagem__btn-anotacao--ativo), o mockup deve retratá-lo como comportamento mantido, não novo. 7) Tooltip do X 'Fechar (Esc)' exige habilitar closeOnEscape/equivalente no drawer — hoje o dialog bloqueia Esc explicitamente; garantir que a spec mencione a mudança.

## Especificação do redesign
# Redesign — Anotações do usuário (painel sobre a página, fundo escurecido)

## Conceito
As anotações deixam de ser um modal de 95vw que cobre o app e passam a ser um **painel lateral (drawer) ancorado à direita**, aberto sobre a página atual com **scrim leve** (fundo escurecido ~30%, conteúdo de trás ainda legível). O salvamento é **automático por mudança** (debounce 2s), então fechar é sempre seguro: **Esc, clique no scrim ou X** fecham sem confirmação. O modelo de dados permanece o existente: um único campo rich-text `anotacoes` por usuário + `anotacoesAlteracaoData` (nada de lista de notas — o backend não tem isso).

Dois contextos, mesmo componente:
- **Contexto A (qualquer usuário)**: botão "Minhas Anotações" na topbar → abre o drawer com as próprias notas, sobre a tela em que a pessoa está (ex.: Atividades).
- **Contexto B (gestor)**: ícone de anotações na linha da listagem de Usuários → abre o drawer com as notas daquele usuário, sobre a listagem.

O mockup deve retratar o **Contexto B**: página de listagem de Usuários ao fundo (escurecida), drawer aberto à direita.

---

## 1. Página de fundo (escurecida pelo scrim)
Listagem de Usuários visível por trás, com opacidade reduzida pelo scrim `rgba(0,0,0,0.32)`:
- Topbar: logo • Ponto • Calendário • Projetos • Demandas • Atividades • Execuções • Tags • **Usuários** (ativo) — à direita: "14:32 10/07/2026", botão "Minhas Anotações" (pi-file-edit), avatar (pi-user), sair (pi-sign-out).
- Header da página: título "Usuários", botão primário "+ Novo Usuário", busca e filtros (Tipo, Status).
- Tabela com linhas de exemplo: **Ana Souza** (Gestora, Ativa), **Bruno Lima** (Desenvolvedor, Ativo) ← linha com leve destaque (é dele o drawer aberto), **Carla Menezes** (Desenvolvedora, Ativa), **Diego Ferreira** (Desenvolvedor, Inativo). Cada linha com ações: pi-eye (perfil), pi-file-edit (anotações — preenchido/azul quando `temAnotacoes = true`, caso de Bruno e Carla), pi-trash.

## 2. Drawer de anotações (painel direito, ~520px, altura total)
Elevação alta (sombra à esquerda), cantos arredondados no lado esquerdo, tema claro/escuro conforme o app.

### 2.1 Header do drawer
- Linha 1: ícone pi-file-edit + título **"Anotações de Bruno Lima"** (no Contexto A seria **"Minhas anotações"**). À direita: botão X (fechar, tooltip "Fechar (Esc)").
- Linha 2 (muted, 0.8rem): pi-history + **"Editado há 2 h"** — tooltip com a data completa "10/07/2026 12:14". Se nunca editado: "Sem alterações registradas".

### 2.2 Toolbar do editor (1 linha, enxuta) — ①
Somente: **H2 • B • I • U • S • lista com marcadores • lista numerada • link • limpar formatação**. Nada de fontes, cores, imagem, vídeo ou code-block. Fixa no topo do editor ao rolar.

### 2.3 Corpo — editor (flex: 1, rola internamente) — ②
Editor rich-text já **focado ao abrir** (cursor no fim do texto). Conteúdo de exemplo realista:

> **Alinhamento — Portal do Cliente (10/07)**
> Combinado com a Ana Souza: priorizar a demanda de autenticação antes do relatório mensal.
>
> **Pendências**
> - Revisar execuções em aberto da atividade "Integração de pagamento"
> - Perguntar à Carla sobre a conexão de demandas do módulo Faturamento
> - Apontar ponto de ontem (esqueci a saída do almoço)
>
> *Lembrete: dia não útil cadastrado em 20/07 — replanejar a sprint.*

### 2.4 Rodapé (barra fixa) — ③
- Esquerda: **"Limpar"** (link/botão text, danger, pi-trash).
- Centro: **indicador de salvamento único e vivo** — estados: "Editando…" (muted) → "Salvando…" (spinner pequeno) → "✓ Salvo às 14:32" (verde suave). Substitui a tag "Alterado", a dica "salvo a cada 30 segundos" e o toast de sucesso.
- Direita: **"Salvar"** (primário pequeno, pi-save, tooltip "Ctrl+S") — fallback; na prática o auto-save resolve.

---

## 3. Estados
- **Carregando**: header já visível; no lugar do editor, **skeleton** (3 linhas cinzas de larguras 90/70/80% + bloco) — sem spinner que cobre tudo, sem salto de layout.
- **Vazio**: editor focado com placeholder **"Escreva lembretes, pendências, links… O texto salva sozinho."** — o empty state É o campo pronto para digitar; sem tela intermediária com botão.
- **Com dados**: conteúdo da seção 2.3 + "Editado há 2 h" no header + "✓ Salvo às 14:32" no rodapé.
- **Salvando**: indicador central do rodapé em "Salvando…" com spinner de 12px.

## 4. Interações-chave
1. **Auto-save por mudança**: `valueChanges` → debounce 2s → PUT `/usuario/:id { anotacoes }`; flush imediato ao fechar/perder foco. Sem mudança = nenhuma requisição (não altera "Editado há…" nem recarrega a listagem).
2. **Fechar sem medo**: Esc, clique no scrim ou X — sem confirm de "alterações não salvas" (no pior caso, o flush salva ao fechar). Ao fechar no Contexto B, apenas a linha do usuário atualiza o estado do ícone `temAnotacoes` (sem reload da tabela inteira).
3. **Limpar com Desfazer**: 1 clique zera o editor + toast bottom-center "Anotações limpas — **Desfazer**" (7s); persistência do vazio só após a janela de undo. Sem confirm dialog.
4. **Teclado**: autofoco ao abrir; **Ctrl+S** salva agora; **Esc** fecha; **Alt+N** abre/fecha "Minhas anotações" de qualquer tela (tooltip do botão da topbar documenta o atalho).
5. **Deep-link**: `/usuario/:id/anotacoes` abre a tela adequada com o drawer já aberto para o `:id` (gestor: sobre a listagem; usuário comum com id próprio: sobre /ponto). Código órfão da página antiga é removido.

## 5. Callouts numerados (o mockup deve apontar visualmente)
- **①** Toolbar enxuta de 1 linha — 9 controles no lugar da toolbar completa do Quill (menos ruído para uma nota pessoal).
- **②** Autofoco + placeholder acionável — começar a digitar custa 0 cliques; o empty state é o próprio editor.
- **③** Indicador único de salvamento "Editando… → Salvando… → ✓ Salvo às 14:32" — substitui tag "Alterado" + dica estática + toast; auto-save por mudança (2s), não por relógio cego de 30s.
- **④** Drawer de ~520px com a listagem visível atrás (scrim leve) — anotar olhando os dados, sem ciclo fechar→conferir→reabrir.
- **⑤** Fechar por Esc/clique-fora/X sem confirmação — o flush no fechamento garante que nada se perde (elimina o confirm "Alterações não salvas").
- **⑥** "Limpar" otimista com toast "Desfazer" (7s) — sem confirm irreversível "Esta ação não pode ser desfeita".
