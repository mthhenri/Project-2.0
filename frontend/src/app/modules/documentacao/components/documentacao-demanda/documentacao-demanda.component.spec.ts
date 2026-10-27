import { describe, expect, it } from 'vitest';
import { TestBed } from '@angular/core/testing';
import { EstadoIaEnum, PlanoAbaEnum, TipoDemandaStatusEnum, TipoUsuarioEnum } from '@project20/shared';
import { IaDisponibilidadeService } from '../../../../core/services/ia-disponibilidade.service';
import { esperarRequisicao, responderErro, responderSucesso } from '../../../../../testes/http-teste';
import { montarComponente, ComponenteMontado } from '../../../../../testes/montar-componente';
import { DocumentacaoDemandaComponent } from './documentacao-demanda.component';

// Os três textos da demanda na tela de Documentações (task 259): leitura e edição por perfil, gravar com a versão lida e o aviso de versão mais nova.

type Montado = ComponenteMontado<DocumentacaoDemandaComponent>;

function demanda(sobrescrita: Record<string, unknown> = {}) {
  return {
    id: 9, projetoId: 3, demandaPaiId: null, nome: 'Cadastro de usuário', descricaoTecnica: 'Texto técnico', descricaoCliente: 'Texto do cliente', documentacao: null,
    versao: 4, horasEstimadas: 8, status: TipoDemandaStatusEnum.PLANEJADA, isEstrutural: false, previsaoFimData: null, createdDate: '2026-01-15T12:00:00.000Z',
    podeEditar: true, ...sobrescrita,
  };
}

async function montar(usuario: TipoUsuarioEnum, dados: Record<string, unknown> = demanda()): Promise<Montado> {
  const montado = await montarComponente(DocumentacaoDemandaComponent, { usuario, entradas: { demandaId: 9 } });
  responderSucesso(esperarRequisicao(montado.http, 'GET', '/demanda/9'), dados);
  await montado.atualizar();
  return montado;
}

const texto = (montado: Montado) => montado.elemento.textContent ?? '';
const botao = (montado: Montado, rotulo: string) =>
  Array.from(montado.elemento.querySelectorAll<HTMLButtonElement>('button')).find((item) => item.textContent?.includes(rotulo));

describe('DocumentacaoDemandaComponent', () => {
  it('mostra o título, o status e as três abas; o gestor edita todas, a do cliente inclusive', async () => {
    const montado = await montar(TipoUsuarioEnum.GESTOR);
    expect(montado.elemento.querySelector('h2')?.textContent).toContain('Cadastro de usuário');
    expect(Array.from(montado.elemento.querySelectorAll('[role="tab"]')).map((aba) => aba.textContent?.trim())).toEqual(['Técnica', 'Cliente', 'Documentação']);
    expect(montado.componente.editaAba()(PlanoAbaEnum.DESCRICAO_CLIENTE)).toBe(true);
    expect(montado.componente.controleTecnica.value).toBe('Texto técnico');
    expect(texto(montado)).toContain('Tudo gravado');
  });

  it('o desenvolvedor membro edita Técnica e Documentação; a Cliente é leitura com cadeado e aviso', async () => {
    const montado = await montar(TipoUsuarioEnum.DESENVOLVEDOR);
    const edita = montado.componente.editaAba();
    expect(edita(PlanoAbaEnum.DESCRICAO_TECNICA)).toBe(true);
    expect(edita(PlanoAbaEnum.DOCUMENTACAO)).toBe(true);
    expect(edita(PlanoAbaEnum.DESCRICAO_CLIENTE)).toBe(false);
    expect(montado.elemento.querySelector('[role="tab"] .pi-lock')).not.toBeNull();

    montado.componente.escolherAba(PlanoAbaEnum.DESCRICAO_CLIENTE);
    await montado.atualizar();
    expect(texto(montado)).toContain('O pedido do cliente: você lê, só gestores alteram');
    expect(texto(montado)).toContain('Texto do cliente');
    expect(montado.elemento.querySelector('app-markdown-editor')).toBeNull();
  });

  it('o desenvolvedor de fora da demanda lê as três abas, sem editor, sem Gravar e com o aviso', async () => {
    const montado = await montar(TipoUsuarioEnum.DESENVOLVEDOR, demanda({ podeEditar: false }));
    expect(texto(montado)).toContain('Você não é membro desta demanda');
    expect(montado.elemento.querySelector('app-markdown-editor')).toBeNull();
    expect(botao(montado, 'Gravar')).toBeUndefined();
    expect(texto(montado)).toContain('Texto técnico');
  });

  it('grava só o que mudou, com a versão lida, e passa a valer a versão nova', async () => {
    const montado = await montar(TipoUsuarioEnum.GESTOR);
    montado.componente.controleDocumentacao.setValue('Documentação nova');
    await montado.atualizar();
    expect(montado.componente.sujo()).toBe(true);
    expect(texto(montado)).toContain('Alterações sem gravar');

    botao(montado, 'Gravar')!.click();
    const requisicao = esperarRequisicao(montado.http, 'PATCH', '/demanda/9/textos');
    expect(requisicao.request.body).toEqual({ versao: 4, documentacao: 'Documentação nova' });
    responderSucesso(requisicao, { id: 9, descricaoTecnica: 'Texto técnico', descricaoCliente: 'Texto do cliente', documentacao: 'Documentação nova', versao: 5 });
    await montado.atualizar();

    expect(montado.componente.sujo()).toBe(false);
    expect(montado.componente.demanda()?.versao).toBe(5);
    expect(texto(montado)).toContain('Tudo gravado');
  });

  it('versão mais nova (409) avisa com Recarregar e não apaga o texto digitado; Recarregar traz a versão dela', async () => {
    const montado = await montar(TipoUsuarioEnum.GESTOR);
    montado.componente.controleTecnica.setValue('O que eu escrevi');
    await montado.atualizar();

    botao(montado, 'Gravar')!.click();
    responderErro(esperarRequisicao(montado.http, 'PATCH', '/demanda/9/textos'), 409, 'Alguém gravou uma versão mais nova');
    await montado.atualizar();

    expect(texto(montado)).toContain('Outra pessoa gravou este texto depois que você abriu a demanda');
    expect(montado.componente.controleTecnica.value).toBe('O que eu escrevi');
    expect(montado.componente.sujo()).toBe(true);

    botao(montado, 'Recarregar')!.click();
    responderSucesso(esperarRequisicao(montado.http, 'GET', '/demanda/9'), demanda({ descricaoTecnica: 'Versão dela', versao: 6 }));
    await montado.atualizar();
    expect(montado.componente.controleTecnica.value).toBe('Versão dela');
    expect(montado.componente.sujo()).toBe(false);
    expect(texto(montado)).not.toContain('Outra pessoa gravou este texto');
  });

  it('Descartar volta o campo ao último texto gravado', async () => {
    const montado = await montar(TipoUsuarioEnum.GESTOR);
    montado.componente.controleTecnica.setValue('Rascunho');
    await montado.atualizar();
    botao(montado, 'Descartar')!.click();
    await montado.atualizar();
    expect(montado.componente.controleTecnica.value).toBe('Texto técnico');
    expect(montado.componente.sujo()).toBe(false);
  });

  it('avisa a tela quando há texto sem gravar e quando deixa de haver', async () => {
    const montado = await montar(TipoUsuarioEnum.GESTOR);
    const avisos: boolean[] = [];
    montado.componente.sujoMudou.subscribe((sujo) => avisos.push(sujo));
    montado.componente.controleDocumentacao.setValue('x');
    await montado.atualizar();
    montado.componente.descartar();
    await montado.atualizar();
    expect(avisos).toEqual([true, false]);
  });

  it('erro ao abrir: avisa e oferece tentar de novo', async () => {
    const montado = await montarComponente(DocumentacaoDemandaComponent, { usuario: TipoUsuarioEnum.GESTOR, entradas: { demandaId: 9 } });
    responderErro(esperarRequisicao(montado.http, 'GET', '/demanda/9'), 404, 'Demanda não encontrada');
    await montado.atualizar();
    expect(montado.elemento.querySelector('[role="alert"]')?.textContent).toContain('Não foi possível abrir a demanda');
    expect(botao(montado, 'Tentar de novo')).toBeDefined();
  });
});

describe('DocumentacaoDemandaComponent — alterar trecho com IA (task 260)', () => {
  const evento = (texto: string, selecao: string) => ({ inicio: 0, fim: texto.length, texto, selecao, evento: new MouseEvent('contextmenu') });

  async function montarComIa(usuario: TipoUsuarioEnum = TipoUsuarioEnum.GESTOR, dados: Record<string, unknown> = demanda(), estado = EstadoIaEnum.NO_AR) {
    const montado = await montarComponente(DocumentacaoDemandaComponent, { usuario, entradas: { demandaId: 9 } });
    TestBed.inject(IaDisponibilidadeService).estadoReal.set(estado);
    responderSucesso(esperarRequisicao(montado.http, 'GET', '/demanda/9'), dados);
    await montado.atualizar();
    return montado;
  }

  async function pedir(montado: Montado, texto = 'Texto técnico', selecao = 'técnico') {
    montado.componente.abrirPedido(evento(texto, selecao));
    montado.componente.controlePedido.setValue('  trocar por claro  ');
    montado.componente.enviarPedido();
    await montado.atualizar();
  }

  it('só aparece com a IA no ar e na aba em que a pessoa escreve', async () => {
    const noAr = await montarComIa();
    expect(noAr.componente.podePedirIa()).toBe(true);
    TestBed.inject(IaDisponibilidadeService).estadoReal.set(EstadoIaEnum.FORA_DO_AR);
    expect(noAr.componente.podePedirIa()).toBe(false);
    TestBed.inject(IaDisponibilidadeService).estadoReal.set(EstadoIaEnum.DESLIGADA);
    expect(noAr.componente.podePedirIa()).toBe(false);
  });

  it('o desenvolvedor não pede alteração na aba do cliente, que é leitura para ele', async () => {
    const montado = await montarComIa(TipoUsuarioEnum.DESENVOLVEDOR);
    expect(montado.componente.podePedirIa()).toBe(true);
    montado.componente.escolherAba(PlanoAbaEnum.DESCRICAO_CLIENTE);
    expect(montado.componente.podePedirIa()).toBe(false);
  });

  it('pedir manda o bloco, a seleção, o pedido e a aba, e mostra a proposta com o diff; nada é gravado', async () => {
    const montado = await montarComIa(TipoUsuarioEnum.GESTOR, demanda({ descricaoTecnica: 'Texto **técnico**' }));
    await pedir(montado, 'Texto **técnico**', 'técnico');

    const requisicao = esperarRequisicao(montado.http, 'POST', '/assistente/alterar-trecho');
    expect(requisicao.request.body).toEqual({ demandaId: 9, aba: 'DESCRICAO_TECNICA', bloco: 'Texto **técnico**', selecao: 'técnico', pedido: 'trocar por claro' });
    expect(montado.elemento.querySelector('app-documentacao-proposta')).not.toBeNull();
    expect(montado.elemento.textContent).toContain('A IA está alterando o trecho');

    responderSucesso(requisicao, { bloco: 'Texto **técnico**', blocoNovo: 'Texto **claro**' });
    await montado.atualizar();
    expect(montado.componente.propostaDaAba()?.estado).toBe('PRONTA');
    expect(montado.elemento.querySelector('ins')?.textContent).toContain('claro');
    expect(montado.http.match(() => true)).toHaveLength(0);
  });

  it('aceitar troca o bloco no editor e deixa a aba como "Alterações sem gravar", sem gravar', async () => {
    const montado = await montarComIa(TipoUsuarioEnum.GESTOR, demanda({ descricaoTecnica: 'Primeiro. Texto técnico. Último.' }));
    await pedir(montado, 'Texto técnico.', 'técnico');
    responderSucesso(esperarRequisicao(montado.http, 'POST', '/assistente/alterar-trecho'), { bloco: 'Texto técnico.', blocoNovo: 'Texto claro.' });
    await montado.atualizar();

    montado.componente.aceitarProposta();
    await montado.atualizar();
    expect(montado.componente.controleTecnica.value).toBe('Primeiro. Texto claro. Último.');
    expect(montado.componente.sujo()).toBe(true);
    expect(montado.componente.propostaDaAba()).toBeNull();
    expect(montado.elemento.textContent).toContain('Alterações sem gravar');
    expect(montado.http.match(() => true)).toHaveLength(0);
  });

  it('descartar fecha o cartão sem mexer no texto', async () => {
    const montado = await montarComIa();
    await pedir(montado);
    responderSucesso(esperarRequisicao(montado.http, 'POST', '/assistente/alterar-trecho'), { bloco: 'Texto técnico', blocoNovo: 'Texto claro' });
    await montado.atualizar();
    montado.componente.descartarProposta();
    await montado.atualizar();
    expect(montado.elemento.querySelector('app-documentacao-proposta')).toBeNull();
    expect(montado.componente.controleTecnica.value).toBe('Texto técnico');
    expect(montado.componente.sujo()).toBe(false);
  });

  it('se o texto mudou depois do pedido e o bloco não está mais lá, a proposta expira e aceitar não faz nada', async () => {
    const montado = await montarComIa();
    await pedir(montado);
    responderSucesso(esperarRequisicao(montado.http, 'POST', '/assistente/alterar-trecho'), { bloco: 'Texto técnico', blocoNovo: 'Texto claro' });
    await montado.atualizar();

    montado.componente.controleTecnica.setValue('Outro texto qualquer');
    await montado.atualizar();
    expect(montado.componente.propostaDaAba()?.estado).toBe('EXPIRADA');
    montado.componente.aceitarProposta();
    expect(montado.componente.controleTecnica.value).toBe('Outro texto qualquer');
  });

  it('erro da IA mostra a mensagem e "Tentar de novo" repete o mesmo pedido', async () => {
    const montado = await montarComIa();
    await pedir(montado);
    responderErro(esperarRequisicao(montado.http, 'POST', '/assistente/alterar-trecho'), 400, 'A IA devolveu um texto que muda além da seleção. Peça de novo.');
    await montado.atualizar();
    expect(montado.componente.propostaDaAba()?.estado).toBe('ERRO');
    expect(montado.elemento.textContent).toContain('muda além da seleção');

    montado.componente.repetirPedido();
    await montado.atualizar();
    const repetida = esperarRequisicao(montado.http, 'POST', '/assistente/alterar-trecho');
    expect(repetida.request.body).toMatchObject({ bloco: 'Texto técnico', selecao: 'técnico', pedido: 'trocar por claro' });
    responderSucesso(repetida, { bloco: 'Texto técnico', blocoNovo: 'Texto claro' });
    await montado.atualizar();
    expect(montado.componente.propostaDaAba()?.estado).toBe('PRONTA');
  });

  it('a proposta fica na aba em que foi pedida', async () => {
    const montado = await montarComIa();
    await pedir(montado);
    responderSucesso(esperarRequisicao(montado.http, 'POST', '/assistente/alterar-trecho'), { bloco: 'Texto técnico', blocoNovo: 'Texto claro' });
    await montado.atualizar();
    montado.componente.escolherAba(PlanoAbaEnum.DOCUMENTACAO);
    expect(montado.componente.propostaDaAba()).toBeNull();
    montado.componente.escolherAba(PlanoAbaEnum.DESCRICAO_TECNICA);
    expect(montado.componente.propostaDaAba()?.estado).toBe('PRONTA');
  });
});
