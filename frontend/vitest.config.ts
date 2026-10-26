import { defineConfig } from 'vitest/config';

// Só o que o builder `@angular/build:unit-test` não expõe por opção: onde cai o relatório de cobertura.
// Cobertura é medida, sem gate de porcentagem (task 172); a saída fica em `.artifacts/`, ignorada pelo Git.
export default defineConfig({
  test: {
    // Os specs que montam o editor formatado (Milkdown) pesam na CPU do worker; com a suíte inteira em paralelo, um spec de tela pesada
    // (Modelagem, grafo de Demandas) passava dos 5 s padrão sem estar travado (CI do PR 17). Sozinhos, todos terminam em poucos segundos.
    testTimeout: 15_000,
    coverage: {
      reportsDirectory: '../.artifacts/cobertura/frontend',
      reporter: ['text-summary', 'json-summary', 'html'],
    },
  },
});
