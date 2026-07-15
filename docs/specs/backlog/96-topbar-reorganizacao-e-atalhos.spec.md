# 96 — Topbar: reorganização (tema, perfil, sair) + atalhos globais de navegação

**Origem:** Revisão de UI/UX — print `prints/02-topbar.png` (callouts ③④⑤⑥), análise `analise-detalhada/layout-topbar.md`

**Depende de:** 95 (espaço/layout da topbar)

**Entrega:** topbar com toggle de tema em 1 clique, avatar de iniciais + primeiro nome como gatilho do menu de perfil (com "Sair" dentro do menu), logo apontando para `/ponto`, botão de anotações só-ícone, toasts em bottom-right e atalhos de teclado globais.

> **Frontend apenas.**

---

## Escopo

1. **Tema**: botão-ícone sol/lua direto na topbar (`TemaService` já existe). O easter egg do tema personalizado (contextmenu) migra para este botão; a seção de personalização permanece no menu de perfil quando desbloqueada.
2. **Perfil**: avatar com iniciais (dados do `UsuarioSessaoService`) + primeiro nome (≥1280px). Menu: nome/@login/tipo, switch `p-toggleswitch` "Tempos em dias" (substitui a frase-ação ambígua) e **Sair** ao final, separado por divisor — remove o botão exposto de logout.
3. **Logo → `/ponto`** (consistência com o redirect padrão) com tooltip.
4. **Anotações**: botão só-ícone com tooltip (o dialog em si é a task 114).
5. **Toast global**: `position="bottom-right"` (não cobre footers de dialogs).
6. **Atalhos globais** no layout: `g` seguido de `p/d/a/e` (todos) e `c/j/t/u` (**só gestor** — mesmo filtro da nav); `n` abre anotações. Ignorados com foco em input/textarea/contenteditable (Quill) ou dialog/popover aberto. Exibidos nos tooltips ("Atividades — g a").
7. **Responsivo**: 1024–1280px só ícones com tooltip; <900px colapsa os itens gestor-only em "Mais ▾" (condicional ao excedente — dev com 4 itens não vê o "Mais").
8. **Scrim global** do `loadingInterceptor` restrito a mutações (GETs usam loading local/skeleton das telas).

## Critérios de aceite

- Tema em 1 clique; identificar usuário logado sem hover; logout acidental impossível com 1 clique.
- `g a` navega para Atividades; digitar "n" dentro de um input não abre anotações.
- Nenhum item de nav inacessível em 900–1440px.

## NÃO implementar nesta task

- Chip de execução (95) e drawer de anotações (114).
