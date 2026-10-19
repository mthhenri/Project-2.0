import { describe, it, expect } from 'vitest';
import { TipoAtividadeStatusEnum } from '@project20/shared';
import { montarComponente } from '../../../../../testes/montar-componente';
import { AtividadeBarraEmMassaComponent } from './atividade-barra-em-massa.component';

const TAGS = [{ id: 1, nome: 'Bug', cor: '#ff0000' }, { id: 2, nome: 'Dívida', cor: '#00ff00' }];

async function montar(entradas: Record<string, unknown> = {}) {
  const montado = await montarComponente(AtividadeBarraEmMassaComponent, { entradas: { quantidade: 2, tags: TAGS, ...entradas } });
  const emitidos = { status: [] as TipoAtividadeStatusEnum[], tags: [] as number[][], excluir: 0, limpar: 0, precisaDasTags: 0 };
  montado.componente.mudarStatus.subscribe((status) => emitidos.status.push(status));
  montado.componente.acrescentarTags.subscribe((ids) => emitidos.tags.push(ids));
  montado.componente.excluir.subscribe(() => emitidos.excluir++);
  montado.componente.limpar.subscribe(() => emitidos.limpar++);
  montado.componente.precisaDasTags.subscribe(() => emitidos.precisaDasTags++);
  return { montado, emitidos };
}

const botao = (elemento: HTMLElement, rotulo: string) =>
  Array.from(elemento.querySelectorAll('button')).find((item) => (item.textContent ?? '').includes(rotulo) || item.getAttribute('aria-label') === rotulo) as HTMLButtonElement;

describe('AtividadeBarraEmMassaComponent', () => {
  it('mostra a contagem no plural e no singular', async () => {
    const { montado } = await montar({ quantidade: 3 });
    expect(montado.elemento.querySelector('.atividade-barra__contagem')?.textContent).toContain('3 selecionadas');
    montado.fixture.componentRef.setInput('quantidade', 1);
    await montado.atualizar();
    expect(montado.elemento.querySelector('.atividade-barra__contagem')?.textContent).toContain('1 selecionada');
    expect(montado.elemento.querySelector('.atividade-barra__contagem')?.textContent).not.toContain('selecionadas');
  });

  it('oferece as ações em massa como barra de ferramentas', async () => {
    const { montado } = await montar();
    expect(montado.elemento.querySelector('[role="toolbar"]')).not.toBeNull();
    for (const rotulo of ['Mudar status', 'Acrescentar tags', 'Excluir', 'Limpar seleção']) expect(botao(montado.elemento, rotulo)).toBeDefined();
  });

  it('Excluir e Limpar seleção só emitem o pedido; quem aplica é a tela', async () => {
    const { montado, emitidos } = await montar();
    botao(montado.elemento, 'Excluir').click();
    botao(montado.elemento, 'Limpar seleção').click();
    expect(emitidos.excluir).toBe(1);
    expect(emitidos.limpar).toBe(1);
  });

  it('escolher um status emite o status; uma opção sem valor é ignorada', async () => {
    const { montado, emitidos } = await montar();
    montado.componente.escolherStatus(TipoAtividadeStatusEnum.DESENVOLVENDO);
    montado.componente.escolherStatus(null);
    expect(emitidos.status).toEqual([TipoAtividadeStatusEnum.DESENVOLVENDO]);
  });

  it('abrir o seletor de status lista os quatro status da atividade', async () => {
    const { montado } = await montar();
    botao(montado.elemento, 'Mudar status').click();
    await montado.atualizar();
    const opcoes = Array.from(document.body.querySelectorAll('.atividade-barra__status-opcao')).map((item) => item.textContent?.trim());
    expect(opcoes).toEqual(['Pendente', 'Planejada', 'Desenvolvendo', 'Desenvolvida']);
  });

  it('abrir o seletor de tags pede as tags à tela (que as carrega uma vez)', async () => {
    const { montado, emitidos } = await montar();
    botao(montado.elemento, 'Acrescentar tags').click();
    await montado.atualizar();
    expect(emitidos.precisaDasTags).toBe(1);
  });

  it('com uma ação em andamento, todos os botões ficam bloqueados', async () => {
    const { montado } = await montar({ ocupado: true });
    for (const rotulo of ['Mudar status', 'Acrescentar tags', 'Excluir', 'Limpar seleção']) {
      expect(botao(montado.elemento, rotulo).disabled).toBe(true);
    }
  });

  it('sem ação em andamento, os botões ficam livres', async () => {
    const { montado } = await montar({ ocupado: false });
    for (const rotulo of ['Mudar status', 'Acrescentar tags', 'Excluir', 'Limpar seleção']) {
      expect(botao(montado.elemento, rotulo).disabled).toBe(false);
    }
  });
});
