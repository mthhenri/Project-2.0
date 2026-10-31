import { describe, it, expect } from 'vitest';
import { TestBed } from '@angular/core/testing';
import { TipoAtividadeStatusEnum } from '@project20/shared';
import { montarComponente } from '../../../../../testes/montar-componente';
import { AtividadeStatusIconeComponent } from './atividade-status-icone.component';

// O status da atividade como quadradinho de checklist: cada status um desenho e uma cor.

async function icone(status: TipoAtividadeStatusEnum) {
  TestBed.resetTestingModule();
  const montado = await montarComponente(AtividadeStatusIconeComponent, { entradas: { status } });
  return montado.elemento.querySelector('svg')!;
}

describe('AtividadeStatusIconeComponent', () => {
  it('Planejada é um quadrado tracejado; Pendente, quadrado com traço; Desenvolvendo, com play; Desenvolvida, preenchido com check', async () => {
    const planejada = await icone(TipoAtividadeStatusEnum.PLANEJADA);
    expect(planejada.querySelector('rect')?.getAttribute('stroke-dasharray')).not.toBeNull();
    expect(planejada.querySelectorAll('path').length).toBe(0);

    const pendente = await icone(TipoAtividadeStatusEnum.PENDENTE);
    expect(pendente.querySelector('path')?.getAttribute('d')).toBe('M8 12h8');

    const desenvolvendo = await icone(TipoAtividadeStatusEnum.DESENVOLVENDO);
    expect(desenvolvendo.querySelector('path')?.getAttribute('fill')).toBe('currentColor');

    const desenvolvida = await icone(TipoAtividadeStatusEnum.DESENVOLVIDA);
    expect(desenvolvida.querySelector('rect')?.getAttribute('fill')).toBe('currentColor');
    expect(desenvolvida.querySelector('.atividade-status-icone__marca')).not.toBeNull();
  });

  it('a cor vem do mapa do status e Desenvolvendo usa a cor do tema', async () => {
    expect((await icone(TipoAtividadeStatusEnum.DESENVOLVENDO)).style.color).toBe('var(--app-realce-primario)');
    expect((await icone(TipoAtividadeStatusEnum.DESENVOLVIDA)).style.color).toBe('var(--p-green-500)');
  });
});
