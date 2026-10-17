# Task 96 — verificação

Data: 2026-10-16. Frontend apenas.

## O que foi feito

- **Tema** em botão sol/lua na topbar (1 clique); o clique direito nele revela o "???" que desbloqueia o tema
  personalizado, cuja seção continua no menu de perfil.
- **Perfil**: avatar de iniciais + primeiro nome (≥ 1367 px) abre o menu com nome, @login, tipo, switch
  `p-toggleswitch` "Tempos em dias" e **Sair** ao final, depois de um divisor; o botão de logout exposto saiu.
- **Logo → `/ponto`** com tooltip; **anotações** só ícone com tooltip "Minhas anotações — n".
- **Toasts** em `bottom-right` (inclui o toast "Desfazer" da task 99).
- **Atalhos** (`@HostListener('document:keydown')` da topbar): `g` + `p/d/a/e` (todos) e `c/j/t/u` (só gestor,
  mesmo filtro da nav); `n` abre as anotações. Ignorados com foco em input/textarea/select/contenteditable
  (Quill) ou com dialog, popover, select/multiselect/datepicker ou context menu aberto; a sequência expira em
  1,5 s. Aparecem nos tooltips ("Atividades — g a") e no menu "Mais".
- **Responsivo** (CSS puro): até 1499 px o relógio sai e a descrição do chip encurta; até 1366 px só ícones;
  abaixo de 900 px os itens de gestor viram o menu "Mais ▾" (só aparece se houver item de gestor); abaixo de
  720 px a topbar quebra em duas linhas (logo, chip e ações em cima; navegação embaixo).
- **Overlay global** (`loadingInterceptor`) só para mutações; GET nunca aciona o scrim.

## Verificado ao vivo (Chromium, API real, com o chip de execução ativo)

- `scrollWidth == viewport` em 1920, 1440, 1280, 1100, 1024, 899, 800, 640 e 360 px; capturas de 1920, 1100,
  800 e 360 px. Navegação 8 itens ≥ 900 px; 4 itens + "Mais" (Calendário, Projetos, Tags, Usuários) abaixo
  disso, e o item do "Mais" navega e fecha o popover.
- `g a`, `g t`, `g u` navegam; `g x` não faz nada; digitar "gan" num input não navega; `n` fora de input abre
  as anotações; com dialog aberto `g p` não navega. Tooltip "Atividades — g a".
- Menu de perfil com nome/@login/tipo/switch/Sair; o switch liga; Sair leva ao login. Tema alterna em 1 clique;
  o clique direito mostra "???" e o clique nele revela "Tema personalizado" no menu. Logo → `/ponto`.
- Desenvolvedor a 800 px: 4 itens, sem "Mais"; `g u` (só gestor) não navega; `g e` navega.

## Desvios e limites

- **Breakpoints diferentes da spec**: "só ícones" vale até 1366 px (a spec diz 1024–1280) e o relógio some até
  1499 px; com o chip ativo a topbar estourava a 1280–1440 px. A duas linhas abaixo de 720 px e o P-002
  (overflow a 360 px) são acréscimos combinados com o autor.
- Atalhos com teclado não-QWERTY (a letra vem de `event.key`) não foram testados.
- O alvo de toque dos ícones da topbar no celular (≈ 32 px) não foi medido contra os 44 px recomendados.
- Frontend sem testes automatizados (P-001).
