# requisicoes-e-permissoes-correcoes.spec.md

> Guarda-chuva (tasks **330–487**, todas já com spec própria em `backlog/`). Origem: a revisão de requisições e de permissões pedida pelo autor em 2026-11-13 (`docs/specs/active/revisao-requisicoes-e-permissoes.spec.md`); os achados, a evidência e o que foi medido estão em `docs/specs/active/revisao-requisicoes-e-permissoes/DOSSIE.md`. O autor pediu uma spec por ponto, juntando só os de mesma causa.

## Objetivo

Corrigir, um a um, os pontos que a revisão confirmou: requisições inúteis ou ineficientes do `frontend/` e do `desktop/`, código de requisição sem uso e permissões por tipo de usuário (administrador, gestor, auxiliar e desenvolvedor) que precisam de reforço.

## Entregáveis

1. As 158 tasks da tabela abaixo, cada uma implementada pela própria spec: 6 de severidade alta, 58 média, 82 baixa e 12 informativas.
2. As 37 decisões do autor ainda pendentes, listadas em "Decisões do autor pendentes", registradas na spec de cada task antes de ela começar.

## Regras para todas as tasks

- **Reproduzir antes de corrigir.** Cada task começa pelo teste (ou pelo roteiro ao vivo) que mostra o achado. Se o achado não se reproduzir no código do dia, a spec vai para `discarded/` com a nota de data e motivo, e o dossiê não é reescrito.
- **Decisão do autor primeiro.** Task marcada com "decisão" não começa antes de o autor escolher a opção; a escolha é registrada na própria spec, numa seção "Decisão do autor", antes de mover para `active/`.
- **Linhas citadas são de 2026-11-13.** O número da linha pode ter mudado; ache o trecho pelo texto.
- **Ordem.** Nenhuma ordem foi decidida: `docs/context/PRIORITIES.md` é do autor. A tabela está agrupada por assunto e, dentro dele, na ordem em que os achados foram curados; a coluna de severidade ajuda a escolher.
- **Permissão é regra de negócio.** Em conflito entre código e `docs/SYSTEM.SPEC.md` §14, o documento vence; quando a spec muda a regra, o documento muda na mesma task.

## Decisões do autor pendentes

| Task | Decisão |
|---|---|
| **334** | Backend: `GET /checkin/situacao` não lista todas as execuções da atividade |
| **352** | Gravações do pad e dos textos da demanda: não devolver o texto inteiro |
| **363** | IA chamada em conversa compartilhada: resposta com dado que nem todo leitor pode ver |
| **366** | Grupo livre: escrever (ou mudar) quem adiciona, quem remove e quem lê o histórico |
| **370** | `POST /assistente/auxiliar-descricao`: identificar quem usa, limitar o tamanho e registrar o custo |
| **371** | Desfazer a criação de demanda pela proposta: exceção escrita ou mesma permissão da exclusão |
| **372** | IA: `consultar_demanda` e `consultar_grafo_do_projeto` para o desenvolvedor |
| **380** | Mover atividade de demanda: onde existe e entre quais projetos |
| **385** | Demanda: a trava do "último membro" e a demanda que nasce sem membro |
| **386** | Conexão de demandas de projetos diferentes: permitir ou recusar |
| **388** | Desenvolvedor entra sozinho em qualquer demanda do projeto e passa a editar: é a regra? |
| **393** | Supervisão: conversas antigas de quem deixou de ser gestor |
| **402** | Plano: trocar a demanda ligada exige o quê sobre a demanda antiga? |
| **403** | Plano arquivado: continua editável e publicável? |
| **412** | Demandas: voltar a uma demanda vista e trocar de modo refazem a carga inteira |
| **414** | Demandas: gravar membros numa requisição só |
| **415** | Chat: o evento `SINCRONIZAR` deixa de ser "relê tudo" |
| **430** | Calendário: a leitura dos dias não úteis é aberta a todos? |
| **431** | Custo estimado do resumo do grupo mostra o preço do modelo a qualquer membro |
| **433** | Ativar ou restaurar prompt e alterar preço: registrar qual administrador fez |
| **434** | Custos da IA: o documento e o teste de prompt |
| **435** | Atividades: ação em massa numa requisição só |
| **436** | Seletores de usuário ativo: reaproveitar o catálogo em memória |
| **442** | Detalhe da atividade: as tags na mesma resposta |
| **443** | Ponto: o diálogo de justificativa não pede o usuário inteiro só pela jornada |
| **446** | Chat com a IA: as propostas de uma conversa numa leitura só |
| **454** | Editar a própria execução: a tela e a API com a mesma regra |
| **455** | Encerrar execução: a descrição obrigatória decidida pelo dono da atividade em toda a interface |
| **458** | Projetos: o menu e a rota contam a mesma regra para o desenvolvedor |
| **462** | Project Desktop: a janela de chat carrega a aplicação inteira e abre um segundo stream a cada abertura |
| **464** | Download do instalador: gravar direto em disco, não na memória da página |
| **470** | Volume dentro do projeto: pedir só o volume daquele projeto |
| **472** | Tags: excluir selecionadas e desfazer numa requisição só |
| **477** | Recurso sem acesso: uma resposta só (404) em todos os módulos |
| **481** | Rotas do backend que nem o front nem o Desktop chamam: manter ou remover |

## Quebra em tasks

### Casca, sessão, check-in e Project Desktop

| Task | Severidade | Área | Entrega | Achados | Decisão |
|---|---|---|---|---|---|
| **487** | Alta | desktop | Project Desktop: conferir o check-in pelo horário sorteado, não a cada 15 s | A-001, A-002, A-003, A-004 | — |
| **330** | Média | frontend/casca | Disponibilidade da IA: não consultar a cada 60 s com a aba oculta | A-005, A-006 | decidida e feita |
| **331** | Média | frontend/casca | Execução ativa: foco e volta à aba não disparam consultas repetidas | A-007, A-008 | feita |
| **332** | Média | frontend/casca | Leituras automáticas da casca não mostram o toast global de erro | A-009 | feita |
| **333** | Média | frontend/checkin | Check-in aberto: conferir a situação por evento, não a cada 3 s | A-010 | decidida e feita |
| **334** | Média | backend/checkin | Backend: `GET /checkin/situacao` não lista todas as execuções da atividade | A-011 | pendente |
| **335** | Alta | frontend/atividade | Execuções de uma atividade: detalhe e diálogo de encerrar mostram as últimas, não as mais antigas | A-012, A-013, A-014, A-015 | decidida e feita |
| **336** | Baixa | frontend/checkin | Check-in: a situação mora num sinal só do serviço | A-016, A-017 | — |
| **337** | Baixa | frontend/casca | Login: não pedir `GET /usuario/:id` do usuário que o login acabou de devolver | A-018 | — |
| **338** | Baixa | frontend/casca | `GET /desktop/versao` só quando o menu do perfil é aberto | A-019, A-020, A-021 | — |
| **339** | Baixa | frontend/casca | Encerrar execução: não reler `GET /execucao/ativa` quando a resposta já diz o resultado | A-022 | — |
| **340** | Média | frontend/casca | Sessão: os guards esperam a reconferência do usuário, e o 403 reconfere | A-023, A-024 | — |
| **341** | Média | frontend/casca | Encerrar a sessão (logout e 401) por um caminho só, que limpa memória e navegador | A-025, A-026, A-027 | — |
| **342** | Baixa | frontend/casca | "Desfazer" que falha continua disponível | A-028 | — |
| **343** | Baixa | frontend/casca | Remover código sem uso na casca e no check-in | A-029 | — |

### Usuários, pad e Documentações

| Task | Severidade | Área | Entrega | Achados | Decisão |
|---|---|---|---|---|---|
| **344** | Média | frontend/pad | Pad: encerrar zera o estado, para voltar a gravar e não mostrar o pad de outro usuário | A-030, A-031 | — |
| **345** | Média | frontend/usuario | Usuários: busca e filtro voltam o paginador, aceitam o termo repetido e cancelam a carga anterior | A-032, A-033, A-034 | — |
| **346** | Baixa | frontend/documentacao | Documentações: conflito de versão não mostra também "Erro interno" | A-035 | — |
| **347** | Baixa | frontend/usuario | Usuários: editar usa a resposta do `PUT` em vez de recarregar a lista | A-036, A-037 | — |
| **348** | Baixa | frontend/documentacao | Documentações: carregar o pad só quando ele está à vista | A-038 | — |
| **349** | Baixa | frontend/documentacao | Documentações: abrir a demanda guardada em paralelo com a lista | A-039 | — |
| **350** | Baixa | frontend/documentacao | Documentações: ícones e marcas acompanham o texto recém-gravado | A-040 | — |
| **351** | Baixa | frontend/pad | Pad: reabrir a gaveta com o mesmo pad em memória não mostra esqueleto nem relê na hora | A-041 | — |
| **352** | Baixa | backend/anotacao e demanda | Gravações do pad e dos textos da demanda: não devolver o texto inteiro | A-042 | pendente |
| **353** | Baixa | backend/usuario | `GET /usuario`: `temAnotacoes` mais barato e só para quem pode abrir o pad | A-043, A-044 | — |
| **354** | Baixa | backend/usuario | Usuário não inativa nem exclui a si mesmo: a trava também no backend | A-045, A-046 | decidida e feita |
| **355** | Informativo | frontend/usuario | Usuários: `podeEditar` da tela igual à regra do backend | A-047 | — |
| **356** | Informativo | frontend/usuario | Usuários: a linha só sai da lista depois que o `DELETE` responde | A-048 | — |
| **357** | Informativo | frontend/documentacao | Documentações: novo pedido à IA ou troca de demanda cancela o pedido em curso | A-049 | — |
| **358** | Baixa | frontend/usuario | Remover código sem uso em Usuários, pad e Documentações | A-050 | — |

### Permissões: chat em grupo, canais, propostas e ferramentas da IA

| Task | Severidade | Área | Entrega | Achados | Decisão |
|---|---|---|---|---|---|
| **359** | Alta | backend/mensagem-direta | Supervisão do chat: a auditoria e o aviso não dependem do parâmetro `cursor` | A-051, A-052 | — |
| **360** | Média | backend/mensagem-direta e frontend/demanda | Canal de demanda e de projeto: definir e aplicar a regra do auxiliar | A-053 | decidida e feita |
| **361** | Média | backend/mensagem-direta | Canal: o gestor não membro não lê texto de mensagem sem auditoria | A-054 | decidida e feita |
| **362** | Média | backend/mensagem-direta | Grupo "privado": o que acontece quando o último gestor sai | A-055 | decidida e feita |
| **363** | Média | backend/mensagem-direta e chat (plano) | IA chamada em conversa compartilhada: resposta com dado que nem todo leitor pode ver | A-056, A-057, A-058 | pendente |
| **364** | Baixa | backend/mensagem-direta | Testes de permissão por tipo de usuário em grupos, canais e supervisão | A-059, A-060 | — |
| **365** | Baixa | backend/mensagem-direta e proposta-ia | Proposta nascida do resumo do grupo: confirmar e desfazer por um caminho só | A-061 | — |
| **366** | Informativo | backend/mensagem-direta | Grupo livre: escrever (ou mudar) quem adiciona, quem remove e quem lê o histórico | A-062 | pendente |
| **367** | Alta | backend/atividade | IA: propor criar e mover atividade conferem o acesso à demanda antes de ler | A-063, A-064, A-065 | — |
| **368** | Média | backend/proposta-ia | Proposta da IA: ajuste que falha não deixa os dados do cliente gravados | A-066 | — |
| **369** | Baixa | backend/plano | Proposta de trecho do plano: recusar exige poder editar a aba | A-067 | — |
| **370** | Média | backend/assistente | `POST /assistente/auxiliar-descricao`: identificar quem usa, limitar o tamanho e registrar o custo | A-068 | pendente |
| **371** | Baixa | backend/demanda | Desfazer a criação de demanda pela proposta: exceção escrita ou mesma permissão da exclusão | A-069, A-070 | pendente |
| **372** | Baixa | backend/demanda | IA: `consultar_demanda` e `consultar_grafo_do_projeto` para o desenvolvedor | A-071 | pendente |

### Permissões: demanda, atividade e execução

| Task | Severidade | Área | Entrega | Achados | Decisão |
|---|---|---|---|---|---|
| **373** | Alta | backend/atividade | Atividade: desenvolvedor membro da demanda não altera a atividade nem as tags de um colega | A-072 | decidida e feita |
| **374** | Alta | backend/execucao | `PUT /execucao/:id` não reabre nem move execução criando duas ativas ou sobreposição | A-073 | — |
| **375** | Média | backend/execucao | Execução: conferir a permissão antes de responder regra de negócio | A-074 | — |
| **376** | Média | backend/atividade | `POST /atividade`: recusar dono que o tipo não pode escolher e validar o dono informado | A-075 | — |
| **377** | Média | backend/atividade | Atividade: o dono que não é membro da demanda lê o que consegue alterar | A-076 | decidida e feita |
| **378** | Média | backend/atividade | Excluir e restaurar atividade: a rota e a IA com a mesma regra | A-077 | decidida e feita |
| **379** | Baixa | backend/execucao | Execução: registrar e excluir conferem a permissão na service, não só no decorador | A-078 | — |
| **380** | Baixa | backend/atividade | Mover atividade de demanda: onde existe e entre quais projetos | A-079 | pendente |
| **381** | Média | backend/demanda | Demanda: a API não aceita gestor, administrador nem usuário inativo como membro | A-080 | — |
| **382** | Média | backend/demanda | `PUT /demanda/:id`: mover para pai não estrutural é recusado na service | A-081 | — |
| **383** | Baixa | backend/demanda | Demanda: o pai informado é lido com o acesso do usuário | A-082 | — |
| **384** | Baixa | backend/demanda | `GET /demanda` para o desenvolvedor: demandas do projeto acessível ou só as dele? | A-083 | decidida e feita |
| **385** | Baixa | backend/demanda | Demanda: a trava do "último membro" e a demanda que nasce sem membro | A-084 | pendente |
| **386** | Baixa | backend/demanda | Conexão de demandas de projetos diferentes: permitir ou recusar | A-085 | pendente |
| **387** | Baixa | backend/demanda | IA: propostas de concluir, alterar e descrever demanda recusam na hora quem não pode editar | A-086 | — |
| **388** | Informativo | backend/demanda | Desenvolvedor entra sozinho em qualquer demanda do projeto e passa a editar: é a regra? | A-087 | pendente |
| **389** | Baixa | backend/demanda | Demanda: testes das regras de permissão por tipo de usuário | A-088 | — |

### Permissões: supervisão do chat e plano

| Task | Severidade | Área | Entrega | Achados | Decisão |
|---|---|---|---|---|---|
| **390** | Média | backend/mensagem-direta | Supervisão: a lista de conversas não entrega texto de mensagem sem auditoria | A-089 | decidida e feita |
| **391** | Média | backend/mensagem-direta | Supervisão: abrir um par que nunca conversou não grava auditoria nem cria conversa | A-090 | — |
| **392** | Média | backend/mensagem-direta | Supervisão: a conversa do auxiliar é supervisionável? | A-091 | decidida e feita |
| **393** | Baixa | backend/mensagem-direta | Supervisão: conversas antigas de quem deixou de ser gestor | A-092 | pendente |
| **394** | Baixa | backend/mensagem-direta | Referência `#` no chat: demanda e atividade com a mesma regra de acesso | A-093 | — |
| **395** | Baixa | backend/mensagem-direta | Proposta do `@IA` numa conversa: quem tem visão total não vê proposta de tipos pessoais | A-094 | — |
| **396** | Média | backend/plano | Plano solo de projeto: o criador que perdeu o acesso ao projeto perde o plano | A-095 | decidida e feita |
| **397** | Média | backend/plano | Plano: marcar "solo" não tira gestor e administrador de arquivar e excluir | A-096 | decidida e feita |
| **398** | Média | backend/plano e chat | IA no plano: as ferramentas só agem no plano da conversa aberta | A-097 | — |
| **399** | Baixa | backend/plano | Publicar plano na demanda: conferir a permissão de editar antes das outras respostas | A-098 | — |
| **400** | Baixa | docs e backend/plano | Plano: escrever as regras de permissão no `SYSTEM.SPEC.md` e tirar a sobra da regra antiga | A-099, A-100 | — |
| **401** | Baixa | backend/plano | Plano: testes de permissão com auxiliar e casos de borda de acesso | A-101 | — |
| **402** | Informativo | backend/plano | Plano: trocar a demanda ligada exige o quê sobre a demanda antiga? | A-102 | pendente |
| **403** | Informativo | backend/plano | Plano arquivado: continua editável e publicável? | A-103 | pendente |

### Tela de Demandas

| Task | Severidade | Área | Entrega | Achados | Decisão |
|---|---|---|---|---|---|
| **404** | Média | frontend/demanda | Demandas: excluir não pede a demanda excluída e desfazer traz a demanda de volta à tela | A-104, A-105 | — |
| **405** | Média | frontend/demanda e mensagem-direta | Demandas e Projetos: o botão do chat não pergunta ao servidor a cada seleção | A-106, A-107, A-108 | decidida e feita |
| **406** | Média | frontend/demanda | Demandas: tirar `GET /demanda/:id/arvore` da seleção (a resposta não é usada) | A-109 | — |
| **407** | Média | frontend/demanda | Demandas: estimativa e previsão editadas na linha só avisam a página depois do `PUT` | A-110 | — |
| **408** | Média | frontend/demanda | Demandas: salvar a edição faz uma releitura só, e ela atualiza tags e membros | A-111, A-112 | — |
| **409** | Média | frontend/demanda | Demandas: alteração que não muda a estrutura não recarrega o grafo do projeto | A-113 | — |
| **410** | Média | frontend/demanda | Demandas: os destinos de "Conectar" vêm do grafo já carregado | A-114 | — |
| **411** | Média | frontend/demanda | Demandas: trocar de demanda cancela a carga da anterior | A-115 | — |
| **412** | Baixa | frontend/demanda | Demandas: voltar a uma demanda vista e trocar de modo refazem a carga inteira | A-116 | pendente |
| **413** | Baixa | frontend/demanda | Demandas: diálogos de edição e de tags com menos leituras | A-117 | — |
| **414** | Baixa | backend/demanda e frontend/demanda | Demandas: gravar membros numa requisição só | A-118 | pendente |

### Chat entre colegas (tráfego)

| Task | Severidade | Área | Entrega | Achados | Decisão |
|---|---|---|---|---|---|
| **415** | Média | frontend/mensagem-direta e backend/mensagem-direta | Chat: o evento `SINCRONIZAR` deixa de ser "relê tudo" | A-119, A-120, A-121 | pendente |
| **416** | Baixa | frontend/mensagem-direta | Chat: abrir conversa ou grupo sem não lidas não envia `PUT` de leitura | A-122 | — |
| **417** | Baixa | frontend/mensagem-direta | Chat: primeira mensagem e "Criar chat" atualizam a lista pela resposta, sem recarregá-la | A-123, A-124 | — |
| **418** | Baixa | frontend/mensagem-direta | Chat: `GET /mensagem-direta/pessoas` não se repete a cada diálogo | A-125 | — |
| **419** | Baixa | frontend/mensagem-direta | Chat: abrir um grupo pede mensagens e fixadas em paralelo | A-126 | — |
| **420** | Baixa | frontend/mensagem-direta | Chat: propostas da IA numa conversa não são pedidas de novo a cada reabertura | A-127 | — |

### Permissões: usuário, login, pad, ponto, calendário e administração da IA

| Task | Severidade | Área | Entrega | Achados | Decisão |
|---|---|---|---|---|---|
| **421** | Média | backend/autenticacao | Login: limitar tentativas | A-128 | decidida e feita |
| **422** | Baixa | backend/autenticacao | Login: não revelar que um login existe e está inativo | A-129 | — |
| **423** | Média | backend/autenticacao e usuario | Troca de senha: os tokens emitidos antes deixam de valer | A-130 | adiada (P-102) |
| **424** | Média | backend/usuario | Senha: quem troca a de quem, e com qual confirmação | A-131 | decidida e feita |
| **425** | Média | backend/usuario | `GET /usuario`: o que o auxiliar recebe de cada usuário | A-132 | decidida e feita |
| **426** | Média | backend/anotacao | Pad: o gestor lê o pad de outro; e escreve? | A-133 | decidida e feita |
| **427** | Baixa | backend/ponto-justificativa | Justificativa de ponto: a regra "só de outra pessoa" na service | A-134 | — |
| **428** | Baixa | backend/usuario | Promover a gestor: o que fazer com as demandas e a execução ativa do usuário | A-135 | decidida e feita |
| **429** | Baixa | backend/usuario | Último administrador ativo: a guarda resiste a duas requisições simultâneas | A-136 | — |
| **430** | Informativo | docs, backend/calendario e frontend/calendario | Calendário: a leitura dos dias não úteis é aberta a todos? | A-137, A-138 | pendente |
| **431** | Baixa | backend/mensagem-direta e configuracao-ia | Custo estimado do resumo do grupo mostra o preço do modelo a qualquer membro | A-139 | pendente |
| **432** | Baixa | backend/ia-custo e autenticacao | Testes: trava de administrador em custos da IA e o auxiliar nos guards | A-140, A-141 | — |
| **433** | Informativo | backend/prompt e configuracao-ia | Ativar ou restaurar prompt e alterar preço: registrar qual administrador fez | A-142 | pendente |
| **434** | Informativo | docs e backend/ia-custo | Custos da IA: o documento e o teste de prompt | A-143 | pendente |

### Atividades, Execuções, Ponto e Calendário (tráfego)

| Task | Severidade | Área | Entrega | Achados | Decisão |
|---|---|---|---|---|---|
| **435** | Média | backend/atividade e frontend/atividade | Atividades: ação em massa numa requisição só | A-144, A-145 | pendente |
| **436** | Média | frontend/atividade, execucao e ponto | Seletores de usuário ativo: reaproveitar o catálogo em memória | A-146 | pendente |
| **437** | Média | frontend (atividade, execucao, ponto, projeto, configuracao-ia, chat) | Listas e navegação de período: a consulta nova cancela a anterior | A-147, A-148, A-149 | — |
| **438** | Média | frontend/execucao e ponto | Pausar pelo chip da topbar atualiza Execuções e Ponto | A-150 | — |
| **439** | Baixa | frontend/atividade | "Nova atividade": tags e usuários pelo catálogo em memória | A-151 | — |
| **440** | Baixa | frontend/atividade, calendario e execucao | Atividades, Calendário e Execuções: aplicar a resposta da mutação em vez de recarregar a lista | A-152 | — |
| **441** | Baixa | frontend/atividade | Atividades: o painel de texto da demanda não relê a demanda inteira depois de salvar | A-153 | — |
| **442** | Baixa | backend/atividade e frontend/atividade | Detalhe da atividade: as tags na mesma resposta | A-154 | pendente |
| **443** | Baixa | backend/ponto e frontend/ponto | Ponto: o diálogo de justificativa não pede o usuário inteiro só pela jornada | A-155 | pendente |

### Chat com a IA e plano (tráfego)

| Task | Severidade | Área | Entrega | Achados | Decisão |
|---|---|---|---|---|---|
| **444** | Média | frontend/chat | Chat com a IA: o fim de cada mensagem não relê disponibilidade, conversas e planos | A-156 | — |
| **445** | Média | frontend/chat (plano) | Plano: alterar não relê as conversas nem as listas que a resposta já atualiza | A-157, A-158 | — |
| **446** | Média | backend/chat e frontend/chat | Chat com a IA: as propostas de uma conversa numa leitura só | A-159 | pendente |
| **447** | Média | frontend/casca | "Confirmar todas", "Desfazer todas" e "Ajustar" atualizam a execução ativa da topbar | A-160 | — |
| **448** | Média | frontend/chat | Proposta: o "Desfazer" do toast usa a resposta e avisa a página | A-161 | — |
| **449** | Média | frontend/chat | Chat: a demanda aberta ao lado carrega as atividades em paralelo e sem teto de 100 | A-162 | — |
| **450** | Baixa | frontend/chat (plano) | Chat: a lista de planos é carregada uma vez, quando alguém precisa dela | A-163, A-164 | — |
| **451** | Baixa | frontend/chat | Chat: "Minhas demandas" e a demanda aberta atualizam depois de uma proposta, não a cada volta à lista | A-165, A-166 | — |
| **452** | Baixa | frontend/chat (plano) | Plano: "Ligar a uma demanda" não pede a lista no clique que fecha | A-167 | — |
| **453** | Baixa | frontend/chat | Chat: bom-dia e retomada respondem na conversa do dia, mesmo depois de uma mensagem em Planejamento | A-168 | — |

### Permissões na interface

| Task | Severidade | Área | Entrega | Achados | Decisão |
|---|---|---|---|---|---|
| **454** | Média | backend/execucao e frontend/execucao | Editar a própria execução: a tela e a API com a mesma regra | A-169 | pendente |
| **455** | Baixa | frontend/execucao e casca | Encerrar execução: a descrição obrigatória decidida pelo dono da atividade em toda a interface | A-170 | pendente |
| **456** | Baixa | frontend/demanda | Demandas: o item "Tags" do menu de contexto só aparece para quem pode atribuir | A-171 | — |
| **457** | Baixa | frontend/usuario e casca | Anotações: o link direto aplica a mesma regra do botão | A-172 | — |
| **458** | Baixa | frontend/projeto | Projetos: o menu e a rota contam a mesma regra para o desenvolvedor | A-173, A-174 | pendente |
| **459** | Baixa | frontend/casca | Sessão: token sem os dados do usuário não abre a aplicação pela metade | A-175 | — |
| **460** | Baixa | frontend (casca, usuario, execucao, ponto) | Interface: menu e telas decidem pelas funções de permissão do `shared` | A-176, A-177 | — |

### Project Desktop

| Task | Severidade | Área | Entrega | Achados | Decisão |
|---|---|---|---|---|---|
| **461** | Média | desktop e frontend/checkin | Project Desktop: com a janelinha do check-in aberta, uma consulta só à situação | A-178 | — |
| **462** | Baixa | desktop e frontend/mensagem-direta | Project Desktop: a janela de chat carrega a aplicação inteira e abre um segundo stream a cada abertura | A-179, A-180 | pendente |
| **463** | Baixa | desktop | Project Desktop: baixar a versão nova sem abrir o Project inteiro no navegador | A-181 | — |
| **464** | Baixa | backend/desktop e frontend/casca | Download do instalador: gravar direto em disco, não na memória da página | A-182 | pendente |
| **465** | Baixa | desktop | Project Desktop: com o front fora do ar, tentar de novo com espera crescente | A-183 | — |
| **466** | Informativo | desktop | Project Desktop: a conferência de versão só conta como feita quando responde | A-184 | — |

### Projetos, Relatório, Tags, Modelagem e Configurações da IA (tráfego)

| Task | Severidade | Área | Entrega | Achados | Decisão |
|---|---|---|---|---|---|
| **467** | Média | frontend/relatorio | Relatório: a revisão da IA não aparece ao lado de um relatório de outro período | A-185 | — |
| **468** | Média | frontend/configuracao-ia | Prompts: salvar, ativar, restaurar e descartar aplicam a resposta em vez de reler tudo | A-186 | — |
| **469** | Média | frontend/configuracao-ia | Configurações da IA: salvar uma versão não relê o que o `POST` devolveu | A-187 | — |
| **470** | Média | backend/projeto e frontend/projeto | Volume dentro do projeto: pedir só o volume daquele projeto | A-188 | pendente |
| **471** | Média | frontend/modelagem | Modelagem: mover uma tabela de grupo não relê o diagrama inteiro | A-189 | — |
| **472** | Baixa | backend/tag e frontend/tag | Tags: excluir selecionadas e desfazer numa requisição só | A-190 | pendente |
| **473** | Baixa | frontend/relatorio | Relatório aberto pelo projeto: pedir o projeto, não a lista inteira | A-191 | — |
| **474** | Baixa | frontend/projeto | Projetos: a visão que está escondida não é carregada | A-192 | — |
| **475** | Baixa | frontend/projeto | Projetos: desfazer a exclusão reinsere o cartão sem recarregar a lista | A-193 | — |
| **476** | Baixa | frontend/configuracao-ia | Configurações da IA: a lista de modelos começa junto com as outras leituras | A-194 | — |

### Transversais

| Task | Severidade | Área | Entrega | Achados | Decisão |
|---|---|---|---|---|---|
| **477** | Baixa | backend (vários módulos) | Recurso sem acesso: uma resposta só (404) em todos os módulos | A-195, A-196, A-197, A-198, A-199 | pendente |
| **478** | Baixa | backend (mensagem-direta, chat, plano, usuario e ponto) | Tipo de usuário: tirar as comparações diretas e a lista de "poder de gestor" repetida | A-200, A-201, A-202, A-203, A-204 | — |
| **479** | Baixa | backend/demanda, atividade e execucao | Escritas decididas pela função de permissão da ação, não por `temVisibilidadeTotal` | A-205, A-206 | — |
| **480** | Baixa | docs e backend (Swagger, comentários, ferramentas da IA) | Atualizar os textos "somente gestor" onde o auxiliar também pode | A-207, A-208, A-209, A-210 | — |
| **481** | Informativo | backend (anotacao, checkin, calendario, demanda) | Rotas do backend que nem o front nem o Desktop chamam: manter ou remover | A-211, A-212 | pendente |
| **482** | Baixa | frontend (atividade, calendario, demanda, execucao, mensagem-direta, tag) | Remover os métodos de requisição do front que ninguém chama | A-213, A-214, A-215, A-216, A-217 | — |
| **483** | Baixa | frontend (usuario, ponto, atividade, execucao, configuracao-ia) | Voltar à aba: as telas não recarregam a lista toda vez | A-218, A-219, A-220, A-221 | — |
| **484** | Baixa | frontend/projeto | Projetos: a listagem não corta em 100 | A-222 | — |
| **485** | Baixa | frontend/configuracao-ia | Configurações da IA: a aba Prompts só carrega quando é aberta | A-223 | — |
| **486** | Baixa | backend (projeto, calendario, tag, relatorio, ponto-justificativa, modelagem, ia, configuracao-ia) | Permissão conferida na service, não só no decorador da rota | A-224, A-225 | — |

## Critérios de Aceite

- Cada task fecha pelos critérios da própria spec, com os gates do projeto (testes e build dos workspaces tocados, `npm run lint:tudo`, verificação ao vivo quando há mudança observável).
- A guarda-chuva fecha quando todas as tasks estiverem em `done/` ou em `discarded/` com a nota.

## Fora de Escopo

O que o dossiê registrou sem spec (seção "Achados sem spec"), desempenho de SQL sob carga e qualquer mudança de modelagem que o autor não tenha decidido.

## Dependências

O dossiê `docs/specs/active/revisao-requisicoes-e-permissoes/DOSSIE.md` e os dois anexos dele; `docs/SYSTEM.SPEC.md` §11, §12 e §14; a decisão viva "menos requisições nas telas" (tasks 320–325). As dependências entre tasks estão na seção "Dependências" de cada spec.

