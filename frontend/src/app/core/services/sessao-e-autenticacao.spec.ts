import { describe, it, expect, beforeEach } from 'vitest';
import { TestBed } from '@angular/core/testing';
import { Router, provideRouter } from '@angular/router';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TipoUsuarioEnum } from '@project20/shared';
import { AutenticacaoService } from './autenticacao.service';
import { UsuarioSessaoService } from './usuario-sessao.service';
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
    dados: { accessToken: 'token-novo', tipo: 'Bearer', usuario: { id: 1, login: 'maria', nomeCompleto: 'Maria', tipo: TipoUsuarioEnum.GESTOR } },
  };

  it('login chama o endpoint com o corpo certo e guarda o token e a sessão', () => {
    const servico = TestBed.inject(AutenticacaoService);
    const http = TestBed.inject(HttpTestingController);
    servico.login({ login: 'maria', senha: 'x' }).subscribe();
    const requisicao = http.expectOne((r) => r.url.endsWith('/autenticacao/login'));
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
    http.expectOne((r) => r.url.endsWith('/autenticacao/login')).flush(
      { sucesso: false, mensagem: 'Credenciais inválidas' }, { status: 400, statusText: 'Bad Request' });
    expect(localStorage.getItem('access_token')).toBeNull();
    expect(servico.estaAutenticado()).toBe(false);
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
    const requisicao = http.expectOne((r) => r.url.endsWith(`/usuario/${sessaoSalva().id}`));
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
    http.expectOne((r) => r.url.endsWith(`/usuario/${sessaoSalva().id}`)).flush({}, { status: 500, statusText: 'Erro' });

    expect(sessao.eGestor()).toBe(true);
  });

  it('descarta a resposta se o usuário da sessão mudou enquanto ela voltava', () => {
    localStorage.setItem('access_token', 'abc');
    const sessao = TestBed.inject(UsuarioSessaoService);
    sessao.definirUsuario(sessaoSalva());
    const http = TestBed.inject(HttpTestingController);

    TestBed.inject(AutenticacaoService).atualizarSessao();
    const requisicao = http.expectOne((r) => r.url.endsWith(`/usuario/${sessaoSalva().id}`));
    sessao.limpar();
    requisicao.flush({ sucesso: true, mensagem: 'ok', dados: sessaoSalva() });

    expect(sessao.usuarioAtual()).toBeNull();
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
