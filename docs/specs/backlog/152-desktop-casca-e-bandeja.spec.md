# Task 152 — Project Desktop: casca e bandeja

> Origem: guarda-chuva [`rework-chat-ia.spec.md`](rework-chat-ia.spec.md), bloco 7, seção "Project Desktop". Reescrita em 2026-10-18 depois da conversa com o autor sobre o app (o V1 vivia na empresa e não está disponível). Protótipo de comportamento validado pelo autor, fora do repositório (artefato de design da conversa).

## Objetivo

Criar o **Project Desktop**: um aplicativo Electron, em `desktop/`, que abre o front do Project numa janela própria em vez do navegador. O navegador continua sendo o centro do sistema: o desktop só aponta para a URL do front e todo mundo o usa no dia a dia. Esta task entrega a casca e a bandeja; a janelinha do check-in é a 160.

## Comportamento (combinado com o autor)

- **Carrega a URL do front**, fixa e igual para todos (uma constante num só arquivo do `desktop/`). Login e rotas são as do navegador.
- **Janela principal**: abre maximizada, sempre em tela cheia do monitor principal, **sempre por cima**, sem arrastar nem redimensionar (o botão de restaurar não tem efeito). O usuário **pode minimizar** para usar outro programa.
- **Não fecha**: fechar, Alt+F4 e equivalentes só minimizam. Única saída: **"Fechar completamente"** no menu do botão direito do ícone da bandeja, que pede confirmação ("Isso desativa o check-in") e só então encerra.
- **Bandeja**: ícone com menu (Abrir o Project, tempo até o próximo check-in, Fechar completamente). O tempo vem da 161; antes dela o item aparece como "indisponível".
- **Uma única instância**: abrir de novo traz a janela existente para a frente.
- **Não inicia com o Windows**: o usuário abre o aplicativo no começo do dia.
- **Desligar ou reiniciar o Windows** nunca é impedido pelo app (o fechamento é liberado quando o sistema pede).
- **Várias áreas de trabalho**: ao trazer a janela, o app minimiza e restaura, o que a coloca na área atual.
- **Plataformas**: Windows é o alvo; Linux entra se o empacotamento for direto.

## Entregáveis

1. Workspace `desktop/` (acrescentar a `workspaces` da raiz): `package.json`, TypeScript, Electron e empacotamento para Windows (executável portátil, que o autor coloca numa pasta compartilhada), build e `.gitignore` da saída.
2. Janela principal e as travas acima, com a lógica de decisão em **funções puras testáveis** (por exemplo: "este evento de fechamento deve ser impedido?", "o fechamento veio do sistema?").
3. Bandeja com o menu e a confirmação de "Fechar completamente".
4. Instância única.
5. README do workspace (rodar em dev, empacotar, onde fica a URL), `docs/SYSTEM.SPEC.md`, `docs/context/` e `AGENTS.md`/`CLAUDE.md` com o novo workspace.
6. Testes das funções puras com `node:test`.

## Critérios de Aceite

- Empacotado num Windows comum, abre o Project; Alt+F4, fechar e o botão de restaurar não derrubam nem encolhem a janela; minimizar funciona; "Fechar completamente" pede confirmação e encerra.
- Build do `desktop` e `npm test` na raiz; verificação visual manual declarada se o ambiente não rodar o Electron.

## Fora de Escopo

- A janelinha do check-in e o horário do check-in (160 e 161); atualização automática, instalador assinado, tela offline e fila local (descartada pelo autor).

## Dependências

Nenhuma além da própria aplicação (a `161` preenche o tempo da bandeja).

## Riscos e Mitigação

- O ambiente de verificação pode não executar o Electron: a task fica **aberta** com o que foi testado (funções puras, build) e o que falta (janela real, bandeja, multi-área de trabalho no Windows).
