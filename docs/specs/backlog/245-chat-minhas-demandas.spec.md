# 245-chat-minhas-demandas.spec.md

> Task 4/4 da guarda-chuva [`chat-execucao-por-demanda.spec.md`](chat-execucao-por-demanda.spec.md) (fase 4): a lateral do chat lista as
> demandas do desenvolvedor e abre uma ao lado da conversa. Origem: `IDEAS.md` I-025. Canvas privado do autor em
> [`chat-execucao-por-demanda/referencias.md`](chat-execucao-por-demanda/referencias.md) (ilustra; o visual segue a tela atual do chat).

## Objetivo

A lateral à direita do chat, onde ficava o histórico, passa a listar as **últimas demandas que o usuário executou**. Clicar numa demanda
divide a tela entre o chat e a demanda aberta, só para leitura, com as abas Checklist, Técnica, Cliente (só gestor e administrador) e
Documentação. Com uma execução rodando, a demanda dela abre por padrão.

## Entregáveis

1. **Endpoint de leitura próprio** em `backend/src/modules/demanda` (controller fino, regra na service, SQL no repository): as demandas
   das atividades que o usuário executou, da execução mais recente para a mais antiga, sem repetir demanda. Cada item traz o caminho da
   demanda, as horas gastas e esperadas (barra de horas), o total de atividades e quantas estão `DESENVOLVIDA`, e se há execução
   rodando. Gestor e administrador veem o mesmo para o que eles executaram. DTO de entrada e `...ResumoDto` de saída no `shared`;
   repository novo ou alterado com teste de integração (`npm run test:integracao`); `is_deleted = false` em todo `SELECT`.
2. **Lista à direita:** componente novo em `frontend/src/app/modules/chat/components/` (standalone, Signals, SCSS com BEM em português)
   no lugar de `app-chat-historico` (`chat.page.html`), com caminho, barra de horas e "N de M desenvolvidas" por demanda, e estados
   vazio, carregando e erro.
3. **Demanda aberta:** clicar fecha a lista e divide a tela entre o chat e a demanda (como no modo planejamento de
   `chat-planejamento.spec.md`), somente leitura, com as abas **Checklist** (abre primeiro: desenvolvidas riscadas, a que está rodando
   destacada, as que faltam em aberto), **Técnica**, **Cliente** (só gestor e administrador, como hoje) e **Documentação**, mais os
   botões Editar (leva à tela de demandas) e "Planejar com a IA" (só o botão que leva ao modo planejamento). Dá para voltar à lista e
   abrir outra demanda enquanto uma está rodando.
4. **Abertura automática:** com uma execução rodando, a demanda dela abre por padrão ao entrar no chat.
5. **Reaproveitamento (padrão a confirmar):** a demanda aberta reaproveita o componente da demanda aberta da task **239**
   (`demanda-tela.spec.md`, Árvore em três colunas) em modo leitura, quando possível. Se o componente dela não existir ou não servir, esta
   task monta o seu com o mesmo desenho e registra no fecho por que não reaproveitou.
6. **Documentação:** `docs/SYSTEM.SPEC.md` (linhas `chat` e `demanda`) e o mapa em `docs/context/MEMORY.md`, conforme o fecho.

## Critérios de Aceite

- `npm run test --workspace=shared`, `npm run test --workspace=backend` e `npm run test:integracao` aprovados (consulta das demandas
  executadas: ordem, sem repetição, só as do usuário, gestor igual ao desenvolvedor). Builds de `backend` e `frontend` aprovados.
- Testes de componente (`*.spec.ts`) da lista (vazio, cheio, erro) e da demanda aberta (aba Cliente só para gestor e administrador;
  abertura automática com execução rodando); `npm run test --workspace=frontend` aprovado.
- Verificação ao vivo (skill `verify`) em 1920×1080, 1366×768 e 1080×1920, temas claro e escuro, com desenvolvedor e gestor: lista,
  demanda aberta, voltar à lista, com e sem execução rodando, comparando com a tela atual do chat e, para a demanda aberta, com a da
  task 239.
- O histórico não aparece mais à direita (já está no seletor do topo, task 233); busca e abrir mensagem do histórico seguem
  funcionando por lá.

## Fora de Escopo

- O modo planejamento em si (`chat-planejamento.spec.md`): aqui é só o botão.
- Editar a demanda dentro do chat; mudar as telas de Atividades, Execuções e Demandas.
- Mudar quem pode ver demanda (desenvolvedor só vê projetos em que tem linha em `demanda_usuario`; gestor por tipo).
- Check-in automático e Git/Gitea.

## Dependências

- **233** (o histórico vai para o seletor no topo, `chat-planejamento.spec.md` decisão 9) antes desta.
- **239** (demanda aberta da `demanda-tela.spec.md`): reaproveitamento a confirmar.
- Independente das tasks 242 a 244; a contagem de "desenvolvidas" faz mais sentido depois da 242.

## Riscos e Mitigação

- **Divisão de tela concorrendo com o planejamento** (mesmo layout). Mitigação: usar o mesmo contêiner de divisão do planejamento, sem
  duplicar; conferir as tasks do planejamento antes de implementar.
- **Desenvolvedor ver dado que não pode.** Mitigação: a aba Cliente e o acesso à demanda seguem as regras de hoje, testadas na service.
