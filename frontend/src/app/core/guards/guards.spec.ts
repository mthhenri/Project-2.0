import { describe, it, expect, beforeEach } from 'vitest';
import { TestBed } from '@angular/core/testing';
import { ActivatedRouteSnapshot, Router, RouterStateSnapshot, UrlTree, provideRouter } from '@angular/router';
import { TipoUsuarioEnum } from '@project20/shared';
import { administradorGuard } from './administrador.guard';
import { autenticacaoGuard, somentePublicoGuard } from './autenticacao.guard';
import { gestorGuard } from './gestor.guard';
import { UsuarioSessaoService } from '../services/usuario-sessao.service';
import { criarUsuarioTeste } from '../../../testes/usuarios-teste';

// Guards de rota: redirecionam em vez de bloquear em silêncio (SYSTEM.SPEC.md §11).

const rota = {} as ActivatedRouteSnapshot;
const estado = (url: string) => ({ url }) as RouterStateSnapshot;

function executar(guard: typeof gestorGuard, url = '/qualquer'): boolean | UrlTree {
  return TestBed.runInInjectionContext(() => guard(rota, estado(url))) as boolean | UrlTree;
}

const serializar = (arvore: boolean | UrlTree) => TestBed.inject(Router).serializeUrl(arvore as UrlTree);

function entrarComo(tipo: TipoUsuarioEnum): void {
  TestBed.inject(UsuarioSessaoService).definirUsuario(criarUsuarioTeste(tipo));
}

beforeEach(() => {
  localStorage.clear();
  TestBed.configureTestingModule({ providers: [provideRouter([])] });
});

describe('autenticacaoGuard', () => {
  it('com token deixa passar', () => {
    localStorage.setItem('access_token', 'abc');
    expect(executar(autenticacaoGuard)).toBe(true);
  });

  it('sem token manda ao login levando a tela de origem em returnUrl', () => {
    expect(serializar(executar(autenticacaoGuard, '/demanda/5'))).toBe('/autenticacao?returnUrl=%2Fdemanda%2F5');
  });

  it('sem token e vindo da raiz ou do próprio login não leva returnUrl', () => {
    for (const url of ['/', '/autenticacao']) {
      expect(serializar(executar(autenticacaoGuard, url))).toBe('/autenticacao');
    }
  });
});

describe('somentePublicoGuard', () => {
  it('sem token deixa ver a tela pública (login)', () => {
    expect(executar(somentePublicoGuard)).toBe(true);
  });

  it('com token manda para a raiz', () => {
    localStorage.setItem('access_token', 'abc');
    expect(serializar(executar(somentePublicoGuard))).toBe('/');
  });
});

describe('gestorGuard', () => {
  it('gestor e administrador passam', () => {
    for (const tipo of [TipoUsuarioEnum.GESTOR, TipoUsuarioEnum.ADMINISTRADOR]) {
      entrarComo(tipo);
      expect(executar(gestorGuard), tipo).toBe(true);
    }
  });

  it('anônimo e desenvolvedor são redirecionados para a raiz', () => {
    expect(serializar(executar(gestorGuard))).toBe('/');
    entrarComo(TipoUsuarioEnum.DESENVOLVEDOR);
    expect(serializar(executar(gestorGuard))).toBe('/');
  });
});

describe('administradorGuard', () => {
  it('só o administrador passa', () => {
    entrarComo(TipoUsuarioEnum.ADMINISTRADOR);
    expect(executar(administradorGuard)).toBe(true);
  });

  it('gestor e desenvolvedor são redirecionados para a raiz', () => {
    for (const tipo of [TipoUsuarioEnum.GESTOR, TipoUsuarioEnum.DESENVOLVEDOR]) {
      entrarComo(tipo);
      expect(serializar(executar(administradorGuard)), tipo).toBe('/');
    }
  });
});
