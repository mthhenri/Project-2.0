import { describe, it, expect, vi, afterEach } from 'vitest';
import { TestBed } from '@angular/core/testing';
import { Popover } from 'primeng/popover';
import { ExecucaoItemDto, TipoUsuarioEnum } from '@project20/shared';
import { montarComponente } from '../../../../../testes/montar-componente';
import { ExecucaoAgoraComponent, ExecucaoPausaPedida } from './execucao-agora.component';

// O cronômetro usa setInterval, que deixaria a zona instável: só os intervalos são falsos.
vi.useFakeTimers({ toFake: ['setInterval', 'clearInterval'] });
afterEach(() => vi.clearAllMocks());

function criarAtiva(id: number, sobrescritas: Partial<ExecucaoItemDto> = {}): ExecucaoItemDto {
  return {
    id, atividadeId: 20 + id, nomeAtividade: `Atividade ${id}`, demandaId: 10, nomeDemanda: 'Demanda dez',
    projetoId: 5, nomeProjeto: 'Portal', descricao: `Descrição ${id}`, inicioData: new Date(Date.now() - 600_000), fimData: null,
    duracaoMinutos: null, usuarioId: 1, nomeUsuario: 'Maria Souza', ...sobrescritas,
  };
}

async function montar(entradas: { ativas: ExecucaoItemDto[]; podeIniciar?: boolean; descricaoObrigatoria?: boolean; mostrarUsuario?: boolean }) {
  TestBed.resetTestingModule();
  return montarComponente(ExecucaoAgoraComponent, { usuario: TipoUsuarioEnum.DESENVOLVEDOR, entradas });
}

const popoverFalso = () => ({ hide: vi.fn() }) as unknown as Popover;

describe('ExecucaoAgoraComponent', () => {
  it('sem execução mostra o estado vazio e o botão só quando pode iniciar', async () => {
    const semBotao = await montar({ ativas: [] });
    expect(semBotao.elemento.textContent).toContain('Nenhuma execução em andamento.');
    expect(semBotao.elemento.textContent).not.toContain('Iniciar atividade');

    const comBotao = await montar({ ativas: [], podeIniciar: true });
    const iniciar = vi.fn();
    comBotao.componente.iniciar.subscribe(iniciar);
    Array.from(comBotao.elemento.querySelectorAll('button')).find((botao) => botao.textContent?.includes('Iniciar atividade'))!.click();
    expect(iniciar).toHaveBeenCalledTimes(1);
  });

  it('o cartão traz atividade, caminho, descrição, cronômetro e o botão de pausar', async () => {
    const montado = await montar({ ativas: [criarAtiva(1)] });
    const texto = montado.elemento.textContent ?? '';
    expect(texto).toContain('Atividade 1');
    expect(texto).toContain('Portal › Demanda dez');
    expect(texto).toContain('Descrição 1');
    expect(montado.elemento.querySelector('app-execucao-timer')).not.toBeNull();
    expect(montado.elemento.querySelector('button[aria-label="Pausar execução"]')).not.toBeNull();
  });

  it('o nome da atividade pede para abrir a atividade', async () => {
    const montado = await montar({ ativas: [criarAtiva(1)] });
    const abrir = vi.fn();
    montado.componente.abrirAtividade.subscribe(abrir);
    montado.elemento.querySelector<HTMLButtonElement>('.execucao-agora__atividade')!.click();
    expect(abrir).toHaveBeenCalledWith(21);
  });

  it('pausar parte da descrição da execução e emite o texto aparado', async () => {
    const montado = await montar({ ativas: [criarAtiva(1)], descricaoObrigatoria: true });
    const pausas: ExecucaoPausaPedida[] = [];
    montado.componente.pausar.subscribe((pedido) => pausas.push(pedido));
    const popover = popoverFalso();
    montado.componente.abrirPausa(new Event('click'), criarAtiva(1), { ...popover, toggle: vi.fn(), hide: vi.fn() } as unknown as Popover);
    expect(montado.componente.descricao.value).toBe('Descrição 1');
    montado.componente.descricao.setValue('  Concluí o ajuste  ');
    montado.componente.confirmarPausa(popover);
    expect(pausas).toEqual([{ execucao: expect.objectContaining({ id: 1 }), descricao: 'Concluí o ajuste' }]);
    expect(popover.hide).toHaveBeenCalled();
  });

  it('descrição vazia bloqueia a pausa quando é obrigatória e passa quando não é', async () => {
    const obrigatoria = await montar({ ativas: [criarAtiva(1)], descricaoObrigatoria: true });
    const emitidas = vi.fn();
    obrigatoria.componente.pausar.subscribe(emitidas);
    const popover = popoverFalso();
    obrigatoria.componente.abrirPausa(new Event('click'), criarAtiva(1), { toggle: vi.fn() } as unknown as Popover);
    obrigatoria.componente.descricao.setValue('');
    obrigatoria.componente.confirmarPausa(popover);
    expect(emitidas).not.toHaveBeenCalled();

    const opcional = await montar({ ativas: [criarAtiva(1)], descricaoObrigatoria: false });
    opcional.componente.pausar.subscribe(emitidas);
    opcional.componente.abrirPausa(new Event('click'), criarAtiva(1), { toggle: vi.fn() } as unknown as Popover);
    opcional.componente.descricao.setValue('');
    opcional.componente.confirmarPausa(popover);
    expect(emitidas).toHaveBeenCalledTimes(1);
  });
});
