import {
  MensagemDiretaPreferenciaRecuperadaDto,
  estaSilenciado,
  instanteParaRelogioLocal,
  relogioLocalParaInstante,
  silenciarAteDeReuniao,
} from '@project20/shared';

// Lógica pura dos avisos do chat entre colaboradores (task 212): quando avisar, até quando silenciar e como os cartões se empilham.

/** A preferência como a tela a usa: a data do silêncio já como `Date`. */
export interface PreferenciaNaTela extends Omit<MensagemDiretaPreferenciaRecuperadaDto, 'silenciadoAteDate'> {
  silenciadoAteDate: Date | null;
}

export function normalizarPreferencia(preferencia: MensagemDiretaPreferenciaRecuperadaDto): PreferenciaNaTela {
  return { ...preferencia, silenciadoAteDate: preferencia.silenciadoAteDate ? new Date(preferencia.silenciadoAteDate) : null };
}

export interface EntradaDaDecisaoDeAviso {
  preferencia: PreferenciaNaTela;
  /** A mensagem é minha (outra aba ou o próprio envio): nunca avisa. */
  mensagemMinha: boolean;
  /** A mensagem cita o usuário (`@você`). */
  mencionaVoce: boolean;
  conversaSilenciada: boolean;
  /** O popup está aberto nessa conversa e a página está visível: o usuário já está vendo. */
  conversaAVista: boolean;
  agora: Date;
}

export type MotivoDoSilencio = 'MINHA' | 'AVISOS_DESLIGADOS' | 'SILENCIO_GERAL' | 'CONVERSA_SILENCIADA' | 'A_VISTA';

export interface DecisaoDeAviso {
  avisar: boolean;
  motivo: MotivoDoSilencio | null;
}

/**
 * Avisa ou não. Nunca para mensagem minha, nem com os avisos desligados, nem com o silêncio geral ativo; a conversa silenciada só avisa se a
 * mensagem **menciona** o usuário (a menção fura o silêncio da conversa, nunca o geral); e não avisa o que o usuário já está olhando.
 */
export function decidirAviso(entrada: EntradaDaDecisaoDeAviso): DecisaoDeAviso {
  const calar = (motivo: MotivoDoSilencio): DecisaoDeAviso => ({ avisar: false, motivo });
  if (entrada.mensagemMinha) return calar('MINHA');
  if (!entrada.preferencia.avisosAtivos) return calar('AVISOS_DESLIGADOS');
  if (estaSilenciado(entrada.preferencia.silenciadoAteDate, entrada.agora)) return calar('SILENCIO_GERAL');
  if (entrada.conversaSilenciada && !entrada.mencionaVoce) return calar('CONVERSA_SILENCIADA');
  if (entrada.conversaAVista) return calar('A_VISTA');
  return { avisar: true, motivo: null };
}

// ---------------------------------------------------------------------------
// Silêncio geral
// ---------------------------------------------------------------------------

export type OpcaoDeSilencio = 'UMA_HORA' | 'AMANHA_8H' | 'ATE_REATIVAR';

/** "Até eu reativar" é uma data muito distante (a coluna é uma data, e `null` quer dizer "sem silêncio"). */
const ANOS_DO_SILENCIO_INDETERMINADO = 100;
const UM_ANO_EM_MS = 365 * 86_400_000;

/**
 * Até quando cada opção do menu silencia. "Até amanhã às 8h" é no fuso do **sistema** (`fuso`), não no do navegador: o dia e a hora do Project seguem o
 * servidor (a mesma regra das demais telas).
 */
export function silenciarAte(opcao: OpcaoDeSilencio, agora: Date, fuso: string): Date {
  if (opcao === 'UMA_HORA') return silenciarAteDeReuniao(agora);
  if (opcao === 'ATE_REATIVAR') return new Date(agora.getTime() + ANOS_DO_SILENCIO_INDETERMINADO * 365.25 * 86_400_000);
  const relogio = instanteParaRelogioLocal(agora, fuso);
  const amanha = new Date(relogio.getFullYear(), relogio.getMonth(), relogio.getDate() + 1, 8, 0, 0, 0);
  return relogioLocalParaInstante(amanha, fuso);
}

export function silencioIndeterminado(silenciadoAteDate: Date | null, agora: Date): boolean {
  return !!silenciadoAteDate && silenciadoAteDate.getTime() - agora.getTime() > UM_ANO_EM_MS;
}

function doisDigitos(valor: number): string {
  return String(valor).padStart(2, '0');
}

/** "Silenciado até 15:00", "até amanhã 08:00", "até 25/10 08:00" ou "até você reativar"; vazio quando não há silêncio. */
export function rotuloDoSilencio(silenciadoAteDate: Date | null, agora: Date, fuso: string): string {
  if (!estaSilenciado(silenciadoAteDate, agora) || !silenciadoAteDate) return '';
  if (silencioIndeterminado(silenciadoAteDate, agora)) return 'Silenciado até você reativar';
  const fim = instanteParaRelogioLocal(silenciadoAteDate, fuso);
  const hoje = instanteParaRelogioLocal(agora, fuso);
  const hora = `${doisDigitos(fim.getHours())}:${doisDigitos(fim.getMinutes())}`;
  const diasDeDiferenca = Math.round(
    (new Date(fim.getFullYear(), fim.getMonth(), fim.getDate()).getTime() - new Date(hoje.getFullYear(), hoje.getMonth(), hoje.getDate()).getTime()) / 86_400_000,
  );
  if (diasDeDiferenca === 0) return `Silenciado até ${hora}`;
  if (diasDeDiferenca === 1) return `Silenciado até amanhã ${hora}`;
  return `Silenciado até ${doisDigitos(fim.getDate())}/${doisDigitos(fim.getMonth() + 1)} ${hora}`;
}

// ---------------------------------------------------------------------------
// Cartões de aviso
// ---------------------------------------------------------------------------

export const MAXIMO_DE_AVISOS_NA_TELA = 3;
export const DURACAO_DO_AVISO_MS = 8_000;

/** Um cartão de aviso na tela. Mensagens seguidas da mesma pessoa atualizam o mesmo cartão. */
export interface AvisoNaTela {
  /** `conversaId`: um cartão por conversa. */
  id: string;
  usuarioId: number;
  usuarioNome: string;
  /** A prévia da última mensagem, sem marcação. */
  texto: string;
  mencionaVoce: boolean;
  /** Quantas mensagens novas esse cartão resume. */
  quantidade: number;
  /** Muda a cada atualização: o cartão reinicia o tempo de exibição. */
  atualizadoEm: number;
}

export interface NovaMensagemParaAviso {
  conversaId: string;
  usuarioId: number;
  usuarioNome: string;
  texto: string;
  mencionaVoce: boolean;
  agora: number;
}

/**
 * Soma uma mensagem nova aos cartões: a mesma conversa atualiza o cartão que já está na tela (mais uma mensagem, prévia nova, "@você" se alguma
 * citou), e o cartão atualizado vai para o topo; conversa nova entra no topo e, passando de três, o mais antigo sai.
 */
export function somarAviso(avisos: AvisoNaTela[], nova: NovaMensagemParaAviso): AvisoNaTela[] {
  const existente = avisos.find((aviso) => aviso.id === nova.conversaId);
  const atualizado: AvisoNaTela = existente
    ? { ...existente, usuarioNome: nova.usuarioNome, texto: nova.texto, mencionaVoce: existente.mencionaVoce || nova.mencionaVoce, quantidade: existente.quantidade + 1, atualizadoEm: nova.agora }
    : { id: nova.conversaId, usuarioId: nova.usuarioId, usuarioNome: nova.usuarioNome, texto: nova.texto, mencionaVoce: nova.mencionaVoce, quantidade: 1, atualizadoEm: nova.agora };
  return [atualizado, ...avisos.filter((aviso) => aviso.id !== nova.conversaId)].slice(0, MAXIMO_DE_AVISOS_NA_TELA);
}

export function rotuloDaQuantidade(quantidade: number): string {
  return quantidade <= 1 ? '' : `${quantidade} mensagens novas`;
}
