# requisicoes-e-permissoes-correcoes.spec.md

> Guarda-chuva (tasks **329–426**, todas já com spec própria em `backlog/`). Origem: a revisão de requisições e de permissões pedida pelo autor em 2026-11-13 (`docs/specs/active/revisao-requisicoes-e-permissoes.spec.md`); os achados, a evidência e o que foi medido estão em `docs/specs/active/revisao-requisicoes-e-permissoes/DOSSIE.md`. O autor pediu uma spec por ponto, juntando só os de mesma causa.

## Objetivo

Corrigir, um a um, os pontos que a revisão confirmou: requisições inúteis ou ineficientes do `frontend/` e do `desktop/`, código de requisição sem uso e permissões por tipo de usuário (administrador, gestor, auxiliar e desenvolvedor) que precisam de reforço.

## Entregáveis

1. As 98 tasks da tabela abaixo, cada uma implementada pela própria spec: 5 de severidade alta, 35 média, 50 baixa e 8 informativas.
2. As 35 decisões do autor listadas em "Decisões do autor pendentes", registradas na spec de cada task antes de ela começar.

## Regras para todas as tasks

- **Reproduzir antes de corrigir.** Cada task começa pelo teste (ou pelo roteiro ao vivo) que mostra o achado. Se o achado não se reproduzir no código do dia, a spec vai para `discarded/` com a nota de data e motivo, e o dossiê não é reescrito.
- **Decisão do autor primeiro.** Task marcada com "decisão" não começa antes de o autor escolher a opção; a escolha é registrada na própria spec, numa seção "Decisão do autor", antes de mover para `active/`.
- **Linhas citadas são de 2026-11-13.** O número da linha pode ter mudado; ache o trecho pelo texto.
- **Ordem.** Nenhuma ordem foi decidida: `docs/context/PRIORITIES.md` é do autor. A tabela está agrupada por assunto e, dentro dele, na ordem em que os achados foram curados; a coluna de severidade ajuda a escolher.
- **Permissão é regra de negócio.** Em conflito entre código e `docs/SYSTEM.SPEC.md` §14, o documento vence; quando a spec muda a regra, o documento muda na mesma task.

## Decisões do autor pendentes

| Task | Decisão |
|---|---|
| **330** | Disponibilidade da IA: não consultar a cada 60 s com a aba oculta |
| **333** | Check-in aberto: conferir a situação por evento, não a cada 3 s |
| **334** | Backend: `GET /checkin/situacao` não lista todas as execuções da atividade |
| **335** | Execuções de uma atividade: detalhe e diálogo de encerrar mostram as últimas, não as mais antigas |
| **352** | Gravações do pad e dos textos da demanda: não devolver o texto inteiro |
| **354** | Usuário não inativa nem exclui a si mesmo: a trava também no backend |
| **360** | Canal de demanda e de projeto: definir e aplicar a regra do auxiliar |
| **361** | Canal: o gestor não membro não lê texto de mensagem sem auditoria |
| **362** | Grupo "privado": o que acontece quando o último gestor sai |
| **363** | IA chamada em conversa compartilhada: resposta com dado que nem todo leitor pode ver |
| **366** | Grupo livre: escrever (ou mudar) quem adiciona, quem remove e quem lê o histórico |
| **370** | `POST /assistente/auxiliar-descricao`: identificar quem usa, limitar o tamanho e registrar o custo |
| **371** | Desfazer a criação de demanda pela proposta: exceção escrita ou mesma permissão da exclusão |
| **372** | IA: `consultar_demanda` e `consultar_grafo_do_projeto` para o desenvolvedor |
| **373** | Atividade: desenvolvedor membro da demanda não altera a atividade nem as tags de um colega |
| **377** | Atividade: o dono que não é membro da demanda lê o que consegue alterar |
| **378** | Excluir e restaurar atividade: a rota e a IA com a mesma regra |
| **380** | Mover atividade de demanda: onde existe e entre quais projetos |
| **384** | `GET /demanda` para o desenvolvedor: demandas do projeto acessível ou só as dele? |
| **385** | Demanda: a trava do "último membro" e a demanda que nasce sem membro |
| **386** | Conexão de demandas de projetos diferentes: permitir ou recusar |
| **388** | Desenvolvedor entra sozinho em qualquer demanda do projeto e passa a editar: é a regra? |
| **390** | Supervisão: a lista de conversas não entrega texto de mensagem sem auditoria |
| **392** | Supervisão: a conversa do auxiliar é supervisionável? |
| **393** | Supervisão: conversas antigas de quem deixou de ser gestor |
| **396** | Plano solo de projeto: o criador que perdeu o acesso ao projeto perde o plano |
| **397** | Plano: marcar "solo" não tira gestor e administrador de arquivar e excluir |
| **402** | Plano: trocar a demanda ligada exige o quê sobre a demanda antiga? |
| **403** | Plano arquivado: continua editável e publicável? |
| **405** | Demandas e Projetos: o botão do chat não pergunta ao servidor a cada seleção |
| **412** | Demandas: voltar a uma demanda vista e trocar de modo refazem a carga inteira |
| **414** | Demandas: gravar membros numa requisição só |
| **415** | Chat: o evento `SINCRONIZAR` deixa de ser "relê tudo" |
| **421** | Recurso sem acesso: uma resposta só (404) em todos os módulos |
| **425** | Rotas do backend que nem o front nem o Desktop chamam: manter ou remover |

## Quebra em tasks

### Casca, sessão, check-in e Project Desktop

| Task | Severidade | Área | Entrega | Achados | Decisão |
|---|---|---|---|---|---|
| **329** | Alta | desktop | Project Desktop: conferir o check-in pelo horário sorteado, não a cada 15 s | A-001 | — |
| **330** | Média | frontend/casca | Disponibilidade da IA: não consultar a cada 60 s com a aba oculta | A-002 | pendente |
| **331** | Média | frontend/casca | Execução ativa: foco e volta à aba não disparam consultas repetidas | A-003 | — |
| **332** | Média | frontend/casca | Leituras automáticas da casca não mostram o toast global de erro | A-004 | — |
| **333** | Média | frontend/checkin | Check-in aberto: conferir a situação por evento, não a cada 3 s | A-005 | pendente |
| **334** | Média | backend/checkin | Backend: `GET /checkin/situacao` não lista todas as execuções da atividade | A-006 | pendente |
| **335** | Média | frontend/atividade | Execuções de uma atividade: detalhe e diálogo de encerrar mostram as últimas, não as mais antigas | A-007, A-008 | pendente |
| **336** | Baixa | frontend/checkin | Check-in: a situação mora num sinal só do serviço | A-009, A-010 | — |
| **337** | Baixa | frontend/casca | Login: não pedir `GET /usuario/:id` do usuário que o login acabou de devolver | A-011 | — |
| **338** | Baixa | frontend/casca | `GET /desktop/versao` só quando o menu do perfil é aberto | A-012, A-013 | — |
| **339** | Baixa | frontend/casca | Encerrar execução: não reler `GET /execucao/ativa` quando a resposta já diz o resultado | A-014 | — |
| **340** | Baixa | frontend/casca | Sessão: reconferir o tipo do usuário ao receber 403 | A-015 | — |
| **341** | Baixa | frontend/casca | 401: encerrar a sessão pelo mesmo caminho do logout | A-016 | — |
| **342** | Baixa | frontend/casca | "Desfazer" que falha continua disponível | A-017 | — |
| **343** | Baixa | frontend/casca | Remover código sem uso na casca e no check-in | A-018 | — |

### Usuários, pad e Documentações

| Task | Severidade | Área | Entrega | Achados | Decisão |
|---|---|---|---|---|---|
| **344** | Média | frontend/pad | Pad: encerrar zera o estado, para voltar a gravar e não mostrar o pad de outro usuário | A-019, A-020 | — |
| **345** | Média | frontend/usuario | Usuários: busca e filtro voltam o paginador, aceitam o termo repetido e cancelam a carga anterior | A-021, A-022, A-023 | — |
| **346** | Baixa | frontend/documentacao | Documentações: conflito de versão não mostra também "Erro interno" | A-024 | — |
| **347** | Baixa | frontend/usuario | Usuários: editar usa a resposta do `PUT` em vez de recarregar a lista | A-025, A-026 | — |
| **348** | Baixa | frontend/documentacao | Documentações: carregar o pad só quando ele está à vista | A-027 | — |
| **349** | Baixa | frontend/documentacao | Documentações: abrir a demanda guardada em paralelo com a lista | A-028 | — |
| **350** | Baixa | frontend/documentacao | Documentações: ícones e marcas acompanham o texto recém-gravado | A-029 | — |
| **351** | Baixa | frontend/pad | Pad: reabrir a gaveta com o mesmo pad em memória não mostra esqueleto nem relê na hora | A-030 | — |
| **352** | Baixa | backend/anotacao e demanda | Gravações do pad e dos textos da demanda: não devolver o texto inteiro | A-031 | pendente |
| **353** | Baixa | backend/usuario | `GET /usuario`: `temAnotacoes` mais barato e só para quem pode abrir o pad | A-032, A-033 | — |
| **354** | Baixa | backend/usuario | Usuário não inativa nem exclui a si mesmo: a trava também no backend | A-034 | pendente |
| **355** | Informativo | frontend/usuario | Usuários: `podeEditar` da tela igual à regra do backend | A-035 | — |
| **356** | Informativo | frontend/usuario | Usuários: a linha só sai da lista depois que o `DELETE` responde | A-036 | — |
| **357** | Informativo | frontend/documentacao | Documentações: novo pedido à IA ou troca de demanda cancela o pedido em curso | A-037 | — |
| **358** | Baixa | frontend/usuario | Remover código sem uso em Usuários, pad e Documentações | A-038 | — |

### Permissões: chat em grupo, canais, propostas e ferramentas da IA

| Task | Severidade | Área | Entrega | Achados | Decisão |
|---|---|---|---|---|---|
| **359** | Alta | backend/mensagem-direta | Supervisão do chat: a auditoria e o aviso não dependem do parâmetro `cursor` | A-039, A-040 | — |
| **360** | Média | backend/mensagem-direta e frontend/demanda | Canal de demanda e de projeto: definir e aplicar a regra do auxiliar | A-041 | pendente |
| **361** | Média | backend/mensagem-direta | Canal: o gestor não membro não lê texto de mensagem sem auditoria | A-042 | pendente |
| **362** | Média | backend/mensagem-direta | Grupo "privado": o que acontece quando o último gestor sai | A-043 | pendente |
| **363** | Média | backend/mensagem-direta e chat (plano) | IA chamada em conversa compartilhada: resposta com dado que nem todo leitor pode ver | A-044, A-045, A-046 | pendente |
| **364** | Baixa | backend/mensagem-direta | Testes de permissão por tipo de usuário em grupos, canais e supervisão | A-047, A-048 | — |
| **365** | Baixa | backend/mensagem-direta e proposta-ia | Proposta nascida do resumo do grupo: confirmar e desfazer por um caminho só | A-049 | — |
| **366** | Informativo | backend/mensagem-direta | Grupo livre: escrever (ou mudar) quem adiciona, quem remove e quem lê o histórico | A-050 | pendente |
| **367** | Alta | backend/atividade | IA: propor criar e mover atividade conferem o acesso à demanda antes de ler | A-051, A-052, A-053 | — |
| **368** | Média | backend/proposta-ia | Proposta da IA: ajuste que falha não deixa os dados do cliente gravados | A-054 | — |
| **369** | Baixa | backend/plano | Proposta de trecho do plano: recusar exige poder editar a aba | A-055 | — |
| **370** | Média | backend/assistente | `POST /assistente/auxiliar-descricao`: identificar quem usa, limitar o tamanho e registrar o custo | A-056 | pendente |
| **371** | Baixa | backend/demanda | Desfazer a criação de demanda pela proposta: exceção escrita ou mesma permissão da exclusão | A-057, A-058 | pendente |
| **372** | Baixa | backend/demanda | IA: `consultar_demanda` e `consultar_grafo_do_projeto` para o desenvolvedor | A-059 | pendente |

### Permissões: demanda, atividade e execução

| Task | Severidade | Área | Entrega | Achados | Decisão |
|---|---|---|---|---|---|
| **373** | Alta | backend/atividade | Atividade: desenvolvedor membro da demanda não altera a atividade nem as tags de um colega | A-060 | pendente |
| **374** | Alta | backend/execucao | `PUT /execucao/:id` não reabre nem move execução criando duas ativas ou sobreposição | A-061 | — |
| **375** | Média | backend/execucao | Execução: conferir a permissão antes de responder regra de negócio | A-062 | — |
| **376** | Média | backend/atividade | `POST /atividade`: recusar dono que o tipo não pode escolher e validar o dono informado | A-063 | — |
| **377** | Média | backend/atividade | Atividade: o dono que não é membro da demanda lê o que consegue alterar | A-064 | pendente |
| **378** | Média | backend/atividade | Excluir e restaurar atividade: a rota e a IA com a mesma regra | A-065 | pendente |
| **379** | Baixa | backend/execucao | Execução: registrar e excluir conferem a permissão na service, não só no decorador | A-066 | — |
| **380** | Baixa | backend/atividade | Mover atividade de demanda: onde existe e entre quais projetos | A-067 | pendente |
| **381** | Média | backend/demanda | Demanda: a API não aceita gestor, administrador nem usuário inativo como membro | A-068 | — |
| **382** | Média | backend/demanda | `PUT /demanda/:id`: mover para pai não estrutural é recusado na service | A-069 | — |
| **383** | Baixa | backend/demanda | Demanda: o pai informado é lido com o acesso do usuário | A-070 | — |
| **384** | Baixa | backend/demanda | `GET /demanda` para o desenvolvedor: demandas do projeto acessível ou só as dele? | A-071 | pendente |
| **385** | Baixa | backend/demanda | Demanda: a trava do "último membro" e a demanda que nasce sem membro | A-072 | pendente |
| **386** | Baixa | backend/demanda | Conexão de demandas de projetos diferentes: permitir ou recusar | A-073 | pendente |
| **387** | Baixa | backend/demanda | IA: propostas de concluir, alterar e descrever demanda recusam na hora quem não pode editar | A-074 | — |
| **388** | Informativo | backend/demanda | Desenvolvedor entra sozinho em qualquer demanda do projeto e passa a editar: é a regra? | A-075 | pendente |
| **389** | Baixa | backend/demanda | Demanda: testes das regras de permissão por tipo de usuário | A-076 | — |

### Permissões: supervisão do chat e plano

| Task | Severidade | Área | Entrega | Achados | Decisão |
|---|---|---|---|---|---|
| **390** | Média | backend/mensagem-direta | Supervisão: a lista de conversas não entrega texto de mensagem sem auditoria | A-077 | pendente |
| **391** | Média | backend/mensagem-direta | Supervisão: abrir um par que nunca conversou não grava auditoria nem cria conversa | A-078 | — |
| **392** | Média | backend/mensagem-direta | Supervisão: a conversa do auxiliar é supervisionável? | A-079 | pendente |
| **393** | Baixa | backend/mensagem-direta | Supervisão: conversas antigas de quem deixou de ser gestor | A-080 | pendente |
| **394** | Baixa | backend/mensagem-direta | Referência `#` no chat: demanda e atividade com a mesma regra de acesso | A-081 | — |
| **395** | Baixa | backend/mensagem-direta | Proposta do `@IA` numa conversa: quem tem visão total não vê proposta de tipos pessoais | A-082 | — |
| **396** | Média | backend/plano | Plano solo de projeto: o criador que perdeu o acesso ao projeto perde o plano | A-083 | pendente |
| **397** | Média | backend/plano | Plano: marcar "solo" não tira gestor e administrador de arquivar e excluir | A-084 | pendente |
| **398** | Média | backend/plano e chat | IA no plano: as ferramentas só agem no plano da conversa aberta | A-085 | — |
| **399** | Baixa | backend/plano | Publicar plano na demanda: conferir a permissão de editar antes das outras respostas | A-086 | — |
| **400** | Baixa | docs e backend/plano | Plano: escrever as regras de permissão no `SYSTEM.SPEC.md` e tirar a sobra da regra antiga | A-087, A-088 | — |
| **401** | Baixa | backend/plano | Plano: testes de permissão com auxiliar e casos de borda de acesso | A-089 | — |
| **402** | Informativo | backend/plano | Plano: trocar a demanda ligada exige o quê sobre a demanda antiga? | A-090 | pendente |
| **403** | Informativo | backend/plano | Plano arquivado: continua editável e publicável? | A-091 | pendente |

### Tela de Demandas

| Task | Severidade | Área | Entrega | Achados | Decisão |
|---|---|---|---|---|---|
| **404** | Média | frontend/demanda | Demandas: excluir não pede a demanda excluída e desfazer traz a demanda de volta à tela | A-092, A-093 | — |
| **405** | Média | frontend/demanda e mensagem-direta | Demandas e Projetos: o botão do chat não pergunta ao servidor a cada seleção | A-094, A-095 | pendente |
| **406** | Média | frontend/demanda | Demandas: tirar `GET /demanda/:id/arvore` da seleção (a resposta não é usada) | A-096 | — |
| **407** | Média | frontend/demanda | Demandas: estimativa e previsão editadas na linha só avisam a página depois do `PUT` | A-097 | — |
| **408** | Média | frontend/demanda | Demandas: salvar a edição faz uma releitura só, e ela atualiza tags e membros | A-098, A-099 | — |
| **409** | Média | frontend/demanda | Demandas: alteração que não muda a estrutura não recarrega o grafo do projeto | A-100 | — |
| **410** | Média | frontend/demanda | Demandas: os destinos de "Conectar" vêm do grafo já carregado | A-101 | — |
| **411** | Média | frontend/demanda | Demandas: trocar de demanda cancela a carga da anterior | A-102 | — |
| **412** | Baixa | frontend/demanda | Demandas: voltar a uma demanda vista e trocar de modo refazem a carga inteira | A-103 | pendente |
| **413** | Baixa | frontend/demanda | Demandas: diálogos de edição e de tags com menos leituras | A-104 | — |
| **414** | Baixa | backend/demanda e frontend/demanda | Demandas: gravar membros numa requisição só | A-105 | pendente |

### Chat entre colegas (tráfego)

| Task | Severidade | Área | Entrega | Achados | Decisão |
|---|---|---|---|---|---|
| **415** | Média | frontend/mensagem-direta e backend/mensagem-direta | Chat: o evento `SINCRONIZAR` deixa de ser "relê tudo" | A-106, A-107, A-108 | pendente |
| **416** | Baixa | frontend/mensagem-direta | Chat: abrir conversa ou grupo sem não lidas não envia `PUT` de leitura | A-109 | — |
| **417** | Baixa | frontend/mensagem-direta | Chat: primeira mensagem e "Criar chat" atualizam a lista pela resposta, sem recarregá-la | A-110, A-111 | — |
| **418** | Baixa | frontend/mensagem-direta | Chat: `GET /mensagem-direta/pessoas` não se repete a cada diálogo | A-112 | — |
| **419** | Baixa | frontend/mensagem-direta | Chat: abrir um grupo pede mensagens e fixadas em paralelo | A-113 | — |
| **420** | Baixa | frontend/mensagem-direta | Chat: propostas da IA numa conversa não são pedidas de novo a cada reabertura | A-114 | — |

### Transversais

| Task | Severidade | Área | Entrega | Achados | Decisão |
|---|---|---|---|---|---|
| **421** | Baixa | backend (vários módulos) | Recurso sem acesso: uma resposta só (404) em todos os módulos | A-115, A-116, A-117, A-118, A-119 | pendente |
| **422** | Baixa | backend (mensagem-direta, chat e plano) | Tipo de usuário: tirar as comparações diretas e a lista de "poder de gestor" repetida | A-120, A-121, A-122, A-123 | — |
| **423** | Baixa | backend/demanda, atividade e execucao | Escritas decididas pela função de permissão da ação, não por `temVisibilidadeTotal` | A-124, A-125 | — |
| **424** | Baixa | docs e backend (Swagger, comentários, ferramentas da IA) | Atualizar os textos "somente gestor" onde o auxiliar também pode | A-126, A-127, A-128 | — |
| **425** | Informativo | backend (anotacao, checkin, calendario, demanda) | Rotas do backend que nem o front nem o Desktop chamam: manter ou remover | A-129, A-130 | pendente |
| **426** | Baixa | frontend (atividade, calendario, demanda, execucao, mensagem-direta) | Remover os métodos de requisição do front que ninguém chama | A-131, A-132, A-133 | — |

## Critérios de Aceite

- Cada task fecha pelos critérios da própria spec, com os gates do projeto (testes e build dos workspaces tocados, `npm run lint:tudo`, verificação ao vivo quando há mudança observável).
- A guarda-chuva fecha quando todas as tasks estiverem em `done/` ou em `discarded/` com a nota.

## Fora de Escopo

O que o dossiê registrou sem spec (seção "Achados sem spec"), desempenho de SQL sob carga e qualquer mudança de modelagem que o autor não tenha decidido.

## Dependências

O dossiê `docs/specs/active/revisao-requisicoes-e-permissoes/DOSSIE.md` e os dois anexos dele; `docs/SYSTEM.SPEC.md` §11, §12 e §14; a decisão viva "menos requisições nas telas" (tasks 320–325). As dependências entre tasks estão na seção "Dependências" de cada spec.

