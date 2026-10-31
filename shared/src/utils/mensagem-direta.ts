import { PosicaoPopupChatEnum } from '../enums/posicao-popup-chat.enum';
import { ReferenciaMensagemDiretaEnum } from '../enums/referencia-mensagem-direta.enum';
import type { MensagemDiretaPreferenciaRecuperadaDto } from '../dtos/mensagem-direta/MensagemDiretaPreferenciaRecuperadaDto';
import type { ReferenciaMensagemDto } from '../dtos/mensagem-direta/ReferenciaMensagemDto';
import { interpretarMarkdown } from '../markdown/markdown.interpretador';
import type { MarkdownBlocoNo } from '../markdown/markdown.tipos';

// ---------------------------------------------------------------------------
// Limites e padrões do chat entre colaboradores (task 205)
// ---------------------------------------------------------------------------

/** Caracteres por mensagem (inclui o código colado). */
export const LIMITE_TEXTO_MENSAGEM_DIRETA = 10_000;
export const LIMITE_MENCOES_MENSAGEM_DIRETA = 20;
export const LIMITE_REFERENCIAS_MENSAGEM_DIRETA = 20;
/** Caracteres do trecho que a resposta cita da mensagem original (task 220). */
export const LIMITE_TRECHO_MENSAGEM_DIRETA = 200;
/** Mensagens por página quando o cliente não pede um limite, e o máximo que ele pode pedir. */
export const LIMITE_PADRAO_DA_CONVERSA_DIRETA = 50;
export const LIMITE_MAXIMO_DA_CONVERSA_DIRETA = 100;
export const LIMITE_CURSOR_DA_CONVERSA_DIRETA = 120;
/** Conversas por página da supervisão (task 214): o padrão e o máximo que o gestor pode pedir. */
export const LIMITE_PADRAO_DA_SUPERVISAO_DIRETA = 20;
export const LIMITE_MAXIMO_DA_SUPERVISAO_DIRETA = 100;
export const LIMITE_ATALHO_GLOBAL = 40;

/** "Silenciar por 1 hora", para a reunião. */
export const DURACAO_DO_SILENCIO_DE_REUNIAO_MINUTOS = 60;

export const ATALHO_GLOBAL_PADRAO = 'Ctrl+Shift+Space';

/**
 * Pelo menos um modificador e uma tecla (`Ctrl+Shift+Space`, `Alt+F1`): uma tecla solta como atalho global tomaria a tecla de todos os
 * programas. A tecla é letra, número ou nome (`Space`, `F1`); a lista de modificadores é a do Electron.
 */
export const REGEX_ATALHO_GLOBAL =
  /^(?:(?:Ctrl|Control|CommandOrControl|CmdOrCtrl|Cmd|Command|Alt|Option|AltGr|Shift|Super|Meta)\+)+(?!(?:Ctrl|Control|CommandOrControl|CmdOrCtrl|Cmd|Command|Alt|Option|AltGr|Shift|Super|Meta)$)[A-Za-z0-9]+$/;

/**
 * O que a service devolve enquanto o usuário não tem linha em `mensagem_direta_preferencia`. O padrão mora aqui e nunca em `DEFAULT` de
 * coluna (SCHEMA.md): a aplicação fornece todos os valores.
 */
export const PREFERENCIA_PADRAO_DA_MENSAGEM_DIRETA: MensagemDiretaPreferenciaRecuperadaDto = {
  avisosAtivos: true,
  avisoDesktopAtivo: true,
  somAtivo: false,
  silenciadoAteDate: null,
  atalhoGlobal: ATALHO_GLOBAL_PADRAO,
  posicaoPopup: PosicaoPopupChatEnum.CANTO_INFERIOR_DIREITO,
};

// ---------------------------------------------------------------------------
// Identidade da conversa: `<menorId>-<maiorId>`
// ---------------------------------------------------------------------------

const ID_MAXIMO_DE_USUARIO = 2_147_483_647;
const REGEX_CONVERSA_DIRETA = /^([1-9]\d{0,9})-([1-9]\d{0,9})$/;

export interface ParticipantesDaConversaDireta {
  usuarioMenorId: number;
  usuarioMaiorId: number;
}

function idDeUsuarioValido(usuarioId: number): boolean {
  return Number.isInteger(usuarioId) && usuarioId >= 1 && usuarioId <= ID_MAXIMO_DE_USUARIO;
}

/**
 * O id determinístico da conversa entre duas pessoas: o par sempre cai na mesma conversa, na ordem que for. Não existe tabela de conversa.
 * Ids inválidos e a mesma pessoa duas vezes são erro de programação (a service valida o destinatário antes).
 */
export function montarConversaDiretaId(usuarioA: number, usuarioB: number): string {
  if (!idDeUsuarioValido(usuarioA) || !idDeUsuarioValido(usuarioB)) {
    throw new Error('A conversa direta exige ids de usuário inteiros e positivos');
  }
  if (usuarioA === usuarioB) {
    throw new Error('A conversa direta exige duas pessoas diferentes');
  }
  return `${Math.min(usuarioA, usuarioB)}-${Math.max(usuarioA, usuarioB)}`;
}

/** Os dois ids de um `conversaId`, ou `null` se o texto não é uma conversa direta válida (formato, ordem ou id fora do limite). */
export function lerConversaDiretaId(conversaId: string): ParticipantesDaConversaDireta | null {
  const encontrado = REGEX_CONVERSA_DIRETA.exec(conversaId ?? '');
  if (!encontrado) return null;
  const usuarioMenorId = Number(encontrado[1]);
  const usuarioMaiorId = Number(encontrado[2]);
  if (!idDeUsuarioValido(usuarioMenorId) || !idDeUsuarioValido(usuarioMaiorId) || usuarioMenorId >= usuarioMaiorId) return null;
  return { usuarioMenorId, usuarioMaiorId };
}

/** O outro id da conversa; `null` se o `conversaId` é inválido ou a pessoa não participa dela. */
export function outroParticipanteDaConversaDireta(conversaId: string, usuarioId: number): number | null {
  const participantes = lerConversaDiretaId(conversaId);
  if (!participantes) return null;
  if (usuarioId === participantes.usuarioMenorId) return participantes.usuarioMaiorId;
  if (usuarioId === participantes.usuarioMaiorId) return participantes.usuarioMenorId;
  return null;
}

// ---------------------------------------------------------------------------
// Referências: `DEMANDA:212` <-> { tipo, id }
// ---------------------------------------------------------------------------

const REGEX_REFERENCIA_DIRETA = /^([A-Z_]+):([1-9]\d{0,9})$/;
const TIPOS_DE_REFERENCIA = new Set<string>(Object.values(ReferenciaMensagemDiretaEnum));

/** O texto guardado no índice (`keyword`) para uma referência. */
export function formatarReferenciaDireta(referencia: ReferenciaMensagemDto): string {
  return `${referencia.tipo}:${referencia.id}`;
}

/** A referência que um texto guardado representa, ou `null` se o formato ou o tipo não valem. */
export function lerReferenciaDireta(texto: string): ReferenciaMensagemDto | null {
  const encontrado = REGEX_REFERENCIA_DIRETA.exec(texto ?? '');
  if (!encontrado || !TIPOS_DE_REFERENCIA.has(encontrado[1])) return null;
  const id = Number(encontrado[2]);
  if (!idDeUsuarioValido(id)) return null;
  return { tipo: encontrado[1] as ReferenciaMensagemDiretaEnum, id };
}

// ---------------------------------------------------------------------------
// Silêncio temporário
// ---------------------------------------------------------------------------

const MILISSEGUNDOS_POR_MINUTO = 60_000;

/** Ainda silenciado: o instante final já não vale (no próprio instante os avisos voltam). Sem data, ou com data inválida, não há silêncio. */
export function estaSilenciado(silenciadoAteDate: Date | string | null | undefined, agora: Date = new Date()): boolean {
  if (!silenciadoAteDate) return false;
  const ate = new Date(silenciadoAteDate);
  if (Number.isNaN(ate.getTime())) return false;
  return agora.getTime() < ate.getTime();
}

/** O instante em que acaba o "silenciar por 1 hora" pedido agora. */
export function silenciarAteDeReuniao(agora: Date = new Date()): Date {
  return new Date(agora.getTime() + DURACAO_DO_SILENCIO_DE_REUNIAO_MINUTOS * MILISSEGUNDOS_POR_MINUTO);
}

// ---------------------------------------------------------------------------
// Código na mensagem
// ---------------------------------------------------------------------------

function algumBlocoDeCodigo(blocos: MarkdownBlocoNo[]): boolean {
  return blocos.some((bloco) => bloco.tipo === 'bloco-codigo' || (bloco.tipo === 'citacao' && algumBlocoDeCodigo(bloco.filhos)));
}

/**
 * O Markdown tem ao menos um bloco de código cercado (inclusive dentro de uma citação)? É o que vira `contem_codigo` no índice, para o filtro
 * "Com código". Código em linha (`assim`) não conta.
 */
export function contemBlocoDeCodigo(texto: string): boolean {
  if (!texto) return false;
  return algumBlocoDeCodigo(interpretarMarkdown(texto));
}

// ---------------------------------------------------------------------------
// Texto simples e trecho da resposta (task 220)
// ---------------------------------------------------------------------------

/**
 * O Markdown numa linha só, sem marcação (`*`, `#`, crases, citação, marcador de lista) e com cada bloco de código cercado trocado por
 * `[código]`. Uma mensagem que só tem código (ou cujo texto some sem a marcação) e `contemCodigo` verdadeiro vira `[código]`. É o que a prévia
 * da lista e o trecho da resposta mostram.
 */
export function textoSimplesDaMensagemDireta(texto: string, contemCodigo = false): string {
  const semBlocos = (texto ?? '').replace(/```[\s\S]*?(?:```|$)/g, ' [código] ');
  const linha = semBlocos
    .replace(/^\s*(?:[-*+]|\d+\.)\s+/gm, '')
    .replace(/[*_`#>]/g, '')
    .replace(/\s+/g, ' ')
    .trim();
  return linha || (contemCodigo ? '[código]' : '');
}

/** O começo da mensagem que a resposta cita: texto simples, cortado em `LIMITE_TRECHO_MENSAGEM_DIRETA` caracteres com `…` quando passa. */
export function trechoDaMensagemDireta(texto: string): string {
  const simples = textoSimplesDaMensagemDireta(texto, contemBlocoDeCodigo(texto));
  if (simples.length <= LIMITE_TRECHO_MENSAGEM_DIRETA) return simples;
  return `${simples.slice(0, LIMITE_TRECHO_MENSAGEM_DIRETA - 1).trimEnd()}…`;
}
