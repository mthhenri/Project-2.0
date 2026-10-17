# Task 140 — Testar o prompt antes de salvar

> Origem: guarda-chuva [`rework-chat-ia.spec.md`](rework-chat-ia.spec.md), bloco 5 (6 de 6), seção "IA: provedor, modelos e prompts"
> ("testar antes de salvar") e decisão 3 da task 133 (o botão já está reservado, desabilitado, na aba Prompts).

## Objetivo

Deixar o administrador **experimentar um rascunho de prompt** contra narrativas e comparar com o prompt ativo, lado a lado, antes de
ativá-lo, sem gravar nada no chat nem criar proposta.

## Entregáveis

### 1. Backend (módulo `prompt`)

- `POST /prompt/:tipo/testar` (`@AdministradorOnly`). Entrada: o texto do prompt candidato (o do rascunho salvo ou o que está no editor)
  e de 1 a **5 narrativas** (texto livre). Para cada narrativa roda o modelo **duas vezes**, com o prompt **ativo** e com o **candidato**, e
  devolve os dois textos.
- **Nível por tipo** (o da guarda-chuva): `CONVERSA` e `CHECKIN` rápido; `DESCRICAO_EXECUCAO`, `PAD` e `PRIORIDADE` padrão;
  `ENTREVISTA_DEMANDA` e `CONEXAO_DEMANDA` analítico. Tabela fixa no código, testada.
- **Sem efeitos:** sem ferramentas, sem criação de proposta, sem gravar no OpenSearch; `MAXIMO_TOKENS` fixo e os tokens gastos voltam
  na resposta. Falha em uma narrativa devolve o erro **só dela**; as outras seguem.
- IA desligada ou fora do ar responde 409 com a mensagem da `IaException`.
- Testes (node:test, IA falsa): duas chamadas por narrativa, nível por tipo, limite de 5, isolamento de falhas, nenhuma gravação.

### 2. Frontend (aba Prompts, task 133)

- O botão **"Testar antes de salvar"** passa a funcionar: abre um dialog com a lista de narrativas (campo para colar cada uma, com
  adicionar e remover; limite de 5), botão "Testar" e, por narrativa, os dois resultados **lado a lado** ("Ativo" e "Rascunho") no
  `app-markdown-visualizador`, com estado de carregamento por narrativa e o custo em tokens.
- As narrativas digitadas ficam no navegador (por tipo) para reaproveitar entre testes.
- Estados: vazio, carregando, resultado, erro por narrativa e IA indisponível.

### 3. Documentação

- `docs/SYSTEM.SPEC.md` e `docs/context/`.

## Decisões assumidas (podem ser trocadas antes de implementar)

1. **Narrativas coladas pelo administrador**, não lidas do chat dos usuários. "Narrativas reais guardadas" da guarda-chuva exigiria o
   administrador ler mensagens de outras pessoas, o que é uma decisão de privacidade do autor. A tela já aceita narrativas
   copiadas; ler do chat (só as mensagens do próprio administrador, ou de todos, com aviso) fica como ideia.
2. **Comparação visual simples** (dois textos lado a lado), sem diff palavra a palavra (fora de escopo desde a 133).

## Critérios de Aceite

- Testar um rascunho com duas narrativas mostra, para cada uma, a resposta com o prompt ativo e com o rascunho; nada aparece no chat nem
  em `proposta_ia`, e o OpenSearch não ganha documento.
- Uma narrativa com falha mostra o erro nela e as outras aparecem normalmente.
- Gestor e desenvolvedor levam 403 na rota.
- `1920×1080`, `1366×768` e `1080×1920`, temas claro e escuro, estados vazio, carregando, resultado e erro; testes de `backend` e builds.

## Fora de Escopo

- Ler narrativas do chat dos usuários, diff entre versões, avaliação automática da qualidade e execução em lote (mais de 5).
- Testar com ferramentas reais (o teste é só de texto) e variáveis nos prompts.

## Dependências

Depende da **133** (aba e botão reservado) e da **130** e **131** (IA e prompts). Não depende do chat em si: pode ser feita em qualquer
ordem depois da 133, mas fecha o bloco 5 por ser a última peça do "testar antes de salvar" previsto.

## Riscos e Mitigação

- **Custo**: até 10 chamadas por clique (5 narrativas × 2). O limite de narrativas e a janela de tokens ficam visíveis na tela, e o
  nível analítico (Opus) pede confirmação antes de rodar.
