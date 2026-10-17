# Task 130 — Provedor de IA: interface própria, níveis de modelo e provedor Anthropic

> Origem: guarda-chuva [`rework-chat-ia.spec.md`](rework-chat-ia.spec.md), bloco 4 (2 de 5), seção "IA:
> provedor, modelos e prompts". Depende da configuração da task 129.

## Objetivo

Criar, no backend, a **camada única de acesso à IA**: uma interface própria de provedor (com streaming), a
resolução automática de **nível → modelo** a partir da configuração ativa e o primeiro provedor concreto
(Anthropic). Nenhum outro módulo conversa com o SDK do provedor depois desta task. O usuário nunca escolhe
modelo.

## Entregáveis

### 1. Interface e tipos (módulo `ia`)

- `IaProvedor` (nome interno do contrato confirmado na task): gerar uma resposta completa, **transmitir**
  (streaming, entregando trechos de texto à medida que chegam) e informar a contagem de tokens da resposta
  (entrada, saída e cache). Entrada: nível (`NivelIaEnum`), instruções do sistema, mensagens e, já no
  contrato, a lista de **ferramentas** (nome, descrição, esquema de entrada) e os blocos de chamada de
  ferramenta que voltam. As ferramentas só são usadas no bloco 5; aqui o contrato as carrega e o provedor
  Anthropic as repassa, com teste (decisão 2).
- Erros do provedor traduzidos para exceções do projeto (indisponível, limite de uso, configuração
  inválida), nunca o erro cru do SDK.
- Resposta com metadados: nível usado, modelo que respondeu e tokens (base do painel de custo futuro).

### 2. Resolução de nível

- `IaService` (ou nome equivalente) lê `ConfiguracaoIaService.obterAtiva()` (task 129) a cada chamada e
  traduz o nível no modelo da configuração: Rápido → `modelo_rapido`, Padrão → `modelo_padrao`, Analítico →
  `modelo_analitico` com o esforço configurado (`EsforcoIaEnum`, que cada provedor traduz para o parâmetro que
  entende). A escolha do provedor é por `tipo_provedor_ia`; provedor
  sem implementação (Google, OpenAI) falha com erro claro de configuração.
- `ia_desligada` verdadeiro faz toda chamada recusar com a exceção "IA desligada", antes de qualquer
  requisição externa.
- Estado da IA **em memória**: `NO_AR`, `FORA_DO_AR` e `DESLIGADA`, atualizado por sucesso e falha das
  chamadas. Só leitura aqui: a detecção automática que troca as telas é o bloco 10.

### 3. Provedor Anthropic

- Implementa `IaProvedor` sobre o SDK `@anthropic-ai/sdk`, com a chave vinda de `ConfigService`
  (`ANTHROPIC_API_KEY`). O SDK hoje está em `^0.30.0`: o autor autorizou **subir a versão** (a task atualiza
  a dependência para uma que cubra streaming, ferramentas e o esforço do nível analítico e confere os dois
  consumidores atuais, abaixo).
- Sem chave configurada, o provedor responde "IA indisponível neste ambiente" e o estado vai para
  `FORA_DO_AR`.
- Testes com um cliente falso (nenhuma chamada real à API): níveis, streaming em partes, ferramentas
  repassadas, erro do provedor traduzido, IA desligada, chave ausente.

### 4. Migração dos consumidores atuais (decisão 1)

- (Decidido pelo autor: migrar já.) `AssistenteService.auxiliarDescricao` e `RelatorioService` (revisão por IA) hoje chamam o SDK direto, com
  modelo e prompt fixos no código e `ANTHROPIC_MODELO`/`ANTHROPIC_MAXIMO_TOKENS` no `.env`. Passam a usar o
  `IaService` no **nível Padrão**, sem mudar contrato HTTP nem texto dos prompts (os prompts vão para o
  banco na 131 e na task que os adotar).
- `ANTHROPIC_MODELO` e `ANTHROPIC_MAXIMO_TOKENS` deixam de valer (o modelo vem da configuração); o
  máximo de tokens passa a ser parâmetro da chamada. `.env.example` e `README.md` atualizados.

### 5. Documentação

- `docs/SYSTEM.SPEC.md` (módulo `ia`, níveis, estado), `README.md` (variáveis) e `docs/context/`.

## Decisões tomadas pelo autor

1. **Migrar o assistente e o relatório já**, nesta task.
2. **Ferramentas e streaming de blocos já no contrato**, cobertos por teste com cliente falso até o bloco 5.
3. **Cache do provedor:** os tokens de cache entram só como campo de medição na resposta. O cache de
   **configuração e prompts em memória** (evitar ler o banco a cada mensagem) é das tasks 129 e 131.
4. **Chave de API:** o autor tem uma chave de desenvolvimento e a coloca no `.env` local
   (`ANTHROPIC_API_KEY`); a verificação ao vivo com chamadas reais usa essa chave sem que ela passe pelo chat.

## Critérios de Aceite

- Nenhum arquivo fora do módulo `ia` importa `@anthropic-ai/sdk` (verificável por busca).
- Com a IA ligada na configuração e a chave real no ambiente local, o assistente de descrição e a revisão de
  relatório respondem como antes, agora no modelo da configuração; com a IA desligada, os dois respondem
  com a mensagem "IA desligada" e nenhuma requisição externa sai.
- Trocar `modelo_padrao` pela API de configuração muda o modelo usado na chamada seguinte, sem reiniciar.
- Streaming exercitado ao vivo por um teste de rota interna ou script (não há tela de chat ainda), com
  trechos chegando antes do fim da resposta.
- Testes de `backend` e builds passam; chamadas reais só na verificação manual, registradas no `HISTORY.md`
  com custo aproximado.

## Fora de Escopo

- Implementar Google e OpenAI (a interface permite; a troca real fica para quando houver necessidade).
- Chat, ferramentas de verdade, propostas e persistência de mensagens (bloco 5).
- Detecção automática de queda e troca de telas (bloco 10).
- Os prompts no banco (task 131).

## Dependências

Depende da **129**. Bloqueia o bloco 5. Pode ir antes ou depois da 131.
