# 25 — Frontend Atividade

**Depende de:** 24
**Entrega:** telas de atividades com tags e assistente de descrição

---

## Arquivos a Criar

```
frontend/src/app/modules/atividade/
  atividade.routes.ts
  pages/
    atividade-listagem/
    atividade-formulario/
    atividade-detalhe/
  services/
    atividade.service.ts
  models/
    atividade.model.ts
```

---

## atividade.service.ts

```typescript
listar(filtros: AtividadeListarDto): Observable<...>
criar(dto: AtividadeCriarDto): Observable<...>
recuperar(id: number): Observable<...>
atualizar(id: number, dto: AtividadeAtualizarDto): Observable<...>
excluir(id: number): Observable<...>
atualizarTags(id: number, dto: AtividadeTagsAtribuirDto): Observable<...>
```

---

## Telas

### atividade-listagem

Recebe `demandaId` como query param.

- Tabela com colunas: nome, executor (avatar + nome), status (badge com cores distintas), tags (chips)
- Filtro por status
- Botão "Nova Atividade" (qualquer autenticado com acesso à demanda)
- Clique → `/atividade/:id`

Status com cores:
- PLANEJADA → cinza
- PENDENTE → amarelo
- DESENVOLVENDO → azul
- DESENVOLVIDA → verde

### atividade-formulario

- Campos: nome, demanda (pre-selecionada), descrição com `AssistenteDescricaoComponent`, status, ordem de exibição
- O executor é automaticamente o usuário logado (backend define)
- Botões: Salvar, Cancelar

### atividade-detalhe

- Header: nome, status (badge editável via dropdown inline), executor, demanda (link)
- Descrição com botão editar
- Tags: chips coloridos (gestor pode editar via multiselect dialog)
- Botão "Iniciar Execução" → inicia execução nesta atividade e navega para `/execucao`
- Lista de execuções recentes (últimas 5) com link para histórico completo

---

## NÃO implementar nesta task

- Timer de execução (task 26)
- Histórico completo de execuções (task 26)
