# 211-mensagem-direta-compositor.spec.md

> Task 7/11 da guarda-chuva [`chat-colaboradores.spec.md`](../backlog/chat-colaboradores.spec.md). Modelagem em [`chat-colaboradores/modelagem.md`](../backlog/chat-colaboradores/modelagem.md)
> (§3 e §10). Depende da [`210`](../done/210-mensagem-direta-popup-no-project.spec.md). Desenho aprovado: mockups 1 (menção aberta, bloco de código e cartão de demanda) e 6.

## Objetivo

O campo de mensagem do popup passa a ajudar quem escreve: **bloco de código** (botão e colagem de código), **`@menção`** e **`#referência`** a demanda ou atividade com sugestões, e a mensagem
mostra a referência como um **cartão clicável**. Tudo continua Markdown (o servidor já guarda `mencoes` e `referencias` e calcula `contemCodigo`).

## Entregáveis

1. **Backend, duas rotas** (qualquer usuário autenticado; a regra de acesso é a da 208: desenvolvedor só vê o que está nos projetos dele, gestor e administrador veem tudo):
   - `GET /mensagem-direta/referencias?texto=`: até 8 demandas e atividades cujo **nome** contém o texto (sem diferenciar maiúsculas), com `tipo`, `id`, `nome` e o contexto (status; para atividade, a demanda).
     Não havia busca de demanda por nome (a listagem exige o projeto), por isso é rota nova, com SQL no repository (`DemandaRepository` e `AtividadeRepository`).
   - `GET /mensagem-direta/referencia/:tipo/:id`: o cartão de uma referência para **quem está olhando** (pode não ser quem escreveu): `acessivel` e, se acessível, nome, situação e o destino
     (`projetoId`, ou `demandaId` da atividade). Sem acesso (ou inexistente) responde `acessivel: false` **sem nome**: o cartão aparece bloqueado e não vaza o título.
   A regra de acesso fica numa função só da service, usada também por `enviarMensagem` (a validação da 208 deixa de ter cópia própria). DTOs no `shared`; testes de service, controller e repositories.
2. **Compositor** (`app-mensagem-direta-compositor`, no lugar do campo simples): `Enter` envia e `Shift+Enter` quebra a linha; botão **Código** (envolve a seleção em bloco cercado, ou abre um bloco vazio com o cursor dentro);
   **colar** texto de várias linhas que parece código vira bloco cercado (desfazível com Ctrl+Z); ao digitar `@` aparecem as **pessoas da conversa** (só os dois participantes valem, regra da 208), ao digitar `#` + 2 letras aparecem demandas e atividades.
   Setas navegam, `Enter`/`Tab`/clique escolhem, `Esc` fecha; o item escolhido entra no texto (`@Nome`, `#Nome`) e fica registrado para o envio. No envio vão só as menções e referências cujo texto **ainda está** na mensagem.
3. **Cartão de referência** (`app-mensagem-direta-referencia-cartao`) sob o texto da mensagem: carregando, cartão (ícone do tipo, nome, "Demanda · status"), bloqueado ("Sem acesso a esta demanda") e erro; clicar leva à atividade (`/atividade/:id`) ou ao
   projeto da demanda (`/demanda?projetoId=`). Resolução em cache por sessão.
4. **Lógica pura com teste** em `utils/` (gatilho `@`/`#` no cursor, inserção, menções e referências ainda presentes, bloco de código, "parece código").
5. **Testes de componente** do compositor e do cartão; **verificação ao vivo** (dois usuários) nos três viewports e nos dois temas, com o desenho dos mockups como referência.
6. **Documentação:** `docs/SYSTEM.SPEC.md`, `CONTEXT.md`, `HISTORY.md`, `MEMORY.md`.

## Critérios de Aceite

- Testes e builds do `shared`, `backend` e `frontend` passam; `npm run repo:verificar` passa.
- Ao vivo: digitar `@` e escolher a pessoa; `#` e escolher uma demanda e uma atividade; enviar; o cartão aparece nas duas pontas, abre o destino e, para quem não tem acesso, aparece bloqueado sem o nome; colar um trecho de código vira bloco
  copiável; o botão Código funciona com e sem seleção; estados de carregando, vazio ("Nenhum resultado"), erro; claro e escuro; `1920×1080`, `1366×768` e `1080×1920`.
- Sem `ngModel`, `innerHTML`, `title` nem `style=""` inline; o texto da mensagem só passa por `app-markdown-visualizador`.

## Fora de Escopo

- Realce da `@menção` dentro do balão (o visualizador de Markdown só desenha texto; a menção aparece como `@Nome`), aviso de menção e notificações (212), janela do Desktop e leitura da área de transferência (213), anexos e imagens.
- Mencionar quem não participa da conversa (a regra da 208 recusa: quem não lê a conversa não pode ser avisado dela; os mockups mostravam colegas na lista, e isto é **decisão do autor** a confirmar).
- Link direto para a demanda dentro do projeto (a página do projeto ainda não abre uma demanda por parâmetro).

## Dependências

`210` (em `done/`) e `208`. Fontes: mockups da guarda-chuva, `validarReferencia` da `MensagemDiretaService`, `app-markdown-visualizador` e o bloco de código copiável.

## Riscos e Mitigação

- **Vazar o nome de uma demanda sem acesso:** o cartão e a busca usam a mesma regra de acesso do envio; quem não tem acesso recebe `acessivel: false` sem nome. Teste de service e de repository.
- **Sugestão que atrapalha a digitação:** `@` e `#` só abrem no início de uma palavra e fecham com espaço, Esc ou clique fora; `Enter` só escolhe quando a lista está aberta e há item destacado.
- **Detecção de código errada na colagem:** só age com várias linhas e sinais fortes de código; o resultado é desfazível e o botão Código é sempre manual.
- **Corrida da busca:** respostas atrasadas não substituem a mais nova; o termo curto (< 2 letras) não consulta.
