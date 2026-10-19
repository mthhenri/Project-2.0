import { describe, it, expect, vi, afterEach } from 'vitest';
import { ExecucaoItemDto, IntervaloDto, PontoDiarioDto, TipoUsuarioEnum } from '@project20/shared';
import { TestBed } from '@angular/core/testing';
import { montarComponente as montarSemReinicio } from '../../../../testes/montar-componente';
import { PontoResumoCardComponent } from './ponto-resumo-card/ponto-resumo-card.component';
import { PontoIntervaloListaComponent } from './ponto-intervalo-lista/ponto-intervalo-lista.component';
import { PontoUsuarioCardComponent } from './ponto-usuario-card/ponto-usuario-card.component';

// Vários componentes por teste: cada montagem recomeça o TestBed.
const montarComponente: typeof montarSemReinicio = (componente, opcoes) => {
  TestBed.resetTestingModule();
  return montarSemReinicio(componente, opcoes);
};

// O cronômetro da execução aberta usa setInterval, que deixaria a zona instável: só os intervalos são falsos.
afterEach(() => vi.useRealTimers());

const texto = (elemento: HTMLElement) => (elemento.textContent ?? '').replace(/\s+/g, ' ').trim();

describe('PontoResumoCardComponent', () => {
  it('mostra rótulo e valor, e o ícone só quando informado', async () => {
    const semIcone = await montarComponente(PontoResumoCardComponent, { entradas: { rotulo: 'Meta do mês', valor: '160h' } });
    expect(texto(semIcone.elemento)).toBe('Meta do mês160h');
    expect(semIcone.elemento.querySelector('i')).toBeNull();

    const comIcone = await montarComponente(PontoResumoCardComponent, { entradas: { rotulo: 'Meta', valor: '8h', icone: 'pi pi-flag' } });
    expect(comIcone.elemento.querySelector('i.pi-flag')).not.toBeNull();
  });

  it('a cor do valor segue a variante (positivo verde, negativo vermelho, primário, neutro)', async () => {
    const classeDe = async (cor: string) => {
      const montado = await montarComponente(PontoResumoCardComponent, { entradas: { rotulo: 'x', valor: 'y', cor } });
      return montado.elemento.querySelector('span.text-2xl')!.className;
    };
    expect(await classeDe('positivo')).toContain('text-green-600');
    expect(await classeDe('negativo')).toContain('text-red-600');
    expect(await classeDe('primario')).toContain('--p-primary-color');
    expect(await classeDe('neutro')).toContain('text-color');
  });
});

describe('PontoIntervaloListaComponent', () => {
  const intervalo = (duracaoMinutos: number): IntervaloDto => ({
    inicioData: new Date(2026, 2, 2, 12, 0), fimData: new Date(2026, 2, 2, 12, duracaoMinutos), duracaoMinutos,
  });

  it('sem intervalos mostra o estado vazio e o mínimo no título', async () => {
    const montado = await montarComponente(PontoIntervaloListaComponent, { entradas: { intervalos: [], minutoMinimo: 15 } });
    expect(texto(montado.elemento)).toContain('Intervalos detectados (≥ 15 min)');
    expect(texto(montado.elemento)).toContain('Nenhum intervalo detectado no dia.');
    expect(montado.elemento.querySelector('li')).toBeNull();
  });

  it('com intervalos lista cada um com horário e duração', async () => {
    const montado = await montarComponente(PontoIntervaloListaComponent, { entradas: { intervalos: [intervalo(30), intervalo(45)], minutoMinimo: 15 } });
    const itens = Array.from(montado.elemento.querySelectorAll('li')).map((item) => texto(item as HTMLElement));
    expect(itens).toHaveLength(2);
    expect(itens[0]).toContain('12:00');
    expect(itens[0]).toContain('12:30');
    expect(itens[1]).toContain('12:45');
    expect(montado.elemento.textContent).not.toContain('Nenhum intervalo');
  });
});

describe('PontoUsuarioCardComponent', () => {
  const execucao = (id: number, sobrescrita: Partial<ExecucaoItemDto> = {}) => ({
    id, atividadeId: 40 + id, nomeAtividade: `Atividade ${id}`,
    inicioData: new Date(2026, 2, 2, 9, 0), fimData: new Date(2026, 2, 2, 10, 30), duracaoMinutos: 90, ...sobrescrita,
  }) as ExecucaoItemDto;

  const ponto = (sobrescrita: Partial<PontoDiarioDto> = {}): PontoDiarioDto => ({
    data: '2026-03-02', usuarioId: 3, nomeUsuario: 'Ana Maria Souza', ehDiaUtil: true, motivoNaoUtil: null, metaMinutos: 480,
    minutosTrabalhadosDiaUtil: 90, minutosTrabalhadosExtra: 0, totalMinutosTrabalhados: 90, saldoMinutos: -390,
    intervalos: [], execucoes: [execucao(1)], ...sobrescrita,
  });

  const montar = (valor: PontoDiarioDto) => {
    vi.useFakeTimers({ toFake: ['setInterval', 'clearInterval'] });
    return montarComponente(PontoUsuarioCardComponent, { usuario: TipoUsuarioEnum.GESTOR, entradas: { ponto: valor } });
  };

  it('mostra o nome, as iniciais (duas primeiras partes), o total e a execução do dia', async () => {
    const montado = await montar(ponto());
    const html = montado.elemento;
    expect(texto(html)).toContain('Ana Maria Souza');
    expect(html.querySelector('.ponto-usuario-card__avatar')!.textContent).toBe('AM');
    expect(texto(html)).toContain('1h 30min');
    expect(texto(html)).toContain('09:00');
    expect(texto(html)).toContain('10:30');
    expect(texto(html)).toContain('Atividade 1');
  });

  it('estado: sem execuções, pausado (todas encerradas) e trabalhando (alguma aberta)', async () => {
    const vazio = await montar(ponto({ execucoes: [] }));
    expect(vazio.componente.estado).toBe('sem-registros');
    expect(texto(vazio.elemento)).toContain('Sem registros hoje');

    const pausado = await montar(ponto());
    expect(pausado.componente.estado).toBe('pausado');
    expect(texto(pausado.elemento)).toContain('Pausado');

    const trabalhando = await montar(ponto({ execucoes: [execucao(1), execucao(2, { fimData: null, duracaoMinutos: null })] }));
    expect(trabalhando.componente.estado).toBe('trabalhando');
    expect(texto(trabalhando.elemento)).toContain('Trabalhando agora');
    expect(trabalhando.elemento.querySelector('app-execucao-timer')).not.toBeNull();
  });

  it('dia útil mostra o saldo com sinal; dia não útil mostra o motivo no lugar do saldo', async () => {
    const util = await montar(ponto({ saldoMinutos: -390 }));
    expect(util.elemento.querySelector('.ponto-usuario-card__saldo--negativo')!.textContent!.trim()).toBe('-6h 30min');

    const positivo = await montar(ponto({ saldoMinutos: 20 }));
    expect(positivo.elemento.querySelector('.ponto-usuario-card__saldo--positivo')).not.toBeNull();

    const naoUtil = await montar(ponto({ ehDiaUtil: false, motivoNaoUtil: 'Feriado - Dia do Trabalho' }));
    expect(naoUtil.elemento.querySelector('.ponto-usuario-card__saldo')).toBeNull();
    expect(naoUtil.elemento.querySelector('.ponto-usuario-card__badge')!.textContent).toContain('Feriado - Dia do Trabalho');
  });

  it('o contador de pausas só aparece quando há intervalos', async () => {
    const sem = await montar(ponto());
    expect(sem.elemento.querySelector('.ponto-usuario-card__intervalos')).toBeNull();

    const intervalo: IntervaloDto = { inicioData: new Date(2026, 2, 2, 12, 0), fimData: new Date(2026, 2, 2, 13, 0), duracaoMinutos: 60 };
    const com = await montar(ponto({ intervalos: [intervalo, intervalo] }));
    expect(texto(com.elemento.querySelector('.ponto-usuario-card__intervalos') as HTMLElement)).toBe('2');
  });

  it('clicar no nome emite o usuário; clicar na atividade emite a atividade', async () => {
    const montado = await montar(ponto());
    const usuarios: number[] = [];
    const atividades: number[] = [];
    montado.componente.usuarioSelecionado.subscribe((id) => usuarios.push(id));
    montado.componente.atividadeSelecionada.subscribe((id) => atividades.push(id));

    (montado.elemento.querySelector('.ponto-usuario-card__nome') as HTMLElement).click();
    (montado.elemento.querySelector('.ponto-usuario-card__atividade') as HTMLElement).click();
    expect(usuarios).toEqual([3]);
    expect(atividades).toEqual([41]);
  });
});
