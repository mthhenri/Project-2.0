#!/usr/bin/env node
// Lista os consumidores de um item compartilhado antes de alterá-lo (skill
// `gerenciamento-de-impacto`). Busca textual orientada — o resultado é ponto de partida,
// não prova: confira cada consumidor e procure usos dinâmicos que a busca não vê.
//
//   npm run impacto -- <arquivo>            importadores, seletor do componente, @use SCSS
//   npm run impacto -- --icone <nome>       uso no componente de ícone (CONFIG.icone) e literais
//   npm run impacto -- --simbolo <Nome>     ocorrências do identificador
//   acrescente --json para saída legível por máquina (usada pelo hook)
import { existsSync, readdirSync, readFileSync, statSync } from "node:fs";
import { basename, dirname, extname, join, relative, resolve, sep } from "node:path";
import { fileURLToPath } from "node:url";

// ── CONFIGURAÇÃO ─────────────────────────────────────────────────────────────────────────
// adoção: única parte que muda entre projetos; o resto do arquivo é cópia do repositório-fonte.
export const CONFIG = {
    /** Pastas varridas (relativas à raiz). adoção: as pastas de código do projeto. */
    areas: ["shared/src", "backend/src", "frontend/src"],
    /** adoção: as extensões que o projeto usa. */
    extensoes: [".ts", ".tsx", ".html", ".scss", ".css"],
    ignorados: ["node_modules", "dist", "build", "coverage", ".angular", ".next"],
    /** Pacote compartilhado importado por nome: consumidores achados pelos nomes exportados.
     *  adoção: pasta e nome do pacote, ou null se não houver. */
    pacoteCompartilhado: { pasta: "shared/src/", nome: "@project20/shared" },
    /** Componente de ícone por nome; null se o projeto não tiver.
     *  adoção: ex. { pasta: "frontend/src/app/shared/icone/", consumidores: "frontend/", atributo: "nome" } */
    icone: null,
    /** Zonas compartilhadas por definição: o hook lembra mesmo com poucos importadores diretos.
     *  adoção: componentes/primitivos compartilhados, tema, núcleo do backend. */
    zonas: [
        "shared/src/",
        "frontend/src/app/shared/",
        "frontend/src/app/core/",
        "backend/src/core/",
    ],
    /** Fora das zonas, o hook lembra a partir deste número de consumidores diretos. */
    minimoConsumidores: 3,
};
// ─────────────────────────────────────────────────────────────────────────────────────────

const RAIZ_PADRAO = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const EXTENSOES = new Set(CONFIG.extensoes);
const IGNORADOS = new Set(CONFIG.ignorados);

const normalizar = (caminho) => caminho.split(sep).join("/");

export function listarArquivos(raiz = RAIZ_PADRAO) {
    const arquivos = [];
    const visitar = (pasta) => {
        for (const entrada of readdirSync(pasta, { withFileTypes: true })) {
            if (IGNORADOS.has(entrada.name)) continue;
            const caminho = join(pasta, entrada.name);
            if (entrada.isDirectory()) visitar(caminho);
            else if (EXTENSOES.has(extname(entrada.name))) arquivos.push(normalizar(relative(raiz, caminho)));
        }
    };
    for (const area of CONFIG.areas) if (existsSync(join(raiz, area))) visitar(join(raiz, area));
    return arquivos;
}

function linhasQue(conteudo, teste) {
    const linhas = [];
    conteudo.split(/\r?\n/).forEach((linha, indice) => { if (teste(linha)) linhas.push(indice + 1); });
    return linhas;
}

const escapar = (texto) => texto.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
const CODIGO = /\.(ts|tsx|js|jsx|mjs)$/;
const ESTILO = /\.s?css$/;
const TESTE = /\.(spec|test)\.[cm]?[jt]sx?$/;
const semExtensao = (caminho) => caminho.replace(CODIGO, "").replace(/\/index$/, "");
const separarTestes = (consumidores) => ({
    consumidores: consumidores.filter((c) => !TESTE.test(c.arquivo)),
    testes: consumidores.filter((c) => TESTE.test(c.arquivo)),
});

/** Importadores por caminho relativo e, no pacote compartilhado, pelos nomes exportados. */
function importadoresTs(alvo, arquivos, ler) {
    const consumidores = [];
    const alvoBase = semExtensao(alvo);
    const pacote = CONFIG.pacoteCompartilhado;
    const exportados = pacote && alvo.startsWith(pacote.pasta)
        ? [...ler(alvo).matchAll(/export\s+(?:declare\s+)?(?:abstract\s+)?(?:const|let|function|class|interface|type|enum)\s+([A-Za-z_$][\w$]*)/g)].map((m) => m[1])
        : [];
    for (const arquivo of arquivos) {
        if (arquivo === alvo || !CODIGO.test(arquivo)) continue;
        const conteudo = ler(arquivo);
        const relativos = [...conteudo.matchAll(/(?:from|import\()\s*["'](\.[^"']+)["']/g)]
            .some((m) => semExtensao(normalizar(join(dirname(arquivo), m[1]))) === alvoBase);
        if (relativos) {
            consumidores.push({ arquivo, motivo: "import", linhas: linhasQue(conteudo, (l) => /from\s|import\(/.test(l) && l.includes(basename(alvoBase))) });
            continue;
        }
        if (exportados.length && !arquivo.startsWith(pacote.pasta) && conteudo.includes(pacote.nome)) {
            const usados = exportados.filter((nome) => new RegExp(`\\b${escapar(nome)}\\b`).test(conteudo));
            if (usados.length) consumidores.push({ arquivo, motivo: `${pacote.nome}: ${usados.join(", ")}`, linhas: [] });
        }
    }
    return consumidores;
}

/** Templates que usam o seletor de um componente/diretiva Angular. */
function usuariosDoSeletor(alvoTs, arquivos, ler) {
    const seletor = ler(alvoTs).match(/selector:\s*["'`]([^"'`]+)["'`]/)?.[1];
    if (!seletor) return { seletor: null, consumidores: [] };
    const padroes = [];
    for (const parte of seletor.split(",").map((p) => p.trim())) {
        const elemento = parte.match(/^([a-z][\w-]*)/)?.[1];
        const atributos = [...parte.matchAll(/\[([\w-]+)/g)].map((m) => m[1]);
        if (atributos.length) atributos.forEach((a) => padroes.push(new RegExp(`[\\s<]${escapar(a)}(?=[\\s=>/])`)));
        else if (elemento) padroes.push(new RegExp(`<${escapar(elemento)}(?=[\\s>/])`));
    }
    const proprio = alvoTs.replace(CODIGO, "");
    const consumidores = [];
    for (const arquivo of arquivos) {
        if (arquivo.startsWith(proprio) || ESTILO.test(arquivo)) continue;
        const linhas = linhasQue(ler(arquivo), (l) => padroes.some((p) => p.test(l)));
        if (linhas.length) consumidores.push({ arquivo, motivo: `seletor ${seletor}`, linhas });
    }
    return { seletor, consumidores };
}

/** `@use`/`@forward`/`@import` que resolvem para o parcial SCSS e usos das custom properties. */
function usuariosScss(alvo, arquivos, ler) {
    const nome = basename(alvo).replace(/^_/, "").replace(ESTILO, "");
    const pasta = basename(dirname(alvo));
    const consumidores = [];
    for (const arquivo of arquivos) {
        if (arquivo === alvo || !ESTILO.test(arquivo)) continue;
        const linhas = linhasQue(ler(arquivo), (l) => {
            const especificador = l.match(/@(?:use|forward|import)\s+["']([^"']+)["']/)?.[1];
            if (!especificador) return false;
            const partes = especificador.split("/");
            const ultimo = partes.at(-1).replace(/^_/, "").replace(ESTILO, "");
            return ultimo === nome && (partes.length === 1 || partes.at(-2) === pasta || partes.at(-2) === "..");
        });
        if (linhas.length) consumidores.push({ arquivo, motivo: "@use", linhas });
    }
    const propriedades = [...new Set([...ler(alvo).matchAll(/^\s*(--[\w-]+)\s*:/gm)].map((m) => m[1]))];
    if (propriedades.length) {
        const padrao = new RegExp(`var\\((${propriedades.map(escapar).join("|")})[,)]`);
        for (const arquivo of arquivos) {
            if (arquivo === alvo || consumidores.some((c) => c.arquivo === arquivo)) continue;
            const linhas = linhasQue(ler(arquivo), (l) => padrao.test(l));
            if (linhas.length) consumidores.push({ arquivo, motivo: "custom property", linhas });
        }
    }
    return consumidores;
}

export function consumidoresDoArquivo(alvoInformado, { raiz = RAIZ_PADRAO, arquivos = listarArquivos(raiz), ler } = {}) {
    const lerArquivo = ler ?? ((caminho) => readFileSync(join(raiz, caminho), "utf8"));
    let alvo = normalizar(relative(raiz, resolve(raiz, alvoInformado)));
    const notas = [];
    const componente = alvo.replace(/\.(html|s?css)$/, ".ts");
    if (componente !== alvo && arquivos.includes(componente)) {
        notas.push(`Template/estilo de ${componente}: consumidores do componente.`);
        alvo = componente;
    }
    let consumidores = [];
    if (ESTILO.test(alvo)) consumidores = usuariosScss(alvo, arquivos, lerArquivo);
    else if (CODIGO.test(alvo)) {
        consumidores = importadoresTs(alvo, arquivos, lerArquivo);
        const { seletor, consumidores: doSeletor } = usuariosDoSeletor(alvo, arquivos, lerArquivo);
        if (seletor) {
            notas.push(`Seletor: ${seletor}`);
            for (const consumidor of doSeletor) if (!consumidores.some((c) => c.arquivo === consumidor.arquivo)) consumidores.push(consumidor);
        }
    }
    if (CONFIG.icone && alvo.startsWith(CONFIG.icone.pasta)) notas.push("Ícone: o impacto real é por glifo — rode também `npm run impacto -- --icone <nome>`.");
    return { alvo, notas, ...separarTestes(consumidores) };
}

export function consumidoresDoIcone(nome, { raiz = RAIZ_PADRAO, arquivos = listarArquivos(raiz), ler } = {}) {
    const lerArquivo = ler ?? ((caminho) => readFileSync(join(raiz, caminho), "utf8"));
    if (!CONFIG.icone) throw new Error("CONFIG.icone não configurado neste projeto.");
    const { pasta, consumidores: prefixo, atributo } = CONFIG.icone;
    const direto = new RegExp(`\\b${atributo}=["']${escapar(nome)}["']`);
    const literal = new RegExp(`["']${escapar(nome)}["']`);
    const consumidores = [];
    for (const arquivo of arquivos.filter((a) => a.startsWith(prefixo) && !a.startsWith(pasta) && !ESTILO.test(a))) {
        const conteudo = lerArquivo(arquivo);
        const diretas = linhasQue(conteudo, (l) => direto.test(l));
        const literais = linhasQue(conteudo, (l) => !direto.test(l) && literal.test(l));
        if (diretas.length) consumidores.push({ arquivo, motivo: "uso direto", linhas: diretas });
        if (literais.length) consumidores.push({ arquivo, motivo: "literal (conferir se é ícone)", linhas: literais });
    }
    return { alvo: `ícone ${nome}`, notas: [], ...separarTestes(consumidores) };
}

export function consumidoresDoSimbolo(nome, { raiz = RAIZ_PADRAO, arquivos = listarArquivos(raiz), ler } = {}) {
    const lerArquivo = ler ?? ((caminho) => readFileSync(join(raiz, caminho), "utf8"));
    const padrao = new RegExp(`(?<![\\w$-])${escapar(nome)}(?![\\w$-])`);
    const consumidores = [];
    for (const arquivo of arquivos) {
        const linhas = linhasQue(lerArquivo(arquivo), (l) => padrao.test(l));
        if (linhas.length) consumidores.push({ arquivo, motivo: "ocorrência", linhas });
    }
    return { alvo: `símbolo ${nome}`, notas: [], ...separarTestes(consumidores) };
}

function imprimir({ alvo, notas, consumidores, testes }) {
    console.log(`Impacto de ${alvo}: ${consumidores.length} consumidor(es), ${testes.length} teste(s).`);
    for (const nota of notas) console.log(`  · ${nota}`);
    const porArea = Map.groupBy(consumidores, (c) => c.arquivo.split("/")[0]);
    for (const [area, itens] of porArea) {
        console.log(`\n${area} (${itens.length})`);
        for (const { arquivo, motivo, linhas } of itens) console.log(`  ${arquivo}${linhas.length ? `:${linhas.join(",")}` : ""}  — ${motivo}`);
    }
    if (testes.length) console.log(`\ntestes (${testes.length})\n${testes.map((t) => `  ${t.arquivo}`).join("\n")}`);
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
    const argumentos = process.argv.slice(2);
    const json = argumentos.includes("--json");
    const resto = argumentos.filter((a) => a !== "--json");
    let resultado;
    if (resto[0] === "--icone" && resto[1]) resultado = consumidoresDoIcone(resto[1]);
    else if (resto[0] === "--simbolo" && resto[1]) resultado = consumidoresDoSimbolo(resto[1]);
    else if (resto[0] && !resto[0].startsWith("--") && existsSync(resolve(RAIZ_PADRAO, resto[0])) && statSync(resolve(RAIZ_PADRAO, resto[0])).isFile()) resultado = consumidoresDoArquivo(resto[0]);
    else {
        console.error("Uso: npm run impacto -- <arquivo> | --icone <nome> | --simbolo <Nome> [--json]");
        process.exit(1);
    }
    if (json) console.log(JSON.stringify(resultado));
    else imprimir(resultado);
}
