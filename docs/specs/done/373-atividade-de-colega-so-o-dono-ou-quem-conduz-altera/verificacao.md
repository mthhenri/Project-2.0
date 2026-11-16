# 373, 361, 390, 360 e 405 — Verificação

Segunda frente da guarda-chuva `requisicoes-e-permissoes-correcoes`, de 2026-11-16, depois das seis da `359-.../verificacao.md`. As cinco esperavam decisão do autor, que a deu na mesma data (cada spec tem a seção "Decisão do autor"): **373** (opção 1), **361** (opção 2), **390** (opção 1), **360** (opção 2: o auxiliar só entra no chat onde é membro) e **405** (opção 3: campo novo no detalhe). Contrato (`shared/`) mudou em três pontos, todos decididos pelo autor (ver abaixo).

## O que mudou

- **373:** `AtividadeService.alterar` e `alterarTags` só deixam passar o dono ou quem `podeEditarAtividadeDeOutro` / `podeAtribuirMembroOuTag` (auxiliar, gestor, administrador). Membro da demanda que não é dono recebe 403. Os dois testes que fixavam o comportamento antigo foram trocados.
- **361:** o resumo do canal para o leitor por tipo vem com `ultimaMensagem: null`; `GrupoFixadaService.listarFixadas` devolve lista vazia a esse leitor até haver leitura auditada do dia (`validarLeituraDoDia`), e depois devolve normalmente. Sem mudança de contrato.
- **390:** `ConversaDiretaSupervisaoResumoDto` e `GrupoSupervisaoResumoDto` trocam `ultimaMensagem` por `ultimaMensagemData`; a tela de Supervisão tirou a linha de prévia (e o estilo órfão).
- **360 e 405:** `DemandaDetalheRecuperadoDto` ganha `canalChatExiste` e `podeAbrirCanalChat`; novo `ProjetoDetalheRecuperadoDto` (estende `ProjetoRecuperadoDto` com os mesmos dois campos) é o que `GET /projeto/:id` devolve. Dois métodos novos de repository (`validarCanalDaDemanda`, `validarCanalDoProjeto`). O botão `mensagem-direta-canal-botao` recebe `canalExiste` e `podeAbrir`, não faz nenhuma chamada ao aparecer e some sem permissão; clicar abre (busca o canal) ou cria (idempotente).

## Testes e gates (rodados nesta tarefa)

| Gate | Resultado |
|---|---|
| Backend, unitários | 1830 de 1830 |
| Integração (PostgreSQL local) | 537 de 537; novos: lista da supervisão sem texto, par sem conversa, cursor forjado, fixadas e resumo do canal por tipo, `validarCanalDaDemanda` e `validarCanalDoProjeto` |
| `shared` | 362 de 362 |
| Frontend (Vitest, com `NODE_OPTIONS=--no-experimental-webstorage`, P-087) | 238 arquivos aprovados, inclusive o spec reescrito do botão, o do detalhe da demanda (auxiliar sem permissão) e os da supervisão |
| `npm run lint:tudo`, builds de backend e frontend, `repo:verificar` | sem erro |

## Ao vivo (stack isolado: banco `project20_verify`, backend 3001, `ng serve` 4201; removidos ao fim)

19 de 19 conferências por API: **373** (membro não dono 403 em alterar e tags; dono e auxiliar 200; auxiliar criando "para outro" fica com ele), **360** (auxiliar sem ser membro: `podeAbrirCanalChat` falso na demanda e no projeto; sendo membro, verdadeiro), **405** (gestor verdadeiro; o detalhe passa a dizer `canalChatExiste` depois de criado), **361** (resumo com `ultimaMensagem` nula e sem o texto; fixadas vazias antes de abrir e com 1 item depois), **390** (listas de grupos e de conversas acham pela busca, com data e sem texto).

Na tela: como auxiliar, a demanda em que ele é membro mostra "Criar chat" sem nenhuma chamada a `/mensagem-direta/canal/`; ao selecionar a demanda em que não é membro o botão some, sem 403 e sem chamada ao canal. Como gestor, a lista da Supervisão mostra participantes, hora e "1 mensagem", sem prévia. Layout conferido em 1920×1080 (captura), 960×1080 e 720×1280 (medidas: sem rolagem horizontal). Não percorridos 1366×768 e 1080×1920 nem o tema escuro: a mudança na tela é só a remoção de uma linha.

## Limites

- Não exercitado ao vivo: o botão com o canal já existente (clique em "Abrir chat") e o popup; coberto por teste de componente.
- O frontend, rodando o `ng test` sem o contorno do P-087, falha em quase todos os arquivos por causa do Node 26; é preexistente e não tem relação com estas tasks.
- A leitura por tipo continua auditando só a abertura (`listarMensagens`); `buscarNoGrupo` segue exclusiva de membro.
