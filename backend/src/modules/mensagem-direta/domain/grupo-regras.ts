import { LIMITE_MEMBROS_DO_GRUPO, LIMITE_NOME_DO_GRUPO, TipoGrupoEnum, TipoUsuarioEnum, ehReacaoValida } from '@project20/shared';
import { BusinessException } from '../../../core/exceptions/business.exception';

/**
 * Regras puras dos grupos do chat entre colaboradores (task 246). Ficam fora da service para serem testadas sem dublê. Os textos das mensagens do
 * sistema moram aqui: o cliente só os renderiza.
 */

/** O nome do grupo sem as pontas em branco; obrigatório e de até `LIMITE_NOME_DO_GRUPO` caracteres. */
export function normalizarNomeDoGrupo(nome: string): string {
    const limpo = (nome ?? '').trim().replace(/\s+/g, ' ');
    if (!limpo) throw new BusinessException('O grupo precisa de um nome');
    if ([...limpo].length > LIMITE_NOME_DO_GRUPO) throw new BusinessException(`O nome do grupo deve ter no máximo ${LIMITE_NOME_DO_GRUPO} caracteres`);
    return limpo;
}

/** O emoji do grupo: vazio vira `null`; senão precisa ser um único emoji (a mesma regra da reação). */
export function normalizarEmojiDoGrupo(emoji: string | null | undefined): string | null {
    if (emoji === null || emoji === undefined) return null;
    const limpo = emoji.trim();
    if (!limpo) return null;
    if (!ehReacaoValida(limpo)) throw new BusinessException('O emoji do grupo deve ser um único emoji');
    return limpo;
}

/**
 * Os membros a adicionar: sem repetição, sem quem pediu e sem quem já é membro. Recusa passar do limite do grupo (a conta é com os membros atuais mais os novos).
 */
export function normalizarNovosMembros(pedidos: number[] | undefined, membrosAtuaisIds: number[], quemPediuId: number): number[] {
    const novos = [...new Set(pedidos ?? [])].filter((usuarioId) => usuarioId !== quemPediuId && !membrosAtuaisIds.includes(usuarioId));
    if (new Set([...membrosAtuaisIds, quemPediuId, ...novos]).size > LIMITE_MEMBROS_DO_GRUPO) {
        throw new BusinessException(`O grupo comporta no máximo ${LIMITE_MEMBROS_DO_GRUPO} pessoas`);
    }
    return novos;
}

/**
 * As menções de uma mensagem do grupo: só membros atuais. `@todos` (qualquer membro pode) vira todos os membros atuais, menos o autor, para o aviso.
 * A menção a quem não é membro é recusada: o aviso para um estranho vazaria que o grupo existe.
 */
export function normalizarMencoesDoGrupo(mencoes: number[] | undefined, mencionaTodos: boolean | undefined, membrosIds: number[], autorUsuarioId: number): number[] {
    const unicas = [...new Set(mencoes ?? [])];
    if (unicas.some((usuarioId) => !membrosIds.includes(usuarioId))) throw new BusinessException('Só é possível mencionar os membros do grupo');
    if (!mencionaTodos) return unicas;
    return [...new Set([...unicas, ...membrosIds.filter((usuarioId) => usuarioId !== autorUsuarioId)])];
}

/** "A", "A e B", "A, B e C". */
export function listarNomes(nomes: string[]): string {
    if (nomes.length <= 1) return nomes.join('');
    return `${nomes.slice(0, -1).join(', ')} e ${nomes[nomes.length - 1]}`;
}

function rotuloDoPapel(tipo: TipoUsuarioEnum): string {
    return tipo === TipoUsuarioEnum.ADMINISTRADOR ? 'administrador' : 'gestor';
}

/** "X criou o grupo" ou, com gente adicionada na criação, "X criou o grupo e adicionou A e B". */
export function textoDeCriacaoDoGrupo(nomeDeQuemCriou: string, nomesAdicionados: string[] = []): string {
    return nomesAdicionados.length > 0 ? `${nomeDeQuemCriou} criou o grupo e adicionou ${listarNomes(nomesAdicionados)}` : `${nomeDeQuemCriou} criou o grupo`;
}

export function textoDeEntradaNoGrupo(nomeDeQuemAdicionou: string, nomesAdicionados: string[]): string {
    return `${nomeDeQuemAdicionou} adicionou ${listarNomes(nomesAdicionados)}`;
}

export function textoDeSaidaDoGrupo(nomeDeQuemSaiu: string): string {
    return `${nomeDeQuemSaiu} saiu do grupo`;
}

export function textoDeRenomeacaoDoGrupo(nomeDeQuemRenomeou: string, nomeNovo: string): string {
    return `${nomeDeQuemRenomeou} renomeou o grupo para “${nomeNovo}”`;
}

export function textoDeAparenciaDoGrupo(nomeDeQuemAlterou: string, mudou: { cor: boolean; emoji: boolean }): string {
    const itens = [mudou.cor ? 'a cor' : null, mudou.emoji ? 'o emoji' : null].filter((item): item is string => item !== null);
    return `${nomeDeQuemAlterou} alterou ${listarNomes(itens)} do grupo`;
}

/** O aviso de que entrou alguém com poder de gestor: o grupo passa a ser privado para a supervisão. */
export function textoDeGrupoPrivado(quemEntrou: { nome: string; tipo: TipoUsuarioEnum }[]): string {
    const descricao = quemEntrou.map((pessoa) => `${pessoa.nome} (${rotuloDoPapel(pessoa.tipo)})`);
    const verbo = quemEntrou.length === 1 ? 'entrou' : 'entraram';
    return `${listarNomes(descricao)} ${verbo} no grupo: a conversa agora é privada e a supervisão não a lê`;
}

/** O aviso aos membros de que um gestor ou administrador leu o grupo (ou o canal) pela supervisão. */
export function textoDoAvisoDeSupervisaoDoGrupo(nomeDoLeitor: string, tipoDoLeitor: TipoUsuarioEnum, ehCanal = false): string {
    return `${nomeDoLeitor}, ${rotuloDoPapel(tipoDoLeitor)}, leu ${ehCanal ? 'este canal' : 'este grupo'}`;
}

/**
 * O nome que o canal guarda em `grupo.nome` (obrigatório e de até `LIMITE_NOME_DO_GRUPO` caracteres): o da demanda ou do projeto, cortado se passar.
 * Quem lê vê sempre o nome de hoje do alvo; o guardado só mantém a coluna preenchida.
 */
export function nomeDoCanalParaGuardar(nomeDoAlvo: string): string {
    const limpo = (nomeDoAlvo ?? '').trim().replace(/\s+/g, ' ');
    return [...limpo].slice(0, LIMITE_NOME_DO_GRUPO).join('') || 'Canal';
}

/** A mensagem do sistema do primeiro registro do canal. */
export function textoDeCriacaoDoCanal(nomeDeQuemCriou: string, tipo: TipoGrupoEnum): string {
    return `${nomeDeQuemCriou} abriu o chat ${tipo === TipoGrupoEnum.DEMANDA ? 'da demanda' : 'do projeto'}`;
}

/** O gestor ou administrador que escreveu no canal passa a contar como membro (entra em `@todos` e nas não lidas daí em diante). */
export function textoDeEntradaNoCanal(pessoa: { nome: string; tipo: TipoUsuarioEnum }): string {
    return `${pessoa.nome} (${rotuloDoPapel(pessoa.tipo)}) entrou no chat`;
}

/** A leitura mais avançada entre a marcada e a entrada: as não lidas de quem foi adicionado contam desde a entrada, mesmo havendo histórico. */
export function pontoDeLeituraDoGrupo(lidaAteData: Date | null, entradaData: Date): Date {
    return lidaAteData && lidaAteData.getTime() > entradaData.getTime() ? lidaAteData : entradaData;
}
