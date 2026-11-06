import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { AutorMensagemDiretaEnum, TipoUsuarioEnum } from '@project20/shared';
import { montarComponente, ComponenteMontado } from '../../../../../testes/montar-componente';
import { esperarRequisicao, responderErro, responderSucesso } from '../../../../../testes/http-teste';
import { MensagemDiretaAvisosService } from '../../services/mensagem-direta-avisos.service';
import { MensagemDiretaEstadoService } from '../../services/mensagem-direta-estado.service';
import { MensagemDiretaEventosService } from '../../services/mensagem-direta-eventos.service';
import { MensagemNaConversa } from '../../utils/mensagem-direta.util';
import { MensagemDiretaConversaComponent } from './mensagem-direta-conversa.component';

// Reações (task 314): "Reagir" no menu e no botão da mensagem, a faixa com os seis atalhos e o "+", as pílulas sob o balão, o PUT, o evento `REACAO`
// (tempo real) e o aviso só ao autor. O usuário de teste tem id 1; a outra pessoa é a 9 (Camila).

class EventosFalso {
    readonly conectado = signal(true);
    iniciar(): void {}
    parar(): void {}
}

const ENVIADA_EM = new Date('2026-10-26T14:00:00');
const MINHA_ID = '11111111-2222-4333-8444-555555555555';
const DA_CAMILA_ID = '99999999-2222-4333-8444-555555555555';

function mensagem(mensagemId: string, autorUsuarioId: number, texto: string, parcial: Partial<MensagemNaConversa> = {}): MensagemNaConversa {
    return {
        mensagemId, conversaId: '1-9', autor: AutorMensagemDiretaEnum.USUARIO, autorUsuarioId, texto, contemCodigo: false, mencoes: [], referencias: [],
        respondeA: null, editadaDate: null, reacoes: [], createdDate: ENVIADA_EM, situacao: 'ENVIADA', ...parcial,
    };
}

describe('MensagemDiretaConversaComponent — reações', () => {
    let tela: ComponenteMontado<MensagemDiretaConversaComponent>;
    let estado: MensagemDiretaEstadoService;

    const redesenhar = async () => {
        await vi.advanceTimersByTimeAsync(0);
        await tela.atualizar();
    };
    const botoesDeReagir = () => Array.from(tela.elemento.querySelectorAll<HTMLButtonElement>('button[aria-label="Reagir"]'));
    const faixa = () => tela.elemento.querySelector('[aria-label="Escolher reação"]');
    const pilulas = () => Array.from(tela.elemento.querySelectorAll<HTMLButtonElement>('.reacoes__pilula'));
    const abrirComMensagens = async (mensagens: MensagemNaConversa[]) => {
        estado.conversaAberta.set({
            usuarioId: 9, usuarioNome: 'Camila Duarte', conversaId: '1-9', mensagens, lidaPeloOutroAte: null, proximoCursor: null,
            carregando: false, carregandoMais: false, erro: false,
        });
        await redesenhar();
    };
    const evento = (reatorUsuarioId: number, autorUsuarioId: number, reacao: string | null, reacoes: { usuarioId: number; reacao: string }[], mensagemId = MINHA_ID) =>
        ({ tipo: 'REACAO', conversaId: '1-9', mensagemId, reacoes, reatorUsuarioId, autorUsuarioId, reacao }) as const;

    beforeEach(async () => {
        vi.useFakeTimers({ toFake: ['setTimeout', 'clearTimeout', 'Date'] });
        vi.setSystemTime(new Date(ENVIADA_EM.getTime() + 30 * 60_000));
        tela = await montarComponente(MensagemDiretaConversaComponent, {
            usuario: TipoUsuarioEnum.DESENVOLVEDOR,
            provedores: [{ provide: MensagemDiretaEventosService, useClass: EventosFalso }],
        });
        estado = TestBed.inject(MensagemDiretaEstadoService);
        await abrirComMensagens([mensagem(DA_CAMILA_ID, 9, 'Mensagem da Camila'), mensagem(MINHA_ID, 1, 'Minha mensagem')]);
    });

    afterEach(() => {
        vi.useRealTimers();
    });

    it('o botão Reagir abre a faixa com os seis atalhos e o "+"; clicar de novo fecha; Esc fecha sem chegar ao popup', async () => {
        expect(faixa()).toBeNull();
        botoesDeReagir()[0].click();
        await redesenhar();
        const atalhos = Array.from(faixa()!.querySelectorAll<HTMLButtonElement>('.reacoes__atalho')).map((botao) => botao.textContent?.trim());
        expect(atalhos).toEqual(['👍', '❤️', '😂', '😮', '😢', '🙏']);
        expect(faixa()!.querySelector('button[aria-label="Mais emojis"]')).not.toBeNull();

        botoesDeReagir()[0].click();
        await redesenhar();
        expect(faixa()).toBeNull();

        botoesDeReagir()[0].click();
        await redesenhar();
        const esc = new KeyboardEvent('keydown', { key: 'Escape', bubbles: true, cancelable: true });
        faixa()!.dispatchEvent(esc);
        await redesenhar();
        expect(faixa()).toBeNull();
    });

    it('o menu da mensagem também tem "Reagir"', async () => {
        tela.elemento.querySelectorAll<HTMLButtonElement>('[aria-label="Ações da mensagem"]')[0].click();
        await redesenhar();
        const reagir = Array.from(document.querySelectorAll<HTMLElement>('.p-contextmenu-item-link')).find((item) => item.textContent?.includes('Reagir'));
        expect(reagir).toBeDefined();
        reagir!.click();
        await redesenhar();
        expect(faixa()).not.toBeNull();
    });

    it('escolher um atalho manda PUT com o emoji, fecha a faixa e mostra a pílula com a minha reação destacada', async () => {
        botoesDeReagir()[0].click();
        await redesenhar();
        faixa()!.querySelectorAll<HTMLButtonElement>('.reacoes__atalho')[1].click();
        await redesenhar();

        const requisicao = esperarRequisicao(tela.http, 'PUT', '/mensagem-direta/reacao');
        expect(requisicao.request.body).toEqual({ destinatarioId: 9, mensagemId: DA_CAMILA_ID, reacao: '❤️' });
        responderSucesso(requisicao, { mensagemId: DA_CAMILA_ID, reacoes: [{ usuarioId: 1, reacao: '❤️' }] });
        await redesenhar();

        expect(faixa()).toBeNull();
        expect(pilulas().map((pilula) => pilula.textContent?.trim())).toEqual(['❤️']);
        expect(pilulas()[0].classList.contains('reacoes__pilula--minha')).toBe(true);
        expect(pilulas()[0].getAttribute('aria-pressed')).toBe('true');
    });

    it('clicar na pílula da minha reação manda o mesmo emoji (o servidor tira); a da outra pessoa mostra o nome e o total', async () => {
        await abrirComMensagens([
            mensagem(MINHA_ID, 1, 'Minha mensagem', { reacoes: [{ usuarioId: 9, reacao: '👍' }, { usuarioId: 1, reacao: '👍' }, { usuarioId: 9, reacao: '🎉' }] }),
        ]);
        expect(pilulas().map((pilula) => pilula.textContent?.replace(/\s+/g, ' ').trim())).toEqual(['👍2', '🎉']);
        expect(pilulas()[0].getAttribute('aria-label')).toContain('Você e Camila Duarte');
        expect(pilulas()[1].classList.contains('reacoes__pilula--minha')).toBe(false);

        pilulas()[0].click();
        await redesenhar();
        const requisicao = esperarRequisicao(tela.http, 'PUT', '/mensagem-direta/reacao');
        expect(requisicao.request.body.reacao).toBe('👍');
        responderSucesso(requisicao, { mensagemId: MINHA_ID, reacoes: [{ usuarioId: 9, reacao: '👍' }, { usuarioId: 9, reacao: '🎉' }] });
        await redesenhar();
        expect(pilulas().map((pilula) => pilula.textContent?.replace(/\s+/g, ' ').trim())).toEqual(['👍', '🎉']);
        expect(tela.elemento.querySelector('.reacoes__pilula--minha')).toBeNull();
    });

    it('o "+" abre o seletor completo; escolher um emoji reage com ele (qualquer emoji) e fecha o seletor', async () => {
        botoesDeReagir()[1].click();
        await redesenhar();
        faixa()!.querySelector<HTMLButtonElement>('button[aria-label="Mais emojis"]')!.click();
        await redesenhar();
        expect(faixa()).toBeNull();
        expect(tela.elemento.querySelector('app-mensagem-direta-emoji-seletor')).not.toBeNull();

        tela.elemento.querySelector<HTMLButtonElement>('.emoji-seletor__emoji[aria-label="rosto festivo"]')!.click();
        await redesenhar();
        const requisicao = esperarRequisicao(tela.http, 'PUT', '/mensagem-direta/reacao');
        expect(requisicao.request.body).toEqual({ destinatarioId: 9, mensagemId: MINHA_ID, reacao: '🥳' });
        responderSucesso(requisicao, { mensagemId: MINHA_ID, reacoes: [{ usuarioId: 1, reacao: '🥳' }] });
        await redesenhar();
        expect(tela.elemento.querySelector('app-mensagem-direta-emoji-seletor')).toBeNull();
        expect(pilulas().map((pilula) => pilula.textContent?.trim())).toEqual(['🥳']);
    });

    it('se o servidor recusa, a faixa de erro aparece com o motivo e as pílulas ficam como estavam', async () => {
        botoesDeReagir()[0].click();
        await redesenhar();
        faixa()!.querySelector<HTMLButtonElement>('.reacoes__atalho')!.click();
        await redesenhar();
        responderErro(esperarRequisicao(tela.http, 'PUT', '/mensagem-direta/reacao'), 400, 'A mensagem do sistema não recebe reação');
        await redesenhar();
        expect(tela.elemento.querySelector('.conversa-direta__faixa[role="alert"]')?.textContent).toContain('A mensagem do sistema não recebe reação');
        expect(pilulas()).toEqual([]);
    });

    it('o evento REACAO atualiza as pílulas em tempo real, sem mexer na ordem nem no texto', async () => {
        estado.aplicarEvento(evento(9, 1, '😂', [{ usuarioId: 9, reacao: '😂' }]));
        await redesenhar();
        expect(pilulas().map((pilula) => pilula.textContent?.trim())).toEqual(['😂']);
        expect(estado.conversaAberta()!.mensagens.map((item) => item.mensagemId)).toEqual([DA_CAMILA_ID, MINHA_ID]);

        estado.aplicarEvento(evento(9, 1, null, []));
        await redesenhar();
        expect(pilulas()).toEqual([]);

        // De outra conversa (ou mensagem que não está na tela): ignorado.
        estado.aplicarEvento({ ...evento(12, 1, '👍', [{ usuarioId: 12, reacao: '👍' }]), conversaId: '1-12' });
        await redesenhar();
        expect(pilulas()).toEqual([]);
    });

    it('quem escreveu a mensagem recebe o aviso "reagiu à sua mensagem com 👍" (cartão, sem contar como mensagem nova)', async () => {
        const avisos = TestBed.inject(MensagemDiretaAvisosService);
        estado.aplicarEvento(evento(9, 1, '👍', [{ usuarioId: 9, reacao: '👍' }]));
        const [aviso] = avisos.avisos();
        expect(aviso.usuarioNome).toBe('Camila Duarte');
        expect(aviso.texto).toBe('reagiu à sua mensagem com 👍');
        expect(aviso.quantidade).toBe(0);
    });

    it('não avisa: a reação removida, a minha própria, a de mensagem que não é minha, nem com a conversa à vista', async () => {
        const avisos = TestBed.inject(MensagemDiretaAvisosService);
        estado.aplicarEvento(evento(9, 1, null, []));
        estado.aplicarEvento(evento(1, 1, '👍', [{ usuarioId: 1, reacao: '👍' }]));
        estado.aplicarEvento(evento(1, 9, '👍', [{ usuarioId: 1, reacao: '👍' }], DA_CAMILA_ID));
        expect(avisos.avisos()).toEqual([]);

        estado.aberto.set(true);
        estado.visao.set('CONVERSA');
        estado.aplicarEvento(evento(9, 1, '👍', [{ usuarioId: 9, reacao: '👍' }]));
        expect(avisos.avisos(), 'a pessoa já está olhando a conversa').toEqual([]);
    });

    it('trocar a reação avisa de novo, e uma mensagem nova depois conta como 1', async () => {
        const avisos = TestBed.inject(MensagemDiretaAvisosService);
        estado.aplicarEvento(evento(9, 1, '👍', [{ usuarioId: 9, reacao: '👍' }]));
        estado.aplicarEvento(evento(9, 1, '❤️', [{ usuarioId: 9, reacao: '❤️' }]));
        expect(avisos.avisos().length, 'um cartão por conversa').toBe(1);
        expect(avisos.avisos()[0].texto).toBe('reagiu à sua mensagem com ❤️');
    });

    it('abrir outra conversa fecha a faixa e o seletor', async () => {
        botoesDeReagir()[0].click();
        await redesenhar();
        expect(faixa()).not.toBeNull();
        await abrirComMensagens([mensagem(MINHA_ID, 1, 'Minha mensagem')]);
        estado.conversaAberta.update((atual) => ({ ...atual!, usuarioId: 12, usuarioNome: 'Outro', conversaId: '1-12' }));
        await redesenhar();
        expect(faixa()).toBeNull();
    });
});
