import { describe, it, expect } from 'vitest';
import { TestBed } from '@angular/core/testing';
import { DemandaArvoreItemDto, DemandaPlanejamentoDto, TipoDemandaStatusEnum, TipoUsuarioEnum } from '@project20/shared';
import { montarComponente } from '../../../../testes/montar-componente';
import { esperarRequisicao, responderErro, responderSucesso } from '../../../../testes/http-teste';
import { DemandaArvoreItemComponent } from './demanda-arvore-item/demanda-arvore-item.component';
import { DemandaArvorePainelComponent } from './demanda-arvore-painel/demanda-arvore-painel.component';
import { DemandaPlanejamentoPainelComponent } from './demanda-planejamento-painel/demanda-planejamento-painel.component';

function criarItem(id: number, sobrescritas: Partial<DemandaArvoreItemDto> = {}): DemandaArvoreItemDto {
  return {
    id, nome: `Demanda ${id}`, status: TipoDemandaStatusEnum.PENDENTE, isEstrutural: false, horasEstimadas: 10, minutosExecutados: 0,
    nivel: 0, temDescricaoTecnica: false, temDescricaoCliente: false, temDocumentacao: false, tags: [], filhos: [], ...sobrescritas,
  };
}

// ---------------------------------------------------------------------------
// demanda-arvore-item
// ---------------------------------------------------------------------------

describe('DemandaArvoreItemComponent', () => {
  async function montar(item: DemandaArvoreItemDto, usuario = TipoUsuarioEnum.GESTOR, entradas: Record<string, unknown> = {}) {
    TestBed.resetTestingModule();
    const montado = await montarComponente(DemandaArvoreItemComponent, { usuario, entradas: { arvoreItem: item, ...entradas } });
    const eventos: Record<string, unknown[]> = {};
    for (const nome of ['expansaoAlternada', 'focoAlterado', 'statusAlterado', 'demandaSelecionada', 'demandaEditarSolicitada',
      'demandaEditarDescricaoSolicitada', 'demandaNovaFilhaSolicitada', 'demandaTagsSolicitadas', 'demandaMembrosSolicitados']) {
      eventos[nome] = [];
      (montado.componente as unknown as Record<string, { subscribe: (f: (v: unknown) => void) => void }>)[nome].subscribe((valor) => eventos[nome].push(valor));
    }
    return { montado, eventos };
  }

  it('o menu do desenvolvedor tem Visualizar, Tags e as descrições; o do gestor tem também Editar, Nova Sub-demanda e Membros', async () => {
    const gestor = await montar(criarItem(1));
    const rotulosGestor = gestor.montado.componente.itensMenu.map((opcao) => opcao.label);
    expect(rotulosGestor).toEqual(expect.arrayContaining(['Visualizar', 'Editar', 'Tags', 'Membros']));

    const desenvolvedor = await montar(criarItem(1), TipoUsuarioEnum.DESENVOLVEDOR);
    const rotulosDev = desenvolvedor.montado.componente.itensMenu.map((opcao) => opcao.label);
    expect(rotulosDev).toEqual(expect.arrayContaining(['Visualizar', 'Tags']));
    for (const proibido of ['Editar', 'Membros']) expect(rotulosDev).not.toContain(proibido);
    expect(rotulosDev.some((rotulo) => rotulo?.startsWith('Nova'))).toBe(false);
  });

  it('os comandos do menu emitem o id da demanda', async () => {
    const { montado, eventos } = await montar(criarItem(7));
    const porRotulo = (rotulo: string) => montado.componente.itensMenu.find((opcao) => opcao.label === rotulo);
    porRotulo('Visualizar')?.command?.({} as never);
    porRotulo('Editar')?.command?.({} as never);
    porRotulo('Tags')?.command?.({} as never);
    porRotulo('Membros')?.command?.({} as never);
    expect(eventos['demandaSelecionada']).toEqual([7]);
    expect(eventos['demandaEditarSolicitada']).toEqual([7]);
    expect(eventos['demandaTagsSolicitadas']).toEqual([7]);
    expect(eventos['demandaMembrosSolicitados']).toEqual([7]);
  });

  it('clicar na linha dá o foco e abre o detalhe; o chevron só alterna a expansão (sem abrir o detalhe)', async () => {
    const { montado, eventos } = await montar(criarItem(3, { filhos: [criarItem(4)] }));
    montado.componente.selecionar();
    expect(eventos['focoAlterado']).toEqual([3]);
    expect(eventos['demandaSelecionada']).toEqual([3]);

    const evento = { stopPropagation: () => undefined } as unknown as Event;
    montado.componente.alternarExpansao(evento);
    expect(eventos['expansaoAlternada']).toEqual([3]);
    expect(eventos['demandaSelecionada']).toEqual([3]);
  });

  it('o ícone de descrição abre a edição daquele campo e não propaga o clique', async () => {
    const { montado, eventos } = await montar(criarItem(3, { temDescricaoCliente: true }));
    let propagou = true;
    montado.componente.abrirDescricao({ stopPropagation: () => { propagou = false; } } as unknown as Event, 'descricaoCliente');
    expect(propagou).toBe(false);
    expect(eventos['demandaEditarDescricaoSolicitada']).toEqual([{ id: 3, campo: 'descricaoCliente' }]);
    expect(montado.componente.descricaoPreenchida('descricaoCliente')).toBe(true);
    expect(montado.componente.descricaoPreenchida('descricaoTecnica')).toBe(false);
    expect(montado.componente.descricaoPreenchida('documentacao')).toBe(false);
  });

  it('o percentual executado trava em 100 e marca o estouro; sem estimativa fica em zero', async () => {
    const meio = await montar(criarItem(1, { horasEstimadas: 2, minutosExecutados: 60 }));
    expect(meio.montado.componente.percentualExecutado).toBe(50);
    expect(meio.montado.componente.estourou).toBe(false);

    const estourada = await montar(criarItem(1, { horasEstimadas: 1, minutosExecutados: 200 }));
    expect(estourada.montado.componente.percentualExecutado).toBe(100);
    expect(estourada.montado.componente.estourou).toBe(true);

    const semEstimativa = await montar(criarItem(1, { horasEstimadas: 0, minutosExecutados: 30 }));
    expect(semEstimativa.montado.componente.percentualExecutado).toBe(0);
    expect(semEstimativa.montado.componente.estourou).toBe(false);
  });

  it('expandido, executores e partes do nome seguem as entradas', async () => {
    const { montado } = await montar(criarItem(5, { nome: 'Login do sistema' }), TipoUsuarioEnum.GESTOR, {
      expandidos: new Set([5]), termoBusca: 'sistema', executoresPorDemanda: new Map([[5, ['Ana']]]),
    });
    expect(montado.componente.expandido).toBe(true);
    expect(montado.componente.executores).toEqual(['Ana']);
    expect(montado.componente.nomeEmPartes.some((parte) => parte.destaque && parte.texto.toLowerCase() === 'sistema')).toBe(true);
  });

  it('escolher o status emite de/para; um único menu fica aberto por vez', async () => {
    const { montado, eventos } = await montar(criarItem(2));
    montado.componente.aoEscolherStatus(TipoDemandaStatusEnum.CONCLUIDA);
    expect(eventos['statusAlterado']).toEqual([{ demandaId: 2, de: TipoDemandaStatusEnum.PENDENTE, para: TipoDemandaStatusEnum.CONCLUIDA }]);

    const fechamentos: string[] = [];
    const menuA = { show: () => undefined, hide: () => fechamentos.push('A') } as never;
    const menuB = { show: () => undefined, hide: () => fechamentos.push('B') } as never;
    montado.componente.abrirMenuContexto({} as MouseEvent, menuA);
    montado.componente.abrirMenuContexto({} as MouseEvent, menuB);
    expect(fechamentos).toEqual(['A']);
    montado.componente.aoFecharMenu(menuB);
    montado.componente.abrirMenuContexto({} as MouseEvent, menuA);
    expect(fechamentos).toEqual(['A']);
  });
});

// ---------------------------------------------------------------------------
// demanda-arvore-painel
// ---------------------------------------------------------------------------

describe('DemandaArvorePainelComponent', () => {
  const ARVORE = [
    criarItem(1, { filhos: [criarItem(2, { filhos: [criarItem(3)] }), criarItem(4)] }),
    criarItem(5),
  ];

  async function montar(usuario = TipoUsuarioEnum.GESTOR) {
    TestBed.resetTestingModule();
    const montado = await montarComponente(DemandaArvorePainelComponent, { usuario, entradas: { raizes: ARVORE, projetoId: 9 } });
    const eventos = { alterado: 0, tags: [] as unknown[], status: [] as unknown[] };
    montado.componente.alterado.subscribe(() => eventos.alterado++);
    montado.componente.tagsAlteradas.subscribe((valor) => eventos.tags.push(valor));
    montado.componente.statusAlterado.subscribe((valor) => eventos.status.push(valor));
    return { montado, eventos };
  }

  it('expandir tudo abre só os nós com filhos; recolher tudo fecha; o alternador geral segue o estado', async () => {
    const { montado } = await montar();
    const painel = montado.componente;
    expect(painel.todosExpandidos()).toBe(false);
    painel.alternarExpansaoGeral();
    expect([...painel.expandidos()].sort()).toEqual([1, 2]);
    expect(painel.todosExpandidos()).toBe(true);
    painel.alternarExpansaoGeral();
    expect(painel.expandidos().size).toBe(0);
    painel.alternarExpansao(1);
    expect(painel.expandidos().has(1)).toBe(true);
    painel.alternarExpansao(1);
    expect(painel.expandidos().has(1)).toBe(false);
  });

  it('o filtro só soma ramos abertos; o que o usuário já abriu continua aberto', async () => {
    const montado = await montarComponente(DemandaArvorePainelComponent, {
      usuario: TipoUsuarioEnum.GESTOR, entradas: { raizes: ARVORE, projetoId: 9, expandirIds: new Set([2]) },
    });
    montado.componente.alternarExpansao(1);
    await montado.atualizar();
    expect([...montado.componente.expandidos()].sort()).toEqual([1, 2]);
  });

  it('teclado: ↓↑ percorrem as linhas visíveis, → abre e entra, ← fecha e sobe, Enter abre o detalhe', async () => {
    const { montado } = await montar();
    const painel = montado.componente;
    const tecla = (key: string, extras: Partial<KeyboardEvent> = {}) => painel.aoTeclarArvore({ key, preventDefault: () => undefined, ...extras } as KeyboardEvent);

    painel.aoFocarArvore();
    expect(painel.focoId()).toBe(1);
    tecla('ArrowDown');
    expect(painel.focoId()).toBe(5); // 1 está recolhido: a próxima linha visível é a 5
    tecla('ArrowUp');
    expect(painel.focoId()).toBe(1);
    tecla('ArrowRight'); // abre
    expect(painel.expandidos().has(1)).toBe(true);
    tecla('ArrowRight'); // entra no primeiro filho
    expect(painel.focoId()).toBe(2);
    tecla('ArrowLeft'); // 2 está recolhido: sobe para o pai
    expect(painel.focoId()).toBe(1);
    tecla('ArrowLeft'); // 1 aberto: fecha
    expect(painel.expandidos().has(1)).toBe(false);
    tecla('Enter');
    expect(painel.mostrarDialogDetalhe()).toBe(true);
    expect(painel.demandaIdSelecionada()).toBe(1);
  });

  it('teclas com modificador e teclas desconhecidas são ignoradas', async () => {
    const { montado } = await montar();
    const painel = montado.componente;
    painel.aoFocarArvore();
    let impediu = 0;
    const evento = (key: string, extras: Partial<KeyboardEvent> = {}) => ({ key, preventDefault: () => impediu++, ...extras }) as KeyboardEvent;
    painel.aoTeclarArvore(evento('ArrowDown', { ctrlKey: true }));
    painel.aoTeclarArvore(evento('x'));
    expect(painel.focoId()).toBe(1);
    expect(impediu).toBe(0);
  });

  it('abrir detalhe, edição e nova sub-demanda guarda o id e abre o diálogo; criar/alterar/excluir avisam o host', async () => {
    const { montado, eventos } = await montar();
    const painel = montado.componente;
    painel.abrirEdicao(4);
    painel.abrirNovaFilha(2);
    expect([painel.mostrarDialogEdicao(), painel.demandaIdParaEditar()]).toEqual([true, 4]);
    expect([painel.mostrarDialogNovaFilha(), painel.demandaPaiIdNovaFilha()]).toEqual([true, 2]);
    painel.aoDemandaAlterada();
    painel.aoDemandaCriada();
    painel.aoDemandaExcluida();
    expect(eventos.alterado).toBe(3);
  });

  it('trocar o status pelo chip emite na hora e confirma; se a API recusa, emite o status anterior', async () => {
    const { montado, eventos } = await montar();
    montado.componente.aoStatusEscolhido({ demandaId: 5, de: TipoDemandaStatusEnum.PENDENTE, para: TipoDemandaStatusEnum.CONCLUIDA });
    expect(eventos.status).toEqual([{ demandaId: 5, status: TipoDemandaStatusEnum.CONCLUIDA }]);
    const requisicao = esperarRequisicao(montado.http, 'PUT', '/demanda/5');
    expect(requisicao.request.body).toEqual({ status: TipoDemandaStatusEnum.CONCLUIDA });
    responderErro(requisicao, 400, 'recusado');
    await montado.atualizar();
    expect(eventos.status[1]).toEqual({ demandaId: 5, status: TipoDemandaStatusEnum.PENDENTE });
  });

  it('desenvolvedor abre o diálogo de tags, mas não o de membros (nenhuma chamada de membros sai)', async () => {
    const { montado } = await montar(TipoUsuarioEnum.DESENVOLVEDOR);
    montado.componente.abrirDialogMembros(1);
    expect(montado.componente.mostrarDialogMembros()).toBe(false);
    montado.http.expectNone(() => true);

    montado.componente.abrirDialogTagsPorId(1);
    responderSucesso(esperarRequisicao(montado.http, 'GET', '/v1/tag'), [{ id: 1, nome: 'A', cor: '#111111' }]);
    responderSucesso(esperarRequisicao(montado.http, 'GET', '/demanda/1/tag'), []);
    expect(montado.componente.mostrarDialogTags()).toBe(true);
  });

  it('gestor: tags carrega o catálogo e as tags da demanda e só então abre; salvar manda os ids e avisa o host', async () => {
    const { montado, eventos } = await montar();
    montado.componente.abrirDialogTagsPorId(2);
    responderSucesso(esperarRequisicao(montado.http, 'GET', '/v1/tag'), [{ id: 1, nome: 'A', cor: '#111111' }, { id: 2, nome: 'B', cor: '#222222' }]);
    responderSucesso(esperarRequisicao(montado.http, 'GET', '/demanda/2/tag'), [{ id: 2, nome: 'B', cor: '#222222' }]);
    expect(montado.componente.formularioTags.value.tagIds).toEqual([2]);
    expect(montado.componente.mostrarDialogTags()).toBe(true);

    montado.componente.alternarTagSelecao(montado.componente.formularioTags.controls.tagIds, 1);
    expect(montado.componente.tagEstaSelecionada(montado.componente.formularioTags.controls.tagIds, 1)).toBe(true);
    montado.componente.salvarTags();
    const requisicao = esperarRequisicao(montado.http, 'PUT', '/demanda/2/tag');
    expect(requisicao.request.body).toEqual({ tagIds: [2, 1] });
    responderSucesso(requisicao, null);
    expect(montado.componente.mostrarDialogTags()).toBe(false);
    expect(eventos.tags).toEqual([{ demandaId: 2, tags: [{ id: 1, nome: 'A', cor: '#111111' }, { id: 2, nome: 'B', cor: '#222222' }] }]);
  });

  it('gestor: o seletor de membros não lista gestores', async () => {
    const { montado } = await montar();
    montado.componente.abrirDialogMembros(2);
    expect(montado.componente.mostrarDialogMembros()).toBe(true);
    responderSucesso(esperarRequisicao(montado.http, 'GET', '/v1/usuario'), {
      itens: [
        { id: 1, nomeCompleto: 'Gestora', tipo: TipoUsuarioEnum.GESTOR },
        { id: 2, nomeCompleto: 'Dev', tipo: TipoUsuarioEnum.DESENVOLVEDOR },
      ],
      total: 2, pagina: 1, itensPorPagina: 100,
    });
    expect(montado.componente.usuariosDisponiveis().map((usuario) => usuario.id)).toEqual([2]);
  });

  describe('descrição', () => {
    const DEMANDA = { id: 2, nome: 'Demanda 2', descricaoTecnica: 'texto técnico', descricaoCliente: 'texto cliente', documentacao: null, podeEditar: false };

    async function abrir(usuario: TipoUsuarioEnum, campo: 'descricaoTecnica' | 'descricaoCliente' | 'documentacao', podeEditar: boolean) {
      const contexto = await montar(usuario);
      contexto.montado.componente.abrirDialogDescricaoPorId(2, campo);
      responderSucesso(esperarRequisicao(contexto.montado.http, 'GET', '/demanda/2'), { ...DEMANDA, podeEditar });
      return contexto;
    }

    it('abre com o valor do campo e o título certo', async () => {
      const { montado } = await abrir(TipoUsuarioEnum.GESTOR, 'descricaoTecnica', true);
      expect(montado.componente.mostrarDialogDescricao()).toBe(true);
      expect(montado.componente.tituloDialogDescricao()).toBe('Descrição Técnica');
      expect(montado.componente.formularioDescricao.value.valor).toBe('texto técnico');
      const vazio = await abrir(TipoUsuarioEnum.GESTOR, 'documentacao', true);
      expect(vazio.montado.componente.formularioDescricao.value.valor).toBe('');
    });

    it('a descrição do cliente é só do gestor, mesmo para o dev que é membro (podeEditar)', async () => {
      const dev = await abrir(TipoUsuarioEnum.DESENVOLVEDOR, 'descricaoCliente', true);
      expect(dev.montado.componente.podeEditarDescricaoAtual()).toBe(false);
      dev.montado.componente.salvarDescricao();
      dev.montado.http.expectNone(() => true);

      const gestor = await abrir(TipoUsuarioEnum.GESTOR, 'descricaoCliente', false);
      expect(gestor.montado.componente.podeEditarDescricaoAtual()).toBe(true);
    });

    it('a descrição técnica do dev segue podeEditar (membro edita, não membro não)', async () => {
      const membro = await abrir(TipoUsuarioEnum.DESENVOLVEDOR, 'descricaoTecnica', true);
      expect(membro.montado.componente.podeEditarDescricaoAtual()).toBe(true);
      const naoMembro = await abrir(TipoUsuarioEnum.DESENVOLVEDOR, 'descricaoTecnica', false);
      expect(naoMembro.montado.componente.podeEditarDescricaoAtual()).toBe(false);
    });

    it('salvar manda só o campo editado, fecha o diálogo e avisa o host', async () => {
      const { montado, eventos } = await abrir(TipoUsuarioEnum.GESTOR, 'descricaoTecnica', true);
      montado.componente.aceitarDescricaoAssistente('novo texto');
      montado.componente.salvarDescricao();
      const requisicao = esperarRequisicao(montado.http, 'PUT', '/demanda/2');
      expect(requisicao.request.body).toEqual({ descricaoTecnica: 'novo texto' });
      responderSucesso(requisicao, null);
      expect(montado.componente.mostrarDialogDescricao()).toBe(false);
      expect(eventos.alterado).toBe(1);
    });

    it('fechar com alterações pergunta se salva; fechar sem alterações ou sem permissão fecha direto', async () => {
      const { montado } = await abrir(TipoUsuarioEnum.GESTOR, 'descricaoTecnica', true);
      const confirmacoes: unknown[] = [];
      const confirmacao = (montado.componente as unknown as { confirmationService: { confirm: (c: unknown) => void } }).confirmationService;
      confirmacao.confirm = (dados) => confirmacoes.push(dados);

      montado.componente.aoTentarFecharDescricao(false);
      expect(confirmacoes).toHaveLength(0);

      montado.componente.abrirDialogDescricaoPorId(2, 'descricaoTecnica');
      responderSucesso(esperarRequisicao(montado.http, 'GET', '/demanda/2'), { ...DEMANDA, podeEditar: true });
      montado.componente.aceitarDescricaoAssistente('mudou');
      montado.componente.aoTentarFecharDescricao(false);
      expect(montado.componente.mostrarDialogDescricao()).toBe(false);
      expect(confirmacoes).toHaveLength(1);

      const semPermissao = await abrir(TipoUsuarioEnum.DESENVOLVEDOR, 'descricaoCliente', true);
      const outras: unknown[] = [];
      (semPermissao.montado.componente as unknown as { confirmationService: { confirm: (c: unknown) => void } }).confirmationService.confirm = (d) => outras.push(d);
      semPermissao.montado.componente.aceitarDescricaoAssistente('x');
      semPermissao.montado.componente.aoTentarFecharDescricao(false);
      expect(outras).toHaveLength(0);
    });
  });
});

// ---------------------------------------------------------------------------
// demanda-planejamento-painel
// ---------------------------------------------------------------------------

describe('DemandaPlanejamentoPainelComponent', () => {
  function criarLinha(demandaId: number, sobrescritas: Partial<DemandaPlanejamentoDto> = {}): DemandaPlanejamentoDto {
    return {
      demandaId, caminho: `Raiz › Demanda ${demandaId}`, isEstrutural: false, status: TipoDemandaStatusEnum.PLANEJADA, horasEstimadas: 10,
      minutosExecutados: 0, temDescricaoTecnica: false, temDescricaoCliente: false, temDocumentacao: false, executoresAtivos: [], ...sobrescritas,
    };
  }

  async function montar(itens: DemandaPlanejamentoDto[], usuario = TipoUsuarioEnum.GESTOR) {
    const montado = await montarComponente(DemandaPlanejamentoPainelComponent, { usuario, entradas: { itens } });
    const status: unknown[] = [];
    const visualizar: number[] = [];
    montado.componente.statusAlterado.subscribe((valor) => status.push(valor));
    montado.componente.demandaVisualizarSolicitada.subscribe((id) => visualizar.push(id));
    return { montado, status, visualizar };
  }

  it('calcula percentual, estouro e minutos restantes; sem estimativa não há percentual', async () => {
    const { montado } = await montar([
      criarLinha(1, { horasEstimadas: 2, minutosExecutados: 30 }),
      criarLinha(2, { horasEstimadas: 1, minutosExecutados: 90 }),
      criarLinha(3, { horasEstimadas: 0, minutosExecutados: 15 }),
    ]);
    const [parcial, estourada, semEstimativa] = montado.componente.linhas();
    expect([parcial.percentualBarra, parcial.percentualRotulo, parcial.estourou, parcial.minutosRestantes]).toEqual([25, 25, false, 90]);
    expect([estourada.percentualBarra, estourada.percentualRotulo, estourada.estourou, estourada.minutosRestantes]).toEqual([100, 150, true, null]);
    expect([semEstimativa.percentual, semEstimativa.percentualBarra, semEstimativa.estourou, semEstimativa.minutosRestantes]).toEqual([null, 0, false, null]);
  });

  it('a cor da barra vai de azul até 75% a vermelho no limite e escurece acima de 100%', async () => {
    const { montado } = await montar([
      criarLinha(1, { horasEstimadas: 100, minutosExecutados: 0 }),
      criarLinha(2, { horasEstimadas: 100, minutosExecutados: 6000 }),
      criarLinha(3, { horasEstimadas: 100, minutosExecutados: 9000 }),
      criarLinha(4, { horasEstimadas: 0, minutosExecutados: 0 }),
    ]);
    const cores = montado.componente.linhas().map((linha) => linha.corBarra);
    expect(cores[0]).toBe('rgb(59, 130, 246)');
    expect(cores[1]).toBe('rgb(239, 68, 68)');
    expect(cores[2]).toBe('rgb(185, 28, 28)');
    expect(cores[3]).toBe('rgb(59, 130, 246)');
  });

  it('o menu de contexto do desenvolvedor não tem Editar/Membros; as ações emitem o id da linha', async () => {
    const { montado, visualizar } = await montar([criarLinha(8)], TipoUsuarioEnum.DESENVOLVEDOR);
    const menu = { show: () => undefined } as never;
    montado.componente.abrirMenu({} as MouseEvent, montado.componente.linhas()[0], menu);
    const rotulos = montado.componente.itensMenu.map((opcao) => opcao.label);
    for (const proibido of ['Editar', 'Membros']) expect(rotulos).not.toContain(proibido);
    montado.componente.itensMenu.find((opcao) => opcao.label === 'Visualizar')?.command?.({} as never);
    expect(visualizar).toEqual([8]);
  });

  it('escolher outro status emite na hora e confirma; recusa emite o status anterior; o mesmo status não faz nada', async () => {
    const { montado, status } = await montar([criarLinha(8)]);
    const popover = { toggle: () => undefined, hide: () => undefined } as never;
    montado.componente.abrirSeletorStatus({} as Event, montado.componente.linhas()[0], popover);

    montado.componente.alterarStatus(TipoDemandaStatusEnum.PLANEJADA, popover);
    montado.http.expectNone(() => true);

    montado.componente.alterarStatus(TipoDemandaStatusEnum.CONCLUIDA, popover);
    expect(status).toEqual([{ demandaId: 8, status: TipoDemandaStatusEnum.CONCLUIDA }]);
    const requisicao = esperarRequisicao(montado.http, 'PUT', '/demanda/8');
    expect(requisicao.request.body).toEqual({ status: TipoDemandaStatusEnum.CONCLUIDA });
    responderErro(requisicao, 400, 'recusado');
    await montado.atualizar();
    expect(status[1]).toEqual({ demandaId: 8, status: TipoDemandaStatusEnum.PLANEJADA });
  });

  it('rótulo, severidade e nomes dos executores', async () => {
    const { montado } = await montar([criarLinha(1, { executoresAtivos: [{ usuarioId: 1, nomeCompleto: 'Ana' }, { usuarioId: 2, nomeCompleto: 'Bia' }] as never })]);
    expect(montado.componente.rotuloStatus(TipoDemandaStatusEnum.CANCELADA)).toBe('Cancelada');
    expect(montado.componente.severidadeStatus(TipoDemandaStatusEnum.CONCLUIDA)).toBe('success');
    expect(montado.componente.nomesExecutores(montado.componente.linhas()[0])).toBe('Ana, Bia');
  });
});
