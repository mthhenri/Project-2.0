# Project Desktop

Aplicativo Electron que abre o front do Project numa janela própria, no lugar do navegador. O navegador continua sendo o centro do
sistema: o desktop só aponta para a URL do front e todo mundo o usa no dia a dia (task 152).

## Comportamento

- Abre o front (`URL_DO_PROJECT` em `src/config.ts`; no desenvolvimento, a variável `PROJECT_DESKTOP_URL` sobrepõe). Login e rotas são as do navegador.
- Janela que abre cobrindo o monitor principal, **sempre por cima**, sem arrastar nem redimensionar pela borda. O usuário pode **maximizar** (restaurar volta ao tamanho de abertura).
- **Não fecha, só some**: fechar (X e Alt+F4) e **minimizar** ocultam a janela: ela sai da barra de tarefas e do Alt+Tab, mas o app continua aberto e o ícone da bandeja (ou abrir o app de novo) a traz de volta. A única saída é "Fechar completamente" no menu do ícone da bandeja, com confirmação numa janelinha própria, no tema claro ou escuro do sistema ("Isso desativa o check-in"). O desligamento do Windows nunca é impedido.
- Bandeja: Abrir o Project, tempo até o próximo check-in (lido do backend; o menu é montado na hora de abrir) e Fechar completamente.
- **Janelinha do check-in** (task 160): com o Project **minimizado ou oculto** e o check-in disparado pelo backend, abre uma janela pequena (480 × 560), sem moldura, sempre por cima, que arrasta pelo cabeçalho (sem sair do monitor) e **não fecha nem minimiza**; ela carrega a rota `/checkin`. Some quando a descrição é registrada, os check-ins são suspensos ("Estou em reunião") ou a execução acaba, ou quando o Project volta à tela (aí o check-in é o diálogo dentro do Project, task 161). Com a IA desligada ou fora do ar ela não abre. O app lê a situação em `GET /checkin/situacao` com o token do login que a página do Project guarda (a cada 15 s; 3 s com a janelinha aberta) e a página avisa que terminou por uma ponte mínima (`window.projectDesktop.encerrarCheckin`, em `src/preload.ts`).
- Uma única instância (abrir de novo traz a janela para a frente, na área de trabalho atual). Não inicia com o Windows.
- Sem rede ou com o front fora do ar, mostra um aviso e tenta de novo a cada 5 s.

## Comandos

```bash
npm run start --workspace=desktop   # compila e abre o app (o front precisa estar no ar na URL)
npm run test --workspace=desktop    # funções puras (src/politica-da-janela.ts)
npm run pack --workspace=desktop    # executável portátil em desktop/release/ (Windows)
```

Para publicar: troque `URL_DO_PROJECT` em `src/config.ts`, rode o `pack` e coloque `release/Project-Desktop-<versão>.exe` na pasta do servidor
indicada por `DESKTOP_PASTA_EXECUTAVEIS` (ver `.env.example`). O backend serve o arquivo de **maior versão** (`GET /desktop/download`) e o menu do perfil do
Project mostra "Baixar Project Desktop" (task 198). O `package.json` do desktop é a versão instalada: aumente-a a cada publicação.

**Atualização:** o app só abre a URL do front, então o **front** se atualiza sozinho; o **executável** não. De hora em hora o desktop lê `GET /desktop/versao`
com o token do login e, se a publicada for maior que a instalada (`src/politica-da-versao.ts`), o menu da bandeja ganha "Nova versão disponível (vX.Y.Z): baixar",
que abre o Project no navegador com `?baixar-desktop=1`; o front inicia o download com o login do usuário. Não há atualização silenciosa. O executável não é assinado.

## Estrutura

- `src/main.ts`: janela, bandeja, instância única e travas (a parte que depende do Electron).
- `src/politica-da-janela.ts`: as decisões como funções puras com testes (fechar ou ocultar, janela fora do lugar, janela solta dentro do monitor, para onde vai um link, URL, texto do tempo).
- `src/politica-do-checkin.ts`: as decisões do check-in, também puras e testadas (ler a situação, quando abrir e quando fechar a janelinha, segundos até o próximo check-in, endereço da API).
- `src/preload.ts`: a ponte entre a página e o desktop.
- `assets/icone.png`: ícone da janela, da bandeja e do executável.
