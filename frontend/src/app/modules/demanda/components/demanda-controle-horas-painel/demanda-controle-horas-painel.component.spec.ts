import { describe, it, expect } from 'vitest';
import { TestBed } from '@angular/core/testing';
import { DemandaGrafoNoDto, DemandaPlanejamentoDto, TipoDemandaStatusEnum, TipoUsuarioEnum } from '@project20/shared';
import { montarComponente } from '../../../../../testes/montar-componente';
import { esperarRequisicao, responderErro, responderSucesso } from '../../../../../testes/http-teste';
import { DemandaControleHorasPainelComponent } from './demanda-controle-horas-painel.component';

const DIA = 86_400_000;
const haDias = (dias: number) => new Date(Date.now() - dias * DIA);

function criarNo(id: number, sobrescritas: Partial<DemandaGrafoNoDto> = {}): DemandaGrafoNoDto {
  return {
    id, nome: `Demanda ${id}`, status: TipoDemandaStatusEnum.PLANEJADA, isEstrutural: false, horasEstimadas: 10, minutosExecutados: 0,
    demandaPaiId: null, temDescricaoTecnica: false, temDescricaoCliente: false, temDocumentacao: false, tags: [], ...sobrescritas,
  };
}

function criarLinha(demandaId: number, sobrescritas: Partial<DemandaPlanejamentoDto> = {}): DemandaPlanejamentoDto {
  return {
    demandaId, caminho: `Raiz › Demanda ${demandaId}`, isEstrutural: false, status: TipoDemandaStatusEnum.PLANEJADA, horasEstimadas: 10,
    minutosExecutados: 0, temDescricaoTecnica: false, temDescricaoCliente: false, temDocumentacao: false, ultimaExecucaoData: haDias(1),
    criadaData: haDias(30), executoresAtivos: [], ...sobrescritas,
  };
}

// Pasta 1 (2h + 4h dentro, 1h executada de 2h) com uma subpasta 3 (6h concluída); a 6 solta, sem estimativa.
const NOS = [
  criarNo(1, { nome: 'Pasta', isEstrutural: true, horasEstimadas: 2, minutosExecutados: 60 }),
  criarNo(2, { demandaPaiId: 1, horasEstimadas: 4, minutosExecutados: 120 }),
  criarNo(3, { nome: 'Sub', demandaPaiId: 1, isEstrutural: true, horasEstimadas: 0 }),
  criarNo(4, { demandaPaiId: 3, horasEstimadas: 6, minutosExecutados: 60, status: TipoDemandaStatusEnum.CONCLUIDA }),
  criarNo(6, { nome: 'Solta', horasEstimadas: 0, status: TipoDemandaStatusEnum.PENDENTE }),
];

async function montar(entradas: Record<string, unknown> = {}, usuario = TipoUsuarioEnum.GESTOR) {
  TestBed.resetTestingModule();
  const montado = await montarComponente(DemandaControleHorasPainelComponent, { usuario, entradas: { nos: NOS, itens: [], ...entradas } });
  const status: unknown[] = [];
  const visualizar: number[] = [];
  const estimadas: unknown[] = [];
  montado.componente.statusAlterado.subscribe((valor) => status.push(valor));
  montado.componente.demandaVisualizarSolicitada.subscribe((id) => visualizar.push(id));
  montado.componente.horasEstimadasAlteradas.subscribe((valor) => estimadas.push(valor));
  return { montado, status, visualizar, estimadas };
}

const nomesDasLinhas = (componente: DemandaControleHorasPainelComponent) => componente.linhas().map((linha) => linha.noHoras.no.id);

describe('DemandaControleHorasPainelComponent', () => {
  it('monta a árvore: pasta com o total do que há dentro, subpasta, e a demanda solta por último', async () => {
    const { montado } = await montar();
    expect(nomesDasLinhas(montado.componente)).toEqual([1, 3, 4, 2, 6]);
    const pasta = montado.componente.linhas()[0].noHoras;
    expect([pasta.horasTotais, pasta.minutosTotais]).toEqual([12, 240]);
  });

  it('o resumo do topo soma estimado e executado do projeto; sem estouro mostra um traço', async () => {
    const { montado } = await montar();
    expect(montado.componente.resumo().horasEstimadas).toBe(12);
    expect(montado.componente.resumo().minutosExecutados).toBe(240);
    expect(montado.elemento.textContent).toContain('Estouro');
    expect(montado.componente.resumo().demandasEstouradas).toBe(0);
  });

  it('a pasta abre e fecha: recolhida esconde o que tem dentro, e o clique na pasta alterna sem abrir a demanda', async () => {
    const { montado, visualizar } = await montar();
    montado.componente.aoClicarLinha(montado.componente.linhas()[0]);
    expect(nomesDasLinhas(montado.componente)).toEqual([1, 6]);
    expect(montado.componente.linhas()[0].recolhida).toBe(true);
    montado.componente.aoClicarLinha(montado.componente.linhas()[0]);
    expect(nomesDasLinhas(montado.componente)).toEqual([1, 3, 4, 2, 6]);
    expect(visualizar).toEqual([]);
  });

  it('clicar numa demanda pede para abri-la na Árvore', async () => {
    const { montado, visualizar } = await montar();
    montado.componente.aoClicarLinha(montado.componente.linhas().find((linha) => linha.noHoras.no.id === 2)!);
    expect(visualizar).toEqual([2]);
  });

  it('a pasta escolhida na Árvore reabre o caminho até ela', async () => {
    const { montado } = await montar({ pastaId: 3 });
    montado.componente.recolhidas.set(new Set([1]));
    montado.fixture.componentRef.setInput('pastaId', 4);
    montado.fixture.componentRef.setInput('pastaId', 3);
    await montado.atualizar();
    expect(montado.componente.recolhidas().has(1)).toBe(false);
  });

  it('o executor aparece na linha da demanda e uma só vez no resumo, mesmo executando em duas', async () => {
    const executor = (usuarioId: number, nome: string, inicio: Date) => ({ usuarioId, nomeCompleto: nome, inicioData: inicio });
    const { montado } = await montar({
      itens: [
        criarLinha(2, { executoresAtivos: [executor(1, 'Ana Souza', haDias(0.1))] }),
        criarLinha(6, { executoresAtivos: [executor(1, 'Ana Souza', haDias(0.5)), executor(2, 'Bia Lima', haDias(0.2))] }),
      ],
    });
    const linhaDois = montado.componente.linhas().find((linha) => linha.noHoras.no.id === 2)!;
    expect(linhaDois.executores.map((pessoa) => pessoa.nomeCompleto)).toEqual(['Ana Souza']);
    expect(montado.componente.executoresDoProjeto().map((pessoa) => pessoa.nomeCompleto)).toEqual(['Ana Souza', 'Bia Lima']);
    expect(montado.elemento.textContent).toContain('AS');
    expect(montado.componente.dicaDoExecutor(montado.componente.executoresDoProjeto()[0])).toMatch(/^Ana Souza · há /);
  });

  it('mais de quatro executores: quatro bolinhas e o excedente em "+N"', async () => {
    const pessoas = [1, 2, 3, 4, 5, 6].map((usuarioId) => ({ usuarioId, nomeCompleto: `Pessoa ${usuarioId}`, inicioData: haDias(0.1) }));
    const { montado } = await montar({ itens: [criarLinha(2, { executoresAtivos: pessoas })] });
    expect(montado.componente.executoresNoResumo()).toHaveLength(4);
    expect(montado.componente.executoresExcedentes()).toHaveLength(2);
    expect(montado.elemento.textContent).toContain('+2');
  });

  it('o cartão "Sem estimativa" lista as demandas de trabalho em andamento sem estimativa (nem pasta, nem concluída)', async () => {
    const { montado } = await montar();
    expect(montado.componente.semEstimativa().map((cartao) => cartao.no.id)).toEqual([6]);
  });

  it('estimar grava pela alteração da demanda e avisa a página; sem valor, não faz nada', async () => {
    const { montado, estimadas } = await montar();
    const cartao = montado.componente.semEstimativa()[0];

    montado.componente.estimar(cartao);
    montado.http.expectNone(() => true);

    cartao.controle.setValue(3.5);
    montado.componente.estimar(cartao);
    const requisicao = esperarRequisicao(montado.http, 'PUT', '/demanda/6');
    expect(requisicao.request.body).toEqual({ horasEstimadas: 3.5 });
    responderSucesso(requisicao, { id: 6 });
    await montado.atualizar();
    expect(estimadas).toEqual([{ demandaId: 6, horasEstimadas: 3.5 }]);
    expect(montado.componente.salvandoEstimativa().size).toBe(0);
  });

  it('estimativa recusada não avisa a página e libera o botão', async () => {
    const { montado, estimadas } = await montar();
    const cartao = montado.componente.semEstimativa()[0];
    cartao.controle.setValue(2);
    montado.componente.estimar(cartao);
    responderErro(esperarRequisicao(montado.http, 'PUT', '/demanda/6'), 400, 'recusado');
    await montado.atualizar();
    expect(estimadas).toEqual([]);
    expect(montado.componente.salvandoEstimativa().size).toBe(0);
  });

  it('o desenvolvedor não vê o campo de estimar (a tela é do gestor, mas o componente não grava sozinho)', async () => {
    const { montado } = await montar({}, TipoUsuarioEnum.DESENVOLVEDOR);
    expect(montado.elemento.querySelector('p-inputnumber')).toBeNull();
  });

  it('o cartão "Paradas" lista pela regra do shared, as mais antigas primeiro, e diz há quanto tempo', async () => {
    const { montado, visualizar } = await montar({
      itens: [
        criarLinha(2, { ultimaExecucaoData: haDias(10) }),
        criarLinha(6, { ultimaExecucaoData: haDias(20) }),
        criarLinha(7, { ultimaExecucaoData: haDias(3) }),
        criarLinha(8, { ultimaExecucaoData: null, criadaData: haDias(9) }),
        criarLinha(9, { ultimaExecucaoData: haDias(40), horasEstimadas: 0 }),
        criarLinha(10, { ultimaExecucaoData: haDias(40), isEstrutural: true }),
      ],
    });
    const paradas = montado.componente.paradas();
    expect(paradas.map((parada) => parada.linha.demandaId)).toEqual([6, 2, 8]);
    expect(paradas[0].situacao).toBe('última execução há 20 dias');
    expect(paradas[2].situacao).toBe('nunca executada, criada há 9 dias');

    (montado.elemento.querySelectorAll('.controle-horas__cartao-linha--botao')[0] as HTMLElement).click();
    expect(visualizar).toEqual([6]);
  });

  it('projeto sem demandas mostra o aviso; carregando sem dados mostra o esqueleto', async () => {
    const vazio = await montar({ nos: [] });
    expect(vazio.montado.elemento.textContent).toContain('ainda não tem demandas');
    const carregando = await montar({ nos: [], carregando: true });
    expect(carregando.montado.elemento.querySelector('app-skeleton-lista')).not.toBeNull();
  });

  it('o menu de contexto do desenvolvedor não tem Editar/Membros; as ações emitem o id da demanda', async () => {
    const { montado, visualizar } = await montar({}, TipoUsuarioEnum.DESENVOLVEDOR);
    montado.componente.abrirMenu({} as MouseEvent, NOS[1], { show: () => undefined } as never);
    const rotulos = montado.componente.itensMenu.map((opcao) => opcao.label);
    for (const proibido of ['Editar', 'Membros']) expect(rotulos).not.toContain(proibido);
    montado.componente.itensMenu.find((opcao) => opcao.label === 'Visualizar')?.command?.({} as never);
    expect(visualizar).toEqual([2]);
  });

  it('escolher outro status emite na hora e confirma; recusa emite o status anterior; o mesmo status não faz nada', async () => {
    const { montado, status } = await montar();
    const no = NOS[1];

    montado.componente.alterarStatus(no, TipoDemandaStatusEnum.PLANEJADA);
    montado.http.expectNone(() => true);

    montado.componente.alterarStatus(no, TipoDemandaStatusEnum.CONCLUIDA);
    expect(status).toEqual([{ demandaId: 2, status: TipoDemandaStatusEnum.CONCLUIDA }]);
    const requisicao = esperarRequisicao(montado.http, 'PUT', '/demanda/2');
    expect(requisicao.request.body).toEqual({ status: TipoDemandaStatusEnum.CONCLUIDA });
    responderErro(requisicao, 400, 'recusado');
    await montado.atualizar();
    expect(status[1]).toEqual({ demandaId: 2, status: TipoDemandaStatusEnum.PLANEJADA });
  });
});
