# 335, 377, 378, 392 e 362 — Verificação

Terceira frente da guarda-chuva `requisicoes-e-permissoes-correcoes`, de 2026-11-16, depois das seis da `359-.../verificacao.md` e das cinco da `373-.../verificacao.md`. As cinco esperavam decisão do autor, que a deu na mesma data (cada spec tem a "Decisão do autor"): **335** (opção 1, com a anotação no código), **377** (opção 2: o dono precisa ter acesso à demanda, e a tela refaz a lista ao trocar o dono), **378** (dono e gestores excluem, só sem nenhuma execução), **392** (opção 1) e **362** (opção 1).

## O que mudou

- **335:** `AtividadeService.listarExecucoesPorAtividade` (frontend) pede `allRows` e devolve da mais nova para a mais antiga; o detalhe guarda a lista inteira, mostra as 5 primeiras e procura a execução aberta na lista toda. O diálogo de encerrar e o de iniciar passam a mostrar as últimas primeiro, e o cabeçalho do encerrar não depende mais de teto. A anotação pedida (ajustar a rota se houver muitas execuções) está no método.
- **377:** `AtividadeService.criar` recusa (400) o dono sem acesso à demanda, quando o gestor escolhe outro dono; novo filtro `DemandaAtribuidaListarDto` (`usuarioId`) em `GET /demanda/atribuidas`, só para gestor e administrador (404 se o usuário não existe), que devolve as demandas que **aquela pessoa** teria. A tela de nova atividade refaz a lista ao trocar o responsável e limpa a demanda que ele não tem. `AtividadeService` ganhou a dependência `UsuarioRepository`.
- **378:** os guards de `DELETE` e `PATCH /restaurar` saíram e a service decide (dono, auxiliar, gestor, administrador); `excluir` recusa (400) atividade com execução registrada, para todos. A lista só oferece "Excluir" com `totalExecucoes` igual a 0 e o desenvolvedor dono ganha o menu ⋮ só com esse item. A ferramenta da IA já tinha a mesma regra.
- **392:** só documentação e teste: o auxiliar conta como desenvolvedor na supervisão (`SYSTEM.SPEC.md`).
- **362:** a leitura da supervisão do grupo livre exclui o que foi escrito antes da saída do último gestor ou administrador (`GrupoRepository.recuperarPrivacidadeEncerradaData`, usado em `lerGrupoSupervisionado`); o cursor some quando há recorte.

## Testes e gates (rodados nesta tarefa)

| Gate | Resultado |
|---|---|
| Backend, unitários | 1837 de 1837 |
| Integração (PostgreSQL local) | 538 de 538; novo: período privado do grupo fora da leitura da supervisão |
| `shared` | 362 de 362 |
| Frontend (Vitest, com `NODE_OPTIONS=--no-experimental-webstorage`, P-087) | 238 arquivos, 2892 testes aprovados; novos: ordem e `allRows` do serviço, 7 execuções com a mais nova aberta no detalhe, refazer demandas ao trocar o dono, menu sem "Excluir" com execução, menu do dono desenvolvedor |
| `npm run lint:tudo`, builds de backend e frontend | sem erro |

## Ao vivo (stack isolado: banco `project20_verify`, backend 3001, `ng serve` 4201; removidos ao fim)

19 de 19 conferências por API (`.artifacts/revisao-permissoes-p0/roteiro3.mjs`): **377** (400 para dono sem acesso; 201 para membro; atribuídas de outro por gestor, 403 para desenvolvedor, 404 para inexistente; auxiliar recebe todas), **378** (403 para não dono; 200 do dono ao excluir e restaurar; 400 com 8 execuções, também para o gestor; `totalExecucoes` 8 na listagem), **335** (8 execuções, a aberta entre elas, pelo `allRows`), **392** (gestor vê a conversa auxiliar-desenvolvedor, auxiliar não supervisiona, auxiliar-gestor é privada), **362** (403 com o gestor no grupo; depois da saída lê só a mensagem nova).

Na tela: como gestor, trocar o responsável da nova atividade para o desenvolvedor B fez a segunda chamada `GET /demanda/atribuidas?usuarioId=3`, limpou a demanda escolhida e deixou só a demanda dele na lista. Como desenvolvedor dono, a atividade sem execução tem o menu ⋮ com "Excluir" e a com 8 execuções não tem menu.

## Limites

- **Visual não conferido:** a janela do navegador embutido não desenhou (as capturas falharam), então os formatos 1920×1080, 1366×768, 1080×1920, 720×1280 e 960×1080 e o tema escuro não foram vistos. A conferência na tela foi por estrutura (DOM e rede). A mudança visual é um item de menu a menos, um menu a mais para o dono e a lista de demandas do diálogo.
- **362:** o recorte vale para a leitura. A lista da supervisão (total, data e a busca por texto) ainda enxerga o histórico inteiro do grupo, porque o armazenamento das mensagens não aceita um recorte por grupo; resolver pede mudar o contrato do armazenamento (decisão do autor).
- **377:** o dono que sai da demanda depois continua alterando a atividade e recebendo 403 ao abri-la (`recuperar` e `listarTags` não mudaram). Fica registrado, não tratado.
- **378:** a ação em massa de excluir da lista segue chamando a rota por atividade; as com execução voltam 400 e entram em "não puderam ser excluídas".
