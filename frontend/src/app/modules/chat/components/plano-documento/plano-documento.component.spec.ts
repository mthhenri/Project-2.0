import { describe, it, expect } from 'vitest';
import { TipoUsuarioEnum } from '@project20/shared';
import { montarComponente, ComponenteMontado } from '../../../../../testes/montar-componente';
import { esperarRequisicao, responderErro, responderSucesso } from '../../../../../testes/http-teste';
import { PlanoDocumentoComponent } from './plano-documento.component';

// Documento do plano (task 233, API da 232): carregar, abas por perfil (a do cliente é só de gestor e administrador), gravar com a `versao` lida,
// conflito de versão (409), e as ações do cabeçalho. O usuário de teste tem id 1; o criador do plano é 1 ou 2 conforme o cenário.

type Montado = ComponenteMontado<PlanoDocumentoComponent>;

function plano(sobrescrita: Record<string, unknown> = {}) {
  return {
    id: 7, titulo: 'Plano da semana', projetoId: 10, projetoNome: 'Projeto Demo', demandaId: null, demandaNome: null, publicacaoData: null,
    criadorId: 1, criadorNome: 'Eu', isSolo: false, isArquivado: false, descricaoTecnica: 'Texto técnico', documentacao: null,
    versao: 3, createdDate: '2026-10-20T12:00:00.000Z', updatedDate: '2026-10-21T12:00:00.000Z', ...sobrescrita,
  };
}

async function montarDocumento(usuario: TipoUsuarioEnum, dados: Record<string, unknown> = plano()): Promise<Montado> {
  const montado = await montarComponente(PlanoDocumentoComponent, { usuario, entradas: { planoId: 7 } });
  responderSucesso(esperarRequisicao(montado.http, 'GET', '/plano/7'), dados);
  await montado.atualizar();
  return montado;
}

const abas = (montado: Montado) => Array.from(montado.elemento.querySelectorAll('[role="tab"]')).map((aba) => aba.textContent?.trim());
const texto = (montado: Montado) => montado.elemento.textContent ?? '';
const botao = (montado: Montado, rotulo: string) =>
  Array.from(montado.elemento.querySelectorAll<HTMLButtonElement>('button')).find((item) => item.textContent?.includes(rotulo) || item.getAttribute('aria-label') === rotulo);

describe('PlanoDocumentoComponent — carregar', () => {
  it('mostra o título, o projeto e as abas; o desenvolvedor não vê a descrição do cliente', async () => {
    const montado = await montarDocumento(TipoUsuarioEnum.DESENVOLVEDOR);

    expect(texto(montado)).toContain('Plano da semana');
    expect(texto(montado)).toContain('Projeto Demo');
    expect(abas(montado)).toEqual(['Descrição técnica', 'Documentação']);
    expect(montado.componente.controleTecnica.value).toBe('Texto técnico');
    expect(texto(montado)).toContain('Tudo gravado');
  });

  it('o gestor vê a aba da descrição do cliente, com o texto', async () => {
    const montado = await montarDocumento(TipoUsuarioEnum.GESTOR, plano({ descricaoCliente: 'Texto do cliente' }));
    expect(abas(montado)).toEqual(['Descrição técnica', 'Descrição do cliente', 'Documentação']);
    expect(montado.componente.controleCliente.value).toBe('Texto do cliente');
  });

  it('o administrador também vê a aba da descrição do cliente', async () => {
    const montado = await montarDocumento(TipoUsuarioEnum.ADMINISTRADOR);
    expect(abas(montado)).toContain('Descrição do cliente');
  });

  it('plano amplo aparece como pessoal e oferece atribuir a um projeto', async () => {
    const montado = await montarDocumento(TipoUsuarioEnum.DESENVOLVEDOR, plano({ projetoId: null, projetoNome: null }));

    expect(texto(montado)).toContain('Pessoal');
    expect(botao(montado, 'Atribuir a um projeto')).toBeDefined();
  });

  it('enquanto carrega mostra o esqueleto; se a leitura falha, avisa e oferece tentar de novo', async () => {
    const montado = await montarComponente(PlanoDocumentoComponent, { usuario: TipoUsuarioEnum.DESENVOLVEDOR, entradas: { planoId: 7 } });
    expect(montado.elemento.querySelector('[aria-busy="true"]')).not.toBeNull();

    esperarRequisicao(montado.http, 'GET', '/plano/7').flush({ mensagem: 'falhou' }, { status: 500, statusText: 'Erro' });
    await montado.atualizar();
    expect(texto(montado)).toContain('Não foi possível abrir o plano.');

    botao(montado, 'Tentar de novo')!.click();
    responderSucesso(esperarRequisicao(montado.http, 'GET', '/plano/7'), plano());
    await montado.atualizar();
    expect(texto(montado)).toContain('Plano da semana');
  });
});

describe('PlanoDocumentoComponent — gravar', () => {
  it('grava só o que mudou, com a versão lida, e passa a usar a versão nova', async () => {
    const montado = await montarDocumento(TipoUsuarioEnum.DESENVOLVEDOR);
    montado.componente.controleDocumentacao.setValue('Rascunho da documentação');
    await montado.atualizar();
    expect(texto(montado)).toContain('Alterações sem gravar');

    botao(montado, 'Gravar')!.click();
    const requisicao = esperarRequisicao(montado.http, 'PUT', '/plano/7');
    expect(requisicao.request.body).toEqual({ versao: 3, documentacao: 'Rascunho da documentação' });
    responderSucesso(requisicao, { id: 7, titulo: 'Plano da semana', versao: 4, updatedDate: '2026-10-25T12:00:00.000Z' });
    await montado.atualizar();

    expect(texto(montado)).toContain('Tudo gravado');
    expect(montado.componente.plano()?.versao).toBe(4);

    montado.componente.controleTecnica.setValue('Outro técnico');
    await montado.atualizar();
    botao(montado, 'Gravar')!.click();
    expect(esperarRequisicao(montado.http, 'PUT', '/plano/7').request.body).toEqual({ versao: 4, descricaoTecnica: 'Outro técnico' });
  });

  it('o gestor também grava a descrição do cliente', async () => {
    const montado = await montarDocumento(TipoUsuarioEnum.GESTOR);
    montado.componente.controleCliente.setValue('Pedido do cliente');
    await montado.atualizar();
    botao(montado, 'Gravar')!.click();
    expect(esperarRequisicao(montado.http, 'PUT', '/plano/7').request.body).toEqual({ versao: 3, descricaoCliente: 'Pedido do cliente' });
  });

  it('o desenvolvedor nunca envia a descrição do cliente: mexer nela não habilita o Gravar', async () => {
    const montado = await montarDocumento(TipoUsuarioEnum.DESENVOLVEDOR);
    montado.componente.controleCliente.setValue('Escondido');
    await montado.atualizar();
    expect(botao(montado, 'Gravar')!.disabled).toBe(true);
  });

  it('sem alteração o botão Gravar fica desabilitado', async () => {
    const montado = await montarDocumento(TipoUsuarioEnum.DESENVOLVEDOR);
    expect(botao(montado, 'Gravar')!.disabled).toBe(true);
  });

  it('409 (outra pessoa gravou antes): avisa, mantém o que foi escrito e Recarregar relê o plano', async () => {
    const montado = await montarDocumento(TipoUsuarioEnum.DESENVOLVEDOR);
    montado.componente.controleDocumentacao.setValue('Meu texto');
    await montado.atualizar();

    botao(montado, 'Gravar')!.click();
    responderErro(esperarRequisicao(montado.http, 'PUT', '/plano/7'), 409, 'O plano foi alterado por outra pessoa.');
    await montado.atualizar();

    expect(texto(montado)).toContain('Outra pessoa gravou uma versão mais nova');
    expect(montado.componente.controleDocumentacao.value).toBe('Meu texto');
    expect(montado.errosHttpNaoTratados).toHaveLength(0);

    botao(montado, 'Recarregar')!.click();
    responderSucesso(esperarRequisicao(montado.http, 'GET', '/plano/7'), plano({ versao: 5, documentacao: 'Texto da outra pessoa' }));
    await montado.atualizar();

    expect(texto(montado)).not.toContain('Outra pessoa gravou uma versão mais nova');
    expect(montado.componente.controleDocumentacao.value).toBe('Texto da outra pessoa');
    expect(montado.componente.plano()?.versao).toBe(5);
  });
});

describe('PlanoDocumentoComponent — cabeçalho', () => {
  it('renomear grava o título com a versão lida e avisa quem abriu', async () => {
    const montado = await montarDocumento(TipoUsuarioEnum.DESENVOLVEDOR);
    const identificados: Array<{ id: number; titulo: string }> = [];
    montado.componente.identificado.subscribe((valor) => identificados.push(valor));

    montado.elemento.querySelector<HTMLButtonElement>('.plano-cabecalho__titulo-botao')!.click();
    await montado.atualizar();
    const campoTitulo = montado.elemento.querySelector<HTMLInputElement>('[aria-label="Título do plano"]')!;
    campoTitulo.value = 'Plano renomeado';
    campoTitulo.dispatchEvent(new Event('input'));
    campoTitulo.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter' }));
    await montado.atualizar();

    const requisicao = esperarRequisicao(montado.http, 'PUT', '/plano/7');
    expect(requisicao.request.body).toEqual({ versao: 3, titulo: 'Plano renomeado' });
    responderSucesso(requisicao, { id: 7, titulo: 'Plano renomeado', versao: 4, updatedDate: '2026-10-25T12:00:00.000Z' });
    await montado.atualizar();

    expect(texto(montado)).toContain('Plano renomeado');
    expect(identificados).toEqual([{ id: 7, titulo: 'Plano renomeado' }]);
  });

  it('quem não criou o plano não vê o controle Solo', async () => {
    const montado = await montarDocumento(TipoUsuarioEnum.DESENVOLVEDOR, plano({ criadorId: 2 }));
    expect(montado.elemento.querySelector('.plano-cabecalho__solo')).toBeNull();
  });

  it('o criador marca o plano como solo e a API é chamada', async () => {
    const montado = await montarDocumento(TipoUsuarioEnum.DESENVOLVEDOR);
    montado.elemento.querySelector<HTMLInputElement>('.plano-cabecalho__solo input')!.click();
    const requisicao = esperarRequisicao(montado.http, 'PATCH', '/plano/7/solo');
    expect(requisicao.request.body).toEqual({ isSolo: true });
    responderSucesso(requisicao, { id: 7, isSolo: true });
    await montado.atualizar();
    expect(montado.componente.plano()?.isSolo).toBe(true);
  });

  it('arquivar chama a API e o plano passa a mostrar a marca de arquivado', async () => {
    const montado = await montarDocumento(TipoUsuarioEnum.GESTOR);
    montado.elemento.querySelector<HTMLButtonElement>('[aria-label="Arquivar o plano"]')!.click();
    const requisicao = esperarRequisicao(montado.http, 'PATCH', '/plano/7/arquivo');
    expect(requisicao.request.body).toEqual({ isArquivado: true });
    responderSucesso(requisicao, { id: 7, isArquivado: true });
    await montado.atualizar();

    expect(texto(montado)).toContain('Arquivado');
  });

  it('excluir (confirmado) chama a API e avisa quem abriu', async () => {
    const montado = await montarDocumento(TipoUsuarioEnum.GESTOR);
    let excluiu = false;
    montado.componente.excluido.subscribe(() => (excluiu = true));

    montado.componente.excluir();
    responderSucesso(esperarRequisicao(montado.http, 'DELETE', '/plano/7'), null);
    await montado.atualizar();

    expect(excluiu).toBe(true);
  });

  it('ligar a demanda com texto sem gravar é recusado com aviso; com tudo gravado liga e relê o plano', async () => {
    const montado = await montarDocumento(TipoUsuarioEnum.GESTOR);
    const avisos: Array<{ detail?: string }> = [];
    montado.mensagens.messageObserver.subscribe((aviso) => avisos.push(aviso as { detail?: string }));

    montado.componente.controleDocumentacao.setValue('Ainda não gravei');
    montado.componente.ligarDemanda(20);
    montado.http.expectNone((requisicao) => requisicao.url.endsWith('/plano/7/demanda'));
    expect(avisos[0]?.detail).toContain('Grave as alterações antes de ligar a demanda');

    montado.componente.controleDocumentacao.setValue('');
    montado.componente.ligarDemanda(20);
    const requisicao = esperarRequisicao(montado.http, 'PUT', '/plano/7/demanda');
    expect(requisicao.request.body).toEqual({ demandaId: 20 });
    responderSucesso(requisicao, { id: 7, demandaId: 20, versao: 4, abasPreenchidas: ['DOCUMENTACAO'] });
    responderSucesso(esperarRequisicao(montado.http, 'GET', '/plano/7'), plano({ demandaId: 20, demandaNome: 'Tela de login', versao: 4, documentacao: 'Da demanda' }));
    await montado.atualizar();

    expect(texto(montado)).toContain('Tela de login');
    expect(montado.componente.controleDocumentacao.value).toBe('Da demanda');
  });
});
