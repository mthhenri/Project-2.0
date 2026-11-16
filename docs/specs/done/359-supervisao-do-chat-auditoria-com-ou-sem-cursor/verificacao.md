# 359, 391, 374, 375, 367 e 381 — Verificação

Seis tasks da guarda-chuva `requisicoes-e-permissoes-correcoes` (permissão e regra no servidor), feitas juntas em 2026-11-16: **359** e **391** (supervisão do chat), **374** e **375** (execução), **367** (ferramentas da IA e destino de mover atividade), **381** (quem pode ser membro de demanda). Só backend; nenhum contrato (`shared/`) nem schema mudou. Roteiro e log brutos em `.artifacts/revisao-permissoes-p0/` (ignorada pelo Git).

## O que mudou

- **359:** a supervisão (grupo, canal e conversa um a um) deixou de usar a presença de `cursor` para decidir se audita. Abrir (sem cursor) grava sempre; uma página com cursor grava se o leitor ainda não leu aquela conversa no dia (`existeLeituraDoDia`, método novo do repository). O aviso segue "um por leitor, conversa e dia".
- **391:** a conversa um a um lê a primeira página antes de auditar; sem mensagem responde 404 (com cursor devolve página vazia) e não grava auditoria nem aviso. Quando o aviso é gravado, a página é lida de novo para trazê-lo.
- **374:** `ExecucaoService.alterar` recusa reabrir (`fimData: null`) com outra execução do dono em andamento e recusa período que se sobreponha a outra execução do dono (a própria é ignorada). A conferência duplicada saiu dos executores da IA (corrigir, pausar-desfazer, iniciar-reabrir); `existeSobreposicao`, que ficou sem uso, saiu da service.
- **375:** em `iniciar` e `encerrar` o bloco de permissão sobe para logo depois do "não encontrado".
- **367:** `propor_criar_atividade` e `propor_mover_atividade` leem a demanda com o mesmo recorte de acesso da leitura HTTP; `AtividadeService.validarMudancaDeDemanda` confere o acesso ao destino antes de responder existência ou status (sem acesso = "Demanda de destino não encontrada").
- **381:** `DemandaService.criar` (`usuarioIds`) e `atribuirMembro` recusam alvo que não pode ser membro (gestor, administrador) e alvo inativo. O executor da IA deixou de repetir a conferência.

## Testes e gates (rodados nesta tarefa)

| Gate | Resultado |
|---|---|
| Backend, unitários (`npm test --workspace=backend`) | 1828 de 1828 |
| Integração (`npm run test:integracao`, PostgreSQL local) | 535 de 535; novos: `validarLeituraDoDia` (repository), supervisão do grupo com cursor forjado e três da conversa um a um (cursor forjado, abrir sem cursor, par sem conversa) |
| `npm run lint:tudo` | zero erros |
| `build` do backend | compila |
| `npm run repo:verificar` | aprovado (rodado ao fechar) |

Testes novos: execução (5 de `alterar`, 2 de ordem permissão-regra); supervisão (4: cursor audita, cursor não duplica, par sem conversa 404, cursor forjado sem conversa); ferramentas de criar e mover (3); service de atividade (acesso ao destino vira 404); demanda (2: atribuir e criar por tipo de alvo e inativo). Testes de executor ajustados porque a conferência passou a morar na service.

## Ao vivo (stack isolado: banco `project20_verify`, backend na 3001; removidos ao fim)

Cenário montado por API: dois desenvolvedores, um auxiliar, um gestor, projeto, demanda, atividades e execuções. 13 de 13 conferências como esperado:

- **374:** auxiliar reabre execução encerrada do desenvolvedor que já tem outra em andamento → 400; mover o período para cima de outra execução → 400; período válido → 200.
- **375:** desenvolvedor sobre atividade alheia pendente, sem descrição, e sobre execução alheia já encerrada → 403 nos três.
- **381:** auxiliar atribui gestor → 400; `POST /demanda` com gestor em `usuarioIds` → 400; atribuir desenvolvedor → 201.
- **391:** par sem conversa → 404; com cursor forjado → 200 vazio, sem aviso.
- **359:** depois de uma mensagem entre os dois, cursor forjado como 1ª leitura do dia → 200 com `participantesAvisados: true` (1 linha em `mensagem_direta_supervisao`); segunda chamada → sem aviso novo, sem linha nova.

Conferência de dados (381, item 4), no banco de desenvolvimento: **0** linhas de `demanda_usuario` apontando para gestor, administrador ou usuário inativo.

## Limites

- **367 (IA)** não foi exercitada ao vivo: não há provedor de IA no ambiente. A prova é de unidade (ferramentas e service com desenvolvedor sem acesso).
- **359:** o canal lido por tipo por `GrupoService.listarMensagens` passa pelo mesmo `lerGrupoSupervisionado` testado no grupo; não tem teste de integração próprio.
- `propor-criar-demanda.ferramenta.ts` (lê a demanda pai sem recorte) aparece na evidência da 367, mas fica fora do escopo da spec (só as duas ferramentas e a service).
- A ferramenta `propor-atribuir-membro` manteve a sua conferência de tipo e de inativo: ela dá a recusa antes de existir um cartão de proposta; a spec 381 pedia tirá-la, e a service agora também confere (conferência dupla, sem efeito colateral). Decisão a confirmar com o autor.
- Sem verificação visual: nada mudou no `frontend/`.

## Revisão independente

Um revisor (somente leitura, sem a minha conclusão) apontou: (1) regressão na 367, o desenvolvedor que vê o projeto mas não é membro da demanda de destino recebia 404 em vez de 403, **corrigida** com teste; (2) testes de integração que faltavam nas specs 359 e 391, **escritos**; (3) conferência de tipo mantida na ferramenta de atribuir membro, **à espera do autor**; (4) nome `existe*` do método novo, **renomeado** `validarLeituraDoDia`; (5) dependências sem uso nos executores, **removidas**; (6) teste da reabertura com execução posterior, **acrescentado**; (7) SYSTEM.SPEC da execução, **atualizado**.
