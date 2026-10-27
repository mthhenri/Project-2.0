# 258-documentacoes-alterar-trecho-com-ia.spec.md

> Task 7/7 da guarda-chuva [`documentacoes-e-pad.spec.md`](documentacoes-e-pad.spec.md) (decisão 6): o "alterar trecho com IA" na tela
> de Documentações, sem conversa.

## Objetivo

No plano, o pedido de alteração de trecho vira uma mensagem da conversa do plano, e a IA responde com uma proposta. A tela de
Documentações não tem conversa: o pedido vai direto à IA, e a resposta aparece no próprio texto, para aceitar ou descartar.

## Entregáveis

1. **Pedido:** botão direito sobre uma seleção no editor da demanda (técnica, documentação e, para o gestor, cliente) abre o popover
   "Alterar trecho com IA" da task 253: a seleção citada, o campo "O que mudar" e "Pedir à IA". Só aparece com a IA no ar e quando o
   usuário pode editar a aba.
2. **Chamada direta à IA:** endpoint novo que recebe o bloco, a seleção, o pedido e o tipo de texto (técnica, cliente ou documentação) e
   devolve o bloco com só a seleção alterada. Não grava nada no banco. Usa os prompts de texto que já existem por aba
   (`PLANO_DESCRICAO_TECNICA`, `PLANO_DESCRICAO_CLIENTE`, `PLANO_DOCUMENTACAO`) mais um prompt de alteração de trecho editável nas
   Configurações da IA (tipo novo em `TipoPromptEnum`, versão 1 semeada por migration; a próxima livre na hora). DTOs de entrada e de
   saída no `shared`, controller fino, regra na service. Permissão: quem pode editar aquela aba da demanda.
3. **Proposta no texto:** abaixo do bloco, um cartão "Proposta da IA · só o trecho marcado" com o diff por palavra da seleção
   (`shared/src/utils/diff-por-palavra.ts`), **Aceitar**, **Descartar** e **Pedir de novo**. Aceitar troca o bloco no editor e deixa a
   aba como "Alterações sem gravar" (aceitar não grava); Descartar fecha o cartão. Se o texto mudou depois do pedido e o bloco não está
   mais lá, o cartão avisa que a proposta expirou.
4. **Estados:** pedindo (o cartão com carregamento discreto), erro da IA com "Tentar de novo", IA fora do ar (o botão direito volta ao
   menu do navegador).

## Critérios de Aceite

- Testes: service do endpoint (permissão por aba e por perfil, IA fora do ar, resposta que não encaixa), DTOs no `shared`, regra pura de
  encaixe da resposta no bloco, componente do cartão (aceitar, descartar, expirado).
- Teste de prompt (aba Prompts das Configurações da IA) com os três tipos de texto; relatos em
  `.artifacts/258-documentacoes-alterar-trecho-com-ia/`, com modelo e data.
- `npm run test` e `npm run build` de `shared`, `backend` e `frontend` aprovados.
- Verificação ao vivo (skill `verify`) em 1920×1080, 1366×768 e 1080×1920: pedir, ver a proposta, aceitar e gravar, descartar, erro e IA
  fora do ar. Análogo: o pedido de trecho no documento do plano.

## Fora de Escopo

- O pedido na conversa do plano (continua como na task 253).
- Gravar direto pela IA, sem passar pelo editor.

## Dependências

- Tasks 253 (o editor entrega bloco e seleção) e 257 (a tela).

## Pontos em aberto (o autor confirma ao abrir a task)

- **Custo:** os custos da IA hoje saem das mensagens do chat (task 202), e esta chamada não é uma mensagem. Padrão proposto: registrar a
  chamada no mesmo lugar em que o check-in e o pad registram as chamadas fora da conversa; se não houver, levar o ponto ao autor antes de
  implementar.
- O módulo do endpoint: padrão proposto, o módulo da IA que já faz as chamadas fora da conversa.
