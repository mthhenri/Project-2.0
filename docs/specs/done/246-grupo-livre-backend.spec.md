# 246-grupo-livre-backend.spec.md

> Task 1/5 da guarda-chuva [`chat-grupos.spec.md`](chat-grupos.spec.md), fase 1 (lado do servidor). Modelagem em
> [`chat-grupos/modelagem.md`](chat-grupos/modelagem.md) (§1 a §4). Estende o chat um a um da guarda-chuva [`chat-colaboradores.spec.md`](chat-colaboradores.spec.md).
> Depende da [`214`](214-mensagem-direta-supervisao.spec.md) (supervisão).

## Objetivo

Dar ao chat entre colaboradores o **grupo livre** no servidor: modelo, migration, armazenamento das mensagens de grupo, service e API, **membros** (adicionar, sair, readicionar, fim do
grupo), **nome e foto**, **mensagens do sistema** e **supervisão de grupo**. A tela é a 247. A conversa um a um **não muda**.

## Decisões da guarda-chuva (autor, 2026-10-23)

Membros: qualquer membro adiciona; **ninguém remove ninguém**, cada um só sai por conta própria e pode ser readicionado; o novo membro **vê todo o histórico**, mas as não lidas
começam na entrada. Qualquer membro renomeia. O último a sair fecha o grupo (soft delete; o histórico permanece). Gestor e administrador podem entrar; o grupo com um deles fica
**privado** para a supervisão, com mensagem do sistema. Grupo sem gestor ou administrador entre os **membros atuais** é legível pela supervisão, com o mesmo aviso e a mesma auditoria da 214.
`@todos` vale para qualquer membro.

## Entregáveis

1. **Migration** (a próxima livre na hora; skill `sql-migrations`): `tipo_grupo` (`LIVRE`, `PROJETO`, `DEMANDA`), `grupo`, `grupo_membro` e `grupo_leitura`, conforme a modelagem §2, sem
   `DEFAULT`, com índices únicos parciais `is_deleted = false` e `docs/SCHEMA.md` atualizado. **Só o que o grupo livre usa**: `projeto_id` e `demanda_id` entram em `grupo` (nulos aqui), mas
   `grupo_fixada` é da 250 e `grupo_resumo` da 249, que criam as suas tabelas. `grupo_membro.saida_date` preenchida significa "saiu"; readicionar cria ou reabre a linha (decidir ao implementar
   e testar). O enum `TipoGrupoEnum` e as tabelas de tipo seguem o que o projeto já faz para outros tipos (conferir).
2. **Mensagem de grupo no armazenamento** (modelagem §3): `ArmazenamentoDeMensagemDireta` ganha `conversa_tipo` (`DIRETA` | `GRUPO`) e `grupo_id`; `participantes` fica vazio no grupo.
   Métodos novos no contrato: gravar e listar a conversa do grupo (cursor opaco), não lidas por grupo, busca restrita aos grupos do usuário e a listagem de grupos para a supervisão.
   A suíte de contrato ganha os cenários de grupo e **roda nas três implementações** (OpenSearch, Elasticsearch e PostgreSQL provisório; a tabela provisória e o mapeamento do índice ganham as colunas
   novas, e a mensagem um a um existente continua válida sem reindexar: confirmar se a mudança do mapeamento exige reindexar). Documentos antigos sem `conversa_tipo` valem como `DIRETA`.
3. **Service e API** (módulo `mensagem-direta`, controller fino, DTOs no `shared` por `project20-dto-conventions`): criar grupo (o criador vira membro), listar grupos do usuário junto com a lista
   de conversas (uma lista só para o popup), recuperar grupo com membros, adicionar membro(s), sair, alterar nome, enviar e listar mensagens do grupo, marcar como lida, silenciar. Rotas sob
   `/mensagem-direta/grupo...`. Regras: só membro ativo lê e escreve; quem saiu **não** lê mais; readicionado, volta a ler tudo; o limite de membros (ponto em aberto) é validado na service.
4. **Mensagens do sistema** (`autor = SISTEMA`): entrada, saída, "gestor/administrador entrou" (o grupo passa a ser privado), renomeação. Texto e tipo ficam na service; o cliente só renderiza.
5. **Tempo real:** os eventos da 209 (`MENSAGEM`, `LEITURA`, `SINCRONIZAR`) passam a identificar também o grupo e a ter como alvo todos os membros ativos; entrada e saída de membro geram
   `SINCRONIZAR` da lista. Mudança de contrato do evento no `shared` com teste.
6. **Supervisão de grupo** (reaproveita a 214): regra de elegibilidade para N participantes (lista = membros **atuais**; decidida na hora da leitura); rotas de supervisão listam e abrem também
   grupos; aviso aos membros e auditoria como na 214. A tabela `mensagem_direta_supervisao` guarda `usuario_menor_id`/`usuario_maior_id`; **ponto em aberto** abaixo.
7. **`@todos`:** a service aceita a menção `@todos` do grupo (qualquer membro) e a expande nos membros ativos para o aviso; a menção a quem não é membro é recusada (mesma lógica da 208).
8. **Testes:** unitários da service (cada regra e recusa, incluindo sair, readicionar, último a sair, gestor entrando, elegibilidade com N), controller, repositories (integração: unicidade parcial,
   sair e readicionar, não lidas desde a entrada), suíte de contrato nas três implementações, eventos. Aplicar `gerenciamento-de-impacto` (`npm run impacto`) em DTOs e contrato alterados.
9. **Documentação:** `docs/SYSTEM.SPEC.md` (módulo e rotas), `docs/SCHEMA.md`, `CONTEXT.md`, `HISTORY.md`, `MEMORY.md`.

## Critérios de Aceite

- `npm run test --workspace=shared`, `--workspace=backend`, `npm run test:integracao` e `npm run build --workspace=backend` passam; a suíte de contrato passa nas três implementações; `npm run repo:verificar` passa.
- **Ao vivo** (API real, `CHAT_ARMAZENAMENTO=opensearch` e `postgres`, três usuários): A cria o grupo com B; B adiciona C, que vê o histórico e tem zero não lidas; C sai e deixa de ler; é readicionado
  e volta a ler; o último a sair fecha o grupo; qualquer membro renomeia; as mensagens do sistema aparecem; um gestor entra e o grupo some da supervisão com a mensagem de aviso; sem gestor, o gestor o
  lê pela supervisão com auditoria e aviso; terceiro que não é membro recebe 403.
- O chat um a um segue passando em todas as suítes (contrato e service) sem alteração de comportamento.

## Fora de Escopo

- Tela, popup e Desktop (247); canais de projeto e de demanda (248); resumo com a IA (249); fixar mensagem e busca no grupo (250; a busca de grupo desta task é só a restrição aos grupos do usuário).
- Remover membro de grupo; anexos e imagens; foto de perfil própria do grupo (a foto é derivada do nome, ver 247).

## Dependências

`214` (supervisão) e as tasks 205 a 213 (em `done/`). Fontes: `chat-grupos/modelagem.md`, `chat-colaboradores/modelagem.md`, `docs/SCHEMA.md`, `demanda_usuario` (só para os canais, não usado aqui).

## Riscos e Mitigação

- **Relaxar regra do um a um:** a modelagem manda **não** tocar `mensagem_direta_leitura` (que exige dois usuários distintos) nem `participantes[2]`; o grupo usa tabelas e campos próprios.
- **Mudança de mapeamento do índice:** conferir se campos novos exigem reindexar no OpenSearch e no Elasticsearch; sem plano de reindexação a task não fecha.
- **Elegibilidade que muda com a entrada de um gestor:** o grupo antes legível passa a privado; testar a virada nos dois sentidos (entra e sai).
- **Grupo com muitos membros:** o evento tem alvo múltiplo; o limite de membros protege o `NOTIFY` (8.000 bytes) e a lista de entrega.

## Pontos em aberto (padrão proposto; autor confirma ao abrir a task)

- Limite de membros do grupo livre: padrão 50.
- Quem entra num grupo que já tinha histórico lido pela supervisão: padrão = o estado atual vale (grupo com gestor fica privado).
- Tabela de auditoria: estender `mensagem_direta_supervisao` (`grupo_id` opcional) ou tabela própria; recomendação = estender, com `usuario_menor_id`/`usuario_maior_id` anuláveis. Decidir com a 214 pronta.
- Tamanho máximo do nome do grupo e se o nome é obrigatório (proposta: obrigatório, 60 caracteres).
