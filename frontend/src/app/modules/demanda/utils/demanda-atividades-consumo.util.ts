import { AtividadeResumoDto, TipoAtividadeStatusEnum } from '@project20/shared';

/** Os filtros do topo da aba Atividades da demanda (task 304). */
export type FiltroAtividadesDaDemanda = 'todas' | 'minhas' | 'abertas';

export interface FatiaDeConsumo {
    atividadeId: number;
    minutos: number;
    /** Inteiro de 0 a 100; as fatias de quem consumiu algo somam exatamente 100 (maior resto), ou 0 quando ninguém consumiu. */
    percentual: number;
}

export interface ConsumoDaDemanda {
    totalMinutos: number;
    fatias: FatiaDeConsumo[];
}

/**
 * A fatia que cada atividade consumiu do total consumido pela demanda (a atividade não tem horas esperadas: a barra só mostra a
 * proporção entre elas). O arredondamento usa o método do maior resto para que os percentuais somem 100, sem 99% nem 101%.
 */
export function calcularConsumoDaDemanda(atividades: Pick<AtividadeResumoDto, 'id' | 'totalMinutosExecutados'>[]): ConsumoDaDemanda {
    const totalMinutos = atividades.reduce((soma, atividade) => soma + Math.max(0, atividade.totalMinutosExecutados), 0);
    if (totalMinutos === 0) {
        return { totalMinutos: 0, fatias: atividades.map((atividade) => ({ atividadeId: atividade.id, minutos: 0, percentual: 0 })) };
    }
    const partes = atividades.map((atividade) => {
        const minutos = Math.max(0, atividade.totalMinutosExecutados);
        const exato = (minutos / totalMinutos) * 100;
        return { atividadeId: atividade.id, minutos, percentual: Math.floor(exato), resto: exato - Math.floor(exato) };
    });
    let faltam = 100 - partes.reduce((soma, parte) => soma + parte.percentual, 0);
    const porResto = partes.filter((parte) => parte.minutos > 0).sort((primeira, segunda) => segunda.resto - primeira.resto);
    for (let indice = 0; faltam > 0 && porResto.length > 0; indice = (indice + 1) % porResto.length, faltam--) porResto[indice].percentual++;
    return { totalMinutos, fatias: partes.map(({ atividadeId, minutos, percentual }) => ({ atividadeId, minutos, percentual })) };
}

/** "Em aberto" é tudo que ainda não está DESENVOLVIDA; "Minhas" são as do usuário logado. */
export function filtrarAtividadesDaDemanda(
    atividades: AtividadeResumoDto[],
    filtro: FiltroAtividadesDaDemanda,
    usuarioId: number | undefined,
): AtividadeResumoDto[] {
    if (filtro === 'minhas') return atividades.filter((atividade) => atividade.usuarioId === usuarioId);
    if (filtro === 'abertas') return atividades.filter((atividade) => atividade.status !== TipoAtividadeStatusEnum.DESENVOLVIDA);
    return atividades;
}

/** Quantas atividades há em cada situação, mais quantas estão em execução agora (`execucaoAtivaId`). */
export function contarAtividadesPorSituacao(atividades: Pick<AtividadeResumoDto, 'status' | 'execucaoAtivaId'>[]): Record<TipoAtividadeStatusEnum | 'EM_EXECUCAO', number> {
    const contagem = {
        EM_EXECUCAO: 0,
        [TipoAtividadeStatusEnum.PLANEJADA]: 0,
        [TipoAtividadeStatusEnum.PENDENTE]: 0,
        [TipoAtividadeStatusEnum.DESENVOLVENDO]: 0,
        [TipoAtividadeStatusEnum.DESENVOLVIDA]: 0,
    };
    for (const atividade of atividades) {
        contagem[atividade.status]++;
        if (atividade.execucaoAtivaId !== null) contagem.EM_EXECUCAO++;
    }
    return contagem;
}
