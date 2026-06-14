# 23 — Frontend Projeto + Tag

**Depende de:** 22
**Entrega:** telas de projetos e gerenciamento de tags

---

## Objetivo

Telas de projeto (listagem, detalhe, criação/edição) e tela de
gerenciamento de tags (gestor). Tags incluídas aqui por serem simples
e de administração similar.

---

## Arquivos a Criar

```
frontend/src/app/modules/projeto/
  projeto.routes.ts
  pages/
    projeto-listagem/
    projeto-formulario/
    projeto-detalhe/
  services/
    projeto.service.ts
  models/
    projeto.model.ts

frontend/src/app/modules/tag/
  tag.routes.ts
  pages/
    tag-listagem/
  services/
    tag.service.ts
```

---

## projeto.service.ts

```typescript
listar(filtros: ProjetoListarDto): Observable<...>
criar(dto: ProjetoCriarDto): Observable<...>
recuperar(id: number): Observable<...>
atualizar(id: number, dto: ProjetoAtualizarDto): Observable<...>
excluir(id: number): Observable<...>
```

---

## Telas de Projeto

### projeto-listagem

- Cards ou tabela de projetos com cor de identificação (`p-tag` colorido com a cor do projeto)
- Badge de status com cores:
  - ATIVO → verde
  - PAUSADO → amarelo
  - CONCLUIDO → azul
  - CANCELADO → vermelho
- Filtro por status
- Botão "Novo Projeto" visível apenas para gestores
- Clique no projeto → `/projeto/:id`
- Paginação server-side

### projeto-formulario (gestores)

- Campos: nome, código (uppercase automático), cor (usando `p-colorpicker`), status, data início, data previsão fim
- Validação: previsão fim deve ser posterior ao início
- Botões: Salvar, Cancelar

### projeto-detalhe

- Header com nome, código, badge de status e cor do projeto
- Abas (`p-tabView`):
  - **Demandas:** lista raiz das demandas do projeto (navega para `/demanda`)
  - **Informações:** dados completos do projeto com botão editar (gestores)
- Botão "Nova Demanda" abre formulário de demanda com `projetoId` pré-preenchido

---

## Telas de Tag

### tag-listagem (gestores apenas)

- Tabela simples: nome, preview de cor (bolinha colorida), ações
- Inline create: linha de criação na própria tabela
- Edição inline ou via dialog
- Confirmação para exclusão

---

## NÃO implementar nesta task

- Listagem de membros por projeto (derivada das demandas)
- Estatísticas de horas do projeto
- Filtro de demandas por tag (parte do módulo demanda)
