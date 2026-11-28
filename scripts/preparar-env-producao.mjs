// Cria o infra/producao/.env, com segredos próprios, na primeira subida da produção. Nunca sobrescreve um que já existe.
import { randomBytes } from 'node:crypto';
import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

export const SEGREDOS_GERADOS = ['DB_SENHA', 'JWT_SECRETO'];

/** Preenche, no modelo, cada segredo vazio com um valor gerado; o resto fica como está. */
export function preencherSegredos(modelo, gerar) {
    return SEGREDOS_GERADOS.reduce((texto, chave) => texto.replace(new RegExp(`^${chave}=[ \\t]*$`, 'm'), () => `${chave}=${gerar()}`), modelo);
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
    const pasta = resolve(fileURLToPath(import.meta.url), '../../infra/producao');
    const destino = resolve(pasta, '.env');
    if (!existsSync(destino)) {
        const modelo = readFileSync(resolve(pasta, '.env.example'), 'utf8');
        writeFileSync(destino, preencherSegredos(modelo, () => randomBytes(32).toString('hex')), { flag: 'wx' });
        console.log('infra/producao/.env criado com senha do banco e segredo do JWT novos.');
    }
}
