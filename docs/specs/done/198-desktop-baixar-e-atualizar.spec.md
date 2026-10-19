# Task 198 — Botão "Baixar Project Desktop" e aviso de atualização do app

> Origem: ideia I-014 (anotações do autor, 2026-10-19).

## Situação encontrada

O `desktop/README.md` diz que não há atualização automática: o app só abre a URL do front (então o **front** atualiza sozinho) e o **executável** é recompilado
e redistribuído à mão, sem caminho dentro do sistema.

## Decisões (minhas, a confirmar com o autor)

- O backend serve o executável a partir de uma **pasta configurada** (`DESKTOP_PASTA_EXECUTAVEIS`, pelo `ConfigService`); vale o arquivo
  `Project-Desktop-<versão>.exe` de **maior versão**. Sem pasta ou sem arquivo, o botão não aparece.
- Atualização: o app consulta a versão publicada e, se for maior que a dele, mostra no menu da bandeja "Nova versão disponível: baixar", que abre o
  download no navegador. Não há atualização silenciosa (o executável não é assinado).

## Entregáveis

1. Backend (módulo `desktop`): `GET /desktop/versao` (qualquer usuário autenticado) → `{ disponivel, versao, nomeArquivo, tamanhoBytes }` e
   `GET /desktop/download` → o arquivo (cabeçalhos de download; nome seguro, sem caminho vindo do cliente). Função pura para achar a maior versão.
2. Frontend: botão "Baixar Project Desktop" no menu do usuário/topbar (análogo aprovado: os itens do menu da topbar), visível só quando
   `disponivel`; mostra versão e tamanho.
3. Desktop: leitura periódica (a cada hora) de `/desktop/versao` com o token que o app já usa, comparação de versão (função pura testada) e item novo
   no menu da bandeja; a versão do app vem do `package.json`.
4. `desktop/README.md`, `.env.example`, `SYSTEM.SPEC.md` e `MEMORY.md`.

## Critérios de Aceite

- Com `Project-Desktop-1.2.0.exe` na pasta, o botão aparece com "v1.2.0"; clicar baixa o arquivo; sem arquivo o botão some.
- O app 1.0.0 vê a 1.2.0 e mostra o item; o 1.2.0 não mostra.
- Testes: escolha da maior versão (1.10 > 1.9), controller/service, comparação de versão no desktop, componente do botão.
- Verificação ao vivo do botão e do download nos três viewports. O app Electron em si não roda em ambiente de nuvem: o item da bandeja fica
  coberto por teste das funções puras e **declarado como não verificado ao vivo**.

## Fora de Escopo

- Assinar o executável; atualização silenciosa; Mac/Linux.
