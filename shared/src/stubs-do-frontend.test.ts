import { test } from 'node:test';
import * as fs from 'node:fs';
import * as path from 'node:path';
import assert from 'node:assert/strict';

// O frontend lê os DTOs do `shared` com stubs no lugar de `class-validator`, `class-transformer` e `@nestjs/swagger`
// (`frontend/tsconfig.json`, `paths`). Decorator novo num DTO sem o stub só aparece como erro no `ng build`, depois de o
// `shared` e o backend já estarem verdes (I-019). Este teste lê os arquivos como texto, sem ligar os dois workspaces.
const RAIZ_DO_SHARED = path.join(__dirname);
const PASTA_DOS_STUBS = path.join(__dirname, '..', '..', 'frontend', 'src', 'stubs');

const STUBS: Record<string, string> = {
  'class-validator': 'class-validator.stub.ts',
  'class-transformer': 'class-transformer.stub.ts',
  '@nestjs/swagger': 'nestjs-swagger.stub.ts',
};

function listarFontes(pasta: string): string[] {
  return fs.readdirSync(pasta, { withFileTypes: true }).flatMap((entrada) => {
    const caminho = path.join(pasta, entrada.name);
    if (entrada.isDirectory()) return listarFontes(caminho);
    return entrada.name.endsWith('.ts') && !entrada.name.endsWith('.test.ts') ? [caminho] : [];
  });
}

/** Nomes importados de cada pacote por todos os fontes do `shared` (os testes ficam de fora: o frontend não os compila). */
function nomesUsados(): Map<string, Map<string, string>> {
  const usados = new Map<string, Map<string, string>>(Object.keys(STUBS).map((pacote) => [pacote, new Map()]));
  const importacao = /import\s*(?:type\s*)?\{([^}]*)\}\s*from\s*'([^']+)'/g;
  for (const arquivo of listarFontes(RAIZ_DO_SHARED)) {
    const texto = fs.readFileSync(arquivo, 'utf8');
    for (const [, nomes, pacote] of texto.matchAll(importacao)) {
      const destino = usados.get(pacote);
      if (!destino) continue;
      for (const bruto of nomes.split(',')) {
        const nome = bruto.trim().replace(/^type\s+/, '').split(/\s+as\s+/)[0].trim();
        if (nome) destino.set(nome, path.relative(RAIZ_DO_SHARED, arquivo));
      }
    }
  }
  return usados;
}

function nomesExportadosPeloStub(arquivo: string): Set<string> {
  const texto = fs.readFileSync(path.join(PASTA_DOS_STUBS, arquivo), 'utf8');
  return new Set([...texto.matchAll(/export\s+(?:const|function|class|enum|type|interface)\s+([A-Za-z0-9_$]+)/g)].map((achado) => achado[1]));
}

test('o shared usa os três pacotes que o frontend substitui por stub', () => {
  const usados = nomesUsados();
  for (const pacote of Object.keys(STUBS)) {
    assert.ok((usados.get(pacote)?.size ?? 0) > 0, `nenhum import de ${pacote} encontrado: o teste deixou de enxergar os DTOs`);
  }
});

for (const [pacote, arquivoDoStub] of Object.entries(STUBS)) {
  test(`o stub do frontend exporta tudo o que o shared importa de ${pacote}`, () => {
    const exportados = nomesExportadosPeloStub(arquivoDoStub);
    const faltando = [...(nomesUsados().get(pacote) ?? [])].filter(([nome]) => !exportados.has(nome));
    assert.deepEqual(
      faltando.map(([nome, arquivo]) => `${nome} (usado em ${arquivo})`),
      [],
      `adicione ao frontend/src/stubs/${arquivoDoStub}`,
    );
  });
}
