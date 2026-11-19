import { describe, it, expect, beforeEach, vi } from 'vitest';
import { TestBed } from '@angular/core/testing';
import { Router, provideRouter } from '@angular/router';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TipoUsuarioEnum } from '@project20/shared';
import { AutenticacaoService } from './autenticacao.service';
import { UsuarioSessaoService } from './usuario-sessao.service';
import { ExecucaoAtivaService } from './execucao-ativa.service';
import { usuarioAutenticado } from '../signals/usuario-autenticado.signal';
import { criarUsuarioTeste } from '../../../testes/usuarios-teste';

beforeEach(() => {
    localStorage.clear();
    TestBed.configureTestingModule({ providers: [provideRouter([]), provideHttpClient(), provideHttpClientTesting()] });
});

describe('UsuarioSessaoService', () => {
    it('começa sem usuário e sem permissão alguma', () => {
        const sessao = TestBed.inject(UsuarioSessaoService);
        expect(sessao.usuarioAtual()).toBeNull();
        expect(sessao.eGestor()).toBe(false);
        expect(sessao.eAdministrador()).toBe(false);
    });

    it('definirUsuario guarda na memória e no localStorage; limpar apaga os dois', () => {
        const sessao = TestBed.inject(UsuarioSessaoService);
        sessao.definirUsuario(criarUsuarioTeste(TipoUsuarioEnum.GESTOR));
        expect(sessao.login()).toBe('gestor.teste');
        expect(JSON.parse(localStorage.getItem('usuario_sessao')!).tipo).toBe(TipoUsuarioEnum.GESTOR);

        sessao.limpar();
        expect(sessao.usuarioAtual()).toBeNull();
        expect(localStorage.getItem('usuario_sessao')).toBeNull();
    });

    it('permissões por tipo: administrador é gestor também; gestor não é administrador; desenvolvedor nenhum', () => {
        const sessao = TestBed.inject(UsuarioSessaoService);
        const tabela: Array<[TipoUsuarioEnum, boolean, boolean]> = [
            [TipoUsuarioEnum.DESENVOLVEDOR, false, false],
            [TipoUsuarioEnum.GESTOR, true, false],
            [TipoUsuarioEnum.ADMINISTRADOR, true, true],
        ];
        for (const [tipo, gestor, administrador] of tabela) {
            sessao.definirUsuario(criarUsuarioTeste(tipo));
            expect([tipo, sessao.eGestor(), sessao.eAdministrador()]).toEqual([tipo, gestor, administrador]);
        }
    });

    it('auxiliar: não é gestor nem administrador, mas tem as permissões por ação de quem conduz o trabalho', () => {
        const sessao = TestBed.inject(UsuarioSessaoService);
        sessao.definirUsuario(criarUsuarioTeste(TipoUsuarioEnum.AUXILIAR));
        expect([sessao.eAuxiliar(), sessao.eGestor(), sessao.eAdministrador()]).toEqual([true, false, false]);
        expect([
            sessao.temVisaoTotal(), sessao.podeEditarDemanda(), sessao.podeAtribuirMembroOuTag(), sessao.podeEditarAtividadeDeOutro(),
            sessao.podeConduzirExecucaoDeOutro(), sessao.podeVerExecucaoEPontoDeOutro(), sessao.podeEditarExecucaoDeOutro(), sessao.podeGerenciarTag(),
        ]).toEqual(Array(8).fill(true));
        sessao.definirUsuario(criarUsuarioTeste(TipoUsuarioEnum.DESENVOLVEDOR));
        expect(sessao.eAuxiliar()).toBe(false);
        expect(sessao.temVisaoTotal() || sessao.podeEditarDemanda() || sessao.podeGerenciarTag()).toBe(false);
    });

    it('restaura a sessão salva ao ser criado', () => {
        localStorage.setItem('usuario_sessao', JSON.stringify(criarUsuarioTeste(TipoUsuarioEnum.ADMINISTRADOR)));
        expect(TestBed.inject(UsuarioSessaoService).eAdministrador()).toBe(true);
    });

    it('sessão salva corrompida é descartada sem quebrar', () => {
        localStorage.setItem('usuario_sessao', '{nao e json');
        const sessao = TestBed.inject(UsuarioSessaoService);
        expect(sessao.usuarioAtual()).toBeNull();
        expect(localStorage.getItem('usuario_sessao')).toBeNull();
    });
});

describe('AutenticacaoService', () => {
    const RESPOSTA = {
        sucesso: true, mensagem: 'ok',
        dados: { accessToken: 'token-novo', tipo: 'Bearer', usuario: { id: 1, login: 'maria', nomeCompleto: 'Maria', tipo: TipoUsuarioEnum.GESTOR, corAvatar: null } },
    };

    it('login chama o endpoint com o corpo certo e guarda o token e a sessão', () => {
        const servico = TestBed.inject(AutenticacaoService);
        const http = TestBed.inject(HttpTestingController);
        servico.login({ login: 'maria', senha: 'x' }).subscribe();
        const requisicao = http.expectOne((registroSelecionado) => registroSelecionado.url.endsWith('/autenticacao/login'));
        expect(requisicao.request.method).toBe('POST');
        expect(requisicao.request.body).toEqual({ login: 'maria', senha: 'x' });
        requisicao.flush(RESPOSTA);

        expect(localStorage.getItem('access_token')).toBe('token-novo');
        expect(TestBed.inject(UsuarioSessaoService).login()).toBe('maria');
        expect(servico.estaAutenticado()).toBe(true);
    });

    it('login recusado não guarda nada', () => {
        const servico = TestBed.inject(AutenticacaoService);
        const http = TestBed.inject(HttpTestingController);
        servico.login({ login: 'maria', senha: 'errada' }).subscribe({ error: () => undefined });
        http.expectOne((registroPrincipal) => registroPrincipal.url.endsWith('/autenticacao/login')).flush(
            { sucesso: false, mensagem: 'Credenciais inválidas' }, { status: 400, statusText: 'Bad Request' });
        expect(localStorage.getItem('access_token')).toBeNull();
        expect(servico.estaAutenticado()).toBe(false);
    });

    it('encerrarSessao (expirada): limpa token, usuário e execução ativa, e leva ao login guardando a tela de origem', () => {
        localStorage.setItem('access_token', 'abc');
        const servico = TestBed.inject(AutenticacaoService);
        const execucaoAtiva = TestBed.inject(ExecucaoAtivaService);
        TestBed.inject(UsuarioSessaoService).definirUsuario(criarUsuarioTeste());
        execucaoAtiva.definir({ id: 9, atividadeId: 4 } as never);
        const roteador = TestBed.inject(Router);
        vi.spyOn(roteador, 'url', 'get').mockReturnValue('/demanda?pagina=2');
        const navegar = vi.spyOn(roteador, 'navigate').mockResolvedValue(true);

        servico.encerrarSessao({ expirada: true });

        expect(localStorage.getItem('access_token')).toBeNull();
        expect(localStorage.getItem('usuario_sessao')).toBeNull();
        expect(TestBed.inject(UsuarioSessaoService).usuarioAtual()).toBeNull();
        expect(execucaoAtiva.ativa()).toBeNull();
        expect(navegar).toHaveBeenCalledWith(['/autenticacao'], { queryParams: { returnUrl: '/demanda?pagina=2' } });
    });

    it('encerrarSessao: o próximo login volta a esperar a conferência do tipo na primeira navegação', () => {
        localStorage.setItem('access_token', 'abc');
        const servico = TestBed.inject(AutenticacaoService);
        const http = TestBed.inject(HttpTestingController);
        TestBed.inject(UsuarioSessaoService).definirUsuario(criarUsuarioTeste(TipoUsuarioEnum.GESTOR));
        vi.spyOn(TestBed.inject(Router), 'navigate').mockResolvedValue(true);
        servico.garantirSessaoConferida().subscribe();
        http.expectOne((registro) => registro.url.includes('/usuario/')).flush({ sucesso: true, mensagem: 'ok', dados: criarUsuarioTeste(TipoUsuarioEnum.GESTOR) });

        servico.encerrarSessao();
        localStorage.setItem('access_token', 'def');
        TestBed.inject(UsuarioSessaoService).definirUsuario(criarUsuarioTeste(TipoUsuarioEnum.GESTOR));
        servico.garantirSessaoConferida().subscribe();

        http.expectOne((registro) => registro.url.includes('/usuario/'));
    });

    it('logout apaga token e sessão e vai para o login', () => {
        localStorage.setItem('access_token', 'abc');
        const servico = TestBed.inject(AutenticacaoService);
        TestBed.inject(UsuarioSessaoService).definirUsuario(criarUsuarioTeste());
        const navegacoes: unknown[][] = [];
        TestBed.inject(Router).navigate = ((destino: unknown[]) => { navegacoes.push(destino); return Promise.resolve(true); }) as never;

        servico.logout();

        expect(localStorage.getItem('access_token')).toBeNull();
        expect(TestBed.inject(UsuarioSessaoService).usuarioAtual()).toBeNull();
        expect(navegacoes).toEqual([['/autenticacao']]);
    });
});

describe('AutenticacaoService.atualizarSessao (P-062)', () => {
    const sessaoSalva = () => criarUsuarioTeste(TipoUsuarioEnum.GESTOR);

    it('troca o usuário guardado pelo do servidor: um gestor rebaixado perde os menus de gestor', () => {
        localStorage.setItem('access_token', 'abc');
        const sessao = TestBed.inject(UsuarioSessaoService);
        sessao.definirUsuario(sessaoSalva());
        const http = TestBed.inject(HttpTestingController);

        TestBed.inject(AutenticacaoService).atualizarSessao();
        const requisicao = http.expectOne((registroSeguinte) => registroSeguinte.url.endsWith(`/usuario/${sessaoSalva().id}`));
        expect(requisicao.request.method).toBe('GET');
        requisicao.flush({ sucesso: true, mensagem: 'ok', dados: { ...sessaoSalva(), tipo: TipoUsuarioEnum.DESENVOLVEDOR } });

        expect(sessao.eGestor()).toBe(false);
        expect(JSON.parse(localStorage.getItem('usuario_sessao')!).tipo).toBe(TipoUsuarioEnum.DESENVOLVEDOR);
    });

    it('sem token ou sem usuário guardado não pede nada', () => {
        const http = TestBed.inject(HttpTestingController);
        TestBed.inject(AutenticacaoService).atualizarSessao();
        TestBed.inject(UsuarioSessaoService).definirUsuario(sessaoSalva());
        TestBed.inject(AutenticacaoService).atualizarSessao();
        http.expectNone(() => true);
    });

    it('falha da leitura mantém a sessão como estava', () => {
        localStorage.setItem('access_token', 'abc');
        const sessao = TestBed.inject(UsuarioSessaoService);
        sessao.definirUsuario(sessaoSalva());
        const http = TestBed.inject(HttpTestingController);

        TestBed.inject(AutenticacaoService).atualizarSessao();
        http.expectOne((registroAtual) => registroAtual.url.endsWith(`/usuario/${sessaoSalva().id}`)).flush({}, { status: 500, statusText: 'Erro' });

        expect(sessao.eGestor()).toBe(true);
    });

    it('descarta a resposta se o usuário da sessão mudou enquanto ela voltava', () => {
        localStorage.setItem('access_token', 'abc');
        const sessao = TestBed.inject(UsuarioSessaoService);
        sessao.definirUsuario(sessaoSalva());
        const http = TestBed.inject(HttpTestingController);

        TestBed.inject(AutenticacaoService).atualizarSessao();
        const requisicao = http.expectOne((registro) => registro.url.endsWith(`/usuario/${sessaoSalva().id}`));
        sessao.limpar();
        requisicao.flush({ sucesso: true, mensagem: 'ok', dados: sessaoSalva() });

        expect(sessao.usuarioAtual()).toBeNull();
    });
});

describe('AutenticacaoService.conferirSessao, garantirSessaoConferida e 403 (task 340)', () => {
    const usuarioGestor = () => criarUsuarioTeste(TipoUsuarioEnum.GESTOR);
    const urlDoUsuario = (registro: { url: string }) => registro.url.endsWith(`/usuario/${usuarioGestor().id}`);

    function entrarGestor() {
        localStorage.setItem('access_token', 'abc');
        TestBed.inject(UsuarioSessaoService).definirUsuario(usuarioGestor());
        return { http: TestBed.inject(HttpTestingController), servico: TestBed.inject(AutenticacaoService) };
    }

    it('quem pede com uma conferência a caminho recebe a mesma, sem requisição nova', () => {
        const { http, servico } = entrarGestor();
        let concluidas = 0;
        servico.conferirSessao().subscribe(() => concluidas++);
        servico.conferirSessao().subscribe(() => concluidas++);

        http.expectOne(urlDoUsuario).flush({ sucesso: true, mensagem: 'ok', dados: usuarioGestor() });

        expect(concluidas).toBe(2);
    });

    it('garantirSessaoConferida espera a primeira conferência e nas seguintes passa direto', () => {
        const { http, servico } = entrarGestor();
        let liberada = false;
        servico.garantirSessaoConferida().subscribe(() => (liberada = true));
        expect(liberada).toBe(false);

        http.expectOne(urlDoUsuario).flush({ sucesso: true, mensagem: 'ok', dados: { ...usuarioGestor(), tipo: TipoUsuarioEnum.DESENVOLVEDOR } });
        expect(liberada).toBe(true);
        expect(TestBed.inject(UsuarioSessaoService).eGestor()).toBe(false);

        let segunda = false;
        servico.garantirSessaoConferida().subscribe(() => (segunda = true));
        http.expectNone(urlDoUsuario);
        expect(segunda).toBe(true);
    });

    it('com o servidor fora ou lento a primeira navegação segue com a sessão guardada (falha e tempo esgotado)', () => {
        vi.useFakeTimers();
        try {
            const { http, servico } = entrarGestor();
            let liberada = false;
            servico.garantirSessaoConferida().subscribe(() => (liberada = true));
            http.expectOne(urlDoUsuario);
            vi.advanceTimersByTime(3_001);

            expect(liberada).toBe(true);
            expect(TestBed.inject(UsuarioSessaoService).eGestor()).toBe(true);
        } finally {
            vi.useRealTimers();
        }
    });

    it('rebaixado: se a tela aberta deixou de ser permitida, o usuário vai para a raiz', () => {
        const { http, servico } = entrarGestor();
        const roteador = TestBed.inject(Router);
        const navegar = vi.spyOn(roteador, 'navigate').mockResolvedValue(true);
        const raiz = { routeConfig: null, firstChild: { routeConfig: { canActivate: [() => TestBed.inject(UsuarioSessaoService).eGestor()] }, firstChild: null } };
        Object.defineProperty(roteador, 'routerState', { value: { snapshot: { root: raiz } }, configurable: true });

        servico.atualizarSessao();
        http.expectOne(urlDoUsuario).flush({ sucesso: true, mensagem: 'ok', dados: { ...usuarioGestor(), tipo: TipoUsuarioEnum.DESENVOLVEDOR } });

        expect(navegar).toHaveBeenCalledWith(['/']);
    });

    it('tipo que não mudou não reavalia a tela', () => {
        const { http, servico } = entrarGestor();
        const navegar = vi.spyOn(TestBed.inject(Router), 'navigate').mockResolvedValue(true);

        servico.atualizarSessao();
        http.expectOne(urlDoUsuario).flush({ sucesso: true, mensagem: 'ok', dados: usuarioGestor() });

        expect(navegar).not.toHaveBeenCalled();
    });

    it('reconferirAposAcessoNegado pede uma vez e uma rajada de 403 não repete antes do intervalo', () => {
        const { http, servico } = entrarGestor();
        const relogio = vi.spyOn(Date, 'now').mockReturnValue(1_000_000);

        servico.reconferirAposAcessoNegado();
        http.expectOne(urlDoUsuario).flush({ sucesso: true, mensagem: 'ok', dados: usuarioGestor() });
        servico.reconferirAposAcessoNegado();
        http.expectNone(urlDoUsuario);

        relogio.mockReturnValue(1_000_000 + 6_000);
        servico.reconferirAposAcessoNegado();
        http.expectOne(urlDoUsuario).flush({ sucesso: true, mensagem: 'ok', dados: usuarioGestor() });
        relogio.mockRestore();
    });
});

describe('usuarioAutenticado (signal)', () => {
    it('começa nulo e guarda o usuário que lhe derem', () => {
        expect(usuarioAutenticado()).toBeNull();
        usuarioAutenticado.set(criarUsuarioTeste());
        expect(usuarioAutenticado()?.tipo).toBe(TipoUsuarioEnum.DESENVOLVEDOR);
        usuarioAutenticado.set(null);
    });
});
