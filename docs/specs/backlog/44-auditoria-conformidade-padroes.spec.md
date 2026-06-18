# 44 — Auditoria de Conformidade de Padrões

**Depende de:** todas as tasks de implementação concluídas (00–43) — a auditoria avalia o estado atual do código.
**Entrega:** uma **varredura completa** do projeto (`shared/`, `backend/`, `frontend/`, `docs/`) em busca de qualquer artefato **fora do padrão** definido em `SYSTEM.SPEC.md` e `CONVENTIONS.md` (métodos, DTOs, endpoints, SQL, nomenclatura, camadas, estilos). Para cada violação encontrada, esta task **gera novas specs de correção — uma por módulo afetado** — e, dentro de cada uma, prevê a **atualização da documentação** para impedir que o mesmo desvio volte a acontecer.

> Esta é uma task de **auditoria + geração de specs**, não de correção. Ela **não altera código de produção** — apenas produz o relatório de auditoria e as specs de correção no backlog. As correções em si são implementadas nas tasks geradas.

---

## Princípio

O `SYSTEM.SPEC.md` é a constituição do projeto e tem precedência sobre tudo. Ao longo de 40+ tasks, é natural que desvios tenham se acumulado (DTOs com nome antigo, métodos `existe*`, queries sem `is_deleted = false`, primitivos em assinaturas, etc.). Esta task **mede o débito de conformidade** de forma sistemática e o transforma em backlog acionável, módulo a módulo, sempre fechando o ciclo com a documentação reforçada.

---

## Contexto

Já existe precedente de tasks de correção de padrão geradas a partir de uma revisão:
- **19-backend-correcao-nomenclatura** — `atualizar`→`alterar`, `existe*`→`validar*`, DTOs alias expandidos, query de módulo errado movida.
- **20-backend-correcao-recuperar-dto** — eliminação de primitivos em assinaturas, `buscarIdentificador`→`recuperar(dto)`.

Esta task formaliza esse processo como uma **varredura recorrente e completa**, cobrindo backend, shared **e** frontend, e exige que cada lote de correções venha acompanhado de reforço documental.

---

## Escopo da Varredura (Checklist de Auditoria)

A varredura deve cobrir **todo** o projeto e classificar cada achado por módulo. Os critérios abaixo derivam diretamente das **25 Proibições Absolutas** do `SYSTEM.SPEC.md` (§16) e da tabela de proibições do `CONVENTIONS.md`.

### A. Nomenclatura e Linguagem

- [ ] Nomes abreviados de variáveis, métodos, parâmetros, classes ou arquivos (`u`, `tp`, `repo.find`, `calcHrs`).
- [ ] Conceito de **negócio** escrito em inglês (deveria ser português).
- [ ] Conceito **genérico/arquitetural** escrito em português (deveria ser inglês).
- [ ] Métodos nomeados `existe*` em vez de `validar*`.
- [ ] Uso de `atualizar`/`atualizado` em DTO ou método de negócio (deveria ser `alterar`/`alterado`).
- [ ] Métodos fora do padrão `verbo + entidade` (ex.: `createUser`, `getUser`, `findByLogin`).
- [ ] Arquivo de entidade em inglês ou padrão técnico genérico em português (cruzar com a tabela §4 do SPEC).

### B. DTOs (`shared/src/dtos/`)

- [ ] DTO definido **dentro** de `backend/` ou `frontend/` em vez de `shared/`.
- [ ] DTO como **alias ou re-export** de outro DTO (deve ter campos próprios).
- [ ] DTO de entrada/saída fora do padrão `Entidade + Complemento? + Verbo + Dto` (entrada infinitivo, saída particípio).
- [ ] Listagem cuja saída não seja `...ResumoDto`.
- [ ] Recuperação individual sem `EntidadeRecuperarDto { id: number }`.
- [ ] Complemento de múltiplas palavras com o verbo no meio (`DemandaMembroAtribuirInternoDto` ❌).
- [ ] `index.ts` (barrel) do módulo desatualizado (DTO não exportado ou export órfão).

### C. Endpoints e Controllers

- [ ] Controller com **lógica** (`if`, `try/catch`, transformação de dados, acesso a repositório).
- [ ] Endpoint sem o guard/decorator de autorização correto (`@GestorOnly()`, `@Public()`, `@ActiveUser()`).
- [ ] Rota declarada em ordem que conflita com `:id` (ex.: `GET /:id` antes de `GET /verificar`).
- [ ] Verbo HTTP incoerente com a operação (alteração via `POST`, etc.).

### D. Services

- [ ] Regra de negócio ausente da service (vazada para controller ou repositório).
- [ ] Exceção fora do conjunto padrão (`BusinessException`, `ResourceNotFoundException`, `UnauthorizedAccessException`).
- [ ] Método público **sem JSDoc** (Proibição §17).
- [ ] Primitivo passado como parâmetro de service (deveria ser DTO, mesmo para um único campo).

### E. Repositories e SQL

- [ ] `SELECT` sem `WHERE [tabela].is_deleted = false`.
- [ ] Parâmetro **posicional** `?` ou **interpolação** de string em SQL (deveria ser `:nome` com objeto).
- [ ] `INSERT` com `VALUES` em vez de `INSERT ... SELECT ... RETURNING`.
- [ ] `DEFAULT` em coluna SQL (migrations) — a aplicação deve fornecer todos os valores.
- [ ] **Alias abreviado** em query (`a`, `d`, `e`) em vez de nome completo/descritivo.
- [ ] Campo de data fora do padrão `[contexto]_date`/`[contexto]_data` (`_at`, `_em`, `data_[contexto]`).
- [ ] `DELETE` físico em vez de `executarSoftDelete()`.
- [ ] Lógica de negócio (`if` de validação) dentro do repositório.
- [ ] Primitivo em assinatura de método de repositório.
- [ ] Query cuja responsabilidade é de **outro módulo** (ex.: query em `usuario` dentro de `DemandaRepository`).
- [ ] Uso de ORM / query builder em vez de `knex.raw()`.
- [ ] Acesso a `process.env` direto em vez de `ConfigService`.

### F. Frontend (Angular)

- [ ] Componente com **NgModule** em vez de standalone.
- [ ] Estado reativo com `Subject`/`BehaviorSubject` onde um signal resolveria.
- [ ] Formulário template-driven em vez de Reactive Forms.
- [ ] Arquivo `.css` em vez de `.scss`.
- [ ] `style=""` inline no HTML.
- [ ] Seletor de **ID** em SCSS.
- [ ] Classe BEM fora do padrão `bloco__elemento--modificador` em português.
- [ ] DTO/enum redefinido localmente em vez de importado de `@project20/shared`.
- [ ] Rota sem `loadComponent` (lazy loading).

### G. Regras de Negócio Fundamentais (§14 / §16)

- [ ] Criação da tabela ou referência a `projeto_usuario` (não existe — acesso via `demanda_usuario`).
- [ ] Caminho que permita duas execuções ativas (sem `fim_data`) para o mesmo usuário.
- [ ] Inserção de `DemandaConexao` sem validação de ciclo via CTE recursivo.

---

## Procedimento

1. **Varrer** sistematicamente cada pasta (`shared/`, `backend/src/`, `frontend/src/`, migrations e `docs/`), aplicando o checklist acima.
2. **Registrar** cada achado em um **relatório de auditoria**: `docs/AUDITORIA.md`, com uma tabela por módulo:

   | Módulo | Arquivo:Linha | Categoria (A–G) | Violação | Correção sugerida |
   |---|---|---|---|---|

   No topo do relatório, um sumário com a contagem de violações por módulo e por categoria, além da data da auditoria.
3. **Agrupar** os achados **por módulo** (`usuario`, `projeto`, `demanda`, `atividade`, `execucao`, `ponto`, `calendario`, `tag`, `assistente`, `autenticacao`, `core`/`shared`, e os módulos de frontend correspondentes).
4. **Gerar uma spec de correção por módulo que apresentar pelo menos uma violação** — módulos limpos não geram spec. Numeração sequencial a partir do **próximo número livre no backlog** (45, 46, …), no formato:

   ```
   docs/specs/backlog/<n>-<modulo>-correcao-padroes.spec.md
   ```

   Cada spec gerada deve conter, no mínimo:
   - **Objetivo** e referência cruzada à task 44 e à linha correspondente em `docs/AUDITORIA.md`.
   - **Escopo** — lista exaustiva das violações daquele módulo, cada uma com arquivo, situação atual e correção esperada (no nível de detalhe das tasks 19 e 20).
   - **Atualização de documentação** (obrigatória — ver próxima seção).
   - **Verificação** — comandos de build (`npm run build --workspace=...`) e checagens negativas (ex.: "nenhum repositório contém método `existe*`").
   - Seção **NÃO implementar nesta task** delimitando o escopo (somente as correções daquele módulo, sem extrapolar).
5. **Atualizar** `docs/CONTEXT.md`: registrar a auditoria como concluída, apontar o relatório e listar as specs de correção geradas como próximas tasks do backlog.

---

## Atualização de Documentação (prevenção de recorrência)

Cada spec de correção gerada **deve** incluir um passo de reforço documental, para que o desvio corrigido não retorne. Conforme a natureza da violação:

- **Padrão já documentado, mas violado** → adicionar uma linha explícita na tabela de proibições do `CONVENTIONS.md` e/ou em `SYSTEM.SPEC.md §16`, citando o caso concreto como exemplo de "❌ Nunca fazer / ✅ Fazer em vez disso".
- **Padrão ambíguo ou não documentado** → escrever a regra de forma inequívoca no `SYSTEM.SPEC.md` (seção pertinente) e espelhá-la no `CONVENTIONS.md`.
- **Exemplo concreto ausente** → acrescentar o par ✅/❌ correspondente nas seções de exemplos.

A documentação é **fonte da verdade**: nenhuma spec de correção é considerada completa sem o item de documentação que fecha a brecha.

---

## Arquivos afetados (por esta task 44)

```
docs/AUDITORIA.md                                   (novo — relatório da varredura)
docs/specs/backlog/<n>-<modulo>-correcao-padroes.spec.md   (novos — uma por módulo com achados)
docs/CONTEXT.md                                     (registro da auditoria + próximas tasks)
```

> Esta task **não** toca em código de `shared/`, `backend/` ou `frontend/`. Sem migration.

---

## Verificação

1. `docs/AUDITORIA.md` existe, com sumário por módulo/categoria e tabela detalhada de achados.
2. Para **todo** módulo com pelo menos um achado no relatório, existe a spec `…-correcao-padroes.spec.md` correspondente no backlog.
3. Toda spec de correção gerada contém a seção **Atualização de Documentação**.
4. Nenhum módulo sem achados gerou spec (evitar ruído no backlog).
5. `docs/CONTEXT.md` reflete a auditoria concluída e lista as specs geradas.

---

## NÃO implementar nesta task

- Aplicar qualquer correção em código de produção — isso é responsabilidade das specs geradas.
- Alterar `SYSTEM.SPEC.md`/`CONVENTIONS.md` diretamente aqui — a atualização documental acontece **dentro de cada spec de correção**, junto da respectiva correção de código.
- Avaliar performance, cobertura de testes ou qualidade de UX — o foco é **conformidade com os padrões documentados**, não otimização.
- Criar uma única spec "guarda-chuva" com todos os módulos — a entrega é **uma spec por módulo** afetado.
