import { describe, expect, it } from 'vitest';
import { AtividadeResumoDto, TipoAtividadeStatusEnum, TipoUsuarioEnum } from '@project20/shared';
import { montarComponente } from '../../../../../testes/montar-componente';
import { DemandaAtividadesPainelComponent } from './demanda-atividades-painel.component';

// Task 304: o consumo da demanda por atividade (a atividade não tem horas esperadas), o que está em execução agora, os filtros e os estados.

function atividade(id: number, sobrescrita: Partial<AtividadeResumoDto> = {}): AtividadeResumoDto {
    return {
        id, nome: `Atividade ${id}`, status: TipoAtividadeStatusEnum.PLANEJADA, usuarioId: 99, nomeUsuario: 'Ana Souza', usuarioTipo: TipoUsuarioEnum.DESENVOLVEDOR,
        prioridade: { id: 1, codigo: 'MEDIA', descricao: 'Média', cor: '#3b82f6', ordem: 2 }, totalMinutosExecutados: 0, totalExecucoes: 0, execucaoAtivaId: null, execucaoAtivaDescricao: null,
        tags: [], ...sobrescrita,
    } as unknown as AtividadeResumoDto;
}

async function montar(atividades: AtividadeResumoDto[], carregando = false) {
    return montarComponente(DemandaAtividadesPainelComponent, { usuario: TipoUsuarioEnum.DESENVOLVEDOR, entradas: { atividades, carregando } });
}

describe('DemandaAtividadesPainelComponent', () => {
    it('carregando: só o indicador, sem cartões', async () => {
        const montado = await montar([], true);
        expect(montado.elemento.querySelector('.pi-spinner')).not.toBeNull();
        expect(montado.elemento.querySelector('.demanda-atividades__item')).toBeNull();
    });

    it('vazio: convida a criar a primeira atividade', async () => {
        const montado = await montar([]);
        expect(montado.elemento.textContent).toContain('Nenhuma atividade nesta demanda');
    });

    it('cheio: total consumido, fatia de cada uma e "sem execução ainda" para a que não executou', async () => {
        const montado = await montar([atividade(1, { totalMinutosExecutados: 180 }), atividade(2, { totalMinutosExecutados: 60 }), atividade(3)]);
        const texto = montado.elemento.textContent ?? '';
        expect(texto).toContain('consumidas pela demanda');
        expect(texto).toContain('75% da demanda');
        expect(texto).toContain('25% da demanda');
        expect(texto).toContain('sem execução ainda');
        expect(montado.elemento.querySelectorAll('.demanda-atividades__item').length).toBe(3);
        expect(montado.elemento.querySelectorAll('.demanda-atividades__trecho').length).toBe(2);
    });

    it('em execução agora: o cartão fica destacado e mostra o selo', async () => {
        const montado = await montar([atividade(1, { status: TipoAtividadeStatusEnum.DESENVOLVENDO, execucaoAtivaId: 7 }), atividade(2)]);
        expect(montado.elemento.querySelectorAll('.demanda-atividades__item--em-execucao').length).toBe(1);
        expect(montado.elemento.querySelector('app-atividade-em-execucao')).not.toBeNull();
        expect(montado.elemento.textContent).toContain('1 em execução');
    });

    it('filtros: "Em aberto" esconde as desenvolvidas e um filtro vazio explica', async () => {
        const montado = await montar([atividade(1, { status: TipoAtividadeStatusEnum.DESENVOLVIDA }), atividade(2)]);
        montado.componente.filtro.set('abertas');
        await montado.atualizar();
        expect(montado.elemento.querySelectorAll('.demanda-atividades__item').length).toBe(1);
        montado.componente.filtro.set('minhas');
        await montado.atualizar();
        expect(montado.elemento.textContent).toContain('Nenhuma atividade neste filtro');
    });
});
