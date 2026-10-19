import { describe, it, expect, beforeEach } from 'vitest';
import { TestBed } from '@angular/core/testing';
import { HttpClient, provideHttpClient, withInterceptors } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { authTokenInterceptor } from './auth-token.interceptor';

function configurar() {
  TestBed.configureTestingModule({ providers: [provideHttpClient(withInterceptors([authTokenInterceptor])), provideHttpClientTesting()] });
  return { http: TestBed.inject(HttpClient), controlador: TestBed.inject(HttpTestingController) };
}

beforeEach(() => localStorage.clear());

describe('authTokenInterceptor', () => {
  it('com token, a chamada da API leva Authorization: Bearer', () => {
    localStorage.setItem('access_token', 'meu-token');
    const { http, controlador } = configurar();
    http.get('/api/v1/usuario').subscribe();
    expect(controlador.expectOne('/api/v1/usuario').request.headers.get('Authorization')).toBe('Bearer meu-token');
  });

  it('sem token, a chamada segue sem cabeçalho', () => {
    const { http, controlador } = configurar();
    http.get('/api/v1/usuario').subscribe();
    expect(controlador.expectOne('/api/v1/usuario').request.headers.has('Authorization')).toBe(false);
  });

  it('o login nunca leva o token, mesmo havendo um guardado', () => {
    localStorage.setItem('access_token', 'velho');
    const { http, controlador } = configurar();
    http.post('/api/v1/autenticacao/login', {}).subscribe();
    expect(controlador.expectOne('/api/v1/autenticacao/login').request.headers.has('Authorization')).toBe(false);
  });

  it('não manda o token a outro host', () => {
    localStorage.setItem('access_token', 'meu-token');
    const { http, controlador } = configurar();
    http.get('https://terceiro.exemplo.com/dados').subscribe();
    expect(controlador.expectOne('https://terceiro.exemplo.com/dados').request.headers.has('Authorization')).toBe(false);
  });

});
