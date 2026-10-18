import { BusinessException } from '../../../core/exceptions/business.exception';
import { dataNoFuso } from '../../chat/domain/chat-conversa';

/** `HH:mm` de um instante no fuso informado. */
export function horaNoFuso(instante: Date, fusoHorario: string): string {
  return new Intl.DateTimeFormat('en-GB', { timeZone: fusoHorario, hour: '2-digit', minute: '2-digit', hourCycle: 'h23' }).format(instante);
}

/** Quanto o fuso está à frente (positivo) ou atrás (negativo) de UTC num instante, em milissegundos. */
function deslocamentoDoFuso(instante: Date, fusoHorario: string): number {
  const partes = new Intl.DateTimeFormat('en-CA', {
    timeZone: fusoHorario, year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', second: '2-digit', hourCycle: 'h23',
  }).formatToParts(instante);
  const valor = (tipo: string): number => Number(partes.find((parte) => parte.type === tipo)?.value);
  const comoUtc = Date.UTC(valor('year'), valor('month') - 1, valor('day'), valor('hour'), valor('minute'), valor('second'));
  return comoUtc - Math.floor(instante.getTime() / 1000) * 1000;
}

/** O instante de um dia (`yyyy-mm-dd`) e uma hora (`HH:mm`) lidos no fuso informado (o horário local do sistema, não o do servidor). */
export function instanteNoFuso(data: string, hora: string, fusoHorario: string): Date {
  const [ano, mes, dia] = data.split('-').map(Number);
  const [horas, minutos] = hora.split(':').map(Number);
  const comoUtc = Date.UTC(ano, mes - 1, dia, horas, minutos);
  // Dois passos: o deslocamento do fuso pode mudar entre o palpite e o instante certo (horário de verão).
  const primeiro = comoUtc - deslocamentoDoFuso(new Date(comoUtc), fusoHorario);
  return new Date(comoUtc - deslocamentoDoFuso(new Date(primeiro), fusoHorario));
}

/** `18/10/2026, 14:00 às 16:00` (ou com as duas datas, se atravessa o dia; `(em andamento)` sem fim). Sempre no fuso do sistema. */
export function formatarPeriodo(inicio: Date, fim: Date | null, fusoHorario: string): string {
  const diaInicio = dataNoFuso(inicio, fusoHorario);
  const paraBr = (dia: string): string => dia.split('-').reverse().join('/');
  const horaInicio = horaNoFuso(inicio, fusoHorario);
  if (!fim) return `${paraBr(diaInicio)}, ${horaInicio} (em andamento)`;
  const diaFim = dataNoFuso(fim, fusoHorario);
  const horaFim = horaNoFuso(fim, fusoHorario);
  return diaInicio === diaFim
    ? `${paraBr(diaInicio)}, ${horaInicio} às ${horaFim}`
    : `${paraBr(diaInicio)} ${horaInicio} às ${paraBr(diaFim)} ${horaFim}`;
}

/** As mesmas regras de datas da `ExecucaoService` (registrar e alterar), para recusar já na proposta. */
export function validarPeriodoDaExecucao(inicio: Date, fim: Date | null, agora: Date): void {
  if (inicio > agora) throw new BusinessException('A data de início não pode estar no futuro');
  if (fim === null) return;
  if (fim > agora) throw new BusinessException('A data de fim não pode estar no futuro');
  if (fim <= inicio) throw new BusinessException('A data de fim deve ser posterior à data de início');
}
