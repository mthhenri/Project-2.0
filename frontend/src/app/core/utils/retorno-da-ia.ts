import { EstadoIaEnum } from '@project20/shared';

/**
 * O estado da IA como as telas convencionais o enxergam. Quem escolheu "Agora não" depois de a IA voltar fica no modo convencional:
 * o menu, o pad e o check-in continuam como se a IA ainda estivesse fora (para o usuário não ser tirado do que está fazendo) até ele
 * voltar para a IA. Só vale com a IA de fato no ar; desligada ou fora do ar, o estado real já manda.
 */
export function estadoEfetivoDaIa(real: EstadoIaEnum | null, modoConvencional: boolean): EstadoIaEnum | null {
  return real === EstadoIaEnum.NO_AR && modoConvencional ? EstadoIaEnum.FORA_DO_AR : real;
}

/** A IA acabou de voltar: estava desligada ou fora do ar (estado conhecido) e agora está no ar. */
export function iaVoltou(anterior: EstadoIaEnum | null, atual: EstadoIaEnum | null): boolean {
  return anterior !== null && anterior !== EstadoIaEnum.NO_AR && atual === EstadoIaEnum.NO_AR;
}
