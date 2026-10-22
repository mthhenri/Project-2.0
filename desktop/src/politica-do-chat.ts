// As decisões do chat entre colaboradores no Project Desktop (task 213), como funções puras: o `main.ts` só liga o Electron a elas.

/** O limite de uma mensagem do chat (o mesmo de `LIMITE_TEXTO_MENSAGEM_DIRETA`, do `shared`, que o desktop não importa). */
export const LIMITE_DO_TEXTO = 10_000;
/** O atalho de quem nunca escolheu outro (igual a `ATALHO_GLOBAL_PADRAO` do `shared`). */
export const ATALHO_PADRAO = 'Ctrl+Shift+Space';
/** O mesmo formato que o servidor aceita em `atalhoGlobal` (`REGEX_ATALHO_GLOBAL`, do `shared`, que o desktop não importa). */
const FORMATO_DO_ATALHO =
  /^(?:(?:Ctrl|Control|CommandOrControl|CmdOrCtrl|Cmd|Command|Alt|Option|AltGr|Shift|Super|Meta)\+)+(?!(?:Ctrl|Control|CommandOrControl|CmdOrCtrl|Cmd|Command|Alt|Option|AltGr|Shift|Super|Meta)$)[A-Za-z0-9]+$/;
const LIMITE_DO_NOME = 100;
const LIMITE_DO_AVISO = 200;
const LIMITE_DO_CAMINHO = 300;

export interface PreferenciaDoChat {
  atalhoGlobal: string;
  avisoDesktopAtivo: boolean;
  avisosAtivos: boolean;
  somAtivo: boolean;
  /** Fim do silêncio geral (ISO 8601), ou `null`. */
  silenciadoAteDate: string | null;
}

/** Lê o corpo de `GET /mensagem-direta/preferencia`; `null` se não tem o formato esperado (o atalho vem do servidor, então é validado aqui também). */
export function lerPreferenciaDoChat(corpo: unknown): PreferenciaDoChat | null {
  const dados = (corpo as { dados?: Record<string, unknown> } | null)?.dados;
  if (!dados) return null;
  const { atalhoGlobal, avisoDesktopAtivo, avisosAtivos, somAtivo, silenciadoAteDate } = dados;
  if (typeof atalhoGlobal !== 'string' || !FORMATO_DO_ATALHO.test(atalhoGlobal)) return null;
  if (typeof avisoDesktopAtivo !== 'boolean' || typeof avisosAtivos !== 'boolean' || typeof somAtivo !== 'boolean') return null;
  return { atalhoGlobal, avisoDesktopAtivo, avisosAtivos, somAtivo, silenciadoAteDate: typeof silenciadoAteDate === 'string' ? silenciadoAteDate : null };
}

export type AcaoDoAtalho = 'FECHAR_JANELA' | 'ABRIR_POPUP_INTERNO' | 'ABRIR_JANELA';

/** Project visível → o popup interno; Project minimizado ou oculto → a janela do Desktop; com a janela aberta o atalho a fecha. Nunca as duas. */
export function decidirAtalho(entrada: { janelaDeChatAberta: boolean; principalVisivel: boolean }): AcaoDoAtalho {
  if (entrada.janelaDeChatAberta) return 'FECHAR_JANELA';
  return entrada.principalVisivel ? 'ABRIR_POPUP_INTERNO' : 'ABRIR_JANELA';
}

/** O texto copiado que vai à página: sem espaço sobrando nas pontas e nunca acima do limite da mensagem; vazio ou grande demais não vai (`null`). */
export function prepararAreaDeTransferencia(texto: string): string | null {
  const aparado = texto.replace(/^\s*\n/, '').trimEnd();
  if (aparado.trim() === '' || aparado.length > LIMITE_DO_TEXTO - 50) return null;
  return aparado;
}

/** Os passos do atalho mudaram: o que registrar e o que soltar. */
export function planoDoAtalho(registrado: string | null, desejado: string | null): { soltar: string | null; registrar: string | null } {
  if (registrado === desejado) return { soltar: null, registrar: null };
  return { soltar: registrado, registrar: desejado };
}

export interface AvisoDoChat {
  usuarioId: number;
  usuarioNome: string;
  texto: string;
  mencionaVoce: boolean;
  som: boolean;
}

function textoCurto(valor: unknown, limite: number): string | null {
  return typeof valor === 'string' && valor.trim() !== '' ? valor.trim().slice(0, limite) : null;
}

/** Valida o aviso que a página pede ao Desktop (a página é o Project, mas o `main` não confia no formato). */
export function lerAvisoDoChat(corpo: unknown): AvisoDoChat | null {
  const dados = corpo as Record<string, unknown> | null;
  if (!dados || typeof dados !== 'object') return null;
  const usuarioId = dados['usuarioId'];
  const usuarioNome = textoCurto(dados['usuarioNome'], LIMITE_DO_NOME);
  const texto = textoCurto(dados['texto'], LIMITE_DO_AVISO);
  if (typeof usuarioId !== 'number' || !Number.isInteger(usuarioId) || usuarioId <= 0 || !usuarioNome || !texto) return null;
  return { usuarioId, usuarioNome, texto, mencionaVoce: dados['mencionaVoce'] === true, som: dados['som'] === true };
}

export interface ConversaDoChat {
  usuarioId: number;
  usuarioNome: string;
}

/** Valida a conversa que a janela de chat diz estar mostrando: um id de usuário, ou `null` quando não há conversa à vista. */
export function lerConversaAbertaDoChat(valor: unknown): number | null {
  return typeof valor === 'number' && Number.isInteger(valor) && valor > 0 ? valor : null;
}

/** O caminho (e a consulta) que a janela de chat pede ao Project para abrir: só rotas internas, nunca outra origem nem a própria janela de chat. */
export function lerCaminhoDoProject(valor: unknown): string | null {
  if (typeof valor !== 'string' || valor.length > LIMITE_DO_CAMINHO) return null;
  if (!valor.startsWith('/') || valor.startsWith('//') || valor.includes('\\') || /[\u0000-\u001f]/.test(valor)) return null;
  const caminho = valor.split(/[?#]/)[0];
  if (caminho === '/chat-popup' || caminho.startsWith('/chat-popup/') || caminho === '/checkin' || caminho.startsWith('/checkin/')) return null;
  return valor;
}

/** O endereço da janela de chat; com uma conversa, ela abre direto nela. */
export function enderecoDaJanelaDeChat(urlDoProject: string, conversa: ConversaDoChat | null): string {
  const endereco = new URL('chat-popup', urlDoProject);
  if (conversa) {
    endereco.searchParams.set('usuarioId', String(conversa.usuarioId));
    endereco.searchParams.set('nome', conversa.usuarioNome);
  }
  return endereco.toString();
}

export interface Retangulo {
  x: number;
  y: number;
  width: number;
  height: number;
}

/** A janela de chat no canto inferior direito da área útil do monitor (com a folga das bordas), sem passar da área em monitores pequenos. */
export function posicaoDaJanelaDeChat(area: Retangulo, largura: number, altura: number, folga = 24): Retangulo {
  const width = Math.min(largura, area.width);
  const height = Math.min(altura, area.height);
  const x = Math.max(area.x, area.x + area.width - width - folga);
  const y = Math.max(area.y, area.y + area.height - height - folga);
  return { x, y, width, height };
}

/** O item do menu da bandeja que abre o chat, com o atalho (ou o motivo de não haver). */
export function textoDoItemDoChat(atalho: string | null, registrado: boolean): string {
  if (atalho === null) return 'Chat com colegas (entre no Project)';
  return registrado ? `Chat com colegas (${atalho})` : `Chat com colegas (atalho ${atalho} indisponível)`;
}
