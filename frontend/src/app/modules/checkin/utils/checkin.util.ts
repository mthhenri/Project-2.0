import { CheckinSituacaoConsultadaDto, EstadoIaEnum } from '@project20/shared';

/** Em que pé está a janela de check-in, a partir da situação que o servidor devolve (ver `decidirEstado`). */
export type EstadoDoCheckin = 'CARREGANDO' | 'EM_ANDAMENTO' | 'SEM_EXECUCAO' | 'SUSPENSO' | 'REGISTRADO' | 'IA_INDISPONIVEL' | 'ERRO';

/**
 * Decide o estado da janela. `execucaoDaAbertura` é a execução que a janela mostrou ao abrir: se a execução em andamento agora é outra
 * (a descrição foi confirmada e abriu o trecho seguinte), o check-in foi **registrado**; se não há mais execução, a janela fica sem
 * check-in (a execução foi pausada); se os check-ins foram suspensos (reunião), pode fechar.
 */
export function decidirEstado(situacao: CheckinSituacaoConsultadaDto, execucaoDaAbertura: number | null): EstadoDoCheckin {
  if (situacao.suspensao.suspenso) return 'SUSPENSO';
  if (!situacao.haCheckin || !situacao.execucao) return execucaoDaAbertura === null ? 'SEM_EXECUCAO' : 'REGISTRADO';
  if (execucaoDaAbertura !== null && situacao.execucao.id !== execucaoDaAbertura) return 'REGISTRADO';
  return 'EM_ANDAMENTO';
}

/**
 * A janelinha do check-in aparece dentro do Project quando o backend diz que o horário chegou, há execução e os check-ins não estão
 * suspensos. Com a IA desligada ou fora do ar ela **não** trava a tela (sem IA não há conversa; o fallback é da task 157).
 */
export function deveMostrarJanelinha(situacao: CheckinSituacaoConsultadaDto | null, estadoDaIa: EstadoIaEnum | null): boolean {
  if (!situacao || !situacao.disparado || !situacao.haCheckin || situacao.suspensao.suspenso) return false;
  return estadoDaIa === null || estadoDaIa === EstadoIaEnum.NO_AR;
}

/** Em quanto tempo (ms) a janelinha deve conferir a situação para aparecer na hora do horário sorteado, ou `null` se não há horário. */
export function esperaAteOCheckin(situacao: CheckinSituacaoConsultadaDto | null, agora: number): number | null {
  if (!situacao?.proximoCheckinData || situacao.disparado) return null;
  const alvo = new Date(situacao.proximoCheckinData).getTime();
  return Math.max(0, alvo - agora);
}
