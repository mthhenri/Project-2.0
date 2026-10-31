# Verificação — 214 Supervisão do chat entre colaboradores

Verificada em 2026-10-31 com o stack real (backend em `:3000`, front em `:4200`, PostgreSQL 16 e OpenSearch locais, `CHAT_ARMAZENAMENTO` padrão),
com usuários descartáveis criados pela API (`ana`, `bruno` desenvolvedores; `carla` gestora) e o `gestor.inicial` (administrador). Saídas em `.artifacts/214/`
(ignorada pelo Git).

## Gates automáticos

| Gate | Resultado |
|---|---|
| `npm test` (shared 294, backend 1572, scripts) | verde |
| `npm run test:integracao` | 364 passam (inclui o repository da supervisão e as duas consultas novas de usuário) |
| `npm run test --workspace=frontend` | 2388 testes: 5 falhavam por causa do item novo da barra (`sidebar.component.spec.ts`), corrigidos e relidos (25 verdes); a página, a conversa e a navegação passam |
| `npm run test --workspace=desktop` | 37 verdes |
| builds de `backend`, `frontend` e `desktop` | ok |
| `npm run repo:verificar` | ok |

Lint não existe (P-001). `tsc` do `shared` acusa `proposta-nivel.test.ts(60,66)`: **preexistente**, não é desta task.

## Ao vivo, pela API real (três perfis)

`.artifacts/214/api.txt`; todos OK:

- O gestor lista a conversa entre os dois desenvolvedores; a conversa Ana–Carla (com gestor) **não** aparece na lista.
- Abrir pela primeira vez devolve `participantesAvisados: true`; Ana e Bruno recebem **uma** mensagem `SISTEMA` ("Carla Gestora 214, gestor, leu esta conversa").
- Abrir de novo no mesmo dia grava a auditoria mas **não** avisa de novo (continua uma só mensagem do sistema).
- A tabela `mensagem_direta_supervisao` ficou com duas linhas do leitor: `participantes_avisados = true` na primeira e `false` na segunda.
- **403:** conversa em que o gestor é participante; conversa com gestor lida por outro (administrador); desenvolvedor nas duas rotas.
- Promover Bruno a gestor torna a conversa privada na próxima leitura (**403**); rebaixado de volta, volta a ser supervisionável.

## Ao vivo, na tela (`/supervisao-chat`, como a gestora Carla)

- Item **Supervisão do chat** no grupo IA da barra (gestor vê o grupo IA com um item; o administrador, com dois).
- Estados vistos: cheio (lista e conversa aberta com balões, bloco de código copiável, linha do sistema), "Escolha uma conversa" (sem seleção). Vazio, erro, sem resultado e conversa privada (403) são cobertos pelo teste de componente, **não** vistos ao vivo.
- Viewports: `1366×768` (claro, capturado), `1080×1920` (claro: a lista e a conversa lado a lado, sem rolagem horizontal) e `1920×1080` (tema escuro, capturado; o campo de busca tem fundo escuro, conferido pelo estilo calculado). `1920×1080` claro e `1366×768` escuro não foram percorridos.
- Análogos usados: o popup do chat (210) para balões, bloco de código e linha do sistema; a lista de Usuários para o cabeçalho e a busca.

## Limites e decisões

- **Páginas mais antigas** (com `cursor`) não geram nova auditoria nem aviso: "abertura" é a primeira página. A spec dizia "uma linha por abertura" sem tratar a paginação; esta é a leitura adotada.
- A última mensagem da lista pode ser a do sistema (a prévia mostra "…leu esta conversa"). Aceito; filtrar a mensagem do sistema da prévia seria ajuste futuro.
- **Não verificado:** o tempo real da mensagem do sistema chegando ao popup aberto dos dois participantes (só a gravação e a leitura pela conversa); a virada do dia no fuso (provada por teste de integração com `agora` de ontem, hoje e amanhã, não esperando a meia-noite); o popup do Project Desktop.
- Pontos em aberto da spec, resolvidos pelos padrões propostos: ícone `pi pi-eye`, tecla `s`, rota `/supervisao-chat`, texto "<Nome>, <gestor|administrador>, leu esta conversa".
