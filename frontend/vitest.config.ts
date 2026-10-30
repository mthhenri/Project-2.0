import { defineConfig } from 'vitest/config';

// Só o que o builder `@angular/build:unit-test` não expõe por opção: onde cai o relatório de cobertura.
// Cobertura é medida, sem gate de porcentagem (task 172); a saída fica em `.artifacts/`, ignorada pelo Git.
// O limite de tempo é maior que o padrão (5 s) porque teste de componente com editor Milkdown ou PrimeNG montado
// estoura sob a carga da suíte inteira, embora passe sozinho (P-034).
export default defineConfig({
  test: {
    testTimeout: 20000,
    coverage: {
      reportsDirectory: '../.artifacts/cobertura/frontend',
      reporter: ['text-summary', 'json-summary', 'html'],
    },
  },
});
