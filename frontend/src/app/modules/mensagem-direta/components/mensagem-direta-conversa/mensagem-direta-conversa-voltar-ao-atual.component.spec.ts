import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { AutorMensagemDiretaEnum, TipoUsuarioEnum } from '@project20/shared';
import { montarComponente, ComponenteMontado } from '../../../../../testes/montar-componente';
import { MensagemDiretaEstadoService } from '../../services/mensagem-direta-estado.service';
import { MensagemDiretaEventosService } from '../../services/mensagem-direta-eventos.service';
import { MensagemNaConversa } from '../../utils/mensagem-direta.util';
import { MensagemDiretaConversaComponent } from './mensagem-direta-conversa.component';

// A setinha "voltar ao atual" (pedido do autor em 2026-11-06): aparece quando a pessoa sobe na conversa e a leva de volta à mensagem mais recente.
// O jsdom não calcula layout: a altura e a posição da rolagem são fixadas à mão no elemento.

class EventosFalso {
    readonly conectado = signal(true);
    iniciar(): void {}
    parar(): void {}
}

const mensagem = (mensagemId: string, texto: string): MensagemNaConversa => ({
    mensagemId, conversaId: '1-9', autor: AutorMensagemDiretaEnum.USUARIO, autorUsuarioId: 9, texto, contemCodigo: false, mencoes: [], referencias: [],
    respondeA: null, editadaDate: null, reacoes: [], createdDate: new Date('2026-10-26T14:00:00'), situacao: 'ENVIADA',
});

describe('MensagemDiretaConversaComponent — voltar ao atual', () => {
    let tela: ComponenteMontado<MensagemDiretaConversaComponent>;
    let estado: MensagemDiretaEstadoService;

    const redesenhar = async () => {
        await vi.advanceTimersByTimeAsync(0);
        await tela.atualizar();
    };
    const area = () => tela.elemento.querySelector<HTMLElement>('.conversa-direta__mensagens')!;
    const seta = () => tela.elemento.querySelector<HTMLButtonElement>('.conversa-direta__voltar-ao-atual');
    /** Fixa o tamanho do conteúdo e onde a rolagem está, e dispara o evento de rolar. */
    async function rolarPara(topo: number, altura = 1000, visivel = 400) {
        Object.defineProperty(area(), 'scrollHeight', { configurable: true, value: altura });
        Object.defineProperty(area(), 'clientHeight', { configurable: true, value: visivel });
        area().scrollTop = topo;
        area().dispatchEvent(new Event('scroll'));
        await redesenhar();
    }

    beforeEach(async () => {
        vi.useFakeTimers({ toFake: ['setTimeout', 'clearTimeout', 'Date'] });
        tela = await montarComponente(MensagemDiretaConversaComponent, {
            usuario: TipoUsuarioEnum.DESENVOLVEDOR,
            provedores: [{ provide: MensagemDiretaEventosService, useClass: EventosFalso }],
        });
        estado = TestBed.inject(MensagemDiretaEstadoService);
        estado.conversaAberta.set({
            usuarioId: 9, usuarioNome: 'Camila Duarte', conversaId: '1-9', mensagens: [mensagem('a', 'primeira'), mensagem('b', 'segunda')],
            lidaPeloOutroAte: null, proximoCursor: null, carregando: false, carregandoMais: false, erro: false,
        });
        await redesenhar();
    });

    afterEach(() => {
        vi.useRealTimers();
    });

    it('não aparece quando a pessoa está no fim da conversa', async () => {
        await rolarPara(600); // 1000 − 600 − 400 = 0 abaixo
        expect(seta()).toBeNull();
    });

    it('aparece quando ela sobe e some ao voltar para perto do fim', async () => {
        await rolarPara(100); // 500 px abaixo
        expect(seta()).not.toBeNull();
        expect(seta()!.getAttribute('aria-label')).toBe('Voltar para as mensagens mais recentes');
        await rolarPara(500); // 100 px abaixo: ainda dentro da margem
        expect(seta()).toBeNull();
    });

    it('clicar leva ao fim da conversa e esconde a setinha', async () => {
        await rolarPara(100);
        const rolar = vi.fn();
        area().scrollTo = rolar as never;
        seta()!.click();
        expect(rolar).toHaveBeenCalledWith({ top: 1000, behavior: 'smooth' });
        await rolarPara(600);
        expect(seta()).toBeNull();
    });

    it('ao trocar de conversa a setinha some', async () => {
        await rolarPara(100);
        expect(seta()).not.toBeNull();
        estado.conversaAberta.update((aberta) => ({ ...aberta!, usuarioId: 15, usuarioNome: 'Rafael Moura', conversaId: '1-15' }));
        await redesenhar();
        expect(seta()).toBeNull();
    });
});
