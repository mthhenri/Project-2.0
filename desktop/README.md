# Project Desktop

Aplicativo Electron que abre o front do Project numa janela própria, no lugar do navegador. O navegador continua sendo o centro do
sistema: o desktop só aponta para a URL do front e todo mundo o usa no dia a dia (task 152).

## Comportamento

- Abre o front (`URL_DO_PROJECT` em `src/config.ts`; no desenvolvimento, a variável `PROJECT_DESKTOP_URL` sobrepõe). Login e rotas são as do navegador.
- Janela maximizada no monitor principal, **sempre por cima**, sem arrastar nem redimensionar. O usuário pode **minimizar**.
- **Não fecha**: fechar e Alt+F4 só minimizam. A única saída é "Fechar completamente" no menu do ícone da bandeja, com confirmação ("Isso desativa o check-in"). O desligamento do Windows nunca é impedido.
- Bandeja: Abrir o Project, tempo até o próximo check-in (indisponível até a task 161) e Fechar completamente.
- Uma única instância (abrir de novo traz a janela para a frente, na área de trabalho atual). Não inicia com o Windows.
- Sem rede ou com o front fora do ar, mostra um aviso e tenta de novo a cada 5 s.

## Comandos

```bash
npm run start --workspace=desktop   # compila e abre o app (o front precisa estar no ar na URL)
npm run test --workspace=desktop    # funções puras (src/politica-da-janela.ts)
npm run pack --workspace=desktop    # executável portátil em desktop/release/ (Windows)
```

Para publicar: troque `URL_DO_PROJECT` em `src/config.ts`, rode o `pack` e coloque `release/Project-Desktop-<versão>.exe` na pasta
compartilhada. Não há atualização automática: a cada mudança no desktop (ou no Project) recompila-se e redistribui-se o executável.
O executável não é assinado.

## Estrutura

- `src/main.ts`: janela, bandeja, instância única e travas (a parte que depende do Electron).
- `src/politica-da-janela.ts`: as decisões como funções puras com testes (fechar ou minimizar, janela fora do lugar, para onde vai um link, URL, texto do tempo).
- `assets/icone.png`: ícone da janela, da bandeja e do executável.
