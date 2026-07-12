# Tags — listagem/gestão + seletor de cor (/tag (só gestor))

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

## Sugestões (VERIFICAR: checar vs regras de negócio)
### S1 — Quick-add inline no topo: criar tag sem abrir dialog [impacto alto]
Substituir o fluxo "botão → dialog" por uma linha de criação rápida fixa no topo da grade: input "Nome da nova tag" + swatch de cor (abre popover com a paleta de 15 cores; próxima cor da paleta pré-selecionada por rotação) + Enter cria. A tag aparece na grade imediatamente (update otimista) e o campo limpa e mantém o foco para a próxima. O dialog completo continua existindo apenas para edição.
_Redução de esforço:_ criar 1 tag: de 4 cliques para digitar+Enter (0-1 clique); criar 5 tags: de ~20 cliques para ~5 Enters

### S2 — Busca instantânea no header [impacto alto]
Campo "Buscar tag..." ao lado do título, filtrando a grade client-side a cada tecla (lista já vem completa do backend — sem custo de rede). Atalho "/" foca a busca. Adicionar contador "12 tags" e ordenação alfabética fixa para scan previsível. Alinha com o padrão de filtros da tela de Usuários.
_Redução de esforço:_ localizar 1 tag entre 40+: de varredura visual completa para 2-3 teclas digitadas

### S3 — Popover de cor direto no card (ação no ponto de decisão) [impacto alto]
O swatch de cor do pill em cada card vira clicável: abre um popover compacto só com a paleta de 15 cores + link "Personalizar...". Clicou na cor → PUT imediato + update otimista → popover fecha. Nada de abrir o dialog de edição para trocar cor.
_Redução de esforço:_ trocar cor: de 3 cliques (com dialog inteiro no meio) para 2 cliques diretos

### S4 — Exclusão otimista com Desfazer (remover o confirm dialog) [impacto medio]
Clique na lixeira remove a tag da grade na hora e mostra toast "Tag 'Urgente' excluída — Desfazer" (janela de ~6s antes de efetivar o DELETE, que é soft delete de qualquer forma). Elimina o confirm com texto incorreto ("não pode ser desfeita") e o segundo clique.
_Redução de esforço:_ excluir: de 2 cliques + leitura de dialog para 1 clique; erro recuperável em 1 clique no Desfazer

### S5 — Autofocus + Enter em todos os formulários [impacto medio]
No quick-add e no dialog de edição: foco automático no campo Nome ao abrir (pAutoFocus ou afterNextRender), form com (ngSubmit) para o Enter salvar, Esc cancela (nativo do p-dialog). 
_Redução de esforço:_ -1 clique de foco e -1 clique de botão em toda criação/edição

### S6 — Disclosure progressivo no seletor de cor [impacto medio]
No dialog de edição, mostrar por padrão apenas: paleta de 15 cores + amostra atual. O colorpicker inline (gradiente) e o input hex ficam recolhidos atrás de um link "Cor personalizada" que expande. Corrigir também o feedback do hex inválido (borda vermelha + mensagem curta). O dialog encolhe pela metade e o caso comum (1 clique na paleta) fica mais rápido de escanear.
_Redução de esforço:_ dialog ~50% menor; escolha de cor comum permanece 1 clique, sem ruído do gradiente

### S7 — Unificar dialogs Nova/Editar + prévia permanente + update otimista [impacto medio]
Um único dialog com modo (título e botão mudam), prévia sempre visível (usa placeholder "Nome da tag" enquanto vazio — sem salto de layout), dica de caracteres proibidos só quando houver erro de pattern. Após salvar, atualizar o signal tags localmente com o DTO retornado em vez de refetch (elimina flicker e latência).
_Redução de esforço:_ feedback instantâneo pós-salvar (0ms percebido vs. roundtrip + re-render da lista)

### S8 — Empty state acionável [impacto baixo]
No estado vazio, incluir botão primário "Criar primeira tag" (ou apontar seta para o quick-add já focado) e uma frase de contexto: "Tags classificam demandas e atividades".
_Redução de esforço:_ primeira criação: ação principal a 1 clique no centro da tela, sem procurar no canto

### S9 — Ações do card no hover + seleção múltipla para limpeza [impacto baixo]
Lápis/lixeira aparecem no hover/focus do card (grade mais limpa, menos misclick no destrutivo). Checkbox de seleção surge no hover no canto do card; ao selecionar 1+, barra contextual no topo: "3 selecionadas — Excluir" (itera DELETE por id, com Desfazer coletivo).
_Redução de esforço:_ excluir 5 tags obsoletas: de 10 cliques (5×lixeira+confirm) para 6 (5 checks + 1 Excluir)


## REDESIGN SPEC
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
