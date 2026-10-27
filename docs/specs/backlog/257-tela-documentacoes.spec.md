# 257-tela-documentacoes.spec.md

> Task 6/7 da guarda-chuva [`documentacoes-e-pad.spec.md`](documentacoes-e-pad.spec.md) (decisões 2 a 5): a tela **Documentações** no
> grupo Dia a dia, com a demanda em que estou trabalhando à esquerda e o pad à direita.

## Objetivo

Uma tela para escrever: os textos da demanda e as anotações à vista ao mesmo tempo, com a demanda escolhida uma vez e guardada. Ela
também é o caminho de escrita quando a IA está fora do ar.

## Entregáveis

1. **Rota e barra lateral:** `/documentacao` com `loadComponent`, item "Documentações" no grupo Dia a dia (`shared/layout/navegacao.ts`),
   ícone `pi pi-book`, para todos os perfis, depois de Ponto. Tecla de atalho livre (padrão proposto: `o`).
2. **Seletor da demanda** no topo, ao lado do título, no padrão do seletor do chat (`modules/chat/components/seletor/`): o botão mostra
   a bolinha de status, o nome, o caminho (projeto › demanda mãe) e "Rodando" quando há execução nela. Ao clicar, um popover com
   **busca** e a **árvore** projeto → demandas aninhadas; cada demanda mostra a bolinha de status, "Rodando" e três marcas de
   preenchimento (técnica, cliente, documentação; cinza quando vazio). A busca ignora acento e caixa, destaca o termo e mantém os
   ancestrais. Escolher fecha o popover.
3. **Leitura da árvore:** endpoint de leitura das demandas a que o usuário tem acesso (gestor: todas; desenvolvedor: as de projeto
   acessível, §14), com projeto, mãe, status, se cada texto está preenchido e se o usuário pode editar, numa consulta com CTE recursiva.
   Sem os textos. DTO de listagem `...ResumoDto` no `shared` (skill `project20-dto-conventions`).
4. **Demanda guardada:** a escolha fica guardada no navegador, por usuário. Na primeira visita, com execução rodando, vem a demanda dela;
   sem execução, a área da demanda mostra "Em que demanda você está trabalhando?" com o botão "Escolher demanda", e o pad continua ao
   lado. Demanda guardada que deixou de existir ou de ser acessível volta a esse estado.
5. **Demanda à esquerda:** título, status, "Abrir em Demandas" e as abas **Técnica · Cliente · Documentação** com o editor de Markdown,
   Gravar e Descartar, no padrão do documento do plano. Grava pelo endpoint de textos da task 256; versão mais nova mostra o aviso do
   plano ("Outra pessoa gravou este texto depois que você abriu…", com Recarregar), sem perder o texto digitado. Permissões de §14:
   desenvolvedor de fora da demanda vê as três abas em leitura; a Cliente é sempre leitura para o desenvolvedor (cadeado e aviso, task
   252). Trocar de demanda com alteração sem gravar pede confirmação.
6. **Pad à direita:** o componente da task 254, com botão de recolher (a demanda ocupa a largura toda; "Mostrar o pad" traz de volta).
   **Divisor arrastável** entre os dois, entre 34% e 72% da largura, duplo clique volta ao padrão (56%), teclado com setas; a divisão e o
   pad recolhido ficam guardados no navegador.
7. **Estados:** carregando (esqueleto), erro com "Tentar de novo", sem demanda escolhida, busca sem resultado (com "Limpar busca") e
   versão mais nova.

## Critérios de Aceite

- Testes: regra pura da busca na árvore e do caminho (`*.test.ts`); service e repository do endpoint da árvore (integração: gestor vê
  todas, desenvolvedor só projetos acessíveis, marcas de preenchimento); componentes da tela (seletor abre e fecha, escolha guardada,
  leitura e edição por perfil, aviso de versão, trocar com alteração sem gravar).
- `npm run test` e `npm run build` de `shared`, `backend` e `frontend` aprovados; `npm run test:integracao` aprovado.
- Verificação ao vivo (skill `verify`) com desenvolvedor membro, desenvolvedor de fora e gestor, em 1920×1080, 1366×768 e 1080×1920, nos
  estados do item 7, com o drawer do pad aberto por cima da tela. Análogos: o documento do plano (edição), o seletor do chat (seletor),
  o pad atual (painel).

## Fora de Escopo

- "Alterar trecho com IA" nesta tela (task 258).
- Criar, mover ou excluir demanda por aqui; mudar status ou horas.

## Dependências

- Tasks 252 (Cliente legível), 254 (componente do pad) e 256 (versão e endpoint de textos).

## Pontos em aberto (o autor confirma ao abrir a task)

- A tecla de atalho (`o` proposto) e a posição do item no grupo Dia a dia (depois de Ponto, proposto).
- A árvore mostra demandas canceladas e concluídas? Padrão proposto: sim, com a bolinha de status, porque a documentação continua sendo
  escrita depois da entrega.
