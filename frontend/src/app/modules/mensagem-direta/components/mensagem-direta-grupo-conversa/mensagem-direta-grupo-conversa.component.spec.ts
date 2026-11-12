import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { AutorMensagemDiretaEnum, EstadoIaEnum, MensagemDiretaResumoDto, TipoGrupoEnum, TipoUsuarioEnum } from '@project20/shared';
import { montarComponente, ComponenteMontado } from '../../../../../testes/montar-componente';
import { esperarRequisicao, responderErro, responderSucesso } from '../../../../../testes/http-teste';
import { digitarNaMensagem, esperarCampoDeMensagem } from '../../../../../testes/campo-mensagem';
import { IaDisponibilidadeService } from '../../../../core/services/ia-disponibilidade.service';
import { MensagemDiretaEstadoService } from '../../services/mensagem-direta-estado.service';
import { MensagemDiretaEventosService } from '../../services/mensagem-direta-eventos.service';
import { GrupoNaLista } from '../../utils/grupo.util';
import { MensagemNaConversa } from '../../utils/mensagem-direta.util';
import { MensagemDiretaGrupoConversaComponent } from './mensagem-direta-grupo-conversa.component';

// Editar, reagir e o `@IA` no grupo (task 326): o menu da mensagem, a barra "Editando mensagem", o PATCH e o PUT do grupo, "editada", as pílulas de reação,
// a resposta da IA com as propostas lidas pela rota do grupo e o "IA digitando…". O usuário de teste tem id 1; Camila é a 9 e Davi, o 12.

class EventosFalso {
    readonly conectado = signal(true);
    iniciar(): void {}
    parar(): void {}
}

const ENVIADA_EM = new Date('2026-10-26T14:00:00');
const MINHA_ID = '11111111-2222-4333-8444-555555555555';
const DA_CAMILA_ID = '99999999-2222-4333-8444-555555555555';
const DA_IA_ID = 'aaaaaaaa-2222-4333-8444-555555555555';

const membro = (usuarioId: number, usuarioNome: string) => ({ usuarioId, usuarioNome, tipo: TipoUsuarioEnum.DESENVOLVEDOR, corAvatar: null, entradaData: new Date(), online: false });

function grupo(parcial: Partial<GrupoNaLista> = {}): GrupoNaLista {
    return {
        grupoId: 7, conversaId: 'G7', nome: 'Time do backend', tipo: TipoGrupoEnum.LIVRE, corAvatar: null, emojiAvatar: null, criadorUsuarioId: 1,
        membros: [membro(1, 'Eu'), membro(9, 'Camila Duarte'), membro(12, 'Davi Souza')], ultimaMensagem: null, naoLidas: 0, silenciada: false, privado: false,
        leituraPorSupervisao: false, ...parcial,
    };
}

function mensagem(mensagemId: string, autorUsuarioId: number | null, texto: string, parcial: Partial<MensagemNaConversa> = {}): MensagemNaConversa {
    return {
        mensagemId, conversaId: 'G7', autor: AutorMensagemDiretaEnum.USUARIO, autorUsuarioId, texto, contemCodigo: false, mencoes: [], referencias: [],
        respondeA: null, editadaDate: null, reacoes: [], chamadaPorUsuarioId: null, propostaIds: [], createdDate: ENVIADA_EM, situacao: 'ENVIADA', ...parcial,
    };
}

const resumo = (m: MensagemNaConversa): MensagemDiretaResumoDto => ({ ...m, createdDate: m.createdDate, editadaDate: m.editadaDate });

describe('MensagemDiretaGrupoConversaComponent — editar, reagir e @IA', () => {
    let tela: ComponenteMontado<MensagemDiretaGrupoConversaComponent>;
    let estado: MensagemDiretaEstadoService;

    const redesenhar = async () => {
        await vi.advanceTimersByTimeAsync(0);
        await tela.atualizar();
    };
    const itensDoMenu = () => Array.from(document.querySelectorAll<HTMLElement>('.p-contextmenu-item-link')).map((item) => item.textContent?.trim());
    const abrirMenuDaMensagem = async (mensagemId: string) => {
        tela.elemento.querySelector<HTMLButtonElement>(`[data-mensagem-id="${mensagemId}"]`)!.dispatchEvent(new MouseEvent('contextmenu', { bubbles: true, cancelable: true }));
        await redesenhar();
    };
    const clicarNoMenu = async (rotulo: string) => {
        const item = Array.from(document.querySelectorAll<HTMLElement>('.p-contextmenu-item-link')).find((candidato) => candidato.textContent?.includes(rotulo));
        expect(item, rotulo).toBeDefined();
        item!.click();
        await redesenhar();
    };
    const barra = () => tela.elemento.querySelector('.compositor-direto__resposta[aria-label="Edição em preparo"]');
    const abrir = async (mensagens: MensagemNaConversa[], dadosDoGrupo: Partial<GrupoNaLista> = {}) => {
        estado.grupoEstado.grupos.set([grupo(dadosDoGrupo)]);
        estado.grupoEstado.grupoAberto.set({ grupoId: 7, conversaId: 'G7', mensagens, proximoCursor: null, carregando: false, carregandoMais: false, erro: false });
        await redesenhar();
    };

    beforeEach(async () => {
        vi.useFakeTimers({ toFake: ['setTimeout', 'clearTimeout', 'Date'] });
        vi.setSystemTime(new Date(ENVIADA_EM.getTime() + 30 * 60_000));
        tela = await montarComponente(MensagemDiretaGrupoConversaComponent, {
            usuario: TipoUsuarioEnum.DESENVOLVEDOR,
            provedores: [{ provide: MensagemDiretaEventosService, useClass: EventosFalso }],
        });
        estado = TestBed.inject(MensagemDiretaEstadoService);
        await abrir([mensagem(DA_CAMILA_ID, 9, 'Mensagem da Camila'), mensagem(MINHA_ID, 1, 'Texto **original**')]);
    });

    afterEach(() => {
        vi.useRealTimers();
    });

    // --- editar -------------------------------------------------------------------------------------------------------------------------------------

    it('oferece Editar só na mensagem própria, dentro de 1 hora; a da outra pessoa e a vencida não têm a opção', async () => {
        await abrirMenuDaMensagem(DA_CAMILA_ID);
        expect(itensDoMenu()).toEqual(['Responder', 'Reagir', 'Copiar texto', 'Fixar mensagem']);
        document.body.click();
        await redesenhar();
        await abrirMenuDaMensagem(MINHA_ID);
        expect(itensDoMenu()).toEqual(['Responder', 'Reagir', 'Editar', 'Copiar texto', 'Fixar mensagem']);
        document.body.click();
        await redesenhar();

        vi.setSystemTime(new Date(ENVIADA_EM.getTime() + 60 * 60_000 + 1));
        await abrir([mensagem(MINHA_ID, 1, 'Texto')]);
        await abrirMenuDaMensagem(MINHA_ID);
        expect(itensDoMenu()).not.toContain('Editar');
        estado.grupoEstado.editar(mensagem(MINHA_ID, 1, 'Texto'));
        expect(estado.grupoEstado.editando(), 'o estado também recusa fora do prazo').toBeNull();
    });

    it('Editar abre a barra "Editando mensagem" com o texto no campo; o X cancela', async () => {
        await esperarCampoDeMensagem(tela.fixture, redesenhar);
        await abrirMenuDaMensagem(MINHA_ID);
        await clicarNoMenu('Editar');
        expect(barra()?.textContent).toContain('Editando mensagem');
        expect(barra()?.textContent).toContain('Texto original');
        expect(tela.elemento.querySelector('.compositor-direto__enviar')?.getAttribute('aria-label')).toBe('Salvar edição');

        tela.elemento.querySelector<HTMLButtonElement>('.compositor-direto__resposta button')!.click();
        await redesenhar();
        expect(barra()).toBeNull();
        expect(estado.grupoEstado.editando()).toBeNull();
    });

    it('salvar manda PATCH ao grupo com o texto novo (e não uma mensagem nova), troca o balão e mostra "editada"', async () => {
        await esperarCampoDeMensagem(tela.fixture, redesenhar);
        await abrirMenuDaMensagem(MINHA_ID);
        await clicarNoMenu('Editar');
        digitarNaMensagem(tela.fixture, 'Texto corrigido');
        await redesenhar();
        tela.elemento.querySelector<HTMLButtonElement>('.compositor-direto__enviar')!.click();
        await redesenhar();

        const requisicao = esperarRequisicao(tela.http, 'PATCH', '/mensagem-direta/grupo/7/mensagem');
        expect(requisicao.request.body).toMatchObject({ mensagemId: MINHA_ID, texto: 'Texto corrigido' });
        expect(requisicao.request.body.respondeAMensagemId).toBeUndefined();
        responderSucesso(requisicao, { mensagem: resumo(mensagem(MINHA_ID, 1, 'Texto corrigido', { editadaDate: new Date(ENVIADA_EM.getTime() + 31 * 60_000) })) });
        await redesenhar();

        expect(barra()).toBeNull();
        expect(tela.elemento.textContent).toContain('Texto corrigido');
        expect(tela.elemento.textContent).not.toContain('Texto original');
        expect(tela.elemento.querySelectorAll('.conversa-direta__editada').length).toBe(1);
        expect(estado.grupoEstado.grupoAberto()!.mensagens.length, 'editar não cria mensagem').toBe(2);
    });

    it('se o servidor recusa (saí do grupo, prazo vencido), a edição continua aberta com o motivo', async () => {
        await esperarCampoDeMensagem(tela.fixture, redesenhar);
        await abrirMenuDaMensagem(MINHA_ID);
        await clicarNoMenu('Editar');
        digitarNaMensagem(tela.fixture, 'Texto corrigido');
        await redesenhar();
        tela.elemento.querySelector<HTMLButtonElement>('.compositor-direto__enviar')!.click();
        await redesenhar();
        responderErro(esperarRequisicao(tela.http, 'PATCH', '/mensagem-direta/grupo/7/mensagem'), 400, 'O prazo de 1 hora para editar a mensagem acabou');
        await redesenhar();

        expect(barra()?.textContent).toContain('O prazo de 1 hora para editar a mensagem acabou');
        expect(estado.grupoEstado.editando()?.mensagemId).toBe(MINHA_ID);
        expect(tela.elemento.textContent).toContain('Texto original');
    });

    it('o evento EDICAO de um membro troca o texto, mostra "editada" e atualiza a prévia da lista', async () => {
        estado.grupoEstado.grupos.set([grupo({ ultimaMensagem: { ...resumo(mensagem(DA_CAMILA_ID, 9, 'Mensagem da Camila')), createdDate: ENVIADA_EM } as never })]);
        estado.aplicarEvento({ tipo: 'EDICAO', mensagem: resumo(mensagem(DA_CAMILA_ID, 9, 'Camila corrigiu', { editadaDate: new Date(ENVIADA_EM.getTime() + 20 * 60_000) })) });
        await redesenhar();
        expect(tela.elemento.textContent).toContain('Camila corrigiu');
        expect(tela.elemento.textContent).not.toContain('Mensagem da Camila');
        expect(tela.elemento.querySelectorAll('.conversa-direta__editada').length).toBe(1);
        expect(estado.grupoEstado.grupos()[0].ultimaMensagem?.texto).toBe('Camila corrigiu');
        expect(estado.grupoEstado.grupos()[0].naoLidas).toBe(0);
    });

    it('abrir outro grupo descarta a edição', async () => {
        await abrirMenuDaMensagem(MINHA_ID);
        await clicarNoMenu('Editar');
        expect(estado.grupoEstado.editando()).not.toBeNull();
        estado.grupoEstado.fecharGrupo();
        expect(estado.grupoEstado.editando()).toBeNull();
    });

    // --- reagir -------------------------------------------------------------------------------------------------------------------------------------

    it('Reagir pelo menu abre a faixa com os seis atalhos; escolher um manda PUT ao grupo e mostra a pílula com a contagem e a minha destacada', async () => {
        await abrirMenuDaMensagem(DA_CAMILA_ID);
        await clicarNoMenu('Reagir');
        const faixa = tela.elemento.querySelector('[aria-label="Escolher reação"]');
        expect(Array.from(faixa!.querySelectorAll('.reacoes__atalho')).map((botao) => botao.textContent?.trim())).toEqual(['👍', '❤️', '😂', '😮', '😢', '🙏']);
        faixa!.querySelectorAll<HTMLButtonElement>('.reacoes__atalho')[0].click();
        await redesenhar();

        const requisicao = esperarRequisicao(tela.http, 'PUT', '/mensagem-direta/grupo/7/reacao');
        expect(requisicao.request.body).toEqual({ mensagemId: DA_CAMILA_ID, reacao: '👍' });
        responderSucesso(requisicao, { mensagemId: DA_CAMILA_ID, reacoes: [{ usuarioId: 1, reacao: '👍' }, { usuarioId: 12, reacao: '👍' }] });
        await redesenhar();

        expect(tela.elemento.querySelector('[aria-label="Escolher reação"]'), 'a faixa fecha').toBeNull();
        const pilulas = Array.from(tela.elemento.querySelectorAll<HTMLButtonElement>('.reacoes__pilula'));
        expect(pilulas.length).toBe(1);
        expect(pilulas[0].textContent).toContain('👍');
        expect(pilulas[0].querySelector('.reacoes__total')?.textContent?.trim()).toBe('2');
        expect(pilulas[0].classList.contains('reacoes__pilula--minha')).toBe(true);
    });

    it('a recusa do servidor ao reagir aparece como faixa de erro', async () => {
        await abrirMenuDaMensagem(DA_CAMILA_ID);
        await clicarNoMenu('Reagir');
        tela.elemento.querySelector<HTMLButtonElement>('.reacoes__atalho')!.click();
        await redesenhar();
        responderErro(esperarRequisicao(tela.http, 'PUT', '/mensagem-direta/grupo/7/reacao'), 403, 'Você não é membro deste grupo');
        await redesenhar();
        expect(tela.elemento.querySelector('[role="alert"]')?.textContent).toContain('Você não é membro deste grupo');
    });

    it('o evento REACAO de outro membro põe a reação na mensagem sem mexer na ordem nem nas não lidas', async () => {
        estado.grupoEstado.grupos.set([grupo()]);
        estado.aplicarEvento({
            tipo: 'REACAO', conversaId: 'G7', mensagemId: MINHA_ID, reacoes: [{ usuarioId: 12, reacao: '❤️' }], reatorUsuarioId: 12, autorUsuarioId: 1, reacao: '❤️',
        });
        await redesenhar();
        expect(estado.grupoEstado.grupoAberto()!.mensagens.map((item) => item.mensagemId)).toEqual([DA_CAMILA_ID, MINHA_ID]);
        expect(estado.grupoEstado.grupoAberto()!.mensagens[1].reacoes).toEqual([{ usuarioId: 12, reacao: '❤️' }]);
        expect(tela.elemento.textContent).toContain('❤️');
        expect(estado.grupoEstado.grupos()[0].naoLidas).toBe(0);
    });

    it('quem só lê o canal por tipo não reage nem edita', async () => {
        await abrir([mensagem(DA_CAMILA_ID, 9, 'Mensagem da Camila'), mensagem(MINHA_ID, 1, 'Meu texto')], { tipo: TipoGrupoEnum.DEMANDA, leituraPorSupervisao: true });
        await abrirMenuDaMensagem(MINHA_ID);
        expect(itensDoMenu()).toEqual(['Responder', 'Copiar texto']);
        expect(tela.elemento.querySelector('[aria-label="Reagir"]')).toBeNull();
    });

    // --- @IA ----------------------------------------------------------------------------------------------------------------------------------------

    it('a resposta da IA aparece com o selo e para quem ela respondeu; quem chamou vê o cartão da proposta', async () => {
        await abrir([
            mensagem(MINHA_ID, 1, '@IA lista as atividades'),
            mensagem(DA_IA_ID, null, 'Você tem **3** atividades.', { autor: AutorMensagemDiretaEnum.IA, chamadaPorUsuarioId: 1 }),
        ]);
        const resposta = tela.elemento.querySelector('app-mensagem-direta-ia-resposta');
        expect(resposta).not.toBeNull();
        expect(resposta!.textContent).toContain('3');
        expect(resposta!.textContent).toContain('para você');
        expect(tela.elemento.querySelectorAll('app-mensagem-direta-ia-resposta').length).toBe(1);
    });

    it('a resposta da IA que outro membro chamou diz para quem foi e lê as propostas pela rota do grupo: sem acesso, "Ação oculta"', async () => {
        await abrir([mensagem(DA_IA_ID, null, 'Preparei a ação.', { autor: AutorMensagemDiretaEnum.IA, chamadaPorUsuarioId: 9, propostaIds: [41] })]);
        expect(tela.elemento.querySelector('app-mensagem-direta-ia-resposta')!.textContent).toContain('Camila');
        const requisicao = esperarRequisicao(tela.http, 'GET', `/mensagem-direta/grupo/7/mensagem/${DA_IA_ID}/proposta/41`);
        responderSucesso(requisicao, { acessivel: false, podeResolver: false, proposta: null });
        await redesenhar();
        expect(tela.elemento.textContent).toContain('Ação oculta por falta de acesso');
    });

    it('"IA digitando…" aparece enquanto a IA responde a um @IA do grupo e some quando a resposta chega', async () => {
        estado.aplicarEvento({ tipo: 'IA_DIGITANDO', conversaId: 'G7' });
        await redesenhar();
        expect(tela.elemento.querySelector('[aria-label="IA digitando"]')).not.toBeNull();

        estado.aplicarEvento({ tipo: 'MENSAGEM', mensagem: resumo(mensagem(DA_IA_ID, null, 'Feito.', { autor: AutorMensagemDiretaEnum.IA, chamadaPorUsuarioId: 1 })) });
        await redesenhar();
        expect(tela.elemento.querySelector('[aria-label="IA digitando"]')).toBeNull();
        expect(estado.grupoEstado.grupos()[0].naoLidas, 'a resposta da IA não conta como não lida').toBe(0);
    });

    it('com a IA no ar o @ do compositor oferece "Pedir à IA"; com a IA fora do ar, não', async () => {
        const disponibilidade = TestBed.inject(IaDisponibilidadeService);
        disponibilidade.estadoReal.set(EstadoIaEnum.NO_AR);
        await abrir([mensagem(MINHA_ID, 1, 'oi')]);
        await esperarCampoDeMensagem(tela.fixture, redesenhar);
        digitarNaMensagem(tela.fixture, '@');
        await redesenhar();
        expect(tela.elemento.textContent).toContain('Pedir à IA');

        disponibilidade.estadoReal.set(EstadoIaEnum.FORA_DO_AR);
        digitarNaMensagem(tela.fixture, '');
        await redesenhar();
        digitarNaMensagem(tela.fixture, '@');
        await redesenhar();
        expect(tela.elemento.textContent).not.toContain('Pedir à IA');
    });

    it('@IA sozinho mostra a dica de que a próxima mensagem vai para a IA', async () => {
        await abrir([mensagem(MINHA_ID, 1, '@IA', { createdDate: new Date(Date.now() - 60_000) })]);
        expect(tela.elemento.textContent).toContain('A IA está esperando o seu pedido');
    });

    it('o @IA sozinho acabou de ser enviado: a dica aparece na hora, mesmo com o relógio da dica atrasado (achado ao vivo)', async () => {
        vi.setSystemTime(new Date(ENVIADA_EM.getTime() + 45 * 60_000));
        await abrir([mensagem(DA_CAMILA_ID, 9, 'oi'), mensagem(MINHA_ID, 1, 'oi também'), mensagem(DA_IA_ID, 1, '@IA', { createdDate: new Date() })]);
        expect(tela.elemento.textContent).toContain('A IA está esperando o seu pedido');
    });
});
