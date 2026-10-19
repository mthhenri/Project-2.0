import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { TestBed } from '@angular/core/testing';
import { of } from 'rxjs';
import { MessageService } from 'primeng/api';
import { DesfazerService, OfertaDesfazer, VIDA_TOAST_DESFAZER_MS } from './desfazer.service';

let servico: DesfazerService;
const adicionar = vi.fn();

function oferta(extra: Partial<OfertaDesfazer> = {}): OfertaDesfazer {
  return { mensagem: 'Tag excluída', desfazer: vi.fn(() => of({})), ...extra };
}

beforeEach(() => {
  vi.useFakeTimers();
  adicionar.mockClear();
  TestBed.configureTestingModule({ providers: [{ provide: MessageService, useValue: { add: adicionar } }] });
  servico = TestBed.inject(DesfazerService);
});

afterEach(() => vi.useRealTimers());

describe('DesfazerService', () => {
  it('a oferta fica disponível por 6 s e some sozinha, avisando aoEncerrar', () => {
    const aoEncerrar = vi.fn();
    const atual = oferta({ aoEncerrar });
    servico.oferecer(atual);
    expect(servico.oferta()).toBe(atual);

    vi.advanceTimersByTime(VIDA_TOAST_DESFAZER_MS - 1);
    expect(servico.oferta()).toBe(atual);
    expect(aoEncerrar).not.toHaveBeenCalled();

    vi.advanceTimersByTime(1);
    expect(servico.oferta()).toBeNull();
    expect(aoEncerrar).toHaveBeenCalledTimes(1);
  });

  it('duracaoMs personalizada substitui os 6 s padrão', () => {
    servico.oferecer(oferta({ duracaoMs: 1000 }));
    vi.advanceTimersByTime(1000);
    expect(servico.oferta()).toBeNull();
  });

  it('uma nova oferta substitui a anterior, que é encerrada (confirma a ação) e perde o prazo', () => {
    const encerrarPrimeira = vi.fn();
    const primeira = oferta({ aoEncerrar: encerrarPrimeira });
    const segunda = oferta();
    servico.oferecer(primeira);
    vi.advanceTimersByTime(4000);
    servico.oferecer(segunda);

    expect(encerrarPrimeira).toHaveBeenCalledTimes(1);
    expect(servico.oferta()).toBe(segunda);

    // O prazo da primeira (restavam 2 s) não pode derrubar a segunda.
    vi.advanceTimersByTime(2500);
    expect(servico.oferta()).toBe(segunda);
    vi.advanceTimersByTime(VIDA_TOAST_DESFAZER_MS);
    expect(servico.oferta()).toBeNull();
  });

  it('dispensar fecha sem desfazer e avisa aoEncerrar', () => {
    const aoEncerrar = vi.fn();
    const atual = oferta({ aoEncerrar });
    servico.oferecer(atual);
    servico.dispensar();
    expect(servico.oferta()).toBeNull();
    expect(aoEncerrar).toHaveBeenCalledTimes(1);
    expect(atual.desfazer).not.toHaveBeenCalled();
  });

  it('dispensarSemEncerrar fecha sem acionar aoEncerrar nem o prazo', () => {
    const aoEncerrar = vi.fn();
    servico.oferecer(oferta({ aoEncerrar }));
    servico.dispensarSemEncerrar();
    vi.advanceTimersByTime(VIDA_TOAST_DESFAZER_MS * 2);
    expect(servico.oferta()).toBeNull();
    expect(aoEncerrar).not.toHaveBeenCalled();
  });

  it('dispensar sem oferta ativa não falha', () => {
    expect(() => servico.dispensar()).not.toThrow();
    expect(servico.oferta()).toBeNull();
  });

  it('executar reverte, roda aposDesfazer, avisa "Ação desfeita" e não chama aoEncerrar', () => {
    const aposDesfazer = vi.fn();
    const aoEncerrar = vi.fn();
    const atual = oferta({ aposDesfazer, aoEncerrar });
    servico.oferecer(atual);

    servico.executar();

    expect(atual.desfazer).toHaveBeenCalledTimes(1);
    expect(aposDesfazer).toHaveBeenCalledTimes(1);
    expect(adicionar).toHaveBeenCalledWith({ severity: 'info', summary: 'Desfeito', detail: 'Ação desfeita' });
    expect(servico.oferta()).toBeNull();
    vi.advanceTimersByTime(VIDA_TOAST_DESFAZER_MS);
    expect(aoEncerrar).not.toHaveBeenCalled();
  });

  it('mensagemAposDesfazer troca o texto e string vazia suprime o toast', () => {
    servico.oferecer(oferta({ mensagemAposDesfazer: 'Tag restaurada' }));
    servico.executar();
    expect(adicionar).toHaveBeenCalledWith({ severity: 'info', summary: 'Desfeito', detail: 'Tag restaurada' });

    adicionar.mockClear();
    servico.oferecer(oferta({ mensagemAposDesfazer: '' }));
    servico.executar();
    expect(adicionar).not.toHaveBeenCalled();
  });

  it('executar sem oferta ativa não faz nada', () => {
    servico.executar();
    expect(adicionar).not.toHaveBeenCalled();
  });
});
