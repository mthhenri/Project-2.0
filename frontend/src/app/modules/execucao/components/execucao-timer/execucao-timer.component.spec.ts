import { describe, it, expect, vi, afterEach } from 'vitest';
import { montarComponente } from '../../../../../testes/montar-componente';
import { ExecucaoTimerComponent } from './execucao-timer.component';

// O cronômetro usa setInterval, que deixaria a zona instável para sempre: só os intervalos são falsos.
// Date.now() segue real; o início é escolhido em relação a ele e a asserção tolera 1 s.

const relogio = (montado: { elemento: HTMLElement }) => montado.elemento.querySelector('span')!.textContent!.trim();

describe('ExecucaoTimerComponent', () => {
  afterEach(() => {
    vi.restoreAllMocks();
    vi.useRealTimers();
  });

  it('mostra o tempo decorrido desde o início no formato HH:mm:ss', async () => {
    vi.useFakeTimers({ toFake: ['setInterval', 'clearInterval'] });
    const montado = await montarComponente(ExecucaoTimerComponent, { entradas: { inicioData: new Date(Date.now() - 3_725_000) } });
    expect(relogio(montado)).toMatch(/^01:02:0\d$/);
  });

  it('início no futuro (relógio atrasado) não mostra tempo negativo', async () => {
    vi.useFakeTimers({ toFake: ['setInterval', 'clearInterval'] });
    const montado = await montarComponente(ExecucaoTimerComponent, { entradas: { inicioData: new Date(Date.now() + 60_000) } });
    expect(relogio(montado)).toBe('00:00:00');
  });

  it('atualiza a cada segundo', async () => {
    vi.useFakeTimers({ toFake: ['setInterval', 'clearInterval'] });
    const montado = await montarComponente(ExecucaoTimerComponent, { entradas: { inicioData: new Date(Date.now() - 10_000) } });
    const antes = montado.componente.tempoDecorrido();
    vi.spyOn(Date, 'now').mockReturnValue(Date.now() + 5_000);
    vi.advanceTimersByTime(1000);
    expect(montado.componente.tempoDecorrido()).not.toBe(antes);
    expect(montado.componente.tempoDecorrido()).toMatch(/^00:00:1[4-6]$/);
  });

  it('ao destruir o componente o intervalo é cancelado', async () => {
    vi.useFakeTimers({ toFake: ['setInterval', 'clearInterval'] });
    const montado = await montarComponente(ExecucaoTimerComponent, { entradas: { inicioData: new Date(Date.now() - 10_000) } });
    expect(vi.getTimerCount()).toBe(1);
    montado.fixture.destroy();
    expect(vi.getTimerCount()).toBe(0);
  });

  it('tamanho compacto usa o texto pequeno em vez do grande', async () => {
    vi.useFakeTimers({ toFake: ['setInterval', 'clearInterval'] });
    const montado = await montarComponente(ExecucaoTimerComponent, { entradas: { inicioData: new Date(), tamanho: 'compacto' } });
    const classes = montado.elemento.querySelector('span')!.classList;
    expect(classes.contains('text-sm')).toBe(true);
    expect(classes.contains('text-4xl')).toBe(false);
  });
});
