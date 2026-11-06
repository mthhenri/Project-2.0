# 314 — Reações nas mensagens e seletor de emoji no chat entre colaboradores

> Task da guarda-chuva `chat-colaboradores-evolucao.spec.md` (decisões do autor, 2026-11-06). Tem modelagem: as escolhas abaixo foram dadas pelo autor em
> 2026-11-06 (tabela no PostgreSQL, aviso sem gravar na conversa e, depois, **qualquer emoji como reação**, com seis atalhos). Aprovada pelo autor em 2026-11-06 e implementada no mesmo dia.

## O que muda para o usuário

- **Reagir.** Cada mensagem de **pessoa** (não a do sistema) ganha a ação "Reagir" (no menu da mensagem e num botão que aparece ao passar o mouse). Abre uma faixa com **seis
  atalhos**: 👍 ❤️ 😂 😮 😢 🙏, e um botão **"+"** que abre o seletor completo: a pessoa pode reagir com **qualquer emoji** (decisão do autor, 2026-11-06).
- **Uma reação por pessoa por mensagem.** Escolher outro emoji troca o anterior; escolher o mesmo de novo **remove**. Qualquer das duas pessoas da conversa pode reagir a qualquer
  mensagem de pessoa, inclusive à própria (sem aviso a si mesma).
- **Como aparece.** Abaixo do balão, uma pílula por reação existente com o emoji e a quantidade (1 ou 2); a que é minha fica destacada, e clicar nela remove. Dica (`title`) com quem reagiu.
  Atualiza **em tempo real** nas duas pontas.
- **Aviso ao autor.** Quando alguém reage à mensagem de outra pessoa, o autor recebe o aviso do chat (cartão no canto, som e Desktop, respeitando silêncio, conversa silenciada e
  preferências): "<PESSOA> reagiu à sua mensagem com <EMOJI>". **Não entra na conversa** (não é mensagem do sistema) e **não conta como não lida**. Trocar a reação avisa de novo; remover não avisa.
- **Seletor de emoji.** Um só componente, com **todos os emojis** (por categoria), usado em dois lugares: o botão do compositor (insere o emoji no cursor, não grava nada) e o "+" da faixa de reações (grava a reação).

## Modelagem (decidida)

Antes: a mensagem (documento do índice ou linha de `mensagem_direta`) não tem reações. Depois: as reações ficam numa **tabela do PostgreSQL**, **não no documento da mensagem**, para as três
implementações do armazenamento (PostgreSQL, OpenSearch, Elasticsearch) ficarem iguais e **o contrato `ArmazenamentoDeMensagemDireta` não mudar**.

- **Tabela `mensagem_direta_reacao`** (migration **0083**, sem DEFAULT, sem trigger; `updated_date = NOW()` no UPDATE): colunas de `BaseEntity` mais `mensagem_id` (UUID, **sem FK**: a mensagem pode viver
  no índice), `conversa_id` (`VARCHAR(21)`, o mesmo formato da `mensagem_direta`), `usuario_id` (FK para `usuario`) e `reacao` (`VARCHAR(32)`: o **próprio emoji**, em texto, já que vale qualquer um; a service confere que é **um só emoji**). Índice único parcial (`mensagem_id`, `usuario_id`) onde `is_deleted = false` (uma reação por pessoa por mensagem) e índice em `conversa_id`. Remover é **soft delete**; trocar é `UPDATE`.
- **`shared`:** a lista dos seis atalhos (`REACOES_RAPIDAS_MENSAGEM_DIRETA`) e a regra pura `ehReacaoValida` (exatamente um emoji: um só grafema, com pictograma; sem texto, sem espaço), usada pela service (autoridade) e pelo front;
  `MensagemDiretaResumoDto.reacoes: ReacaoMensagemDiretaDto[]` (`{ usuarioId, reacao }` (`reacao` é o emoji); sempre presente, vazia quando não há); DTOs `MensagemDiretaReagirDto` (`destinatarioId`, `mensagemId`, `reacao: string | null`,
  `null` remove) e `MensagemDiretaReagidaDto` (`{ mensagemId, reacoes }`); evento do stream `{ tipo: 'REACAO'; conversaId; mensagemId; reacoes; autorUsuarioId; reatorUsuarioId; reacao }`
  (`reacao` é a nova, `null` ao remover). Rota `PUT /mensagem-direta/reacao`. Nomes a conferir com a skill `project20-dto-conventions`.
- **Como as reações chegam às mensagens (a service junta):** a `MensagemDiretaService` lê a página de mensagens do armazenamento e busca as reações dessas mensagens numa **única consulta** (`mensagem_id = ANY(:ids)`)
  ao `MensagemDiretaReacaoRepository`, devolvendo tudo junto. Vale também para a mensagem devolvida no envio e na edição. **Busca e supervisão devolvem `reacoes: []`** (fora de escopo, ver abaixo).

## Backend

- `MensagemDiretaReacaoRepository` (SQL puro): `listarPorMensagens`, `definir` (INSERT … SELECT … RETURNING, UPDATE da troca) e `remover` (soft delete). Todo `SELECT`/`UPDATE` filtra `is_deleted = false`.
- `MensagemDiretaService.reagir`: valida o destinatário (existe, ativo, diferente de quem reage); que a mensagem existe **na conversa** (`recuperarMensagem`) e **não é do sistema**; a reação é um emoji válido (`ehReacaoValida`);
  grava ou remove; publica `REACAO` às **duas pontas** com a lista atualizada. Reagir não mexe em leitura, não lidas, `created_date` nem na ordem.
- Controller fino (`PUT reacao`); regras e permissões na service. Barramento: `REACAO` cabe com folga no limite do `NOTIFY` (a lista tem no máximo duas reações); se passar, vira `SINCRONIZAR` como os demais.

## Frontend

- Menu da mensagem ganha "Reagir" e o botão ao passar o mouse; faixa com os seis atalhos e o "+"; pílulas sob o balão; tratamento do evento `REACAO` (troca as reações da mensagem na conversa) e **o aviso** pelo mesmo
  `decidirAviso` do chat (só para o autor, nunca para si mesmo, nunca ao remover). Análogo visual: o menu de ações e a barra de resposta (tasks 220 e 311) e o cartão de aviso (task 212).
- Seletor de emoji (componente único): painel com categorias; no compositor insere no cursor, na faixa de reações grava a reação. Análogo: o painel de sugestões `@`/`#` do compositor (task 211).

## Testes e verificação

- `shared`: `ehReacaoValida` (emoji simples, com variação, bandeira, família com ZWJ; recusa texto, vazio, dois emojis); DTOs. `backend`: service (reagir, trocar, remover, a mesma de novo, mensagem de outra conversa, do sistema, a própria, evento às duas pontas) e junção das reações
  na página; **integração** do repository (único parcial, soft delete, `ANY(:ids)` vazio). `frontend`: componente (faixa, pílulas, destaque da minha, remover, evento, aviso só ao autor) e seletor (insere no cursor e reage pelo "+").
- Ao vivo (skill `verify`) nos cinco formatos e nos dois temas, com dois usuários em dois navegadores: reagir, trocar, remover, aviso ao autor, tempo real. `npm run lint:tudo`, `npm run repo:verificar`.

## Decisões do autor (2026-11-06)

- **Seletor:** nada de biblioteca. O autor aprovou a lista própria, gerada uma vez da base Unicode CLDR do pacote `emojibase-data` (idioma `pt`, v16.0.3) e guardada em `frontend/.../utils/emoji-catalogo.json` (1.906 emojis em nove categorias, com o nome em português para a busca). Sem as variações de tom de pele e sem letras regionais soltas.
- **Mensagem do sistema:** não recebe reação (a linha central não tem balão). Confirmado.
- **Aviso:** só aviso, "nem como mensagem aparece na conversa". Confirmado.

## Fora de escopo

Reações na busca e na supervisão; reações com imagem ou texto; mais de uma reação por pessoa; histórico de quem reagiu e quando; guardar o aviso na conversa.

## Verificação (2026-11-06)

- **Testes:** `shared` 328 (`ehReacaoValida`: emoji simples, com variação, tom de pele, ZWJ, bandeira, tags e teclado; recusa texto, vazio, dois emojis e excesso; DTO de reagir), `backend` 1686 (service: reagir, trocar, remover pelo mesmo emoji ou `null`,
  reagir à própria mensagem, mensagem do sistema, de outra conversa, inexistente, a pessoa de si mesma, evento às duas pontas, junção das reações na página e na edição; barramento com emoji composto; rota `PUT reacao`), integração 379 (repository: único parcial,
  troca por UPDATE, soft delete e nova linha, `ANY(:ids)` com várias mensagens e vazio; service ponta a ponta com a migration `0083`), `frontend` 2609 em 215 arquivos (seletor, faixa e pílulas, evento em tempo real, aviso só ao autor, emoji no compositor).
  `npm run lint:tudo` limpo; builds do backend e do frontend sem erro.
- **Ao vivo** (Postgres local com a migration `0083`, `CHAT_ARMAZENAMENTO=postgres`, gestor e Thiago em dois navegadores): o Thiago reagiu com ❤️ pelo botão da mensagem; o gestor, com o popup fechado, recebeu o cartão "Thiago Marin reagiu à sua mensagem com ❤️"; ao abrir
  a conversa viu a pílula; o Thiago trocou por 🥳 pelo "+" (busca "festivo") e o gestor viu a troca **sem recarregar** e **sem novo aviso** (conversa à vista); o gestor reagiu à mensagem do Thiago e ele viu; o Thiago removeu a sua pela pílula e a outra ponta atualizou;
  o emoji do compositor entrou no campo. Formatos 1920×1080, 1366×768, 1080×1920, 720×1280 e 960×1080, claro e escuro, com a faixa e com o seletor abertos. Capturas em `.artifacts/314/` (ignorada pelo Git).
- **Limites:** o contrato do OpenSearch e do Elasticsearch **reais** não rodou (as reações não passam por eles: ficam na tabela do PostgreSQL, e a service as junta). O Project Desktop não foi exercitado (a notificação do sistema da reação usa o mesmo caminho da mensagem).
  A busca e a supervisão devolvem `reacoes: []`. O aviso ao autor depende do cliente dele estar conectado ao stream (não há aviso gravado para quem estava offline).
