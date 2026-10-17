# Task 120 — Layout com barra lateral recolhível e barra superior

> Origem: guarda-chuva [`rework-chat-ia.spec.md`](rework-chat-ia.spec.md), bloco 2. **Frontend
> apenas.** Sem mudança de permissão, rota ou API.

## Objetivo

A navegação sai da barra superior e vai para uma **barra lateral recolhível**; a barra superior
fica só com o contexto do momento (hora, execução atual, próximo check-in, usuário). Prepara a
casca em que o chat do bloco 5 vai morar, sem entregar nada de IA.

## Entregáveis

### 1. Estrutura (`shared/layout`)

- `LayoutComponent` (hoje coluna: `app-topbar` + `main`) passa a duas colunas: `app-sidebar` à
  esquerda; à direita a topbar e o `main` com o `router-outlet`. `p-toast`, `app-toast-desfazer` e
  `app-loading-spinner` ficam como estão.
- **Sidebar** (`layout/sidebar/`, standalone):
  - Logo (hoje na topbar, apontando para `/ponto`) no topo.
  - Os mesmos 8 itens e o mesmo filtro por `eGestor()` da topbar atual: Ponto, Calendário,
    Projetos, Demandas, Atividades, Execuções, Tags, Usuários. Item ativo por `routerLinkActive`.
  - **Expandida** (ícone + rótulo) e **recolhida** (só ícone com tooltip). Botão de alternar no
    rodapé. O estado é preferência de exibição do navegador: guardar em `localStorage` dentro de
    `try/catch`, com a tela funcionando sem ele.
  - Entra recolhida por padrão abaixo de 1280px de largura útil.
  - O "Mais ▾" e a regra de 900px da topbar deixam de existir: numa lista vertical todos os itens
    cabem.
- **Topbar** enxuta: execução ativa (`chip-execucao-ativa`, intacto), hora, tema (com o gancho do
  easter egg do tema personalizado intacto), anotações e menu do perfil, tudo como hoje. Remove-se
  apenas a navegação, o logo e o "Mais".
- **Slot do próximo check-in**: o bloco 7 acrescenta o conteúdo. Nesta task só se garante um ponto
  de extensão na topbar, **sem renderizar nada** enquanto não houver check-in (nenhum componente
  vazio visível, nenhum texto de "em breve").

### 2. Atalhos de teclado

- Os atalhos `g`+letra e `n` vivem em `topbar.component.ts` (`@HostListener`) e acompanham a
  navegação: extrair para um serviço/diretiva do layout (reaproveitando `core/utils/atalhos.ts`:
  `focoEmCampo`, `haSobreposicaoAberta`) para a sidebar e a topbar não dependerem uma da outra.
- Tooltips da sidebar mantêm o formato atual ("Atividades — g a"); o `dialog-dica-atalhos` continua
  correto.

### 3. Tema, tokens e estilo

- Cores só por tokens semânticos (`--app-surface-*` e utilitários do projeto); **nunca**
  `--p-surface-N` direto. Todo diretivo/componente PrimeNG usado precisa estar no `imports[]` do
  componente (build passa e o estilo quebra no tema escuro se faltar). Tema claro e escuro verificados.
- SCSS com Tailwind para utilitários e BEM em português (`sidebar__item`, `sidebar--recolhida`), sem
  `style=""` inline nem seletor de ID.

### 4. Telas afetadas pelo novo gabarito

A largura útil do `main` encolhe (até 240px na barra expandida). Conferir, sem redesenhar, as
telas mais largas: ponto (incluindo a impressão, que tem CSS próprio), calendário, árvore de
demandas e listagens de atividades e execuções. Corrigir apenas quebras causadas pelo gabarito.

## Impacto em consumidores

Skill `gerenciamento-de-impacto` sobre `layout.component`, `topbar.component` e
`core/utils/atalhos.ts`. Grep por seletores `topbar`/`layout__conteudo`, `h-screen`, `100vh` e
`@media print`: `ponto-impressao`, `atividade-listagem`, `execucao-ativa.service`, `login.page.scss`,
`loading-spinner` e `toast-desfazer` referenciam o layout e precisam ser avaliados.

## Análogo e verificação visual

- Análogo registrado no fecho: a **topbar atual** como referência de tokens, densidade, tema e
  foco; a barra lateral não tem análogo no sistema.
- Skill `verify`, com a aplicação real, em **1920×1080, 1366×768 e 1080×1920**, nos temas claro e
  escuro, com gestor e desenvolvedor, barra expandida e recolhida, e nos estados: sem execução
  ativa, com execução ativa e carregando. Mobile não é verificado.
- O agente principal inspeciona pessoalmente; screenshot de subagente não fecha o gate.

## Critérios de Aceite

- Nenhuma rota, permissão ou atalho muda: os mesmos itens aparecem para os mesmos perfis e
  `g`+letra e `n` continuam funcionando (e quietos em campo de texto ou com overlay aberto).
- A barra recolhe e expande, lembra a escolha ao recarregar e continua usável se `localStorage`
  falhar.
- Nenhuma tela existente perde conteúdo nem ganha rolagem horizontal nos três tamanhos.
- Impressão do ponto continua igual.
- Build do frontend passa; lacunas declaradas: frontend sem testes e sem lint.

## Fora de Escopo

- Qualquer conteúdo de chat, check-in, IA ou o app Electron.
- Redesenhar o conteúdo das telas, os ícones ou a ordem dos itens.
- Menu mobile ou verificação em telas pequenas.
- Mudar permissões de tela (continuam exatamente como hoje).

## Dependências

Nenhuma. Pode ser feita em paralelo às tasks 118–119 e 121–124. Quando o bloco 7 chegar, usa o
ponto de extensão da topbar.
