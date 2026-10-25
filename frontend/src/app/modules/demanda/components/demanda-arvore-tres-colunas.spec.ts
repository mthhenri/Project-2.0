import { describe, it, expect } from 'vitest';
import { TestBed } from '@angular/core/testing';
import { DemandaGrafoNoDto, TipoDemandaStatusEnum, TipoUsuarioEnum } from '@project20/shared';
import { montarComponente } from '../../../../testes/montar-componente';
import { esperarRequisicao, responderErro } from '../../../../testes/http-teste';
import { FILTRO_VAZIO } from '../utils/demanda-filtro.util';
import { construirPastas } from '../utils/demanda-pasta.util';
import { DemandaArvoreTelaComponent } from './demanda-arvore-tela/demanda-arvore-tela.component';
import { DemandaBarraHorasComponent } from './demanda-barra-horas/demanda-barra-horas.component';
import { DemandaPastaLinhaComponent } from './demanda-pasta-linha/demanda-pasta-linha.component';
import { DemandaPastaListaComponent } from './demanda-pasta-lista/demanda-pasta-lista.component';
import { DemandaPastasComponent } from './demanda-pastas/demanda-pastas.component';

// As três colunas da Árvore (task 239): pastas, demandas da pasta e a demanda aberta (esta tem o spec próprio).

function no(id: number, nome: string, opcoes: Partial<DemandaGrafoNoDto> = {}): DemandaGrafoNoDto {
  return {
    id, nome, status: TipoDemandaStatusEnum.PENDENTE, isEstrutural: false, horasEstimadas: 6, minutosExecutados: 120, demandaPaiId: null,
    temDescricaoTecnica: true, temDescricaoCliente: false, temDocumentacao: false, tags: [], ...opcoes,
  };
}

// Ajustes (sem pasta) · Autenticação → Login, Senha, Sessão → Token · Relatórios (vazia)
const NOS = [
  no(1, 'Ajustes gerais'),
  no(2, 'Autenticação', { isEstrutural: true }),
  no(3, 'Tela de login', { demandaPaiId: 2, status: TipoDemandaStatusEnum.CONCLUIDA }),
  no(4, 'Recuperar senha', { demandaPaiId: 2 }),
  no(5, 'Sessão e segurança', { isEstrutural: true, demandaPaiId: 2 }),
  no(6, 'Validar token', { demandaPaiId: 5 }),
  no(7, 'Relatórios', { isEstrutural: true }),
];

const ACOES = { aoVisualizar: () => undefined, aoEditar: () => undefined, aoNovaFilha: () => undefined, aoTags: () => undefined, aoMembros: () => undefined, aoDescricao: () => undefined };

describe('DemandaBarraHorasComponent', () => {
  it('mostra "executado de estimado" com a barra proporcional; estourou fica marcado e a barra trava em 100%', async () => {
    const normal = await montarComponente(DemandaBarraHorasComponent, { entradas: { minutosExecutados: 120, horasEstimadas: 6 } });
    expect(normal.elemento.textContent).toContain('2h 0min de 6h');
    expect(normal.componente.percentual()).toBe(33);
    expect(normal.componente.estourou()).toBe(false);
  });

  it('estourou: percentual trava em 100 e a classe de estouro aparece', async () => {
    const montado = await montarComponente(DemandaBarraHorasComponent, { entradas: { minutosExecutados: 600, horasEstimadas: 6 } });
    expect(montado.componente.percentual()).toBe(100);
    expect(montado.componente.estourou()).toBe(true);
    expect(montado.elemento.querySelector('.demanda-barra-horas--estouro')).not.toBeNull();
  });

  it('sem estimativa mostra só o executado; sem nada, não mostra nada', async () => {
    const executado = await montarComponente(DemandaBarraHorasComponent, { entradas: { minutosExecutados: 90, horasEstimadas: 0 } });
    expect(executado.elemento.textContent).toContain('1h 30min exec.');
    expect(executado.elemento.querySelector('.demanda-barra-horas__barra')).toBeNull();
  });

  it('sem estimativa e sem execução fica vazia', async () => {
    const vazio = await montarComponente(DemandaBarraHorasComponent, { entradas: { minutosExecutados: 0, horasEstimadas: 0 } });
    expect(vazio.elemento.textContent?.trim()).toBe('');
  });
});

describe('DemandaPastasComponent', () => {
  async function montar(pastaId: number | null | undefined = null, expandidas: number[] = []) {
    const montado = await montarComponente(DemandaPastasComponent, {
      entradas: { pastas: construirPastas(NOS), semPastaQuantidade: 1, pastaId, expandidas: new Set(expandidas) },
    });
    const escolhidas: Array<number | null> = [];
    const alternadas: number[] = [];
    montado.componente.pastaEscolhida.subscribe((valor) => escolhidas.push(valor));
    montado.componente.expansaoAlternada.subscribe((valor) => alternadas.push(valor));
    return { montado, escolhidas, alternadas };
  }

  const nomes = (montado: { elemento: HTMLElement }) => Array.from(montado.elemento.querySelectorAll('.demanda-pastas__nome')).map((item) => item.textContent?.trim());

  it('mostra "Sem pasta" no topo e só as pastas de nível um com a contagem; as filhas só com a mãe aberta', async () => {
    const fechadas = await montar();
    expect(nomes(fechadas.montado)).toEqual(['Sem pasta', 'Autenticação', 'Relatórios']);
    expect(Array.from(fechadas.montado.elemento.querySelectorAll('.demanda-pastas__conta')).map((item) => item.textContent?.trim())).toEqual(['1', '2', '0']);
    expect(fechadas.montado.elemento.querySelectorAll('.demanda-pastas__item--ativa').length).toBe(1);
  });

  it('com a mãe aberta mostra as filhas; a pasta escolhida fica realçada', async () => {
    const { montado } = await montar(5, [2]);
    expect(nomes(montado)).toEqual(['Sem pasta', 'Autenticação', 'Sessão e segurança', 'Relatórios']);
    expect(montado.elemento.querySelector('.demanda-pastas__item--ativa')?.textContent).toContain('Sessão e segurança');
  });

  it('clicar escolhe a pasta; o chevron só abre e fecha, sem escolher', async () => {
    const { montado, escolhidas, alternadas } = await montar();
    const itens = Array.from(montado.elemento.querySelectorAll<HTMLButtonElement>('.demanda-pastas__item'));
    itens[1].click();
    expect(escolhidas).toEqual([2]);
    itens[0].click();
    expect(escolhidas).toEqual([2, null]);
    montado.elemento.querySelector<HTMLElement>('.demanda-pastas__chevron')!.click();
    expect(alternadas).toEqual([2]);
    expect(escolhidas).toEqual([2, null]);
  });

  it('sem pasta nenhuma (busca) não realça nada', async () => {
    const montado = await montarComponente(DemandaPastasComponent, { entradas: { pastas: construirPastas(NOS), semPastaQuantidade: 1, pastaId: undefined } });
    expect(montado.elemento.querySelector('.demanda-pastas__item--ativa')).toBeNull();
  });

  it('teclado: ↓ e ↑ percorrem e escolhem; → abre e entra; ← fecha e sobe', async () => {
    const { montado, escolhidas, alternadas } = await montar(2, []);
    const tecla = (key: string) => montado.componente.aoTeclar({ key, preventDefault: () => undefined } as KeyboardEvent);
    tecla('ArrowDown');
    expect(escolhidas).toEqual([7]);
    tecla('ArrowUp');
    expect(escolhidas).toEqual([7, null]);
    tecla('ArrowRight');
    expect(alternadas).toEqual([2]);
  });

  it('teclado com a mãe aberta: → entra na primeira filha e ← da filha sobe para a mãe', async () => {
    const aberta = await montar(2, [2]);
    aberta.montado.componente.aoTeclar({ key: 'ArrowRight', preventDefault: () => undefined } as KeyboardEvent);
    expect(aberta.escolhidas).toEqual([5]);
    TestBed.resetTestingModule();
    const filha = await montar(5, [2]);
    filha.montado.componente.aoTeclar({ key: 'ArrowLeft', preventDefault: () => undefined } as KeyboardEvent);
    expect(filha.escolhidas).toEqual([2]);
  });
});

describe('DemandaPastaLinhaComponent', () => {
  async function montar(opcoes: { usuario?: TipoUsuarioEnum; no?: DemandaGrafoNoDto; termo?: string } = {}) {
    const montado = await montarComponente(DemandaPastaLinhaComponent, {
      usuario: opcoes.usuario ?? TipoUsuarioEnum.GESTOR,
      entradas: { no: opcoes.no ?? NOS[3], acoes: ACOES, termo: opcoes.termo ?? '' },
    });
    const escolhidas: number[] = [];
    const descricoes: string[] = [];
    montado.componente.escolhida.subscribe(() => escolhidas.push(1));
    montado.componente.descricaoSolicitada.subscribe((campo) => descricoes.push(campo));
    montado.componente.ngOnChanges({ no: {} as never });
    await montado.atualizar();
    return { montado, escolhidas, descricoes };
  }

  it('mostra a bolinha, o nome, a barra "de" e os três ícones, sem membros nem ações', async () => {
    const { montado } = await montar();
    expect(montado.elemento.querySelector('app-demanda-status-marca')).not.toBeNull();
    expect(montado.elemento.textContent).toContain('Recuperar senha');
    expect(montado.elemento.textContent).toContain('2h 0min de 6h');
    expect(montado.elemento.querySelectorAll('.demanda-pasta-linha__descricao').length).toBe(3);
    expect(montado.elemento.querySelector('[aria-label="Descrição técnica (preenchida)"]')).not.toBeNull();
    expect(montado.elemento.querySelector('[aria-label="Documentação (vazia)"]')).not.toBeNull();
    expect(montado.elemento.querySelector('.pi-plus')).toBeNull();
    expect(montado.elemento.querySelector('.pi-ellipsis-v')).toBeNull();
  });

  it('clicar na linha escolhe; clicar no ícone da descrição pede a descrição e não escolhe a linha', async () => {
    const { montado, escolhidas, descricoes } = await montar();
    montado.elemento.querySelector<HTMLElement>('.demanda-pasta-linha')!.click();
    expect(escolhidas).toEqual([1]);
    montado.elemento.querySelector<HTMLButtonElement>('[aria-label^="Descrição do cliente"]')!.click();
    expect(descricoes).toEqual(['descricaoCliente']);
    expect(escolhidas).toEqual([1]);
  });

  it('o termo da busca é destacado no nome; o menu de contexto tem o de hoje (gestor tem Editar e Membros)', async () => {
    const { montado } = await montar({ termo: 'senha' });
    expect(montado.elemento.querySelector('mark')?.textContent).toBe('senha');
    const rotulos = montado.componente.itensMenu.map((item) => item.label).filter(Boolean);
    expect(rotulos).toEqual(['Visualizar', 'Editar', 'Tags', 'Membros', 'Desc. Técnica', 'Desc. Cliente', 'Documentação']);
  });

  it('desenvolvedor não tem Editar nem Membros no menu, e a bolinha não é editável', async () => {
    const { montado } = await montar({ usuario: TipoUsuarioEnum.DESENVOLVEDOR });
    const rotulos = montado.componente.itensMenu.map((item) => item.label).filter(Boolean);
    expect(rotulos).not.toContain('Editar');
    expect(rotulos).not.toContain('Membros');
    expect(montado.elemento.querySelector('.demanda-status__gatilho')).toBeNull();
  });

  it('demanda de estrutura leva o ícone de pasta e "Nova Sub-demanda" no menu', async () => {
    const { montado } = await montar({ no: NOS[1] });
    expect(montado.elemento.querySelector('.demanda-pasta-linha__icone-pasta')).not.toBeNull();
    expect(montado.componente.itensMenu.map((item) => item.label)).toContain('Nova Sub-demanda');
  });
});

describe('DemandaPastaListaComponent', () => {
  async function montar(itens: DemandaGrafoNoDto[], opcoes: { usuario?: TipoUsuarioEnum; filtroAtivo?: boolean; pastaDemandaId?: number | null; permitirDemandaAqui?: boolean } = {}) {
    const montado = await montarComponente(DemandaPastaListaComponent, {
      usuario: opcoes.usuario ?? TipoUsuarioEnum.GESTOR,
      entradas: { titulo: 'Autenticação', caminho: '', itens, acoes: ACOES, filtroAtivo: opcoes.filtroAtivo ?? false, pastaDemandaId: opcoes.pastaDemandaId ?? null, permitirDemandaAqui: opcoes.permitirDemandaAqui ?? true },
    });
    const eventos = { demandaAqui: 0, pasta: [] as number[], limpos: 0, escolhidas: [] as number[] };
    montado.componente.demandaAquiSolicitada.subscribe(() => eventos.demandaAqui++);
    montado.componente.abrirPastaSolicitada.subscribe((id) => eventos.pasta.push(id));
    montado.componente.filtrosLimpos.subscribe(() => eventos.limpos++);
    montado.componente.demandaEscolhida.subscribe((id) => eventos.escolhidas.push(id));
    await montado.atualizar();
    return { montado, eventos };
  }

  const botao = (montado: { elemento: HTMLElement }, rotulo: string) => Array.from(montado.elemento.querySelectorAll('button')).find((item) => item.textContent?.includes(rotulo));

  it('lista as demandas, "Demanda aqui" é do gestor e o desenvolvedor não a vê', async () => {
    const gestor = await montar([NOS[2], NOS[3]]);
    expect(gestor.montado.elemento.querySelectorAll('app-demanda-pasta-linha').length).toBe(2);
    botao(gestor.montado, 'Demanda aqui')!.click();
    expect(gestor.eventos.demandaAqui).toBe(1);

    TestBed.resetTestingModule();
    const dev = await montar([NOS[2]], { usuario: TipoUsuarioEnum.DESENVOLVEDOR });
    expect(botao(dev.montado, 'Demanda aqui')).toBeUndefined();
  });

  it('na busca "Demanda aqui" some; "Abrir a pasta" só existe numa pasta de verdade', async () => {
    const busca = await montar([NOS[2]], { permitirDemandaAqui: false });
    expect(botao(busca.montado, 'Demanda aqui')).toBeUndefined();
    TestBed.resetTestingModule();
    const semAbrir = await montar([NOS[2]]);
    expect(semAbrir.montado.elemento.querySelector('[aria-label="Abrir a pasta"]')).toBeNull();
  });

  it('pasta vazia convida a criar; filtro que esconde tudo oferece limpar', async () => {
    const vazia = await montar([]);
    expect(vazia.montado.elemento.textContent).toContain('Nenhuma demanda aqui ainda');
    botao(vazia.montado, 'Demanda aqui')!.click();
    expect(vazia.eventos.demandaAqui).toBe(1);
    TestBed.resetTestingModule();
    const filtrada = await montar([], { filtroAtivo: true });
    expect(filtrada.montado.elemento.textContent).toContain('Nenhuma demanda corresponde aos filtros');
    botao(filtrada.montado, 'Limpar filtros')!.click();
    expect(filtrada.eventos.limpos).toBe(1);
  });

  it('o nome da pasta de cada resultado aparece só na busca', async () => {
    const montado = await montarComponente(DemandaPastaListaComponent, {
      entradas: { titulo: 'Resultados da busca', itens: [NOS[2], NOS[0]], acoes: ACOES, nomesDasPastas: new Map([[2, 'Autenticação']]) },
    });
    expect(montado.componente.nomeDaPastaDe(NOS[2])).toBe('Autenticação');
    expect(montado.componente.nomeDaPastaDe(NOS[0])).toBe('Sem pasta');
  });
});

describe('DemandaArvoreTelaComponent', () => {
  async function montar(opcoes: { usuario?: TipoUsuarioEnum; pastaId?: number | null; filtro?: typeof FILTRO_VAZIO } = {}) {
    const montado = await montarComponente(DemandaArvoreTelaComponent, {
      usuario: opcoes.usuario ?? TipoUsuarioEnum.GESTOR,
      entradas: { nos: NOS, filtro: opcoes.filtro ?? FILTRO_VAZIO, projetoId: 7, pastaId: opcoes.pastaId ?? 2 },
    });
    const eventos = { pastas: [] as Array<number | null>, status: [] as unknown[], alterado: 0 };
    montado.componente.pastaChange.subscribe((valor) => eventos.pastas.push(valor));
    montado.componente.statusAlterado.subscribe((valor) => eventos.status.push(valor));
    montado.componente.alterado.subscribe(() => eventos.alterado++);
    await montado.atualizar();
    montado.http.match(() => true);
    return { montado, eventos };
  }

  it('a lista mostra só as demandas direto na pasta e abre a primeira', async () => {
    const { montado } = await montar();
    expect(montado.componente.itens().map((item) => item.id)).toEqual([3, 4]);
    expect(montado.componente.demandaAbertaId()).toBe(3);
    expect(montado.componente.tituloDaLista()).toBe('Autenticação');
  });

  it('escolher uma pasta avisa a página e abre a primeira demanda dela; pasta vazia deixa a coluna sem demanda aberta', async () => {
    const { montado, eventos } = await montar();
    montado.componente.escolherPasta(5);
    expect(eventos.pastas).toEqual([5]);
    expect(montado.componente.demandaAbertaId()).toBe(6);
    montado.componente.escolherPasta(7);
    expect(montado.componente.demandaAbertaId()).toBeNull();
    montado.componente.escolherPasta(null);
    expect(montado.componente.demandaAbertaId()).toBe(1);
  });

  it('a busca olha todas as pastas e mostra o nome da pasta; os filtros de status valem dentro da pasta escolhida', async () => {
    const busca = await montar({ filtro: { ...FILTRO_VAZIO, termo: 'tok' } });
    expect(busca.montado.componente.emBusca()).toBe(true);
    expect(busca.montado.componente.itens().map((item) => item.id)).toEqual([6]);
    expect(busca.montado.componente.tituloDaLista()).toBe('Resultados da busca');
    expect(busca.montado.componente.nomesDasPastas()?.get(5)).toBe('Sessão e segurança');

    TestBed.resetTestingModule();
    const status = await montar({ filtro: { ...FILTRO_VAZIO, status: [TipoDemandaStatusEnum.CONCLUIDA] } });
    expect(status.montado.componente.itens().map((item) => item.id)).toEqual([3]);
  });

  it('abrir de fora (grafo ou Controle de horas) abre a demanda, na pasta e na aba pedidas', async () => {
    const { montado, eventos } = await montar({ pastaId: null });
    montado.fixture.componentRef.setInput('abrirDemanda', { id: 6, versao: 1 });
    await montado.atualizar();
    montado.http.match(() => true);
    expect(montado.componente.demandaAbertaId()).toBe(6);
    expect(eventos.pastas).toEqual([5]);
    expect(montado.componente.aba()).toBe('tecnica');
  });

  it('clicar no ícone de descrição abre a demanda na aba dela', async () => {
    const { montado } = await montar();
    montado.componente.abrirDescricao({ id: 4, campo: 'documentacao' });
    expect(montado.componente.demandaAbertaId()).toBe(4);
    expect(montado.componente.aba()).toBe('doc');
    montado.componente.abrirDescricao({ id: 4, campo: 'descricaoCliente' });
    expect(montado.componente.aba()).toBe('cliente');
  });

  it('a demanda aberta navegar por dentro leva a pasta junto; "expandir tudo" abre as pastas que têm filhas', async () => {
    const { montado, eventos } = await montar({ pastaId: null });
    montado.componente.aoNavegar(6);
    expect(montado.componente.demandaAbertaId()).toBe(6);
    expect(eventos.pastas).toEqual([5]);
    expect(montado.componente.todosExpandidos()).toBe(false);
    montado.componente.alternarExpansaoGeral();
    expect(montado.componente.todosExpandidos()).toBe(true);
    montado.componente.alternarExpansaoGeral();
    expect(montado.componente.expandidas().size).toBe(0);
  });

  it('trocar o status pela linha é otimista; se a API recusa, volta o status de antes', async () => {
    const { montado, eventos } = await montar();
    montado.componente.aoStatusEscolhido({ demandaId: 4, de: TipoDemandaStatusEnum.PENDENTE, para: TipoDemandaStatusEnum.CONCLUIDA });
    expect(eventos.status).toEqual([{ demandaId: 4, status: TipoDemandaStatusEnum.CONCLUIDA }]);
    responderErro(esperarRequisicao(montado.http, 'PUT', '/demanda/4'), 400, 'recusado');
    await montado.atualizar();
    expect(eventos.status[1]).toEqual({ demandaId: 4, status: TipoDemandaStatusEnum.PENDENTE });
  });

  it('a demanda aberta que sai do projeto (excluída) cai para a primeira da pasta; excluir pela coluna avisa a página', async () => {
    const { montado, eventos } = await montar();
    montado.componente.escolherDemanda(4);
    montado.fixture.componentRef.setInput('nos', NOS.filter((item) => item.id !== 4));
    await montado.atualizar();
    montado.http.match(() => true);
    expect(montado.componente.demandaAbertaId()).toBe(3);
    montado.componente.aoExcluida();
    expect(eventos.alterado).toBe(1);
  });
});
