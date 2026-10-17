/**
 * Datas no fuso do sistema (`APP_TIMEZONE`), independentes do fuso do navegador/processo.
 * O servidor filtra e agrupa por dia nesse fuso; a interface usa estas funções para decidir "hoje",
 * o dia de um instante e a hora exibida, de modo que as duas pontas concordem.
 */

function partesNoFuso(instante: Date, fusoHorario: string): Record<string, string> {
  const partes = new Intl.DateTimeFormat('en-US', {
    timeZone: fusoHorario,
    hourCycle: 'h23',
    year: 'numeric', month: '2-digit', day: '2-digit',
    hour: '2-digit', minute: '2-digit', second: '2-digit',
  }).formatToParts(instante);
  return Object.fromEntries(partes.map((parte) => [parte.type, parte.value]));
}

/** Dia civil do instante no fuso, como `yyyy-mm-dd`. */
export function dataIsoNoFuso(instante: Date, fusoHorario: string): string {
  const partes = partesNoFuso(instante, fusoHorario);
  return `${partes['year']}-${partes['month']}-${partes['day']}`;
}

/** Hora do instante no fuso, como `HH:mm`. */
export function horaNoFuso(instante: Date, fusoHorario: string): string {
  const partes = partesNoFuso(instante, fusoHorario);
  return `${partes['hour']}:${partes['minute']}`;
}

/** Dia e mês do instante no fuso, como `dd/MM`. */
export function diaMesNoFuso(instante: Date, fusoHorario: string): string {
  const partes = partesNoFuso(instante, fusoHorario);
  return `${partes['day']}/${partes['month']}`;
}

/** Data e hora do instante no fuso, como `dd/MM/yyyy HH:mm`. */
export function dataHoraNoFuso(instante: Date, fusoHorario: string): string {
  const partes = partesNoFuso(instante, fusoHorario);
  return `${partes['day']}/${partes['month']}/${partes['year']} ${partes['hour']}:${partes['minute']}`;
}

/** "Hoje" no fuso, como `Date` à meia-noite **local** com o mesmo ano/mês/dia (o formato que os datepickers usam). */
export function hojeNoFuso(fusoHorario: string, agora: Date = new Date()): Date {
  const partes = partesNoFuso(agora, fusoHorario);
  return new Date(Number(partes['year']), Number(partes['month']) - 1, Number(partes['day']));
}

/** Diferença (ms) entre o relógio do fuso e o UTC no instante dado. */
function deslocamentoDoFuso(instante: Date, fusoHorario: string): number {
  const partes = partesNoFuso(instante, fusoHorario);
  const comoUtc = Date.UTC(
    Number(partes['year']), Number(partes['month']) - 1, Number(partes['day']),
    Number(partes['hour']), Number(partes['minute']), Number(partes['second']),
  );
  return comoUtc - Math.floor(instante.getTime() / 1000) * 1000;
}

/**
 * Instante → `Date` cujos campos locais (dia/hora) mostram o relógio do fuso. É o que um datepicker com hora
 * precisa para exibir o horário do sistema mesmo com o navegador em outro fuso.
 */
export function instanteParaRelogioLocal(instante: Date, fusoHorario: string): Date {
  const partes = partesNoFuso(instante, fusoHorario);
  return new Date(
    Number(partes['year']), Number(partes['month']) - 1, Number(partes['day']),
    Number(partes['hour']), Number(partes['minute']), Number(partes['second']),
    instante.getMilliseconds(),
  );
}

/** Inverso de `instanteParaRelogioLocal`: os campos locais são lidos como relógio do fuso e viram o instante real. */
export function relogioLocalParaInstante(relogio: Date, fusoHorario: string): Date {
  const comoUtc = Date.UTC(
    relogio.getFullYear(), relogio.getMonth(), relogio.getDate(),
    relogio.getHours(), relogio.getMinutes(), relogio.getSeconds(), relogio.getMilliseconds(),
  );
  const estimativa = new Date(comoUtc - deslocamentoDoFuso(new Date(comoUtc), fusoHorario));
  // Reavalia o deslocamento no instante estimado (cobre horário de verão perto da virada).
  return new Date(comoUtc - deslocamentoDoFuso(estimativa, fusoHorario));
}
