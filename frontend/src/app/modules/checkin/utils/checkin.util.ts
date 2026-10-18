import { CheckinSituacaoConsultadaDto } from '@project20/shared';

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
