# 116 — Tags: quick-add com Enter, troca de cor inline e busca

**Origem:** Revisão de UI/UX — print `prints/25-tag-listagem.png`, análise `analise-detalhada/tag.md`

**Depende de:** 97, 99 (undo)

**Entrega:** gestão de tags sem dialogs para o caminho comum: barra de **criação rápida** sempre visível (swatch de cor rotativo + nome + Enter cria e mantém o foco), **popover de paleta** ancorado no dot para troca de cor inline (PUT imediato), busca client-side, ações no hover e exclusão com Desfazer.

> **Frontend apenas.**

---

## Escopo

1. **Quick-add**: swatch clicável (cor default rotaciona pela paleta) + input + "Adicionar"/Enter; criação **otimista com id temporário** reconciliado com o `TagCriadaDto` (bloquear editar/excluir do item até o id real); em erro (ex.: duplicidade por corrida — a validação client-side não elimina o 400), remover o card, restaurar o texto no input e exibir o hint. Inserção respeita a ordem alfabética que o backend já retorna. Validação de duplicado client-side com hint inline.
2. **Grade**: pill da tag (clique abre o dialog de edição); dot de cor = alvo separado que abre o **popover de paleta** (15 cores + "Personalizar…" expandindo colorpicker/hex com validação inline). Ações lápis/lixeira **sempre visíveis esmaecidas** (0.45 → 1 no hover/focus-within — não opacity 0, por descoberta/teclado/touch).
3. **Busca** no header (`/`, Esc limpa); busca sem resultado oferece "Criar tag \"{termo}\"" jogando o termo no quick-add.
4. **Dialog de edição** único: prévia permanente (placeholder quando vazio), autofocus com texto pré-selecionado, paleta por padrão + "Cor personalizada" colapsada; salvar atualiza o signal localmente (sem refetch).
5. **Exclusão**: imediata + toast Desfazer (task 99); seleção múltipla simples com barra "N selecionadas — Excluir".

## Critérios de aceite

- Criar 5 tags: 5 nomes + 5 Enters, zero dialogs.
- Trocar só a cor: 2 cliques (dot → swatch).

## NÃO implementar nesta task

- Contagem de uso ("usada em N demandas") — o backend não fornece.
