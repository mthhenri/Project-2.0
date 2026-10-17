import assert from "node:assert/strict";
import { mkdtempSync, mkdirSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join, posix } from "node:path";
import test from "node:test";
import { avaliarEdicao } from "./agentes/hook-impacto.mjs";
import { CONFIG, consumidoresDoArquivo, consumidoresDoIcone, consumidoresDoSimbolo } from "./impacto.mjs";

// Fixtures montadas a partir do CONFIG: o mesmo teste vale para qualquer configuração.
const [area] = CONFIG.areas;
const pacote = CONFIG.pacoteCompartilhado;

function montarArvore(arquivos) {
    const raiz = mkdtempSync(join(tmpdir(), "impacto-"));
    for (const [caminho, conteudo] of Object.entries(arquivos)) {
        mkdirSync(dirname(join(raiz, caminho)), { recursive: true });
        writeFileSync(join(raiz, caminho), conteudo);
    }
    return raiz;
}

function comArvore(arquivos, verificar) {
    const raiz = montarArvore(arquivos);
    try { verificar(raiz); } finally { rmSync(raiz, { recursive: true, force: true }); }
}

const nomes = (resultado) => resultado.consumidores.map((c) => c.arquivo).sort();

test("arquivo: acha importadores relativos e usos do seletor, separando testes", () => {
    comArvore({
        [`${area}/ui/botao/botao.component.ts`]: "@Component({ selector: 'button[app-botao], a[app-botao]' })\nexport class Botao {}",
        [`${area}/modulos/a/a.page.ts`]: "import { Botao } from '../../ui/botao/botao.component';",
        [`${area}/modulos/b/b.page.html`]: "<button app-botao variante=\"primario\">Ok</button>",
        [`${area}/modulos/c/c.page.html`]: "<button app-botao-icone>x</button>",
        [`${area}/ui/botao/botao.component.spec.ts`]: "import { Botao } from './botao.component';",
    }, (raiz) => {
        const resultado = consumidoresDoArquivo(`${area}/ui/botao/botao.component.ts`, { raiz });
        assert.deepEqual(nomes(resultado), [`${area}/modulos/a/a.page.ts`, `${area}/modulos/b/b.page.html`]);
        assert.deepEqual(resultado.testes.map((t) => t.arquivo), [`${area}/ui/botao/botao.component.spec.ts`]);
    });
});

test("pacote compartilhado: acha consumidores pelos nomes exportados", { skip: !pacote && "sem pacote compartilhado" }, () => {
    const fora = CONFIG.areas.find((candidata) => !`${candidata}/`.startsWith(pacote.pasta));
    comArvore({
        [`${pacote.pasta}regras/vida.ts`]: "export function calcularVida() {}\nexport const VIDA_BASE = 1;",
        [`${fora}/servico.ts`]: `import { calcularVida } from '${pacote.nome}';`,
        [`${fora}/outro.ts`]: `import { outraCoisa } from '${pacote.nome}';`,
    }, (raiz) => {
        const resultado = consumidoresDoArquivo(`${pacote.pasta}regras/vida.ts`, { raiz });
        assert.deepEqual(nomes(resultado), [`${fora}/servico.ts`]);
        assert.match(resultado.consumidores[0].motivo, /calcularVida/);
    });
});

test("scss: acha @use pelo nome do parcial e usos das custom properties", { skip: !CONFIG.extensoes.includes(".scss") && "sem SCSS" }, () => {
    comArvore({
        [`${area}/styles/tema/_tokens.scss`]: ":root {\n  --surface: #000;\n  --accent: #fff;\n}",
        [`${area}/a.scss`]: "@use \"tema/tokens\";",
        [`${area}/b.scss`]: ".x { color: var(--accent); }",
        [`${area}/c.scss`]: "@use \"tema/breakpoints\" as bp;",
    }, (raiz) => {
        assert.deepEqual(nomes(consumidoresDoArquivo(`${area}/styles/tema/_tokens.scss`, { raiz })), [`${area}/a.scss`, `${area}/b.scss`]);
    });
});

test("ícone: distingue uso direto de literal e ignora a pasta do próprio ícone", { skip: !CONFIG.icone && "sem componente de ícone" }, () => {
    const { pasta, atributo } = CONFIG.icone;
    const perfil = posix.join(pasta, "../../perfil.page.html");
    const shell = posix.join(pasta, "../../shell.ts");
    comArvore({
        [`${pasta}icone.component.html`]: "@case (\"patente\") {}",
        [perfil]: `<app-icone ${atributo}="patente" />`,
        [shell]: "{ caminho: 'x', icone: 'patente' }",
        [posix.join(pasta, "../../outro.html")]: `<app-icone ${atributo}="patentes" />`,
    }, (raiz) => {
        assert.deepEqual(consumidoresDoIcone("patente", { raiz }).consumidores.map((c) => [c.arquivo, c.motivo]),
            [[perfil, "uso direto"], [shell, "literal (conferir se é ícone)"]]);
    });
});

test("símbolo: casa o identificador inteiro, não prefixos", () => {
    comArvore({ [`${area}/a.ts`]: "const x = FichaDto;", [`${area}/b.ts`]: "const y = FichaDtoResumo;" }, (raiz) => {
        assert.deepEqual(nomes(consumidoresDoSimbolo("FichaDto", { raiz })), [`${area}/a.ts`]);
    });
});

test("hook: lembra em zona compartilhada e em arquivo muito usado; cala no resto", () => {
    const raiz = "/repo";
    const entrada = (caminho) => ({ tool_input: { file_path: `/repo/${caminho}` } });
    const minimo = CONFIG.minimoConsumidores;
    assert.match(avaliarEdicao(entrada(`${CONFIG.zonas[0]}servico.ts`), { raiz, contar: () => 0 }), /zona compartilhada/);
    if (CONFIG.icone) {
        assert.match(avaliarEdicao(entrada(`${CONFIG.icone.pasta}icone.component.ts`), { raiz, contar: () => 0 }), /--icone/);
    }
    assert.match(avaliarEdicao(entrada("fora-das-zonas/servico.ts"), { raiz, contar: () => minimo }), new RegExp(`${minimo} consumidor`));
    assert.equal(avaliarEdicao(entrada("fora-das-zonas/pagina.ts"), { raiz, contar: () => minimo - 1 }), null);
    assert.equal(avaliarEdicao(entrada(`${CONFIG.zonas[0]}servico.spec.ts`), { raiz, contar: () => 9 }), null);
    assert.equal(avaliarEdicao(entrada("docs/context/CONTEXT.md"), { raiz, contar: () => 9 }), null);
    assert.equal(avaliarEdicao(entrada(`${CONFIG.zonas[0]}servico.ts`),
        { raiz, contar: () => 9, jaAvisados: new Set([`${CONFIG.zonas[0]}servico.ts`]) }), null);
});
