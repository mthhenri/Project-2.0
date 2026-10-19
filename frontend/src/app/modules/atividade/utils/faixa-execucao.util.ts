import { TipoAtividadeStatusEnum, dataIsoNoFuso, diaMesNoFuso, horaNoFuso } from '@project20/shared';
import { ambiente } from '../../../../environments/environment';
import { ATIVIDADE_STATUS_EXECUTAVEL } from '../models/atividade.model';

/**
 * Os cinco estados da faixa de execução do detalhe da atividade:
 * - `oculta`: quem olha não pode agir (desenvolvedor que não é o dono);
 * - `ativa`: há execução em andamento nesta atividade (timer e pausa);
 * - `bloqueada`: o status não deixa iniciar (Pendente ou Desenvolvida);
 * - `outra`: o dono já executa outra atividade (oferece pausar lá e iniciar aqui);
 * - `livre`: pode iniciar agora.
 */
export type EstadoFaixaExecucao = 'oculta' | 'ativa' | 'bloqueada' | 'outra' | 'livre';

export interface EntradaFaixaExecucao {
  podeAgir: boolean;
  status: TipoAtividadeStatusEnum;
  execucaoAbertaNestaAtividade: boolean;
  /** O usuário logado é o dono da atividade e tem execução ativa em **outra** atividade (a trava vale para o dono). */
  donoExecutandoOutra: boolean;
}

export function estadoDaFaixaDeExecucao(entrada: EntradaFaixaExecucao): EstadoFaixaExecucao {
  if (!entrada.podeAgir) return 'oculta';
  if (entrada.execucaoAbertaNestaAtividade) return 'ativa';
  if (!ATIVIDADE_STATUS_EXECUTAVEL.includes(entrada.status)) return 'bloqueada';
  if (entrada.donoExecutandoOutra) return 'outra';
  return 'livre';
}

function rotuloDoDia(data: Date, agora: Date, fusoHorario: string): string {
  const diaDoInstante = dataIsoNoFuso(data, fusoHorario);
  if (diaDoInstante === dataIsoNoFuso(agora, fusoHorario)) return 'hoje';
  // 24h antes de "agora" cai no dia anterior no fuso do sistema (o Brasil não tem horário de verão).
  if (diaDoInstante === dataIsoNoFuso(new Date(agora.getTime() - 24 * 3_600_000), fusoHorario)) return 'ontem';
  return diaMesNoFuso(data, fusoHorario);
}

/**
 * "hoje 09:12 → 11:27", "ontem 17:00 → 18:10", "18/10 22:00 → 19/10 01:30" e, em andamento, "hoje 09:12 → agora".
 * Dia e hora seguem o fuso do sistema, não o do navegador.
 */
export function formatarIntervaloDaExecucao(
  inicio: Date | string,
  fim: Date | string | null,
  agora: Date = new Date(),
  fusoHorario: string = ambiente.fusoHorario,
): string {
  const inicioData = new Date(inicio);
  const comeco = `${rotuloDoDia(inicioData, agora, fusoHorario)} ${horaNoFuso(inicioData, fusoHorario)}`;
  if (!fim) return `${comeco} → agora`;
  const fimData = new Date(fim);
  const mesmoDia = dataIsoNoFuso(inicioData, fusoHorario) === dataIsoNoFuso(fimData, fusoHorario);
  const fimTexto = horaNoFuso(fimData, fusoHorario);
  return mesmoDia ? `${comeco} → ${fimTexto}` : `${comeco} → ${rotuloDoDia(fimData, agora, fusoHorario)} ${fimTexto}`;
}
