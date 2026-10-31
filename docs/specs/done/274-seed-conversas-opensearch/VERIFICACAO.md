# Verificação — 274

## Resultado e escopo
Seed ampliado sem alterar contratos ou regras de chat. CLI de histórico continua criando o cenário SQL e passa a carregar conversas; novo CLI permite carregar somente conversas e, por opção explícita, limpar o OpenSearch local. Preservadas as mudanças anteriores da 273. Sem UI ou migrations novas.

## Impacto
Aplicada a skill gerenciamento-de-impacto antes de reaproveitar mapeamentos e conversores. `npm run impacto` encontrou 7 consumidores/6 testes de mensagem-direta.documento.ts, 5/5 de mensagem-direta-consultas.ts e 8/7 de chat-consultas.ts. Esses arquivos e todos os consumidores existentes permanecem sem alteração: o novo seed importa as mesmas representações no mesmo sentido (documentos de mensagem e mapeamentos). O CLI do seed 273 é o único consumidor cujo comportamento muda, dentro do pedido. As funções semearHistorico e sua integração PostgreSQL permanecem inalteradas.

## Evidências
- Quatro testes focados finais aprovados: destinos/ambientes recusados, fixture determinística de 12 conversas/72 UUIDs, participantes e respostas, código/Markdown, usuários ausentes/tipos/datas incompatíveis e conflitos com participantes antigos.
- Suíte backend completa: 1.576 testes aprovados, zero falhas, 29 suítes. Após a revisão foi acrescentado um quarto teste focado e a validação de documentos conflitantes; os quatro testes focados passaram novamente e o build foi repetido.
- Build backend final aprovado.
- Execução real de `npm run db:seed-conversas --workspace=backend -- --limpar-opensearch` no OpenSearch 2 local em localhost:9200. Antes: mensagem-direta com 43 documentos, chat-mensagem com 249 e chat-conversa com 13. Somente esses índices foram excluídos e recriados com mapeamentos canônicos; nenhum volume ou índice interno foi apagado.
- Conferência posterior com cliente real: 72 mensagens em 12 conversas; chat-mensagem e chat-conversa vazios. Repetição do seed de conversas manteve 72 documentos.
- Repository real: Henrique tem três conversas, e as conversas com Caranguejo e administrador retornam seis mensagens, incluindo respostas. Agregação comprova 12 conversas totais.
- API real localhost:3000: login com contas fictícias, GET mensagem-direta/conversas e GET mensagem-direta/conversa/:usuarioId. Henrique vê 3 conversas; gestor.inicial vê 6; todas as conversas desses usuários devolvem 6 mensagens e nomes resolvidos. Tokens não foram impressos.
- Comando completo `npm run db:seed-historico --workspace=backend` reaplicado com sucesso, sem nova limpeza.
- Revisão independente somente leitura encontrou que aceitar 409 sem conferir conteúdo mascarava IDs PostgreSQL antigos. Corrigido: todo conflito lê o documento e exige igualdade integral com a fixture. Regressão focada aprovada.
- Passe conventions-check: leitura dos novos arquivos e diff de CLI/pacote/README/contexto; SQL parametrizado e com is_deleted=false; nenhuma regra de aplicação duplicada; importações canônicas; nenhuma exclusão no caminho normal. Os casts locais de mapeamento adaptam os mapas canônicos independentes do SDK ao tipo estrito do cliente. git diff --check sem erros, apenas avisos LF/CRLF. Sem lint no projeto (P-001).

## Limites
PostgreSQL e OpenSearch não compartilham transação. Em falha parcial, corrigir e repetir; limpeza explícita é destrutiva e restrita a três índices locais. Datas de conversas se ancoram nos devs históricos; administrador inicial recém-criado pela migration representa o gestor do cenário fictício. Leituras começam sem marcadores (mensagens aparecem não lidas). Não foram semeadas mensagens de IA, menções/referências ou avisos de supervisão. Não houve commit/push. Logs e scripts de conferência locais em `.artifacts/274-seed-conversas-opensearch/`, ignorados pelo Git, não vêm no clone. Nenhuma tela foi alterada; verificação foi pelo armazenamento e pela API reais.
