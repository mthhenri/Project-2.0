# Plano — volume esperado por vigência

Spec: `../251-projeto-volume-esperado-por-vigencia.spec.md`.

## Decisões de implementação

- Execução direta, testes focados por etapa e revisão independente ao final (SQL e mudança de contrato).
- A service normaliza e escolhe a substituição; o repository oferece transação com trava do projeto para serializar gravações concorrentes. Exclusão confere projeto e vigência juntos.
- A migração usa o mês de `inicio_data`; quando ausente, usa o mês de `created_date`, preservando o volume dos projetos antigos no mês atual.
- O DTO de criação do projeto perde o campo antigo. O formulário cria o projeto e registra a primeira vigência pela API específica no mês de início (ou mês atual se não informado). Se o segundo passo falhar, mantém o projeto criado em edição e oferece nova tentativa, sem duplicá-lo.
- Análogo visual: o próprio diálogo de Projeto (campos/ações), seletor de mês de `projeto-volume` e lista compacta com exclusão do painel de fontes do plano. Rótulos de tempo seguem `VisualizacaoTempoService`.
- Gráfico compartilhado: referência opcional por categoria para desenhar degraus; os consumidores de Custos não passam esse dado e preservam a renderização. A linha constante existente continua válida.

## Impacto

Busca inicial: `npm run impacto -- shared/src/dtos/projeto/ProjetoVolumeResumoDto.ts`, `--simbolo volumeEsperadoHorasMes` e componente `grafico-barras`.

| Consumidor | Classe | Decisão |
|---|---|---|
| DTOs, model, repository e service de projeto | pedido | retirar campo do cadastro; manter esperado mensal nas consultas e vetor anual |
| Formulário, Volume e utilitários de projeto, testes | pedido | API de vigência e resolução por mês |
| Ferramentas da IA de projeto / executor | acompanha | não usam volume; criação continua sem volume inicial |
| Gráfico e testes | pedido | dado opcional por categoria; sem alterar default |
| Custos e utilitário de custos da IA | acompanha | conferir renderização sem referência por categoria |

## Etapas e evidência

- [x] Contratos e regra pura: testes de data válida, normalização, zero, null e valor inválido; DTO exige valor explícito (null permitido).
- [x] Migração 0068, repository e service de vigências; consultas mensal/anual e agrupamento. Integração: duas vigências, mês anterior, exclusão, substituição e concorrência. Aplicar → reverter → aplicar.
- [x] Formulário com bloco próprio, primeira vigência na criação e recuperação de erro. Testes de adicionar, substituir, excluir e estados.
- [x] Gráficos com esperado de cada mês, degraus e quebra nos meses sem volume. Testes de março 160/abril 120, zero e null.
- [x] Suítes dos workspaces afetados, builds, revisão de convenções e independente, aplicação real em 1920×1080, 1366×768 e 1080×1920; documentação e `repo:verificar`.

## Atenção na revisão

Substituição concorrente; valor null não pode ressuscitar vigência anterior; exclusão cruzada entre projetos; resposta atrasada ao trocar de projeto; falha da primeira vigência após criar o projeto.
