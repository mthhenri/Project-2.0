import { describe, it, expect, vi, afterEach } from 'vitest';
import { montarComponente } from '../../../../../testes/montar-componente';
import { AtividadeEmExecucaoComponent } from './atividade-em-execucao.component';

// Selo "Em execução": o cronômetro só aparece quando se conhece o início (execução do usuário logado).

describe('AtividadeEmExecucaoComponent', () => {
  afterEach(() => vi.useRealTimers());

  it('sem início mostra só o selo, sem cronômetro', async () => {
    const montado = await montarComponente(AtividadeEmExecucaoComponent);
    expect(montado.elemento.querySelector('[role="status"]')?.textContent).toContain('Em execução');
    expect(montado.elemento.querySelector('app-execucao-timer')).toBeNull();
  });

  it('com o início conhecido mostra o cronômetro compacto com o tempo decorrido', async () => {
    // O cronômetro usa setInterval, que deixaria a zona instável para sempre: só os intervalos são falsos.
    vi.useFakeTimers({ toFake: ['setInterval', 'clearInterval'] });
    const inicio = new Date(Date.now() - 3_725_000);
    const montado = await montarComponente(AtividadeEmExecucaoComponent, { entradas: { inicio } });
    const cronometro = montado.elemento.querySelector('app-execucao-timer');
    expect(cronometro).not.toBeNull();
    expect(cronometro!.textContent).toMatch(/01:02:0\d/);
  });
});
