import { TipoAnotacaoEnum } from '@project20/shared';

/** Mesma regra de "vazio efetivo" do backend (`temAnotacoes`): o Markdown só com espaços e quebras de linha não conta. */
export function anotacaoTemTexto(texto: string | null | undefined): boolean {
  return (texto ?? '').trim() !== '';
}

/** `Editado há 3 min` a partir de um instante e do "agora". */
export function tempoDecorrido(data: Date | string, agora: Date): string {
  const segundos = Math.max(0, Math.floor((agora.getTime() - new Date(data).getTime()) / 1000));
  if (segundos < 60) return 'agora há pouco';
  const minutos = Math.floor(segundos / 60);
  if (minutos < 60) return `há ${minutos} min`;
  const horas = Math.floor(minutos / 60);
  if (horas < 24) return `há ${horas} h`;
  const dias = Math.floor(horas / 24);
  return dias === 1 ? 'há 1 dia' : `há ${dias} dias`;
}

/** Título de cada seção do pad, na ordem de exibição (a ordem vem de `TIPOS_ANOTACAO_ORDENADOS`). */
export const ROTULO_SECAO_ANOTACAO: Record<TipoAnotacaoEnum, string> = {
  [TipoAnotacaoEnum.EM_ANDAMENTO]: 'Em andamento',
  [TipoAnotacaoEnum.FEITO]: 'Feito',
  [TipoAnotacaoEnum.PENDENCIA]: 'Pendências',
  [TipoAnotacaoEnum.LEMBRETE]: 'Lembretes',
  [TipoAnotacaoEnum.PESSOAL]: 'Pessoal',
};
