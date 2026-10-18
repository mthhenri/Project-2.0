import { execFileSync } from "node:child_process";
import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";

/*
 * Adoção: este arquivo é o gabarito de `scripts/verificar-organizacao.mjs`. Ajuste só o bloco
 * CONFIGURAÇÃO abaixo ao projeto novo; o resto é genérico. Registre no package.json:
 *   "repo:verificar": "node scripts/verificar-organizacao.mjs",
 *   "repo:test": "node --test scripts/verificar-organizacao.test.mjs"
 */

// ---------------------------------------------------------------- CONFIGURAÇÃO
/** Pastas onde mídia (png, mp4...) é fonte/asset legítimo do produto, não evidência de execução. */
const RAIZES_MIDIA_PERMITIDAS = /^(?:public\/|src\/assets\/|desktop\/assets\/|docs\/(?:assets|design\/assets)\/)/;
/** Specs fora do ciclo backlog/active/done/discarded que são legítimas (modelos, constituição). */
const SPECS_EXCECAO = ["docs/specs/TEMPLATE.spec.md", "docs/SYSTEM.SPEC.md"];
// ---------------------------------------------------------------------------------

/** Confere destinos de documentação e artefatos na lista candidata ao versionamento. */
export function verificarCaminhos(caminhos) {
    const arquivos = new Set(caminhos);
    const erros = [];
    for (const caminho of arquivos) {
        if (/^(?:(?:docs\/)?(?:reviews|auditorias|superpowers|plans|propostas)\/|\.artifacts\/|\.planning\/)/i
            .test(caminho) || caminho === "cenario.json") {
            erros.push(`${caminho}: material de tarefa deve viver junto da spec; saída bruta em .artifacts/.`);
        }
        if (/(?:^|\/)(?:capturas|screenshots|test-results|playwright-report)\//i.test(caminho)
            || /^docs\/(?:design\/)?(?:auditoria|review)[^/]*\.md$/i.test(caminho)
            || /(?:^|\/)(?:captura|screenshot|prancha-\d)[^/]*\.(?:png|jpe?g|webp)$/i.test(caminho)) {
            erros.push(`${caminho}: evidência de execução deve ficar em .artifacts/.`);
        }
        if (/\.(?:png|jpe?g|webp|gif|avif|bmp|mp4|webm)$/i.test(caminho)
            && !RAIZES_MIDIA_PERMITIDAS.test(caminho)
            && !/(?:^|\/)(?:fixtures|__fixtures__)\//.test(caminho)) {
            erros.push(`${caminho}: mídia fora de fonte/asset/fixture canônicos; evidência vai em .artifacts/.`);
        }
        if (/\.spec\.md$/i.test(caminho)
            && !/^docs\/specs\/(?:backlog|active|done|discarded)\/[^/]+\.spec\.md$/.test(caminho)
            && !SPECS_EXCECAO.includes(caminho)) {
            erros.push(`${caminho}: spec fora do fluxo backlog → active → done (ou discarded).`);
        }
        if (!caminho.startsWith("docs/specs/")) continue;
        if (/\.(?:png|jpe?g|webp|gif|avif|bmp|mp4|webm|zip|pdf|log)$/i.test(caminho)) {
            erros.push(`${caminho}: captura/binário/log de execução não pode ser versionado em specs.`);
        }
        const partes = caminho.split("/");
        if (partes.length === 3) {
            if (!["README.md", "TEMPLATE.spec.md"].includes(partes[2])) {
                erros.push(`${caminho}: arquivo solto na raiz de specs.`);
            }
            continue;
        }
        if (!["backlog", "active", "done", "discarded"].includes(partes[2])) {
            erros.push(`${caminho}: pasta paralela ao ciclo de specs.`);
        } else if (partes.length === 4) {
            if (!partes[3].endsWith(".spec.md") && !partes[3].startsWith("INDEX-")
                && partes[3] !== ".gitkeep") {
                erros.push(`${caminho}: anexo deve ficar na pasta da tarefa.`);
            }
        } else if (!arquivos.has(`docs/specs/${partes[2]}/${partes[3]}.spec.md`)) {
            erros.push(`${caminho}: anexo órfão; falta spec proprietária no mesmo estado.`);
        }
    }
    return erros;
}

/** Confere cópias integrais das instruções e de todos os auxiliares das skills. */
export function verificarEspelhos(caminhos, lerArquivo) {
    const arquivos = new Set(caminhos);
    const pares = [["AGENTS.md", "CLAUDE.md"]];
    const nomes = new Set(caminhos.flatMap(caminho => {
        const correspondencia = caminho.match(/^\.(?:agents|claude)\/skills\/(.+)$/);
        return correspondencia ? [correspondencia[1]] : [];
    }));
    for (const nome of nomes) pares.push([`.agents/skills/${nome}`, `.claude/skills/${nome}`]);
    return pares.flatMap(([primeiro, segundo]) => {
        if (!arquivos.has(primeiro) || !arquivos.has(segundo)) {
            return [`Espelho ausente: ${primeiro} ↔ ${segundo}.`];
        }
        return lerArquivo(primeiro).equals(lerArquivo(segundo))
            ? [] : [`Espelhos diferentes: ${primeiro} ↔ ${segundo}.`];
    });
}

/** Valida a árvore de trabalho ou o conteúdo efetivamente preparado no índice. */
export function verificarRepositorio(raiz, preparado = false) {
    const git = argumentos => execFileSync("git", argumentos, { cwd: raiz });
    const argumentos = preparado
        ? ["ls-files", "--cached", "-z"]
        : ["ls-files", "--cached", "--others", "--exclude-standard", "-z"];
    const caminhos = [...new Set(git(argumentos).toString("utf8").split("\0").filter(Boolean))]
        .filter(caminho => preparado || existsSync(resolve(raiz, caminho)));
    const lerArquivo = caminho => preparado
        ? git(["show", `:${caminho}`]) : readFileSync(resolve(raiz, caminho));
    return [...verificarCaminhos(caminhos), ...verificarEspelhos(caminhos, lerArquivo)];
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
    const argumentos = process.argv.slice(2);
    if (argumentos.some(argumento => argumento !== "--staged")) {
        console.error("Uso: node scripts/verificar-organizacao.mjs [--staged]");
        process.exitCode = 2;
    } else {
        const preparado = argumentos.includes("--staged");
        const raiz = execFileSync("git", ["rev-parse", "--show-toplevel"], {
            encoding: "utf8"
        }).trim();
        const erros = verificarRepositorio(raiz, preparado);
        if (erros.length) {
            console.error(erros.join("\n"));
            process.exitCode = 1;
        } else {
            console.log(`Organização e espelhos aprovados (${preparado ? "índice" : "árvore local"}).`);
        }
    }
}
