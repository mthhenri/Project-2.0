import { TipoAtividadeStatusEnum } from '@project20/shared';
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

const hora = (data: Date) => `${String(data.getHours()).padStart(2, '0')}:${String(data.getMinutes()).padStart(2, '0')}`;
const mesmoDia = (a: Date, b: Date) => a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();

function rotuloDoDia(data: Date, agora: Date): string {
  if (mesmoDia(data, agora)) return 'hoje';
  const ontem = new Date(agora);
  ontem.setDate(ontem.getDate() - 1);
  if (mesmoDia(data, ontem)) return 'ontem';
  return `${String(data.getDate()).padStart(2, '0')}/${String(data.getMonth() + 1).padStart(2, '0')}`;
}

/** "hoje 09:12 → 11:27", "ontem 17:00 → 18:10", "18/10 22:00 → 19/10 01:30" e, em andamento, "hoje 09:12 → agora". */
export function formatarIntervaloDaExecucao(inicio: Date | string, fim: Date | string | null, agora: Date = new Date()): string {
  const inicioData = new Date(inicio);
  const comeco = `${rotuloDoDia(inicioData, agora)} ${hora(inicioData)}`;
  if (!fim) return `${comeco} → agora`;
  const fimData = new Date(fim);
  return mesmoDia(inicioData, fimData) ? `${comeco} → ${hora(fimData)}` : `${comeco} → ${rotuloDoDia(fimData, agora)} ${hora(fimData)}`;
}
