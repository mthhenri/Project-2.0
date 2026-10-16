# 98 — Feedback otimista nas mutações + skeletons no carregamento

**Origem:** Revisão de UI/UX — achados globais G6/G8, análises de Atividades, Demandas, Projetos e Ponto

**Depende de:** —

**Entrega:** fim do ciclo "mutação → refetch completo → spinner de página → tela pisca": trocas de status/tags atualizam a UI imediatamente (rollback + toast em erro); primeiras cargas usam **skeleton** com as dimensões do conteúdo real; recargas (troca de filtro/mês, `visibilitychange`) mantêm o conteúdo com opacidade reduzida + barra de progresso fina.

> **Frontend apenas.**

---

## Escopo

1. **Atividades**: troca de status atualiza a `p-tag` da linha in-place (padrão que as tags já usam); criar/registrar/excluir atualizam a lista localmente com o DTO retornado.
2. **Demandas**: troca de status/tags sem recarregar o grafo inteiro; **preservar o conjunto de nós expandidos** da árvore após qualquer recarga (signal de IDs expandidos reaplicado).
3. **Projetos**: editar aplica o `ProjetoAlteradoDto` retornado sem novo GET; excluir remove o card otimisticamente.
4. **Ponto**: skeleton na 1ª carga (cards de resumo + linhas); troca de mês/usuário e reload de `visibilitychange` preservam o conteúdo anterior esmaecido até a resposta.
5. **Execuções/Usuários/Tags/Calendário**: skeletons de tabela/grade correspondentes.

## Critérios de aceite

- Trocar status de uma atividade não move o scroll nem pisca a tabela; falha de rede reverte o chip e mostra toast de erro.
- Editar uma demanda profunda na árvore não colapsa a expansão.
- Voltar para a aba do Ponto não apaga a tela.

## NÃO implementar nesta task

- Undo de exclusões (task 99).
