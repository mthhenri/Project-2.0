import { DemandaGrafoArestaDto, DemandaGrafoDto, TipoDemandaStatusEnum } from '@project20/shared';

/** O que o recorte de conexões da demanda aberta mostra (task 305): ela, as demandas ligadas a ela e as conexões entre esses nós. */
export interface RecorteDeConexoes {
    grafo: DemandaGrafoDto;
    /** Nomes das demandas ligadas que estão canceladas (a aba avisa). */
    canceladas: string[];
}

/** A leitura de uma conexão a partir da demanda aberta: ela depende da outra, a outra depende dela, ou as duas dependem uma da outra. */
export type SentidoDaConexao = 'saida' | 'entrada' | 'mutua';

/**
 * O recorte do grafo do projeto em torno de uma demanda: a própria demanda (que fica no centro), as ligadas a ela por conexão e as conexões entre
 * esses nós. A hierarquia (pai e filhas) não entra: aqui só se vê dependência. Conexão com demanda que não está no grafo (outro projeto) é ignorada.
 */
export function montarRecorteDeConexoes(grafo: DemandaGrafoDto, demandaId: number): RecorteDeConexoes {
    const idsDosNos = new Set(grafo.nos.map((no) => no.id));
    const conexoes = grafo.arestas.filter((aresta) => aresta.tipo === 'conexao' && idsDosNos.has(aresta.origemId) && idsDosNos.has(aresta.destinoId));
    const ligadas = new Set<number>();
    for (const aresta of conexoes) {
        if (aresta.origemId === demandaId) ligadas.add(aresta.destinoId);
        else if (aresta.destinoId === demandaId) ligadas.add(aresta.origemId);
    }
    const idsDoRecorte = new Set<number>(ligadas);
    if (idsDosNos.has(demandaId)) idsDoRecorte.add(demandaId);
    const nos = grafo.nos.filter((no) => idsDoRecorte.has(no.id));
    const arestas = conexoes.filter((aresta) => idsDoRecorte.has(aresta.origemId) && idsDoRecorte.has(aresta.destinoId));
    const canceladas = nos.filter((no) => no.id !== demandaId && no.status === TipoDemandaStatusEnum.CANCELADA).map((no) => no.nome);
    return { grafo: { nos, arestas }, canceladas };
}

/** O sentido da conexão para a demanda em foco; entre duas outras demandas lê-se do ponto de vista da origem ("depende de"). */
export function sentidoDaConexao(aresta: Pick<DemandaGrafoArestaDto, 'origemId' | 'destinoId' | 'bidirecional'>, demandaId: number): SentidoDaConexao {
    if (aresta.bidirecional) return 'mutua';
    return aresta.destinoId === demandaId ? 'entrada' : 'saida';
}

const TEXTO_DO_SENTIDO: Record<SentidoDaConexao, string> = { saida: 'depende de', entrada: 'depende desta', mutua: 'mútua' };

/** O texto escrito ao longo da linha da conexão. */
export function textoDaConexao(aresta: Pick<DemandaGrafoArestaDto, 'origemId' | 'destinoId' | 'bidirecional'>, demandaId: number): string {
    return TEXTO_DO_SENTIDO[sentidoDaConexao(aresta, demandaId)];
}
