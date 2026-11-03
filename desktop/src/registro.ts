// O registro do Project Desktop (P-069): um arquivo de texto na pasta de dados do usuário com o que acontece às janelas, para que uma janela
// que não aparece ou aparece preta deixe rastro. Só funções puras; o `main.ts` grava.

/** O arquivo na pasta de dados do usuário (`app.getPath('userData')`); o anterior fica com o sufixo `.1`. */
export const ARQUIVO_DO_REGISTRO = 'registro.log';
/** Passando disto o arquivo é renovado (o atual vira o `.1`, e o `.1` antigo some). */
export const LIMITE_DO_REGISTRO_BYTES = 512 * 1024;
const LIMITE_DOS_DETALHES = 500;

/** Uma linha do registro: data ISO, o evento e os detalhes em JSON, sempre numa linha só e com tamanho limitado. */
export function linhaDoRegistro(data: Date, evento: string, detalhes: Record<string, unknown> = {}): string {
    let json: string;
    try {
        json = JSON.stringify(detalhes);
    } catch {
        json = '"detalhes ilegíveis"';
    }
    const texto = `${evento} ${json}`.replace(/[\r\n]+/g, ' ');
    return `${data.toISOString()} ${texto.slice(0, LIMITE_DOS_DETALHES)}\n`;
}

/** O arquivo atual já passou do limite e deve ser renovado antes da próxima linha. */
export function deveRenovarRegistro(tamanhoAtualBytes: number, limiteBytes = LIMITE_DO_REGISTRO_BYTES): boolean {
    return tamanhoAtualBytes >= limiteBytes;
}
