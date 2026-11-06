# 316 — Cor da bolinha escolhida pela pessoa

> Pedido do autor em 2026-11-06 ("a cor da bolinha antes do `@IA`"). Task da guarda-chuva `chat-colaboradores-evolucao.spec.md`.
> Decisões do autor (2026-11-06): a cor é **do usuário** (a pessoa escolhe a própria; o **gestor pode alterar a de qualquer usuário**) e a escolha é **livre** (qualquer cor, não uma paleta).
> Modelagem confirmada pelo autor (2026-11-06): coluna em `usuario`, sem tempo real, gestor só pela tela de Usuários, escolha da própria cor no perfil. **Estado: feita em 2026-11-06.**

## O que muda para o usuário

- Hoje toda bolinha (avatar com iniciais) tem a mesma cor de acento (`--app-avatar-fundo`/`--app-avatar-cor`). Depois: cada pessoa pode ter a **sua cor**, e todo mundo que a vê no chat a vê com ela.
- **Escolher a própria cor:** no **perfil**, o popover da barra de cima (nome, tipo, "Tempos em dias", tema personalizado), entra a seção **"Minha cor"**: seletor de cor livre, prévia da bolinha com as iniciais
  e "Voltar à cor padrão". Análogo: o seletor do "Tema personalizado" que já vive nesse popover. A tela de configurações do chat **não** ganha a seção.
- **Gestor altera a de outro usuário:** só pela **tela de Usuários** (diálogo de edição, `usuario-formulario-dialog`). Não há atalho dentro do chat. Desenvolvedor só altera a própria, pelo perfil.
- **Sem cor escolhida:** continua a cor de acento de hoje.
- **Onde aparece nesta task (só o chat entre colaboradores):** lista de conversas, barra de bolinhas, cabeçalho e linhas da conversa, aviso (cartão), supervisão, seletor "Para" e cartão de referência. Os demais
  avatares do sistema ficam para a task **319**.
- **Sem tempo real:** a cor nova aparece na próxima carga (F5 ou reabrir o chat). Não há evento no stream.
- **Contraste:** o texto das iniciais é calculado pela luminância da cor escolhida (claro sobre fundo escuro, escuro sobre fundo claro), nos temas claro e escuro. No escuro o fundo escolhido vale como está.

## Modelagem (confirmada pelo autor em 2026-11-06)

Antes: nenhuma coluna guarda cor; o avatar usa tokens fixos. Depois:

- Coluna **`cor_avatar`** (`VARCHAR(7)`, anulável) em **`usuario`**: hexadecimal `#RRGGBB` em maiúsculas; `NULL` = cor padrão. Migration **0084** (sem DEFAULT, sem trigger; usuários existentes ficam sem valor).
  O nome não amarra a coluna ao chat, pois a 319 a usa nos demais avatares.
- `shared`: regra pura `ehCorValida` (`^#[0-9A-F]{6}$` após normalizar) e `corDoTextoSobre(cor)` (luminância relativa → `#FFFFFF` ou `#111827`), com teste. `UsuarioAlterarDto`/`UsuarioInternoAlterarDto` ganham
  `corAvatar?: string | null`; `UsuarioRecuperadoDto` e `UsuarioAlteradoDto` devolvem o campo.
- Contratos do chat: `MensagemDiretaPessoaResumoDto`, `ConversaDiretaResumoDto` e `MensagemDiretaSupervisaoParticipanteDto` ganham `corAvatar: string | null`; as mensagens, autor e destinatário. O contrato de
  armazenamento (PostgreSQL, OpenSearch, Elasticsearch) **não muda**: a service junta a cor a partir de `usuario`, no molde das reações (`juntarReacoes`); nada é gravado na mensagem.
- Rota da própria pessoa: `PUT /usuario/cor` (`UsuarioCorAlterarDto { corAvatar: string | null }`), porque `PUT /usuario/:id` é de gestor; grava só a coluna do próprio usuário. O gestor usa o `PUT /usuario/:id`.
  Ambas passam por `ehCorValida`. A rota fica no módulo de usuário, pois a cor é do usuário.

## Implementação

Backend: migration 0084, `UsuarioRepository`, `UsuarioService` (alterar e a cor própria), junção da cor nas listas, conversa, pessoas e supervisão do chat; `docs/SCHEMA.md`. `shared`: regras e DTOs.
Frontend: `app-mensagem-direta-avatar` recebe `cor` e aplica fundo e texto por variável CSS ligada ao elemento (`[style.--…]`, sem `style=""` literal); seção "Minha cor" no popover do perfil; campo no
diálogo de edição de usuário; sessão (`UsuarioSessaoService`) guarda a cor do próprio usuário.

## Testes e verificação

`shared` (`ehCorValida`, `corDoTextoSobre`), `backend` (service: valida cor, só gestor altera a de outro, a própria sempre; junção nas listas), integração do repository, `frontend` (avatar com e sem cor, contraste,
seção do perfil grava e restaura o padrão, diálogo do gestor). Ao vivo nos cinco formatos e dois temas, com duas pessoas de cores diferentes. `npm run lint:tudo`, `npm run repo:verificar`.

## Fora de escopo

Cor por contato, paleta fixa, tempo real, avatares fora do chat (task 319), foto de perfil.

## Verificação (2026-11-06)

- **Testes:** `shared` 332 (4 novos: regra e contraste da cor), `backend` 1691, integração `npm run test:integracao` 381 (repository: nasce sem cor, `alterarCor`, `alterar` do gestor, e as leituras do chat devolvem a cor;
  Postgres 16 local, migration 0084 aplicada), `frontend` 2621 (novos: avatar com e sem cor e contraste, seletor, perfil "Minha cor", diálogo do gestor, barra). `npm run lint:tudo` limpo; builds sem erro.
- **Ao vivo** (Postgres local, `CHAT_ARMAZENAMENTO=postgres`): cor inválida recusada; desenvolvedor grava a própria (`#fde047` vira `#FDE047`); gestor pinta outra pessoa; desenvolvedor não pinta ninguém além de si
  (403 da service); a lista de conversas do gestor mostra Thiago em amarelo com iniciais escuras e Camila em azul com iniciais claras, nos cinco formatos e nos dois temas; o popover do perfil traz "Minha cor" com a
  cor atual, "Voltar à cor padrão" e "Aplicar" (gravou `null`); o diálogo de edição do gestor abre com a cor da pessoa. Capturas em `.artifacts/316/` (ignorada pelo Git).
- **Decisões do autor na sessão:** coluna em `usuario`; sem tempo real (vale no F5); gestor só pela tela de Usuários; a própria cor no perfil, não nas configurações do chat; demais avatares na task 319.
- **Também nesta entrega (pedido do autor, avulso):** o chat entre colegas ganhou o ícone de envelope (botão da barra de cima, estado vazio da lista e da supervisão); o Chat da IA mantém o balão (`pi-comments`).
- **Limites:** o login devolve o usuário sem a cor, que chega no `atualizarSessao` (P-062); o Project Desktop e o contrato real de OpenSearch/Elasticsearch não foram exercitados (a cor vem de `usuario`, não do armazenamento). A
  formatação do SQL de três arquivos da 314 estava fora do padrão e foi corrigida junto.
