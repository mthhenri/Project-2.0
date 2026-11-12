import {
    AutorMensagemDiretaEnum,
    ConversaDiretaResumoDto,
    MensagemDiretaResumoDto,
    outroParticipanteDaConversaDireta,
    textoSimplesDaMensagemDireta,
} from '@project20/shared';

// Lógica pura do chat entre colaboradores (task 210): nada aqui conhece Angular nem a rede, para testar sem montar componente.

/**
 * O aviso permanente de que gestor e administrador leem as conversas entre desenvolvedores (decisão 5 da guarda-chuva) e, desde os grupos (task 247), os grupos sem
 * gestor ou administrador entre os membros: rodapé da lista e ícone do cabeçalho da conversa.
 */
export const AVISO_DE_LEITURA_DAS_CONVERSAS = 'Gestores e administradores podem ler as conversas entre desenvolvedores e os grupos sem gestor ou administrador.';

/** Uma mensagem como a tela a mostra: as do servidor (`ENVIADA`) mais as locais que ainda não chegaram (`ENVIANDO`) ou que falharam. */
export type SituacaoDaMensagem = 'ENVIADA' | 'ENVIANDO' | 'FALHOU';

export interface MensagemNaConversa extends Omit<MensagemDiretaResumoDto, 'createdDate' | 'editadaDate'> {
    createdDate: Date;
    /** Quando o autor editou a mensagem (task 313); `null` quando nunca foi editada. */
    editadaDate: Date | null;
    situacao: SituacaoDaMensagem;
}

/** A conversa da lista: o resumo do servidor com as datas já como `Date`. */
export interface ConversaNaLista extends Omit<ConversaDiretaResumoDto, 'ultimaMensagem'> {
    ultimaMensagem: (Omit<MensagemDiretaResumoDto, 'createdDate' | 'editadaDate'> & { createdDate: Date; editadaDate: Date | null }) | null;
}

// ---------------------------------------------------------------------------
// Identificador da mensagem
// ---------------------------------------------------------------------------

/**
 * UUID v4 para o `mensagemId` (é o que dá idempotência ao reenvio). `crypto.randomUUID` só existe em contexto seguro (HTTPS ou localhost); numa
 * implantação por HTTP simples ele não existe, então cai para `getRandomValues`, que existe em qualquer contexto.
 */
export function gerarMensagemId(): string {
    const cripto = globalThis.crypto;
    if (typeof cripto?.randomUUID === 'function') return cripto.randomUUID();
    const bytes = cripto.getRandomValues(new Uint8Array(16));
    bytes[6] = (bytes[6] & 0x0f) | 0x40;
    bytes[8] = (bytes[8] & 0x3f) | 0x80;
    const hex = [...bytes].map((byte) => byte.toString(16).padStart(2, '0')).join('');
    return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`;
}

// ---------------------------------------------------------------------------
// Reconexão do stream
// ---------------------------------------------------------------------------

export const ESPERA_MINIMA_DA_RECONEXAO_MS = 1_000;
export const ESPERA_MAXIMA_DA_RECONEXAO_MS = 30_000;
/** O servidor bate a cada 25 s; sem nenhum dado por tanto tempo a conexão está meio aberta (rede que sumiu sem avisar) e é reiniciada. */
export const LIMITE_SEM_SINAL_MS = 70_000;

/**
 * Quanto esperar antes da tentativa `tentativa` (0 = a primeira depois da queda): dobra a cada falha até 30 s. O sorteio (entre metade e o total)
 * evita que todos os clientes derrubados por um deploy voltem no mesmo instante.
 */
export function esperaDaReconexao(tentativa: number, sorteio: () => number = Math.random): number {
    const base = Math.min(ESPERA_MAXIMA_DA_RECONEXAO_MS, ESPERA_MINIMA_DA_RECONEXAO_MS * 2 ** Math.max(0, tentativa));
    return Math.round(base * (0.5 + sorteio() * 0.5));
}

export function semSinalHaMuito(ultimoDadoEm: number, agora: number): boolean {
    return agora - ultimoDadoEm > LIMITE_SEM_SINAL_MS;
}

// ---------------------------------------------------------------------------
// "Digitando…"
// ---------------------------------------------------------------------------

/** Quem digita avisa a outra pessoa no máximo a cada tanto: o aviso é só um sinal, não precisa acompanhar cada tecla. */
export const ESPERA_ENTRE_AVISOS_DE_DIGITACAO_MS = 3_000;
/** O "digitando…" some sozinho depois disto sem novo aviso (parou de digitar, apagou o texto ou a rede caiu). Maior que o intervalo entre avisos, para não piscar. */
export const VALIDADE_DO_DIGITANDO_MS = 5_000;

/** Já passou tempo suficiente desde o último aviso (`null` = nunca avisou) para avisar de novo? */
export function devePublicarDigitacao(ultimoAvisoEm: number | null, agora: number): boolean {
    return ultimoAvisoEm === null || agora - ultimoAvisoEm >= ESPERA_ENTRE_AVISOS_DE_DIGITACAO_MS;
}

// ---------------------------------------------------------------------------
// Mensagens
// ---------------------------------------------------------------------------

/** O servidor manda as datas como texto ISO; a tela trabalha com `Date`. */
export function normalizarMensagem(mensagem: MensagemDiretaResumoDto, situacao: SituacaoDaMensagem = 'ENVIADA'): MensagemNaConversa {
    // Os campos da resposta do `@IA` (task 315) podem faltar numa API anterior a ela (deploy em andamento): valem nulo e vazio.
    return {
        ...mensagem,
        createdDate: new Date(mensagem.createdDate),
        editadaDate: mensagem.editadaDate ? new Date(mensagem.editadaDate) : null,
        reacoes: mensagem.reacoes ?? [],
        chamadaPorUsuarioId: mensagem.chamadaPorUsuarioId ?? null,
        propostaIds: mensagem.propostaIds ?? [],
        situacao,
    };
}

function ordemDaConversa(mensagemNaConversa: MensagemNaConversa, segundo: MensagemNaConversa): number {
    const diferenca = mensagemNaConversa.createdDate.getTime() - segundo.createdDate.getTime();
    return diferenca !== 0 ? diferenca : mensagemNaConversa.mensagemId.localeCompare(segundo.mensagemId);
}

/**
 * Junta as mensagens que chegaram às que a tela já tem, da mais antiga para a mais nova, sem repetir: o mesmo `mensagemId` fica uma vez só e a
 * versão que chegou vence (é a do servidor, que substitui a otimista). A mensagem local que ainda não chegou continua na ponta.
 */
export function mesclarMensagens(atuais: MensagemNaConversa[], chegadas: MensagemNaConversa[]): MensagemNaConversa[] {
    const porId = new Map<string, MensagemNaConversa>();
    for (const mensagem of atuais) porId.set(mensagem.mensagemId, mensagem);
    for (const mensagem of chegadas) porId.set(mensagem.mensagemId, mensagem);
    return [...porId.values()].sort(ordemDaConversa);
}

export interface GrupoDeDia {
    /** `Hoje`, `Ontem` ou `dd/MM/yyyy`. */
    rotulo: string;
    mensagens: MensagemNaConversa[];
}

function inicioDoDia(data: Date): number {
    return new Date(data.getFullYear(), data.getMonth(), data.getDate()).getTime();
}

const MILISSEGUNDOS_POR_DIA = 86_400_000;

function doisDigitos(valor: number): string {
    return String(valor).padStart(2, '0');
}

export function formatarDia(data: Date): string {
    return `${doisDigitos(data.getDate())}/${doisDigitos(data.getMonth() + 1)}/${data.getFullYear()}`;
}

export function formatarHora(data: Date): string {
    return `${doisDigitos(data.getHours())}:${doisDigitos(data.getMinutes())}`;
}

export function rotuloDoDia(data: Date, agora: Date): string {
    const dias = Math.round((inicioDoDia(agora) - inicioDoDia(data)) / MILISSEGUNDOS_POR_DIA);
    if (dias === 0) return 'Hoje';
    if (dias === 1) return 'Ontem';
    return formatarDia(data);
}

/** As mensagens (já em ordem) separadas por dia, com o rótulo do separador. */
export function agruparPorDia(mensagens: MensagemNaConversa[], agora: Date): GrupoDeDia[] {
    const grupos: GrupoDeDia[] = [];
    for (const mensagem of mensagens) {
        const rotulo = rotuloDoDia(mensagem.createdDate, agora);
        const ultimo = grupos[grupos.length - 1];
        if (ultimo && ultimo.rotulo === rotulo) ultimo.mensagens.push(mensagem);
        else grupos.push({ rotulo, mensagens: [mensagem] });
    }
    return grupos;
}

/** Mensagens seguidas da mesma pessoa com menos que isto entre uma e outra se emendam: ficam coladas e só a última mostra o horário. */
export const INTERVALO_DA_SEQUENCIA_MS = 5 * 60_000;

export interface EmendaDaMensagem {
    /** A mensagem anterior é da mesma pessoa, do mesmo dia e de menos de 5 minutos antes. */
    comAnterior: boolean;
    /** A mensagem seguinte se emenda nesta. */
    comProxima: boolean;
}

function seEmendam(anterior: MensagemNaConversa, seguinte: MensagemNaConversa): boolean {
    if (anterior.autor !== AutorMensagemDiretaEnum.USUARIO || seguinte.autor !== AutorMensagemDiretaEnum.USUARIO) return false;
    if (anterior.autorUsuarioId !== seguinte.autorUsuarioId) return false;
    if (inicioDoDia(anterior.createdDate) !== inicioDoDia(seguinte.createdDate)) return false;
    const intervalo = seguinte.createdDate.getTime() - anterior.createdDate.getTime();
    return intervalo >= 0 && intervalo < INTERVALO_DA_SEQUENCIA_MS;
}

/** Para cada mensagem (por `mensagemId`), se ela se emenda na anterior e na seguinte. As mensagens chegam em ordem. */
export function marcarEmendas(mensagens: MensagemNaConversa[]): Map<string, EmendaDaMensagem> {
    const emendas = new Map<string, EmendaDaMensagem>();
    mensagens.forEach((mensagem, indice) => {
        const anterior = mensagens[indice - 1];
        const proxima = mensagens[indice + 1];
        emendas.set(mensagem.mensagemId, {
            comAnterior: !!anterior && seEmendam(anterior, mensagem),
            comProxima: !!proxima && seEmendam(mensagem, proxima),
        });
    });
    return emendas;
}

const DIAS_DA_SEMANA = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];

/** O horário curto da lista: a hora se for hoje, `Ontem`, o dia da semana nesta semana, senão a data. */
export function rotuloDaLista(data: Date, agora: Date): string {
    const dias = Math.round((inicioDoDia(agora) - inicioDoDia(data)) / MILISSEGUNDOS_POR_DIA);
    if (dias <= 0) return formatarHora(data);
    if (dias === 1) return 'Ontem';
    if (dias < 7) return DIAS_DA_SEMANA[data.getDay()];
    return formatarDia(data);
}

/** O "Lida" mora na última mensagem MINHA que a outra pessoa já viu; as anteriores não repetem. */
export function idDaUltimaLidaPelaOutraPessoa(mensagens: MensagemNaConversa[], meuId: number, lidaPeloOutroAte: Date | null): string | null {
    if (!lidaPeloOutroAte) return null;
    for (let indice = mensagens.length - 1; indice >= 0; indice--) {
        const mensagem = mensagens[indice];
        if (mensagem.autorUsuarioId === meuId && mensagem.situacao === 'ENVIADA' && mensagem.createdDate.getTime() <= lidaPeloOutroAte.getTime()) {
            return mensagem.mensagemId;
        }
    }
    return null;
}

/** A data da mensagem mais nova DA OUTRA PESSOA que a tela mostra: é até onde a leitura é marcada. */
export function dataDaUltimaDoOutro(mensagens: MensagemNaConversa[], meuId: number): Date | null {
    for (let indice = mensagens.length - 1; indice >= 0; indice--) {
        const mensagem = mensagens[indice];
        if (mensagem.autorUsuarioId !== meuId && mensagem.situacao === 'ENVIADA') return mensagem.createdDate;
    }
    return null;
}

// ---------------------------------------------------------------------------
// Lista de conversas
// ---------------------------------------------------------------------------

export function normalizarConversa(conversa: ConversaDiretaResumoDto): ConversaNaLista {
    return {
        ...conversa,
        ultimaMensagem: conversa.ultimaMensagem
            ? {
                ...conversa.ultimaMensagem,
                createdDate: new Date(conversa.ultimaMensagem.createdDate),
                editadaDate: conversa.ultimaMensagem.editadaDate ? new Date(conversa.ultimaMensagem.editadaDate) : null,
            }
            : null,
    };
}

/** A prévia da última mensagem na lista: sem marcação, o bloco de código vira `[código]`, a minha começa com `Você:` e a resposta do `@IA` com `IA:` (task 315). */
export function previaDaMensagem(texto: string, contemCodigo: boolean, souEuQuemEscreveu: boolean, daIa = false): string {
    const corpo = textoSimplesDaMensagemDireta(texto, contemCodigo);
    if (daIa) return `IA: ${corpo}`;
    return souEuQuemEscreveu ? `Você: ${corpo}` : corpo;
}

/** O ícone da IA (o mesmo da opção do `@` no compositor), antes do `@IA` destacado no texto da mensagem (task 315). */
export const ICONE_DA_IA = 'pi pi-sparkles';
/** As grafias de `@IA` que o servidor reconhece (sem diferenciar maiúsculas): o destaque do texto casa a grafia exata que a pessoa escreveu. */
export const DESTAQUES_DA_IA: readonly string[] = ['@IA', '@ia', '@Ia', '@iA'];
/** O ícone de cada grafia do `@IA`, para o visualizador de Markdown pôr antes do destaque. */
export const ICONES_DOS_DESTAQUES_DA_IA: Readonly<Record<string, string>> = Object.fromEntries(DESTAQUES_DA_IA.map((destaque) => [destaque, ICONE_DA_IA]));

/** Para quem a IA respondeu, no rótulo da resposta do `@IA` (task 315): `IA · para você` ou `IA · para <nome>`. */
export function rotuloDaRespostaDaIa(nomeDeQuemChamou: string): string {
    return `IA · para ${nomeDeQuemChamou}`;
}

export function totalNaoLidas(conversas: ConversaNaLista[]): number {
    return conversas.reduce((total, conversa) => total + conversa.naoLidas, 0);
}

export interface ResultadoDaMensagemNaLista {
    conversas: ConversaNaLista[];
    /** A mensagem é de uma conversa que a lista não tem: é preciso reler a lista (nome da pessoa, silêncio). */
    conversaDesconhecida: boolean;
}

/**
 * Aplica uma mensagem nova à lista: a conversa vai para o topo com a mensagem como última e, se a mensagem é da outra pessoa e essa conversa não
 * está aberta na tela, ganha uma não lida. A mesma mensagem recebida duas vezes (evento e resposta do envio) não conta duas.
 */
export function aplicarMensagemNaLista(
    conversas: ConversaNaLista[],
    mensagem: MensagemNaConversa,
    meuId: number,
    conversaAbertaId: string | null,
): ResultadoDaMensagemNaLista {
    const existente = conversas.find((conversa) => conversa.conversaId === mensagem.conversaId);
    if (!existente) return { conversas, conversaDesconhecida: true };

    const jaEraAUltima = existente.ultimaMensagem?.mensagemId === mensagem.mensagemId;
    // A resposta do `@IA` (task 315) não conta como não lida, como no servidor (que só conta mensagens de pessoa).
    const daOutraPessoa = mensagem.autor !== AutorMensagemDiretaEnum.IA && mensagem.autorUsuarioId !== meuId;
    const naoLidasAMais = !jaEraAUltima && daOutraPessoa && mensagem.conversaId !== conversaAbertaId ? 1 : 0;
    const { situacao: _situacao, ...resumo } = mensagem;
    const ehMaisRecente = !existente.ultimaMensagem || mensagem.createdDate.getTime() >= existente.ultimaMensagem.createdDate.getTime();
    const atualizada: ConversaNaLista = {
        ...existente,
        ultimaMensagem: ehMaisRecente ? resumo : existente.ultimaMensagem,
        naoLidas: existente.naoLidas + naoLidasAMais,
    };
    const demais = conversas.filter((conversa) => conversa.conversaId !== mensagem.conversaId);
    return { conversas: [atualizada, ...demais], conversaDesconhecida: false };
}

/**
 * Aplica a edição de uma mensagem à lista (task 313): se ela é a última da conversa, a prévia passa a mostrar o texto novo. A conversa **não** sobe
 * para o topo e não ganha não lida: editar não é mensagem nova.
 */
export function aplicarEdicaoNaLista(conversas: ConversaNaLista[], mensagem: MensagemNaConversa): ConversaNaLista[] {
    const { situacao: _situacao, ...resumo } = mensagem;
    return conversas.map((conversa) => (conversa.conversaId === mensagem.conversaId && conversa.ultimaMensagem?.mensagemId === mensagem.mensagemId ? { ...conversa, ultimaMensagem: resumo } : conversa));
}

export function zerarNaoLidas(conversas: ConversaNaLista[], conversaId: string): ConversaNaLista[] {
    return conversas.map((conversa) => (conversa.conversaId === conversaId && conversa.naoLidas > 0 ? { ...conversa, naoLidas: 0 } : conversa));
}

/** O id da outra pessoa de uma conversa do usuário; `null` se a conversa não é dele. */
export function outraPessoaDaConversa(conversaId: string, meuId: number): number | null {
    return outroParticipanteDaConversaDireta(conversaId, meuId);
}

// ---------------------------------------------------------------------------
// Busca: realce sem HTML
// ---------------------------------------------------------------------------

export interface TrechoDoTexto {
    texto: string;
    realce: boolean;
}

function semAcento(caractere: string): string {
    return caractere.normalize('NFD').replace(/\p{M}/gu, '').toLowerCase();
}

/**
 * Parte o texto em trechos, marcando os que casam com alguma palavra da busca (sem acento e sem diferenciar maiúsculas). O resultado é uma lista de
 * texto puro para o template criar `<mark>` por elemento: nada vira HTML.
 */
export function trechosComRealce(texto: string, busca: string): TrechoDoTexto[] {
    const palavras = busca.split(/\s+/).map((palavra) => [...palavra].map(semAcento).join('')).filter(Boolean);
    if (palavras.length === 0 || !texto) return [{ texto, realce: false }];

    // O texto normalizado caractere a caractere mantém o mesmo tamanho do original (cada letra acentuada volta a uma letra), então os índices coincidem.
    const normalizado = [...texto].map(semAcento).join('');
    if (normalizado.length !== texto.length) return [{ texto, realce: false }];

    const marcado = new Array<boolean>(texto.length).fill(false);
    for (const palavra of palavras) {
        let inicio = normalizado.indexOf(palavra);
        while (inicio >= 0) {
            for (let indice = inicio; indice < inicio + palavra.length; indice++) marcado[indice] = true;
            inicio = normalizado.indexOf(palavra, inicio + palavra.length);
        }
    }

    const trechos: TrechoDoTexto[] = [];
    let atual = '';
    let atualRealce = marcado[0];
    for (let indice = 0; indice < texto.length; indice++) {
        if (marcado[indice] !== atualRealce) {
            trechos.push({ texto: atual, realce: atualRealce });
            atual = '';
            atualRealce = marcado[indice];
        }
        atual += texto[indice];
    }
    trechos.push({ texto: atual, realce: atualRealce });
    return trechos;
}

/** Filtra as pessoas pelo nome (sem acento, todas as palavras). */
export function filtrarPessoasPorNome<T extends { usuarioNome: string }>(pessoas: T[], busca: string): T[] {
    const palavras = busca.split(/\s+/).map((palavra) => [...palavra].map(semAcento).join('')).filter(Boolean);
    if (palavras.length === 0) return pessoas;
    return pessoas.filter((pessoa) => {
        const nome = [...pessoa.usuarioNome].map(semAcento).join('');
        return palavras.every((palavra) => nome.includes(palavra));
    });
}
