# 247 — Verificação do grupo livre no popup e na supervisão

> Relatório textual da task [`247-grupo-livre-frontend-e-desktop.spec.md`](../247-grupo-livre-frontend-e-desktop.spec.md). Capturas e logs brutos ficam em
> `.artifacts/247/` (ignorada pelo Git); o veredito abaixo não depende deles.

## O que foi rodado (2026-11-12)

| Gate | Resultado |
|---|---|
| `npm run test --workspace=frontend` (Vitest, `NODE_OPTIONS=--no-experimental-webstorage`, P-087) | 231 arquivos, 2792 testes, todos passam |
| Testes novos | `grupo.util`, `mencionaTodosNoTexto`, `somarAviso` com grupo, `avatar-grupo` (util e componente), serviço HTTP dos grupos, popup com grupos (26 cenários: lista mista, contador, estados vazio, carregando e erro, conversa, envio e `@todos`, eventos, criar, detalhes, sair, silêncio, sem conexão), barra, avisos e supervisão dos grupos |
| `npm run build --workspace=frontend` | sem erros; o limite do bundle inicial subiu de 1,1 MB para 1,15 MB (resultado: 1,11 MB) |
| `npm run lint:tudo` | sem erros |
| `npm run repo:verificar` | aprovado |
| `npm run test --workspace=desktop` | não rodado: o Desktop não mudou |

## Ao vivo (API real e `ng serve` isolados, Playwright)

Banco `project20_verify`, API na 3001 com `CHAT_ARMAZENAMENTO=postgres`, `ng serve` na 4201. Quatro pessoas em contextos de navegador separados (storage isolado),
com cores de bolinha diferentes. Roteiro `.artifacts/247/verificar.mjs`, **17 de 17 verificações** em cada tamanho e tema:

- `1920×1080` claro e escuro; `1366×768` claro e escuro; `1080×1920` claro; `720×1280` claro; `960×1080` claro e escuro.

O roteiro cobre: Ana cria o grupo com Bruno e Carla (emoji e degradê automático) e cai na conversa; os dois o recebem sem recarregar; `@todos` vira cartão de aviso
com `@você`; Carla silencia e não recebe cartão do que vem depois; qualquer membro renomeia e escolhe a cor, e todos veem na hora; Davi, adicionado depois, vê o
histórico; Carla sai (o grupo some da lista dela e os outros veem "saiu do grupo"), é readicionada e volta a ver o histórico; a conversa um a um abre sem a marca de
grupo; a lista de Ana mistura grupo e conversa. Roteiro `.artifacts/247/verificar-supervisao.mjs`, **7 de 7**: a gestora lista e lê o grupo pela supervisão (o aviso
"leu este grupo" aparece para os membros), o grupo some da supervisão quando uma gestora entra nele, e a janela `/chat-popup` (420×640) lista grupos e pessoas no seletor
"Para" e abre o grupo escolhido. As capturas foram conferidas uma a uma nos dois temas e nos tamanhos estreito e largo.

## Limites

- **Electron real não exercitado**: o código do Desktop não mudou; a janela de chat é a página `/chat-popup`, que foi exercitada no navegador (420×640). "Código copiado em
  outro programa vai para o grupo escolhido" depende da ponte do Electron; a lógica no front (`rascunhoDoDesktop` mantido ao escolher o grupo na tela `NOVA`) tem teste.
- **Sem notificação do sistema para grupo** com o Project oculto no Desktop (a ponte abre a conversa pela pessoa): I-053.
- Texto do aviso de privacidade é uma proposta, a confirmar com o autor.
- O Edge/Safari não foram usados; a verificação foi no Chromium do Playwright.
