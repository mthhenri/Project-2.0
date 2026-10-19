import { describe, it, expect } from 'vitest';
import { TestBed } from '@angular/core/testing';
import { ConfirmationService } from 'primeng/api';
import { TipoDemandaStatusEnum, TipoUsuarioEnum } from '@project20/shared';
import { montarComponente, ComponenteMontado } from '../../../../../testes/montar-componente';
import { esperarRequisicao, responderErro, responderSucesso } from '../../../../../testes/http-teste';
import { DesfazerService } from '../../../../core/services/desfazer.service';
import { DemandaDetalheDialogComponent } from './demanda-detalhe-dialog.component';

// Detalhe da demanda (SYSTEM.SPEC.md §14): o desenvolvedor vê qualquer demanda de projeto acessível, mas só edita as que é membro
// (`podeEditar`); a descrição do cliente é sempre exclusiva do gestor.

type Montado = ComponenteMontado<DemandaDetalheDialogComponent>;

const DEMANDA = {
  id: 10, projetoId: 7, demandaPaiId: null, nome: 'Demanda de teste', descricaoTecnica: 'tecnica', descricaoCliente: 'cliente', documentacao: '',
  horasEstimadas: 8, status: TipoDemandaStatusEnum.PENDENTE, isEstrutural: false, previsaoFimData: null, createdDate: '2026-01-01T00:00:00Z', podeEditar: true,
};
const PAGINA = (itens: unknown[]) => ({ itens, totalItens: itens.length, paginaAtual: 1, itensPorPagina: 100, totalPaginas: 1 });

/**
 * Responde a tudo o que está pendente com o valor padrão da rota. O detalhe e os diálogos filhos (nova atividade, formulário) pedem catálogos
 * por conta própria, então a resposta é por URL em vez de por ordem. Devolve quantas chamadas respondeu.
 */
function responderPendentes(montado: Montado, podeEditar: boolean): string[] {
  const respondidas: string[] = [];
  for (const requisicao of montado.http.match(() => true)) {
    const caminho = requisicao.request.url.replace(/^.*\/api\/v1/, '');
    respondidas.push(`${requisicao.request.method} ${caminho}`);
    let dados: unknown = [];
    if (caminho === '/demanda/10') dados = { ...DEMANDA, podeEditar };
    else if (caminho === '/demanda/10/arvore') dados = { id: 10, nome: 'Demanda de teste', filhos: [] };
    else if (['/usuario', '/demanda', '/atividade'].includes(caminho)) dados = PAGINA([]);
    responderSucesso(requisicao, dados);
  }
  return respondidas;
}

/** Abre o detalhe e responde a todas as leituras iniciais; `podeEditar` simula a participação do desenvolvedor. */
async function abrir(tipo: TipoUsuarioEnum, podeEditar = true): Promise<{ montado: Montado; alteradas: number[]; excluidas: number[]; fechamentos: boolean[]; carga: string[] }> {
  const montado = await montarComponente(DemandaDetalheDialogComponent, { usuario: tipo, entradas: { demandaId: 10, visivel: true } });
  const alteradas: number[] = [];
  const excluidas: number[] = [];
  const fechamentos: boolean[] = [];
  montado.componente.demandaAlterada.subscribe(() => alteradas.push(1));
  montado.componente.demandaExcluida.subscribe(() => excluidas.push(1));
  montado.componente.visivelChange.subscribe((valor) => fechamentos.push(valor));

  const carga = responderPendentes(montado, podeEditar);
  await montado.atualizar();
  carga.push(...responderPendentes(montado, podeEditar));
  await montado.atualizar();
  return { montado, alteradas, excluidas, fechamentos, carga };
}

describe('DemandaDetalheDialogComponent — carregar', () => {
  it('gestor: lê a demanda, ancestral, sub-árvore, tags, membros, conexões, catálogo de tags, usuários e as atividades', async () => {
    const { montado, carga } = await abrir(TipoUsuarioEnum.GESTOR);
    expect(montado.componente.demanda()?.nome).toBe('Demanda de teste');
    expect(montado.componente.carregando()).toBe(false);
    expect(montado.componente.eMembro()).toBe(true);
    for (const rota of ['GET /demanda/10', 'GET /demanda/10/ancestral', 'GET /demanda/10/arvore', 'GET /demanda/10/tag', 'GET /demanda/10/membro', 'GET /demanda/10/conexao', 'GET /atividade']) {
      expect(carga.filter((chamada) => chamada.startsWith(rota)).length, rota).toBeGreaterThan(0);
    }
    expect(carga.some((chamada) => chamada === 'GET /usuario')).toBe(true);
  });

  it('desenvolvedor: NÃO pede a lista de usuários (é do gestor e derrubaria o carregamento com 403)', async () => {
    const { montado, carga } = await abrir(TipoUsuarioEnum.DESENVOLVEDOR);
    expect(carga.filter((chamada) => chamada === 'GET /usuario')).toEqual([]);
    expect(montado.componente.demanda()?.id).toBe(10);
  });

  it('desenvolvedor membro vê a aba de atividades (só as próprias); não membro cai na aba de conexões e não vê atividades', async () => {
    const membro = await abrir(TipoUsuarioEnum.DESENVOLVEDOR, true);
    expect(membro.montado.componente.eMembro()).toBe(true);
    expect(membro.montado.componente.abaInicial()).toBe('1');
    TestBed.resetTestingModule();

    const naoMembro = await abrir(TipoUsuarioEnum.DESENVOLVEDOR, false);
    expect(naoMembro.montado.componente.eMembro()).toBe(false);
    expect(naoMembro.montado.componente.abaInicial()).toBe('2');
    expect(naoMembro.carga.filter((chamada) => chamada === 'GET /atividade')).toEqual([]);
  });

  it('gestor e administrador são sempre "membros" para fins de edição', async () => {
    const { montado } = await abrir(TipoUsuarioEnum.ADMINISTRADOR, false);
    expect(montado.componente.eMembro()).toBe(true);
  });
});

describe('DemandaDetalheDialogComponent — descrições', () => {
  it('descrição do cliente é exclusiva do gestor: o desenvolvedor membro NÃO a edita, mas edita a técnica e a documentação', async () => {
    const { montado } = await abrir(TipoUsuarioEnum.DESENVOLVEDOR, true);
    montado.componente.abrirDialogDescricao('descricaoCliente');
    expect(montado.componente.podeEditarDescricaoAtual()).toBe(false);
    montado.componente.salvarDescricao();
    montado.http.expectNone((requisicao) => requisicao.method === 'PUT');

    for (const campo of ['descricaoTecnica', 'documentacao'] as const) {
      montado.componente.abrirDialogDescricao(campo);
      expect(montado.componente.podeEditarDescricaoAtual(), campo).toBe(true);
    }
  });

  it('desenvolvedor que não é membro só vê as descrições (nenhuma é editável)', async () => {
    const { montado } = await abrir(TipoUsuarioEnum.DESENVOLVEDOR, false);
    for (const campo of ['descricaoTecnica', 'descricaoCliente', 'documentacao'] as const) {
      montado.componente.abrirDialogDescricao(campo);
      expect(montado.componente.podeEditarDescricaoAtual(), campo).toBe(false);
    }
    expect(montado.componente.tooltipDescricao('descricaoTecnica')).toContain('clique para ver');
  });

  it('gestor edita as três descrições; o tooltip diz se está preenchida ou vazia', async () => {
    const { montado } = await abrir(TipoUsuarioEnum.GESTOR);
    for (const campo of ['descricaoTecnica', 'descricaoCliente', 'documentacao'] as const) {
      montado.componente.abrirDialogDescricao(campo);
      expect(montado.componente.podeEditarDescricaoAtual(), campo).toBe(true);
    }
    expect(montado.componente.tooltipDescricao('descricaoTecnica')).toBe('Descrição técnica — preenchida (clique para editar)');
    expect(montado.componente.tooltipDescricao('documentacao')).toBe('Documentação — vazia (clique para editar)');
  });

  it('salvar manda só o campo editado, avisa e recarrega a demanda', async () => {
    const { montado } = await abrir(TipoUsuarioEnum.GESTOR);
    montado.componente.abrirDialogDescricao('documentacao');
    montado.componente.formularioDescricao.patchValue({ valor: 'nova documentação' });
    montado.componente.salvarDescricao();
    const requisicao = esperarRequisicao(montado.http, 'PUT', '/v1/demanda/10');
    expect(requisicao.request.body).toEqual({ documentacao: 'nova documentação' });
    responderSucesso(requisicao, DEMANDA);
    responderSucesso(esperarRequisicao(montado.http, 'GET', '/v1/demanda/10'), { ...DEMANDA, documentacao: 'nova documentação' });
    await montado.atualizar();
    expect(montado.componente.mostrarDialogDescricao()).toBe(false);
    expect(montado.componente.demanda()?.documentacao).toBe('nova documentação');
  });

  it('fechar com alterações não salvas (e permissão) pergunta se quer salvar; sem alteração fecha direto', async () => {
    const { montado } = await abrir(TipoUsuarioEnum.GESTOR);
    const confirmacoes: unknown[] = [];
    montado.fixture.debugElement.injector.get(ConfirmationService).requireConfirmation$.subscribe((confirmacao) => confirmacoes.push(confirmacao));

    montado.componente.abrirDialogDescricao('descricaoTecnica');
    montado.componente.aoTentarFecharDescricao(false);
    expect(confirmacoes).toHaveLength(0);

    montado.componente.abrirDialogDescricao('descricaoTecnica');
    montado.componente.formularioDescricao.patchValue({ valor: 'mudou' });
    montado.componente.aoTentarFecharDescricao(false);
    expect(confirmacoes).toHaveLength(1);
    expect(montado.componente.mostrarDialogDescricao()).toBe(false);
  });

  it('quem não pode editar fecha sem pergunta, mesmo mexendo no texto', async () => {
    const { montado } = await abrir(TipoUsuarioEnum.DESENVOLVEDOR, false);
    const confirmacoes: unknown[] = [];
    montado.fixture.debugElement.injector.get(ConfirmationService).requireConfirmation$.subscribe((confirmacao) => confirmacoes.push(confirmacao));
    montado.componente.abrirDialogDescricao('descricaoTecnica');
    montado.componente.formularioDescricao.patchValue({ valor: 'tentativa' });
    montado.componente.aoTentarFecharDescricao(false);
    expect(confirmacoes).toHaveLength(0);
  });
});

describe('DemandaDetalheDialogComponent — título, status e métricas', () => {
  it('título vazio ou com caractere proibido é recusado sem chamar a API; título igual só fecha a edição', async () => {
    const { montado } = await abrir(TipoUsuarioEnum.GESTOR);
    montado.componente.iniciarEdicaoTitulo();
    montado.componente.tituloEdicao.set('   ');
    montado.componente.salvarTitulo();
    expect(montado.componente.erroTitulo()).toBe('O título não pode ficar vazio');
    montado.componente.tituloEdicao.set("com 'aspas'");
    montado.componente.salvarTitulo();
    expect(montado.componente.erroTitulo()).toContain('caracteres');
    montado.componente.tituloEdicao.set('Demanda de teste');
    montado.componente.salvarTitulo();
    expect(montado.componente.editandoTitulo()).toBe(false);
    montado.http.expectNone((requisicao) => requisicao.method === 'PUT');
  });

  it('título novo muda na hora, grava e avisa; se a API recusa volta ao nome anterior', async () => {
    const { montado, alteradas } = await abrir(TipoUsuarioEnum.GESTOR);
    montado.componente.iniciarEdicaoTitulo();
    montado.componente.tituloEdicao.set('Novo nome');
    montado.componente.salvarTitulo();
    expect(montado.componente.demanda()?.nome).toBe('Novo nome');
    const requisicao = esperarRequisicao(montado.http, 'PUT', '/v1/demanda/10');
    expect(requisicao.request.body).toEqual({ nome: 'Novo nome' });
    responderSucesso(requisicao, DEMANDA);
    expect(alteradas).toHaveLength(1);

    montado.componente.iniciarEdicaoTitulo();
    montado.componente.tituloEdicao.set('Outro nome');
    montado.componente.salvarTitulo();
    responderErro(esperarRequisicao(montado.http, 'PUT', '/v1/demanda/10'), 400, 'recusado');
    await montado.atualizar();
    expect(montado.componente.demanda()?.nome).toBe('Novo nome');
  });

  it('trocar o status muda na hora e avisa o painel; se a API recusa, volta e avisa de novo', async () => {
    const { montado } = await abrir(TipoUsuarioEnum.GESTOR);
    const avisos: Array<{ demandaId: number; status: string }> = [];
    montado.componente.statusAlterado.subscribe((aviso) => avisos.push(aviso));
    montado.componente.aoStatusEscolhido(TipoDemandaStatusEnum.CONCLUIDA);
    expect(montado.componente.demanda()?.status).toBe(TipoDemandaStatusEnum.CONCLUIDA);
    responderErro(esperarRequisicao(montado.http, 'PUT', '/v1/demanda/10'), 400, 'recusado');
    await montado.atualizar();
    expect(montado.componente.demanda()?.status).toBe(TipoDemandaStatusEnum.PENDENTE);
    expect(avisos).toEqual([{ demandaId: 10, status: 'CONCLUIDA' }, { demandaId: 10, status: 'PENDENTE' }]);
  });

  it('métrica alterada é aplicada na demanda e avisa quem hospeda; a reversão não avisa', async () => {
    const { montado, alteradas } = await abrir(TipoUsuarioEnum.GESTOR);
    montado.componente.aoMetricaAlterada({ horasEstimadas: 20 });
    expect(montado.componente.demanda()?.horasEstimadas).toBe(20);
    expect(alteradas).toHaveLength(1);
    montado.componente.aoMetricaAlterada({ horasEstimadas: 8, reverter: true });
    expect(montado.componente.demanda()?.horasEstimadas).toBe(8);
    expect(alteradas).toHaveLength(1);
  });
});

describe('DemandaDetalheDialogComponent — navegação e exclusão', () => {
  it('navegar para outra demanda guarda a atual; voltar restaura sem nenhuma chamada à API', async () => {
    const { montado } = await abrir(TipoUsuarioEnum.GESTOR);
    montado.componente.navegarParaSubDemanda(11);
    expect(montado.componente.historico()).toHaveLength(1);
    expect(montado.componente.nomeAnterior()).toBe('Demanda de teste');
    expect(montado.componente.demandaIdAtual()).toBe(11);
    // o pedido da demanda 11 fica pendente; voltar não pede nada novo
    const pendentes = montado.http.match(() => true).length;
    montado.componente.voltar();
    expect(montado.componente.demandaIdAtual()).toBe(10);
    expect(montado.componente.demanda()?.nome).toBe('Demanda de teste');
    expect(montado.componente.historico()).toHaveLength(0);
    expect(pendentes).toBeGreaterThan(0);
    montado.http.expectNone(() => true);
  });

  it('navegar para a demanda que já está aberta não faz nada', async () => {
    const { montado } = await abrir(TipoUsuarioEnum.GESTOR);
    montado.componente.navegarParaSubDemanda(10);
    expect(montado.componente.historico()).toHaveLength(0);
    montado.http.expectNone(() => true);
  });

  it('excluir: DELETE, fecha o detalhe, avisa a lista e oferece desfazer que restaura', async () => {
    const { montado, excluidas, fechamentos } = await abrir(TipoUsuarioEnum.GESTOR);
    (montado.componente as unknown as { excluirDemanda: () => void })['excluirDemanda']();
    responderSucesso(esperarRequisicao(montado.http, 'DELETE', '/v1/demanda/10'), null);
    expect(excluidas).toHaveLength(1);
    expect(fechamentos).toEqual([false]);
    expect(TestBed.inject(DesfazerService).oferta()?.mensagem).toBe('Demanda "Demanda de teste" excluída');
    TestBed.inject(DesfazerService).executar();
    responderSucesso(esperarRequisicao(montado.http, 'PATCH', '/demanda/10/restaurar'), {});
  });

  it('iniciais do usuário em maiúsculas e vazio para nome ausente', async () => {
    const { montado } = await abrir(TipoUsuarioEnum.GESTOR);
    expect(montado.componente.iniciaisUsuario('maria clara souza')).toBe('MC');
    expect(montado.componente.iniciaisUsuario(undefined as never)).toBe('');
  });
});
