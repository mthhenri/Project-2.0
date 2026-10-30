import { describe, it, expect } from 'vitest';
import { TagResumoDto } from '@project20/shared';
import { montarComponente } from '../../../../testes/montar-componente';
import { TagListaComponent } from './tag-lista.component';

const tag = (id: number, nome: string): TagResumoDto => ({ id, nome, cor: '#336699' }) as TagResumoDto;

describe('TagListaComponent', () => {
  it('mostra todas quando cabem e não põe o "+N"', async () => {
    const montado = await montarComponente(TagListaComponent, { entradas: { tags: [tag(1, 'API'), tag(2, 'Backend')] } });
    expect(Array.from(montado.elemento.querySelectorAll('.tag-lista__chip')).map((chip) => chip.textContent)).toEqual(['API', 'Backend']);
    expect(montado.elemento.querySelector('.tag-lista__mais')).toBeNull();
  });

  it('passando do máximo, mostra o limite e um "+N" que lista no rótulo as que ficaram de fora', async () => {
    const tags = ['A', 'B', 'C', 'D', 'E'].map((nome, indice) => tag(indice + 1, nome));
    const montado = await montarComponente(TagListaComponent, { entradas: { tags, maximo: 2 } });
    expect(montado.elemento.querySelectorAll('.tag-lista__chip')).toHaveLength(2);
    const mais = montado.elemento.querySelector('.tag-lista__mais')!;
    expect(mais.textContent).toBe('+3');
    expect(mais.getAttribute('aria-label')).toBe('Mais 3 tags: C, D, E');
  });

  it('no modo compacto, marca o host para o chip ficar mais estreito', async () => {
    const montado = await montarComponente(TagListaComponent, { entradas: { tags: [tag(1, 'API')], compacto: true } });
    expect((montado.elemento as HTMLElement).classList.contains('tag-lista--compacto') || montado.fixture.nativeElement.classList.contains('tag-lista--compacto')).toBe(true);
  });

  it('o chip leva o nome inteiro no title (o texto longo é cortado com reticências)', async () => {
    const montado = await montarComponente(TagListaComponent, { entradas: { tags: [tag(1, 'Integração com sistemas legados')] } });
    expect(montado.elemento.querySelector('.tag-lista__chip')?.getAttribute('title')).toBe('Integração com sistemas legados');
  });
});
