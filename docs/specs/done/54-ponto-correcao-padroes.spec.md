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

### 1. Convenção definida (decisão tomada)

**Decisão:** opção (a) — DTOs de **relatório/consulta computada** (`Entidade + Recorte + Dto`,
sem verbo) e **value-objects** (nome do conceito, sem entidade nem verbo) são isentos do
verbo no particípio. **Os nomes atuais permanecem** (`PontoDiarioDto`, `PontoMensalDto`,
`IntervaloDto`). A regra **já foi escrita** no `SYSTEM.SPEC.md` §5.1 e no `CONVENTIONS.md`
(seção DTOs) — esta spec apenas confirma que não há rename a fazer.

### 2. Aplicar a decisão

- Nenhum rename — apenas garantir que a documentação (item abaixo) está consistente.
  `PontoService` (backend/frontend) e componentes de ponto ficam intocados.

---

## Atualização de Documentação (obrigatória)

- **`SYSTEM.SPEC.md` §5.1** e **`CONVENTIONS.md` (seção DTOs)** — **já contêm** a subseção
  "DTOs de relatório / consulta computada" e "value-objects" com a regra decidida e os
  exemplos ✅ (`PontoDiarioDto`, `PontoMensalDto`, `IntervaloDto`). Esta spec apenas confirma
  a consistência — a lacuna está fechada.

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
