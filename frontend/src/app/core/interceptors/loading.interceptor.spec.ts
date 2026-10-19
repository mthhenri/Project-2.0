import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { TestBed } from '@angular/core/testing';
import { HttpClient, provideHttpClient, withInterceptors } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { comFeedbackProprio, loadingInterceptor } from './loading.interceptor';
import { carregamento } from '../signals/carregamento.signal';

let http: HttpClient;
let controlador: HttpTestingController;

beforeEach(() => {
  vi.useFakeTimers();
  carregamento.set(false);
  TestBed.configureTestingModule({
    providers: [provideHttpClient(withInterceptors([loadingInterceptor])), provideHttpClientTesting()],
  });
  http = TestBed.inject(HttpClient);
  controlador = TestBed.inject(HttpTestingController);
});

afterEach(() => {
  // Encerra o que sobrou para não vazar a contagem (estado de módulo) ao próximo teste.
  for (const pendente of controlador.match(() => true)) {
    if (!pendente.cancelled) pendente.flush({});
  }
  vi.useRealTimers();
});

describe('loadingInterceptor', () => {
  it('mutação lenta liga o overlay só depois de 250 ms e desliga ao terminar', () => {
    http.post('/api/v1/x', {}).subscribe();
    expect(carregamento()).toBe(false);

    vi.advanceTimersByTime(249);
    expect(carregamento()).toBe(false);
    vi.advanceTimersByTime(1);
    expect(carregamento()).toBe(true);

    controlador.expectOne('/api/v1/x').flush({});
    expect(carregamento()).toBe(false);
  });

  it('mutação rápida (resposta antes de 250 ms) nunca acende o overlay', () => {
    http.post('/api/v1/x', {}).subscribe();
    controlador.expectOne('/api/v1/x').flush({});
    vi.advanceTimersByTime(1000);
    expect(carregamento()).toBe(false);
  });

  it('GET não aciona o overlay global', () => {
    http.get('/api/v1/x').subscribe();
    vi.advanceTimersByTime(1000);
    expect(carregamento()).toBe(false);
  });

  it('mutação marcada com feedback próprio (SEM_OVERLAY_GLOBAL) não aciona o overlay', () => {
    http.post('/api/v1/x', {}, comFeedbackProprio()).subscribe();
    vi.advanceTimersByTime(1000);
    expect(carregamento()).toBe(false);
  });

  it('com várias mutações simultâneas, só apaga quando a última termina', () => {
    http.post('/api/v1/a', {}).subscribe();
    http.patch('/api/v1/b', {}).subscribe();
    vi.advanceTimersByTime(300);
    expect(carregamento()).toBe(true);

    controlador.expectOne('/api/v1/a').flush({});
    expect(carregamento()).toBe(true);
    controlador.expectOne('/api/v1/b').flush({});
    expect(carregamento()).toBe(false);
  });

  it('requisição que falha também decrementa e apaga o overlay', () => {
    http.delete('/api/v1/x').subscribe({ error: () => undefined });
    vi.advanceTimersByTime(300);
    expect(carregamento()).toBe(true);

    controlador.expectOne('/api/v1/x').flush(null, { status: 500, statusText: 'x' });
    expect(carregamento()).toBe(false);
  });

  it('requisição cancelada (unsubscribe) também apaga o overlay', () => {
    const assinatura = http.post('/api/v1/x', {}).subscribe();
    vi.advanceTimersByTime(300);
    expect(carregamento()).toBe(true);
    assinatura.unsubscribe();
    expect(carregamento()).toBe(false);
  });

  it('uma nova rajada depois de terminar volta a exigir os 250 ms', () => {
    http.post('/api/v1/a', {}).subscribe();
    controlador.expectOne('/api/v1/a').flush({});

    http.post('/api/v1/b', {}).subscribe();
    vi.advanceTimersByTime(100);
    expect(carregamento()).toBe(false);
    vi.advanceTimersByTime(150);
    expect(carregamento()).toBe(true);
  });
});
