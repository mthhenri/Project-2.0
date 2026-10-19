import { describe, it, expect } from 'vitest';
import { montarComponente } from '../../../../testes/montar-componente';
import { BarraRecargaComponent } from './barra-recarga.component';

// Barra fina de recarga: só existe enquanto a recarga acontece e se anuncia como "Atualizando" para leitores de tela.

describe('BarraRecargaComponent', () => {
  it('inativa não renderiza nada', async () => {
    const montado = await montarComponente(BarraRecargaComponent);
    expect(montado.elemento.querySelector('[role="progressbar"]')).toBeNull();
  });

  it('ativa mostra a barra de progresso "Atualizando", ocupada', async () => {
    const montado = await montarComponente(BarraRecargaComponent, { entradas: { ativa: true } });
    const barra = montado.elemento.querySelector('[role="progressbar"]');
    expect(barra?.getAttribute('aria-label')).toBe('Atualizando');
    expect(barra?.getAttribute('aria-busy')).toBe('true');
  });

  it('some quando a recarga termina', async () => {
    const montado = await montarComponente(BarraRecargaComponent, { entradas: { ativa: true } });
    montado.fixture.componentRef.setInput('ativa', false);
    await montado.atualizar();
    expect(montado.elemento.querySelector('[role="progressbar"]')).toBeNull();
  });
});
