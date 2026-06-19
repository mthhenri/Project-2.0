# Task 54 — ponto: Correção de Padrões

## Objetivo

Resolver a ambiguidade de nomenclatura dos DTOs de **saída** do módulo **ponto**
identificada pela auditoria da **task 44** (`docs/AUDITORIA.md` §4.7): DTOs de
relatório/value-object fora do padrão `Entidade + Complemento? + Verbo + Dto`, num
ponto em que o SPEC **não documenta** a convenção para esse tipo de DTO.

> **Referência cruzada:** task 44 · `docs/AUDITORIA.md` §4.7.

---

## Contexto

O padrão de DTOs do SPEC §5.1 (verbo no infinitivo para entrada, particípio para saída,
`ResumoDto` para listagem) foi pensado para **operações de CRUD sobre entidades**. O
módulo ponto, porém, expõe **relatórios computados** (não há entidade `ponto`), e seus
DTOs de saída não têm verbo:

- `shared/src/dtos/ponto/PontoDiarioDto.ts` — relatório do dia.
- `shared/src/dtos/ponto/PontoMensalDto.ts` — relatório do mês.
- `shared/src/dtos/ponto/IntervaloDto.ts` — **value-object** (`{ inicioData, fimData, duracaoMinutos }`).

Isso não é um desvio do desenvolvedor, e sim uma **lacuna de documentação**: o SPEC não
diz como nomear DTOs de relatório/consulta-computada e value-objects. (Note que
`PontoDiaResumoDto` já segue, corretamente, o sufixo `ResumoDto` para item de lista.)

---

## Escopo

### 1. Definir a convenção (decisão obrigatória)

Decidir e registrar **uma** regra para DTOs que **não** representam operação de CRUD sobre
entidade. Opções:

- **(a) Exceção documentada:** DTOs de **relatório/consulta computada** (módulos como
  ponto) e **value-objects** (sub-estruturas reaproveitadas, como `Intervalo`) são
  **isentos** do verbo no particípio; nomeiam-se pelo substantivo do conceito + `Dto`
  (`PontoDiarioDto`, `PontoMensalDto`, `IntervaloDto`). → mantém os nomes atuais.
- **(b) Aderência ao particípio:** renomear para a forma de saída consultada, ex.:
  `PontoDiarioConsultadoDto`, `PontoMensalConsultadoDto` — e tratar `IntervaloDto` como
  value-object isento (não há verbo natural).

> **Recomendação:** opção (a) — é a que reflete a intenção e evita renomeações em cascata
> (frontend `PontoService`, componentes de ponto). O essencial é **escrever a regra**.

### 2. Aplicar a decisão

- Se **(a)**: nenhum rename — apenas a documentação (abaixo).
- Se **(b)**: renomear os arquivos/classes, atualizar barrels (`shared/src/dtos/ponto/index.ts`),
  `PontoService` (backend e frontend) e componentes consumidores; `IntervaloDto` permanece.

---

## Atualização de Documentação (obrigatória)

- **`SYSTEM.SPEC.md` §5.1** e **`CONVENTIONS.md` (seção DTOs)** — acrescentar uma
  subseção inequívoca **"DTOs de relatório e value-objects"** com a regra decidida no
  Escopo §1 e exemplos ✅ (`PontoDiarioDto`, `IntervaloDto`) — fechando a lacuna para que
  futuros DTOs de relatório não fiquem ambíguos.

---

## Verificação

1. `npm run build --workspace=shared`, `--workspace=backend` e `--workspace=frontend` — sem erros.
2. A seção "DTOs de relatório e value-objects" existe e cobre `PontoDiarioDto`,
   `PontoMensalDto` e `IntervaloDto`.
3. Se opção (b): nenhum DTO de saída de ponto fica sem verbo (exceto value-objects
   explicitamente isentos pela nova regra) e os barrels/consumidores compilam.

---

## NÃO implementar nesta task

- Qualquer mudança nos demais módulos.
- Alterar o cálculo/comportamento do ponto (service) — apenas nomenclatura/documentação.
- Renomear `PontoDiaResumoDto` (já conforme) ou os DTOs de entrada `*ConsultarDto` (já conformes).
