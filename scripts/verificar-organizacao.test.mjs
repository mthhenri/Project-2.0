import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { mkdtempSync, mkdirSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import test from "node:test";
import { verificarCaminhos, verificarEspelhos, verificarRepositorio } from "./verificar-organizacao.mjs";

test("aceita anexos, fonte SVG, corpus e documentos canônicos", () => {
    assert.deepEqual(verificarCaminhos([
        "docs/specs/active/tarefa-01.spec.md", "docs/specs/active/tarefa-01/prancha.html",
        "docs/specs/active/tarefa-01/fonte.svg", "docs/specs/active/tarefa-01/corpus.json",
        "docs/assets/diagrama.png", "public/logo.png",
        "docs/specs/TEMPLATE.spec.md"
    ]), []);
});

test("recusa os quatro depósitos paralelos e artefatos locais forçados", () => {
    for (const caminho of ["docs/reviews/relatorio.md", "docs/auditorias/relatorio.md",
        "docs/superpowers/plans/plano.md", "docs/propostas/poc.html",
        ".artifacts/tarefa/captura.png", "cenario.json"]) {
        assert.ok(verificarCaminhos([caminho]).length, caminho);
    }
});

test("recusa spec externa e anexo com proprietário em outro estado", () => {
    assert.ok(verificarCaminhos(["docs/design/novo.spec.md"]).length);
    assert.ok(verificarCaminhos([
        "docs/specs/done/tarefa.spec.md", "docs/specs/active/tarefa/plano.md"
    ]).some(erro => erro.includes("órfão")));
});

test("recusa captura e auditoria dispersas mesmo fora das antigas pastas", () => {
    for (const caminho of ["docs/capturas/verificacao.png", "captura-1920x1080.png",
        "docs/auditoria-2026-10-08.md", "playwright-report/index.html",
        "docs/verificacao.png", "resultado.png"]) {
        assert.ok(verificarCaminhos([caminho]).length, caminho);
    }
});

test("recusa capturas e novas pastas de fluxo mesmo com proprietário", () => {
    assert.ok(verificarCaminhos([
        "docs/specs/done/tarefa.spec.md", "docs/specs/done/tarefa/captura.PNG"
    ]).some(erro => erro.includes("captura/binário")));
    assert.ok(verificarCaminhos(["docs/specs/plans/plano.md"]).length);
});

test("confere auxiliares e espelhos ausentes, não somente SKILL.md", () => {
    const caminhos = ["AGENTS.md", "CLAUDE.md", ".agents/skills/task/references/exemplo.md"];
    const lerArquivo = () => Buffer.from("igual");
    assert.equal(verificarEspelhos(caminhos, lerArquivo).length, 1);
    caminhos.push(".claude/skills/task/references/exemplo.md");
    assert.deepEqual(verificarEspelhos(caminhos, lerArquivo), []);
    assert.equal(verificarEspelhos(caminhos, caminho => Buffer.from(caminho)).length, 2);
});

test("índice detecta captura forçada e espelho divergente escondidos na árvore local", () => {
    const raiz = mkdtempSync(join(tmpdir(), "organizacao-"));
    const git = argumentos => execFileSync("git", argumentos, { cwd: raiz, stdio: "pipe" });
    const escrever = (caminho, conteudo) => {
        mkdirSync(dirname(join(raiz, caminho)), { recursive: true });
        writeFileSync(join(raiz, caminho), conteudo);
    };
    try {
        git(["init"]);
        escrever("AGENTS.md", "igual\n");
        escrever("CLAUDE.md", "igual\n");
        escrever(".gitignore", ".artifacts/\n");
        git(["add", "."]);
        assert.deepEqual(verificarRepositorio(raiz, true), []);
        escrever(".artifacts/tarefa/captura.png", "imagem");
        assert.deepEqual(verificarRepositorio(raiz), []);
        git(["add", "-f", ".artifacts/tarefa/captura.png"]);
        rmSync(join(raiz, ".artifacts/tarefa/captura.png"));
        escrever("CLAUDE.md", "diferente\n");
        git(["add", "CLAUDE.md"]);
        escrever("CLAUDE.md", "igual\n");
        assert.deepEqual(verificarRepositorio(raiz), []);
        const erros = verificarRepositorio(raiz, true);
        assert.ok(erros.length >= 2);
        assert.ok(erros.some(erro => erro.includes("captura.png")));
        assert.ok(erros.some(erro => erro.includes("Espelhos diferentes")));
        git(["add", "-u"]);
        assert.deepEqual(verificarRepositorio(raiz, true), []);
    } finally {
        rmSync(raiz, { recursive: true, force: true });
    }
});
