import { afterEach, describe, it, expect, vi } from 'vitest';
import { CheckinSituacaoConsultadaDto, TipoUsuarioEnum } from '@project20/shared';
import { montarComponente, ComponenteMontado } from '../../../../../testes/montar-componente';
import { esperarRequisicao, responderErro, responderSucesso } from '../../../../../testes/http-teste';
import { ExecucaoAtivaService } from '../../../../core/services/execucao-ativa.service';
import { CheckinProximoComponent } from './checkin-proximo.component';

// Próximo check-in no menu do perfil (task 303): consulta a situação ao nascer e a contagem anda com o relógio.

type Montado = ComponenteMontado<CheckinProximoComponent>;

const AGORA = new Date('2026-11-03T12:00:00.000Z');

function situacao(proximoCheckinData: Date | null): CheckinSituacaoConsultadaDto {
    return {
        haCheckin: true,
        execucao: { id: 9, atividade: 'Montar o formulário', demanda: 'Tela', projeto: 'Portal', descricao: 'x', inicio: AGORA, minutos: 10 },
        suspensao: { suspenso: false, desde: null, motivo: null },
        checkinMinimoMinutos: 30,
        checkinMaximoMinutos: 80,
        duracaoRecomendadaMinutos: 90,
        rigorProporcional: true,
        acimaDoRecomendado: false,
        proximoCheckinData,
        disparado: false,
    };
}

async function montar(): Promise<Montado> {
    vi.useFakeTimers({ toFake: ['setInterval', 'clearInterval', 'Date'] });
    vi.setSystemTime(AGORA);
    return montarComponente(CheckinProximoComponent, { usuario: TipoUsuarioEnum.DESENVOLVEDOR });
}

const texto = (montado: Montado) => montado.elemento.querySelector('[role="timer"]')?.textContent?.trim();

afterEach(() => vi.useRealTimers());

describe('CheckinProximoComponent', () => {
    it('consulta a situação ao nascer e mostra "consultando" até a resposta', async () => {
        const montado = await montar();
        expect(texto(montado)).toBe('Próximo check-in: consultando…');
        responderSucesso(esperarRequisicao(montado.http, 'GET', '/checkin/situacao'), situacao(new Date(AGORA.getTime() + 10 * 60_000)));
        await montado.atualizar();
        expect(texto(montado)).toBe('Próximo check-in em 10:00');
    });

    it('a contagem anda a cada segundo', async () => {
        const montado = await montar();
        responderSucesso(esperarRequisicao(montado.http, 'GET', '/checkin/situacao'), situacao(new Date(AGORA.getTime() + 10 * 60_000)));
        await montado.atualizar();
        vi.advanceTimersByTime(65_000);
        await montado.atualizar();
        expect(texto(montado)).toBe('Próximo check-in em 08:55');
    });

    it('falha na consulta mostra "indisponível"', async () => {
        const montado = await montar();
        responderErro(esperarRequisicao(montado.http, 'GET', '/checkin/situacao'), 500, 'Falha de teste');
        await montado.atualizar();
        expect(texto(montado)).toBe('Próximo check-in: indisponível');
    });

    it('refaz a consulta quando a execução ativa muda, sem precisar recarregar a página', async () => {
        const montado = await montar();
        responderSucesso(esperarRequisicao(montado.http, 'GET', '/checkin/situacao'), { ...situacao(null), haCheckin: false, execucao: null });
        await montado.atualizar();
        expect(texto(montado)).toBe('Sem check-in: nenhuma execução em andamento');

        montado.fixture.debugElement.injector.get(ExecucaoAtivaService).definir({ id: 9, atividadeId: 1, descricao: 'x', inicioData: AGORA });
        await montado.atualizar();
        responderSucesso(esperarRequisicao(montado.http, 'GET', '/checkin/situacao'), situacao(new Date(AGORA.getTime() + 10 * 60_000)));
        await montado.atualizar();
        expect(texto(montado)).toBe('Próximo check-in em 10:00');
    });

    it('não refaz a consulta quando a execução ativa que chegou já é a da situação conhecida (P-079)', async () => {
        const montado = await montar();
        responderSucesso(esperarRequisicao(montado.http, 'GET', '/checkin/situacao'), situacao(new Date(AGORA.getTime() + 10 * 60_000)));
        await montado.atualizar();

        // `/execucao/ativa` responde depois da situação: a execução 9 já é a da situação, nada a conferir.
        montado.fixture.debugElement.injector.get(ExecucaoAtivaService).definir({ id: 9, atividadeId: 1, descricao: 'x', inicioData: AGORA });
        await montado.atualizar();
        montado.http.expectNone((requisicao) => requisicao.url.includes('/checkin/situacao'));
        expect(texto(montado)).toBe('Próximo check-in em 10:00');
    });
});
