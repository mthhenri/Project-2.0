import { AutorMensagemDiretaEnum, GrupoMembroResumoDto, GrupoResumoDto, LIMITE_MEMBROS_DO_GRUPO, MensagemDiretaResumoDto, lerConversaGrupoId } from '@project20/shared';
import { ConversaNaLista, MensagemNaConversa } from './mensagem-direta.util';

// Lógica pura dos grupos do chat entre colaboradores (task 247): nada aqui conhece Angular nem a rede.

/** O limite de pessoas do grupo livre (a decisão do autor; o servidor confere de novo). */
export const MAXIMO_DE_MEMBROS_DO_GRUPO = LIMITE_MEMBROS_DO_GRUPO;

/** Um membro com a data de entrada já como `Date`. */
export interface MembroNoGrupo extends Omit<GrupoMembroResumoDto, 'entradaData'> {
    entradaData: Date;
}

/** O grupo da lista: o resumo do servidor com as datas já como `Date`. */
export interface GrupoNaLista extends Omit<GrupoResumoDto, 'ultimaMensagem' | 'membros'> {
    membros: MembroNoGrupo[];
    ultimaMensagem: (Omit<MensagemDiretaResumoDto, 'createdDate' | 'editadaDate'> & { createdDate: Date; editadaDate: Date | null }) | null;
}

export function normalizarGrupo(grupo: GrupoResumoDto): GrupoNaLista {
    return {
        ...grupo,
        membros: grupo.membros.map((membro) => ({ ...membro, entradaData: new Date(membro.entradaData) })),
        ultimaMensagem: grupo.ultimaMensagem
            ? {
                ...grupo.ultimaMensagem,
                createdDate: new Date(grupo.ultimaMensagem.createdDate),
                editadaDate: grupo.ultimaMensagem.editadaDate ? new Date(grupo.ultimaMensagem.editadaDate) : null,
                reacoes: grupo.ultimaMensagem.reacoes ?? [],
                chamadaPorUsuarioId: grupo.ultimaMensagem.chamadaPorUsuarioId ?? null,
                propostaIds: grupo.ultimaMensagem.propostaIds ?? [],
            }
            : null,
    };
}

/** O id do grupo de um `conversaId` (`G<id>`), ou `null` se a conversa não é de grupo. */
export function grupoIdDaConversa(conversaId: string | null | undefined): number | null {
    return conversaId ? lerConversaGrupoId(conversaId) : null;
}

// ---------------------------------------------------------------------------
// Lista mista: conversas e grupos, pela última mensagem
// ---------------------------------------------------------------------------

export type ItemDaLista =
    | { tipo: 'PESSOA'; chave: string; instante: number; conversa: ConversaNaLista }
    | { tipo: 'GRUPO'; chave: string; instante: number; grupo: GrupoNaLista };

/**
 * Conversas um a um e grupos juntos, o que teve mensagem mais recente primeiro. As duas listas já chegam do servidor em ordem de recência e a ordem
 * de cada uma é preservada (é uma intercalação, não uma nova ordenação); no empate a conversa vem antes do grupo. Grupo sem mensagem vai por último.
 */
export function montarItensDaLista(conversas: ConversaNaLista[], grupos: GrupoNaLista[]): ItemDaLista[] {
    const instanteDoGrupo = (grupo: GrupoNaLista) => grupo.ultimaMensagem?.createdDate.getTime() ?? 0;
    const instanteDaConversa = (conversa: ConversaNaLista) => conversa.ultimaMensagem?.createdDate.getTime() ?? 0;
    const gruposEmOrdem = [...grupos].sort((primeiro, segundo) => instanteDoGrupo(segundo) - instanteDoGrupo(primeiro) || primeiro.conversaId.localeCompare(segundo.conversaId));
    const itens: ItemDaLista[] = [];
    let indiceDaConversa = 0;
    let indiceDoGrupo = 0;
    while (indiceDaConversa < conversas.length || indiceDoGrupo < gruposEmOrdem.length) {
        const conversa = conversas[indiceDaConversa];
        const grupo = gruposEmOrdem[indiceDoGrupo];
        const pegaConversa = !!conversa && (!grupo || instanteDaConversa(conversa) >= instanteDoGrupo(grupo));
        if (pegaConversa) {
            itens.push({ tipo: 'PESSOA', chave: conversa.conversaId, instante: instanteDaConversa(conversa), conversa });
            indiceDaConversa++;
        } else {
            itens.push({ tipo: 'GRUPO', chave: grupo.conversaId, instante: instanteDoGrupo(grupo), grupo });
            indiceDoGrupo++;
        }
    }
    return itens;
}

/** As não lidas dos grupos que **não** estão silenciados (a linha de cada grupo mostra a sua mesmo assim): soma com as das conversas no contador do topbar. */
export function totalNaoLidasDosGrupos(grupos: GrupoNaLista[]): number {
    return grupos.filter((grupo) => !grupo.silenciada).reduce((total, grupo) => total + grupo.naoLidas, 0);
}

/** Filtra os grupos pelo nome (sem acento, todas as palavras). */
export function filtrarGruposPorNome<T extends { nome: string }>(grupos: T[], busca: string): T[] {
    const palavras = semAcento(busca).split(/\s+/).filter(Boolean);
    if (palavras.length === 0) return grupos;
    return grupos.filter((grupo) => {
        const nome = semAcento(grupo.nome);
        return palavras.every((palavra) => nome.includes(palavra));
    });
}

function semAcento(texto: string): string {
    return texto.normalize('NFD').replace(/\p{M}/gu, '').toLowerCase();
}

// ---------------------------------------------------------------------------
// Mensagem nova, edição e leitura na lista
// ---------------------------------------------------------------------------

export interface ResultadoDaMensagemNosGrupos {
    grupos: GrupoNaLista[];
    /** A mensagem é de um grupo que a lista não tem (acabou de entrar nele): é preciso reler a lista. */
    grupoDesconhecido: boolean;
}

/**
 * Aplica uma mensagem nova ao grupo da lista: ele passa a ter a mensagem como última e, se ela é de outra pessoa (não do sistema) e o grupo não está
 * aberto à vista, ganha uma não lida. A mesma mensagem recebida duas vezes (evento e resposta do envio) não conta duas. O grupo não muda de posição aqui:
 * a ordem da lista sai de `montarItensDaLista`.
 */
export function aplicarMensagemNosGrupos(grupos: GrupoNaLista[], mensagem: MensagemNaConversa, meuId: number, grupoAbertoAVistaId: string | null): ResultadoDaMensagemNosGrupos {
    const existente = grupos.find((grupo) => grupo.conversaId === mensagem.conversaId);
    if (!existente) return { grupos, grupoDesconhecido: true };
    const jaEraAUltima = existente.ultimaMensagem?.mensagemId === mensagem.mensagemId;
    const deOutraPessoa = mensagem.autor === AutorMensagemDiretaEnum.USUARIO && mensagem.autorUsuarioId !== meuId;
    const naoLidasAMais = !jaEraAUltima && deOutraPessoa && mensagem.conversaId !== grupoAbertoAVistaId ? 1 : 0;
    const { situacao: _situacao, ...resumo } = mensagem;
    const ehMaisRecente = !existente.ultimaMensagem || mensagem.createdDate.getTime() >= existente.ultimaMensagem.createdDate.getTime();
    const atualizado: GrupoNaLista = { ...existente, ultimaMensagem: ehMaisRecente ? resumo : existente.ultimaMensagem, naoLidas: existente.naoLidas + naoLidasAMais };
    return { grupos: grupos.map((grupo) => (grupo.conversaId === mensagem.conversaId ? atualizado : grupo)), grupoDesconhecido: false };
}

export function zerarNaoLidasDoGrupo(grupos: GrupoNaLista[], conversaId: string): GrupoNaLista[] {
    return grupos.map((grupo) => (grupo.conversaId === conversaId && grupo.naoLidas > 0 ? { ...grupo, naoLidas: 0 } : grupo));
}

// ---------------------------------------------------------------------------
// Nomes e cores dos membros
// ---------------------------------------------------------------------------

export const NOME_DE_MEMBRO_REMOVIDO = 'Usuário removido';

/** Quem escreveu, para o balão do grupo: "Você" para mim, o nome do membro ou, se ele já saiu, "Usuário removido". */
export function nomeDoAutorNoGrupo(membros: MembroNoGrupo[], autorUsuarioId: number | null, meuId: number | undefined): string {
    if (autorUsuarioId === null) return '';
    if (autorUsuarioId === meuId) return 'Você';
    return membros.find((membro) => membro.usuarioId === autorUsuarioId)?.usuarioNome ?? NOME_DE_MEMBRO_REMOVIDO;
}

/** As cores de bolinha dos membros que escolheram uma, na ordem de entrada: com elas se monta o degradê do grupo sem cor. */
export function coresDosMembros(membros: MembroNoGrupo[]): string[] {
    return membros.map((membro) => membro.corAvatar).filter((cor): cor is string => !!cor);
}

/** O texto do cabeçalho: "3 membros" / "1 membro". */
export function rotuloDosMembros(total: number): string {
    return `${total} ${total === 1 ? 'membro' : 'membros'}`;
}

/** Quem ainda pode entrar no grupo: as pessoas ativas que não são membros. */
export function pessoasParaAdicionar<T extends { usuarioId: number }>(pessoas: T[], membros: MembroNoGrupo[]): T[] {
    const idsDosMembros = new Set(membros.map((membro) => membro.usuarioId));
    return pessoas.filter((pessoa) => !idsDosMembros.has(pessoa.usuarioId));
}

/** A prévia da última mensagem de um grupo na lista: "Ana: texto" (o autor entra no começo; a minha, "Você:"; a do sistema, só o texto). */
export function autorDaPreviaDoGrupo(ultima: { autor: AutorMensagemDiretaEnum; autorUsuarioId: number | null }, membros: MembroNoGrupo[], meuId: number | undefined): string | null {
    if (ultima.autor !== AutorMensagemDiretaEnum.USUARIO) return null;
    const nome = nomeDoAutorNoGrupo(membros, ultima.autorUsuarioId, meuId);
    return nome ? nome.split(' ')[0] : null;
}

// ---------------------------------------------------------------------------
// Aparência do grupo: cores e emojis sugeridos
// ---------------------------------------------------------------------------

/** As cores sugeridas para o grupo (`#RRGGBB` em maiúsculas); a pessoa também pode escolher qualquer outra, ou nenhuma (degradê dos membros). */
export const CORES_SUGERIDAS_DO_GRUPO: readonly string[] = [
    '#1E3A8A', '#2563EB', '#0891B2', '#059669', '#65A30D', '#CA8A04',
    '#EA580C', '#DC2626', '#DB2777', '#9333EA', '#4F46E5', '#475569',
];

/** Os emojis sugeridos para o grupo; "Outro emoji" abre o seletor completo. */
export const EMOJIS_SUGERIDOS_DO_GRUPO: readonly string[] = [
    '🚀', '💻', '🛠️', '🐛', '📌', '🎯', '💡', '🔥',
    '📚', '🧪', '⚙️', '📊', '🎉', '☕', '🤝', '⭐',
];
