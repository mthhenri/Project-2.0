# 88 — Seletor de Demanda Pai: exibir o caminho da árvore (hierarquia de nomes)

**Depende de:** 10 (demanda CRUD), 11 (hierarquia), 26 (frontend demanda), 87 (seletor de demanda pai só estruturais)
**Entrega:** shared + backend + frontend — sem migration

---

## Problema

No seletor de **Demanda Pai** (criação e edição de demanda), demandas estruturais aninhadas
aparecem apenas com o próprio nome, sem indicar a que estrutura pertencem. Quando há estrutura
dentro de estrutura — ex.: `Integrador Gemini` dentro de `IA` — o nome isolado é ambíguo.

O seletor deve exibir o **caminho da árvore** (raiz → demanda), ex.: `IA › Integrador Gemini`,
para desambiguar demandas homônimas e deixar clara a posição na hierarquia. Uma demanda raiz
aparece só com o próprio nome (`IA`).

---

## Escopo

### Arquivos a alterar

| Arquivo | Mudança |
|---|---|
| `shared/src/dtos/demanda/DemandaResumoDto.ts` | novo campo `caminho: string` (caminho de nomes raiz→demanda) |
| `backend/src/modules/demanda/repositories/demanda.repository.ts` | `listar()`: CTE recursivo calcula `caminho`; itens fazem `LEFT JOIN` + `COALESCE(...) AS "caminho"`; constante `SEPARADOR_CAMINHO = ' › '` passada como parâmetro nomeado `:separadorCaminho` |
| `frontend/src/app/modules/demanda/components/demanda-formulario-dialog/demanda-formulario-dialog.component.html` | `<p-select>` de Demanda Pai: `optionLabel="nome"` → `optionLabel="caminho"` |
| `frontend/src/app/modules/demanda/components/demanda-edicao-dialog/demanda-edicao-dialog.component.html` | idem |

> `DemandaResumoDto` é produzido **apenas** por `DemandaRepository.listar` (consumido por
> `DemandaService.listar`) — por isso `caminho` pode ser campo **obrigatório** sem risco de
> `undefined` em runtime.

---

## Implementação

### 1. `DemandaResumoDto` (shared)

Adicionar após `nome`:

```typescript
@ApiProperty({ example: 'IA › Integrador Gemini › Parser' })
caminho: string;
```

### 2. `DemandaRepository.listar()` (backend)

Constante no topo do arquivo (após o bloco de imports):

```typescript
/** Separador exibido entre os níveis do caminho da demanda (raiz → folha). */
const SEPARADOR_CAMINHO = ' › ';
```

Na query de **itens** (não no `COUNT`), prefixar o CTE recursivo e fazer o `LEFT JOIN`:

```sql
WITH RECURSIVE caminho_demanda AS (
  SELECT demanda.id, demanda.nome::text AS caminho
  FROM demanda
  WHERE demanda.projeto_id = :projetoId
    AND demanda.demanda_pai_id IS NULL
    AND demanda.is_deleted = false
  UNION ALL
  SELECT demanda_filho.id,
         (caminho_demanda.caminho || :separadorCaminho || demanda_filho.nome)::text
  FROM demanda AS demanda_filho
  INNER JOIN caminho_demanda ON demanda_filho.demanda_pai_id = caminho_demanda.id
  WHERE demanda_filho.projeto_id = :projetoId
    AND demanda_filho.is_deleted = false
)
SELECT DISTINCT
   demanda.id,
   demanda.nome,
   COALESCE(caminho_demanda.caminho, demanda.nome) AS "caminho",
   tipo_demanda_status.codigo AS status,
   demanda.is_estrutural   AS "isEstrutural",
   demanda.horas_estimadas AS "horasEstimadas"
FROM demanda
${joinStatus}
${joinDemandaUsuario}
LEFT JOIN caminho_demanda ON caminho_demanda.id = demanda.id
WHERE ${clausulaWhere}
ORDER BY demanda.nome ASC
${clausulaPaginacao}
```

- Acrescentar `parametros.separadorCaminho = SEPARADOR_CAMINHO;` antes de executar.
- O CTE cobre **toda** a árvore do projeto (escopado por `projeto_id`); o `LEFT JOIN` +
  `COALESCE` garante `caminho = próprio nome` para raízes e órfãos (pai soft-deletado).
- Parâmetro nomeado (`:separadorCaminho`) — nunca interpolação de string (regra SQL do projeto).

### 3. Frontend — os dois diálogos

Nos dois HTMLs, no `<p-select>` de Demanda Pai:

```html
<!-- Antes -->  optionLabel="nome"
<!-- Depois --> optionLabel="caminho"
```

`carregarDemandasPai()` permanece **igual** (mantém `isEstrutural: true` da task 87). O filtro
`demanda.id !== this.demandaId` do `demanda-edicao-dialog` também permanece.

---

## Verificação

1. `npm run build --workspace=backend` e `npm run build --workspace=frontend` — sem erros.
2. `GET /demanda?projetoId=X&isEstrutural=true` retorna cada item com `caminho` preenchido
   (raiz = próprio nome; aninhada = `Pai › Filho`).
3. No seletor de Demanda Pai (criar **e** editar), demandas aninhadas aparecem como
   `IA › Integrador Gemini`; raízes aparecem só com o nome.
4. Demandas de outros projetos não influenciam o caminho (CTE escopada por `projeto_id`).
