# 30 — Frontend Calendario

**Depende de:** 23
**Entrega:** tela de gerenciamento de dias não úteis

---

## Arquivos a Criar

```
frontend/src/app/modules/calendario/
  calendario.routes.ts
  pages/
    calendario-listagem/
      calendario-listagem.page.ts
      calendario-listagem.page.html
  services/
    calendario.service.ts
  models/
    dia-nao-util.model.ts
```

---

## calendario.service.ts

```typescript
listar(): Observable<StandardResponse<DiaNaoUtilResumoDto[]>>
criar(dto: DiaNaoUtilCriarDto): Observable<...>
recuperar(id: number): Observable<...>
alterar(id: number, dto: DiaNaoUtilAlterarDto): Observable<...>
excluir(id: number): Observable<...>
verificarDiaUtil(data: string): Observable<...>
```

---

## Tela calendario-listagem

Acessível por qualquer autenticado. Ações de criação/edição/exclusão
visíveis apenas para gestores.

**Duas visualizações via toggle:**

**Visualização em tabela:**
- Colunas: data (formatada com `data-brasileira.pipe`), descrição, tipo (badge), recorrente (ícone)
- Botão "Novo Dia Não Útil" (gestores) → abre dialog
- Ações por linha: editar, excluir com confirmação (gestores)

**Visualização em calendário** (`p-calendar` inline do PrimeNG):
- Dias não úteis marcados com estilo diferenciado
- Clique num dia marcado → exibe detalhes via tooltip ou panel
- Fins de semana destacados automaticamente pelo componente

**Dialog de criação/edição:**
- Campos: data (`p-datepicker`), descrição, tipo (`p-dropdown`), recorrente (`p-checkbox`)
- Ao selecionar `recorrente = true`, mostrar aviso: "Este feriado será considerado em todos os anos no mesmo dia/mês"
- Botões: Salvar, Cancelar

**Verificador de dia útil:**
- Pequeno painel com date picker e botão "Verificar"
- Exibe resultado: "Dia útil" em verde ou "Não útil — [motivo]" em vermelho
- Útil para desenvolvedores consultarem rapidamente

---

## NÃO implementar nesta task

- Importação de feriados via API externa
- Calendário mensal com execuções marcadas
- Notificação de feriados futuros
