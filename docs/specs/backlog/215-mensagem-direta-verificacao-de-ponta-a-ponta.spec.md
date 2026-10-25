# 215-mensagem-direta-verificacao-de-ponta-a-ponta.spec.md

> Task 11/11 da guarda-chuva [`chat-colaboradores.spec.md`](chat-colaboradores.spec.md). Modelagem em
> [`chat-colaboradores/modelagem.md`](chat-colaboradores/modelagem.md) (§7 e §9). Depende de todas as anteriores (209 a 214); fecha a guarda-chuva.

## Objetivo

Provar, no ambiente mais próximo da produção, que o chat entre colaboradores funciona com **várias instâncias da API**, sobrevive a queda do stream e a deploy, e passa a suíte de contrato nas
**três implementações de armazenamento**. É uma task de **verificação**: o código só muda para corrigir o que ela encontrar.

## Entregáveis

1. **Roteiro automatizado ou semiautomatizado** (scripts em `scripts/` ou testes marcados, o que for proporcional) que sobe, num ambiente descartável, **duas instâncias da API** (portas
   diferentes, mesmo PostgreSQL, `CHAT_EVENTOS=postgres`) e dois clientes de stream, e confere: mensagem enviada numa instância chega ao destinatário ligado na outra; `LEITURA` volta ao
   remetente; presença aparece e some; a mensagem da supervisão (214) chega aos dois participantes.
2. **Queda e volta do stream:** derrubar o stream (processo, rede e `SIGTERM` da instância) e comprovar `ENCERRANDO`, reconexão com espera crescente, recuperação das mensagens
   posteriores à última recebida **sem perda e sem duplicata**, e `SINCRONIZAR` após a queda da escuta do `LISTEN/NOTIFY`.
3. **Deploy simulado:** com contêineres (`docker compose`, API, front, PostgreSQL e Elasticsearch), subir a instância nova antes de derrubar a antiga, atrás de um proxy reverso sem buffer
   da resposta e com tempo de leitura maior que o batimento de 25 s; confirmar o tempo de graça do contêiner e que os clientes reconectam sozinhos. Os arquivos de composição ficam onde o projeto já
   os mantém (conferir antes; se não existirem para a API, a task registra a lacuna em vez de inventar a infraestrutura de produção).
4. **Armazenamento:** a suíte de contrato (`ArmazenamentoDeMensagemDireta`) rodada nas três implementações: OpenSearch (desenvolvimento), Elasticsearch (`CHAT_INTEGRACAO=1`) e PostgreSQL
   provisório; a aplicação completa (ao vivo) subida com `CHAT_ARMAZENAMENTO` igual a `opensearch`, `elasticsearch` e `postgres`.
5. **Passada ao vivo com duas pessoas**, cobrindo os critérios da guarda-chuva: enviar, receber em tempo real, "Lida", reenviar mensagem que falhou sem duplicar, buscar por texto e por código,
   mencionar, abrir o cartão de uma demanda; no Desktop, copiar código em outro programa, atalho, escolher a pessoa e enviar, aviso com o Project oculto, silêncio e aviso desligado
   (verificação do Electron real; a 213 já tem a sua parte, aqui se repete com o servidor em duas instâncias).
6. **Relatório** em `docs/specs/<estado>/215-.../verificacao.md` (ao lado da spec), com comandos, resultados, evidências (capturas em `.artifacts/215/`, ignoradas pelo Git) e limites; falhas
   achadas viram correção nesta task ou entrada em `PROBLEMS.md`.
7. **Fecho da guarda-chuva:** conferir os critérios de aceite de `chat-colaboradores.spec.md`, mover a guarda-chuva para `done/` e atualizar `CONTEXT.md`, `HISTORY.md` e `MEMORY.md`.

## Critérios de Aceite

- Duas instâncias da API: a mensagem enviada por uma chega ao destinatário conectado na outra; matar uma instância tira os usuários dela de online nas outras em até ~80 s (tempo da 209);
  `SIGTERM` entrega `ENCERRANDO` e encerra o processo sem travar.
- Stream derrubado reconecta sem perder mensagem (contagem enviada = contagem recebida, sem duplicata), com a faixa de conexão aparecendo e sumindo no popup.
- A suíte de contrato passa nas três implementações; o app sobe e funciona com as três opções de `CHAT_ARMAZENAMENTO`.
- Uma conversa que envolve gestor ou administrador não aparece na supervisão e responde 403 (214) também nesse ambiente.
- Testes completos rodados e relatados à parte dos de falha preexistente: `npm test`, `npm run test:integracao`, `npm run test --workspace=frontend`, `npm run test --workspace=desktop`,
  builds de backend e frontend e `npm run repo:verificar`; a lacuna de lint (P-001) declarada.

## Fora de Escopo

- Escrever infraestrutura de produção (orquestrador, certificados, domínio) e política de backup/snapshot do Elasticsearch (decisão de infraestrutura).
- Teste de carga e de desempenho com volume real; push com o Desktop fechado; mobile.
- Funcionalidades novas: o achado que não for defeito vira `IDEAS.md` ou `PROBLEMS.md`.

## Dependências

`209` a `214` (as anteriores já estão em `done/`, exceto a `214`). Fontes: `modelagem.md` §7 e §9, `docs/SYSTEM.SPEC.md`, skill `verify`, `.env.example` (`CHAT_ARMAZENAMENTO`, `CHAT_EVENTOS`).

## Riscos e Mitigação

- **Ambiente que não reproduz a produção:** registrar no relatório o que foi simulado (por exemplo, proxy local no lugar do proxy real) e o que ficou sem prova.
- **Elasticsearch indisponível localmente:** sem o serviço, a parte dele fica **pendente** e a guarda-chuva não fecha; não se declara sucesso pelo OpenSearch.
- **Mensagens no mesmo milissegundo:** ordem arbitrária porém estável (caso aceito pela guarda-chuva); o roteiro não deve tratá-lo como falha.
- **Dados de teste vazando para o banco de desenvolvimento:** usar bancos, índices e usuários descartáveis e limpá-los ao final.
