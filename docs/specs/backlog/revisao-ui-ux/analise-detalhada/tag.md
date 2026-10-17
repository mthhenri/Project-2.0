# Tags — listagem/gestão + seletor de cor (/tag (só gestor))

> ✅ Sugestões verificadas adversarialmente contra o código e as regras de negócio.

## Fluxos atuais
- **Criar uma tag escolhendo cor da paleta** (4 cliques): Clique em "Nova Tag" → clique no campo Nome (sem autofocus) → digita o nome → clique numa cor da paleta → clique em "Criar" (Enter não submete). Dialog fecha e lista recarrega do servidor.
- **Criar uma tag aceitando a cor default (#3b82f6)** (3 cliques): Clique em "Nova Tag" → clique no campo Nome → digita → clique em "Criar".
- **Criar 5 tags em sequência (setup inicial do sistema)** (20 cliques): O dialog fecha após cada criação, obrigando a reabrir: 5 × (Nova Tag + focar campo + cor + Criar) ≈ 5 × 4 = 20 cliques, com refetch da lista entre cada uma.
- **Editar o nome de uma tag** (4 cliques): Localizar a tag por varredura visual (sem busca) → clique no lápis → selecionar/limpar o texto no campo (1-2 cliques) → digita → clique em "Salvar".
- **Trocar apenas a cor de uma tag** (3 cliques): Clique no lápis → clique na nova cor da paleta → clique em "Salvar". Abre um dialog inteiro (com campo Nome, dica, gradiente) só para 1 clique de cor.
- **Excluir uma tag** (2 cliques): Clique na lixeira → clique em "Excluir" no confirm dialog (que afirma incorretamente que a ação é irreversível, apesar do soft delete).
- **Localizar uma tag específica entre 40+** (0 cliques): Zero cliques, mas varredura visual completa da grade sem busca, sem ordenação garantida e sem contador — esforço cognitivo alto e crescente com o volume.

## Problemas
- [ALTA] P1: Criação em série é penosa: o dialog fecha após cada tag criada, obrigando a reabrir e re-preencher para cada nova tag (~4 cliques/tag). Não há "criar e adicionar outra" nem criação inline. É exatamente o caso de uso mais frequente desta tela (montar o vocabulário de tags no início).
- [ALTA] P2: Sem campo de busca/filtro: localizar uma tag entre dezenas exige varredura visual da grade inteira. Inconsistente com a tela de Usuários, que tem barra de filtros — quebra o critério de consistência entre telas.
- [ALTA] P3: Sem autofocus no campo Nome ao abrir o dialog e sem submit por Enter (form sem ngSubmit; botões usam onClick). Cada criação custa 1 clique extra para focar + 1 clique no botão que o Enter dispensaria.
- [MEDIA] P4: Confirm dialog de exclusão com texto incorreto: "Esta ação não pode ser desfeita" — o sistema usa soft delete em tudo. Além de desinformar, o padrão confirm+2 cliques é mais lento que exclusão otimista com Desfazer no toast.
- [MEDIA] P5: Seletor de cor sem disclosure progressivo: o colorpicker inline (gradiente), a amostra grande, o input hex e a paleta de 15 cores aparecem TODOS simultaneamente, ocupando >50% do dialog, quando o caso dominante é 1 clique numa cor da paleta. O gradiente/hex é o caso raro e deveria estar recolhido.
- [MEDIA] P6: Refetch completo da lista (buscarTags) após cada criar/editar/excluir: latência perceptível, flicker de loading e tráfego desnecessário. O TagCriadaDto/TagAlteradaDto retornam o registro — dá para atualizar o signal localmente (update otimista).
- [MEDIA] P7: Dois dialogs duplicados (Nova Tag / Editar Tag) com HTML e validações quase idênticos — risco de divergência e o dobro de manutenção; deveriam ser um único dialog com modo.
- [MEDIA] P8: Trocar só a cor — micro-tarefa frequente — exige abrir o dialog completo de edição (3 cliques + custo cognitivo do formulário inteiro). Não há ação inline no ponto de decisão (o card onde a cor é vista).
- [BAIXA] P9: Empty state não acionável: só ícone e texto "Nenhuma tag cadastrada", sem botão "Nova Tag" — o usuário precisa voltar os olhos ao canto superior direito.
- [BAIXA] P10: Bloco de prévia condicional (@if nome && cor) provoca salto de layout ao digitar a primeira letra; como a cor sempre tem default, a prévia poderia ser permanente com placeholder.
- [BAIXA] P11: Dica de caracteres proibidos permanentemente visível sob o campo Nome — ruído constante para informação raramente necessária; deveria aparecer só no erro (o próprio directive já bloqueia a digitação).
- [BAIXA] P12: Sem ordenação garantida nem contador de itens ("N tags"): a grade exibe na ordem do backend, dificultando scan previsível; ordenação alfabética client-side custa uma linha.
- [BAIXA] P13: Input hex do seletor de cor falha silenciosamente: hex inválido digitado é ignorado sem nenhum feedback visual.
- [BAIXA] P14: Botão destrutivo (lixeira) sempre exposto colado ao lápis em todos os cards — convite a misclick (o confirm dialog existe em parte para compensar isso). Ações poderiam aparecer no hover/focus, reduzindo ruído visual da grade.
- [BAIXA] P15: Sem ações em massa: limpeza de tags obsoletas exige excluir uma a uma (2 cliques cada). Uma seleção múltipla leve com "Excluir selecionadas" resolveria (o DELETE por id já existe; o front pode iterar).
- [BAIXA] P16: Título "Gerenciar Tags" foge do padrão das demais telas ("Usuários", "Projetos" — substantivo puro), quebrando a consistência de header.

## Sugestões aprovadas na verificação
### S1 — Quick-add inline no topo: criar tag sem abrir dialog [impacto alto]
Verificado: hoje o fluxo é botão 'Nova Tag' → dialog com nome + seletor-cor completo → clique em 'Criar' → refetch da lista. Aprovado substituir por linha de criação rápida fixa (input nome + swatch de cor com popover da paleta de 15 cores + Enter cria), mantendo o dialog só para edição. AJUSTES OBRIGATÓRIOS: (1) a inserção otimista deve usar id temporário e reconciliar com o id real de TagCriadaDto ({id, nome, cor, createdDate}) na resposta — ações de editar/excluir no item ficam bloqueadas até a reconciliação; (2) em erro do servidor (ex.: 400 'Já existe uma tag com esse nome' por corrida com outro gestor — a validação client-side contra a lista carregada mitiga mas não elimina), remover o item da grade, restaurar o texto no input e mostrar o hint de erro; (3) inserir a nova tag na posição alfabética correta, pois o backend já ordena por nome e a grade deve preservar essa ordem.
_Redução de esforço:_ criar 1 tag: de ~4 cliques (botão + foco no campo + Criar) para digitar+Enter; criar 5 tags em série: de ~20 cliques para 5 nomes + 5 Enters, sem nenhum dialog

### S2 — Busca instantânea no header com contador [impacto alto]
Verificado: não existe busca na tela; listar() retorna a lista completa sem paginação, então filtro client-side a cada tecla é viável e sem custo de rede. REFORMULAÇÃO: a 'ordenação alfabética fixa' proposta já existe no backend (ORDER BY tag.nome ASC) — não é novidade; o requisito real é apenas preservá-la nas inserções otimistas. Aprovado: campo 'Buscar tag...' no header com ícone pi pi-search, filtro client-side, contador de tags (derivado de tags().length; exibir '3 de 12' quando houver filtro ativo) e atalho '/' para focar — desde que o atalho seja ignorado quando o foco já estiver em input/textarea ou com dialog aberto. Consistente com o padrão de filtro com campo 'Buscar' já existente em Usuários.
_Redução de esforço:_ localizar 1 tag entre dezenas (há seed de tags padrão nas migrations 0017/0018): de varredura visual da grade para 2-3 teclas

### S3 — Popover de paleta direto no card para troca de cor [impacto alto]
Verificado: hoje trocar cor exige abrir o dialog de edição inteiro. TagAlterarDto tem nome?/cor? opcionais e o service backend só revalida unicidade quando nome é enviado — PUT apenas com cor é suportado sem mudança de backend. p-popover existe no PrimeNG 21. Aprovado: dot/swatch de cor clicável no card abre p-popover com a paleta de 15 cores + link 'Personalizar...' (gradiente + hex dentro do próprio popover); clique na cor → PUT imediato + recoloração otimista do pill + popover fecha, com rollback da cor anterior em caso de erro. AJUSTE: o dot de 0.875rem é alvo pequeno — dar área clicável de pelo menos 1.5rem (padding no botão) e aria-label 'Trocar cor'.
_Redução de esforço:_ trocar cor: de 3+ cliques com dialog inteiro no meio (abrir edição, escolher cor, Salvar) para 2 cliques no ponto onde a cor é vista

### S4 — Exclusão otimista com Desfazer no toast (sem confirm dialog) [impacto medio]
Verificado: o confirm atual diz 'Esta ação não pode ser desfeita', o que é incorreto — o backend faz soft delete (tagRepositorio.excluir → is_deleted). Aprovado remover o confirm e adotar exclusão otimista com toast 'Tag X excluída · Desfazer' (~6s). RESTRIÇÕES DE IMPLEMENTAÇÃO VERIFICADAS: (1) não existe endpoint de restauração de tag — o Desfazer só é viável ADIANDO o DELETE até o toast expirar, exatamente como a spec descreve; (2) obrigatório dar flush nos DELETEs pendentes em navegação de rota, refresh e fechamento da aba (ngOnDestroy + beforeunload), senão a exclusão se perde silenciosamente; (3) o p-toast é global no layout — o toast com botão Desfazer precisa de key própria e template dedicado na página de Tags para não afetar os demais toasts do app.
_Redução de esforço:_ excluir: de 2 cliques + leitura de dialog para 1 clique; erro recuperável em 1 clique no Desfazer em vez de recriar a tag manualmente

### S5 — Autofocus + submit com Enter nos formulários [impacto medio]
Verificado: os forms atuais não têm (ngSubmit) — os botões usam (onClick) — e nenhum campo recebe foco automático ao abrir o dialog. Aprovado: autofocus no campo Nome (pAutoFocus do PrimeNG, aplicado após a abertura do dialog) com texto pré-selecionado na edição; form com (ngSubmit) e botão Salvar/Adicionar como type=submit para Enter salvar; Esc fecha (nativo do p-dialog, já ativo). Aplica-se ao quick-add (S1) e ao dialog de edição.
_Redução de esforço:_ -1 clique para focar o campo e -1 clique no botão em toda criação/edição; edição de nome vira: abrir, digitar, Enter

### S6 — Disclosure progressivo no seletor de cor + feedback de hex inválido [impacto medio]
Verificado: o seletor-cor atual exibe simultaneamente colorpicker gradiente inline + input hex + paleta de 15 cores, e o digitarHex() descarta silenciosamente valores inválidos (zero feedback — defeito real de usabilidade). Aprovado: paleta + amostra atual visíveis por padrão; gradiente + hex recolhidos atrás de 'Cor personalizada'; hex inválido ganha borda vermelha + hint 'Hex inválido'. ATENÇÃO VERIFICADA: o componente é compartilhado com Projetos (projeto-formulario-dialog e projeto-detalhe) — a mudança se propaga para essas telas; isso é desejável (consistência) mas exige validar os dois dialogs de Projeto ou adicionar um input booleano para controlar o modo expandido inicial.
_Redução de esforço:_ dialog de edição ~50% menor e mais rápido de escanear; caso comum (cor da paleta) permanece 1 clique sem o ruído do gradiente; hex inválido deixa de falhar em silêncio

### S7 — Dialog único de edição com prévia permanente + atualização local do signal (sem refetch) [impacto medio]
REFORMULADO por fusão com S1: com o quick-add aprovado, o dialog 'Nova Tag' deixa de existir — não há mais o que 'unificar'; sobra um único dialog de edição. Verificado no código: (1) a prévia atual fica dentro de @if (nome && cor), causando salto de layout — aprovada prévia permanente com placeholder 'Nome da tag' esmaecido; (2) a dica de caracteres proibidos hoje é um <small> permanente — vira tooltip pi pi-info-circle no label, com a mensagem de erro aparecendo só em pattern inválido; (3) salvarEdicao()/salvarNova() chamam buscarTags() (refetch completo com flicker) — os endpoints retornam TagAlteradaDto/TagCriadaDto completos ({id, nome, cor}), então atualizar o item no signal tags localmente é viável sem nenhuma mudança de backend.
_Redução de esforço:_ feedback pós-salvar instantâneo (atualização local vs. roundtrip extra de GET + re-render da grade inteira); dialog mais curto e sem saltos de layout

### S8 — Empty states acionáveis (vazio absoluto e busca sem resultado) [impacto baixo]
Verificado: o empty state atual é só ícone + texto 'Nenhuma tag cadastrada', sem ação. A frase de contexto proposta é correta (demanda_tag e atividade_tag existem nas migrations 0008/0010). REFORMULAÇÃO de ênfase: as migrations 0017/0018 fazem seed de tags padrão, então o vazio absoluto é raro em produção — o estado de maior valor é 'busca sem resultado', que deve oferecer botão 'Criar tag "termo"' jogando o termo digitado no quick-add (transforma busca falha em criação em 1 clique). Manter também o botão 'Criar primeira tag' (foca o quick-add) para o vazio absoluto.
_Redução de esforço:_ busca falha → criação em 1 clique com o nome já preenchido; primeira criação com ação principal no centro da tela

### S9 — Seleção múltipla para exclusão em massa (com ações do card sempre visíveis, apenas realçadas no hover) [impacto baixo]
REFORMULADO: a parte de esconder lápis/lixeira com opacity 0 até o hover foi rejeitada — contradiz o critério 9 ('dados/ações mais usados visíveis sem hover') e prejudica descoberta; substituir por ações sempre visíveis esmaecidas (ex.: opacity 0.45) que realçam a 1 no hover/focus-within, e sempre plenas em touch. A parte de valor real é a seleção múltipla: checkbox no canto do card (surge no hover, permanece visível quando 1+ marcados), barra contextual 'N selecionadas — Excluir selecionadas / Cancelar'. VERIFICADO: não existe endpoint batch — a exclusão itera DELETE por id (aceitável para dezenas de tags), reutilizando o padrão otimista + Desfazer coletivo adiado da S4, com tratamento de falha parcial (restaurar os cards cujo DELETE falhou e informar no toast).
_Redução de esforço:_ excluir 5 tags obsoletas: de 10 interações (5× lixeira + 5× confirm) para 6 (5 checks + 1 Excluir), com recuperação coletiva em 1 clique


## Ajustes de implementação apontados pelo verificador
1) Região 3 — não ocultar lápis/lixeira com opacity 0→1: manter sempre visíveis esmaecidos (ex.: 0.45→1 no hover/focus-within), pois ocultar viola o próprio critério 9 do redesign e prejudica descoberta/teclado; 'sempre visíveis em touch' já previsto, manter. 2) Regiões 2/3 — a ordenação alfabética não é novidade: o backend já retorna ORDER BY tag.nome ASC; a spec deve exigir apenas que a inserção otimista posicione a nova tag na ordem existente. 3) Região 2 — especificar a mecânica da criação otimista: id temporário reconciliado com TagCriadaDto (bloquear editar/excluir do item até o id real chegar) e, em erro do servidor (duplicidade por corrida entre gestores — a validação client-side não elimina o 400), remover o card, restaurar o texto no input e exibir o hint; a promessa 'sem toast de erro do servidor depois' é forte demais, trocar por 'erro do servidor devolve o estado anterior'. 4) Região 3/callout ④ — deixar explícito que NÃO existe endpoint de restauração: o Desfazer funciona adiando o DELETE, e é obrigatório dar flush nos deletes pendentes em troca de rota/refresh/fechamento da aba, senão a exclusão se perde. 5) Regiões 5/6 — o seletor-cor é componente compartilhado usado também em Projetos (projeto-formulario-dialog e projeto-detalhe): o disclosure 'Cor personalizada' altera essas telas; a spec deve mencionar a propagação (ou um input para modo inicial expandido) e alinhar com o redesign de Projetos. 6) Região 7 — o p-toast é único e global no layout (bottom-center): o toast com botão Desfazer exige key própria e template dedicado na página de Tags para não afetar os demais toasts. 7) Região 7 — atalhos '/' e 'N' devem ser ignorados quando o foco estiver em input/textarea ou com dialog/popover aberto. 8) Barra de seleção múltipla — não há endpoint batch: documentar que 'Excluir selecionadas' itera DELETE por id e prever falha parcial (restaurar os cards que falharam e informar quantidade no toast). 9) Região 1 — contador deve refletir o filtro ativo (ex.: '3 de 12 tags'), a spec está ambígua. 10) Região 6 — trocar o título do dialog de 'Editar tag' para manter capitalização consistente com o restante do app ('Editar Tag', como hoje) ou padronizar globalmente — decisão única, mas não misturar. Fora isso, a spec está consistente com permissões (tela e CRUD são só gestor via gestorGuard e guards do backend) e não usa nenhum dado inexistente (corretamente evita contagem de uso, ausente de TagResumoDto).

## Especificação do redesign
# Redesign — Tags (rota /tag, só gestor)

Tela de gestão do vocabulário de tags do sistema (usadas para classificar demandas/atividades). Dados disponíveis por tag (TagResumoDto): `id`, `nome`, `cor` (hex). **Não existe contagem de uso no backend — não exibir "usada em N demandas".** Tema Aura (primário azul), claro/escuro, toasts em bottom-center.

---

## Região 1 — Header da página

Linha única, alinhada por baseline:

- **Esquerda**: título `Tags` (h1, 1.5rem, semibold, cor primária) + contador discreto ao lado: `12 tags` (text-muted, 0.875rem). Padrão de título consistente com "Usuários"/"Projetos" (substantivo puro, sem "Gerenciar").
- **Direita**: campo de busca `p-inputtext` com ícone `pi pi-search` embutido, placeholder **"Buscar tag... ( / )"**, largura ~280px. Filtra a grade client-side a cada tecla (a lista já vem completa). Tecla **/** foca a busca de qualquer lugar da página; **Esc** limpa. **①**

Não há mais botão "Nova Tag" no header — a criação vive na Região 2, sempre visível.

## Região 2 — Barra de criação rápida (quick-add) **②**

Card raso (borda `--app-surface-200`, radius 8px, padding 0.75rem) fixo entre o header e a grade:

```
[ (•) ] [ Nome da nova tag____________________ ] [ + Adicionar ]
```

- **Swatch de cor** (2rem, círculo, clicável): mostra a cor pré-selecionada da próxima tag. A cor default rotaciona pela paleta (1ª tag azul #3b82f6, próxima verde #22c55e, etc.) para evitar tags todas iguais. Clique abre o **popover de paleta** (ver Região 5).
- **Input Nome**: `pInputText`, placeholder "Nome da nova tag", maxlength 100, flex-1. Diretiva de caracteres proibidos ativa (bloqueia digitação); mensagem de erro só aparece se um pattern inválido for colado.
- **Botão "Adicionar"** (primário, ícone `pi pi-plus`): mesmo efeito do **Enter**.
- **Comportamento**: Enter (ou clique) → tag entra na grade **imediatamente** (update otimista, ordenada alfabeticamente), toast `Tag "Backend" criada`, campo limpa e **mantém o foco** — pronto para a próxima. Criar 5 tags = digitar 5 nomes + 5 Enters, zero dialogs.
- Se o nome duplicar um existente (validação client-side contra a lista carregada), borda vermelha + hint "Já existe uma tag com esse nome" — sem toast de erro do servidor depois.

## Região 3 — Grade de tags

Grade `repeat(auto-fill, minmax(210px, 1fr))`, gap 0.625rem, **ordenada alfabeticamente**. Cada card (surface-0, borda surface-200, radius 8px, padding 0.375–0.75rem):

- **Esquerda — pill da tag**: fundo `cor+22`, texto na `cor`, borda `cor+55`, ellipsis. O pill inteiro tem cursor pointer e tooltip "Editar tag": clique abre o dialog de edição (Região 6). O **círculo de cor** (dot 0.875rem) à esquerda do nome dentro do pill é um alvo separado: clique abre o **popover de paleta** para troca de cor inline. **③**
- **Direita — ações no hover/focus** (opacity 0 → 1, transição 0.1s; sempre visíveis em touch): lápis `pi pi-pencil` (Editar) e lixeira `pi pi-trash` severity danger (Excluir). No canto superior esquerdo do card, um **checkbox** também surge no hover para seleção múltipla.
- **Exclusão** (lixeira): remove o card na hora (animação de fade 150ms) + toast bottom-center: `Tag "Urgente" excluída · [Desfazer]` com barra de progresso de 6s. Desfazer restaura otimisticamente; ao expirar, efetiva o DELETE (soft delete). **Sem confirm dialog.** **④**
- **Seleção múltipla**: ao marcar 1+ checkboxes, surge barra contextual grudada acima da grade: `3 selecionadas   [Excluir selecionadas]   [Cancelar]`. Excluir usa o mesmo padrão otimista + Desfazer coletivo.

### Dados de exemplo (12 tags realistas)

| Tag | Cor |
|---|---|
| Backend | #3b82f6 (azul) |
| Banco de Dados | #10b981 (esmeralda) |
| Bug | #f97316 (laranja) |
| Documentação | #14b8a6 (teal) |
| Frontend | #8b5cf6 (violeta) |
| Infra | #64748b (cinza) |
| Mobile | #ec4899 (rosa) |
| Portal do Cliente | #06b6d4 (ciano) |
| QA | #22c55e (verde) |
| Refatoração | #6366f1 (índigo) |
| Reunião | #eab308 (amarelo) |
| Urgente | #ef4444 (vermelho) |

## Região 4 — Estados

- **Carregando**: 8 cards skeleton (pill cinza pulsante) no lugar do spinner solitário — mantém o layout estável.
- **Vazio (nenhuma tag)**: centralizado — ícone `pi pi-tags` grande, título "Nenhuma tag ainda", texto "Tags classificam demandas e atividades do time." e botão primário **"Criar primeira tag"** que rola/foca o input do quick-add (já com foco automático). **⑥**
- **Busca sem resultado**: `Nenhuma tag para "urgnte"` + botão secundário **"Criar tag \"urgnte\""** que joga o termo no quick-add — transformar busca falha em criação em 1 clique.
- **Com dados**: grade da Região 3.

## Região 5 — Popover de paleta (troca de cor inline) **③**

`p-popover` ancorado no dot de cor (do card ou do quick-add), ~232px:

- Grade 5×3 de swatches 2rem das 15 cores predefinidas (#ef4444, #f97316, #f59e0b, #eab308, #84cc16, #22c55e, #10b981, #14b8a6, #06b6d4, #3b82f6, #6366f1, #8b5cf6, #a855f7, #ec4899, #64748b), cor atual com anel de seleção.
- Rodapé: link discreto **"Personalizar..."** que expande dentro do próprio popover o colorpicker gradiente + input hex (`#RRGGBB`, com borda vermelha e hint "Hex inválido" quando malformado). **⑤**
- Clique numa cor → no card: PUT imediato + pill recolore na hora (otimista) + popover fecha; no quick-add: apenas define a cor da próxima tag.

## Região 6 — Dialog "Editar tag" (único dialog da tela)

Descrever sobre a **página de fundo escurecida** (overlay rgba(0,0,0,.4); a grade de tags permanece visível desfocada por trás). `p-dialog` modal, 420px, header **"Editar tag"**, X fecha, **Esc** cancela.

Conteúdo (form com `(ngSubmit)`):

1. **Prévia (sempre visível, primeiro elemento)**: faixa surface-50 com o pill renderizado ao vivo — ex.: pill violeta `Frontend`. Atualiza a cada tecla/cor. Sem aparecer-e-sumir: se o nome esvaziar, mostra placeholder "Nome da tag" esmaecido.
2. **Campo Nome**: label `Nome *`, input com **autofocus** e texto pré-selecionado (um Ctrl+A implícito — digitar já substitui). Erros abaixo apenas quando tocado+inválido: "Nome é obrigatório" / "Máximo de 100 caracteres" / mensagem de caracteres proibidos. A dica de caracteres proibidos **não** fica permanente — vira tooltip `pi pi-info-circle` ao lado do label.
3. **Campo Cor**: label `Cor *` + **paleta 5×3 de swatches 2.5rem** (cor atual com anel) — só isso por padrão. Abaixo, link **"Cor personalizada"** com chevron: expande colorpicker gradiente + input hex validado. **⑤** (disclosure progressivo: o dialog abre com ~metade da altura do atual).

Footer: `Cancelar` (outlined) + `Salvar` (primário, ícone check, loading). **Enter salva.** Ao salvar: PUT, atualiza o item no signal localmente (sem refetch da lista), toast `Tag "Frontend" alterada`, dialog fecha.

## Região 7 — Toasts e atalhos

- Toasts em **bottom-center** (padrão do app): criação `Tag "Backend" criada`; edição `Tag "Frontend" alterada`; exclusão `Tag "Urgente" excluída · [Desfazer]` (6s).
- Atalhos: **/** foca busca · **Enter** cria/salva · **Esc** fecha dialog/popover/limpa busca · **N** foca o quick-add.

## Callouts numerados para o mockup

- **①** Busca instantânea no header com atalho `/` — localizar tag em 2-3 teclas em vez de varrer a grade.
- **②** Quick-add inline: criar tag com nome + Enter, sem dialog — criação em série cai de ~4 cliques/tag para 1 Enter/tag, com cor rotativa pré-selecionada.
- **③** Dot de cor clicável no card abre popover de paleta — trocar cor em 2 cliques, direto no ponto onde a cor é vista, sem abrir formulário.
- **④** Exclusão em 1 clique com **Desfazer** no toast — some o confirm dialog (que dizia, incorretamente, que a ação era irreversível num sistema de soft delete).
- **⑤** Seletor de cor com disclosure progressivo: paleta primeiro; gradiente + hex recolhidos atrás de "Cor personalizada" — dialog metade do tamanho.
- **⑥** Empty state acionável: botão "Criar primeira tag" focando o quick-add; busca sem resultado oferece "Criar tag \"termo\"".
