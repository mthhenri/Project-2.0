# 314 — Reações nas mensagens e seletor de emoji no chat entre colaboradores

> Task da guarda-chuva `chat-colaboradores-evolucao.spec.md` (decisões do autor, 2026-11-06). Tem modelagem: as escolhas abaixo foram dadas pelo autor em
> 2026-11-06 (tabela no PostgreSQL, seis reações fixas, aviso sem gravar na conversa). **Só vira código depois de o autor aprovar esta spec.**

## O que muda para o usuário

- **Reagir.** Cada mensagem de **pessoa** (não a do sistema) ganha a ação "Reagir" (no menu da mensagem e num botão que aparece ao passar o mouse). Abre uma faixa com **seis
  reações fixas**: 👍 curtir, ❤️ amar, 😂 rir, 😮 surpreso, 😢 triste, 🙏 agradecer.
- **Uma reação por pessoa por mensagem.** Escolher outra troca a anterior; escolher a mesma de novo **remove**. Qualquer das duas pessoas da conversa pode reagir a qualquer
  mensagem de pessoa, inclusive à própria (sem aviso a si mesma).
- **Como aparece.** Abaixo do balão, uma pílula por reação existente com o emoji e a quantidade (1 ou 2); a que é minha fica destacada, e clicar nela remove. Dica (`title`) com quem reagiu.
  Atualiza **em tempo real** nas duas pontas.
- **Aviso ao autor.** Quando alguém reage à mensagem de outra pessoa, o autor recebe o aviso do chat (cartão no canto, som e Desktop, respeitando silêncio, conversa silenciada e
  preferências): "<PESSOA> reagiu à sua mensagem com <EMOJI>". **Não entra na conversa** (não é mensagem do sistema) e **não conta como não lida**. Trocar a reação avisa de novo; remover não avisa.
- **Seletor de emoji para escrever.** Botão no compositor abre um seletor com **todos os emojis** (por categoria), que insere o emoji no cursor. É independente das reações: não grava nada.

## Modelagem (decidida)

Antes: a mensagem (documento do índice ou linha de `mensagem_direta`) não tem reações. Depois: as reações ficam numa **tabela do PostgreSQL**, **não no documento da mensagem**, para as três
implementações do armazenamento (PostgreSQL, OpenSearch, Elasticsearch) ficarem iguais e **o contrato `ArmazenamentoDeMensagemDireta` não mudar**.

- **Tabela `mensagem_direta_reacao`** (migration **0083**, sem DEFAULT, sem trigger; `updated_date = NOW()` no UPDATE): colunas de `BaseEntity` mais `mensagem_id` (UUID, **sem FK**: a mensagem pode viver
  no índice), `conversa_id` (`VARCHAR(21)`, o mesmo formato da `mensagem_direta`), `usuario_id` (FK para `usuario`) e `reacao` (`VARCHAR(30)`, o **código** do enum, nunca o caractere: o emoji é do
  `shared`). Índice único parcial (`mensagem_id`, `usuario_id`) onde `is_deleted = false` (uma reação por pessoa por mensagem) e índice em `conversa_id`. Remover é **soft delete**; trocar é `UPDATE`.
- **`shared`:** enum `ReacaoMensagemDiretaEnum` (`CURTIR`, `AMAR`, `RIR`, `SURPRESO`, `TRISTE`, `AGRADECER`) e o mapa código → emoji e rótulo (regra pura, usada pela service no texto do aviso e pelo front);
  `MensagemDiretaResumoDto.reacoes: ReacaoMensagemDiretaDto[]` (`{ usuarioId, reacao }`; sempre presente, vazia quando não há); DTOs `MensagemDiretaReagirDto` (`destinatarioId`, `mensagemId`, `reacao: ReacaoMensagemDiretaEnum | null`,
  `null` remove) e `MensagemDiretaReagidaDto` (`{ mensagemId, reacoes }`); evento do stream `{ tipo: 'REACAO'; conversaId; mensagemId; reacoes; autorUsuarioId; reatorUsuarioId; reacao }`
  (`reacao` é a nova, `null` ao remover). Rota `PUT /mensagem-direta/reacao`. Nomes a conferir com a skill `project20-dto-conventions`.
- **Como as reações chegam às mensagens (a service junta):** a `MensagemDiretaService` lê a página de mensagens do armazenamento e busca as reações dessas mensagens numa **única consulta** (`mensagem_id = ANY(:ids)`)
  ao `MensagemDiretaReacaoRepository`, devolvendo tudo junto. Vale também para a mensagem devolvida no envio e na edição. **Busca e supervisão devolvem `reacoes: []`** (fora de escopo, ver abaixo).

## Backend

- `MensagemDiretaReacaoRepository` (SQL puro): `listarPorMensagens`, `definir` (INSERT … SELECT … RETURNING, UPDATE da troca) e `remover` (soft delete). Todo `SELECT`/`UPDATE` filtra `is_deleted = false`.
- `MensagemDiretaService.reagir`: valida o destinatário (existe, ativo, diferente de quem reage); que a mensagem existe **na conversa** (`recuperarMensagem`) e **não é do sistema**; reação válida do enum;
  grava ou remove; publica `REACAO` às **duas pontas** com a lista atualizada. Reagir não mexe em leitura, não lidas, `created_date` nem na ordem.
- Controller fino (`PUT reacao`); regras e permissões na service. Barramento: `REACAO` cabe com folga no limite do `NOTIFY` (a lista tem no máximo duas reações); se passar, vira `SINCRONIZAR` como os demais.

## Frontend

- Menu da mensagem ganha "Reagir" e o botão ao passar o mouse; faixa com as seis reações; pílulas sob o balão; tratamento do evento `REACAO` (troca as reações da mensagem na conversa) e **o aviso** pelo mesmo
  `decidirAviso` do chat (só para o autor, nunca para si mesmo, nunca ao remover). Análogo visual: o menu de ações e a barra de resposta (tasks 220 e 311) e o cartão de aviso (task 212).
- Seletor de emoji: botão no compositor, painel com categorias e inserção no cursor. Análogo: o painel de sugestões `@`/`#` do compositor (task 211).

## Testes e verificação

- `shared`: mapa de emojis cobre todo o enum; DTOs. `backend`: service (reagir, trocar, remover, a mesma de novo, mensagem de outra conversa, do sistema, a própria, evento às duas pontas) e junção das reações
  na página; **integração** do repository (único parcial, soft delete, `ANY(:ids)` vazio). `frontend`: componente (faixa, pílulas, destaque da minha, remover, evento, aviso só ao autor) e seletor (insere no cursor).
- Ao vivo (skill `verify`) nos cinco formatos e nos dois temas, com dois usuários em dois navegadores: reagir, trocar, remover, aviso ao autor, tempo real. `npm run lint:tudo`, `npm run repo:verificar`.

## Pontos em aberto (do autor)

- **Seletor de emoji:** biblioteca pronta (nova dependência, a decidir) ou lista própria por categoria (sem dependência, menor, mas só os emojis que listarmos). Padrão sugerido: lista própria.
- **Reação à mensagem do sistema** fica de fora (a linha central não tem balão); confirmar.

## Fora de escopo

Reações na busca e na supervisão; reações personalizadas; mais de uma reação por pessoa; histórico de quem reagiu e quando; guardar o aviso na conversa.
