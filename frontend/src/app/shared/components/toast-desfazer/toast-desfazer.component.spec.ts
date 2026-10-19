import { afterEach, describe, it, expect, vi } from 'vitest';
import { TestBed } from '@angular/core/testing';
import { of } from 'rxjs';
import { montarComponente, ComponenteMontado } from '../../../../testes/montar-componente';
import { DesfazerService, VIDA_TOAST_DESFAZER_MS } from '../../../core/services/desfazer.service';
import { ToastDesfazerComponent } from './toast-desfazer.component';

// Toast de exclusão com "Desfazer" (task 99): fica 6 s (SYSTEM.SPEC.md §14, regra 11) ou o prazo da oferta (o pad usa 7 s).
// A oferta deixa um timer pendente; por isso os testes usam fake timers e `detectChanges`, nunca `whenStable` depois de oferecer.

type Montado = ComponenteMontado<ToastDesfazerComponent>;

const texto = (montado: Montado) => montado.elemento.textContent ?? '';
const toast = (montado: Montado) => montado.elemento.querySelector('[role="status"]');
const botao = (montado: Montado, rotulo: string) =>
  Array.from(montado.elemento.querySelectorAll<HTMLButtonElement>('button')).find((candidato) => candidato.textContent?.trim() === rotulo);

afterEach(() => {
  TestBed.inject(DesfazerService).dispensarSemEncerrar();
  vi.useRealTimers();
});

describe('ToastDesfazerComponent', () => {
  it('sem oferta não mostra nada', async () => {
    const montado = await montarComponente(ToastDesfazerComponent);
    expect(toast(montado)).toBeNull();
  });

  it('mostra a mensagem da oferta com o botão "Desfazer" e o de fechar', async () => {
    vi.useFakeTimers();
    const montado = await montarComponente(ToastDesfazerComponent);
    TestBed.inject(DesfazerService).oferecer({ mensagem: 'Tag "Backend" excluída', desfazer: () => of(null) });
    montado.fixture.detectChanges();

    expect(texto(montado)).toContain('Tag "Backend" excluída');
    expect(botao(montado, 'Desfazer')).toBeTruthy();
    expect(montado.elemento.querySelector('button[aria-label="Fechar"]')).not.toBeNull();
  });

  it('usa o rótulo próprio da oferta no lugar de "Desfazer"', async () => {
    vi.useFakeTimers();
    const montado = await montarComponente(ToastDesfazerComponent);
    TestBed.inject(DesfazerService).oferecer({ mensagem: 'Não salvou', rotulo: 'Reabrir', desfazer: () => of(null) });
    montado.fixture.detectChanges();

    expect(botao(montado, 'Reabrir')).toBeTruthy();
    expect(botao(montado, 'Desfazer')).toBeUndefined();
  });

  it('"Desfazer" chama a reversão, avisa a tela e some com o toast', async () => {
    vi.useFakeTimers();
    const montado = await montarComponente(ToastDesfazerComponent);
    const reverter = vi.fn(() => of(null));
    const aposDesfazer = vi.fn();
    TestBed.inject(DesfazerService).oferecer({ mensagem: 'Tag excluída', desfazer: reverter, aposDesfazer });
    montado.fixture.detectChanges();

    botao(montado, 'Desfazer')!.click();
    montado.fixture.detectChanges();

    expect(reverter).toHaveBeenCalledTimes(1);
    expect(aposDesfazer).toHaveBeenCalledTimes(1);
    expect(toast(montado)).toBeNull();
  });

  it('"Fechar" dispensa sem desfazer e confirma a ação (aoEncerrar)', async () => {
    vi.useFakeTimers();
    const montado = await montarComponente(ToastDesfazerComponent);
    const reverter = vi.fn(() => of(null));
    const aoEncerrar = vi.fn();
    TestBed.inject(DesfazerService).oferecer({ mensagem: 'Tag excluída', desfazer: reverter, aoEncerrar });
    montado.fixture.detectChanges();

    montado.elemento.querySelector<HTMLButtonElement>('button[aria-label="Fechar"]')!.click();
    montado.fixture.detectChanges();

    expect(reverter).not.toHaveBeenCalled();
    expect(aoEncerrar).toHaveBeenCalledTimes(1);
    expect(toast(montado)).toBeNull();
  });

  it('o prazo padrão é de 6 s: antes disso o toast fica, depois some e confirma a ação', async () => {
    vi.useFakeTimers();
    const montado = await montarComponente(ToastDesfazerComponent);
    const aoEncerrar = vi.fn();
    TestBed.inject(DesfazerService).oferecer({ mensagem: 'Tag excluída', desfazer: () => of(null), aoEncerrar });

    vi.advanceTimersByTime(VIDA_TOAST_DESFAZER_MS - 1);
    montado.fixture.detectChanges();
    expect(VIDA_TOAST_DESFAZER_MS).toBe(6000);
    expect(toast(montado)).not.toBeNull();
    expect(aoEncerrar).not.toHaveBeenCalled();

    vi.advanceTimersByTime(1);
    montado.fixture.detectChanges();
    expect(toast(montado)).toBeNull();
    expect(aoEncerrar).toHaveBeenCalledTimes(1);
  });

  it('oferta com prazo de 7 s (pad de anotações) só some aos 7 s', async () => {
    vi.useFakeTimers();
    const montado = await montarComponente(ToastDesfazerComponent);
    TestBed.inject(DesfazerService).oferecer({ mensagem: 'Seção limpa', desfazer: () => of(null), duracaoMs: 7000 });

    vi.advanceTimersByTime(6999);
    montado.fixture.detectChanges();
    expect(toast(montado)).not.toBeNull();

    vi.advanceTimersByTime(1);
    montado.fixture.detectChanges();
    expect(toast(montado)).toBeNull();
  });

  it('uma nova oferta substitui a anterior e confirma a ação da primeira', async () => {
    vi.useFakeTimers();
    const montado = await montarComponente(ToastDesfazerComponent);
    const servico = TestBed.inject(DesfazerService);
    const aoEncerrarPrimeira = vi.fn();
    servico.oferecer({ mensagem: 'Primeira excluída', desfazer: () => of(null), aoEncerrar: aoEncerrarPrimeira });
    servico.oferecer({ mensagem: 'Segunda excluída', desfazer: () => of(null) });
    montado.fixture.detectChanges();

    expect(aoEncerrarPrimeira).toHaveBeenCalledTimes(1);
    expect(texto(montado)).toContain('Segunda excluída');
    expect(texto(montado)).not.toContain('Primeira excluída');
  });
});
