import { readdirSync, readFileSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const raiz = resolve(fileURLToPath(import.meta.url), '..', '..', 'frontend', 'src');

/** Linhas dos templates com o atributo HTML literal `style="..."` (`[style]` e `[style.x]` do Angular não entram). */
export function estilosInlineDoTemplate(texto) {
    return texto.split(/\r?\n/)
        .map((linha, indice) => ({ linha: indice + 1, texto: linha }))
        .filter(({ texto: conteudo }) => /(?<![\w[.-])style\s*=\s*["']/.test(conteudo));
}

function listarTemplates(pasta) {
    return readdirSync(pasta, { withFileTypes: true }).flatMap((entrada) => {
        const caminho = join(pasta, entrada.name);
        if (entrada.isDirectory()) return listarTemplates(caminho);
        return entrada.name.endsWith('.html') && !entrada.name.endsWith('.spec.html') ? [caminho] : [];
    });
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
    const achados = listarTemplates(raiz).flatMap((arquivo) => estilosInlineDoTemplate(readFileSync(arquivo, 'utf8')).map((achado) => `${arquivo}:${achado.linha}`));
    console.log(`Estilo inline literal: ${achados.length} ocorrência(s).`);
    if (achados.length) {
        achados.forEach((achado) => console.error(achado));
        process.exitCode = 1;
    }
}
