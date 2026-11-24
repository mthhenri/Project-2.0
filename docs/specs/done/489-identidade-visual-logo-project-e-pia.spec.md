# 489-identidade-visual-logo-project-e-pia.spec.md

> Task solta, pedida pelo autor em 2026-11-24. A exploração (propostas, variações e capturas do app real) e as decisões
> estão em `489-identidade-visual-logo-project-e-pia/proposta.md`; a verificação, em `489-identidade-visual-logo-project-e-pia/verificacao.md`.

## Objetivo

Dar ao sistema uma identidade visual clara e aplicá-la em todos os lugares do app. São duas peças: a marca do
**Project 2.0** (o P cuja órbita termina na bolinha verde de "em execução", em cor sólida) e a **Piá**, nome da IA do
sistema ("P-IA", e piá é o menino em Curitiba), na cor Araucária: o brilho de IA nos ícones pequenos e o nome "piá"
escrito, com o acento âmbar, onde ela é quem fala.

## Entregáveis

1. **`app-logo-project`** (`frontend/src/app/shared/components/logo-project/`): o símbolo do Project em SVG inline
   (haste e bojo do P, órbita e bolinha verde). Entradas `tamanho` (medida CSS), `ladrilho` (o símbolo reduzido sobre o
   quadrado azul arredondado) e `rotulo` (texto acessível; sem ele é decorativo). Cores pelos tokens `--app-logo-*`,
   claro e escuro, **fixas na paleta azul/verde**: não acompanham a cor primária escolhida pelo usuário.
2. **Lugares da marca do Project:** barra lateral (no lugar do `favicon.ico` como imagem), login (no lugar do "P" de
   texto) e cabeçalho do check-in (no lugar do selo "P2", no ladrilho).
3. **Favicon** (`frontend/src/favicon.ico`, 16 a 256 px) e **ícone do Project Desktop** (`desktop/assets/icone.png`,
   256 px; janela, bandeja, notificações e instalador já leem esse arquivo), gerados do ladrilho com o P reduzido
   (escala 0,66), como decidido pelo autor. Fonte: `489-identidade-visual-logo-project-e-pia/logo-project-ladrilho.svg`.
4. **Ícone da Piá** (classe global `app-icone-pia` em `styles.scss`): o brilho do PrimeIcons (`pi pi-sparkles`) na cor
   Araucária (`--app-pia-icone`). Vale em todo ícone de ação ou de menu da IA e na menção: barra lateral ("IA Config."),
   menu do grupo, sugestão do `@` no compositor, destaque da menção, botões e avisos que usavam `pi-sparkles` (17
   pontos nos templates).
5. **Logo da Piá** (`frontend/src/app/shared/components/logo-pia/`): o nome "piá" em traço com degradê Araucária
   (`--app-pia-inicio` → `--app-pia-fim`) e o acento do á em âmbar (`--app-pia-ponto`), desenhado com máscara CSS (sem
   `id` de SVG). Entradas `tamanho` (altura; a largura acompanha na proporção 1,23) e `rotulo`. Vai **só onde a Piá é
   quem fala**: o avatar da mensagem da IA no chat (mensagem e estado vazio), no check-in e na resposta da IA no grupo.
6. **Menção da IA na cor da Piá:** o destaque do `@IA` no texto das conversas (direta e grupo) usa `--app-pia-icone` em
   vez do azul (`CORES_DOS_DESTAQUES_DA_IA` em `mensagem-direta.util.ts`). A grafia `@PIA` fica para a task 490.
7. **Botão "Revisar com Piá" do Relatório de execuções** na cor da Piá (contornado), no lugar do roxo (`severity="help"`).
8. **Nome Piá onde ela fala ou age**, sempre sem artigo (o "o/a Piá" ficou em aberto, neutro): rótulo da resposta no
   grupo ("Piá · para …"), prévia na lista de conversas ("Piá: …"), "Piá digitando", "Feito por Piá", "Proposta de
   Piá", "Revisar com Piá", "Revisão por Piá", "Auxiliar com Piá", "Alterar trecho com Piá", "Resumir com Piá" e "Este
   chat pode ser resumido por Piá". Frases com artigo ("a IA está…", "Pedir à IA", "Voltar para a IA") e telas de
   configuração continuam dizendo "IA".
9. **Regra documentada** em `docs/SYSTEM.SPEC.md` §8.5: tokens das logos, "ícone de ação ou de menu da IA = brilho
   Araucária; quem fala = logo piá", e o nome sem artigo.

## Critérios de Aceite

- Testes de componente de `app-logo-project` e `app-logo-pia`, e os testes dos componentes cujos textos mudaram,
  verdes: `npm run test --workspace=frontend`. `npm run build --workspace=frontend` e `npm run lint:tudo` sem erros.
- Nenhum ícone de IA sem a cor da Piá: todo `pi-sparkles` do frontend vem com `app-icone-pia`, exceto o botão do
  relatório (que é todo verde). Nenhum avatar com o texto "IA".
- Verificação ao vivo (skill `verify`) nos cinco formatos (`1920×1080`, `1366×768`, `1080×1920`, `720×1280`,
  `960×1080`), temas claro e escuro: login, barra lateral aberta e recolhida, chat com mensagem da IA, check-in, grupo
  com resposta da IA e menção, Relatório de execuções e Configuração da IA. Favicon e ícone do Desktop conferidos em
  16, 32 e 256 px.
- Análogo visual: a própria tela antes da troca, e as capturas aprovadas pelo autor na exploração. Cada logo segue o
  tamanho e o alinhamento do elemento que substitui (ícone de botão, avatar de 1,875 rem, ícone da barra lateral).

## Fora de Escopo

- **Menção `@PIA`** (reconhecer `@PIA`, `@Piá`, `@Pia` junto de `@IA` no backend e no frontend): task 490.
- Trocar "IA" por "Piá" em frases com artigo, avisos e telas de configuração (o artigo está em aberto).
- Fonte própria no nome "Project 2.0" (continua a fonte do app).
- A logo acompanhar a cor primária escolhida pelo usuário.

## Dependências

- `docs/SYSTEM.SPEC.md` §8.5 (tema e paleta; o PrimeNG Aura expõe `--p-blue-*`, `--p-green-*`, `--p-teal-*`,
  `--p-amber-*`).
- Skill `gerenciamento-de-impacto`: o autor autorizou a troca em todos os lugares da marca e da IA.

## Riscos e Mitigação

- **Degradê de SVG com `url(#id)`** quebra com `<base href>` e com várias instâncias na tela: a logo da Piá é máscara
  CSS sobre `linear-gradient`.
- **Verde da Piá × verde de "em execução"** aparecem juntos no chat e no check-in: a Piá usa o verde-pinheiro
  (`green-700`/`green-400` no escuro) e o chip de execução o `green-500` claro; conferir nas capturas.
- **Item ativo da barra lateral** pinta o ícone com a cor de destaque: o brilho da Piá fica azul quando "IA Config." é a
  tela aberta, como os outros itens.
