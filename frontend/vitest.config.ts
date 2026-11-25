import { defineConfig } from 'vitest/config';

// Só o que o builder `@angular/build:unit-test` não expõe por opção: onde cai o relatório de cobertura.
// Cobertura é medida, sem gate de porcentagem (task 172); a saída fica em `.artifacts/`, ignorada pelo Git.
// O limite de tempo é maior que o padrão (5 s) porque teste de componente com editor Milkdown ou PrimeNG montado
// estoura sob a carga da suíte inteira, embora passe sozinho (P-034).

// O Node 25+ traz um `localStorage` global próprio que, sem arquivo de armazenamento, vale `undefined`; o Vitest não
// sobrescreve com o do jsdom um global que já existe. A opção desliga o do Node nos processos de teste (task 495).
// Só é passada quando o Node em uso a conhece: o 20 não a tem e se recusaria a iniciar.
const SEM_ARMAZENAMENTO_DO_NODE = '--no-experimental-webstorage';

export default defineConfig({
    test: {
        execArgv: process.allowedNodeEnvironmentFlags.has(SEM_ARMAZENAMENTO_DO_NODE) ? [SEM_ARMAZENAMENTO_DO_NODE] : [],
        testTimeout: 20000,
        coverage: {
            reportsDirectory: '../.artifacts/cobertura/frontend',
            reporter: ['text-summary', 'json-summary', 'html'],
        },
    },
});
