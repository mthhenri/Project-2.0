# 114 — Anotações: drawer lateral com auto-save por mudança e fechar-salvando

**Origem:** Revisão de UI/UX — print `prints/23-anotacoes-drawer.png`, análises `usuario-anotacoes.md` e `layout-topbar.md`

**Depende de:** 96 (botão da topbar)

**Entrega:** as anotações saem do modal de 95vw×95vh para um **drawer lateral (~520px)** sobre a página atual (scrim leve), com **auto-save por mudança** (debounce 2s, flush ao fechar), fechamento livre por Esc/clique-fora/X **sem confirm**, indicador vivo de salvamento e "Limpar" com Desfazer. Mesmo componente para "Minhas anotações" (topbar) e para as anotações de um usuário (gestor, via listagem).

> **Frontend apenas.** Substitui o comportamento de guarda da spec 84 para este dialog: o confirm "Salvar/Descartar" deixa de existir porque **fechar salva** (registrar a superação na spec 84 ao concluir).

---

## Escopo

1. **Drawer** ancorado à direita, header "Anotações de {nome}"/"Minhas anotações" + "Editado há X" (tooltip com data completa); toolbar Quill enxuta (H2 B I U S · listas · link · limpar); editor focado ao abrir; skeleton no carregamento; placeholder acionável no vazio.
2. **Auto-save por mudança**: `valueChanges` → debounce 2s → PUT; **nenhuma requisição sem mudança real** (hoje o timer de 30s envia PUT incondicional) e `aoAlterar` emitido só com mudança (evita reload da listagem). Flush imediato ao fechar/perder foco; se o PUT do flush falhar, toast de erro com "Reabrir" preservando o conteúdo.
3. **Rodapé**: "Limpar" (danger) · indicador central "Editando… → Salvando… → ✓ Salvo às HH:mm" (substitui tag "Alterado" + dica dos 30s + toast de sucesso) · "Salvar" manual (Ctrl+S).
4. **Limpar com Desfazer** (7s): o vazio só persiste após a janela expirar (o undo tem precedência sobre o flush-ao-fechar). Ícone `temAnotacoes` da listagem atualiza pela regra de "vazio efetivo" do backend (HTML `<p><br></p>` não conta) usando o campo retornado no PUT.
5. **Deep-link** `/usuario/:id/anotacoes`: gestor → listagem com drawer aberto; usuário comum com id próprio → `/ponto` com drawer; dev com id alheio → redirect (403 no GET).

## Critérios de aceite

- Digitar e apertar Esc: fecha e salva; nada se perde; sem confirm.
- Nenhum PUT em sessão aberta sem digitação; "Limpar" acidental é reversível por 7s.

## NÃO implementar nesta task

- Múltiplas notas/lista (o modelo é um campo único por usuário).
