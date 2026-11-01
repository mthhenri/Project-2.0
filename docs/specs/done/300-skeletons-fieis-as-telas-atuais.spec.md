# 300-skeletons-fieis-as-telas-atuais.spec.md

> Task futura, especificada em 2026-11-01; **não implementada**. Origem: verificação da padronização (tasks 297–299), em que o autor notou que muitas telas mudaram de visual e os esqueletos de carregamento ficaram para trás. Verificação em todos os formatos de desktop do `CLAUDE.md` (1920×1080 primeiro, depois 1366×768, 1080×1920, 720×1280 e 960×1080).

## Objetivo

Fazer cada esqueleto de carregamento (skeleton) se parecer com a tela que ele antecede: mesma estrutura, mesmas colunas, mesma altura de linha e mesma densidade, de modo que a troca do esqueleto pelo conteúdo não faça a tela "pular".

## Contexto

- O esqueleto compartilhado é `app-skeleton-lista` (`frontend/src/app/shared/components/skeleton-lista/`), com as variantes `tabela`, `cartoes` e `linhas`; 16 templates o usam. Outros 35 templates usam `p-skeleton` direto.
- As telas mudaram bastante desde que os esqueletos foram desenhados (Árvore em três colunas, Controle de horas, chat, Documentações, Modelagem, Projetos, Ponto em cartões). Exemplo visto em 2026-11-01: Usuários mostra um esqueleto de tabela de 7 colunas genéricas, quando a tabela real tem Usuário (com avatar e login), Cargo, Tipo (selo), Status (interruptor), Anotações.
- Os esqueletos não têm teste de aparência; os testes de componente só conferem que o estado "carregando" existe.

## Entregáveis

1. **Inventário e análogo por tela.** Para cada tela e painel com esqueleto (a lista sai de `grep -rl "skeleton" frontend/src/app --include=*.html`, hoje 35 arquivos), registrar em `docs/specs/active/300-.../` o esqueleto atual, a tela real carregada e a decisão: refazer, ajustar ou manter. Telas sem diferença visível relevante ficam como estão.
2. **Esqueleto fiel por tela, no desktop 1920×1080.** Refazer os esqueletos marcados reaproveitando `app-skeleton-lista` quando uma variante nova (por exemplo, `tabela` com células de avatar, selo e interruptor, ou `cartoes` com cabeçalho e rodapé) cobrir várias telas; criar esqueleto próprio só quando a tela for única (Árvore, Controle de horas, Ponto, chat, Documentações, Modelagem). Preservar `role="status"`, `aria-busy` e o texto para leitor de tela.
3. **Mesma geometria do conteúdo.** Altura de linha, número de colunas, larguras relativas, espaçamento e margens iguais às da tela carregada; a quantidade de linhas acompanha o tamanho de página real. Nada de cor ou animação nova: só `p-skeleton` com os tokens existentes (`--app-surface-*`), funcionando nos temas claro e escuro.
4. **Sem salto na troca.** A altura do bloco de esqueleto deve igualar a do conteúdo típico; conferir a diferença (alvo: sem deslocamento visível do que está abaixo).
5. **Teste de componente por esqueleto novo ou alterado**, no padrão de `docs/CONVENTIONS.md` "Testes de componente": estado carregando exibe o esqueleto com a estrutura esperada (número de colunas, presença do cabeçalho) e a acessibilidade preservada.

## Fora de escopo

- Trocar a biblioteca de esqueleto ou animar de outro modo.
- Estado de erro de carga que hoje aparece como lista vazia (`PROBLEMS.md` P-068): task própria.
- Mobile (não é verificado no projeto).

## Verificação

- Aplicação real (skill `verify`), para cada tela refeita: capturar o esqueleto (atrasar a resposta da API no navegador, por exemplo trocando `XMLHttpRequest.prototype.send` por um `setTimeout`) e o conteúdo carregado lado a lado, e registrar no relatório a comparação. Começar pelo 1920×1080 e repetir nos demais formatos (1366×768, 1080×1920, 720×1280, 960×1080), nos temas claro e escuro.
- Testes: `npm run test --workspace=frontend`, `npm run lint:tudo` e `npm run build --workspace=frontend`.
- Gate de UI do `CLAUDE.md`: registrar o análogo aprovado de cada tela e comparar com ele antes de apresentar ao autor.
