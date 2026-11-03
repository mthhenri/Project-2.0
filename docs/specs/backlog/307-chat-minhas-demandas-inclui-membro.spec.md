# 307-chat-minhas-demandas-inclui-membro.spec.md

> Origem: relato do autor em 2026-11-03: sendo auxiliar e membro de uma demanda **planejada e sem atividades**, ela não aparecia em "Minhas
> demandas" do chat. Corrige o critério definido na task [245](../done/245-chat-minhas-demandas.spec.md).

## Objetivo

A lateral "Minhas demandas" do chat passa a listar também as demandas em que o usuário **é membro** (`demanda_usuario`), mesmo sem execução sua.

## Decisão do autor (2026-11-03)

Opção "incluir as demandas em que sou membro": vale para **todos os tipos**, desenvolvedor inclusive.

## Fatos do código (2026-11-03)

- `DemandaRepository.listarExecutadas` parte de `execucao` ⟶ `atividade` do usuário (`demanda_executada`). Demanda sem execução sua nunca entra,
  tenha ou não atividade, seja ou não membro.
- Desenvolvedor: `apenasMembro` junta `demanda_usuario` como filtro (`INNER JOIN`), ou seja, executou **e** é membro.
- Gestor e administrador não entram em `demanda_usuario` (acesso por tipo); o auxiliar pode ser membro (atribuição de membros por quem tem
  permissão, ele incluído; ele não é atribuído sozinho).
- Fora da lista: demanda `CONCLUIDA` ou `CANCELADA`. O DTO `DemandaExecutadaResumoDto` tem `ultimaExecucaoData` obrigatória e o limite padrão é
  `LIMITE_PADRAO_DEMANDAS_EXECUTADAS` (20).

## Decisões

1. **Critério novo:** entra a demanda não concluída e não cancelada em que o usuário **executou** (como hoje) **ou é membro**.
   - Desenvolvedor: continua só vendo demandas de que é membro (a regra de visibilidade não muda); a diferença é que agora a membro-sem-execução
     entra.
   - Auxiliar: executadas (de qualquer demanda, pois vê tudo) mais as de que é membro.
   - Gestor e administrador: só as executadas, pois não são membros por regra. **Não** passam a listar todas as demandas planejadas.
2. **Ordem:** a mais recente execução primeiro; as sem execução do usuário vêm depois, por `demanda.id DESC`. Sem repetir demanda.
3. **DTO:** `ultimaExecucaoData` passa a `Date | null` (nula para membro sem execução). O front trata o nulo (não mostra "última execução").
   `executando` segue como está (falso sem execução).
4. **Nome e vazio:** o painel continua "Minhas demandas". A mensagem de vazio ("Nenhuma demanda em aberto") segue valendo.
5. **Item sem atividade:** o cartão mostra 0 atividades e a barra de horas vazia, sem tratamento especial; conferir que nada divide por zero.
6. Rever o texto da ferramenta da IA `listar_minhas_demandas` (usa o mesmo método do service) e do guarda-chuva `chat-execucao-por-demanda`, que
   descrevem a lista como "o que o usuário executou".

## Ponto em aberto: "Participar" e "Sair" da demanda (a confirmar com o autor)

Hoje o botão **Participar / Sair** do cabeçalho de membros (`demanda-membros-cabecalho`) só aparece para quem **não** edita a demanda, ou seja, o
desenvolvedor. O auxiliar e o gestor veem a busca de membros e o × em cada membro, e não têm "Participar". Como "Minhas demandas" passa a depender
de ser membro, o auxiliar precisa de um jeito claro de entrar e sair:

- **Padrão proposto:** "Participar" e "Sair" aparecem para quem `podeSerMembroDeDemanda` (desenvolvedor e auxiliar), **em conjunto** com a busca
  e o × que o auxiliar já tem. Gestor e administrador não são membros por regra: **nenhum dos dois botões** para eles.
- Sair continua imediato com "Desfazer", e o **último membro** da demanda não sai (regra de §14), com a mensagem clara.
- Alternativa, se o autor quiser que gestor e administrador **acompanhem** demandas: seria mudança de regra (§14 diz que não entram em
  `demanda_usuario`) e fica fora desta task.

## Verificação

Teste de integração do repository (membro sem execução entra; executada sem ser membro não entra para o desenvolvedor, entra para o auxiliar;
concluída e cancelada fora; ordem; sem repetição); teste da service e da ferramenta; teste de componente com `ultimaExecucaoData` nula;
`lint:tudo`; `npm run test:integracao`; skill `verify` com um auxiliar membro de demanda planejada sem atividades.
