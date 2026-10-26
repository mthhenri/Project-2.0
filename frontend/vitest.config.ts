import { defineConfig } from 'vitest/config';

// Só o que o builder `@angular/build:unit-test` não expõe por opção: onde cai o relatório de cobertura.
// Cobertura é medida, sem gate de porcentagem (task 172); a saída fica em `.artifacts/`, ignorada pelo Git.
export default defineConfig({
  test: {
    coverage: {
      reportsDirectory: '../.artifacts/cobertura/frontend',
      reporter: ['text-summary', 'json-summary', 'html'],
    },
  },
});
