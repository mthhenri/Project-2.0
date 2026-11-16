# Dossiê — Revisão de requisições e de permissões por tipo de usuário

Spec: `../revisao-requisicoes-e-permissoes.spec.md`. Anexos: [`MAPAS-DE-REQUISICOES.md`](MAPAS-DE-REQUISICOES.md) e [`MATRIZES-DE-PERMISSAO.md`](MATRIZES-DE-PERMISSAO.md). Specs de correção: `docs/specs/backlog/requisicoes-e-permissoes-correcoes.spec.md` (tasks 330–487). Evidências brutas, ignoradas pelo Git: `.artifacts/revisao-requisicoes-e-permissoes/`.

**Estado: cobertura incompleta em três pontos (seção 7); a revisão continua em `active/`.** Nenhum código foi alterado.

## 1. Resumo

- **225 achados** viraram **158 specs** (15 achados de severidade alta, 78 média, 118 baixa e 14 informativos). 8 achados ficaram sem spec, com o motivo (seção 5.2).
- **119** são de requisições e fluxo (inúteis, duplicadas, ineficientes, código sem uso, ordem que causa erro) e **106** de permissões por tipo de usuário.
- **57 specs dependem de decisão do autor** antes de começar: mudam contrato, reveem uma decisão anterior ou pedem uma regra que o `SYSTEM.SPEC.md` não escreve.
- **Verificação:** 43 achados foram reproduzidos ou medidos na aplicação rodando e 16 conferidos no código pelo agente principal; os demais são leitura de um auditor, com arquivo e linha das evidências conferidos por script. Cada spec diz qual é o caso e manda reproduzir antes de corrigir.

### Os mais graves

| Task | Achado | Como foi verificado |
|---|---|---|
| **487** | Project Desktop: conferir o check-in pelo horário sorteado, não a cada 15 s | código, pelo agente principal |
| **335** | Execuções de uma atividade: detalhe e diálogo de encerrar mostram as últimas, não as mais antigas | código, pelo agente principal |
| **359** | Supervisão do chat: a auditoria e o aviso não dependem do parâmetro `cursor` | ao vivo |
| **367** | IA: propor criar e mover atividade conferem o acesso à demanda antes de ler | código, pelo agente principal |
| **373** | Atividade: desenvolvedor membro da demanda não altera a atividade nem as tags de um colega | ao vivo |
| **374** | `PUT /execucao/:id` não reabre nem move execução criando duas ativas ou sobreposição | ao vivo |

### O que mais pesa no tráfego

- **Project Desktop** pede `GET /checkin/situacao` a cada 15 s, com ou sem execução (240 por hora por usuário): task **487**.
- **Tela de Demandas**: 10 requisições para abrir e 5 por demanda selecionada (a decisão da task 325 era 4). Uma das 5 não é usada por ninguém (**406**) e outra é o botão do chat perguntando pelo canal (**405**); a lista de destinos de conexão repete o grafo (**410**). Com as três, abrir cai para 7 e selecionar para 3.
- **Toda aba aberta** pede `GET /ia/disponibilidade` a cada 60 s, mesmo oculta (**330**), e cada foco da janela pede `GET /execucao/ativa` (**331**).
- **Carga da casca**: 8 requisições antes da tela (sessão, execução ativa, versão do Desktop, IA, check-in, stream do chat, lista de conversas e preferência). Duas saem com as tasks **338**, **337**.

### O que mais pesa nas permissões

- **Supervisão do chat** pode ser lida sem auditoria nem aviso (**359**), a lista entrega texto sem registro (**390**) e abrir um par que nunca conversou cria uma conversa (**391**).
- **Regras que só existem na tela ou na IA**, não na service: gestor como membro de demanda (**381**), duas execuções ativas pelo `PUT` (**374**), desenvolvedor alterando a atividade de um colega (**373**), pai não estrutural (**382**).
- **Ferramentas da IA** que leem a demanda sem conferir o acesso (**367**) e a IA respondendo em conversa compartilhada com a visão de quem chamou (**363**).
- **Auxiliar**: várias regras dele não estão escritas (canal, supervisão, plano) e ele recebe 403 a cada demanda que abre (**360**).

### O que está certo

- **Leitura por perfil**: 91 leituras chamadas sem login e como seis perfis contra um projeto secreto. Nenhuma entregou dado do projeto a desenvolvedor sem acesso; sem login, tudo responde 401; o que é só de administrador responde 403 aos demais (anexo de matrizes, seção 2).
- **Escrita por perfil**: 66 tentativas, uma por regra do `SYSTEM.SPEC.md` §14, com corpo válido. 55 responderam como a regra manda; 1 falhou (gestor aceito como membro de demanda); 4 responderam uma regra de negócio antes da permissão; 3 ficaram registradas para decisão (dono da atividade trocado em silêncio, gestor gravando no pad de outro); 3 não chegaram a testar a permissão por causa do corpo do roteiro (anexo de matrizes, seção 3).
- **As correções das tasks 320–325 continuam valendo**: Usuários pede a lista uma vez, os seletores usam `allRows`, o check-in não sonda mais a cada 20 s no navegador, a disponibilidade da IA não duplica na carga.
- **Chat entre colegas**: abrir o popup não pede nada, abrir uma conversa faz 2 requisições, 20 teclas geram 1 aviso de "digitando", enviar faz 1 e a busca de referência `#` faz 1 para 5 teclas.
- **Em repouso**, uma aba no navegador faz só a consulta de 60 s da IA: 180 s parados geraram 3 requisições.

## 2. Como foi feito

- **Leitura de código por unidade.** Auditores independentes (subagentes) leram cada tela, cada grupo de rotas do backend e a interface por tipo de usuário, com a instrução de só reportar o que tivessem lido, com `arquivo:linha`. Unidades: casca, sessão e check-in; Usuários, pad e Documentações; Demandas; chat entre colegas; Atividades, Execuções, Ponto e Calendário; chat com a IA e plano; Projetos, Relatório, Tags, Modelagem e Configurações da IA; Project Desktop; e, nas permissões, usuário/pad/projeto/ponto/calendário, demanda, atividade/execução/check-in, chat com a IA/propostas/ferramentas, plano, chat um a um e supervisão, grupos e canais, IA/prompts/custos/modelagem/desktop e a interface.
- **Conferência pelo agente principal.** Para cada achado, um script conferiu que o arquivo e a linha citados existem. Os de severidade alta e os de média que dão para exercitar foram reproduzidos na aplicação rodando ou relidos no código pelo agente principal; o resultado está em "Verificação na auditoria" de cada spec.
- **Aplicação rodando.** Stack local isolado (PostgreSQL 16 local, banco descartável `project20_revisao`, 90 migrations, backend na 3000, frontend na 4200 com o proxy da API, chat em Postgres, IA sem chave). Cenário montado pela API: administrador, gestor, auxiliar, três desenvolvedores, o projeto do seed e um projeto secreto com marcadores `SEGREDO-*` em demanda, atividade, execução, plano, conversa e grupo.
- **Medições** (Playwright, `1920×1080`): requisições de cada tela ao abrir e de interações escolhidas, como os quatro perfis; repouso; foco e volta à aba; excluir e desfazer demanda; chat. **Varreduras de permissão** pela API: 91 leituras × 7 perfis; todas as rotas de escrita com corpo vazio como quem não tem acesso; 66 tentativas de escrita com corpo válido; roteiros próprios para os achados graves.
- **Varreduras por script**: as 202 rotas com a trava declarada em cada uma; os 195 métodos do frontend que fazem HTTP e seus chamadores; temporizadores e ouvintes de foco e visibilidade; tetos fixos de paginação.
- **Limites.** A primeira tentativa, com um verificador independente por unidade, esgotou o limite de uso da sessão e foi trocada por auditores de escopo curto com a conferência feita pelo agente principal. Uma resolução só (a revisão é de tráfego e permissão, não visual). Volume pequeno: contagem de requisições é confiável, tempo de resposta sob carga não foi medido.

## 3. Requisições por tela

Resumo do que foi medido como administrador, navegando dentro da SPA. O detalhe por perfil e o mapa lido no código estão em [`MAPAS-DE-REQUISICOES.md`](MAPAS-DE-REQUISICOES.md).

| Tela ou fluxo | Requisições | Observação |
|---|---|---|
| Carga da casca (toda tela) | 8 | `/usuario/:id`, `/execucao/ativa`, `/desktop/versao`, `/ia/disponibilidade`, `/checkin/situacao`, stream `/mensagem-direta/eventos`, `/mensagem-direta/conversas`, `/mensagem-direta/preferencia` |
| Ponto (gestor / desenvolvedor) | 2 / 1 | gestor: usuários ativos e `/ponto/todos`; desenvolvedor: `/ponto/mensal` |
| Atividades | 3 | prioridades, usuários ativos e a página da lista |
| Detalhe da atividade | 4 | inclui `GET /execucao?atividadeId&itensPorPagina=200` |
| Execuções | 2 | usuários ativos e as execuções do dia |
| Documentações | 2 | lista de demandas com texto e o pad |
| Projetos | 1 | `itensPorPagina=100` fixo |
| Detalhe do projeto | 9 | embute a tela de Demandas: projeto, grafo, canal do projeto e as 6 da demanda aberta |
| Demandas (com projeto) | 10 | projetos, grafo, lista do projeto, tags, usuários e as 5 da primeira demanda |
| Selecionar uma demanda | 5 | plano de origem, detalhe, árvore, atividades e canal do chat; voltar a uma já vista repete as 5 |
| Calendário · Tags · Modelagem · Supervisão · Relatório | 1 cada | Modelagem devolve 28 KB |
| Usuários | 2 | textos de ajuda dos tipos e a página da lista (uma vez: task 320 conforme) |
| Configurações da IA | 6 | inclui os prompts e as versões antes de a aba Prompts ser aberta |
| Chat com a IA | 5 | conversas, planos, disponibilidade, conversa de hoje e demandas executadas |
| Foco da janela (3 vezes) | 3 | 3 `GET /execucao/ativa` |
| Voltar de aba oculta em Ponto | 4 | 2 `GET /execucao/ativa`, `GET /checkin/situacao` e a recarga da lista |
| Repouso de 180 s | 3 | só `GET /ia/disponibilidade` (60 s) |
| Excluir demanda | 9 | `DELETE` 200, `GET` da demanda excluída 404 com aviso de erro, mais 7 leituras |
| Desfazer a exclusão | 1 | `PATCH .../restaurar` e nenhuma leitura: a demanda não volta à tela |
| Chat entre colegas | 0 a 2 | abrir o popup 0; abrir conversa 2; enviar 1; 20 teclas 1; referência `#` 1 |

Por perfil: o desenvolvedor faz 9 requisições na carga inicial (a tela de Ponto dele pede uma a menos); gestor e auxiliar, 10, como o administrador. O auxiliar recebe 403 em `GET /mensagem-direta/canal/demanda/:id` a cada demanda aberta e em `/canal/projeto/:id` no detalhe do projeto. O desenvolvedor que digita a URL de um projeto sem acesso faz `GET /projeto/:id` (404) e `GET /demanda/grafo` (403).

## 4. Permissões por tipo de usuário

As quatro tabelas estão em [`MATRIZES-DE-PERMISSAO.md`](MATRIZES-DE-PERMISSAO.md): a trava declarada em cada uma das 202 rotas, as leituras medidas por perfil, as regras de escrita exercitadas e a matriz rota × tipo lida no código por módulo.

- **Trava na rota:** 35 rotas com `@GestorOnly`, 16 com `@AdministradorOnly`, 13 com `@ExigePermissao(...)`, 1 pública (login) e 137 sem decorador de permissão, das quais 72 são escritas cuja regra está só na service. É nessas 72 que estão quase todos os achados de permissão.
- **Padrão que se repete:** a regra existe na tela, ou na ferramenta e no executor da IA, e falta na service que os dois caminhos chamam. As specs levam a regra para a service e tiram a cópia.
- **Ordem das validações:** em execução (iniciar e encerrar), em mover atividade e em publicar plano, uma regra de negócio é respondida antes da permissão e revela status ou existência a quem não tem acesso.
- **403 × 404:** projeto e demanda respondem 404 a quem não enxerga o registro; atividade, execução, grafo, canal, grupo e proposta respondem 403. A regra única é decisão do autor.
- **Documento:** o `SYSTEM.SPEC.md` não escreve as regras do auxiliar no chat (canal e supervisão) nem as do plano por tipo, e ainda diz "só gestor" em pontos que o código libera ao auxiliar.

## 5. Achados

### 5.1 Achados com spec

`A-NNN` é o número do achado neste dossiê. Severidade: Alta = falha de permissão explorável, dado revelado ou tráfego contínuo relevante; Média = desperdício em fluxo frequente, erro visível ou regra divergente; Baixa = desperdício pequeno, inconsistência sem efeito hoje, falta de teste; Informativo = registro que pede decisão.

#### Casca, sessão, check-in e Project Desktop

| Achado | Sev. | Tipo | O que é | Verificação | Task |
|---|---|---|---|---|---|
| A-001 | Alta | ineficiência | Project Desktop: o processo principal pede GET /checkin/situacao a cada 15 s, com ou sem execução (240/h por usuário) | código, pelo agente principal | **487** |
| A-002 | Alta | ineficiência | Processo principal do Desktop pede GET /checkin/situacao a cada 15 s, com ou sem execução, com a janela à vista ou na bandeja | código, pelo agente principal | **487** |
| A-003 | Alta | ineficiência | Processo principal pede GET /mensagem-direta/preferencia a cada 60 s só para saber o atalho global | código, pelo agente principal | **487** |
| A-004 | Alta | requisição inútil | GET /ia/disponibilidade a cada 15 s enquanto o check-in está disparado e a janelinha não pode abrir | código, pelo agente principal | **487** |
| A-005 | Média | ineficiência | Barra lateral pede GET /ia/disponibilidade a cada 60 s em toda aba, visível ou oculta | ao vivo | **330** |
| A-006 | Média | ineficiência | Janela principal oculta na bandeja segue pedindo como se estivesse à vista | ao vivo | **330** |
| A-007 | Média | ineficiência | Cada foco da janela dispara GET /execucao/ativa sem guarda; voltar à aba dispara 2 e mais um GET /checkin/situacao | ao vivo | **331** |
| A-008 | Média | requisição duplicada | GET /execucao/ativa em dobro ao voltar à aba e de novo a cada abertura do detalhe | ao vivo | **331** |
| A-009 | Média | erro de fluxo | Leituras de fundo da casca mostram o toast global de erro quando falham (a cada 60 s, a cada foco e a cada 3 s no check-in) | código, por auditor | **332** |
| A-010 | Média | ineficiência | Diálogo do check-in aberto confere GET /checkin/situacao a cada 3 s sem teto de tempo | código, por auditor | **333** |
| A-011 | Média | ineficiência | GET /checkin/situacao lista todas as execuções da atividade só para achar três nomes | código, por auditor | **334** |
| A-012 | Alta | erro de fluxo | Detalhe da atividade mostra como 'Execuções recentes' as 5 mais antigas e perde a execução aberta (unidade de Atividades, achado ao seguir listarExecucoesPorAtividade) | código, pelo agente principal | **335** |
| A-013 | Alta | ineficiência | Diálogo 'Encerrar execução' pede até 200 execuções da atividade, em ordem crescente: acima de 200 a própria execução aberta some do cabeçalho | código, pelo agente principal | **335** |
| A-014 | Alta | erro de fluxo | Detalhe da atividade: 'execuções recentes' e a execução em andamento saem dos 5 itens mais antigos da lista | código, pelo agente principal | **335** |
| A-015 | Alta | ineficiência | GET /execucao?atividadeId=:id&itensPorPagina=200: 200 linhas para usar 5, repetido a cada ação | código, pelo agente principal | **335** |
| A-016 | Baixa | erro de fluxo | 'Próximo check-in' do menu do perfil fica montado a sessão inteira e não reconsulta ao abrir: mostra horário velho depois de suspender ou retomar | código, por auditor | **336** |
| A-017 | Baixa | requisição duplicada | Janelinha recebe a situação 'disparado' e a página embutida pede GET /checkin/situacao de novo; ao fechar, a janelinha pede outra vez | código, por auditor | **336** |
| A-018 | Baixa | requisição inútil | Logo após o login a casca pede GET /usuario/:id, que repete o usuário que o login acabou de devolver | código, por auditor | **337** |
| A-019 | Baixa | requisição inútil | GET /desktop/versao é pedido em toda carga da aplicação, mas só aparece dentro do menu do perfil | ao vivo | **338** |
| A-020 | Baixa | requisição inútil | Perfil: `GET /desktop/versao` sai em toda carga da casca para um botão que fica dentro do menu do perfil | ao vivo | **338** |
| A-021 | Baixa | requisição inútil | GET /desktop/versao em toda carga da aplicação web, para um botão que só existe dentro do popover do perfil | ao vivo | **338** |
| A-022 | Baixa | requisição inútil | Todo PATCH /execucao/:id/encerrar é seguido de GET /execucao/ativa, embora a resposta e o id da URL já digam o resultado | código, por auditor | **339** |
| A-023 | Média | permissão na interface | O tipo do usuário na sessão só é conferido quando o layout nasce; um 403 não o atualiza | código, por auditor | **340** |
| A-024 | Média | permissão na interface | Guards e menu decidem com o usuario_sessao do localStorage; a reconferência é única, assíncrona e posterior aos guards, e o 403 não reconfere | código, por auditor | **340** |
| A-025 | Média | erro de fluxo | Sessão expirada (401) apaga só o localStorage: usuário e execução ativa da sessão anterior ficam em memória para o próximo login | código, por auditor | **341** |
| A-026 | Média | dado revelado | 401 limpa só o localStorage: usuário e execução ativa ficam em memória, diferente do logout | código, por auditor | **341** |
| A-027 | Média | dado revelado | Logout não zera services singleton nem as chaves do navegador que não são por usuário | código, por auditor | **341** |
| A-028 | Baixa | erro de fluxo | 'Desfazer' que falha some sem nova chance | código, por auditor | **342** |
| A-029 | Baixa | código sem uso | Código sem uso na casca e no check-in: sinal usuarioAutenticado, slot slotCheckin da topbar e rota GET /checkin/suspensao | código, por auditor | **343** |

#### Usuários, pad e Documentações

| Achado | Sev. | Tipo | O que é | Verificação | Task |
|---|---|---|---|---|---|
| A-030 | Média | erro de fluxo | Pad: depois de sair da tela Usuários (ou de sair e entrar de novo na mesma aba), o pad de Documentações e da aba Anotações do chat para de gravar sozinho | código, pelo agente principal | **344** |
| A-031 | Média | dado revelado | Pad: o texto das seções fica em memória depois de sair; se a carga do pad do próximo usuário falhar, o painel mostra o pad do anterior | código, pelo agente principal | **344** |
| A-032 | Média | erro de fluxo | Usuários: buscar ou filtrar fora da página 1 pede a página 1, mas o paginador continua na página antiga (e às vezes dispara uma segunda requisição) | código, por auditor | **345** |
| A-033 | Média | erro de fluxo | Usuários: depois de "Limpar", digitar o mesmo termo de antes não busca | código, por auditor | **345** |
| A-034 | Média | ineficiência | Usuários: cada busca, filtro ou recarga abre uma requisição nova sem cancelar a anterior | código, por auditor | **345** |
| A-035 | Baixa | erro de fluxo | Documentações: conflito de versão (409) em `PATCH /demanda/:id/textos` mostra também o toast "Erro interno. Tente novamente." | código, por auditor | **346** |
| A-036 | Baixa | requisição inútil | Usuários: editar faz `GET /usuario/:id`, `PUT /usuario/:id` e recarrega a lista; a resposta do PUT já traz a linha | código, por auditor | **347** |
| A-037 | Baixa | erro de fluxo | Usuários: editar o próprio cadastro não atualiza o nome na barra superior, embora a resposta do PUT traga o usuário | código, por auditor | **347** |
| A-038 | Baixa | requisição inútil | Documentações: o pad é carregado ao abrir a tela mesmo quando está recolhido | código, por auditor | **348** |
| A-039 | Baixa | ineficiência | Documentações: ao abrir, `GET /demanda/:id` espera `GET /demanda/documentacao` mesmo quando a demanda guardada já é conhecida | código, por auditor | **349** |
| A-040 | Baixa | erro de fluxo | Documentações: depois de Gravar, o ícone da aba e as marcas do seletor não acompanham o texto gravado | código, por auditor | **350** |
| A-041 | Baixa | requisição inútil | Pad: toda abertura da gaveta refaz `GET /anotacao?usuarioId`, inclusive com o mesmo pad já na tela | código, por auditor | **351** |
| A-042 | Baixa | ineficiência | Gravações do pad e dos textos da demanda devolvem o texto inteiro que acabaram de receber; a tela só lê `updatedDate` e `versao` | código, por auditor | **352** |
| A-043 | Baixa | ineficiência | `GET /usuario` calcula `temAnotacoes` varrendo o texto das seções do pad de cada usuário, também nas listas de seletor que não usam o campo | código, por auditor | **353** |
| A-044 | Baixa | dado revelado | `GET /usuario` devolve `temAnotacoes` de todos os usuários a quem não pode abrir aquele pad | código, por auditor | **353** |
| A-045 | Baixa | regra inconsistente | Usuários: a trava de "não inativar nem excluir a si mesmo" existe só na tela; `PUT /usuario/:id` e `DELETE /usuario/:id` aceitam | código, por auditor | **354** |
| A-046 | Baixa | permissão no backend | Usuário pode inativar ou excluir a si mesmo | código, por auditor | **354** |
| A-047 | Informativo | permissão na interface | Usuários: `podeEditar` libera Editar e Alterar senha para "a própria pessoa", que o backend recusa a quem não é gestor; hoje o guard da rota esconde a diferença | código, por auditor | **355** |
| A-048 | Informativo | requisição inútil | Usuários: Excluir aparece para todo usuário gerenciável, mas `DELETE /usuario/:id` responde 400 a quem tem execução registrada | código, por auditor | **356** |
| A-049 | Informativo | ineficiência | Documentações: novo pedido à IA ou troca de demanda não cancela o `POST /assistente/alterar-trecho` em curso | código, por auditor | **357** |
| A-050 | Baixa | código sem uso | Código sem uso na unidade: tipos de `usuario.model.ts`, `textosPreenchidos`, opção `secoesAbertas` do pad, entrada `editavel` do diálogo do pad e parâmetro `forcar` de `TipoUsuarioAjudaService.carregar` | código, por auditor | **358** |

#### Permissões: chat em grupo, canais, propostas e ferramentas da IA

| Achado | Sev. | Tipo | O que é | Verificação | Task |
|---|---|---|---|---|---|
| A-051 | Alta | permissão no backend | Supervisão de grupo e canal: qualquer cursor pula a auditoria e o aviso aos membros | ao vivo | **359** |
| A-052 | Alta | permissão no backend | Supervisão: cursor forjado lê a conversa inteira sem auditoria nem aviso | ao vivo | **359** |
| A-053 | Média | código × documento | AUXILIAR recebe 403 no chat de demanda e de projeto apesar da visão total | ao vivo | **360** |
| A-054 | Média | regra inconsistente | Gestor lê conteúdo do canal sem auditoria pelas fixadas, pela última mensagem e pela lista da supervisão | código, por auditor | **361** |
| A-055 | Média | código × documento | Grupo "privado" volta à supervisão quando o gestor sai, com todo o histórico e sem aviso | código, por auditor | **362** |
| A-056 | Média | dado revelado | @IA no grupo consulta com a permissão de quem chamou e publica a resposta a todos; a única barreira é o prompt | código, por auditor | **363** |
| A-057 | Média | dado revelado | @IA no chat: dados lidos com a permissão de quem chamou vão ao outro participante, protegidos só pelo prompt | código, por auditor | **363** |
| A-058 | Média | dado revelado | Conversa do plano é lida por todos, mas as ferramentas de leitura rodam com a visão de quem enviou | código, por auditor | **363** |
| A-059 | Baixa | falta de teste | Nenhum teste de grupo ou canal com AUXILIAR, nem da supervisão com cursor | código, por auditor | **364** |
| A-060 | Baixa | falta de teste | Sem teste por tipo AUXILIAR no chat um a um e na supervisão; bordas da auditoria sem teste | código, por auditor | **364** |
| A-061 | Baixa | regra inconsistente | Proposta do resumo pode ser confirmada ou desfeita pela rota geral, fora das checagens do resumo | código, por auditor | **365** |
| A-062 | Informativo | código × documento | Grupo livre sem dono: qualquer membro adiciona qualquer pessoa ativa, ninguém remove e quem entra lê todo o histórico | código, por auditor | **366** |
| A-063 | Alta | dado revelado | propor_criar_atividade revela o caminho de demanda de projeto sem acesso ao desenvolvedor | código, pelo agente principal | **367** |
| A-064 | Alta | dado revelado | Mover atividade responde nome e status da demanda de destino antes de conferir o acesso | código, pelo agente principal | **367** |
| A-065 | Alta | dado revelado | Ferramentas propor_criar_atividade e propor_mover_atividade revelam nome, caminho e status de demanda sem acesso | código, pelo agente principal | **367** |
| A-066 | Média | permissão no backend | Ajuste que falha deixa a proposta pendente com os dados enviados pelo cliente, inclusive em proposta de outra pessoa | código, por auditor | **368** |
| A-067 | Baixa | permissão no backend | Quem não pode editar a aba recusa (expira) a proposta de trecho do plano de outra pessoa | código, por auditor | **369** |
| A-068 | Média | regra inconsistente | POST /assistente/auxiliar-descricao chama a IA sem usuário, sem limite de tamanho e sem registrar o uso | código, por auditor | **370** |
| A-069 | Baixa | código × documento | Desfazer a criação de demanda exclui a demanda sem conferir quem pode excluir | código, por auditor | **371** |
| A-070 | Baixa | regra inconsistente | DemandaService.excluir não recebe usuário: o desfazer de CRIAR_DEMANDA exclui demanda para desenvolvedor e auxiliar | código, por auditor | **371** |
| A-071 | Baixa | regra inconsistente | consultar_demanda e consultar_grafo_do_projeto são vedadas ao desenvolvedor, que vê as duas coisas pela rota HTTP | código, por auditor | **372** |

#### Permissões: demanda, atividade e execução

| Achado | Sev. | Tipo | O que é | Verificação | Task |
|---|---|---|---|---|---|
| A-072 | Alta | permissão no backend | Desenvolvedor membro da demanda altera atividade e tags de outro usuário | ao vivo | **373** |
| A-073 | Alta | regra inconsistente | PUT /execucao/:id reabre execução e muda o período sem conferir execução ativa nem sobreposição; a IA confere | ao vivo | **374** |
| A-074 | Média | dado revelado | Execução: regra de negócio respondida antes da permissão em iniciar (2 regras) e encerrar (1 regra) | ao vivo | **375** |
| A-075 | Média | regra inconsistente | POST /atividade troca o dono em silêncio e não valida o dono pedido; a ferramenta de IA recusa e valida | ao vivo | **376** |
| A-076 | Média | regra inconsistente | Dono que não é membro da demanda altera a atividade mas não consegue lê-la | código, por auditor | **377** |
| A-077 | Média | regra inconsistente | Excluir e restaurar atividade: a rota recusa todo desenvolvedor, a IA permite ao dono | código, por auditor | **378** |
| A-078 | Baixa | permissão no backend | ExecucaoService.registrar e excluir não conferem tipo nem dono: a trava é só o decorador da rota | código, por auditor | **379** |
| A-079 | Baixa | código × documento | Mover atividade só existe pela IA e não tem regra de projeto escrita | código, por auditor | **380** |
| A-080 | Média | permissão no backend | POST /demanda/:id/membro e usuarioIds do POST /demanda aceitam gestor, administrador e usuário inativo como membro | ao vivo | **381** |
| A-081 | Média | regra inconsistente | PUT /demanda/:id move a demanda para pai não estrutural; POST /demanda e a IA recusam | código, por auditor | **382** |
| A-082 | Baixa | dado revelado | demandaPaiId de outro projeto responde 400 (existe) em vez de 404; a ferramenta propor_criar_demanda lê o pai sem filtro de acesso | código, por auditor | **383** |
| A-083 | Baixa | código × documento | GET /demanda entrega ao desenvolvedor só as demandas em que é membro, não as do projeto acessível | código, por auditor | **384** |
| A-084 | Baixa | código × documento | "Último membro" trava a remoção até para o gestor, mas a demanda nasce sem membro quando criada por condutor | código, por auditor | **385** |
| A-085 | Baixa | código × documento | criarConexao não confere se origem e destino são do mesmo projeto | código, por auditor | **386** |
| A-086 | Baixa | erro de fluxo | Ferramentas propor_concluir/alterar/descrever_demanda criam cartão para desenvolvedor que não é membro; o 403 só vem no Confirmar | código, por auditor | **387** |
| A-087 | Informativo | código × documento | "Edita só onde é membro" não segura o desenvolvedor: ele se inclui em qualquer demanda de projeto acessível e passa a editar | código, por auditor | **388** |
| A-088 | Baixa | falta de teste | Regras sensíveis de demanda sem teste por tipo de usuário | código, por auditor | **389** |

#### Permissões: supervisão do chat e plano

| Achado | Sev. | Tipo | O que é | Verificação | Task |
|---|---|---|---|---|---|
| A-089 | Média | dado revelado | Listagem da supervisão entrega o texto das mensagens e aceita busca por texto e período sem auditoria nem aviso | ao vivo | **390** |
| A-090 | Média | permissão no backend | Supervisão de par que nunca conversou: o GET grava auditoria e cria mensagem do sistema | ao vivo | **391** |
| A-091 | Média | código × documento | Auxiliar na supervisão: o código o trata como desenvolvedor, a regra escrita não diz | código, por auditor | **392** |
| A-092 | Baixa | código × documento | Gestor rebaixado: conversas antigas dele viram supervisionáveis | código, por auditor | **393** |
| A-093 | Baixa | regra inconsistente | Referência #: demanda vale por projeto, atividade vale por demanda | código, por auditor | **394** |
| A-094 | Baixa | dado revelado | Proposta do @IA: quem tem visão total vê a proposta sem passar pelo `podeVer` do executor | código, por auditor | **395** |
| A-095 | Média | dado revelado | Plano solo de projeto continua com o criador depois que ele perde o acesso ao projeto | código, por auditor | **396** |
| A-096 | Média | permissão no backend | Criador marca como solo um plano já compartilhado e tira gestor e administrador de tudo | ao vivo | **397** |
| A-097 | Média | permissão no backend | Ferramentas do plano aceitam `planoId` vindo do modelo, não o plano da conversa | código, por auditor | **398** |
| A-098 | Baixa | dado revelado | Publicar responde regra de negócio antes da permissão de editar a demanda | código, por auditor | **399** |
| A-099 | Baixa | código × documento | SPEC se contradiz sobre quem lê a aba do cliente no plano | código, por auditor | **400** |
| A-100 | Baixa | código × documento | Regras de arquivar, excluir, solo, atribuir projeto e fontes não estão escritas no SPEC | código, por auditor | **400** |
| A-101 | Baixa | falta de teste | Módulo plano sem teste com AUXILIAR e sem os casos de borda de acesso | código, por auditor | **401** |
| A-102 | Informativo | permissão no backend | Trocar a demanda ligada exige editar só a demanda nova | código, por auditor | **402** |
| A-103 | Informativo | código × documento | Plano arquivado continua editável e publicável por quem tem acesso | código, por auditor | **403** |

#### Tela de Demandas

| Achado | Sev. | Tipo | O que é | Verificação | Task |
|---|---|---|---|---|---|
| A-104 | Média | erro de fluxo | Excluir demanda: a demanda excluída é pedida de novo (404 com aviso) e a vizinha é carregada inteira | ao vivo | **404** |
| A-105 | Média | erro de fluxo | Desfazer a exclusão não recarrega nada: o aviso vai para um componente já desmontado | ao vivo | **404** |
| A-106 | Média | permissão na interface | Botão de chat pergunta ao servidor em toda seleção e recebe 403 para auxiliar e desenvolvedor que não são membros | ao vivo | **405** |
| A-107 | Média | ineficiência | Botão do chat da demanda/projeto pede o canal a cada demanda selecionada, sem guardar | ao vivo | **405** |
| A-108 | Média | permissão na interface | Botão de canal consulta o backend para todos os tipos e usa o 403 como resposta; auxiliar não membro sempre recebe 403 | ao vivo | **405** |
| A-109 | Média | requisição inútil | GET /demanda/:id/arvore é pedido em toda seleção e a resposta não é usada em lugar nenhum | ao vivo | **406** |
| A-110 | Média | erro de fluxo | Estimativa/previsão inline: as releituras saem antes do PUT e podem devolver o valor antigo | código, por auditor | **407** |
| A-111 | Média | requisição duplicada | Salvar a edição pelo botão Editar faz GET /demanda/:id duas vezes | código, por auditor | **408** |
| A-112 | Média | erro de fluxo | Depois de salvar a edição, tags e membros do cabeçalho da demanda aberta não são relidos | código, por auditor | **408** |
| A-113 | Média | requisição inútil | Toda alteração feita na demanda aberta recarrega o grafo do projeto e relê a demanda, mesmo com a tela já atualizada | código, por auditor | **409** |
| A-114 | Média | ineficiência | GET /demanda?projetoId&allRows repete o que o grafo já trouxe, é carga antecipada e fica desatualizada | ao vivo | **410** |
| A-115 | Média | erro de fluxo | Seleção rápida de demandas: nada é cancelado e resposta atrasada pode sobrescrever a demanda aberta | código, por auditor | **411** |
| A-116 | Baixa | ineficiência | Voltar a uma demanda já vista e trocar de modo refazem a carga inteira | código, por auditor | **412** |
| A-117 | Baixa | ineficiência | Diálogos de edição e de tags leem em 3 a 4 chamadas o que /detalhe ou o grafo já entregam | código, por auditor | **413** |
| A-118 | Baixa | ineficiência | Membros são gravados com uma requisição por pessoa e a lista é relida em seguida | código, por auditor | **414** |

#### Chat entre colegas (tráfego)

| Achado | Sev. | Tipo | O que é | Verificação | Task |
|---|---|---|---|---|---|
| A-119 | Média | ineficiência | `SINCRONIZAR` é um único evento de "relê tudo": fixar uma mensagem faz cada membro reler lista, mensagens e fixadas | código, por auditor | **415** |
| A-120 | Média | requisição inútil | Criar ou alterar grupo, adicionar membros e sair: a resposta já traz o grupo, mas o eco `SINCRONIZAR` relê tudo no próprio autor | código, por auditor | **415** |
| A-121 | Média | erro de fluxo | `SINCRONIZAR` descarta o histórico já carregado da conversa ou do grupo aberto | código, por auditor | **415** |
| A-122 | Baixa | requisição inútil | Abrir conversa ou grupo já lido envia PUT de leitura mesmo sem não lidas | código, por auditor | **416** |
| A-123 | Baixa | requisição duplicada | Primeira mensagem de conversa nova: a resposta do POST e o evento do stream pedem a lista cada um | código, por auditor | **417** |
| A-124 | Baixa | requisição inútil | "Criar chat" da demanda/projeto relê a lista inteira embora o POST devolva o grupo | código, por auditor | **417** |
| A-125 | Baixa | ineficiência | `GET /mensagem-direta/pessoas` repetido a cada abertura de Nova conversa, Novo grupo e Detalhes do grupo | código, por auditor | **418** |
| A-126 | Baixa | ineficiência | Abrir grupo: mensagens e fixadas em cascata, e as fixadas relidas em toda releitura | código, por auditor | **419** |
| A-127 | Baixa | ineficiência | Propostas da IA: uma requisição por proposta, sem guardar o resultado | código, por auditor | **420** |

#### Permissões: usuário, login, pad, ponto, calendário e administração da IA

| Achado | Sev. | Tipo | O que é | Verificação | Task |
|---|---|---|---|---|---|
| A-128 | Média | permissão no backend | Login sem limite de tentativas nem bloqueio | código, por auditor | **421** |
| A-129 | Baixa | dado revelado | Login distingue usuário inativo antes de conferir a senha | código, por auditor | **422** |
| A-130 | Média | permissão no backend | Troca de senha não derruba tokens já emitidos | código, por auditor | **423** |
| A-131 | Média | código × documento | Troca de senha: só gestor/administrador, sem senha atual; auxiliar e desenvolvedor não trocam a própria | código, por auditor | **424** |
| A-132 | Média | dado revelado | GET /usuario entrega ao auxiliar login e temAnotacoes de todos os usuários | ao vivo | **425** |
| A-133 | Média | código × documento | Pad: gestor e administrador também escrevem no pad de desenvolvedor/auxiliar, inclusive na seção PESSOAL | ao vivo | **426** |
| A-134 | Baixa | regra inconsistente | Justificativa: a rota aceita o próprio ponto e qualquer alvo; a IA recusa o próprio | código, por auditor | **427** |
| A-135 | Baixa | código × documento | Promover a gestor não trata as linhas de demanda_usuario nem execução ativa | código, por auditor | **428** |
| A-136 | Baixa | permissão no backend | Guarda do último administrador ativo sem proteção de concorrência | código, por auditor | **429** |
| A-137 | Informativo | código × documento | Calendário: leituras abertas aos quatro tipos, sem regra escrita no resumo | ao vivo | **430** |
| A-138 | Informativo | código sem uso | Condicionais de gestor inalcançáveis em telas já fechadas por gestorGuard; campo substituidoPelaIa sem uso | ao vivo | **430** |
| A-139 | Baixa | dado revelado | Preço do modelo (dado da aba Custos) chega a qualquer membro de grupo pela estimativa do resumo | código, por auditor | **431** |
| A-140 | Baixa | falta de teste | ia-custo: @AdministradorOnly por método e nenhum teste de rota fixando a trava | código, por auditor | **432** |
| A-141 | Baixa | falta de teste | AUXILIAR não aparece em nenhum teste de permissão destes módulos nem nos testes do GestorGuard e do AdministradorGuard | código, por auditor | **432** |
| A-142 | Informativo | regra inconsistente | Ativar, restaurar e descartar prompt e alterar preço não registram qual administrador agiu | código, por auditor | **433** |
| A-143 | Informativo | código × documento | Spec e comentário da service de custos dizem que só o chat entra na conta, mas o código já registra chamadas fora do chat; o teste de prompt não é registrado | código, por auditor | **434** |

#### Atividades, Execuções, Ponto e Calendário (tráfego)

| Achado | Sev. | Tipo | O que é | Verificação | Task |
|---|---|---|---|---|---|
| A-144 | Média | ineficiência | Ação em massa nas atividades: uma requisição por item, todas ao mesmo tempo | código, por auditor | **435** |
| A-145 | Média | permissão no backend | Ação em massa nas atividades: não há rota; a trava do auxiliar é só da tela | código, por auditor | **435** |
| A-146 | Média | ineficiência | GET /usuario?ativo=true&allRows=true a cada entrada em /atividade, /execucao e /ponto e a cada 'Nova atividade' | ao vivo | **436** |
| A-147 | Média | ineficiência | Listas não cancelam a requisição anterior: resposta atrasada pode sobrescrever a mais nova | código, por auditor | **437** |
| A-148 | Média | ineficiência | Volume e Custos: cada clique na navegação de período dispara uma consulta, sem cancelar a anterior nem reaproveitar o que já veio | código, por auditor | **437** |
| A-149 | Média | ineficiência | Busca do seletor: não cancela a anterior, e limpar relê as conversas que a busca não mexeu | código, por auditor | **437** |
| A-150 | Média | erro de fluxo | Pausar pelo chip em /execucao ou /ponto não atualiza a tela | código, por auditor | **438** |
| A-151 | Baixa | requisição inútil | 'Nova atividade' recarrega três listas a cada abertura; tags fora do catálogo de 60 s | código, por auditor | **439** |
| A-152 | Baixa | requisição inútil | Recarga da lista inteira depois de mutação cuja resposta já traz o dado | código, por auditor | **440** |
| A-153 | Baixa | ineficiência | Demanda ao lado da lista de atividades: demanda inteira para um texto, relida depois de salvar | código, por auditor | **441** |
| A-154 | Baixa | ineficiência | Detalhe da atividade: duas requisições para atividade e tags, e a atividade relida a cada mudança de execução | ao vivo | **442** |
| A-155 | Baixa | ineficiência | Diálogo de justificativa pede o usuário inteiro só pela jornada diária | código, por auditor | **443** |

#### Chat com a IA e plano (tráfego)

| Achado | Sev. | Tipo | O que é | Verificação | Task |
|---|---|---|---|---|---|
| A-156 | Média | ineficiência | Cada mensagem enviada termina com três leituras: GET /ia/disponibilidade, GET /chat/conversas e GET /plano | código, por auditor | **444** |
| A-157 | Média | requisição inútil | Plano: toda alteração relê GET /chat/conversas e GET /plano (R-10 segue igual) | código, por auditor | **445** |
| A-158 | Média | requisição inútil | Plano: pontos, fontes e publicação relêem tudo depois de cada mutação | código, por auditor | **445** |
| A-159 | Média | ineficiência | Uma requisição por proposta ao abrir conversa; a segunda proposta ao vivo relê a primeira | código, por auditor | **446** |
| A-160 | Média | erro de fluxo | "Confirmar todas" e "Ajustar" não ressincronizam a execução ativa da topbar | código, por auditor | **447** |
| A-161 | Média | erro de fluxo | "Desfazer" do toast no cartão faz um GET a mais e não avisa a página: documento do plano e anotações ficam com o que foi desfeito | código, por auditor | **448** |
| A-162 | Média | ineficiência | Demanda aberta ao lado do chat: atividades em cascata e com teto fixo de 100 | código, por auditor | **449** |
| A-163 | Baixa | requisição inútil | GET /plano ao abrir /chat não é usado até o seletor abrir ou o usuário entrar em Planejamento | ao vivo | **450** |
| A-164 | Baixa | requisição duplicada | Entrar em Planejamento pede GET /plano de novo e só então abre o plano (cascata de 1 + 4) | ao vivo | **450** |
| A-165 | Baixa | erro de fluxo | "Minhas demandas" e a demanda aberta não se atualizam depois de proposta confirmada | código, por auditor | **451** |
| A-166 | Baixa | ineficiência | GET /demanda/executadas?limite=20 repetido a cada volta à lista | código, por auditor | **451** |
| A-167 | Baixa | ineficiência | "Ligar a uma demanda": a lista inteira de demandas do projeto é pedida a cada clique, inclusive no que fecha o popover | código, por auditor | **452** |
| A-168 | Baixa | erro de fluxo | Bom dia e retomada não definem o destino da resposta: depois de uma mensagem em Planejamento, a retomada cai na conversa do plano | código, por auditor | **453** |

#### Permissões na interface

| Achado | Sev. | Tipo | O que é | Verificação | Task |
|---|---|---|---|---|---|
| A-169 | Média | regra inconsistente | Editar a própria execução: o backend permite ao desenvolvedor (inclusive início e fim), o front esconde | código, por auditor | **454** |
| A-170 | Baixa | regra inconsistente | Descrição obrigatória ao encerrar execução: o backend decide pelo dono da atividade, dois pontos do front decidem por quem está logado | código, por auditor | **455** |
| A-171 | Baixa | permissão na interface | Item 'Tags' do menu de contexto da demanda aparece ao desenvolvedor em demanda da qual não é membro; o backend recusa | código, por auditor | **456** |
| A-172 | Baixa | permissão na interface | Deep link de anotações abre o pad sem aplicar a regra que o botão da listagem aplica | ao vivo | **457** |
| A-173 | Baixa | regra inconsistente | Projetos: o menu esconde do desenvolvedor o que a rota, o backend e a SPEC permitem; ?projetoId da URL não é conferido | ao vivo | **458** |
| A-174 | Baixa | regra inconsistente | Menu esconde Projetos do desenvolvedor, mas a rota /projeto não tem guard | ao vivo | **458** |
| A-175 | Baixa | permissão na interface | Token presente sem usuario_sessao: o app abre sem usuário e não reconstrói a sessão | código, por auditor | **459** |
| A-176 | Baixa | regra inconsistente | Comparação direta de TipoUsuarioEnum e flags de menu por tipo em vez das funções do shared | código, por auditor | **460** |
| A-177 | Baixa | regra inconsistente | Regras de permissão reescritas no front, fora do shared | código, por auditor | **460** |

#### Project Desktop

| Achado | Sev. | Tipo | O que é | Verificação | Task |
|---|---|---|---|---|---|
| A-178 | Média | requisição duplicada | Check-in pendente no Desktop: até três consultas de 3 s à mesma rota ao mesmo tempo, e a abertura da janelinha repete as duas leituras que o processo principal acabou de fazer | código, por auditor | **461** |
| A-179 | Baixa | ineficiência | Cada abertura da janela de chat carrega a SPA inteira e abre um segundo stream de eventos | código, por auditor | **462** |
| A-180 | Baixa | ineficiência | Janela /chat-popup do Desktop abre um segundo stream e repete lista e preferência | código, por auditor | **462** |
| A-181 | Baixa | ineficiência | Baixar a versão nova pela bandeja abre o Project inteiro no navegador só para iniciar um download | código, por auditor | **463** |
| A-182 | Baixa | ineficiência | Instalador é baixado inteiro para a memória da página antes de ser salvo | código, por auditor | **464** |
| A-183 | Baixa | ineficiência | Front fora do ar: a janela principal tenta recarregar a cada 5 s, sem recuo, mesmo oculta | código, por auditor | **465** |
| A-184 | Informativo | erro de fluxo | Conferência de versão do Desktop: falha de rede conta como feita e a leitura da situação espera por ela | código, por auditor | **466** |

#### Projetos, Relatório, Tags, Modelagem e Configurações da IA (tráfego)

| Achado | Sev. | Tipo | O que é | Verificação | Task |
|---|---|---|---|---|---|
| A-185 | Média | erro de fluxo | Relatório: a revisão por IA pedida antes de trocar o filtro aparece ao lado do relatório novo | código, por auditor | **467** |
| A-186 | Média | requisição inútil | Prompts: toda mutação relê GET /prompt e GET /prompt/:tipo/versoes, embora a resposta já traga o prompt gravado | código, por auditor | **468** |
| A-187 | Média | requisição inútil | Configurações da IA: salvar versão dispara três GETs, um deles devolve o mesmo objeto que o POST acabou de devolver | código, por auditor | **469** |
| A-188 | Média | ineficiência | Volume dentro do projeto pede o volume de todos os projetos e filtra no navegador | código, por auditor | **470** |
| A-189 | Média | requisição inútil | Modelagem: trocar o grupo de uma tabela relê o diagrama inteiro (28 KB), embora o PUT devolva grupo e posição | código, por auditor | **471** |
| A-190 | Baixa | ineficiência | Tags: excluir selecionadas faz um DELETE por tag e o desfazer um PATCH por tag | código, por auditor | **472** |
| A-191 | Baixa | ineficiência | Relatório aberto pelo projeto pede a lista inteira de projetos para mostrar a identidade de um | código, por auditor | **473** |
| A-192 | Baixa | requisição inútil | Visão Volume: a visão que está escondida é carregada do mesmo jeito | código, por auditor | **474** |
| A-193 | Baixa | requisição inútil | Desfazer a exclusão de um projeto recarrega a lista inteira | código, por auditor | **475** |
| A-194 | Baixa | ineficiência | Configurações da IA: GET /ia/modelos só começa depois que as três leituras da página terminam | código, por auditor | **476** |

#### Transversais

| Achado | Sev. | Tipo | O que é | Verificação | Task |
|---|---|---|---|---|---|
| A-195 | Baixa | dado revelado | Atividade e execução respondem 403 a quem não tem acesso; projeto e demanda respondem 404 | ao vivo | **477** |
| A-196 | Baixa | dado revelado | Escritas de tag e de membro respondem 403 ao desenvolvedor em demanda de projeto sem acesso (as leituras respondem 404) | ao vivo | **477** |
| A-197 | Baixa | dado revelado | 403 no lugar de 404 revela a existência de demanda, projeto e grupo | ao vivo | **477** |
| A-198 | Baixa | dado revelado | Proposta de outro usuário responde 403 e a inexistente 404: os ids ficam enumeráveis | ao vivo | **477** |
| A-199 | Baixa | dado revelado | 403 no plano onde a demanda responde 404: revela existência de demanda e projeto sem acesso | ao vivo | **477** |
| A-200 | Baixa | regra inconsistente | Lista de "poder de gestor" repetida em consulta e tipo comparado direto em rótulos | código, por auditor | **478** |
| A-201 | Baixa | regra inconsistente | Comparação direta de tipo em chat-plano.service.ts | código, por auditor | **478** |
| A-202 | Baixa | regra inconsistente | Regra "tem poder de gestor" escrita duas vezes na supervisão e comparação direta de tipo | código, por auditor | **478** |
| A-203 | Baixa | regra inconsistente | Comparação direta de tipo no prompt do plano e parâmetro `ehGestor` que carrega o auxiliar | código, por auditor | **478** |
| A-204 | Baixa | regra inconsistente | Mesma regra por funções diferentes, comparação direta de tipo e textos que dizem 'gestor' onde o auxiliar passa | código, por auditor | **478** |
| A-205 | Baixa | regra inconsistente | Escritas de demanda decididas com temVisibilidadeTotal em vez das funções de ação | código, por auditor | **479** |
| A-206 | Baixa | regra inconsistente | Escritas autorizadas com temVisibilidadeTotal em vez da função da ação | código, por auditor | **479** |
| A-207 | Baixa | código × documento | Textos "somente gestor" desatualizados em rotas e ferramentas que o auxiliar usa | código, por auditor | **480** |
| A-208 | Baixa | código × documento | Documento, Swagger e comentários ainda dizem 'somente gestor' / @GestorOnly onde o código libera o auxiliar | código, por auditor | **480** |
| A-209 | Baixa | código × documento | SYSTEM.SPEC.md diz que propor_desconectar_demanda é só do gestor; o código libera ao auxiliar | código, por auditor | **480** |
| A-210 | Baixa | código × documento | SPEC descreve POST /execucao/registro como @GestorOnly; o código e o parágrafo do auxiliar dizem outra coisa | código, por auditor | **480** |
| A-211 | Informativo | código sem uso | Três rotas HTTP do pad não têm chamador no frontend nem no desktop: `PATCH /anotacao/:usuarioId/:tipo/trecho`, `POST /anotacao/:usuarioId/:tipo/anexo` e `POST /anotacao/:usuarioId/feito` | código, por auditor | **481** |
| A-212 | Informativo | código sem uso | Mais três rotas sem consumidor: `GET /checkin/suspensao`, `GET /calendario/verificar` e `GET /demanda/:id/ancestral` | código, pelo agente principal | **481** |
| A-213 | Baixa | código sem uso | Métodos HTTP sem chamador: recuperarAncestral e recarregarSubDemandas | código, por auditor | **482** |
| A-214 | Baixa | código sem uso | `MensagemDiretaGrupoService.recuperar` (GET /mensagem-direta/grupo/:grupoId) não tem chamador | código, por auditor | **482** |
| A-215 | Baixa | código sem uso | Seis métodos HTTP sem chamador e uma injeção sem uso | código, por auditor | **482** |
| A-216 | Baixa | código sem uso | TagService.recuperar (GET /tag/:id) não tem chamador | código, por auditor | **482** |
| A-217 | Baixa | código sem uso | Quatro métodos HTTP de services do frontend sem nenhum chamador | código, pelo agente principal | **482** |
| A-218 | Baixa | ineficiência | Usuários: toda volta à aba refaz `GET /usuario`, sem intervalo mínimo | código, por auditor | **483** |
| A-219 | Baixa | ineficiência | Listas recarregam a cada foco da janela ou volta à aba, sem intervalo mínimo | código, por auditor | **483** |
| A-220 | Baixa | ineficiência | Custos da IA: cada foco da janela refaz a consulta, sem intervalo mínimo | código, por auditor | **483** |
| A-221 | Baixa | ineficiência | Seis telas recarregam a própria lista em toda volta à aba ou foco da janela, sem intervalo mínimo | código, pelo agente principal | **483** |
| A-222 | Baixa | ineficiência | A tela Projetos pede uma página de 100 e filtra na tela: acima de 100 projetos, os demais somem em silêncio | ao vivo | **484** |
| A-223 | Baixa | requisição inútil | Abrir Configurações da IA faz 6 requisições, entre elas os 14 prompts inteiros e as versões do prompt de conversa, antes de a aba Prompts ser aberta | ao vivo | **485** |
| A-224 | Baixa | regra inconsistente | Trava de tipo só no controller em projeto, calendário, tag, relatório e justificativa | código, por auditor | **486** |
| A-225 | Baixa | regra inconsistente | Modelagem, duas leituras da IA e a gravação de preço só têm trava no controller; a service não confere tipo | código, por auditor | **486** |

### 5.2 Achados sem spec

| Achado | Sev. | O que é | Por que não virou spec |
|---|---|---|---|
| A-226 | Informativo | `GET /demanda/documentacao` devolve todas as demandas de todos os projetos, com `podeEditar` que a tela não lê e `caminho` que ela poderia montar | Informativo. Enxugar `GET /demanda/documentacao` (tirar `podeEditar` e `caminho`, deixar de fora projetos encerrados) mexe em contrato e o ganho é pequeno com o volume de hoje; fica registrado para quando a tela for revista. |
| A-227 | Média | Sem teste para ferramenta de proposta em demanda sem acesso nem para ajuste que falha no executor | Lacuna de teste coberta pelos entregáveis das specs `367-ferramentas-de-atividade-conferem-o-acesso-a-demanda`, `368-proposta-ajuste-que-falha-restaura-os-dados` e `369-proposta-de-trecho-do-plano-so-resolve-quem-edita-a-aba`: cada uma traz o teste que faltava. |
| A-228 | Média | Regras sensíveis sem teste por tipo ou sem teste da ordem das validações | Lacuna de teste coberta pelos entregáveis das specs `375-execucao-permissao-antes-da-regra-de-negocio` (ordem das validações) e `379-execucao-registrar-e-excluir-conferem-na-service` (registrar, excluir e os casos do auxiliar). |
| A-229 | Informativo | Stream: presença vai a todos os conectados; os demais eventos só aos destinatários | Informativo, sem ação: a presença (quem está online) vai a todos os conectados e `GET /mensagem-direta/pessoas` entrega nome, tipo e presença de todos os ativos; os demais eventos do stream vão só aos destinatários. Restringir a presença seria regra nova do autor. |
| A-230 | Informativo | Carga inicial do chat (stream, conversas, preferência) é necessária com o popup fechado; dá para poupar uma | Informativo. A carga inicial do chat (stream, lista de conversas e preferência) é necessária com o popup fechado: alimenta o contador e os avisos. Poupar a leitura da preferência exigiria devolvê-la junto da lista ou no evento de abertura (contrato) para ganhar uma requisição por carga. |
| A-231 | Baixa | Regras sensíveis sem teste por tipo ou por caso de borda | Lacuna de teste coberta pelos entregáveis das specs de pad, inativar a si mesmo, login, justificativa e senha: cada regra decidida ganha o teste por tipo na mesma task. |
| A-232 | Informativo | GET /modelagem entrega a qualquer usuário logado o nome da última migration e a estrutura de todas as tabelas, inclusive as de segurança | Informativo, sem ação obrigatória: `GET /modelagem` aberto a todo usuário logado é comportamento previsto no `SYSTEM.SPEC.md`. A resposta traz também o nome da última migration (`origem`); se o autor quiser reduzir, o campo pode sair para quem não é gestor. |
| A-233 | Informativo | Modelagem: o diagrama inteiro (28 KB) é pedido a cada entrada na tela, sem memória | Informativo. `GET /modelagem` (28 KB) é pedido a cada entrada na tela; é uma requisição só e a tela não é de uso frequente. Guardar em memória por sessão ou responder 304 por ETag fica para se o autor quiser. |

## 6. Destino dos achados da auditoria anterior

A auditoria de 2026-11-05/11 (`docs/specs/backlog/auditoria-requisicoes-telas/DOSSIE.md`) tinha 16 achados. Onde cada um está hoje:

| Achado | Situação hoje | Task |
|---|---|---|
| R-01 · check-in consultado a cada 20 s | Corrigido no navegador (task 322, conforme: nenhuma consulta em 180 s de repouso). Continua no Project Desktop (15 s, e 3 s em triplicata com a janelinha) e no diálogo aberto (3 s sem teto). | **329**, **461**, **333** |
| R-02 · Demandas: 13 para abrir, 8 por seleção | Em parte corrigido (task 325): hoje 10 para abrir e 5 por seleção. O que resta está nas specs da tela de Demandas. | **406**, **405**, **410**, **408**, **413**, **412** |
| R-03 · chamadas duplicadas na carga | Corrigido (task 321) e conforme: uma consulta de cada na carga. Resíduo: a janelinha e a página embutida ainda consultam a situação cada uma. | **336** |
| R-04 · Usuários pede a lista duas vezes | Corrigido (task 320) e conforme: medido 1 `GET /usuario` ao abrir. | — |
| R-05 · listas com teto fixo | Corrigido nos seletores (task 323). Restam três lugares com teto: execuções da atividade (200), a listagem de Projetos (100) e as atividades da demanda ao lado do chat (100). | **335**, **484**, **449** |
| R-06 · foco da janela dispara `GET /execucao/ativa` | Continua igual (medido: 3 focos, 3 requisições), e seis telas recarregam a lista a cada volta à aba. | **331**, **483** |
| R-07 · diálogo de execução busca 200 execuções | Continua, e é pior do que parecia: a lista vem da mais antiga para a mais nova, então o detalhe da atividade mostra as 5 mais antigas e perde a execução aberta. | **335** |
| R-08 · catálogos recarregados a cada uso | Em parte corrigido (task 325: tags e usuários dos seletores de demanda). As prioridades são pedidas uma vez por sessão (medido). Continuam: o pad a cada abertura da gaveta, as pessoas do chat, as tags de "Nova atividade" e os usuários ativos a cada tela. | **351**, **418**, **439**, **436** |
| R-09 · Configurações da IA carrega todas as abas | Continua para a aba Prompts (medido: 6 requisições ao abrir); a aba Custos já carrega só quando aberta. | **485**, **476** |
| R-10 · Plano: toda alteração recarrega as duas listas | Continua igual. | **445** |
| R-11 · excluir demanda pede a demanda excluída | Continua (P-084). Reproduzido em 2026-11-14 e a causa foi achada no código. | **404** |
| R-12 · texto da demanda na linha da atividade traz a demanda inteira | Continua; além disso o painel relê a demanda inteira depois de salvar. | **441** |
| R-13 · primeira mensagem recarrega a lista duas vezes | Continua (lido no código; a medição desta rodada foi numa conversa já existente, que não recarrega). | **417** |
| R-14 · ação em massa faz uma requisição por item | Continua (P-085). A mesma forma aparece na exclusão de tags e na gravação de membros. | **435**, **472**, **414** |
| R-15 · desfazer a exclusão de demanda não recarrega | A hipótese se confirmou: reproduzido em 2026-11-14, a demanda restaurada não volta à tela. | **404** |
| R-16 · regra de status respondida antes da permissão | Continua, com mais dois casos na execução (descrição obrigatória e "já foi encerrada") e o mesmo padrão em mover atividade e publicar plano. | **375**, **367**, **399**, **477** |

## 7. Cobertura e pendências

**O que mantém a revisão em `active/`:**

1. **Fluxos de IA não exercitados.** O ambiente não tem chave de provedor: enviar mensagem ao chat, propostas, bom-dia, retomada, check-in conversado, `@IA` no chat entre colegas, resumo do grupo, assistente de descrição e teste de prompt foram só lidos no código. Os achados dessas áreas dizem isso na spec.
2. **Project Desktop não executado.** O Electron não roda no ambiente; o que se diz dele vem da leitura de `desktop/src`.
3. **Conferência independente parcial.** O plano era um verificador por unidade; o limite de uso obrigou a trocar por conferência do agente principal (linhas citadas, releitura e reprodução dos graves). Achado de severidade baixa lido por um só auditor pode não se reproduzir: por isso toda spec começa reproduzindo.

**Outros limites:**

- Medido ao vivo: abertura de todas as telas nos quatro perfis, seleção de demanda, excluir e desfazer demanda, chat entre colegas, repouso, foco e volta à aba, e as varreduras de permissão. Criar, editar e excluir nas demais telas foram lidos no código (anexo de mapas, seção 2), não medidos.
- O defeito das "execuções recentes" (as 5 mais antigas) foi confirmado no código por dois auditores e pelo agente principal, mas não foi visto na tela com uma atividade de 6 ou mais execuções.
- A gravação automática do pad não foi reproduzida: o teste de 12 s não gravou em nenhum dos dois caminhos comparados.
- O chat foi exercitado com armazenamento em PostgreSQL; OpenSearch e Elasticsearch não.
- O perfil gestor (não administrador) teve as telas medidas; as escritas dele foram exercitadas só pela API.
- Banco pequeno (6 a 9 usuários, 2 projetos): os tetos de 100 e 200 foram lidos no código, não estourados com dados.
- A conferência por script das evidências cobre a existência do arquivo e da linha citados; o conteúdo foi relido pelo agente principal nos achados que ele verificou.

## 8. Como reproduzir

Os roteiros ficam em `.artifacts/revisao-requisicoes-e-permissoes/` e não vêm no clone. O que cada um faz, para refazer do zero:

- **Stack:** PostgreSQL local (`initdb` em `/tmp/pgdata`, porta 5433), `.env` com `DB_NOME=project20_revisao` e `CHAT_ARMAZENAMENTO=postgres`, `npm run db:migrate --workspace=backend`, `npm run db:seed-dev --workspace=backend`, backend com `npm run start:prod --workspace=backend` e frontend com `npm run start --workspace=frontend` (o `ng serve` precisa do `--proxy-config`; sem ele toda chamada à API devolve o `index.html`).
- **Cenário** (`cenario.cjs`): cria gestor, auxiliar e dois desenvolvedores além do seed; o projeto `SEGR` com demandas, atividades e execução marcadas `SEGREDO-*`, de que só um desenvolvedor é membro; conversas, um grupo só de desenvolvedores, um plano privado e um de projeto.
- **Tráfego** (`trafego.cjs <PERFIL>`, `fluxos.cjs`, `chat.cjs`): Playwright com o token plantado no `localStorage`, registrando cada chamada a `/api/` por passo.
- **Permissões** (`permissoes-leitura.cjs`, `permissoes-escrita.cjs`, `permissoes-regras.cjs`): `fetch` direto na API como cada perfil; "S" quando a resposta contém `SEGREDO`.
- **Supervisão sem auditoria:** como gestor sem leitura registrada, `GET /mensagem-direta/supervisao/grupo/:id?cursor=<base64url de [instante futuro, uuid qualquer]>` e contar as linhas de `mensagem_direta_supervisao` do leitor antes e depois.
- **Duas execuções ativas:** como auxiliar, `PUT /execucao/:id` com `{ "descricao": "...", "fimData": null }` em duas execuções encerradas do mesmo dono.
- **Gestor como membro:** `POST /demanda/:id/membro` com `{ "usuarioId": <id de um gestor> }` como administrador ou auxiliar.

