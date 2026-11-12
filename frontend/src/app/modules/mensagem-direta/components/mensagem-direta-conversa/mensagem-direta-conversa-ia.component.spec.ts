import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { AutorMensagemDiretaEnum, EstadoIaEnum, PRAZO_DO_PEDIDO_DA_IA_MINUTOS, TipoUsuarioEnum, VALIDADE_DO_IA_DIGITANDO_MS } from '@project20/shared';
import { montarComponente, ComponenteMontado } from '../../../../../testes/montar-componente';
import { IaDisponibilidadeService } from '../../../../core/services/ia-disponibilidade.service';
import { MensagemDiretaEstadoService } from '../../services/mensagem-direta-estado.service';
import { MensagemDiretaEventosService } from '../../services/mensagem-direta-eventos.service';
import { MensagemNaConversa } from '../../utils/mensagem-direta.util';
import { MensagemDiretaConversaComponent } from './mensagem-direta-conversa.component';

// O `@IA` na conversa (task 315): a resposta da IA no lugar do balão de pessoa, o "IA digitando…" que as duas pontas veem e a dica de quando a IA espera
// o pedido na próxima mensagem. O usuário de teste tem id 1; a outra pessoa é a 9 (Camila).

class EventosFalso {
    readonly conectado = signal(true);
    iniciar(): void {}
    parar(): void {}
}

const mensagem = (parcial: Partial<MensagemNaConversa>): MensagemNaConversa => ({
    mensagemId: 'm-1', conversaId: '1-9', autor: AutorMensagemDiretaEnum.USUARIO, autorUsuarioId: 1, texto: 'oi', contemCodigo: false, mencoes: [], referencias: [],
    respondeA: null, editadaDate: null, reacoes: [], chamadaPorUsuarioId: null, propostaIds: [], createdDate: new Date(), situacao: 'ENVIADA', ...parcial,
});

describe('MensagemDiretaConversaComponent — @IA', () => {
    let tela: ComponenteMontado<MensagemDiretaConversaComponent>;
    let estado: MensagemDiretaEstadoService;

    const redesenhar = async () => {
        await vi.advanceTimersByTimeAsync(0);
        await tela.atualizar();
    };
    const abrir = async (mensagens: MensagemNaConversa[]) => {
        estado.conversaAberta.set({
            usuarioId: 9, usuarioNome: 'Camila Duarte', conversaId: '1-9', mensagens, lidaPeloOutroAte: null, proximoCursor: null, carregando: false, carregandoMais: false, erro: false,
        });
        await redesenhar();
    };
    const iaDigitando = () => tela.elemento.querySelector('[aria-label="IA digitando"]');

    beforeEach(async () => {
        vi.useFakeTimers({ toFake: ['setTimeout', 'clearTimeout', 'Date'] });
        tela = await montarComponente(MensagemDiretaConversaComponent, {
            usuario: TipoUsuarioEnum.DESENVOLVEDOR,
            provedores: [{ provide: MensagemDiretaEventosService, useClass: EventosFalso }],
        });
        estado = TestBed.inject(MensagemDiretaEstadoService);
    });

    afterEach(() => {
        vi.useRealTimers();
    });

    it('a resposta da IA aparece com o selo e para quem ela respondeu, sem as ações de mensagem de pessoa', async () => {
        await abrir([
            mensagem({ mensagemId: 'p-1', texto: '@IA lista as minhas atividades' }),
            mensagem({ mensagemId: 'ia-1', autor: AutorMensagemDiretaEnum.IA, autorUsuarioId: null, texto: 'Você tem **3** atividades.', chamadaPorUsuarioId: 1 }),
        ]);
        const resposta = tela.elemento.querySelector('app-mensagem-direta-ia-resposta');
        expect(resposta).not.toBeNull();
        expect(resposta!.textContent).toContain('IA · para você');
        expect(resposta!.textContent).toContain('3 atividades');
        expect(resposta!.querySelector('[aria-label="Ações da mensagem"]')).toBeNull();
        expect(tela.elemento.querySelectorAll('.conversa-direta__balao').length).toBe(1);
    });

    it('o @IA da mensagem de pessoa aparece como a menção, com o ícone da IA antes; em código, não', async () => {
        await abrir([
            mensagem({ mensagemId: 'p-1', texto: '@ia lista as minhas atividades' }),
            mensagem({ mensagemId: 'p-2', texto: 'olha o `@IA` no código' }),
        ]);
        const chips = Array.from(tela.elemento.querySelectorAll('.markdown__destaque'));
        expect(chips.map((chip) => chip.textContent)).toEqual(['@ia']);
        expect(chips[0].querySelector('i.pi-sparkles')).not.toBeNull();
    });

    it('a resposta à outra pessoa mostra o nome dela', async () => {
        await abrir([mensagem({ mensagemId: 'ia-1', autor: AutorMensagemDiretaEnum.IA, autorUsuarioId: null, texto: 'Pronto.', chamadaPorUsuarioId: 9 })]);
        expect(tela.elemento.querySelector('app-mensagem-direta-ia-resposta')!.textContent).toContain('IA · para Camila Duarte');
    });

    it('IA_DIGITANDO mostra "IA digitando" no fim da conversa até a resposta chegar', async () => {
        await abrir([mensagem({ texto: '@IA resume' })]);
        expect(iaDigitando()).toBeNull();
        estado.aplicarEvento({ tipo: 'IA_DIGITANDO', conversaId: '1-9' });
        await redesenhar();
        expect(iaDigitando()?.textContent).toContain('IA digitando');

        estado.aplicarEvento({
            tipo: 'MENSAGEM',
            mensagem: { ...mensagem({ mensagemId: 'ia-1', autor: AutorMensagemDiretaEnum.IA, autorUsuarioId: null, texto: 'Resumo.', chamadaPorUsuarioId: 1 }), createdDate: new Date().toISOString() as never },
        });
        await redesenhar();
        expect(iaDigitando()).toBeNull();
    });

    it('o aviso do sistema (a IA não pôde responder) também apaga o "IA digitando", e sem nada ele some sozinho', async () => {
        await abrir([mensagem({ texto: '@IA resume' })]);
        estado.aplicarEvento({ tipo: 'IA_DIGITANDO', conversaId: '1-9' });
        await redesenhar();
        estado.aplicarEvento({
            tipo: 'MENSAGEM',
            mensagem: { ...mensagem({ mensagemId: 's-1', autor: AutorMensagemDiretaEnum.SISTEMA, autorUsuarioId: null, texto: 'A IA não pôde responder: a IA está desligada.' }), createdDate: new Date().toISOString() as never },
        });
        await redesenhar();
        expect(iaDigitando()).toBeNull();

        estado.aplicarEvento({ tipo: 'IA_DIGITANDO', conversaId: '1-9' });
        await redesenhar();
        await vi.advanceTimersByTimeAsync(VALIDADE_DO_IA_DIGITANDO_MS);
        await tela.atualizar();
        expect(iaDigitando()).toBeNull();
    });

    it('o "IA digitando" de outra conversa não aparece nesta', async () => {
        await abrir([]);
        estado.aplicarEvento({ tipo: 'IA_DIGITANDO', conversaId: '1-15' });
        await redesenhar();
        expect(iaDigitando()).toBeNull();
    });

    it('depois de um @IA sozinho, a conversa avisa que a próxima mensagem vai para a IA', async () => {
        const dica = () => tela.elemento.textContent?.includes('A IA está esperando o seu pedido') ?? false;
        await abrir([mensagem({ texto: '@IA', createdDate: new Date(Date.now() - 60_000) })]);
        expect(dica()).toBe(true);

        await abrir([mensagem({ texto: '@IA', createdDate: new Date(Date.now() - (PRAZO_DO_PEDIDO_DA_IA_MINUTOS + 1) * 60_000) })]);
        expect(dica()).toBe(false);

        await abrir([mensagem({ texto: '@IA', autorUsuarioId: 9, createdDate: new Date() })]);
        expect(dica()).toBe(false);
    });

    it('o @IA sozinho recém-enviado mostra a dica na hora, mesmo com o relógio da dica atrasado e a data do servidor à frente (P-088)', async () => {
        await abrir([mensagem({ mensagemId: 'm-0', texto: 'oi', autorUsuarioId: 9 })]);
        vi.setSystemTime(new Date(Date.now() + 45 * 60_000));
        await abrir([mensagem({ mensagemId: 'm-0', texto: 'oi', autorUsuarioId: 9 }), mensagem({ mensagemId: 'm-1', texto: '@IA', createdDate: new Date(Date.now() + 50) })]);
        expect(tela.elemento.textContent).toContain('A IA está esperando o seu pedido');
    });

    it('com a IA no ar, o @ do compositor oferece a IA', async () => {
        TestBed.inject(IaDisponibilidadeService).estadoReal.set(EstadoIaEnum.NO_AR);
        await abrir([]);
        const compositor = tela.fixture.debugElement.query((no) => no.name === 'app-mensagem-direta-compositor');
        expect(compositor.componentInstance.iaDisponivel()).toBe(true);

        TestBed.inject(IaDisponibilidadeService).estadoReal.set(EstadoIaEnum.DESLIGADA);
        await redesenhar();
        expect(compositor.componentInstance.iaDisponivel()).toBe(false);
    });
});
