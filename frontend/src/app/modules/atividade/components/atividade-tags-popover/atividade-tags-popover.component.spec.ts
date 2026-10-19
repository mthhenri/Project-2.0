import { describe, it, expect } from 'vitest';
import { montarComponente } from '../../../../../testes/montar-componente';
import { AtividadeTagsPopoverComponent } from './atividade-tags-popover.component';

// Seletor de tags em popover: não salva a cada clique; ao fechar emite os ids marcados, mas só se o conjunto mudou.

const TAGS = [{ id: 1, nome: 'Backend', cor: '#112233' }, { id: 2, nome: 'Frontend', cor: '#445566' }, { id: 3, nome: 'Infra', cor: '#778899' }];

async function montar(entradas: Record<string, unknown> = {}) {
  const montado = await montarComponente(AtividadeTagsPopoverComponent, { entradas: { tags: TAGS, ...entradas } });
  const emitidos: number[][] = [];
  montado.componente.salvar.subscribe((ids) => emitidos.push(ids));
  return { montado, emitidos };
}

describe('AtividadeTagsPopoverComponent', () => {
  it('abrir marca as tags recebidas', async () => {
    const { montado } = await montar();
    montado.componente.abrir(new MouseEvent('click'), document.body, [1, 3]);
    expect(montado.componente.estaMarcada(1)).toBe(true);
    expect(montado.componente.estaMarcada(2)).toBe(false);
    expect(montado.componente.estaMarcada(3)).toBe(true);
  });

  it('alternar marca e desmarca sem emitir nada enquanto o popover está aberto', async () => {
    const { montado, emitidos } = await montar();
    montado.componente.abrir(new MouseEvent('click'), document.body, []);
    montado.componente.alternar(2);
    expect(montado.componente.selecionadas()).toEqual([2]);
    montado.componente.alternar(2);
    expect(montado.componente.selecionadas()).toEqual([]);
    expect(emitidos).toEqual([]);
  });

  it('ao fechar com o conjunto alterado emite os ids marcados', async () => {
    const { montado, emitidos } = await montar();
    montado.componente.abrir(new MouseEvent('click'), document.body, [1]);
    montado.componente.alternar(2);
    montado.componente.aoFechar();
    expect(emitidos).toEqual([[1, 2]]);
  });

  it('ao fechar sem mudança não emite (nem quando só a ordem da marcação mudou)', async () => {
    const { montado, emitidos } = await montar();
    montado.componente.abrir(new MouseEvent('click'), document.body, [1, 2]);
    montado.componente.alternar(1);
    montado.componente.alternar(1);
    montado.componente.aoFechar();
    expect(emitidos).toEqual([]);
  });

  it('desmarcar tudo emite o conjunto vazio', async () => {
    const { montado, emitidos } = await montar();
    montado.componente.abrir(new MouseEvent('click'), document.body, [1]);
    montado.componente.alternar(1);
    montado.componente.aoFechar();
    expect(emitidos).toEqual([[]]);
  });

  it('com a seleção exigida, desmarcar tudo não emite (acrescentar em massa não faz nada com o conjunto vazio)', async () => {
    const { montado, emitidos } = await montar({ exigirSelecao: true });
    montado.componente.abrir(new MouseEvent('click'), document.body, [1]);
    montado.componente.alternar(1);
    montado.componente.aoFechar();
    expect(emitidos).toEqual([]);
  });

  it('reabrir recomeça do que foi passado, descartando marcações não salvas', async () => {
    const { montado, emitidos } = await montar();
    montado.componente.abrir(new MouseEvent('click'), document.body, [1]);
    montado.componente.alternar(3);
    montado.componente.abrir(new MouseEvent('click'), document.body, [2]);
    expect(montado.componente.selecionadas()).toEqual([2]);
    montado.componente.aoFechar();
    expect(emitidos).toEqual([]);
  });
});
