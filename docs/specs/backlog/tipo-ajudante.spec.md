# tipo-ajudante.spec.md

> Guarda-chuva (tasks **283–287**, só a spec). Origem: `IDEAS.md` I-035, definida com o autor em 2026-10-30 a partir da matriz "Permissões por tela" (artifact). Nome provisório "Ajudante", mantido pelo autor.

## Objetivo

Criar o tipo de usuário **Ajudante**: um desenvolvedor com permissões a mais, que conduz o trabalho sem ter o poder completo do gestor. Ele executa as próprias atividades como qualquer desenvolvedor, mas enxerga e edita o que o gestor enxerga e edita em projetos, demandas, atividades, execuções, ponto e tags.

## Decisões do autor

**Natureza:** é desenvolvedor. Aparece na equipe como desenvolvedor, tem atividades, ponto e execuções, horas diárias e a trava de uma execução ativa. **Nunca é atribuído sozinho a nada.**

**Visibilidade:** vê todos os projetos, demandas e atividades, por tipo (como o gestor). Não depende de `demanda_usuario`.

**Demandas:** edita qualquer demanda (nome, horas, previsão, status), atribui e remove **membros e tags de qualquer pessoa, ele mesmo incluído**, cria demandas e sub-demandas, cria e remove conexões, conclui demanda e move atividade (inclusive pelo chat), publica plano.

**Atividades:** vê as de todos, **cria só para si**, edita as dos outros, inicia e pausa as de outras pessoas, usa o menu ⋯ da linha e a ação extra do detalhe.

**Execuções e ponto:** vê o histórico de execuções e o ponto de qualquer usuário; edita e exclui execução. Registra a própria execução à mão como desenvolvedor.

**Outras telas:** Projetos (lista e criar demanda a partir do projeto), Tags (criar, editar, excluir), Controle de horas (Demandas e detalhe do projeto), chat e descrição do cliente no chat, as próprias anotações.

**Fora do alcance dele:** Usuários (tela e anotações dos outros), Calendário (item e rota, sem leitura por URL), justificar e imprimir o ponto, Relatório de execução e do projeto, Alterar prioridades, ação em massa nas atividades, escolher outro responsável ao criar atividade, editar projeto (criar, status, nome, cor, datas), Configurações da IA.

## Quebra em tasks

| Task | Entrega |
|---|---|
| **283** | Fundação: valor `AJUDANTE` em `TipoUsuarioEnum`, a tabela de referência do tipo e a migration (o tipo é tabela desde a 0025: conferir `docs/SCHEMA.md`), JWT e DTOs. Em `shared/src/utils/permissao-usuario.ts`, permissões **por ação** em vez do binário gestor/administrador. |
| **284** | Backend: revisar as checagens de tipo (113 ocorrências em 31 arquivos) e aplicar a matriz: `demanda.service` (25), `atividade.service` (12), `execucao.service` (9), `usuario.service` (7), `plano.service` (5), ponto, projeto, anotação, chat e as ferramentas e executores da IA. |
| **285** | Visibilidade e atribuição: o ajudante vê tudo por tipo e não entra sozinho em `demanda_usuario`; pode atribuir e remover qualquer membro. Regra de quem pode ser executor. |
| **286** | Frontend: sessão (`eAjudante` ou permissões por ação), `navegacao.ts`, guards (`tag`, `projeto`, `calendario`, `relatorio`) e os cerca de 21 templates com `eGestor()`. |
| **287** | Tela de Usuários: escolher Ajudante no formulário, listagens e filtros por tipo; testes de permissão por tela; verificação ao vivo logado como ajudante. |

## Critérios de Aceite (da guarda-chuva)

- Cada linha da matriz "Permissões por tela" tem um teste de service (backend) e, onde há tela, um teste de componente ou de guard (frontend): o ajudante pode o que a matriz libera e é recusado no resto, **no backend**, e não só escondido na tela.
- Nenhum `tipo === GESTOR` direto sobra fora de `permissao-usuario.ts`.
- Desenvolvedor, gestor e administrador não mudam de comportamento (suítes existentes verdes).
- Verificação ao vivo, logado como ajudante, nas telas da matriz, nos dois temas.

## Fora de Escopo

- Permissão configurável por usuário (cada pessoa com um conjunto próprio): o ajudante é um tipo fixo.
- Qualquer mudança de poder do desenvolvedor, do gestor ou do administrador.
- Visual do selo de tipo além do que o formulário e a listagem de usuários já mostram.

## Dependências

- `docs/SYSTEM.SPEC.md` §14 (regras de negócio) e `docs/SCHEMA.md`: o ajudante muda "gestor não entra em `demanda_usuario`" e "desenvolvedor só vê projetos em que tem demanda"; a §14 é atualizada junto (o documento vence o código).
- **Impacto medido (`npm run impacto`):** `TipoUsuarioEnum` tem 45 consumidores e 181 testes (17 em `shared`, 20 no backend). Já existe `temPermissaoDeGestor` como regra única; é o ponto de partida.

## Riscos e Mitigação

- **Defeito de permissão silencioso:** como o ajudante é "desenvolvedor com extras", uma checagem esquecida o trata como desenvolvedor (nega) e é fácil de notar; a falha perigosa é o inverso, tratá-lo como gestor onde não deve. Mitigação: permissões por ação, nunca `tipo !== DESENVOLVEDOR`.
- **Matriz lida só no front:** a matriz do autor foi montada lendo rotas e templates; **o backend não foi conferido linha a linha**. A 284 começa por essa conferência e registra as divergências antes de implementar.
- **Divergências já vistas na matriz:** a aba Cliente do chat tem cadeado para quem não é gestor (a spec 256 diz que todos leem); o formulário de demanda mostra "status e tags" ao desenvolvedor, mas o seletor de status só edita para o gestor. Decidir cada uma na 284.
