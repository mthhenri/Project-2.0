import { describe, it, expect } from 'vitest';
import { TestBed } from '@angular/core/testing';
import { TipoDemandaStatusEnum, TipoUsuarioEnum } from '@project20/shared';
import { montarComponente, ComponenteMontado } from '../../../../../testes/montar-componente';
import { responderSucesso, esperarRequisicao } from '../../../../../testes/http-teste';
import { DemandaAbertaComponent } from './demanda-aberta.component';

// A demanda aberta da Árvore (task 239) faz o que o diálogo de detalhe fazia, com as abas Técnica, Cliente, Documentação, Atividades e Conexões.
// O desenvolvedor vê qualquer demanda acessível, mas só edita as de que é membro; a descrição do cliente é sempre do gestor.

type Montado = ComponenteMontado<DemandaAbertaComponent>;

const DEMANDA = {
  id: 10, projetoId: 7, demandaPaiId: null, nome: 'Demanda de teste', descricaoTecnica: 'texto tecnico', descricaoCliente: 'texto do cliente', documentacao: '',
  horasEstimadas: 8, status: TipoDemandaStatusEnum.PLANEJADA, isEstrutural: false, previsaoFimData: null, createdDate: '2026-01-01T00:00:00Z', podeEditar: true,
};
const PAGINA = (itens: unknown[]) => ({ itens, totalItens: itens.length, paginaAtual: 1, itensPorPagina: 100, totalPaginas: 1 });

function responderPendentes(montado: Montado, podeEditar: boolean): string[] {
  const respondidas: string[] = [];
  for (const requisicao of montado.http.match(() => true)) {
    const caminho = requisicao.request.url.replace(/^.*\/api\/v1/, '');
    respondidas.push(`${requisicao.request.method} ${caminho}`);
    let dados: unknown = [];
    if (caminho === '/demanda/10') dados = { ...DEMANDA, podeEditar };
    else if (caminho === '/demanda/10/arvore') dados = { id: 10, nome: 'Demanda de teste', filhos: [] };
    else if (caminho === '/plano/demanda/10') dados = null;
    else if (['/usuario', '/demanda', '/atividade'].includes(caminho)) dados = PAGINA([]);
    responderSucesso(requisicao, dados);
  }
  return respondidas;
}

async function abrir(tipo: TipoUsuarioEnum, podeEditar = true): Promise<{ montado: Montado; carga: string[]; navegacoes: number[] }> {
  const montado = await montarComponente(DemandaAbertaComponent, { usuario: tipo, entradas: { demandaId: 10, minutosExecutados: 120 } });
  const navegacoes: number[] = [];
  montado.componente.navegou.subscribe((id) => navegacoes.push(id));
  // `ngOnChanges` só roda com o binding de um host; aqui a entrada é posta direto, então dispara a carga como o host dispararia.
  montado.componente.ngOnChanges({ demandaId: { currentValue: 10, previousValue: undefined, firstChange: true, isFirstChange: () => true } });
  const carga = responderPendentes(montado, podeEditar);
  await montado.atualizar();
  carga.push(...responderPendentes(montado, podeEditar));
  await montado.atualizar();
  return { montado, carga, navegacoes };
}

const texto = (montado: Montado) => montado.elemento.textContent ?? '';
const abas = (montado: Montado) => Array.from(montado.elemento.querySelectorAll('p-tab')).map((aba) => aba.textContent?.trim());
const botao = (montado: Montado, rotulo: string) => Array.from(montado.elemento.querySelectorAll('button')).find((item) => item.textContent?.includes(rotulo));
/** O botão Editar do texto da descrição (o "Editar" do topo abre o formulário completo). */
const editarDescricao = (montado: Montado) => montado.elemento.querySelector<HTMLButtonElement>('.demanda-aberta__acoes-texto button');

describe('DemandaAbertaComponent — o que mostra', () => {
  it('gestor: nome, status com o nome, barra de horas, as cinco abas e o texto da técnica para leitura', async () => {
    const { montado, carga } = await abrir(TipoUsuarioEnum.GESTOR);
    expect(montado.componente.demanda()?.nome).toBe('Demanda de teste');
    expect(texto(montado)).toContain('Demanda de teste');
    expect(texto(montado)).toContain('Planejada');
    expect(texto(montado)).toContain('2h 0min de 8h');
    expect(abas(montado)).toEqual(['Técnica', 'Cliente', 'Documentação', 'Atividades', 'Conexões']);
    expect(montado.componente.abaAtiva()).toBe('tecnica');
    expect(texto(montado)).toContain('texto tecnico');
    expect(editarDescricao(montado)).not.toBeNull();
    for (const rota of ['GET /demanda/10', 'GET /demanda/10/ancestral', 'GET /demanda/10/tag', 'GET /demanda/10/membro', 'GET /demanda/10/conexao', 'GET /atividade']) {
      expect(carga.filter((chamada) => chamada.startsWith(rota)).length, rota).toBeGreaterThan(0);
    }
  });

  it('desenvolvedor membro: vê Atividades, edita a técnica e a documentação, mas não a descrição do cliente', async () => {
    const { montado } = await abrir(TipoUsuarioEnum.DESENVOLVEDOR, true);
    expect(abas(montado)).toContain('Atividades');
    expect(montado.componente.podeEditarDescricao('descricaoTecnica')).toBe(true);
    expect(montado.componente.podeEditarDescricao('documentacao')).toBe(true);
    expect(montado.componente.podeEditarDescricao('descricaoCliente')).toBe(false);
    montado.componente.aba.set('cliente');
    await montado.atualizar();
    expect(texto(montado)).toContain('texto do cliente');
    expect(editarDescricao(montado)).toBeNull();
  });

  it('desenvolvedor que não é membro: sem a aba Atividades, sem editar nada, e uma aba de Atividades pedida cai na Técnica', async () => {
    const { montado, carga } = await abrir(TipoUsuarioEnum.DESENVOLVEDOR, false);
    expect(abas(montado)).toEqual(['Técnica', 'Cliente', 'Documentação', 'Conexões']);
    expect(carga.filter((chamada) => chamada === 'GET /atividade')).toEqual([]);
    expect(montado.componente.podeEditarDescricao('descricaoTecnica')).toBe(false);
    montado.componente.aba.set('atividades');
    expect(montado.componente.abaAtiva()).toBe('tecnica');
    expect(editarDescricao(montado)).toBeNull();
  });

  it('descrição vazia mostra o convite: o gestor escreve; quem não é da demanda só vê o aviso', async () => {
    const gestor = await abrir(TipoUsuarioEnum.GESTOR);
    gestor.montado.componente.aba.set('doc');
    await gestor.montado.atualizar();
    expect(texto(gestor.montado)).toContain('Sem a documentação ainda');
    expect(botao(gestor.montado, 'Escrever')).toBeDefined();
    TestBed.resetTestingModule();

    const naoMembro = await abrir(TipoUsuarioEnum.DESENVOLVEDOR, false);
    naoMembro.montado.componente.aba.set('doc');
    await naoMembro.montado.atualizar();
    expect(botao(naoMembro.montado, 'Escrever')).toBeUndefined();
    expect(texto(naoMembro.montado)).toContain('Só quem é da demanda escreve aqui');
  });

  it('o botão Editar da descrição abre o diálogo de edição com o texto', async () => {
    const { montado } = await abrir(TipoUsuarioEnum.GESTOR);
    editarDescricao(montado)!.click();
    await montado.atualizar();
    expect(montado.componente.mostrarDialogDescricao()).toBe(true);
    expect(montado.componente.campoDescricaoEditando()).toBe('descricaoTecnica');
    expect(montado.componente.formularioDescricao.value.valor).toBe('texto tecnico');
  });
});

describe('DemandaAbertaComponent — navegação e título', () => {
  it('abrir outra demanda por dentro avisa a página; voltar restaura e avisa de novo', async () => {
    const { montado, navegacoes } = await abrir(TipoUsuarioEnum.GESTOR);
    montado.componente.navegarParaSubDemanda(11);
    expect(navegacoes).toEqual([11]);
    expect(montado.componente.historico().length).toBe(1);
    responderPendentes(montado, true);
    montado.componente.voltar();
    expect(navegacoes).toEqual([11, 10]);
    montado.componente.navegarParaSubDemanda(10);
    expect(navegacoes).toEqual([11, 10]);
  });

  it('a página trocar o id recarrega; o mesmo id, ou o id que a própria demanda aberta já navegou, não', async () => {
    const { montado } = await abrir(TipoUsuarioEnum.GESTOR);
    montado.componente.ngOnChanges({ demandaId: { currentValue: 10, previousValue: 10, firstChange: false, isFirstChange: () => false } });
    montado.http.expectNone(() => true);
    montado.fixture.componentRef.setInput('demandaId', 12);
    montado.componente.ngOnChanges({ demandaId: { currentValue: 12, previousValue: 10, firstChange: false, isFirstChange: () => false } });
    expect(montado.http.match((r) => r.url.endsWith('/demanda/12') && !r.url.includes('/plano/')).length).toBe(1);
  });

  it('gestor edita o título pelo lápis: Enter salva (PUT), vazio é recusado', async () => {
    const { montado } = await abrir(TipoUsuarioEnum.GESTOR);
    montado.componente.iniciarEdicaoTitulo();
    montado.componente.tituloEdicao.set('   ');
    montado.componente.salvarTitulo();
    expect(montado.componente.erroTitulo()).toBe('O título não pode ficar vazio');
    montado.componente.tituloEdicao.set('Novo nome');
    montado.componente.salvarTitulo();
    expect(montado.componente.demanda()?.nome).toBe('Novo nome');
    expect(esperarRequisicao(montado.http, 'PUT', '/demanda/10').request.body).toEqual({ nome: 'Novo nome' });
  });

  it('trocar o status pela bolinha é otimista e emite o novo status', async () => {
    const { montado } = await abrir(TipoUsuarioEnum.GESTOR);
    const status: unknown[] = [];
    montado.componente.statusAlterado.subscribe((valor) => status.push(valor));
    montado.componente.aoStatusEscolhido(TipoDemandaStatusEnum.CONCLUIDA);
    expect(montado.componente.demanda()?.status).toBe(TipoDemandaStatusEnum.CONCLUIDA);
    expect(status).toEqual([{ demandaId: 10, status: TipoDemandaStatusEnum.CONCLUIDA }]);
    expect(esperarRequisicao(montado.http, 'PUT', '/demanda/10').request.body).toEqual({ status: TipoDemandaStatusEnum.CONCLUIDA });
  });
});
