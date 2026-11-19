import { describe, it, expect, beforeEach, vi } from 'vitest';
import { TestBed } from '@angular/core/testing';
import { HttpClient, HttpErrorResponse, provideHttpClient, withInterceptors } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { Router } from '@angular/router';
import { MessageService } from 'primeng/api';
import { comLeituraDeFundo } from './loading.interceptor';
import { AutenticacaoService } from '../services/autenticacao.service';
import { comErroTratadoPelaTela, errorHandlerInterceptor, parametrosRetorno } from './error-handler.interceptor';

let http: HttpClient;
let controlador: HttpTestingController;
const navegar = vi.fn();
const adicionar = vi.fn();
const reconferir = vi.fn();
const roteador = { navigate: navegar, url: '/demanda?pagina=2' };

function configurar(): void {
    TestBed.configureTestingModule({
        providers: [
            provideHttpClient(withInterceptors([errorHandlerInterceptor])),
            provideHttpClientTesting(),
            { provide: Router, useValue: roteador },
            { provide: MessageService, useValue: { add: adicionar } },
            { provide: AutenticacaoService, useValue: { reconferirAposAcessoNegado: reconferir } },
        ],
    });
    http = TestBed.inject(HttpClient);
    controlador = TestBed.inject(HttpTestingController);
}

/** Dispara um GET que falha e devolve o erro relançado pelo interceptor. */
function falhar(status: number, corpo: object | null = null, opcoes: object = {}): HttpErrorResponse {
    let recebido!: HttpErrorResponse;
    http.get('/api/v1/algo', opcoes).subscribe({ error: (erro) => (recebido = erro) });
    controlador.expectOne('/api/v1/algo').flush(corpo, { status, statusText: 'x' });
    return recebido;
}

beforeEach(() => {
    navegar.mockClear();
    adicionar.mockClear();
    reconferir.mockClear();
    roteador.url = '/demanda?pagina=2';
    localStorage.clear();
    configurar();
});

describe('errorHandlerInterceptor', () => {
    it('leitura de fundo: erro 500, 403 e de rede não chamam o serviço de mensagens', () => {
        for (const status of [500, 403, 404, 400, 0]) {
            const erro = falhar(status, null, comLeituraDeFundo());
            expect(erro.status).toBe(status);
        }
        expect(adicionar).not.toHaveBeenCalled();
        expect(navegar).not.toHaveBeenCalled();
    });

    it('leitura de fundo: o 401 continua limpando a sessão e levando ao login', () => {
        localStorage.setItem('access_token', 'abc');
        localStorage.setItem('usuario_sessao', '{}');

        falhar(401, null, comLeituraDeFundo());

        expect(localStorage.getItem('access_token')).toBeNull();
        expect(navegar).toHaveBeenCalledWith(['/autenticacao'], { queryParams: { returnUrl: '/demanda?pagina=2' } });
    });

    it('403 pede a reconferência da sessão (o tipo pode ter mudado); outros status e leitura de fundo não pedem', () => {
        falhar(403);
        expect(reconferir).toHaveBeenCalledTimes(1);

        reconferir.mockClear();
        for (const status of [400, 404, 500]) falhar(status);
        falhar(403, null, comLeituraDeFundo());
        expect(reconferir).not.toHaveBeenCalled();
    });

    it('a mesma falha numa ação do usuário continua mostrando o erro', () => {
        falhar(500);
        expect(adicionar).toHaveBeenCalledWith(expect.objectContaining({ detail: 'Erro interno. Tente novamente.' }));
    });

    it('401 limpa a sessão e leva ao login guardando a tela atual em returnUrl', () => {
        localStorage.setItem('access_token', 'abc');
        localStorage.setItem('usuario_sessao', '{}');
        localStorage.setItem('tema', 'escuro');

        falhar(401);

        expect(localStorage.getItem('access_token')).toBeNull();
        expect(localStorage.getItem('usuario_sessao')).toBeNull();
        expect(localStorage.getItem('tema')).toBe('escuro');
        expect(navegar).toHaveBeenCalledWith(['/autenticacao'], { queryParams: { returnUrl: '/demanda?pagina=2' } });
        expect(adicionar).not.toHaveBeenCalled();
    });

    it('401 vindo da própria tela de login não grava returnUrl', () => {
        roteador.url = '/autenticacao?returnUrl=%2Fponto';
        falhar(401);
        expect(navegar).toHaveBeenCalledWith(['/autenticacao'], { queryParams: {} });
    });

    it('403 avisa que o acesso não é permitido', () => {
        falhar(403);
        expect(adicionar).toHaveBeenCalledWith({ severity: 'error', summary: 'Erro', detail: 'Acesso não permitido' });
    });

    it('400 mostra o primeiro item de erros do backend', () => {
        falhar(400, { erros: ['Nome obrigatório', 'Outro'], mensagem: 'Geral' });
        expect(adicionar).toHaveBeenCalledWith({ severity: 'warn', summary: 'Atenção', detail: 'Nome obrigatório' });
    });

    it('400 sem lista de erros usa a mensagem do backend', () => {
        falhar(400, { mensagem: 'Execução já ativa' });
        expect(adicionar).toHaveBeenCalledWith({ severity: 'warn', summary: 'Atenção', detail: 'Execução já ativa' });
    });

    it('400 sem corpo útil cai em "Requisição inválida"', () => {
        falhar(400, null);
        expect(adicionar).toHaveBeenCalledWith({ severity: 'warn', summary: 'Atenção', detail: 'Requisição inválida' });
    });

    it('404 avisa que o registro não foi encontrado', () => {
        falhar(404);
        expect(adicionar).toHaveBeenCalledWith({ severity: 'warn', summary: 'Não encontrado', detail: 'Registro não encontrado' });
    });

    it('qualquer outro status mostra o erro interno genérico', () => {
        for (const status of [409, 500, 503]) {
            adicionar.mockClear();
            falhar(status);
            expect(adicionar).toHaveBeenCalledWith({ severity: 'error', summary: 'Erro', detail: 'Erro interno. Tente novamente.' });
        }
    });

    it('o erro é relançado à tela com o status original', () => {
        const erro = falhar(404);
        expect(erro).toBeInstanceOf(HttpErrorResponse);
        expect(erro.status).toBe(404);
    });

    it('requisição bem-sucedida não gera aviso nem redirecionamento', () => {
        http.get('/api/v1/algo').subscribe();
        controlador.expectOne('/api/v1/algo').flush({});
        expect(adicionar).not.toHaveBeenCalled();
        expect(navegar).not.toHaveBeenCalled();
    });

    it('erro marcado como tratado pela tela não gera toast nem redirect, mas chega à tela', () => {
        localStorage.setItem('access_token', 'abc');
        const erro = falhar(401, null, comErroTratadoPelaTela());
        expect(erro.status).toBe(401);
        expect(adicionar).not.toHaveBeenCalled();
        expect(navegar).not.toHaveBeenCalled();
        expect(localStorage.getItem('access_token')).toBe('abc');
    });
});

describe('parametrosRetorno', () => {
    it('devolve returnUrl para uma tela comum, com query string', () => {
        expect(parametrosRetorno('/atividade?x=1')).toEqual({ returnUrl: '/atividade?x=1' });
    });

    it('não devolve nada para vazio, raiz ou o próprio login', () => {
        expect(parametrosRetorno('')).toEqual({});
        expect(parametrosRetorno('/')).toEqual({});
        expect(parametrosRetorno('/autenticacao')).toEqual({});
        expect(parametrosRetorno('/autenticacao?returnUrl=%2Fponto')).toEqual({});
    });
});
