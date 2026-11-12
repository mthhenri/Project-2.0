# 246 — Verificação do grupo livre (backend)

> Relatório textual da task [`246-grupo-livre-backend.spec.md`](../246-grupo-livre-backend.spec.md). Capturas e logs brutos ficam em `.artifacts/246/`
> (ignorada pelo Git); o veredito abaixo não depende deles.

## O que foi rodado (2026-11-12)

| Gate | Resultado |
|---|---|
| `npm run test --workspace=shared` | 350 de 350 |
| `npm run test --workspace=backend` (unitários) | 1755 de 1755 |
| `npm run test:integracao` (banco de teste real, 460 testes; inclui a suíte de contrato do Postgres com os cenários de grupo) | 460 de 460 |
| Suíte de contrato do OpenSearch real (`CHAT_INTEGRACAO=1`) | cenários de grupo passam; **1 falha preexistente** (`alterarMensagem`, "e não o antigo"), igual no código de antes da task: P-086 |
| Suíte de contrato do Elasticsearch | **não rodada** (sem serviço local); a lógica é a mesma classe base do OpenSearch |
| `npm run test --workspace=frontend` | 2701 de 2701, com `NODE_OPTIONS=--no-experimental-webstorage` (sem ele quase tudo falha no Node 26, antes da task: P-087) |
| `npm run build --workspace=backend` e `--workspace=frontend` | sem erros |
| `npm run lint:tudo` | sem erros |
| `npm run repo:verificar` | aprovado |
| Migration `0087`: aplicar, reverter (rollback em lote) e aplicar de novo, em banco descartável | sem erro; constraints exercitadas com `INSERT` direto |

## Ao vivo (API real)

Banco isolado `project20_verify`, API na porta 3001, script `.artifacts/246/verificar.mjs` (três desenvolvedores e uma gestora criados pela API do gestor
inicial). Rodado duas vezes, com `CHAT_ARMAZENAMENTO=postgres` e com `opensearch`: **26 de 26 verificações** nas duas.

Cobertura do roteiro: A cria o grupo com B (com emoji); B adiciona C, que vê o histórico e tem zero não lidas, e as não lidas passam a contar desde a entrada;
C sai e passa a receber 403 ao ler; é readicionada e volta a ler; qualquer membro renomeia e escolhe a cor; as mensagens do sistema aparecem (criou, saiu,
adicionou, renomeou); quem não é membro recebe 403; a busca acha a mensagem do grupo só para o membro; sem gestor entre os membros, a gestora lista e abre o grupo
pela supervisão e os membros veem o aviso; desenvolvedor na supervisão recebe 403; entra a gestora, o grupo fica privado com a mensagem do sistema, some da
supervisão e a leitura por ela é recusada; leitura e silêncio; o último a sair fecha o grupo (404 depois).

## Limites

- Sem tela (a 247): nada visual a verificar nesta task.
- Elasticsearch sem execução real; edição, reação e `@IA` em grupo ficam fora desta task.
- O fuso dos avisos diários da supervisão é o `APP_TIMEZONE` da conexão, como na task 214.
