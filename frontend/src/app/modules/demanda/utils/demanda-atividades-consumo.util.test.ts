import { describe, expect, it } from 'vitest';
import { AtividadeResumoDto, TipoAtividadeStatusEnum } from '@project20/shared';
import { calcularConsumoDaDemanda, contarAtividadesPorSituacao, filtrarAtividadesDaDemanda } from './demanda-atividades-consumo.util';

function atividade(id: number, sobrescrita: Partial<AtividadeResumoDto> = {}): AtividadeResumoDto {
    return { id, usuarioId: 1, status: TipoAtividadeStatusEnum.PLANEJADA, totalMinutosExecutados: 0, execucaoAtivaId: null, ...sobrescrita } as AtividadeResumoDto;
}

describe('calcularConsumoDaDemanda', () => {
    it('sem atividades ou sem execução: total zero e nenhuma fatia', () => {
        expect(calcularConsumoDaDemanda([])).toEqual({ totalMinutos: 0, fatias: [] });
        expect(calcularConsumoDaDemanda([atividade(1), atividade(2)]).fatias.map((fatia) => fatia.percentual)).toEqual([0, 0]);
    });

    it('uma atividade consumiu tudo: 100%', () => {
        const consumo = calcularConsumoDaDemanda([atividade(1, { totalMinutosExecutados: 90 }), atividade(2)]);
        expect(consumo.totalMinutos).toBe(90);
        expect(consumo.fatias.map((fatia) => fatia.percentual)).toEqual([100, 0]);
    });

    it('totais iguais dividem por igual', () => {
        const consumo = calcularConsumoDaDemanda([atividade(1, { totalMinutosExecutados: 60 }), atividade(2, { totalMinutosExecutados: 60 })]);
        expect(consumo.fatias.map((fatia) => fatia.percentual)).toEqual([50, 50]);
    });

    it('o arredondamento soma sempre 100 (três partes iguais, e proporções quebradas)', () => {
        const tres = calcularConsumoDaDemanda([1, 2, 3].map((id) => atividade(id, { totalMinutosExecutados: 10 })));
        expect(tres.fatias.map((fatia) => fatia.percentual).reduce((soma, valor) => soma + valor, 0)).toBe(100);
        const quebradas = calcularConsumoDaDemanda([atividade(1, { totalMinutosExecutados: 1 }), atividade(2, { totalMinutosExecutados: 2 }), atividade(3, { totalMinutosExecutados: 4 }), atividade(4, { totalMinutosExecutados: 7 })]);
        expect(quebradas.fatias.map((fatia) => fatia.percentual).reduce((soma, valor) => soma + valor, 0)).toBe(100);
        expect(quebradas.fatias[3].percentual).toBeGreaterThan(quebradas.fatias[0].percentual);
    });

    it('minutos negativos não entram', () => {
        expect(calcularConsumoDaDemanda([atividade(1, { totalMinutosExecutados: -5 })]).totalMinutos).toBe(0);
    });
});

describe('filtrarAtividadesDaDemanda', () => {
    const lista = [
        atividade(1, { usuarioId: 7, status: TipoAtividadeStatusEnum.DESENVOLVIDA }),
        atividade(2, { usuarioId: 7, status: TipoAtividadeStatusEnum.PENDENTE }),
        atividade(3, { usuarioId: 9, status: TipoAtividadeStatusEnum.DESENVOLVENDO }),
    ];

    it('todas, minhas e em aberto (não desenvolvidas)', () => {
        expect(filtrarAtividadesDaDemanda(lista, 'todas', 7).map((item) => item.id)).toEqual([1, 2, 3]);
        expect(filtrarAtividadesDaDemanda(lista, 'minhas', 7).map((item) => item.id)).toEqual([1, 2]);
        expect(filtrarAtividadesDaDemanda(lista, 'abertas', 7).map((item) => item.id)).toEqual([2, 3]);
        expect(filtrarAtividadesDaDemanda(lista, 'minhas', undefined)).toEqual([]);
    });
});

describe('contarAtividadesPorSituacao', () => {
    it('conta por status e as em execução agora', () => {
        const contagem = contarAtividadesPorSituacao([
            atividade(1, { status: TipoAtividadeStatusEnum.DESENVOLVENDO, execucaoAtivaId: 5 }),
            atividade(2, { status: TipoAtividadeStatusEnum.PLANEJADA }),
            atividade(3, { status: TipoAtividadeStatusEnum.PLANEJADA }),
        ]);
        expect(contagem).toEqual({ EM_EXECUCAO: 1, PLANEJADA: 2, PENDENTE: 0, DESENVOLVENDO: 1, DESENVOLVIDA: 0 });
    });
});
