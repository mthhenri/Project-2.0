# rework-chat-ia.spec.md

> Guarda-chuva do rework que transforma o dia a dia do Project 2.0 em uma conversa com IA.
> Origem: discussão de produto com o autor em 2026-10-17. **Não é uma task implementável**: é a
> spec proprietária da visão, das decisões e da modelagem. O trabalho será quebrado em tasks
> numeradas (a partir da **118**) depois da revisão desta spec pelo autor. A modelagem de dados
> detalhada está em [`rework-chat-ia/modelagem.md`](rework-chat-ia/modelagem.md).

## Objetivo

Trocar o registro manual de atividades, execuções e anotações por um chat com IA. O
desenvolvedor conta o que recebeu, o que vai fazer e o que fez, e a IA cria atividades, inicia
e pausa execuções, escreve as descrições e mantém o pad dele, **sempre pedindo confirmação**.
O gestor cria e descreve demandas conversando. Se a IA ficar indisponível, o sistema volta
sozinho ao fluxo convencional, sem parar o serviço.

## Princípios

1. **A IA é só mais um cliente da API.** Ela age pelas mesmas rotas e services de hoje, com o
   token do próprio usuário. Todas as regras atuais continuam valendo: permissão por tipo e
   dono, uma execução ativa por usuário, validação de ciclo nas conexões, soft delete. O
   backend continua sendo a autoridade; a IA nunca acessa o banco diretamente.
2. **Nada é gravado sem confirmação.** Toda ação da IA (criar atividade, iniciar, pausar,
   descrever execução, anotar no pad, criar demanda, conectar demanda) vira uma **proposta**
   exibida como cartão no chat (Confirmar / Ajustar). Só o clique do usuário executa.
3. **A IA não exclui nada** na primeira versão. Excluir continua manual (ideia futura abaixo).
   Por simetria (pedido do autor, task 159): **tudo o que o usuário faz no sistema a IA também faz, sempre por proposta confirmada**, e as ferramentas novas de cada tela nascem com isso.
4. **O fallback é automático.** A IA caiu: o sistema troca para as telas convencionais. A IA
   voltou: pergunta ao usuário se ele quer voltar para ela, para não interromper o que estiver
   fazendo.
5. **Tudo é configurável pelo administrador**: provedor, modelos, flags e prompts.

## Fluxo do desenvolvedor

1. Abre o Project (app Electron), faz login e cai no **chat do dia**. A tela de Atividades não
   existe mais no fluxo normal; fica como reserva para quando a IA cair.
2. **Bom dia proativo.** Ao abrir, a IA lê o pad e as atividades e cumprimenta com o plano do
   dia em ordem de prioridade ("ontem você parou em…").
3. **Criar atividades conversando.** "Na demanda X tenho que fazer Y e Z." A IA propõe as
   atividades, já com prioridade, e o dev confirma.
4. **"O que eu tenho pra fazer?"** A IA lista as atividades dele ordenadas por prioridade,
   com a demanda de cada uma.
5. **"Bora fazer tal coisa."** A IA propõe iniciar a execução com uma descrição provisória.
   Se houver outra ativa, ela é pausada antes.
6. **Check-in periódico.** O Project (no navegador ou no Project Desktop) mostra o check-in em
   horário sorteado pelo backend entre 30 min e 1h20 (configurável), só enquanto há execução ativa. A IA pergunta o que foi feito; o dev
   responde do jeito dele; a IA devolve uma **descrição formal** (sem "eu", sem gírias) como
   proposta. Ao salvar, o dev escolhe continuar na mesma atividade (pausa e reabre a execução)
   ou trocar de atividade. O tempo desde o último check-in é sempre o `inicio_data` da
   execução ativa.
7. **Rigor proporcional ao tempo.** A duração recomendada de uma execução é 1h30 (configurável).
   Não é trava: o sistema aceita execuções de qualquer duração. Acima do recomendado, a IA pede
   mais detalhe ("foram 2h40, teve mais alguma coisa?") antes de propor a descrição.
8. **Reunião.** Se o dev disser que vai entrar numa reunião, a IA propõe suspender os
   check-ins até ele voltar (flag "check-in inteligente"). A suspensão é um estado passageiro,
   guardado em memória no backend.
9. **Almoço e fim do dia.** O ponto é derivado das execuções (`SCHEMA.md`, tabela `execucao`).
   Ir almoçar é pausar a execução; "vou almoçar" faz a IA propor a pausa descrevendo o
   trabalho feito até ali. O almoço em si nunca vira descrição: a IA só descreve trabalho.
10. **Pad gerenciado pela IA.** A cada execução encerrada a IA anota o que foi feito; de manhã
    lê o pad para retomar o contexto. Com a IA ligada, o dev **só lê** o pad; com a IA
    desligada, o dev edita.
11. **Uma conversa por dia.** A memória de longo prazo fica nos dados (atividades, execuções,
    pad), não no histórico do chat.

## Fluxo do gestor

- **Criar demanda conversando** ("no projeto X, criar uma demanda sobre…").
- **Entrevista de demanda.** A IA pergunta o que o cliente pediu (`descricao_cliente`) e o que
  será feito (`descricao_tecnica`) e propõe as duas descrições.
- **Conexões e lugar.** Com o contexto do projeto (demandas, descrições, grafo), a IA sugere
  conexões com outras demandas ou um lugar melhor na árvore, sempre perguntando.
- **Equipe pelo chat.** Perguntas como "o que a equipe fez hoje?" ou "quem está parado na
  demanda X?", com as mesmas ferramentas de leitura.

## Usuário administrador

- Novo valor `ADMINISTRADOR` em `TipoUsuarioEnum` e seed em `tipo_usuario`.
- O administrador é um gestor com mais permissões: tudo o que o gestor faz, mais a tela de
  **Configurações da IA**, que é exclusiva dele, e a criação de outros administradores. Ele cria
  administradores, gestores e desenvolvedores.
- O `gestor.inicial` vira o administrador inicial, por migration.
- **Regra:** sempre existe ao menos um administrador ativo e não excluído. Ela substitui a
  guarda atual de "último gestor ativo" (P-002, `UsuarioService.validarPermanenciaDeGestorAtivo`):
  gestor deixa de ser obrigatório, porque o administrador já é um gestor.
- **Permissões de tela continuam como hoje.** Onde se exige gestor, o administrador também
  passa. As 25 verificações de `TipoUsuarioEnum.GESTOR` em 18 arquivos (contagem de 2026-10-17)
  passam a usar uma regra única ("tem permissão de gestor?"), em vez de comparar o tipo em
  cada lugar. Aplicar a skill `gerenciamento-de-impacto`.

## IA: provedor, modelos e prompts

- **Provedor** atrás de uma interface própria no backend. Começa com Anthropic; Google e
  OpenAI são trocáveis sem reescrever o resto.
- **Streaming obrigatório**: a resposta aparece enquanto é gerada.
- **Escolha automática de modelo por nível.** O usuário nunca escolhe modelo. Quem conversa é
  o modelo rápido; as tarefas pesadas são ferramentas que rodam com um modelo mais forte por
  baixo. Cada resposta exibe o nível usado (rápido, padrão ou analítico), só para leitura.

  | Nível | Tarefas | Modelo inicial |
  |---|---|---|
  | Rápido | conversa, listar, iniciar, pausar | Haiku |
  | Padrão | descrição de execução, rigor, pad, prioridade | Sonnet |
  | Analítico | analisar demanda, quebrar em atividades, sugerir conexões e lugar | Opus, esforço médio |

- **Prompts editáveis pelo administrador**, versionados no SQL, com histórico, rascunho,
  "testar antes de salvar" (rodar contra narrativas reais guardadas) e "restaurar padrão".
- **Configurações e flags** versionadas no SQL: provedor, modelos e esforço por nível,
  intervalos do check-in, duração recomendada, check-in inteligente, rigor proporcional,
  detecção automática de queda, desligar a IA manualmente.

## Fallback (IA indisponível)

- O backend detecta a falha do provedor e o estado vale para todos. Não depende de ninguém
  desligar nada. O administrador também pode desligar a IA manualmente.
- **Caiu:** troca para as telas convencionais, ou seja, a tela de Atividades com iniciar e pausar
  manuais, a edição da descrição da execução e a edição do pad.
- **Voltou:** aviso "A IA voltou, quer voltar a usar?". "Agora não" mantém o modo convencional,
  com um botão para voltar depois.
- **Ao voltar,** a IA lê o estado atual (execução ativa, o que mudou durante a queda) e continua
  dali. Os detalhes da troca no meio de uma proposta serão aprofundados na task do bloco 8.

## Pad estruturado

- O texto único `usuario.anotacoes` (Quill/HTML) vira **cinco seções** de texto livre em
  Markdown: Em andamento, Feito, Pendências, Lembretes e **Pessoal**.
- **Pessoal** guarda anotações do próprio usuário, como os comandos para subir um projeto. A IA só
  escreve ali quando o usuário pede, e nunca reorganiza nem remove nada sozinha.
- **Feito** tem um título por dia (`## 17/10`), para a IA ler só o de hoje.
- A IA edita **pontualmente** dentro da seção (troca um trecho por outro) e nunca reescreve tudo.
  Ela carrega só as seções de que precisa, o que economiza tokens.
- **Tela, no modo editável:** cinco acordeões, cada um com um editor Markdown. Selecionar um
  trecho, clicar com o botão direito e escolher "Enviar para" move o trecho para o fim de outra
  seção, numa única operação atômica no backend.
- Salvar envia o `updated_date` lido; se a seção mudou no meio-tempo, o backend recusa e a tela
  recarrega (proteção contra sobrescrita).

## Prioridade de atividades

- Coluna `tipo_atividade_prioridade_id` em `atividade`, com os valores **URGENTE, ALTA, MEDIA,
  BAIXA e INDEFINIDA**, nessa ordem.
- O nome é fixo. A cor é editável **só pelo administrador**.
- A IA define a prioridade ao propor a atividade, e a listagem ordena por ela.

## Markdown em todo o sistema

- O Quill sai. Pad, `descricao_cliente`, `descricao_tecnica` e `documentacao` da demanda passam a
  ser Markdown, porque é o formato que a IA escreve.
- Consumidores atuais do Quill: o pad (dialog e página de anotações), o detalhe e o painel da
  árvore de demandas, e a listagem de atividades.
- O HTML já gravado é convertido para Markdown uma única vez, por migration.
- **Editor e interpretador próprios**, sem biblioteca externa. O interpretador **não aceita HTML
  embutido**: o texto vira elementos montados por nós, nunca HTML cru inserido na página. A
  segurança vem da construção.

## Layout

- A barra superior atual vira **barra lateral recolhível** (navegação) **mais barra superior**
  (hora, execução atual, próximo check-in, usuário).
- As permissões de tela continuam exatamente como hoje.

## Project Desktop (Electron)

- Aplicativo em `desktop/` que abre o front do Project numa janela própria (URL fixa); o navegador
  continua sendo o centro e todo mundo usa o desktop no dia a dia (152).
- Janela principal sempre por cima, em tela cheia, que só minimiza; só fecha por "Fechar
  completamente" na bandeja, com confirmação. A bandeja mostra o tempo até o próximo check-in.
- O **horário** do check-in é sorteado no **backend**, e o Project (navegador ou desktop) mostra a
  janelinha sobre a tela escurecida (161). Com o desktop minimizado, aparece só a janelinha:
  arrastável, sempre por cima, sem fechar nem minimizar, com "Estou em reunião" como única saída (160).

## Armazenamento

- **Postgres**: tudo o que é ação, regra, configuração ou precisa de histórico. Isso inclui
  prioridade, pad, prompts, configuração da IA e propostas.
- **OpenSearch**: só as mensagens do chat, num índice único com busca textual em português.
  Os tokens de cada resposta ficam no próprio documento, para o painel de custo futuro sair de
  agregações. OpenSearch no `docker-compose` para dev. O acesso fica isolado num repository do
  chat; trocar para Elasticsearch, se necessário, é mexer num lugar só.
- **Retenção:** guardar tudo por enquanto. O corte (por exemplo, 3 meses) será um filtro por
  data, configurável no futuro.
- Detalhes: [`rework-chat-ia/modelagem.md`](rework-chat-ia/modelagem.md).

## Entregáveis (blocos)

Cada bloco tem valor próprio e vira uma ou mais tasks numeradas a partir da 118:

1. **Administrador e permissões centralizadas**: tipo, migration do administrador inicial,
   regra de ao menos um administrador, troca das verificações de gestor.
2. **Layout**: barra lateral recolhível e barra superior.
3. **Markdown**: editor e interpretador próprios, migração do Quill e conversão do HTML gravado.
4. **Fundação da IA**: interface de provedor, níveis de modelo, `configuracao_ia` e `prompt`
   versionados e tela de Configurações da IA do administrador.
5. **Chat**: streaming, ferramentas sobre a API, propostas com confirmação (`proposta_ia`),
   desfazer após confirmar, OpenSearch e uma conversa por dia.
6. **Atividade e execução pelo chat**: prioridade, criar, listar, iniciar e pausar, bom dia
   proativo, reunião e almoço.
7. **Check-in e app Electron**: sorteio, janela à frente, descrição formal, rigor proporcional.
8. **Pad estruturado**: cinco seções, edição pontual pela IA, tela de acordeões com "Enviar para"
   e migração do texto atual para Pessoal.
9. **Lado do gestor**: criar demanda, entrevista das descrições, conexões e lugar, equipe pelo
   chat.
10. **Fallback**: detecção automática, troca de telas, retorno com pergunta, retomada pela IA.

Os blocos 1 a 3 não dependem de IA e podem começar primeiro.

### Tasks já especificadas

| Bloco | Task | Spec | Depende de |
|---|---|---|---|
| 1 | 118 | [`118-permissao-de-gestor-centralizada`](118-permissao-de-gestor-centralizada.spec.md) | — |
| 1 | 119 | [`119-usuario-administrador`](119-usuario-administrador.spec.md) | 118 |
| 2 | 120 | [`120-layout-barra-lateral-e-topbar`](120-layout-barra-lateral-e-topbar.spec.md) | — |
| 3 | 121 | [`121-markdown-interpretador-e-visualizador`](121-markdown-interpretador-e-visualizador.spec.md) | — |
| 3 | 122 | [`122-markdown-editor`](122-markdown-editor.spec.md) | 121 |
| 3 | 123 | [`123-markdown-conversao-do-html-gravado`](123-markdown-conversao-do-html-gravado.spec.md) | aplicada com a 124 |
| 3 | 124 | [`124-markdown-troca-dos-consumidores-e-remocao-do-quill`](124-markdown-troca-dos-consumidores-e-remocao-do-quill.spec.md) | 121, 122, 123 |
| 8 | 125 | [`125-pad-estruturado-modelo-e-api`](125-pad-estruturado-modelo-e-api.spec.md) | — |
| 8 | 126 | [`126-pad-estruturado-tela-com-acordeoes`](126-pad-estruturado-tela-com-acordeoes.spec.md) | 125 |
| 8 | 127 | [`127-pad-enviar-trecho-para-outra-secao`](127-pad-enviar-trecho-para-outra-secao.spec.md) | 125, 126 |
| 8 | 128 | [`128-pad-remover-anotacoes-do-usuario`](128-pad-remover-anotacoes-do-usuario.spec.md) | 125, 126, 127 |
| 4 | 129 | [`129-ia-configuracao-modelo-e-api`](129-ia-configuracao-modelo-e-api.spec.md) | — |
| 4 | 130 | [`130-ia-interface-de-provedor-e-niveis-de-modelo`](130-ia-interface-de-provedor-e-niveis-de-modelo.spec.md) | 129 |
| 4 | 131 | [`131-ia-prompts-versionados-modelo-e-api`](131-ia-prompts-versionados-modelo-e-api.spec.md) | 129 |
| 4 | 132 | [`132-ia-tela-de-configuracoes-provedor-modelos-e-flags`](132-ia-tela-de-configuracoes-provedor-modelos-e-flags.spec.md) | 129, 130 |
| 4 | 133 | [`133-ia-tela-de-configuracoes-prompts`](133-ia-tela-de-configuracoes-prompts.spec.md) | 131, 132 |
| 3 | 134 | [`134-markdown-editor-wysiwyg`](134-markdown-editor-wysiwyg.spec.md) | 122, 124 (recomendada antes da 133) |
| 5 | 135 | [`135-chat-opensearch-e-repository-de-mensagens`](135-chat-opensearch-e-repository-de-mensagens.spec.md) | — |
| 5 | 136 | [`136-chat-proposta-da-ia-modelo-e-api`](136-chat-proposta-da-ia-modelo-e-api.spec.md) | — |
| 5 | 137 | [`137-chat-ferramentas-da-ia-sobre-a-api`](137-chat-ferramentas-da-ia-sobre-a-api.spec.md) | 136 |
| 5 | 138 | [`138-chat-conversa-do-dia-e-streaming`](138-chat-conversa-do-dia-e-streaming.spec.md) | 135, 136, 137 |
| 5 | 139 | [`139-chat-tela-do-chat`](139-chat-tela-do-chat.spec.md) | 136, 138 |
| 5 | 140 | [`140-chat-testar-prompt-antes-de-salvar`](140-chat-testar-prompt-antes-de-salvar.spec.md) | 133 |
| 5 | 141 | [`141-chat-historico-e-refinos-visuais`](141-chat-historico-e-refinos-visuais.spec.md) | 135, 139 |
| 6 | 142 | [`142-atividade-prioridade-modelo-e-api`](142-atividade-prioridade-modelo-e-api.spec.md) | — |
| 6 | 143 | [`143-atividade-prioridade-nas-telas`](143-atividade-prioridade-nas-telas.spec.md) | 142 |
| 6 | 144 | [`144-chat-ferramentas-de-leitura-do-desenvolvedor`](144-chat-ferramentas-de-leitura-do-desenvolvedor.spec.md) | 137, 139, 142 |
| 6 | 145 | [`145-chat-propostas-de-atividade-e-execucao`](145-chat-propostas-de-atividade-e-execucao.spec.md) | 136, 137, 142, 144 |
| 8 | 146 | [`146-chat-pad-pela-ia`](146-chat-pad-pela-ia.spec.md) | 125–128, 136, 137, 139 |
| 6 | 147 | [`147-chat-bom-dia-proativo`](147-chat-bom-dia-proativo.spec.md) | 144, 146 |
| 6 | 148 | [`148-chat-reuniao-suspender-checkins`](148-chat-reuniao-suspender-checkins.spec.md) | 145 |
| 7 | 149 | [`149-checkin-backend-e-rigor-proporcional`](149-checkin-backend-e-rigor-proporcional.spec.md) | 144, 148 |
| 7 | 150 | [`150-checkin-descricao-formal-da-execucao`](150-checkin-descricao-formal-da-execucao.spec.md) | 145, 149 |
| 7 | 151 | [`151-checkin-tela-da-janela`](151-checkin-tela-da-janela.spec.md) | 149, 150 |
| 7 | 152 | [`152-desktop-casca-e-bandeja`](152-desktop-casca-e-bandeja.spec.md) | — |
| 7 | 160 | [`160-desktop-janelinha-do-checkin`](160-desktop-janelinha-do-checkin.spec.md) | 151, 152, 161 |
| 7 | 161 | [`161-checkin-horario-no-backend-e-no-project`](161-checkin-horario-no-backend-e-no-project.spec.md) | 148, 149, 151 |
| 9 | 153 | [`153-chat-gestor-ferramentas-de-leitura`](153-chat-gestor-ferramentas-de-leitura.spec.md) | 137, 139, 144 |
| 9 | 154 | [`154-chat-gestor-criar-demanda`](../done/154-chat-gestor-criar-demanda.spec.md) (absorvida pela 159) | 153 |
| 9 | 155 | [`155-chat-gestor-entrevista-de-demanda`](155-chat-gestor-entrevista-de-demanda.spec.md) | 154 |
| 9 | 156 | [`156-chat-gestor-conexoes-e-lugar`](156-chat-gestor-conexoes-e-lugar.spec.md) | 153, 155 |
| 10 | 157 | [`157-fallback-telas-convencionais-e-inicio-no-chat`](157-fallback-telas-convencionais-e-inicio-no-chat.spec.md) | 139, 145, 146 |
| 9 | 159 | [`159-ia-cria-projetos-e-demandas`](../done/159-ia-cria-projetos-e-demandas.spec.md) (concluída) | 145, 153 |
| 10 | 158 | [`158-fallback-retorno-da-ia-e-retomada`](158-fallback-retorno-da-ia-e-retomada.spec.md) | 145, 157 |
| 11 | 164 | [`164-ia-leituras-de-ponto-calendario-tags-e-equipe`](164-ia-leituras-de-ponto-calendario-tags-e-equipe.spec.md) | 144, 153 |
| 11 | 165 | [`165-ia-altera-atividade`](165-ia-altera-atividade.spec.md) | 145 |
| 11 | 166 | [`166-ia-registra-e-corrige-execucoes`](166-ia-registra-e-corrige-execucoes.spec.md) | 145, 150, 164 |
| 11 | 167 | [`167-ia-altera-demanda`](../done/167-ia-altera-demanda.spec.md) | 153, 159 |
| 11 | 168 | [`168-ia-atribui-membros-e-tags`](../done/168-ia-atribui-membros-e-tags.spec.md) | 153, 164 |
| 11 | 169 | [`169-ia-gestor-age-por-outro-usuario`](../done/169-ia-gestor-age-por-outro-usuario.spec.md) | 145, 159, 164, 165, 166 |
| 11 | 170 | [`170-ia-edicao-de-demanda-participar-e-tags-do-desenvolvedor`](../active/170-ia-edicao-de-demanda-participar-e-tags-do-desenvolvedor.spec.md) | 167, 168 |

O bloco 5 (chat) está quebrado em **135 a 141** (a 141 é o histórico de conversas e os refinos visuais, pedidos depois da 139); os blocos 6, 7, 9 e 10 estão quebrados em **142 a 158**: prioridade e ferramentas do desenvolvedor (142 a 148, com o pad pela IA na 146, que complementa o bloco 8), check-in e Electron (149 a 152), lado do gestor (153 a 156) e fallback (157 e 158). As tasks 125 a 128 saíram no mesmo lançamento. A 140 ("testar antes de salvar" os prompts) usa narrativas coladas pelo administrador, não o chat dos usuários
(decisão de privacidade registrada na spec): por isso depende só da 133.

## Critérios de Aceite (da guarda-chuva)

- Cada bloco virou tasks numeradas com spec própria, todas em `docs/specs/done/`.
- O fluxo do desenvolvedor e o do gestor descritos acima funcionam ponta a ponta na aplicação
  real, com a IA ligada e com a IA desligada.
- Nenhuma ação da IA grava dado sem confirmação, e a IA não tem ferramenta de exclusão.
- `docs/SCHEMA.md`, `docs/SYSTEM.SPEC.md` e `docs/context/` refletem o sistema final.

## Fora de Escopo e ideias futuras

- **A IA excluir dados** (com confirmação).
- **Ditado por voz** no chat e no check-in. A sala é compartilhada, então provavelmente com fone e
  "segurar para falar".
- **Integração com GitLab** para a IA ler o que mudou no código e sugerir a descrição da
  execução.
- **Painel de custo e teto mensal**, a partir dos tokens já guardados no OpenSearch.
- **Implantação gradual por usuário** (talvez; a equipe é pequena).
- **Retenção configurável** do chat.
- **Separar mais o papel de administrador**, além de "gestor com mais permissões".
- **Electron sem rede** (fila local de check-in). Não é necessário: sem rede, a máquina virtual
  de desenvolvimento também cai.

## Material anexo

| Item | Conteúdo |
|---|---|
| [`rework-chat-ia/modelagem.md`](rework-chat-ia/modelagem.md) | modelagem do Postgres e do OpenSearch |
| Protótipo (artifact privado do autor) | https://claude.ai/artifact/GXguCsMBoCFkXxPSUCYBzS: protótipo interativo do dia do desenvolvedor, check-in, telas estáticas e Configurações da IA |

## Dependências

Consulta `docs/SYSTEM.SPEC.md` §14 (regras de negócio) e `docs/SCHEMA.md`. O bloco 1 altera a
guarda do P-002, registrada em `docs/context/HISTORY.md`.
