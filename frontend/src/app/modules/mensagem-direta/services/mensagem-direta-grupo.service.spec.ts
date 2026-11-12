import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TipoGrupoEnum } from '@project20/shared';
import { esperarRequisicao, responderSucesso } from '../../../../testes/http-teste';
import { ERRO_TRATADO_PELA_TELA } from '../../../core/interceptors/error-handler.interceptor';
import { SEM_OVERLAY_GLOBAL } from '../../../core/interceptors/loading.interceptor';
import { MensagemDiretaGrupoService } from './mensagem-direta-grupo.service';

// Grupos do chat entre colaboradores (task 247), a parte HTTP: verbo, URL, corpo e query de cada chamada. Como no um a um, o popup mostra os próprios
// erros e estados de carga, por isso nenhuma chamada aciona o overlay global nem o aviso global de erro.

describe('MensagemDiretaGrupoService', () => {
    let servico: MensagemDiretaGrupoService;
    let http: HttpTestingController;

    beforeEach(() => {
        TestBed.configureTestingModule({ providers: [provideHttpClient(), provideHttpClientTesting()] });
        servico = TestBed.inject(MensagemDiretaGrupoService);
        http = TestBed.inject(HttpTestingController);
    });

    afterEach(() => http.verify());

    it('criar é um POST em /mensagem-direta/grupo com o corpo do formulário', () => {
        servico.criar({ nome: 'Time', corAvatar: '#112233', emojiAvatar: '🚀', membroUsuarioIds: [9] }).subscribe();
        const requisicao = esperarRequisicao(http, 'POST', '/mensagem-direta/grupo');
        expect(requisicao.request.body).toEqual({ nome: 'Time', corAvatar: '#112233', emojiAvatar: '🚀', membroUsuarioIds: [9] });
        responderSucesso(requisicao, { grupo: {} });
    });

    it('recuperar é um GET e alterar um PATCH em /mensagem-direta/grupo/:grupoId', () => {
        servico.recuperar(7).subscribe();
        responderSucesso(esperarRequisicao(http, 'GET', '/mensagem-direta/grupo/7'), { grupo: {} });
        servico.alterar(7, { nome: 'Novo', corAvatar: null }).subscribe();
        const requisicao = esperarRequisicao(http, 'PATCH', '/mensagem-direta/grupo/7');
        expect(requisicao.request.body).toEqual({ nome: 'Novo', corAvatar: null });
        responderSucesso(requisicao, { grupo: {} });
    });

    it('adicionarMembros é um POST em /membros e sair um DELETE em /membro', () => {
        servico.adicionarMembros(7, [9, 12]).subscribe();
        const adicao = esperarRequisicao(http, 'POST', '/mensagem-direta/grupo/7/membros');
        expect(adicao.request.body).toEqual({ usuarioIds: [9, 12] });
        responderSucesso(adicao, { grupo: {}, adicionadosUsuarioIds: [9, 12] });
        servico.sair(7).subscribe();
        responderSucesso(esperarRequisicao(http, 'DELETE', '/mensagem-direta/grupo/7/membro'), { grupoId: 7, grupoEncerrado: false });
    });

    it('listarMensagens é um GET em /mensagens, com o cursor só quando há', () => {
        servico.listarMensagens(7).subscribe();
        const semCursor = esperarRequisicao(http, 'GET', '/mensagem-direta/grupo/7/mensagens');
        expect(semCursor.request.params.has('cursor')).toBe(false);
        responderSucesso(semCursor, { grupoId: 7, mensagens: [], proximoCursor: null });
        servico.listarMensagens(7, 'abc').subscribe();
        const comCursor = esperarRequisicao(http, 'GET', '/mensagem-direta/grupo/7/mensagens');
        expect(comCursor.request.params.get('cursor')).toBe('abc');
        responderSucesso(comCursor, { grupoId: 7, mensagens: [], proximoCursor: null });
    });

    it('enviarMensagem é um POST em /mensagem com o envio inteiro', () => {
        const envio = { mensagemId: 'u1', texto: 'oi @todos', mencoes: [], mencionaTodos: true, referencias: [] };
        servico.enviarMensagem(7, envio).subscribe();
        const requisicao = esperarRequisicao(http, 'POST', '/mensagem-direta/grupo/7/mensagem');
        expect(requisicao.request.body).toEqual(envio);
        responderSucesso(requisicao, { mensagem: {}, jaExistia: false });
    });

    it('leitura e silêncio são PUT, e o digitando um POST sem corpo', () => {
        servico.alterarLeitura(7, new Date('2026-11-02T10:00:00.000Z')).subscribe();
        const leitura = esperarRequisicao(http, 'PUT', '/mensagem-direta/grupo/7/leitura');
        expect(leitura.request.body).toEqual({ lidaAteData: '2026-11-02T10:00:00.000Z' });
        responderSucesso(leitura, { grupoId: 7, conversaId: 'G7', lidaAteData: '2026-11-02T10:00:00.000Z' });
        servico.alterarSilencio(7, true).subscribe();
        const silencio = esperarRequisicao(http, 'PUT', '/mensagem-direta/grupo/7/silencio');
        expect(silencio.request.body).toEqual({ silenciada: true });
        responderSucesso(silencio, { grupoId: 7, silenciada: true });
        servico.avisarDigitacao(7).subscribe();
        responderSucesso(esperarRequisicao(http, 'POST', '/mensagem-direta/grupo/7/digitando'), null);
    });

    it('o chat da demanda e o do projeto têm rota própria, para recuperar (GET) e para criar (POST sem corpo)', () => {
        servico.recuperarCanal(TipoGrupoEnum.DEMANDA, 12).subscribe();
        responderSucesso(esperarRequisicao(http, 'GET', '/mensagem-direta/canal/demanda/12'), { grupo: null });
        servico.recuperarCanal(TipoGrupoEnum.PROJETO, 3).subscribe();
        responderSucesso(esperarRequisicao(http, 'GET', '/mensagem-direta/canal/projeto/3'), { grupo: null });
        servico.criarCanal(TipoGrupoEnum.DEMANDA, 12).subscribe();
        const criacao = esperarRequisicao(http, 'POST', '/mensagem-direta/canal/demanda/12');
        expect(criacao.request.body).toEqual({});
        responderSucesso(criacao, { grupo: {}, jaExistia: false });
        servico.criarCanal(TipoGrupoEnum.PROJETO, 3).subscribe();
        responderSucesso(esperarRequisicao(http, 'POST', '/mensagem-direta/canal/projeto/3'), { grupo: {}, jaExistia: true });
    });

    it('o resumo com a IA tem rotas de opções, estimativa, resumo e proposta (criar, confirmar e recusar), com o período em ISO', () => {
        const pedido = { inicioData: new Date('2026-11-01T10:00:00.000Z'), fimData: new Date('2026-11-12T10:00:00.000Z'), enviaCodigo: false };
        servico.recuperarOpcoesDoResumo(7).subscribe();
        responderSucesso(esperarRequisicao(http, 'GET', '/mensagem-direta/grupo/7/resumo'), {});
        servico.estimarResumo(7, pedido).subscribe();
        const estimativa = esperarRequisicao(http, 'POST', '/mensagem-direta/grupo/7/resumo/estimativa');
        expect(estimativa.request.body).toEqual({ inicioData: '2026-11-01T10:00:00.000Z', fimData: '2026-11-12T10:00:00.000Z', enviaCodigo: false });
        responderSucesso(estimativa, {});
        servico.resumir(7, { ...pedido, enviaCodigo: true }).subscribe();
        const resumo = esperarRequisicao(http, 'POST', '/mensagem-direta/grupo/7/resumo');
        expect(resumo.request.body.enviaCodigo).toBe(true);
        responderSucesso(resumo, {});
        servico.criarPropostaDoResumo(7, 5, 'texto', 12).subscribe();
        const proposta = esperarRequisicao(http, 'POST', '/mensagem-direta/grupo/7/resumo/5/proposta');
        expect(proposta.request.body).toEqual({ texto: 'texto', demandaId: 12 });
        responderSucesso(proposta, {});
        servico.confirmarPropostaDoResumo(7, 5, 77).subscribe();
        responderSucesso(esperarRequisicao(http, 'POST', '/mensagem-direta/grupo/7/resumo/5/proposta/77/confirmar'), {});
        servico.recusarPropostaDoResumo(7, 5, 77).subscribe();
        responderSucesso(esperarRequisicao(http, 'POST', '/mensagem-direta/grupo/7/resumo/5/proposta/77/recusar'), {});
    });

    it('as fixadas e a busca no grupo têm rota própria: listar, fixar (POST), desafixar (DELETE) e buscar com o filtro de código', () => {
        servico.listarFixadas(7).subscribe();
        responderSucesso(esperarRequisicao(http, 'GET', '/mensagem-direta/grupo/7/fixadas'), { grupoId: 7, fixadas: [] });
        servico.fixarMensagem(7, 'm1').subscribe();
        responderSucesso(esperarRequisicao(http, 'POST', '/mensagem-direta/grupo/7/fixadas/m1'), {});
        servico.desafixarMensagem(7, 'm1').subscribe();
        responderSucesso(esperarRequisicao(http, 'DELETE', '/mensagem-direta/grupo/7/fixadas/m1'), {});
        servico.buscarNoGrupo(7, 'fila', true).subscribe();
        const busca = esperarRequisicao(http, 'GET', '/mensagem-direta/grupo/7/busca');
        expect(busca.request.params.get('texto')).toBe('fila');
        expect(busca.request.params.get('somenteCodigo')).toBe('true');
        responderSucesso(busca, { grupoId: 7, mensagens: [] });
        servico.buscarNoGrupo(7, 'fila', false).subscribe();
        const semCodigo = esperarRequisicao(http, 'GET', '/mensagem-direta/grupo/7/busca');
        expect(semCodigo.request.params.has('somenteCodigo')).toBe(false);
        responderSucesso(semCodigo, { grupoId: 7, mensagens: [] });
    });

    it('nenhuma chamada aciona o overlay global nem o aviso global de erro', () => {
        servico.recuperar(7).subscribe();
        const requisicao = esperarRequisicao(http, 'GET', '/mensagem-direta/grupo/7');
        expect(requisicao.request.context.get(SEM_OVERLAY_GLOBAL)).toBe(true);
        expect(requisicao.request.context.get(ERRO_TRATADO_PELA_TELA)).toBe(true);
        responderSucesso(requisicao, { grupo: {} });
    });
});
