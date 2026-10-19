import { afterEach, describe, it, expect } from 'vitest';
import { carregamento } from '../../../core/signals/carregamento.signal';
import { montarComponente } from '../../../../testes/montar-componente';
import { LoadingSpinnerComponent } from './loading-spinner.component';

// O spinner global acompanha o sinal `carregamento` (ligado pelo interceptor de carregamento).

afterEach(() => carregamento.set(false));

describe('LoadingSpinnerComponent', () => {
  it('sem carregamento em curso não renderiza o overlay', async () => {
    carregamento.set(false);
    const montado = await montarComponente(LoadingSpinnerComponent);
    expect(montado.elemento.querySelector('.loading-spinner')).toBeNull();
  });

  it('aparece enquanto há carregamento e some quando termina', async () => {
    carregamento.set(true);
    const montado = await montarComponente(LoadingSpinnerComponent);
    expect(montado.elemento.querySelector('.loading-spinner')).not.toBeNull();

    carregamento.set(false);
    await montado.atualizar();
    expect(montado.elemento.querySelector('.loading-spinner')).toBeNull();
  });
});
