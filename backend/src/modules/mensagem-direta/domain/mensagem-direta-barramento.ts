import { MensagemDiretaEventoDto } from '@project20/shared';

/**
 * O que trafega entre as instâncias da API (task 209). Dois tipos:
 *  - `ENTREGA`: um evento para os streams de certos usuários, em quem estiver conectado, em qualquer instância;
 *  - `PRESENCA`: o conjunto de usuários que têm stream aberto em UMA instância (a união das instâncias é quem está online).
 */
export type MensagemDoBarramento =
  | { tipo: 'ENTREGA'; usuarioIds: number[]; evento: MensagemDiretaEventoDto }
  | { tipo: 'PRESENCA'; instanciaId: string; usuarioIds: number[] };

/** O `NOTIFY` do PostgreSQL aceita até 8.000 bytes de carga; sobra margem para o que o servidor acrescenta. */
export const LIMITE_DO_NOTIFY_EM_BYTES = 7_500;

export function codificarMensagemDoBarramento(mensagem: MensagemDoBarramento): string {
  return JSON.stringify(mensagem);
}

function lerData(valor: unknown): Date | null {
  if (typeof valor !== 'string' && typeof valor !== 'number') return null;
  const data = new Date(valor);
  return Number.isNaN(data.getTime()) ? null : data;
}

function ehListaDeIds(valor: unknown): valor is number[] {
  return Array.isArray(valor) && valor.every((item) => Number.isInteger(item));
}

const TIPOS_SEM_DATA = new Set(['SINCRONIZAR', 'PRESENCA', 'BATIMENTO', 'ENCERRANDO', 'ABERTURA', 'DIGITANDO']);

/** Lê o que `codificarMensagemDoBarramento` escreveu (as datas voltam a ser `Date`); texto estranho devolve `null` em vez de derrubar a escuta. */
export function decodificarMensagemDoBarramento(texto: string): MensagemDoBarramento | null {
  let bruto: any;
  try {
    bruto = JSON.parse(texto);
  } catch {
    return null;
  }
  if (!bruto || typeof bruto !== 'object') return null;

  if (bruto.tipo === 'PRESENCA') {
    if (typeof bruto.instanciaId !== 'string' || !ehListaDeIds(bruto.usuarioIds)) return null;
    return { tipo: 'PRESENCA', instanciaId: bruto.instanciaId, usuarioIds: bruto.usuarioIds };
  }

  if (bruto.tipo === 'ENTREGA') {
    if (!ehListaDeIds(bruto.usuarioIds) || !bruto.evento || typeof bruto.evento !== 'object') return null;
    const evento = bruto.evento;
    if (evento.tipo === 'MENSAGEM') {
      const criadaEm = lerData(evento.mensagem?.createdDate);
      if (!criadaEm) return null;
      return { tipo: 'ENTREGA', usuarioIds: bruto.usuarioIds, evento: { tipo: 'MENSAGEM', mensagem: { ...evento.mensagem, createdDate: criadaEm } } };
    }
    if (evento.tipo === 'LEITURA') {
      const lidaAte = lerData(evento.lidaAteDate);
      if (!lidaAte) return null;
      return { tipo: 'ENTREGA', usuarioIds: bruto.usuarioIds, evento: { ...evento, lidaAteDate: lidaAte } };
    }
    if (TIPOS_SEM_DATA.has(evento.tipo)) {
      return { tipo: 'ENTREGA', usuarioIds: bruto.usuarioIds, evento };
    }
  }
  return null;
}

/**
 * A carga que vai no `NOTIFY`. Uma mensagem pode ter 10.000 caracteres e não caber nos 8.000 bytes: nesse caso vai um `SINCRONIZAR` da
 * conversa no lugar da mensagem e o cliente a relê (ele já faz isso ao reconectar). A mensagem nunca é truncada. A presença não encolhe:
 * se não couber, é erro de programação (centenas de usuários conectados numa instância).
 */
export function prepararParaNotify(mensagem: MensagemDoBarramento): string {
  const completa = codificarMensagemDoBarramento(mensagem);
  if (Buffer.byteLength(completa, 'utf8') <= LIMITE_DO_NOTIFY_EM_BYTES) return completa;

  if (mensagem.tipo === 'ENTREGA' && mensagem.evento.tipo === 'MENSAGEM') {
    const resumida = codificarMensagemDoBarramento({
      tipo: 'ENTREGA',
      usuarioIds: mensagem.usuarioIds,
      evento: { tipo: 'SINCRONIZAR', conversaId: mensagem.evento.mensagem.conversaId },
    });
    if (Buffer.byteLength(resumida, 'utf8') <= LIMITE_DO_NOTIFY_EM_BYTES) return resumida;
  }
  throw new Error('O evento do chat não cabe no barramento do PostgreSQL');
}
