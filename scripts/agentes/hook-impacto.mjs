#!/usr/bin/env node
// Hook PostToolUse (Edit|Write|MultiEdit) do Claude Code: ao editar um arquivo muito
// referenciado, injeta o lembrete da skill `gerenciamento-de-impacto` com a contagem de
// consumidores. Uma vez por arquivo por sessão; nunca bloqueia (sempre exit 0).
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { basename, dirname, join, relative, resolve, sep } from "node:path";
import { fileURLToPath } from "node:url";
import { CONFIG, consumidoresDoArquivo } from "../impacto.mjs";

const RAIZ = resolve(dirname(fileURLToPath(import.meta.url)), "..", "..");

export function avaliarEdicao(entrada, { raiz = RAIZ, jaAvisados = new Set(), contar } = {}) {
    const caminho = entrada?.tool_input?.file_path;
    if (!caminho) return null;
    const arquivo = relative(raiz, resolve(raiz, caminho)).split(sep).join("/");
    if (arquivo.startsWith("..") || /\.(spec|test)\.[cm]?[jt]s$/.test(arquivo) || jaAvisados.has(arquivo)) return null;
    if (!CONFIG.extensoes.some((extensao) => arquivo.endsWith(extensao))) return null;
    const naZona = CONFIG.zonas.some((zona) => arquivo.startsWith(zona));
    const total = (contar ?? ((alvo) => consumidoresDoArquivo(alvo, { raiz }).consumidores.length))(arquivo);
    if (!naZona && total < CONFIG.minimoConsumidores) return null;
    const icone = CONFIG.icone && arquivo.startsWith(CONFIG.icone.pasta)
        ? " Ícone: o impacto é por glifo — rode `npm run impacto -- --icone <nome>` para cada glifo alterado."
        : "";
    return `Gerenciamento de impacto: \`${arquivo}\` tem ${total} consumidor(es) direto(s)${naZona ? " e fica numa zona compartilhada" : ""}. `
        + `Antes de seguir, aplique a skill \`gerenciamento-de-impacto\`: rode \`npm run impacto -- ${arquivo}\`, `
        + `classifique cada consumidor e leve ao autor qualquer efeito além do pedido.${icone}`;
}

function lerAvisados(sessao) {
    const arquivo = join(tmpdir(), `impacto-${basename(RAIZ)}`, `${sessao.replace(/[^\w-]/g, "_")}.json`);
    try { return { arquivo, avisados: new Set(JSON.parse(readFileSync(arquivo, "utf8"))) }; }
    catch { return { arquivo, avisados: new Set() }; }
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
    try {
        const entrada = JSON.parse(readFileSync(0, "utf8"));
        const { arquivo: registro, avisados } = lerAvisados(String(entrada.session_id ?? "sem-sessao"));
        const lembrete = avaliarEdicao(entrada, { jaAvisados: avisados });
        if (lembrete) {
            const caminho = relative(RAIZ, resolve(RAIZ, entrada.tool_input.file_path)).split(sep).join("/");
            avisados.add(caminho);
            if (!existsSync(dirname(registro))) mkdirSync(dirname(registro), { recursive: true });
            writeFileSync(registro, JSON.stringify([...avisados]));
            console.log(JSON.stringify({ hookSpecificOutput: { hookEventName: "PostToolUse", additionalContext: lembrete } }));
        }
    } catch {
        // Lembrete é auxiliar: falha do hook nunca atrapalha a edição.
    }
    process.exit(0);
}
