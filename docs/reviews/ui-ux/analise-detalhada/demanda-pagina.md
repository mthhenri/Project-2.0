# Demandas — página principal (árvore de demandas, painel de planejamento, grafo de conexões) (/demanda)

## Fluxos atuais
- **Abrir a tela e ver as demandas de um projeto (freq. diária)** (3 cliques): Clicar em 'Demandas' na topbar → clicar no select de projeto → escolher o projeto na lista. Nenhum projeto default: o último usado não é lembrado (só via queryParam se veio de link), e mesmo com um único projeto disponível não há auto-seleção.
- **Trocar o status de uma demanda no modo Lista (gestor, freq. alta)** (5 cliques): Botão-direito na linha → 'Editar' → dialog de edição abre → clicar no select de Status → escolher opção → clicar 'Salvar'. (No modo Planejamento a mesma tarefa custa 2 cliques: chip → opção.)
- **Ver o detalhe de uma demanda pela Lista** (2 cliques): Botão-direito na linha → 'Visualizar'. Clique simples na linha só expande/colapsa (inconsistente com o Grafo, onde 1 clique no nó abre o detalhe).
- **Criar demanda raiz (gestor)** (5 cliques): Clicar 'Nova Demanda' → clicar no campo Nome (sem autofocus) → digitar → ajustar campos desejados → clicar 'Criar Demanda' → dialog fica aberto sem aviso → clicar X/Cancelar para fechar.
- **Criar sub-demanda de uma estrutural** (6 cliques): Botão-direito na demanda estrutural → 'Nova Sub-demanda' → campo Nome (sem autofocus) → digitar → 'Criar Demanda' → fechar dialog manualmente. Pai vem pré-preenchido (bom).
- **Editar tags de uma demanda (gestor)** (4 cliques): Botão-direito → 'Tags' → aguardar carregamento → alternar 1+ chips → 'Salvar'.
- **Localizar uma demanda específica numa árvore com 3 níveis** (4 cliques): Sem busca ou filtro: expandir manualmente cada nó estrutural do caminho (1 clique por nível) e escanear visualmente. Se qualquer alteração for feita, a árvore colapsa toda e o processo recomeça.
- **Ver quem está executando agora no projeto (gestor)** (1 cliques): Clicar no modo 'Planejamento' (informação não existe na Lista nem no Grafo).
- **Editar a descrição técnica de uma demanda** (3 cliques): Botão-direito → 'Desc. Técnica' → aguardar GET da demanda → editar no editor → 'Salvar'.
- **Filtrar o grafo por status (ex.: esconder concluídas)** (0 cliques): Impossível hoje: o componente do grafo aceita filtroStatus, mas não há nenhum controle na UI.

## Problemas
- [ALTA] P01: Todas as ações da Lista estão escondidas atrás de context menu (botão-direito), sem nenhum affordance visível — nem ícones no hover, nem botão '⋯'. Usuário novo não descobre Editar/Tags/Membros/Descrições; inviável em touch.
- [ALTA] P02: Clique simples na linha da árvore expande/colapsa em vez de abrir o detalhe — inconsistente com o Grafo (1 clique no nó abre detalhe) e contraria a expectativa de listas (clique = abrir).
- [ALTA] P03: Não há busca textual nem filtros (status, tag) em nenhum modo. O filtro de status do grafo existe no código (@Input filtroStatus) mas nunca ganhou UI. Localizar demanda exige expandir e escanear.
- [ALTA] P04: Troca rápida de status (chip → popover, 2 cliques) existe só no Planejamento; na Lista a mesma ação custa 5 cliques via dialog de edição completo. Padrão bom não reaproveitado onde o usuário mais está.
- [ALTA] P05: A árvore perde todo o estado de expansão após qualquer alteração (recarga integral do grafo reconstrói os itens e os signals 'expandido' resetam). Usuário mexe numa demanda profunda e tem que reexpandir tudo.
- [MEDIA] P06: Último projeto usado não é lembrado (só queryParam); com um único projeto disponível não há auto-seleção. Toda visita começa com 2 cliques extras de seleção.
- [MEDIA] P07: Empty state 'Nenhuma demanda encontrada' não tem ação (sem botão 'Nova Demanda') e aparece indevidamente também quando nenhum projeto foi selecionado — mensagem enganosa nesse caso.
- [MEDIA] P08: Dialog Nova Demanda: sem autofocus no Nome, sem submit com Enter, e após criar o dialog permanece aberto silenciosamente (form resetado) — parece bug; não existe distinção 'Criar' × 'Criar e adicionar outra'.
- [MEDIA] P09: Formulário de criação mostra tudo de uma vez (pai, status, previsão, horas, membros, tags, estrutural) + dica de caracteres proibidos permanente — sem disclosure progressivo; o caminho feliz (nome + horas) fica poluído.
- [MEDIA] P10: Grafo e fundo da página usam cores dark hardcoded (#0d1117, #b0bec5, #4a9eff) — quebram o tema claro e destoam do padrão Aura/tokens usado no resto do app.
- [MEDIA] P11: Painel de Legenda ocupa 240px permanentes (aberto por default) para conteúdo estático de consulta rara; além disso a legenda é só informativa quando poderia ser filtro clicável por status.
- [MEDIA] P12: No Grafo, os dados do nó (status, estimado, executado, tags) só aparecem em tooltip nativo <title> — com delay do navegador, sem formatação e sem ações; nenhum caminho para editar direto do grafo além de abrir o detalhe.
- [MEDIA] P13: Modo de visualização não persiste (nem em URL nem em preferência): refresh ou retorno à tela sempre volta para Lista; F5 no Planejamento perde o contexto.
- [MEDIA] P14: Feedback não otimista: cada mudança dispara toast + recarga completa do grafo/planejamento (tela 'pisca', árvore colapsa — ver P05); exclusão usa confirm dialog em vez de undo.
- [BAIXA] P15: Toggle Grafo/Lista/Planejamento são 3 botões independentes (não um segmented control real); estados outlined/text pouco contrastantes entre si dificultam saber qual modo está ativo.
- [BAIXA] P16: Botão de seta-esquerda com tooltip 'Abrir projeto' tem aparência de 'voltar' de navegação — affordance ambígua para uma ação de ir ao detalhe do projeto.
- [BAIXA] P17: Nenhum atalho de teclado: sem 'N' para nova demanda, '/' para busca, setas para navegar/expandir árvore, Esc já fecha dialogs (PrimeNG) mas Enter não confirma.
- [BAIXA] P18: Sem ações em massa: não dá para selecionar várias demandas e trocar status/tag/membros de uma vez, apesar de listas potencialmente grandes.
- [BAIXA] P19: Dialog de detalhe repete o Status duas vezes (chip no cabeçalho + campo no grid de metadados) e o botão 'Nova Demanda' some no modo Grafo/Planejamento para gestor? (segue visível, ok) — mas 'Executando agora' e progresso não existem na Lista, forçando troca de modo para ver o dado mais operacional.
- [BAIXA] P20: No Planejamento o chip de status clicável não parece clicável (sem borda/ícone de dropdown) — o recurso de 2 cliques mais eficiente da tela é invisível sem tooltip.

## Sugestões (VERIFICAR: checar vs regras de negócio)
### S01 — Ações inline na linha da árvore (hover) + clique abre detalhe [impacto alto]
Na Lista: clique simples na linha abre o dialog de Detalhe (igual ao Grafo); o chevron passa a ser o único alvo de expansão (área de clique generosa). No hover da linha, revelar à direita: chip de status clicável (popover de troca rápida), botão '+' (Nova sub-demanda, se estrutural), e menu '⋯' com o restante (Editar, Tags, Membros, Descrições, Excluir). O context menu de botão-direito continua existindo como atalho.
_Redução de esforço:_ Ver detalhe: de 2 para 1 clique; trocar status: de 5 para 2; criar sub-demanda: descoberta imediata (antes só via botão-direito)

### S02 — Chip de status com popover em TODOS os lugares [impacto alto]
Reutilizar o popover de troca rápida do Planejamento na Lista (chip na linha), no dialog de Detalhe (chip do cabeçalho) e no card do nó do Grafo. Aplicar atualização otimista: troca o chip na hora, reverte com toast de erro se falhar — sem recarregar o grafo inteiro.
_Redução de esforço:_ Troca de status: de 5 cliques + reload para 2 cliques sem reload, em qualquer modo

### S03 — Toolbar com busca instantânea, filtros por status/tag e expandir/recolher tudo [impacto alto]
Barra abaixo do header: campo 'Buscar demanda...' (filtro client-side sobre os nós já carregados, auto-expande os ramos com match e destaca o termo), chips de status com contador (Pendente 4 · Planejada 6 · Concluída 3 · Cancelada 1) que ligam/desligam o filtro em Lista E Grafo (aproveita o @Input filtroStatus já existente), multiselect de tags e botões 'Expandir tudo/Recolher tudo'. Atalho '/' foca a busca.
_Redução de esforço:_ Localizar demanda: de 4+ cliques e varredura visual para 1 tecla + digitação; filtrar grafo: de impossível para 1 clique

### S04 — Preservar expansão da árvore + defaults de contexto [impacto alto]
Guardar o conjunto de IDs expandidos (signal no painel) e reaplicar após cada recarga; lembrar último projeto usado em localStorage e auto-selecionar quando houver apenas 1 projeto; persistir o modo de visualização na URL (?modo=planejamento) e como preferência.
_Redução de esforço:_ Elimina 2 cliques de seleção em toda visita e N cliques de reexpansão após cada alteração (em árvore de 3 níveis, ~4-8 cliques poupados por edição)

### S05 — Dialog Nova Demanda enxuto: autofocus, Enter, 'Criar e adicionar outra', 'Mais opções' [impacto alto]
Autofocus no Nome; Enter no form cria; dica de caracteres proibidos só quando o erro ocorre. Visíveis por padrão: Nome, Demanda Pai (pré-preenchida em contexto), Estimativa e checkbox Estrutural; Status default Planejada escondido com Previsão, Membros e Tags dentro de 'Mais opções' colapsado. Footer com dois botões: 'Criar' (fecha) e 'Criar e adicionar outra' (mantém aberto com foco de volta no Nome) — comportamento atual de ficar aberto vira opção explícita.
_Redução de esforço:_ Criação simples: de 5 cliques para 2 (Nova Demanda → digitar → Enter); criação em série ganha 1 clique a menos por item e fica previsível

### S06 — Empty states acionáveis e corretos [impacto medio]
Sem projeto selecionado: ilustração + 'Selecione um projeto para ver as demandas' com seta apontando o seletor (e auto-abrir o dropdown do select). Projeto sem demandas: 'Este projeto ainda não tem demandas' + botão primário 'Nova Demanda' central (gestor) / texto informativo (dev). Busca sem resultado: 'Nenhuma demanda para "x"' + botão 'Limpar filtros'.
_Redução de esforço:_ Primeira demanda de um projeto: de 3 cliques (achar botão no canto) para 1 clique no CTA central; elimina a interpretação errada do vazio atual

### S07 — Legenda vira popover + filtro clicável no Grafo [impacto medio]
Remover o painel lateral de 240px; a legenda vira popover ancorado no botão 'i' e cada item de status da legenda é clicável para ligar/desligar aquele status no grafo (mesmos chips da toolbar). Hover no nó mostra card flutuante estilizado (nome completo, status, estimado × executado, tags) em vez do <title> nativo, com clique abrindo o detalhe.
_Redução de esforço:_ +240px de área útil de grafo; informações do nó: de ~1s de delay de tooltip nativo para hover imediato e legível

### S08 — Tokens de tema no grafo e no fundo da página [impacto medio]
Substituir #0d1117/#b0bec5/#4a9eff por tokens (--app-surface-*, --p-primary-*) para o grafo respeitar tema claro/escuro como o resto do app.
_Redução de esforço:_ Zero cliques, mas remove a quebra visual entre modos e telas (consistência critério 10)

### S09 — Coluna de progresso e 'executando agora' também na Lista [impacto medio]
Na linha da árvore, substituir os textos '16h est.' / '12h exec.' por uma mini-barra de progresso compacta (mesma escala de cor do Planejamento) com rótulo '12h / 16h' e, quando houver executor ativo, a bolinha pulsante + iniciais do usuário. Dados já existem no DemandaGrafoNoDto (horasEstimadas, minutosExecutados) — executores ativos só existem no DTO de planejamento, então a bolinha aparece apenas para gestor quando os dados do planejamento estiverem carregados (ou omitida na v1).
_Redução de esforço:_ Gestor deixa de alternar de modo só para ver progresso: de 1 troca de modo + varredura para 0 cliques

### S10 — Atalhos de teclado [impacto baixo]
'N' abre Nova Demanda (gestor), '/' foca a busca, setas ↑↓ navegam a árvore, → expande / ← recolhe, Enter abre detalhe do item focado, Esc fecha dialogs (já nativo). Legenda de atalhos num tooltip '?'.
_Redução de esforço:_ Usuário frequente: fluxos de teclado puro; nova demanda de 1 clique+mira para 1 tecla

### S11 — Segmented control real para os modos [impacto baixo]
Trocar os 3 botões por p-selectbutton (Lista | Grafo | Planejamento) com estado ativo de alto contraste (fundo primário). Renomear o botão de seta para ícone 'pi-external-link' com label curto 'Projeto' para desfazer a ambiguidade de 'voltar'.
_Redução de esforço:_ Elimina erros de modo (cliques desperdiçados ao não perceber o modo ativo)


## REDESIGN SPEC
# Redesign — Demandas do Projeto (/demanda)

Tela de trabalho densa (desktop-first), tema claro/escuro via tokens (PrimeNG Aura, primário azul). Persona dos exemplos: gestora **Marina Castro** logada; projeto em contexto **"Portal do Cliente"**; devs **Ana Souza**, **Bruno Lima**, **Carla Mendes**.

---

## 1. Header da página (56px, surface-0, borda inferior 1px)

Linha única, 3 grupos:

**Esquerda:**
- Seletor de projeto: `p-select` largo (260px) com label flutuante embutida "Projeto", valor atual **"Portal do Cliente"**. Ao lado, botão-ícone `pi-external-link` (tooltip "Abrir página do projeto"). ④ O último projeto usado é pré-selecionado automaticamente (localStorage); com um único projeto disponível, auto-seleciona.
- Segmented control (p-selectbutton): **Lista | Grafo | Planejamento** — ativo com fundo primário sólido (ex.: "Lista" ativo). "Planejamento" só para gestor. Modo persiste na URL: `/demanda?projetoId=4&modo=lista`.

**Direita:**
- Botão-ícone `pi-question-circle` (tooltip "Atalhos: N nova demanda · / busca · ↑↓→← navegar").
- Botão primário **"Nova Demanda"** (`pi-plus`), gestor-only. Atalho **N**.

## 2. Toolbar de busca e filtros ① (48px, abaixo do header, surface-0)

- Campo de busca (320px, ícone `pi-search`): placeholder **"Buscar demanda…  ( / )"**. Filtra client-side em tempo real; na Lista auto-expande os ramos com resultado e destaca o termo em amarelo; no Grafo esmaece nós sem match.
- Chips-contador de status, clicáveis (toggle multi): `Pendente 3` (cinza) · `Planejada 5` (azul) · `Concluída 2` (verde) · `Cancelada 1` (vermelho). Ativo = preenchido; inativo = outline. Filtram Lista E Grafo (usa o filtroStatus já existente).
- Multiselect compacto **"Tags"** (opções ex.: Backend, Frontend, UX, Integração — com bolinha colorida).
- À direita: botões-texto **"Expandir tudo"** / **"Recolher tudo"** (só no modo Lista).
- Estado dos filtros persiste enquanto navega entre modos.

## 3. Corpo — modo Lista (árvore) ②③

Fundo surface-50, cartão branco/surface-0 com raio 8px contendo a árvore. Cada linha (40px, hover realça):

```
[›] 📁 Autenticação e Acesso                    [▓▓▓▓▓▓░░░ 22h30/40h]  [Planejada ▾]   (+) (⋯)
      [›]  Implementar login com e-mail e senha  ⦿Backend  [▓▓▓▓▓▓▓░ 12h/16h]  [Planejada ▾]  (⋯)
      [ ]  Recuperação de senha                  ⦿Backend  [░░░░░░░░ 0h/8h]    [Pendente ▾]   (⋯)
      [ ]  Tela de login responsiva  ● Ana Souza ⦿Frontend [▓▓▓▓▓▓▓▓ 10h30/12h] [Planejada ▾] (⋯)
[›] 📁 Área do Cliente                           [░░░ 0h/64h]           [Pendente ▾]    (+) (⋯)
[ ]  Integração com gateway de pagamento ⦿Integração [▓▓▓▓▓▓▓▓▓ 26h10/24h ⚠] [Planejada ▾] (⋯)
```

Anatomia da linha, esquerda → direita:
1. **Chevron** `pi-chevron-right` (rotaciona 90° expandido) — ÚNICO alvo de expandir/recolher, hitbox 32px. ③
2. Ícone `pi-folder` se estrutural.
3. **Nome** (clique em nome/linha abre o dialog de Detalhe — 1 clique). ③
4. Chips de tag pequenos (bolinha + nome, cor da tag).
5. **Mini-barra de progresso** (96px) com a escala de cor do Planejamento (azul→amarelo→laranja→vermelho) + rótulo `12h / 16h`; `⚠` vermelho quando estourou; tooltip com percentual e "restam Xh". (Dados: horasEstimadas × minutosExecutados do nó.)
6. **Chip de status clicável** com caret `▾` ② — abre popover com as 4 opções (Pendente/Planejada/Concluída/Cancelada, check na atual). Troca é **otimista**: chip muda na hora, toast bottom-center "Status alterado — Desfazer". Gestor-only; para dev, chip estático sem caret.
7. Ações no hover (fora do hover ficam invisíveis): **`+`** "Nova sub-demanda" (só estruturais) e **`⋯`** menu (Visualizar, Editar*, Tags*, Membros*, ─, Desc. Técnica, Desc. Cliente, Documentação, ─, Excluir* — * = gestor; ícones de descrição com glow azul quando preenchidas). Botão-direito na linha abre o mesmo menu.
8. Bolinha pulsante `●` + nome quando alguém executa agora (visível para gestor com dados do planejamento carregados).

Estado de expansão é preservado após qualquer alteração (recarga reaplica os IDs expandidos). ②

Navegação por teclado: ↑↓ move foco, → expande, ← recolhe, Enter abre detalhe.

## 4. Corpo — modo Grafo ⑥

- Canvas SVG ocupando toda a área (sem painel lateral fixo), fundo `--app-surface-50` com pontilhado sutil — segue tema claro/escuro.
- Nós: círculos por status (mesmas cores dos chips); estrutural = maior + borda tracejada; canceladas com 40% opacidade. Rótulo abaixo, truncado.
- **Hover** em nó: card flutuante estilizado (substitui o tooltip nativo): nome completo, chip de status, `12h / 16h est. (75%)`, tags. Some no mouseout; **clique** abre o Detalhe (1 clique, igual à Lista).
- Filtros da toolbar (status/tags/busca) atuam no grafo: nós fora do filtro somem, arestas órfãs também.
- Canto inferior-direito: botão flutuante `pi-info-circle` abre **popover de Legenda** (não painel): lista de status (cada item clicável = liga/desliga o filtro daquele status ⑥), nó comum × estrutural, aresta hierarquia (azul sólida →) × conexão (cinza tracejada). Canto inferior-esquerdo: controles de zoom `+ / − / ⌂ centralizar`.

## 5. Corpo — modo Planejamento (gestor)

Mantém a tabela atual com melhorias pontuais:
- Chip de status ganha caret `▾` explícito (affordance do popover — já existia, ficava invisível). ②
- Coluna "Demanda": caminho com últimos 2 níveis em negrito, ancestrais esmaecidos ("Autenticação e Acesso › **Tela de login responsiva**"); clique na célula abre o Detalhe.
- Coluna "Executando agora": `● Ana Souza` com pulso (como hoje).
- Linhas respondem à busca/filtros da toolbar ①.
- Exemplo de linhas: "Tela de login responsiva — Planejada — 10h30 / 12h est. (88%) · restam 1h30 — barra amarela — ● Ana Souza"; "Integração com gateway de pagamento — Planejada — 26h10 / 24h est. (109%) — barra vermelha — tag Estourou ⚠ — —".

## 6. Dialog "Nova Demanda" ⑤ (560px, sobre a página com overlay escurecido rgba(0,0,0,.5); a Lista fica visível esmaecida ao fundo)

Header: **"Nova Demanda — Portal do Cliente"** (projeto do contexto, não editável) + X.

Corpo (form curto, o essencial):
- **Nome*** — input com AUTOFOCUS, placeholder "Ex.: Exportação de relatórios em PDF". Erro de caracteres proibidos só aparece se ocorrer.
- **Demanda pai** — select de estruturais ("Nenhuma (raiz)" | "Autenticação e Acesso" | "Área do Cliente"); pré-preenchida quando aberto via `+` de uma estrutural.
- **Estimativa*** — inputnumber com sufixo "h" (ou "dia(s)" conforme preferência), default vazio com hint "0h = sem estimativa".
- **☐ Demanda estrutural (agrupa sub-demandas)**.
- Link expansor **"Mais opções ▾"** (colapsado por padrão) contendo: Status (default "Planejada"), Previsão de término (datepicker dd/mm/aaaa), Membros (multiselect com busca: Ana Souza, Bruno Lima, Carla Mendes), Tags (chips toggle coloridos: Backend, Frontend, UX, Integração).

Footer: `Cancelar` (texto) · **`Criar e adicionar outra`** (outline — cria, toast de sucesso, limpa o form e devolve o foco ao Nome) · **`Criar Demanda`** (primário — cria e FECHA). **Enter = Criar Demanda**; Esc fecha (com guarda se houver texto digitado).

## 7. Estados

- **Sem projeto selecionado:** ilustração leve + "Selecione um projeto para ver as demandas" + botão "Escolher projeto" que abre o dropdown do seletor no header. (Nunca mostrar "Nenhuma demanda encontrada" aqui.)
- **Carregando:** skeleton de 6 linhas de árvore (não spinner central) no modo Lista; spinner central apenas no Grafo.
- **Projeto sem demandas:** ícone `pi-inbox` + "Este projeto ainda não tem demandas" + botão primário central **"Nova Demanda"** (gestor) / "Peça a um gestor para criar a primeira demanda" (dev).
- **Busca/filtros sem resultado:** "Nenhuma demanda para 'gateway'" + botão-texto **"Limpar filtros"**.
- **Erro de rede:** faixa inline com "Não foi possível carregar as demandas" + botão "Tentar novamente".
- **Após alteração:** atualização otimista; toast bottom-center com **"Desfazer"** para status/tags; sem colapso da árvore.

## 8. Callouts numerados para o mockup

- **① Toolbar de busca + chips de status com contadores** — localizar/filtrar em 1 tecla ou 1 clique, valendo para Lista e Grafo (antes: inexistente).
- **② Chip de status clicável em toda linha com popover + atualização otimista** — troca de status de 5 cliques → 2, sem reload e sem colapsar a árvore.
- **③ Clique na linha abre o detalhe; chevron expande; ações `+` e `⋯` visíveis no hover** — fim das ações escondidas só no botão-direito; consistente com o Grafo.
- **④ Projeto lembrado + modo persistido na URL** — a tela abre pronta para trabalhar, 2-3 cliques a menos em toda visita.
- **⑤ Dialog enxuto com autofocus, Enter para criar, 'Criar e adicionar outra' e 'Mais opções' colapsado** — criação simples em 2 interações; criação em série explícita.
- **⑥ Legenda como popover-filtro e hover-card rico no Grafo** — +240px de canvas, legenda que também filtra, dados do nó sem delay de tooltip nativo.
