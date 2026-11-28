import { CorteSemanal } from '../../../config/corte-semanal';

const MILISSEGUNDOS_DO_DIA = 24 * 60 * 60 * 1000;

/** Quanto o relógio de parede do fuso está à frente do UTC no instante dado, em milissegundos. */
function deslocamentoDoFuso(instante: number, fusoHorario: string): number {
    const partes = new Intl.DateTimeFormat('en-US', {
        timeZone: fusoHorario, hourCycle: 'h23', year: 'numeric', month: 'numeric', day: 'numeric', hour: 'numeric', minute: 'numeric', second: 'numeric',
    }).formatToParts(instante);
    const valor = (tipo: Intl.DateTimeFormatPartTypes) => Number(partes.find((parte) => parte.type === tipo)?.value);
    const relogioDeParede = Date.UTC(valor('year'), valor('month') - 1, valor('day'), valor('hour'), valor('minute'), valor('second'));
    return relogioDeParede - Math.floor(instante / 1000) * 1000;
}

/** Segundos de `agora` até a próxima ocorrência do corte semanal no fuso (task 498); no instante exato do corte vale a semana seguinte. */
export function segundosAteOCorte(agora: Date, corte: CorteSemanal, fusoHorario: string): number {
    // As datas "locais" abaixo guardam o relógio de parede do fuso nos campos UTC.
    const agoraLocal = new Date(agora.getTime() + deslocamentoDoFuso(agora.getTime(), fusoHorario));
    const diasAteLa = (corte.diaDaSemana - agoraLocal.getUTCDay() + 7) % 7;
    let corteLocal = Date.UTC(agoraLocal.getUTCFullYear(), agoraLocal.getUTCMonth(), agoraLocal.getUTCDate() + diasAteLa, corte.hora, corte.minuto);
    if (corteLocal <= agoraLocal.getTime()) corteLocal += 7 * MILISSEGUNDOS_DO_DIA;
    // O deslocamento é o do dia do corte, que pode não ser o de hoje (horário de verão).
    const estimativa = corteLocal - deslocamentoDoFuso(corteLocal, fusoHorario);
    const instanteDoCorte = corteLocal - deslocamentoDoFuso(estimativa, fusoHorario);
    // O `iat` do token é o segundo cheio de agora: contar a partir dele faz o vencimento cair no corte exato.
    return Math.round(instanteDoCorte / 1000) - Math.floor(agora.getTime() / 1000);
}
