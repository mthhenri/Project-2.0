# Task 118 — Permissão de gestor centralizada

> Origem: guarda-chuva [`rework-chat-ia.spec.md`](rework-chat-ia.spec.md), bloco 1 (primeira de duas
> tasks). **Refactor que preserva o comportamento**: nenhum usuário ganha ou perde acesso.

## Objetivo

Trocar as comparações espalhadas `tipo === TipoUsuarioEnum.GESTOR` por **uma regra única**,
"este tipo tem permissão de gestor?", definida uma vez em `shared/` e usada por backend e
frontend. É o pré-requisito da task 119: com a regra centralizada, introduzir o tipo
`ADMINISTRADOR` passa a ser mudar um lugar só, em vez de caçar 25 comparações.

## Entregáveis

### 1. Regra única no `shared/`

- Função pura `temPermissaoDeGestor(tipo: TipoUsuarioEnum): boolean`, hoje equivalente a
  `tipo === GESTOR`. Local exato conforme a estrutura do `shared/` (ao lado dos enums/validadores;
  exportada pelo `index`).
- Teste (`node:test`) cobrindo `GESTOR` → `true` e `DESENVOLVEDOR` → `false`. A task 119 acrescenta o
  caso do administrador.

### 2. Backend

Classificar **cada** ocorrência (`npm run impacto -- shared/src/enums/tipo-usuario.enum.ts`) como:

| Natureza | Tratamento |
|---|---|
| **Permissão** ("só quem tem poder de gestor") | passa a usar `temPermissaoDeGestor` |
| **Exibição/identidade** (rótulo "Gestor", cor da tag) | fica como está; é da task 119 |
| **Restrição ao desenvolvedor** (`=== DESENVOLVEDOR`) | avaliar caso a caso; permanece quando significa "somente desenvolvedor" |

Ocorrências de permissão conhecidas (contagem de 2026-10-17, 25 ocorrências em `GESTOR`):

- `GestorGuard` (`autenticacao/guards/gestor.guard.ts:19`).
- `UsuarioService`: `alterar` (linhas ~128 e ~138) e `validarPermanenciaDeGestorAtivo` (~158);
  `UsuarioRepository.listarGestoresAtivos` (~357). **A guarda de permanência não muda aqui**:
  continua "ao menos um gestor ativo" (a 119 a substitui).
- `ProjetoService` (~66), `AtividadeService` (~51), `DemandaService` (~122 e ~647),
  `ExecucaoService` (~391, "dono não é gestor").

### 3. Frontend

- `UsuarioSessaoService.eGestor` passa a derivar de `temPermissaoDeGestor`. **O nome `eGestor` é
  mantido** (115 usos em templates e componentes): seu significado vira "tem permissão de gestor"
  e nenhum consumidor precisa mudar.
- Ocorrências de permissão fora da sessão, a converter para a regra única:
  `atividade-listagem.page.ts:549` (dono é gestor) e os filtros que tiram gestores das listas de
  membros (`demanda-formulario-dialog:386`, `demanda-detalhe-dialog:601`,
  `demanda-arvore-painel:398`). O motivo do filtro é a regra de negócio "quem tem poder de gestor
  não entra em `demanda_usuario`", portanto é permissão, não exibição.
- Ficam para a 119: rótulos e cores por tipo (`usuario-listagem`, `usuario-perfil-dialog`,
  `demanda-membro-lista`, `usuario-formulario-dialog`, `topbar`).

### 4. Documentação

- `docs/CONVENTIONS.md`: registrar que permissão de gestor se decide por `temPermissaoDeGestor`,
  nunca por comparação direta de tipo. `docs/SYSTEM.SPEC.md` §14 só se citar a comparação direta.

## Impacto em consumidores

Aplicar a skill `gerenciamento-de-impacto`. O diff deve trazer a tabela das 25 ocorrências com a
classificação acima e o destino de cada uma. Qualquer ocorrência que não caiba em nenhuma das três
naturezas vai ao autor antes de ser alterada.

## Critérios de Aceite

- `grep -rn "TipoUsuarioEnum.GESTOR" backend/src frontend/src` só retorna ocorrências de
  **exibição/identidade** (listadas no fecho) e testes; nenhuma decisão de permissão compara o tipo.
- Gestor e desenvolvedor veem e podem exatamente o que viam antes. Verificação ao vivo com os dois
  perfis: rota gestor-only (ex.: `/projeto`) abre para gestor e é recusada para desenvolvedor; nav
  da topbar inalterada; listas de membros de demanda continuam sem gestores.
- `npm run test --workspace=shared`, `npm run test --workspace=backend` e os builds de backend e
  frontend passam. Declarar a lacuna: frontend sem testes.

## Fora de Escopo

- Criar o tipo `ADMINISTRADOR` (task 119).
- Mudar rótulos, cores e filtros por tipo.
- Trocar `=== DESENVOLVEDOR` por negação de `temPermissaoDeGestor` onde o significado for
  "somente desenvolvedor".

## Dependências

Nenhuma. Bloqueia a 119. Fontes: `docs/SYSTEM.SPEC.md` §14 e a guarda-chuva (seção "Usuário
administrador").
