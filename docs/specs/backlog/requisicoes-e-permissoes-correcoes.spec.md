# requisicoes-e-permissoes-correcoes.spec.md

> Guarda-chuva (tasks **329–463**, todas já com spec própria em `backlog/`). Origem: a revisão de requisições e de permissões pedida pelo autor em 2026-11-13 (`docs/specs/active/revisao-requisicoes-e-permissoes.spec.md`); os achados, a evidência e o que foi medido estão em `docs/specs/active/revisao-requisicoes-e-permissoes/DOSSIE.md`. O autor pediu uma spec por ponto, juntando só os de mesma causa.

## Objetivo

Corrigir, um a um, os pontos que a revisão confirmou: requisições inúteis ou ineficientes do `frontend/` e do `desktop/`, código de requisição sem uso e permissões por tipo de usuário (administrador, gestor, auxiliar e desenvolvedor) que precisam de reforço.

## Entregáveis

1. As 135 tasks da tabela abaixo, cada uma implementada pela própria spec: 6 de severidade alta, 48 média, 70 baixa e 11 informativas.
2. As 51 decisões do autor listadas em "Decisões do autor pendentes", registradas na spec de cada task antes de ela começar.

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
| **421** | Login: limitar tentativas |
| **423** | Troca de senha: os tokens emitidos antes deixam de valer |
| **424** | Senha: quem troca a de quem, e com qual confirmação |
| **425** | `GET /usuario`: o que o auxiliar recebe de cada usuário |
| **426** | Pad: o gestor lê o pad de outro; e escreve? |
| **428** | Promover a gestor: o que fazer com as demandas e a execução ativa do usuário |
| **430** | Calendário: a leitura dos dias não úteis é aberta a todos? |
| **431** | Custo estimado do resumo do grupo mostra o preço do modelo a qualquer membro |
| **433** | Ativar ou restaurar prompt e alterar preço: registrar qual administrador fez |
| **434** | Custos da IA: o documento e o teste de prompt |
| **435** | Atividades: ação em massa numa requisição só |
| **436** | Seletores de usuário ativo: reaproveitar o catálogo em memória |
| **442** | Detalhe da atividade: as tags na mesma resposta |
| **443** | Ponto: o diálogo de justificativa não pede o usuário inteiro só pela jornada |
| **447** | Volume dentro do projeto: pedir só o volume daquele projeto |
| **449** | Tags: excluir selecionadas e desfazer numa requisição só |
| **454** | Recurso sem acesso: uma resposta só (404) em todos os módulos |
| **458** | Rotas do backend que nem o front nem o Desktop chamam: manter ou remover |

## Quebra em tasks

### Casca, sessão, check-in e Project Desktop

| Task | Severidade | Área | Entrega | Achados | Decisão |
|---|---|---|---|---|---|
| **329** | Alta | desktop | Project Desktop: conferir o check-in pelo horário sorteado, não a cada 15 s | A-001 | — |
| **330** | Média | frontend/casca | Disponibilidade da IA: não consultar a cada 60 s com a aba oculta | A-002 | pendente |
| **331** | Média | frontend/casca | Execução ativa: foco e volta à aba não disparam consultas repetidas | A-003, A-004 | — |
| **332** | Média | frontend/casca | Leituras automáticas da casca não mostram o toast global de erro | A-005 | — |
| **333** | Média | frontend/checkin | Check-in aberto: conferir a situação por evento, não a cada 3 s | A-006 | pendente |
| **334** | Média | backend/checkin | Backend: `GET /checkin/situacao` não lista todas as execuções da atividade | A-007 | pendente |
| **335** | Alta | frontend/atividade | Execuções de uma atividade: detalhe e diálogo de encerrar mostram as últimas, não as mais antigas | A-008, A-009, A-010, A-011 | pendente |
| **336** | Baixa | frontend/checkin | Check-in: a situação mora num sinal só do serviço | A-012, A-013 | — |
| **337** | Baixa | frontend/casca | Login: não pedir `GET /usuario/:id` do usuário que o login acabou de devolver | A-014 | — |
| **338** | Baixa | frontend/casca | `GET /desktop/versao` só quando o menu do perfil é aberto | A-015, A-016 | — |
| **339** | Baixa | frontend/casca | Encerrar execução: não reler `GET /execucao/ativa` quando a resposta já diz o resultado | A-017 | — |
| **340** | Baixa | frontend/casca | Sessão: reconferir o tipo do usuário ao receber 403 | A-018 | — |
| **341** | Baixa | frontend/casca | 401: encerrar a sessão pelo mesmo caminho do logout | A-019 | — |
| **342** | Baixa | frontend/casca | "Desfazer" que falha continua disponível | A-020 | — |
| **343** | Baixa | frontend/casca | Remover código sem uso na casca e no check-in | A-021 | — |

### Usuários, pad e Documentações

| Task | Severidade | Área | Entrega | Achados | Decisão |
|---|---|---|---|---|---|
| **344** | Média | frontend/pad | Pad: encerrar zera o estado, para voltar a gravar e não mostrar o pad de outro usuário | A-022, A-023 | — |
| **345** | Média | frontend/usuario | Usuários: busca e filtro voltam o paginador, aceitam o termo repetido e cancelam a carga anterior | A-024, A-025, A-026 | — |
| **346** | Baixa | frontend/documentacao | Documentações: conflito de versão não mostra também "Erro interno" | A-027 | — |
| **347** | Baixa | frontend/usuario | Usuários: editar usa a resposta do `PUT` em vez de recarregar a lista | A-028, A-029 | — |
| **348** | Baixa | frontend/documentacao | Documentações: carregar o pad só quando ele está à vista | A-030 | — |
| **349** | Baixa | frontend/documentacao | Documentações: abrir a demanda guardada em paralelo com a lista | A-031 | — |
| **350** | Baixa | frontend/documentacao | Documentações: ícones e marcas acompanham o texto recém-gravado | A-032 | — |
| **351** | Baixa | frontend/pad | Pad: reabrir a gaveta com o mesmo pad em memória não mostra esqueleto nem relê na hora | A-033 | — |
| **352** | Baixa | backend/anotacao e demanda | Gravações do pad e dos textos da demanda: não devolver o texto inteiro | A-034 | pendente |
| **353** | Baixa | backend/usuario | `GET /usuario`: `temAnotacoes` mais barato e só para quem pode abrir o pad | A-035, A-036 | — |
| **354** | Baixa | backend/usuario | Usuário não inativa nem exclui a si mesmo: a trava também no backend | A-037, A-038 | pendente |
| **355** | Informativo | frontend/usuario | Usuários: `podeEditar` da tela igual à regra do backend | A-039 | — |
| **356** | Informativo | frontend/usuario | Usuários: a linha só sai da lista depois que o `DELETE` responde | A-040 | — |
| **357** | Informativo | frontend/documentacao | Documentações: novo pedido à IA ou troca de demanda cancela o pedido em curso | A-041 | — |
| **358** | Baixa | frontend/usuario | Remover código sem uso em Usuários, pad e Documentações | A-042 | — |

### Permissões: chat em grupo, canais, propostas e ferramentas da IA

| Task | Severidade | Área | Entrega | Achados | Decisão |
|---|---|---|---|---|---|
| **359** | Alta | backend/mensagem-direta | Supervisão do chat: a auditoria e o aviso não dependem do parâmetro `cursor` | A-043, A-044 | — |
| **360** | Média | backend/mensagem-direta e frontend/demanda | Canal de demanda e de projeto: definir e aplicar a regra do auxiliar | A-045 | pendente |
| **361** | Média | backend/mensagem-direta | Canal: o gestor não membro não lê texto de mensagem sem auditoria | A-046 | pendente |
| **362** | Média | backend/mensagem-direta | Grupo "privado": o que acontece quando o último gestor sai | A-047 | pendente |
| **363** | Média | backend/mensagem-direta e chat (plano) | IA chamada em conversa compartilhada: resposta com dado que nem todo leitor pode ver | A-048, A-049, A-050 | pendente |
| **364** | Baixa | backend/mensagem-direta | Testes de permissão por tipo de usuário em grupos, canais e supervisão | A-051, A-052 | — |
| **365** | Baixa | backend/mensagem-direta e proposta-ia | Proposta nascida do resumo do grupo: confirmar e desfazer por um caminho só | A-053 | — |
| **366** | Informativo | backend/mensagem-direta | Grupo livre: escrever (ou mudar) quem adiciona, quem remove e quem lê o histórico | A-054 | pendente |
| **367** | Alta | backend/atividade | IA: propor criar e mover atividade conferem o acesso à demanda antes de ler | A-055, A-056, A-057 | — |
| **368** | Média | backend/proposta-ia | Proposta da IA: ajuste que falha não deixa os dados do cliente gravados | A-058 | — |
| **369** | Baixa | backend/plano | Proposta de trecho do plano: recusar exige poder editar a aba | A-059 | — |
| **370** | Média | backend/assistente | `POST /assistente/auxiliar-descricao`: identificar quem usa, limitar o tamanho e registrar o custo | A-060 | pendente |
| **371** | Baixa | backend/demanda | Desfazer a criação de demanda pela proposta: exceção escrita ou mesma permissão da exclusão | A-061, A-062 | pendente |
| **372** | Baixa | backend/demanda | IA: `consultar_demanda` e `consultar_grafo_do_projeto` para o desenvolvedor | A-063 | pendente |

### Permissões: demanda, atividade e execução

| Task | Severidade | Área | Entrega | Achados | Decisão |
|---|---|---|---|---|---|
| **373** | Alta | backend/atividade | Atividade: desenvolvedor membro da demanda não altera a atividade nem as tags de um colega | A-064 | pendente |
| **374** | Alta | backend/execucao | `PUT /execucao/:id` não reabre nem move execução criando duas ativas ou sobreposição | A-065 | — |
| **375** | Média | backend/execucao | Execução: conferir a permissão antes de responder regra de negócio | A-066 | — |
| **376** | Média | backend/atividade | `POST /atividade`: recusar dono que o tipo não pode escolher e validar o dono informado | A-067 | — |
| **377** | Média | backend/atividade | Atividade: o dono que não é membro da demanda lê o que consegue alterar | A-068 | pendente |
| **378** | Média | backend/atividade | Excluir e restaurar atividade: a rota e a IA com a mesma regra | A-069 | pendente |
| **379** | Baixa | backend/execucao | Execução: registrar e excluir conferem a permissão na service, não só no decorador | A-070 | — |
| **380** | Baixa | backend/atividade | Mover atividade de demanda: onde existe e entre quais projetos | A-071 | pendente |
| **381** | Média | backend/demanda | Demanda: a API não aceita gestor, administrador nem usuário inativo como membro | A-072 | — |
| **382** | Média | backend/demanda | `PUT /demanda/:id`: mover para pai não estrutural é recusado na service | A-073 | — |
| **383** | Baixa | backend/demanda | Demanda: o pai informado é lido com o acesso do usuário | A-074 | — |
| **384** | Baixa | backend/demanda | `GET /demanda` para o desenvolvedor: demandas do projeto acessível ou só as dele? | A-075 | pendente |
| **385** | Baixa | backend/demanda | Demanda: a trava do "último membro" e a demanda que nasce sem membro | A-076 | pendente |
| **386** | Baixa | backend/demanda | Conexão de demandas de projetos diferentes: permitir ou recusar | A-077 | pendente |
| **387** | Baixa | backend/demanda | IA: propostas de concluir, alterar e descrever demanda recusam na hora quem não pode editar | A-078 | — |
| **388** | Informativo | backend/demanda | Desenvolvedor entra sozinho em qualquer demanda do projeto e passa a editar: é a regra? | A-079 | pendente |
| **389** | Baixa | backend/demanda | Demanda: testes das regras de permissão por tipo de usuário | A-080 | — |

### Permissões: supervisão do chat e plano

| Task | Severidade | Área | Entrega | Achados | Decisão |
|---|---|---|---|---|---|
| **390** | Média | backend/mensagem-direta | Supervisão: a lista de conversas não entrega texto de mensagem sem auditoria | A-081 | pendente |
| **391** | Média | backend/mensagem-direta | Supervisão: abrir um par que nunca conversou não grava auditoria nem cria conversa | A-082 | — |
| **392** | Média | backend/mensagem-direta | Supervisão: a conversa do auxiliar é supervisionável? | A-083 | pendente |
| **393** | Baixa | backend/mensagem-direta | Supervisão: conversas antigas de quem deixou de ser gestor | A-084 | pendente |
| **394** | Baixa | backend/mensagem-direta | Referência `#` no chat: demanda e atividade com a mesma regra de acesso | A-085 | — |
| **395** | Baixa | backend/mensagem-direta | Proposta do `@IA` numa conversa: quem tem visão total não vê proposta de tipos pessoais | A-086 | — |
| **396** | Média | backend/plano | Plano solo de projeto: o criador que perdeu o acesso ao projeto perde o plano | A-087 | pendente |
| **397** | Média | backend/plano | Plano: marcar "solo" não tira gestor e administrador de arquivar e excluir | A-088 | pendente |
| **398** | Média | backend/plano e chat | IA no plano: as ferramentas só agem no plano da conversa aberta | A-089 | — |
| **399** | Baixa | backend/plano | Publicar plano na demanda: conferir a permissão de editar antes das outras respostas | A-090 | — |
| **400** | Baixa | docs e backend/plano | Plano: escrever as regras de permissão no `SYSTEM.SPEC.md` e tirar a sobra da regra antiga | A-091, A-092 | — |
| **401** | Baixa | backend/plano | Plano: testes de permissão com auxiliar e casos de borda de acesso | A-093 | — |
| **402** | Informativo | backend/plano | Plano: trocar a demanda ligada exige o quê sobre a demanda antiga? | A-094 | pendente |
| **403** | Informativo | backend/plano | Plano arquivado: continua editável e publicável? | A-095 | pendente |

### Tela de Demandas

| Task | Severidade | Área | Entrega | Achados | Decisão |
|---|---|---|---|---|---|
| **404** | Média | frontend/demanda | Demandas: excluir não pede a demanda excluída e desfazer traz a demanda de volta à tela | A-096, A-097 | — |
| **405** | Média | frontend/demanda e mensagem-direta | Demandas e Projetos: o botão do chat não pergunta ao servidor a cada seleção | A-098, A-099 | pendente |
| **406** | Média | frontend/demanda | Demandas: tirar `GET /demanda/:id/arvore` da seleção (a resposta não é usada) | A-100 | — |
| **407** | Média | frontend/demanda | Demandas: estimativa e previsão editadas na linha só avisam a página depois do `PUT` | A-101 | — |
| **408** | Média | frontend/demanda | Demandas: salvar a edição faz uma releitura só, e ela atualiza tags e membros | A-102, A-103 | — |
| **409** | Média | frontend/demanda | Demandas: alteração que não muda a estrutura não recarrega o grafo do projeto | A-104 | — |
| **410** | Média | frontend/demanda | Demandas: os destinos de "Conectar" vêm do grafo já carregado | A-105 | — |
| **411** | Média | frontend/demanda | Demandas: trocar de demanda cancela a carga da anterior | A-106 | — |
| **412** | Baixa | frontend/demanda | Demandas: voltar a uma demanda vista e trocar de modo refazem a carga inteira | A-107 | pendente |
| **413** | Baixa | frontend/demanda | Demandas: diálogos de edição e de tags com menos leituras | A-108 | — |
| **414** | Baixa | backend/demanda e frontend/demanda | Demandas: gravar membros numa requisição só | A-109 | pendente |

### Chat entre colegas (tráfego)

| Task | Severidade | Área | Entrega | Achados | Decisão |
|---|---|---|---|---|---|
| **415** | Média | frontend/mensagem-direta e backend/mensagem-direta | Chat: o evento `SINCRONIZAR` deixa de ser "relê tudo" | A-110, A-111, A-112 | pendente |
| **416** | Baixa | frontend/mensagem-direta | Chat: abrir conversa ou grupo sem não lidas não envia `PUT` de leitura | A-113 | — |
| **417** | Baixa | frontend/mensagem-direta | Chat: primeira mensagem e "Criar chat" atualizam a lista pela resposta, sem recarregá-la | A-114, A-115 | — |
| **418** | Baixa | frontend/mensagem-direta | Chat: `GET /mensagem-direta/pessoas` não se repete a cada diálogo | A-116 | — |
| **419** | Baixa | frontend/mensagem-direta | Chat: abrir um grupo pede mensagens e fixadas em paralelo | A-117 | — |
| **420** | Baixa | frontend/mensagem-direta | Chat: propostas da IA numa conversa não são pedidas de novo a cada reabertura | A-118 | — |

### Permissões: usuário, login, pad, ponto, calendário e administração da IA

| Task | Severidade | Área | Entrega | Achados | Decisão |
|---|---|---|---|---|---|
| **421** | Média | backend/autenticacao | Login: limitar tentativas | A-119 | pendente |
| **422** | Baixa | backend/autenticacao | Login: não revelar que um login existe e está inativo | A-120 | — |
| **423** | Média | backend/autenticacao e usuario | Troca de senha: os tokens emitidos antes deixam de valer | A-121 | pendente |
| **424** | Média | backend/usuario | Senha: quem troca a de quem, e com qual confirmação | A-122 | pendente |
| **425** | Média | backend/usuario | `GET /usuario`: o que o auxiliar recebe de cada usuário | A-123 | pendente |
| **426** | Média | backend/anotacao | Pad: o gestor lê o pad de outro; e escreve? | A-124 | pendente |
| **427** | Baixa | backend/ponto-justificativa | Justificativa de ponto: a regra "só de outra pessoa" na service | A-125 | — |
| **428** | Baixa | backend/usuario | Promover a gestor: o que fazer com as demandas e a execução ativa do usuário | A-126 | pendente |
| **429** | Baixa | backend/usuario | Último administrador ativo: a guarda resiste a duas requisições simultâneas | A-127 | — |
| **430** | Informativo | docs e backend/calendario | Calendário: a leitura dos dias não úteis é aberta a todos? | A-128 | pendente |
| **431** | Baixa | backend/mensagem-direta e configuracao-ia | Custo estimado do resumo do grupo mostra o preço do modelo a qualquer membro | A-129 | pendente |
| **432** | Baixa | backend/ia-custo e autenticacao | Testes: trava de administrador em custos da IA e o auxiliar nos guards | A-130, A-131 | — |
| **433** | Informativo | backend/prompt e configuracao-ia | Ativar ou restaurar prompt e alterar preço: registrar qual administrador fez | A-132 | pendente |
| **434** | Informativo | docs e backend/ia-custo | Custos da IA: o documento e o teste de prompt | A-133 | pendente |

### Atividades, Execuções, Ponto e Calendário (tráfego)

| Task | Severidade | Área | Entrega | Achados | Decisão |
|---|---|---|---|---|---|
| **435** | Média | backend/atividade e frontend/atividade | Atividades: ação em massa numa requisição só | A-134, A-135 | pendente |
| **436** | Média | frontend/atividade, execucao e ponto | Seletores de usuário ativo: reaproveitar o catálogo em memória | A-136 | pendente |
| **437** | Média | frontend (atividade, execucao, ponto, projeto, configuracao-ia) | Listas e navegação de período: a consulta nova cancela a anterior | A-137, A-138 | — |
| **438** | Média | frontend/execucao e ponto | Pausar pelo chip da topbar atualiza Execuções e Ponto | A-139 | — |
| **439** | Baixa | frontend/atividade | "Nova atividade": tags e usuários pelo catálogo em memória | A-140 | — |
| **440** | Baixa | frontend/atividade, calendario e execucao | Atividades, Calendário e Execuções: aplicar a resposta da mutação em vez de recarregar a lista | A-141 | — |
| **441** | Baixa | frontend/atividade | Atividades: o painel de texto da demanda não relê a demanda inteira depois de salvar | A-142 | — |
| **442** | Baixa | backend/atividade e frontend/atividade | Detalhe da atividade: as tags na mesma resposta | A-143 | pendente |
| **443** | Baixa | backend/ponto e frontend/ponto | Ponto: o diálogo de justificativa não pede o usuário inteiro só pela jornada | A-144 | pendente |

### Projetos, Relatório, Tags, Modelagem e Configurações da IA (tráfego)

| Task | Severidade | Área | Entrega | Achados | Decisão |
|---|---|---|---|---|---|
| **444** | Média | frontend/relatorio | Relatório: a revisão da IA não aparece ao lado de um relatório de outro período | A-145 | — |
| **445** | Média | frontend/configuracao-ia | Prompts: salvar, ativar, restaurar e descartar aplicam a resposta em vez de reler tudo | A-146 | — |
| **446** | Média | frontend/configuracao-ia | Configurações da IA: salvar uma versão não relê o que o `POST` devolveu | A-147 | — |
| **447** | Média | backend/projeto e frontend/projeto | Volume dentro do projeto: pedir só o volume daquele projeto | A-148 | pendente |
| **448** | Média | frontend/modelagem | Modelagem: mover uma tabela de grupo não relê o diagrama inteiro | A-149 | — |
| **449** | Baixa | backend/tag e frontend/tag | Tags: excluir selecionadas e desfazer numa requisição só | A-150 | pendente |
| **450** | Baixa | frontend/relatorio | Relatório aberto pelo projeto: pedir o projeto, não a lista inteira | A-151 | — |
| **451** | Baixa | frontend/projeto | Projetos: a visão que está escondida não é carregada | A-152 | — |
| **452** | Baixa | frontend/projeto | Projetos: desfazer a exclusão reinsere o cartão sem recarregar a lista | A-153 | — |
| **453** | Baixa | frontend/configuracao-ia | Configurações da IA: a lista de modelos começa junto com as outras leituras | A-154 | — |

### Transversais

| Task | Severidade | Área | Entrega | Achados | Decisão |
|---|---|---|---|---|---|
| **454** | Baixa | backend (vários módulos) | Recurso sem acesso: uma resposta só (404) em todos os módulos | A-155, A-156, A-157, A-158, A-159 | pendente |
| **455** | Baixa | backend (mensagem-direta, chat, plano, usuario e ponto) | Tipo de usuário: tirar as comparações diretas e a lista de "poder de gestor" repetida | A-160, A-161, A-162, A-163, A-164 | — |
| **456** | Baixa | backend/demanda, atividade e execucao | Escritas decididas pela função de permissão da ação, não por `temVisibilidadeTotal` | A-165, A-166 | — |
| **457** | Baixa | docs e backend (Swagger, comentários, ferramentas da IA) | Atualizar os textos "somente gestor" onde o auxiliar também pode | A-167, A-168, A-169 | — |
| **458** | Informativo | backend (anotacao, checkin, calendario, demanda) | Rotas do backend que nem o front nem o Desktop chamam: manter ou remover | A-170, A-171 | pendente |
| **459** | Baixa | frontend (atividade, calendario, demanda, execucao, mensagem-direta, tag) | Remover os métodos de requisição do front que ninguém chama | A-172, A-173, A-174, A-175, A-176 | — |
| **460** | Baixa | frontend (usuario, ponto, atividade, execucao, configuracao-ia) | Voltar à aba: as telas não recarregam a lista toda vez | A-177, A-178, A-179, A-180 | — |
| **461** | Baixa | frontend/projeto | Projetos: a listagem não corta em 100 | A-181 | — |
| **462** | Baixa | frontend/configuracao-ia | Configurações da IA: a aba Prompts só carrega quando é aberta | A-182 | — |
| **463** | Baixa | backend (projeto, calendario, tag, relatorio, ponto-justificativa, modelagem, ia, configuracao-ia) | Permissão conferida na service, não só no decorador da rota | A-183, A-184 | — |

## Critérios de Aceite

- Cada task fecha pelos critérios da própria spec, com os gates do projeto (testes e build dos workspaces tocados, `npm run lint:tudo`, verificação ao vivo quando há mudança observável).
- A guarda-chuva fecha quando todas as tasks estiverem em `done/` ou em `discarded/` com a nota.

## Fora de Escopo

O que o dossiê registrou sem spec (seção "Achados sem spec"), desempenho de SQL sob carga e qualquer mudança de modelagem que o autor não tenha decidido.

## Dependências

O dossiê `docs/specs/active/revisao-requisicoes-e-permissoes/DOSSIE.md` e os dois anexos dele; `docs/SYSTEM.SPEC.md` §11, §12 e §14; a decisão viva "menos requisições nas telas" (tasks 320–325). As dependências entre tasks estão na seção "Dependências" de cada spec.

