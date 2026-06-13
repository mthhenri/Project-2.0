# 01 — Pacote Shared

**Depende de:** 00
**Entrega:** pacote `@project20/shared` com todos os enums e interfaces do projeto

---

## Objetivo

Criar o pacote compartilhado que será consumido pelo backend e pelo frontend.
Contém todos os enums de negócio, interfaces genéricas e a estrutura de pastas
para os DTOs (que serão populados nas tasks de cada módulo).

---

## Estrutura a Criar

```
shared/
  package.json
  tsconfig.json
  src/
    index.ts
    enums/
      index.ts
      usuario-tipo.enum.ts
      usuario-status.enum.ts
      projeto-status.enum.ts
      demanda-status.enum.ts
      demanda-prioridade.enum.ts
      atividade-status.enum.ts
      dia-nao-util-tipo.enum.ts
    interfaces/
      index.ts
      standard-response.interface.ts
      paginated-result.interface.ts
    dtos/
      index.ts
      usuario/
        index.ts
      projeto/
        index.ts
      demanda/
        index.ts
      atividade/
        index.ts
      execucao/
        index.ts
      ponto/
        index.ts
      calendario/
        index.ts
      tag/
        index.ts
      assistente/
        index.ts
```

---

## Implementação

### package.json

```json
{
  "name": "@project20/shared",
  "version": "1.0.0",
  "main": "src/index.ts",
  "types": "src/index.ts"
}
```

### tsconfig.json

```json
{
  "compilerOptions": {
    "target": "ES2020",
    "module": "commonjs",
    "strict": true,
    "esModuleInterop": true,
    "declaration": true,
    "outDir": "./dist"
  },
  "include": ["src/**/*"]
}
```

### Enums

Todos os enums seguem o padrão: string enum com valor igual ao nome.

```typescript
// usuario-tipo.enum.ts
export enum UsuarioTipoEnum {
  DESENVOLVEDOR = 'DESENVOLVEDOR',
  GESTOR        = 'GESTOR',
}

// usuario-status.enum.ts
export enum UsuarioStatusEnum {
  ATIVO   = 'ATIVO',
  INATIVO = 'INATIVO',
}

// projeto-status.enum.ts
export enum ProjetoStatusEnum {
  ATIVO     = 'ATIVO',
  PAUSADO   = 'PAUSADO',
  CONCLUIDO = 'CONCLUIDO',
  CANCELADO = 'CANCELADO',
}

// demanda-status.enum.ts
export enum DemandaStatusEnum {
  PLANEJADA          = 'PLANEJADA',
  EM_DESENVOLVIMENTO = 'EM_DESENVOLVIMENTO',
  CONCLUIDA          = 'CONCLUIDA',
}

// demanda-prioridade.enum.ts
export enum DemandaPrioridadeEnum {
  BAIXA   = 'BAIXA',
  MEDIA   = 'MEDIA',
  ALTA    = 'ALTA',
  CRITICA = 'CRITICA',
}

// atividade-status.enum.ts
export enum AtividadeStatusEnum {
  PLANEJADA    = 'PLANEJADA',
  PENDENTE     = 'PENDENTE',
  DESENVOLVENDO = 'DESENVOLVENDO',
  DESENVOLVIDA = 'DESENVOLVIDA',
}

// dia-nao-util-tipo.enum.ts
export enum DiaNaoUtilTipoEnum {
  FERIADO           = 'FERIADO',
  RECESSO           = 'RECESSO',
  PONTO_FACULTATIVO = 'PONTO_FACULTATIVO',
}
```

### Interfaces

```typescript
// standard-response.interface.ts
export interface StandardResponse<TDados = void> {
  sucesso: boolean;
  dados: TDados | null;
  mensagem: string;
  erros?: string[];
}

// paginated-result.interface.ts
export interface PaginatedResult<TItem> {
  itens: TItem[];
  totalItens: number;
  paginaAtual: number;
  itensPorPagina: number;
  totalPaginas: number;
}
```

### index.ts (raiz do shared)

Reexporta tudo:

```typescript
export * from './enums';
export * from './interfaces';
export * from './dtos';
```

Cada `index.ts` de subpasta reexporta os arquivos da própria pasta.
As pastas de DTOs ficam apenas com `index.ts` vazio por enquanto — serão
populadas nas tasks de cada módulo.

---

## NÃO implementar nesta task

- Nenhum DTO ainda — as pastas são criadas vazias
- Nenhum código de backend ou frontend
- Nenhuma lógica de negócio
