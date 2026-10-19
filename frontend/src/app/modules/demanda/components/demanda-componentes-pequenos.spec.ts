import { describe, it, expect } from 'vitest';
import { TipoDemandaStatusEnum, TipoUsuarioEnum } from '@project20/shared';
import { montarComponente } from '../../../../testes/montar-componente';
import { esperarRequisicao, responderErro, responderSucesso } from '../../../../testes/http-teste';
import { DemandaStatusChipComponent } from './demanda-status-chip/demanda-status-chip.component';
import { DemandaTagsCabecalhoComponent } from './demanda-tags-cabecalho/demanda-tags-cabecalho.component';
import { DemandaToolbarComponent } from './demanda-toolbar/demanda-toolbar.component';
import { DemandaMetricasComponent } from './demanda-metricas/demanda-metricas.component';
import { FILTRO_VAZIO } from '../utils/demanda-filtro.util';

const CATALOGO = [
  { id: 1, nome: 'Backend', cor: '#112233' },
  { id: 2, nome: 'Frontend', cor: '#445566' },
  { id: 3, nome: 'Infra', cor: '#778899' },
];

// ---------------------------------------------------------------------------
// demanda-status-chip
// ---------------------------------------------------------------------------

describe('DemandaStatusChipComponent', () => {
  async function montar(status: TipoDemandaStatusEnum, editavel: boolean) {
    const montado = await montarComponente(DemandaStatusChipComponent, { entradas: { status, editavel } });
    const escolhidos: TipoDemandaStatusEnum[] = [];
    montado.componente.statusEscolhido.subscribe((valor) => escolhidos.push(valor));
    return { montado, escolhidos };
  }

  it('mostra o rótulo do status; cada status tem uma severidade e um rótulo próprios', async () => {
    const { montado } = await montar(TipoDemandaStatusEnum.CONCLUIDA, false);
    expect(montado.elemento.textContent).toContain('Concluída');
    expect(montado.componente.opcoes.map((opcao) => opcao.label)).toEqual(['Pendente', 'Planejada', 'Concluída', 'Cancelada']);
    expect(Object.values(TipoDemandaStatusEnum).map((status) => montado.componente.severidade(status))).toEqual(['secondary', 'info', 'success', 'danger']);
  });

  it('somente leitura não mostra o botão de troca; editável mostra', async () => {
    expect((await montar(TipoDemandaStatusEnum.PENDENTE, false)).montado.elemento.querySelector('button')).toBeNull();
  });

  it('escolher outro status emite; escolher o mesmo não emite', async () => {
    const { montado, escolhidos } = await montar(TipoDemandaStatusEnum.PENDENTE, true);
    const popover = { hide: () => undefined } as never;
    montado.componente.escolher(TipoDemandaStatusEnum.PENDENTE, popover);
    montado.componente.escolher(TipoDemandaStatusEnum.CANCELADA, popover);
    expect(escolhidos).toEqual([TipoDemandaStatusEnum.CANCELADA]);
  });
});

// ---------------------------------------------------------------------------
// demanda-tags-cabecalho
// ---------------------------------------------------------------------------

describe('DemandaTagsCabecalhoComponent', () => {
  async function montar(tagsIniciais = [CATALOGO[0]]) {
    const montado = await montarComponente(DemandaTagsCabecalhoComponent, {
      usuario: TipoUsuarioEnum.GESTOR, entradas: { demandaId: 10, tagsDisponiveis: CATALOGO, editavel: true, tags: tagsIniciais },
    });
    const emitidas: unknown[] = [];
    montado.componente.tagsAlteradas.subscribe((tags) => emitidas.push(tags));
    return { montado, emitidas };
  }

  it('alternar uma tag grava na hora na ordem do catálogo e emite as tags novas', async () => {
    const { montado, emitidas } = await montar([CATALOGO[2]]);
    montado.componente.alternar(CATALOGO[0]);
    expect(montado.componente.tags().map((tag) => tag.id)).toEqual([1, 3]);
    const requisicao = esperarRequisicao(montado.http, 'PUT', '/demanda/10/tag');
    expect(requisicao.request.body).toEqual({ tagIds: [1, 3] });
    responderSucesso(requisicao, null);
    expect((emitidas[0] as Array<{ id: number }>).map((tag) => tag.id)).toEqual([1, 3]);
  });

  it('alternar uma tag que já está nela a remove', async () => {
    const { montado } = await montar([CATALOGO[0], CATALOGO[1]]);
    montado.componente.alternar(CATALOGO[0]);
    expect(montado.componente.tags().map((tag) => tag.id)).toEqual([2]);
    expect(esperarRequisicao(montado.http, 'PUT', '/demanda/10/tag').request.body).toEqual({ tagIds: [2] });
  });

  it('se a API recusa, as tags voltam ao estado anterior e nada é emitido', async () => {
    const { montado, emitidas } = await montar([CATALOGO[0]]);
    montado.componente.alternar(CATALOGO[1]);
    responderErro(esperarRequisicao(montado.http, 'PUT', '/demanda/10/tag'), 403, 'Apenas gestores podem atribuir tags às demandas');
    await montado.atualizar();
    expect(montado.componente.tags().map((tag) => tag.id)).toEqual([1]);
    expect(emitidas).toEqual([]);
  });

  it('mostra as tags da demanda como chips', async () => {
    const { montado } = await montar([CATALOGO[0], CATALOGO[1]]);
    expect(montado.elemento.textContent).toContain('Backend');
    expect(montado.elemento.textContent).toContain('Frontend');
    expect(montado.elemento.textContent).not.toContain('Infra');
  });
});

// ---------------------------------------------------------------------------
// demanda-toolbar
// ---------------------------------------------------------------------------

describe('DemandaToolbarComponent', () => {
  const CONTAGEM = { PENDENTE: 5, PLANEJADA: 2, CONCLUIDA: 1, CANCELADA: 0 };

  async function montar(filtro = FILTRO_VAZIO) {
    const montado = await montarComponente(DemandaToolbarComponent, { entradas: { filtro, contagem: CONTAGEM, tagsDisponiveis: CATALOGO } });
    const emitidos: unknown[] = [];
    montado.componente.filtroAlterado.subscribe((valor) => emitidos.push(valor));
    return { montado, emitidos };
  }

  it('mostra um chip por status com a contagem de cada um', async () => {
    const { montado } = await montar();
    const texto = montado.elemento.textContent ?? '';
    for (const rotulo of ['Pendente', 'Planejada', 'Concluída', 'Cancelada']) expect(texto).toContain(rotulo);
    for (const total of ['5', '2', '1', '0']) expect(texto).toContain(total);
  });

  it('digitar emite o filtro com o termo, mantendo status e tags', async () => {
    const { montado, emitidos } = await montar({ termo: '', status: [TipoDemandaStatusEnum.PENDENTE], tagIds: [2] });
    montado.componente.aoDigitar('api');
    expect(emitidos).toEqual([{ termo: 'api', status: [TipoDemandaStatusEnum.PENDENTE], tagIds: [2] }]);
  });

  it('clicar em um chip com tudo visível esconde aquele status; ele aparece como inativo', async () => {
    const { montado, emitidos } = await montar();
    montado.componente.alternarStatus(TipoDemandaStatusEnum.CANCELADA);
    expect((emitidos[0] as { status: string[] }).status).toEqual(['PENDENTE', 'PLANEJADA', 'CONCLUIDA']);
    expect(montado.componente.statusAtivo(TipoDemandaStatusEnum.CANCELADA)).toBe(true);
  });

  it('mudar as tags emite os ids; lista nula vira vazia', async () => {
    const { montado, emitidos } = await montar();
    montado.componente.aoMudarTags([1, 3]);
    montado.componente.aoMudarTags(null as never);
    expect((emitidos as Array<{ tagIds: number[] }>).map((filtro) => filtro.tagIds)).toEqual([[1, 3], []]);
  });

  it('Esc com busca preenchida emite o filtro com a busca limpa', async () => {
    const comBusca = await montar({ ...FILTRO_VAZIO, termo: 'algo' });
    const alvo = document.createElement('input');
    comBusca.montado.componente.aoTeclarBusca({ key: 'Escape', target: alvo } as unknown as KeyboardEvent);
    expect(comBusca.emitidos).toEqual([{ termo: '', status: [], tagIds: [] }]);
  });

  it('sem critério nenhum o filtro não está ativo', async () => {
    expect((await montar()).montado.componente.ativo()).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// demanda-metricas
// ---------------------------------------------------------------------------

describe('DemandaMetricasComponent', () => {
  async function montar(editavel: boolean, previsaoFimData: string | null = '2026-06-30') {
    const montado = await montarComponente(DemandaMetricasComponent, {
      usuario: TipoUsuarioEnum.GESTOR, entradas: { demandaId: 10, horasEstimadas: 8, previsaoFimData, editavel },
    });
    const alteracoes: unknown[] = [];
    montado.componente.alterada.subscribe((valor) => alteracoes.push(valor));
    return { montado, alteracoes };
  }

  it('sem permissão de edição, clicar não abre a edição', async () => {
    const { montado } = await montar(false);
    montado.componente.editar('horasEstimadas');
    expect(montado.componente.campoEditando()).toBeNull();
  });

  it('editar horas e salvar emite o valor na hora e grava; falha emite a reversão com o valor anterior', async () => {
    const { montado, alteracoes } = await montar(true);
    montado.componente.editar('horasEstimadas');
    expect(montado.componente.campoEditando()).toBe('horasEstimadas');
    montado.componente.valorHoras = 12;
    montado.componente.salvarHoras();
    expect(alteracoes).toEqual([{ horasEstimadas: 12 }]);
    expect(montado.componente.campoEditando()).toBeNull();
    const requisicao = esperarRequisicao(montado.http, 'PUT', '/demanda/10');
    expect(requisicao.request.body).toEqual({ horasEstimadas: 12 });
    responderErro(requisicao, 400, 'recusado');
    await montado.atualizar();
    expect(alteracoes[1]).toEqual({ horasEstimadas: 8, reverter: true });
  });

  it('horas iguais ou negativas não gravam nada', async () => {
    const { montado, alteracoes } = await montar(true);
    for (const valor of [8, -1]) {
      montado.componente.editar('horasEstimadas');
      montado.componente.valorHoras = valor;
      montado.componente.salvarHoras();
    }
    montado.http.expectNone(() => true);
    expect(alteracoes).toEqual([]);
  });

  it('em modo dias, o valor digitado vira horas (1 dia = 8 h)', async () => {
    const { montado, alteracoes } = await montar(true);
    montado.componente.unidadeTempo.definir(true);
    montado.componente.editar('horasEstimadas');
    expect(montado.componente.valorHoras).toBe(1);
    montado.componente.valorHoras = 2;
    montado.componente.salvarHoras();
    expect(alteracoes).toEqual([{ horasEstimadas: 16 }]);
  });

  it('salvar a previsão grava a data ISO; data igual ou vazia não grava', async () => {
    const { montado, alteracoes } = await montar(true);
    montado.componente.salvarData(new Date(2026, 6, 15));
    expect(alteracoes).toEqual([{ previsaoFimData: '2026-07-15' }]);
    expect(esperarRequisicao(montado.http, 'PUT', '/demanda/10').request.body).toEqual({ previsaoFimData: '2026-07-15' });
    montado.componente.salvarData(new Date(2026, 5, 30));
    montado.componente.salvarData(null);
    montado.http.expectNone(() => true);
    expect(alteracoes).toHaveLength(1);
  });

  it('Enter salva as horas e Esc cancela a edição', async () => {
    const { montado, alteracoes } = await montar(true);
    montado.componente.editar('horasEstimadas');
    montado.componente.aoTeclarHoras({ key: 'Escape', stopPropagation: () => undefined } as unknown as KeyboardEvent);
    expect(montado.componente.campoEditando()).toBeNull();
    montado.componente.editar('horasEstimadas');
    montado.componente.valorHoras = 9;
    montado.componente.aoTeclarHoras({ key: 'Enter', preventDefault: () => undefined } as unknown as KeyboardEvent);
    expect(alteracoes).toEqual([{ horasEstimadas: 9 }]);
  });
});
