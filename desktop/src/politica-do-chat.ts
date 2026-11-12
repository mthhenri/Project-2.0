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

/**
 * Project visível → o popup interno; Project minimizado ou oculto → a janela do Desktop; com a janela à vista o atalho a fecha. Nunca as duas.
 * Só conta a janela **visível**: uma que ainda não pintou (ou nunca pintou) não pode transformar o atalho em "fechar" (P-069).
 */
export function decidirAtalho(entrada: { janelaDeChatVisivel: boolean; principalVisivel: boolean }): AcaoDoAtalho {
    if (entrada.janelaDeChatVisivel) return 'FECHAR_JANELA';
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
    /** Quem escreveu (na conversa um a um, também quem se abre ao clicar). */
    usuarioId: number;
    /** Na conversa um a um, o nome da pessoa; no grupo, o nome do grupo. */
    usuarioNome: string;
    texto: string;
    mencionaVoce: boolean;
    som: boolean;
    /** O grupo ou canal da mensagem (task 247/I-053); ausente na conversa um a um. */
    grupoId: number | null;
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
    const grupoId = dados['grupoId'];
    // Um `grupoId` que não é um id válido torna o aviso inteiro inválido: abrir a conversa errada é pior que não avisar.
    if (grupoId !== undefined && grupoId !== null && !ehIdValido(grupoId)) return null;
    return { usuarioId, usuarioNome, texto, mencionaVoce: dados['mencionaVoce'] === true, som: dados['som'] === true, grupoId: grupoId ?? null };
}

function ehIdValido(valor: unknown): valor is number {
    return typeof valor === 'number' && Number.isInteger(valor) && valor > 0;
}

export interface ConversaDoChat {
    usuarioId: number;
    usuarioNome: string;
    /** Com `grupoId`, a janela abre no grupo (e `usuarioNome` é o nome dele); `usuarioId` fica só como o autor do aviso. */
    grupoId?: number;
}

/** O título da notificação do sistema: a pessoa (ou o grupo) e, quando o aviso menciona o usuário, o motivo ("Camila mencionou você" / "Mencionaram você em Time"). */
export function tituloDaNotificacao(aviso: AvisoDoChat): string {
    if (!aviso.mencionaVoce) return aviso.usuarioNome;
    return aviso.grupoId === null ? `${aviso.usuarioNome} mencionou você` : `Mencionaram você em ${aviso.usuarioNome}`;
}

/** A conversa que o clique na notificação abre: o grupo, se o aviso era de um, senão a pessoa. */
export function conversaDoAviso(aviso: AvisoDoChat): ConversaDoChat {
    return aviso.grupoId === null ? { usuarioId: aviso.usuarioId, usuarioNome: aviso.usuarioNome } : { usuarioId: aviso.usuarioId, usuarioNome: aviso.usuarioNome, grupoId: aviso.grupoId };
}

/** A conversa à vista na janela de chat: uma pessoa, um grupo ou nada. */
export type ConversaAbertaDoChat = { usuarioId: number } | { grupoId: number } | null;

/**
 * Valida a conversa que a janela de chat diz estar mostrando: um id de usuário (formato que o executável anterior já enviava), `{ grupoId }` para um
 * grupo, ou `null` quando não há conversa à vista.
 */
export function lerConversaAbertaDoChat(valor: unknown): ConversaAbertaDoChat {
    if (ehIdValido(valor)) return { usuarioId: valor };
    const grupoId = (valor as { grupoId?: unknown } | null)?.grupoId;
    return typeof valor === 'object' && valor !== null && ehIdValido(grupoId) ? { grupoId } : null;
}

/** O aviso é da conversa que o usuário está lendo na janela de chat? Então não vira notificação. */
export function avisoEhDaConversaAberta(aviso: AvisoDoChat, aberta: ConversaAbertaDoChat): boolean {
    if (aberta === null) return false;
    if (aviso.grupoId !== null) return 'grupoId' in aberta && aberta.grupoId === aviso.grupoId;
    return 'usuarioId' in aberta && aberta.usuarioId === aviso.usuarioId;
}

/** O caminho (e a consulta) que a janela de chat pede ao Project para abrir: só rotas internas, nunca outra origem nem a própria janela de chat. */
export function lerCaminhoDoProject(valor: unknown): string | null {
    if (typeof valor !== 'string' || valor.length > LIMITE_DO_CAMINHO) return null;
    // eslint-disable-next-line no-control-regex -- rejeitar caracteres de controle em caminhos é o objetivo da expressão
    if (!valor.startsWith('/') || valor.startsWith('//') || valor.includes('\\') || /[\u0000-\u001f]/.test(valor)) return null;
    const caminho = valor.split(/[?#]/)[0];
    if (caminho === '/chat-popup' || caminho.startsWith('/chat-popup/') || caminho === '/checkin' || caminho.startsWith('/checkin/')) return null;
    return valor;
}

/** O endereço da janela de chat; com uma conversa, ela abre direto nela. */
export function enderecoDaJanelaDeChat(urlDoProject: string, conversa: ConversaDoChat | null): string {
    const endereco = new URL('chat-popup', urlDoProject);
    if (conversa) {
        if (conversa.grupoId !== undefined) endereco.searchParams.set('grupoId', String(conversa.grupoId));
        else endereco.searchParams.set('usuarioId', String(conversa.usuarioId));
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
