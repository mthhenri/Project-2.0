# Verificação — task 251

Data: 2026-10-26 (America/Sao_Paulo). Escopo: volume esperado do projeto por vigência, conforme a spec proprietária. Resultado: implementação, testes e verificação local aprovados.

## Implementação e decisões

- Migration `0068`: tabela `projeto_volume_vigencia`, índice único parcial por projeto/mês, checks de valor não negativo e primeiro dia, trigger de auditoria; migra e remove a coluna antiga. Sem início do projeto, usa o mês de criação. Inclui projetos excluídos para preservar eventual restauração. Rollback recompõe a coluna com a vigência ativa mais recente, inclusive null.
- `normalizarVolumeVigencia` valida calendário e inteiro e normaliza o dia; a service decide qual linha substituir. O repository serializa pelo projeto (`FOR UPDATE`) e a exclusão/inserção acontecem na mesma transação. Null é uma vigência efetiva e não faz reaparecer um valor anterior. Excluir uma vigência volta à anterior.
- Mantido `ProjetoVolumeResumoDto.volumeEsperadoHorasMes` para a consulta mensal e `ProjetoVolumeMesDto` para cada linha projeto/mês. Anual agora tem `volumeEsperadoHorasPorMes`, com doze posições. O cadastro do projeto não leva mais volume.
- A spec retira volume de `ProjetoCriarDto` e também pede volume inicial: o formulário cria o projeto e registra a primeira vigência pela API específica, no mês do início (atual se ausente). Se a segunda chamada falha, conserva o projeto em edição; concluir a recuperação emite `aoCriar`, sem duplicar o cadastro. Essa operação da tela tem dois passos, com recuperação explícita.
- O bloco de vigências é um componente próprio, evitando acrescentar listagem e mutações ao diálogo já extenso. Mudanças de volume são salvas pelo botão do bloco (ou Enter nas horas), com texto explicando esse comportamento; o cadastro conserva seu próprio Salvar. Reabrir o diálogo recria o bloco e relê as vigências.
- Análogos: o próprio diálogo de Projeto (controles, densidade e ações), seletor de mês de Volume e lista compacta do painel de fontes do plano. Mesmos componentes PrimeNG, tema e padrão de formulário reativo. No notebook o conteúdo rola dentro do diálogo, mantendo o rodapé acessível; sem transbordamento horizontal do bloco.
- Referência opcional por categoria no gráfico compartilhado desenha os degraus e interrompe no null. O default e a referência constante continuam existentes. Os rótulos usam `formatarTempoExibicao`; a escala permanece em horas.

## Testes e builds

| Comando | Resultado |
|---|---|
| `npm run test --workspace=shared` | 276/276; inclui DTO com null/zero, campo ausente, negativo, fracionário e data impossível |
| `npm run test --workspace=backend` | 1.516/1.516; normalização, substituição na service, propriedade da vigência, agrupamento anual e metadados de permissão/rotas |
| `npm run test:integracao` | 350/350 contra `project20_teste`, PostgreSQL real; inclui repositories alterados e novos |
| `cd backend; node --require ts-node/register --test src/modules/projeto/repositories/projeto-volume-vigencia.repository.integracao.test.ts` | 3/3 na versão final: vigências, índice/checks e aplicar → reverter → aplicar da migration, dentro de transação descartável |
| `ng test --include` em Projetos, gráfico e Custos | 100/100 antes do teste adicional de reabertura |
| `npm run test --workspace=frontend` (rodada final) | 2.219/2.219, 180 arquivos; inclui os três testes de regressão de diálogo |
| `npm run build --workspace=backend` | aprovado |
| `npm run build --workspace=frontend` | aprovado; pacote inicial 990,57 kB |
| `git diff --check` | aprovado |
| `npm run repo:verificar` | organização e espelhos aprovados |

As primeiras execuções restritas de rede e do Vitest falharam por acesso ao banco/arquivos temporários; foram repetidas com o acesso local apropriado e passaram. Não são falhas do produto. O frontend emite avisos de orçamento de bundle/SCSS já existentes e de CommonJS (`extend`); nenhum erro de build. **Não há lint no projeto (P-001)**. P-034/P-036 não falharam nesta rodada; não foram alterados por esta tarefa.

## Aplicação real

Usados os servidores locais já existentes nas portas 3000/4200 e o PostgreSQL local na 5433. A migration foi aplicada no banco de desenvolvimento (lote 26). Browser Use/CUA dirigiu o Chromium do navegador integrado; o principal inspecionou pessoalmente as imagens. Não se usou relato do revisor como evidência visual.

| Recorte | Evidência observada |
|---|---|
| Corte, março/abril de 2026 | Projeto com janeiro 160 h e abril 120 h; 150 h gastas em cada mês: março azul, abril vermelho com contorno. Nenhuma comparação anterior mudou |
| Aumento | Janeiro 80 h, abril 200 h; março 150 h em estouro e abril 150 h na cor do projeto; linha em degraus. Outubro ganhou 250 h no ensaio concorrente |
| Antes da primeira vigência | Projeto Demo migrado com primeira vigência em outubro: sem referência nos meses anteriores |
| Formulário preenchido | Lista com janeiro/abril/outubro, vigente hoje, substituição de outubro por Enter sem fechar; exclusão de outubro volta ao valor de abril |
| Zero e null | Projeto sem volume recebeu zero: lista e vigente mostram `0h`; substituição por Sem volume mostra `sem volume definido`, sem confundir os dois estados |
| Vazio, carregando e erro | Bloco vazio em projeto sem vigências; atraso HTTP controlado mostra carregamento e Salvar volume desabilitado; 503 controlado mostra erro e Recarregar; retirada da falha permite recuperação |
| Três viewports | Formulário e estados, mensal e anual em 1920×1080, 1366×768 e 1080×1920. Rótulos e rodapé acessíveis por rolagem quando necessário |
| Concorrência real | Dois POST simultâneos para o mesmo projeto/mês retornaram sucesso; GET mostrou uma única vigência ativa |
| Permissão real | Login `dev.teste`: GET, POST e DELETE de vigência devolveram 403 |
| Consumidor Custos | Tela de Configurações da IA → Custos inspecionada; gráfico sem referência por categoria conserva a apresentação. Dados locais sem preço, portanto sem valores de custo nas barras; comportamento com valores também coberto pelo teste de componente |

Falhas de carregamento foram injetadas por um proxy **só de verificação**, em `.artifacts/`, na porta 4311. Não há mecanismo de falha nem fixture no código do produto. Os projetos sintéticos usados foram 9 (corte), 10 (aumento) e 11 (vazio/zero/null).

Capturas JPEG e logs estão em `.artifacts/251-projeto-volume-esperado-por-vigencia/`, ignorada pelo Git: `formulario-*`, `mensal-*`, `anual-*`, `carregando-*`, `erro-*`, `vazio-*`, `sem-volume`, `custos`, `cenario-resultado.json` e logs dos comandos. O viewport vertical efetivo foi confirmado por `innerWidth/innerHeight` como 1080×1920; o serviço de captura limita as imagens verticais salvas a 1080×1342. A inspeção incluiu rolagem e os controles do diálogo. **São evidências locais e não vêm no clone.** O texto acima registra os resultados sem depender delas.

Ao terminar, os três projetos sintéticos foram excluídos logicamente e os proxies temporários encerrados, preservando os servidores preexistentes. A evidência anterior à limpeza permanece nos arquivos locais.

## Revisão e impacto

Revisor independente `revisao_251`, modelo GPT-6 Astra, revisão estática de SQL, contratos, permissão e recuperação. Encontrou dois P2: Enter no volume confirmava o cadastro e a recuperação de criação parcial não emitia criação. Ambos foram reproduzidos em testes vermelhos e corrigidos; a suíte final os cobre. Nenhum achado adicional no SQL. Durante a inspeção ao vivo foi encontrado e reproduzido um terceiro defeito: reabrir o mesmo projeto mantinha as vigências antigas; corrigido com teste vermelho → verde.

Mapa inicial e decisões em `plano.md`. Rodados os comandos de impacto para todos os DTOs de cadastro e volume alterados, o símbolo `volumeEsperadoHorasMes` e o gráfico compartilhado. Consumidores de contrato em `projeto.model`, listagem/detalhe, services e controllers acompanham a retirada do campo; não fazem leitura adicional de volume. Ferramentas da IA/executor de criação não usam o campo, sem ferramenta nova. Custos não passa a referência opcional e preserva o default.

Passe `conventions-check`: diff de código, migration e arquivos novos lidos; sem controller com regra, SQL fora de repository, parâmetro primitivo novo de service/repository, regra de domínio duplicada, DTO herdando negócio, HTML bruto, inline style ou cor estrutural fixa nova. Query de cópia de legado inclui excluídos intencionalmente e está comentada na migration. Demais SELECTs novos filtram exclusão lógica; escrita parametrizada, INSERT SELECT e soft delete pelo helper base. Documentação canônica, schema, contexto e espelhos atualizados.

Sem pendência de implementação ou verificação local da spec. Deploy/produção não fazem parte desta execução.
