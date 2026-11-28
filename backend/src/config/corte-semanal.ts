/** O dia e a hora em que todos os tokens vencem, toda semana (task 498), no fuso de `APP_TIMEZONE`. */
export interface CorteSemanal {
    /** 0 = domingo … 6 = sábado. */
    diaDaSemana: number;
    hora: number;
    minuto: number;
}

/** Os dias aceitos em `JWT_CORTE_SEMANAL`, na posição que vale o número do dia. */
export const DIAS_DO_CORTE_SEMANAL: readonly string[] = ['DOMINGO', 'SEGUNDA', 'TERCA', 'QUARTA', 'QUINTA', 'SEXTA', 'SABADO'];

const FORMATO = /^([A-Z]+)\s+([01]?\d|2[0-3]):([0-5]\d)$/;

/** Lê `JWT_CORTE_SEMANAL` (`SEGUNDA 06:00`); ausente desliga o corte, valor inválido derruba a subida com mensagem clara. */
export function lerCorteSemanal(valor: string | undefined): CorteSemanal | undefined {
    const informado = valor?.trim().toUpperCase();
    if (!informado) return undefined;
    const partes = FORMATO.exec(informado);
    const diaDaSemana = partes ? DIAS_DO_CORTE_SEMANAL.indexOf(partes[1]) : -1;
    if (!partes || diaDaSemana < 0) {
        throw new Error(`Corte semanal inválido: ${valor} (JWT_CORTE_SEMANAL é "<DIA> <HH:MM>", com o dia entre ${DIAS_DO_CORTE_SEMANAL.join(', ')})`);
    }
    return { diaDaSemana, hora: Number(partes[2]), minuto: Number(partes[3]) };
}
