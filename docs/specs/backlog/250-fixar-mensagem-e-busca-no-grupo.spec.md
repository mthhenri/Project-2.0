# 250-fixar-mensagem-e-busca-no-grupo.spec.md

> Task 5/5 da guarda-chuva [`chat-grupos.spec.md`](chat-grupos.spec.md), fase 4. Depende da [`246`](246-grupo-livre-backend.spec.md) e da [`247`](247-grupo-livre-frontend-e-desktop.spec.md);
> funciona também nos canais da [`248`](248-canais-de-projeto-e-de-demanda.spec.md).

## Objetivo

Permitir **fixar mensagens** num grupo ou canal e **buscar dentro dele**, estendendo a busca da task 208, que hoje é só do um a um.

## Decisões da guarda-chuva (autor, 2026-10-23)

Fixar mensagem e busca dentro do grupo valem para grupo livre e canais. A guarda-chuva não define quem pode fixar nem quantas mensagens: ficam como pontos em aberto abaixo.

## Entregáveis

1. **Migration** (a próxima livre na hora): `grupo_fixada` (`grupo_id`, `mensagem_id`, `fixada_por_usuario_id`; único `(grupo_id, mensagem_id)` com `is_deleted = false`; desafixar é soft delete),
   sem `DEFAULT`, com `docs/SCHEMA.md` atualizado. A mensagem fica no armazenamento; a tabela guarda só a referência.
2. **Service e API** (`mensagem-direta`, controller fino, DTOs no `shared`): fixar, desafixar e listar as fixadas de um grupo ou canal (com o texto da mensagem, resolvido pelo armazenamento
   por `mensagem_id`); só membro (livre) ou quem lê o canal (por `demanda_usuario`; o gestor que só supervisiona **não** fixa) pode fixar. Limite de fixadas por grupo conforme o ponto em aberto.
   Mensagem do sistema "Fulano fixou uma mensagem"? Ponto em aberto.
3. **Busca no grupo:** o `buscar` do contrato ganha o filtro por `grupo_id` (texto sem acento, período e `somenteCodigo`) nas três implementações de armazenamento, com cenários na suíte de
   contrato; a busca geral do popup passa a incluir também os grupos e canais do usuário (restrição obrigatória aos grupos de que ele é membro ou aos canais que lê). A busca de supervisão
   (214/246) não muda.
4. **Realtime:** fixar e desafixar geram `SINCRONIZAR` do grupo para os membros (sem novo tipo de evento, se o contrato da 209 bastar).
5. **Frontend:** na conversa de grupo e de canal, ação "Fixar" no menu da mensagem (ou ícone de pino, análogo a escolher ao abrir) e uma faixa/painel de fixadas no topo, que rola até a mensagem
   original ao clicar; busca no cabeçalho da conversa do grupo (campo de texto e filtro "Com código"), com resultados realçados, como a busca geral do popup (210). Estados: sem fixadas, sem
   resultado, carregando, erro; tema escuro.
6. **Testes:** service (permissões, limite, idempotência de fixar, desafixar), repository (integração), suíte de contrato (filtro por grupo, sem vazar entre grupos), eventos, componente da faixa e
   da busca. Documentação: `docs/SYSTEM.SPEC.md`, `docs/SCHEMA.md`, `CONTEXT.md`, `HISTORY.md`, `MEMORY.md`.

## Critérios de Aceite

- Testes de `shared`, `backend` (unitários e integração, inclusive a suíte de contrato nas três implementações) e `frontend`, builds e `npm run repo:verificar` passam.
- **Ao vivo** (três usuários, grupo livre e canal; `1920×1080`, `1366×768` e `1080×1920`, claro e escuro): fixar aparece para todos em tempo real; clicar na fixada rola até a mensagem; desafixar
  some para todos; a busca no grupo acha texto sem acento e código e **não** traz mensagem de outro grupo nem de conversa um a um; quem saiu do grupo não vê as fixadas nem busca nele.
- Comparado com a conversa e a busca do popup atual (análogo aprovado).

## Fora de Escopo

- Fixar na conversa um a um; reordenar fixadas; busca global fora do popup; busca semântica; apagar ou editar a mensagem fixada.

## Dependências

`246` e `247` (`248` para os canais). Fontes: `chat-grupos.spec.md`, `modelagem.md` §2, task 208 (busca) e 210 (busca no popup).

## Riscos e Mitigação

- **Mensagem fixada que não existe mais no armazenamento:** mensagens são imutáveis, mas o índice pode ser recriado; a listagem ignora a referência sem documento e não quebra.
- **Vazamento entre grupos na busca:** o filtro por grupo e a restrição de membro são obrigatórios no armazenamento e na service; a suíte de contrato testa o isolamento.

## Pontos em aberto (padrão proposto; autor confirma ao abrir a task)

- Quem pode fixar: padrão = qualquer membro (no canal, quem lê por `demanda_usuario`).
- Limite de fixadas: padrão 10 por grupo.
- Mensagem do sistema ao fixar: padrão = não.
