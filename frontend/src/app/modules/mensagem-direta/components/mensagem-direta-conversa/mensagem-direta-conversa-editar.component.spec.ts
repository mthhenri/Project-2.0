import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { AutorMensagemDiretaEnum, MensagemDiretaResumoDto, TipoUsuarioEnum } from '@project20/shared';
import { montarComponente, ComponenteMontado } from '../../../../../testes/montar-componente';
import { esperarRequisicao, responderErro, responderSucesso } from '../../../../../testes/http-teste';
import { digitarNaMensagem, esperarCampoDeMensagem, teclarNaMensagem, textoDaMensagem } from '../../../../../testes/campo-mensagem';
import { MensagemDiretaEstadoService } from '../../services/mensagem-direta-estado.service';
import { MensagemDiretaEventosService } from '../../services/mensagem-direta-eventos.service';
import { MensagemNaConversa } from '../../utils/mensagem-direta.util';
import { MensagemDiretaConversaComponent } from './mensagem-direta-conversa.component';

// Editar a mensagem (task 313): "Editar" no menu só na mensagem própria e dentro de 1 hora, a barra "Editando mensagem", salvar pelo PATCH, o rótulo "editada",
// a recusa do servidor (o texto digitado fica) e o evento `EDICAO` de outra aba ou da outra pessoa. O usuário de teste tem id 1; a outra pessoa é a 9 (Camila).

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

const resumo = (m: MensagemNaConversa): MensagemDiretaResumoDto => ({ ...m, createdDate: m.createdDate, editadaDate: m.editadaDate });

describe('MensagemDiretaConversaComponent — editar', () => {
    let tela: ComponenteMontado<MensagemDiretaConversaComponent>;
    let estado: MensagemDiretaEstadoService;

    const redesenhar = async () => {
        await vi.advanceTimersByTimeAsync(0);
        await tela.atualizar();
    };
    const botoesDeAcoes = () => Array.from(tela.elemento.querySelectorAll<HTMLButtonElement>('[aria-label="Ações da mensagem"]'));
    const itensDoMenu = () => Array.from(document.querySelectorAll<HTMLElement>('.p-contextmenu-item-link')).map((item) => item.textContent?.trim());
    const abrirMenuDaMensagem = async (indice: number) => {
        botoesDeAcoes()[indice].click();
        await redesenhar();
    };
    const editarPeloMenu = async (indice = 0) => {
        await abrirMenuDaMensagem(indice);
        const editar = Array.from(document.querySelectorAll<HTMLElement>('.p-contextmenu-item-link')).find((item) => item.textContent?.includes('Editar'));
        expect(editar).toBeDefined();
        editar!.click();
        await redesenhar();
    };
    const barra = () => tela.elemento.querySelector('.compositor-direto__resposta[aria-label="Edição em preparo"]');
    const salvar = async () => {
        tela.elemento.querySelector<HTMLButtonElement>('.compositor-direto__enviar')!.click();
        await redesenhar();
    };
    const abrirComMensagens = async (mensagens: MensagemNaConversa[]) => {
        estado.conversaAberta.set({
            usuarioId: 9, usuarioNome: 'Camila Duarte', conversaId: '1-9', mensagens, lidaPeloOutroAte: null, proximoCursor: null,
            carregando: false, carregandoMais: false, erro: false,
        });
        await redesenhar();
    };

    beforeEach(async () => {
        vi.useFakeTimers({ toFake: ['setTimeout', 'clearTimeout', 'Date'] });
        vi.setSystemTime(new Date(ENVIADA_EM.getTime() + 30 * 60_000));
        tela = await montarComponente(MensagemDiretaConversaComponent, {
            usuario: TipoUsuarioEnum.DESENVOLVEDOR,
            provedores: [{ provide: MensagemDiretaEventosService, useClass: EventosFalso }],
        });
        estado = TestBed.inject(MensagemDiretaEstadoService);
        await abrirComMensagens([mensagem(DA_CAMILA_ID, 9, 'Mensagem da Camila'), mensagem(MINHA_ID, 1, 'Texto **original**')]);
    });

    afterEach(() => {
        vi.useRealTimers();
    });

    it('oferece Editar só na mensagem própria; a da outra pessoa não tem a opção', async () => {
        await abrirMenuDaMensagem(0); // a da Camila
        expect(itensDoMenu()).toEqual(['Responder', 'Reagir', 'Copiar texto']);
        document.body.click();
        await redesenhar();
        await abrirMenuDaMensagem(1); // a minha
        expect(itensDoMenu()).toEqual(['Responder', 'Reagir', 'Editar', 'Copiar texto']);
    });

    it('depois de 1 hora do envio a opção some; no limite ainda aparece', async () => {
        vi.setSystemTime(new Date(ENVIADA_EM.getTime() + 60 * 60_000));
        await abrirComMensagens([mensagem(MINHA_ID, 1, 'Texto')]);
        await abrirMenuDaMensagem(0);
        expect(itensDoMenu()).toContain('Editar');
        document.body.click();
        await redesenhar();

        vi.setSystemTime(new Date(ENVIADA_EM.getTime() + 60 * 60_000 + 1));
        await abrirComMensagens([mensagem(MINHA_ID, 1, 'Texto')]);
        await abrirMenuDaMensagem(0);
        expect(itensDoMenu()).not.toContain('Editar');
        estado.editar(mensagem(MINHA_ID, 1, 'Texto'));
        expect(estado.editando(), 'o estado também recusa fora do prazo').toBeNull();
    });

    it('Editar abre a barra "Editando mensagem" com o trecho e põe o texto no campo; o X cancela e esvazia o campo', async () => {
        await esperarCampoDeMensagem(tela.fixture, redesenhar);
        await editarPeloMenu(1);

        expect(barra()?.textContent).toContain('Editando mensagem');
        expect(barra()?.textContent).toContain('Texto original');
        expect(textoDaMensagem(tela.fixture)).toContain('Texto **original**');
        expect(tela.elemento.querySelector('.compositor-direto__enviar')?.getAttribute('aria-label')).toBe('Salvar edição');

        tela.elemento.querySelector<HTMLButtonElement>('.compositor-direto__resposta button')!.click();
        await redesenhar();
        expect(barra()).toBeNull();
        expect(estado.editando()).toBeNull();
        expect(textoDaMensagem(tela.fixture)).toBe('');
    });

    it('Esc no campo cancela a edição e não deixa o evento seguir para o popup', async () => {
        await esperarCampoDeMensagem(tela.fixture, redesenhar);
        await editarPeloMenu(1);
        const evento = teclarNaMensagem(tela.fixture, 'Escape');
        await redesenhar();
        expect(evento.defaultPrevented).toBe(true);
        expect(barra()).toBeNull();
        expect(estado.editando()).toBeNull();
    });

    it('salvar manda PATCH com o texto novo (e não uma mensagem nova), troca o balão, mostra "editada" e esvazia o campo', async () => {
        await esperarCampoDeMensagem(tela.fixture, redesenhar);
        await editarPeloMenu(1);
        digitarNaMensagem(tela.fixture, 'Texto corrigido');
        await redesenhar();
        await salvar();

        const requisicao = esperarRequisicao(tela.http, 'PATCH', '/mensagem-direta/mensagem');
        expect(requisicao.request.body).toMatchObject({ destinatarioId: 9, mensagemId: MINHA_ID, texto: 'Texto corrigido' });
        expect(requisicao.request.body.respondeAMensagemId).toBeUndefined();
        responderSucesso(requisicao, { mensagem: resumo(mensagem(MINHA_ID, 1, 'Texto corrigido', { editadaDate: new Date(ENVIADA_EM.getTime() + 31 * 60_000) })) });
        await redesenhar();

        expect(barra()).toBeNull();
        expect(textoDaMensagem(tela.fixture)).toBe('');
        const texto = tela.elemento.textContent ?? '';
        expect(texto).toContain('Texto corrigido');
        expect(texto).not.toContain('Texto original');
        expect(tela.elemento.querySelectorAll('.conversa-direta__editada').length).toBe(1);
        expect(tela.elemento.querySelector('.conversa-direta__editada')?.getAttribute('title')).toMatch(/^Editada às \d{2}:\d{2}$/);
        expect(estado.conversaAberta()!.mensagens.length, 'editar não cria mensagem').toBe(2);
    });

    it('salvar sem mudar o texto só fecha a edição, sem chamar o servidor', async () => {
        await esperarCampoDeMensagem(tela.fixture, redesenhar);
        await editarPeloMenu(1);
        await salvar();
        tela.http.expectNone((requisicao) => requisicao.method === 'PATCH');
        expect(barra()).toBeNull();
        expect(estado.editando()).toBeNull();
    });

    it('se o servidor recusa (prazo vencido), a edição continua aberta com o motivo e o texto digitado fica', async () => {
        await esperarCampoDeMensagem(tela.fixture, redesenhar);
        await editarPeloMenu(1);
        digitarNaMensagem(tela.fixture, 'Texto corrigido');
        await redesenhar();
        await salvar();
        responderErro(esperarRequisicao(tela.http, 'PATCH', '/mensagem-direta/mensagem'), 400, 'O prazo de 1 hora para editar a mensagem acabou');
        await redesenhar();

        expect(barra()?.textContent).toContain('O prazo de 1 hora para editar a mensagem acabou');
        expect(barra()?.querySelector('[role="alert"]')).not.toBeNull();
        expect(textoDaMensagem(tela.fixture)).toBe('Texto corrigido');
        expect(estado.editando()?.mensagemId).toBe(MINHA_ID);
        expect(tela.elemento.textContent).toContain('Texto original');
        expect(estado.salvandoEdicao()).toBe(false);
    });

    it('abrir outra conversa descarta a edição', async () => {
        await editarPeloMenu(1);
        expect(estado.editando()).not.toBeNull();
        estado.voltarParaALista();
        expect(estado.editando()).toBeNull();
        expect(estado.erroNaEdicao()).toBeNull();
    });

    it('o evento EDICAO troca o texto na conversa, mostra "editada", não conta não lida nem muda a ordem', async () => {
        estado.conversas.set([
            { conversaId: '1-9', usuarioId: 9, usuarioNome: 'Camila Duarte', corAvatar: null, naoLidas: 0, silenciada: false, online: false, ultimaMensagem: { ...resumo(mensagem(DA_CAMILA_ID, 9, 'Mensagem da Camila')), createdDate: ENVIADA_EM } },
            { conversaId: '1-12', usuarioId: 12, usuarioNome: 'Outro', corAvatar: null, naoLidas: 0, silenciada: false, online: false, ultimaMensagem: null },
        ]);
        estado.aplicarEvento({ tipo: 'EDICAO', mensagem: resumo(mensagem(DA_CAMILA_ID, 9, 'Camila corrigiu', { editadaDate: new Date(ENVIADA_EM.getTime() + 20 * 60_000) })) });
        await redesenhar();

        expect(tela.elemento.textContent).toContain('Camila corrigiu');
        expect(tela.elemento.textContent).not.toContain('Mensagem da Camila');
        expect(tela.elemento.querySelectorAll('.conversa-direta__editada').length).toBe(1);
        expect(estado.conversas().map((conversa) => conversa.conversaId), 'a ordem da lista não muda').toEqual(['1-9', '1-12']);
        expect(estado.conversas()[0].naoLidas).toBe(0);
        expect(estado.conversas()[0].ultimaMensagem?.texto, 'a prévia da lista acompanha').toBe('Camila corrigiu');
        expect(estado.conversas()[0].ultimaMensagem?.editadaDate).toBeInstanceOf(Date);
    });

    it('a mensagem editada em outra aba minha encerra a edição em curso daqui', async () => {
        await editarPeloMenu(1);
        estado.aplicarEvento({ tipo: 'EDICAO', mensagem: resumo(mensagem(MINHA_ID, 1, 'Editei na outra aba', { editadaDate: new Date(ENVIADA_EM.getTime() + 31 * 60_000) })) });
        await redesenhar();
        expect(estado.editando()).toBeNull();
        expect(tela.elemento.textContent).toContain('Editei na outra aba');
    });
});
