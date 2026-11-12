# 248 — Verificação dos canais de projeto e de demanda

> Relatório textual da task [`248-canais-de-projeto-e-de-demanda.spec.md`](../248-canais-de-projeto-e-de-demanda.spec.md). Capturas e logs brutos ficam em
> `.artifacts/248/` (ignorada pelo Git); o veredito abaixo não depende deles.

## O que foi rodado (2026-11-12)

| Gate | Resultado |
|---|---|
| `npm run test --workspace=shared` | 352 testes, todos passam |
| `npm run test --workspace=backend` (unitários) | 1759 testes, todos passam |
| `npm run test:integracao` (PostgreSQL de teste) | 490 testes, todos passam; novos: `canal.service.integracao.test.ts` (21 cenários) e os de `GrupoRepository`, `DemandaRepository` e `ProjetoRepository` |
| `npm run test --workspace=frontend` (Vitest, `NODE_OPTIONS=--no-experimental-webstorage`, P-087) | 233 arquivos, 2816 testes, todos passam |
| `npm run lint:tudo` | zero erros |
| `npm run build --workspace=backend` e `--workspace=frontend` | sem erros; bundle inicial em 1,11 MB (limite de 1,15 MB) |
| `npm run repo:verificar` | aprovado |

## Verificação ao vivo

API real (`project20_verify`, PostgreSQL) e `ng serve` isolados, Playwright com cinco pessoas em contextos separados (Ana e Bruno na demanda raiz, Carla na filha, Davi fora de tudo, Rita gestora; mais uma segunda gestora na supervisão). **34 de 34 verificações em cada um dos cinco formatos (`1920×1080`, `1366×768`, `1080×1920`, `720×1280`, `960×1080`) e nos temas claro e escuro** (10 rodadas), e de novo `1920×1080` claro e `1366×768` escuro depois das correções da revisão. Cobre: "Criar chat" cria um canal por demanda; quem está na demanda lê e escreve em tempo real; quem está fora recebe 403 (pedir, criar, ler, escrever) e não vê o canal; a demanda filha tem canal próprio; o chat do projeto reúne quem está em alguma demanda dele; a gestora lê por tipo (faixa, aviso "leu este canal" aos membros) e, ao escrever, vira membro; o canal aparece na supervisão com auditoria e aviso; tirar Bruno de `demanda_usuario` faz o canal, o histórico e o chat do projeto sumirem e recusarem (403); atribuí-lo de novo devolve o canal.

## Revisão independente

Um revisor (somente leitura) achou, e foram corrigidos com teste: excluir o projeto não fechava o canal das demandas; o gestor virava membro antes da validação da mensagem; gestor inativado seguia como membro; a busca do gestor alcançava canal de demanda excluída; um método de service com parâmetro primitivo e quatro DTOs de saída fora do padrão de nome.

## Decisões tomadas sem resposta do autor (padrões propostos pela spec) — a confirmar

- Canal de **projeto**: membro = quem tem linha em `demanda_usuario` em qualquer demanda dele.
- Gestor ou administrador que escreve vira membro por uma linha em `grupo_membro`, vale para `@todos` e para as não lidas a partir da entrada; o canal continua legível pela supervisão.
- O auxiliar é tratado como desenvolvedor: precisa estar em `demanda_usuario` (a leitura por tipo é só de gestor e administrador, que a supervisão audita).
- Abrir ou criar o chat de uma demanda exige estar **na própria demanda** (quem só vê a demanda pelo projeto recebe 403 e o botão não aparece).
- `GrupoResumoDto.leituraPorSupervisao` é um campo novo do contrato.
- O aviso de privacidade do popup passou a citar também "os chats de demandas e projetos".
- Botões: na linha de pessoas da demanda aberta e no cabeçalho do projeto.

## Limites e pendências

- **Perda de acesso sem evento próprio:** o canal some na próxima releitura da lista; leitura e envio já recusam na hora (`IDEAS.md` I-054, que pede mudar o `DemandaModule`).
- **Aviso "este chat pode ser resumido por IA"** no compositor não entrou: só faz sentido com a 249.
- Elasticsearch ao vivo e o Electron real não foram exercitados; o Desktop não mudou e o canal não gera notificação do sistema (I-053).
- A captura `07-chat-do-projeto` de `1366×768` escuro pegou o popup no meio da animação de abertura; as demais mostram o estado final.
