# Task 170 — IA: edição da demanda, participar/sair e tags para o desenvolvedor

> Origem: pergunta do autor em 2026-10-18 sobre o que a tela faz e a IA ainda não; ele escolheu **editar a demanda**, **desenvolvedor participar e sair de demandas** e **atribuir tags** (sem criar tags). **Não** entram: editar projeto e criar/editar tags. Guarda-chuva [`rework-chat-ia.spec.md`](rework-chat-ia.spec.md), bloco 11; princípio: a IA faz o que o usuário faz, sempre com confirmação.

## Objetivo

Fechar três diferenças entre as telas e a IA, reaproveitando as propostas das tasks 167 e 168, sem tipo de proposta nem migration novos:

1. **Editar a demanda além do básico:** acrescentar texto à documentação e mudar a demanda de pai na árvore. A edição passa a valer também para o **desenvolvedor membro** da demanda, como na tela (a service já exige ser membro; a descrição do cliente continua só do gestor e fora desta proposta).
2. **Participar e sair:** o desenvolvedor entra e sai **ele mesmo** de uma demanda do projeto a que tem acesso (como os botões "Participar" e "Sair" da tela). O gestor continua colocando e tirando qualquer desenvolvedor.
3. **Tags:** a atribuição de tags a demandas e atividades já existe para o gestor (task 168). O desenvolvedor passa a atribuir tags **às atividades** a que a tela já deixa (`AtividadeService.alterarTags`: autor ou membro da demanda); tags de **demanda** seguem só do gestor.

## Entregáveis

1. `ALTERAR_DEMANDA`: ferramenta e executor liberados ao desenvolvedor (a `DemandaService.alterar` confere ser membro); campos novos `acrescentarDocumentacao` (Markdown **acrescentado** ao que existe, nunca substituindo: a IA não lê a documentação inteira e substituir perderia texto) e `demandaPaiId` (mover). Mover recusa, já na proposta e no executor: a própria demanda ou uma descendente como pai (a service só confere o projeto e não impede ciclo), pai de outro projeto e pai que não seja demanda estrutural (a regra do seletor da tela). O desfazer devolve a documentação e o pai de antes, só se ainda estão como a proposta deixou.
2. `ATRIBUIR_MEMBRO`: `usuarioId` opcional (sem ele, é quem conversa); o desenvolvedor só pode a si mesmo e o gestor, qualquer **desenvolvedor** (gestor e administrador seguem recusados: acesso por tipo). Ferramenta liberada a todos; o executor deixa a service decidir (acesso ao projeto).
3. `ATRIBUIR_TAG`: ferramenta liberada a todos; a de **demanda** é recusada para quem não é gestor, na ferramenta e no executor; a de atividade segue a service.
4. Cartões: mover mostra "Pai: antes → depois" e a documentação acrescentada em Markdown.
5. Testes: mover (ciclo, outro projeto, pai não estrutural, desfazer), acrescentar documentação (preserva o texto, desfazer), desenvolvedor editando e saindo de demanda, tags de atividade pelo desenvolvedor e de demanda recusadas a ele.

## Critérios de Aceite

- Gestor: "move a demanda X para dentro da Y" gera cartão "Pai: A → B"; mover para dentro de uma filha dela é recusado sem cartão; confirmar e desfazer funcionam.
- Gestor ou membro: "acrescenta na documentação da X: …" gera cartão; confirmar mantém o texto anterior e acrescenta o novo; desfazer devolve o anterior.
- Desenvolvedor: "quero participar da demanda X" propõe entrar; "sai da demanda X" propõe sair; pedir para colocar outra pessoa é recusado; sem acesso ao projeto a service recusa.
- Desenvolvedor marca tag numa atividade sua; tentar numa demanda é recusado.
- Testes de `backend` (node:test) e builds de `backend` e `frontend` passam; frontend sem lint (P-001), declarado no fecho.
- Cartões verificados ao vivo em `1920×1080`, `1366×768` e `1080×1920`, claro e escuro, com o cartão de `ALTERAR_DEMANDA` como análogo.

## Fora de Escopo

- Editar projeto; criar, renomear ou apagar tags.
- Marcar uma demanda como estrutural (a tela deixa livremente e isso quebraria atividades ou filhas existentes); remover ou alterar conexões (é uma exclusão, e a IA não exclui).
- Substituir a documentação inteira; mover para o topo da árvore (a própria tela não consegue, `demandaPaiId` vazio significa "sem mudança").

## Dependências

`167` (alterar demanda), `168` (membros e tags) e a base de propostas (`136`).

## Riscos e Mitigação

- **Ciclo na árvore:** mover sem validar criaria uma demanda sua própria ancestral. Mitigação: validar com a hierarquia recursiva (`listarDescendentes`) na ferramenta e de novo no executor.
- **Perda de documentação:** só acrescentar; o desfazer compara antes de devolver.
- **Desenvolvedor com mais poder que a tela:** cada permissão nova segue o que a service já decide; os testes cobrem os casos recusados.
