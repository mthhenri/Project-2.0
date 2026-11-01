# 286-frontend-do-tipo-auxiliar.spec.md

> Task da guarda-chuva `tipo-auxiliar.spec.md` (283–287). Redigida e concluída em 2026-11-01, depois da 285.

## Objetivo

Fazer o frontend refletir a matriz do Auxiliar: sessão com permissões por ação, navegação, guards e os templates que usavam `eGestor()`. Gestor, administrador e desenvolvedor não mudam de comportamento.

## Entregáveis

1. **Sessão** (`UsuarioSessaoService`): `eAuxiliar` e uma permissão por ação (`temVisaoTotal`, `podeEditarDemanda`, `podeAtribuirMembroOuTag`, `podeEditarAtividadeDeOutro`, `podeConduzirExecucaoDeOutro`, `podeVerExecucaoEPontoDeOutro`, `podeEditarExecucaoDeOutro`, `podeGerenciarTag`), todas chamando a mesma função do `shared` que o backend usa. `eGestor()` fica para o que é só do gestor.
2. **Navegação e guards:** `permissaoGuard(permissao)` (rota de Tags); o item `visivelAoAuxiliar` mostra Projetos e Tags na barra.
3. **Templates** (cada `eGestor()` decidido): Atividades (coluna Usuário, filtro de usuário, menu ⋮, executar de outros; seleção e barra de ação em massa seguem do gestor), detalhe da atividade (agir e "Registrar tempo"), toda a área de Demandas (editar, membros, tags, conexões, nova demanda, Controle de horas), Execuções (usuário, filtro, editar e excluir; o Relatório segue do gestor), Ponto (equipe de hoje e filtro por pessoa; Justificar e Imprimir ficam de fora), detalhe do projeto (Nova Demanda; Relatório, volume e edição seguem do gestor), diálogo de encerrar execução, sugestões do chat.
4. **Testes:** sessão, `permissaoGuard`, barra lateral e uma verificação do Auxiliar em Atividades, Execuções, Ponto, detalhe do projeto e Demandas.

## Critérios de Aceite

- `npm run test --workspace=frontend`, `npm run build --workspace=frontend` e `npm run lint:tudo` sem erro.
- Verificação ao vivo logado como Auxiliar: feita no fecho da 287 (depende de poder criar o usuário pela tela).

## Fora de Escopo

- Formulário e listagem de Usuários (287).

## Dependências

- Tasks 283–285.

## Riscos e Mitigação

- **Permissão duplicada no front e no back:** o front só esconde; a recusa é do backend (284). As duas partes usam as mesmas funções do `shared`.

## Resultado (2026-11-01) — divergências da matriz decididas

- **Aba Cliente do chat com cadeado:** mantida para quem não é gestor (inclui o Auxiliar). O cadeado diz "só leitura"; a leitura é de todos (spec 256).
- **Formulário de demanda "status e tags":** o Auxiliar edita status e tags (e membros), como o gestor; a descrição do cliente segue só do gestor.
- **Imprimir o ponto:** escondido do Auxiliar, como a matriz pede ("justificar e imprimir o ponto" fora do alcance), embora o desenvolvedor o veja. **A confirmar com o autor** se o Auxiliar deveria imprimir ao menos o próprio.
- **"Minhas demandas" e "Sair da demanda" no chat:** o Auxiliar é tratado como desenvolvedor (pode sair das demandas de que é membro).
