import { describe, it, expect, beforeEach, vi } from 'vitest';
import { TestBed } from '@angular/core/testing';
import { HttpClient, provideHttpClient, withInterceptors } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { execucaoAtivaInterceptor } from './execucao-ativa.interceptor';
import { ExecucaoAtivaService } from '../services/execucao-ativa.service';

let http: HttpClient;
let controlador: HttpTestingController;
const carregar = vi.fn();

beforeEach(() => {
  carregar.mockClear();
  TestBed.configureTestingModule({
    providers: [
      provideHttpClient(withInterceptors([execucaoAtivaInterceptor])),
      provideHttpClientTesting(),
      { provide: ExecucaoAtivaService, useValue: { carregar } },
    ],
  });
  http = TestBed.inject(HttpClient);
  controlador = TestBed.inject(HttpTestingController);
});

describe('execucaoAtivaInterceptor', () => {
  it('iniciar (POST /execucao) bem-sucedido ressincroniza a execução ativa', () => {
    http.post('/api/v1/execucao', {}).subscribe();
    expect(carregar).not.toHaveBeenCalled();
    controlador.expectOne('/api/v1/execucao').flush({});
    expect(carregar).toHaveBeenCalledTimes(1);
  });

  it('encerrar (PATCH /execucao/:id/encerrar) bem-sucedido ressincroniza a execução ativa', () => {
    http.patch('/api/v1/execucao/12/encerrar', {}).subscribe();
    controlador.expectOne('/api/v1/execucao/12/encerrar').flush({});
    expect(carregar).toHaveBeenCalledTimes(1);
  });

  it.each(['confirmar', 'desfazer'])('%s uma proposta da IA bem-sucedido ressincroniza a execução ativa (P-020)', (acao) => {
    http.post(`/api/v1/proposta-ia/5/${acao}`, {}).subscribe();
    controlador.expectOne(`/api/v1/proposta-ia/5/${acao}`).flush({});
    expect(carregar).toHaveBeenCalledTimes(1);
  });

  it('resposta com erro não ressincroniza', () => {
    http.post('/api/v1/execucao', {}).subscribe({ error: () => undefined });
    controlador.expectOne('/api/v1/execucao').flush({}, { status: 409, statusText: 'Conflict' });
    http.patch('/api/v1/execucao/12/encerrar', {}).subscribe({ error: () => undefined });
    controlador.expectOne('/api/v1/execucao/12/encerrar').flush({}, { status: 400, statusText: 'Bad' });
    expect(carregar).not.toHaveBeenCalled();
  });

  it.each([
    ['GET', '/api/v1/execucao'],
    ['GET', '/api/v1/execucao/ativa'],
    ['POST', '/api/v1/execucao/registro'],
    ['PUT', '/api/v1/execucao/12'],
    ['PATCH', '/api/v1/execucao/12'],
    ['POST', '/api/v1/execucao/12/encerrar'],
    ['PATCH', '/api/v1/atividade/12/encerrar'],
    ['POST', '/api/v1/atividade'],
    ['POST', '/api/v1/proposta-ia/5/recusar'],
    ['POST', '/api/v1/proposta-ia/5/ajustar'],
    ['GET', '/api/v1/proposta-ia/5'],
  ])('%s %s não ressincroniza', (metodo, url) => {
    http.request(metodo, url, { body: {} }).subscribe();
    controlador.expectOne(url).flush({});
    expect(carregar).not.toHaveBeenCalled();
  });
});
