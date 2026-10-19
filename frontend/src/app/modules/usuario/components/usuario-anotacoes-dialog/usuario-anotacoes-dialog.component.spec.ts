import { describe, it, expect, vi, afterEach } from 'vitest';
import { TestBed } from '@angular/core/testing';
import { TipoAnotacaoEnum, TipoUsuarioEnum, EstadoIaEnum, TIPOS_ANOTACAO_ORDENADOS } from '@project20/shared';
import { montarComponente, ComponenteMontado } from '../../../../../testes/montar-componente';
import { esperarRequisicao, responderErro, responderSucesso } from '../../../../../testes/http-teste';
import { criarUsuarioTeste } from '../../../../../testes/usuarios-teste';
import { DesfazerService } from '../../../../core/services/desfazer.service';
import { IaDisponibilidadeService } from '../../../../core/services/ia-disponibilidade.service';
import { SecaoAnotacao } from './secao-anotacao';
import { UsuarioAnotacoesDialogComponent } from './usuario-anotacoes-dialog.component';

// Pad em cinco seções (SYSTEM.SPEC.md §12 "anotacao"; tasks 114, 126 e 127): salvar com a versão lida, 409 recarrega,
// "Enviar para" outra seção com Desfazer de 7 s, Limpar reversível. O usuário logado de teste tem id 1.

type Montado = ComponenteMontado<UsuarioAnotacoesDialogComponent>;

const ID_LOGADO = criarUsuarioTeste().id;
const ID_DE_OUTRA_PESSOA = 7;
const VERSAO = '2026-01-15T12:00:00.000Z';
const VERSAO_NOVA = '2026-01-15T13:00:00.000Z';

function secoesDe(usuarioId: number, textos: Partial<Record<TipoAnotacaoEnum, string>> = {}) {
  return TIPOS_ANOTACAO_ORDENADOS.map((tipo, indice) => ({
    id: indice + 1, usuarioId, tipo, texto: textos[tipo] ?? '', updatedDate: VERSAO,
  }));
}

async function abrirPad(
  tipoLogado: TipoUsuarioEnum,
  usuarioId: number,
  textos: Partial<Record<TipoAnotacaoEnum, string>> = {},
  nome = 'Fulano de Tal',
): Promise<Montado> {
  const montado = await montarComponente(UsuarioAnotacoesDialogComponent, { usuario: tipoLogado });
  montado.componente.abrir(usuarioId, nome);
  await montado.atualizar();
  responderSucesso(esperarRequisicao(montado.http, 'GET', '/anotacao'), secoesDe(usuarioId, textos));
  await montado.atualizar();
  return montado;
}

const secao = (montado: Montado, tipo: TipoAnotacaoEnum): SecaoAnotacao =>
  montado.componente.secoes().find((candidata) => candidata.tipo === tipo)!;
const avisosDe = (montado: Montado) => {
  const avisos: { severity?: string; summary?: string; detail?: string }[] = [];
  montado.mensagens.messageObserver.subscribe((mensagem) => avisos.push(...[mensagem].flat()));
  return avisos;
};
const textoDaTela = () => document.body.textContent ?? '';

afterEach(() => vi.useRealTimers());

describe('UsuarioAnotacoesDialogComponent — abrir', () => {
  it('mostra o esqueleto enquanto carrega e depois as cinco seções na ordem de exibição', async () => {
    const montado = await montarComponente(UsuarioAnotacoesDialogComponent, { usuario: TipoUsuarioEnum.GESTOR });
    montado.componente.abrir(ID_DE_OUTRA_PESSOA, 'Fulano de Tal');
    await montado.atualizar();
    expect(montado.componente.carregando()).toBe(true);
    expect(document.body.querySelector('[aria-busy="true"]')).not.toBeNull();

    responderSucesso(esperarRequisicao(montado.http, 'GET', '/anotacao'), secoesDe(ID_DE_OUTRA_PESSOA));
    await montado.atualizar();

    expect(montado.componente.carregando()).toBe(false);
    expect(montado.componente.secoes().map((candidata) => candidata.tipo)).toEqual(TIPOS_ANOTACAO_ORDENADOS);
    for (const rotulo of ['Em andamento', 'Feito', 'Pendências', 'Lembretes', 'Pessoal']) expect(textoDaTela()).toContain(rotulo);
  });

  it('o próprio pad se chama "Minhas anotações"', async () => {
    const proprio = await abrirPad(TipoUsuarioEnum.DESENVOLVEDOR, ID_LOGADO);
    expect(proprio.componente.titulo()).toBe('Minhas anotações');
  });

  it('o pad de outra pessoa se chama "Anotações de <nome>"', async () => {
    const alheio = await abrirPad(TipoUsuarioEnum.GESTOR, ID_DE_OUTRA_PESSOA);
    expect(alheio.componente.titulo()).toBe('Anotações de Fulano de Tal');
  });

  it('gestor abre o pad de outro: o pedido vai com o id dele e as seções gravam no dono certo', async () => {
    const montado = await abrirPad(TipoUsuarioEnum.GESTOR, ID_DE_OUTRA_PESSOA, { LEMBRETE: 'avisar' });
    expect(secao(montado, TipoAnotacaoEnum.LEMBRETE).usuarioId).toBe(ID_DE_OUTRA_PESSOA);
    expect(secao(montado, TipoAnotacaoEnum.LEMBRETE).textoAtual).toBe('avisar');
    expect(montado.componente.editavelAgora()).toBe(true);
  });

  it('falha ao carregar fecha o drawer e avisa', async () => {
    const montado = await montarComponente(UsuarioAnotacoesDialogComponent, { usuario: TipoUsuarioEnum.GESTOR });
    const avisos = avisosDe(montado);
    montado.componente.abrir(ID_DE_OUTRA_PESSOA, 'Fulano');
    await montado.atualizar();
    responderErro(esperarRequisicao(montado.http, 'GET', '/anotacao'), 500, 'falhou');
    await montado.atualizar();

    expect(montado.componente.visivel()).toBe(false);
    expect(avisos.map((aviso) => aviso.detail)).toContain('Não foi possível carregar as anotações.');
  });

  it('sem nome, busca o nome do usuário para o título', async () => {
    const montado = await montarComponente(UsuarioAnotacoesDialogComponent, { usuario: TipoUsuarioEnum.GESTOR });
    montado.componente.abrir(ID_DE_OUTRA_PESSOA);
    await montado.atualizar();
    responderSucesso(esperarRequisicao(montado.http, 'GET', '/anotacao'), secoesDe(ID_DE_OUTRA_PESSOA));
    responderSucesso(esperarRequisicao(montado.http, 'GET', `/usuario/${ID_DE_OUTRA_PESSOA}`), { id: ID_DE_OUTRA_PESSOA, nomeCompleto: 'Beltrana' });
    await montado.atualizar();
    expect(montado.componente.titulo()).toBe('Anotações de Beltrana');
  });
});

describe('UsuarioAnotacoesDialogComponent — salvar', () => {
  it('Salvar envia o texto com a versão lida e depois mostra "salvo", avisa a listagem e avança a versão', async () => {
    const montado = await abrirPad(TipoUsuarioEnum.GESTOR, ID_DE_OUTRA_PESSOA);
    const alteracoes: unknown[] = [];
    montado.componente.aoAlterar.subscribe((evento) => alteracoes.push(evento));
    const lembretes = secao(montado, TipoAnotacaoEnum.LEMBRETE);

    lembretes.controle.setValue('Reunião às 10h.');
    expect(lembretes.estado()).toBe('editando');
    montado.componente.salvar();

    const requisicao = esperarRequisicao(montado.http, 'PUT', `/anotacao/${ID_DE_OUTRA_PESSOA}/LEMBRETE`);
    expect(requisicao.request.body).toEqual({ texto: 'Reunião às 10h.', updatedDateLido: VERSAO });
    responderSucesso(requisicao, { id: 4, usuarioId: ID_DE_OUTRA_PESSOA, tipo: 'LEMBRETE', texto: 'Reunião às 10h.', updatedDate: VERSAO_NOVA });
    await montado.atualizar();

    expect(lembretes.estado()).toBe('salvo');
    expect(lembretes.versaoLida).toBe(VERSAO_NOVA);
    expect(alteracoes).toEqual([{ usuarioId: ID_DE_OUTRA_PESSOA, temAnotacoes: true }]);
  });

  it('sem mudança real nenhuma requisição sai (salvar e fechar)', async () => {
    const montado = await abrirPad(TipoUsuarioEnum.GESTOR, ID_DE_OUTRA_PESSOA, { PESSOAL: 'igual' });
    secao(montado, TipoAnotacaoEnum.PESSOAL).controle.setValue('igual');
    montado.componente.salvar();
    montado.componente.aoMudarVisibilidade(false);
    montado.http.expectNone((requisicao) => requisicao.method === 'PUT');
  });

  it('o salvamento automático dispara 2 s depois da última digitação', async () => {
    const montado = await abrirPad(TipoUsuarioEnum.GESTOR, ID_DE_OUTRA_PESSOA);
    vi.useFakeTimers({ toFake: ['setTimeout', 'clearTimeout'] });
    secao(montado, TipoAnotacaoEnum.PESSOAL).controle.setValue('npm run dev');

    vi.advanceTimersByTime(1999);
    montado.http.expectNone((requisicao) => requisicao.method === 'PUT');
    vi.advanceTimersByTime(1);
    expect(esperarRequisicao(montado.http, 'PUT', `/anotacao/${ID_DE_OUTRA_PESSOA}/PESSOAL`).request.body.texto).toBe('npm run dev');
  });

  it('fechar o drawer salva o que está pendente', async () => {
    const montado = await abrirPad(TipoUsuarioEnum.GESTOR, ID_DE_OUTRA_PESSOA);
    secao(montado, TipoAnotacaoEnum.EM_ANDAMENTO).controle.setValue('parei aqui');
    montado.componente.aoMudarVisibilidade(false);
    expect(montado.componente.visivel()).toBe(false);
    expect(esperarRequisicao(montado.http, 'PUT', `/anotacao/${ID_DE_OUTRA_PESSOA}/EM_ANDAMENTO`).request.body.texto).toBe('parei aqui');
  });

  it('conflito (409): recarrega a seção, descarta o que foi digitado e avisa a versão velha', async () => {
    const montado = await abrirPad(TipoUsuarioEnum.GESTOR, ID_DE_OUTRA_PESSOA, { LEMBRETE: 'antigo' });
    const avisos = avisosDe(montado);
    const lembretes = secao(montado, TipoAnotacaoEnum.LEMBRETE);
    lembretes.controle.setValue('minha edição');
    montado.componente.salvar();
    responderErro(esperarRequisicao(montado.http, 'PUT', `/anotacao/${ID_DE_OUTRA_PESSOA}/LEMBRETE`), 409, 'A seção foi alterada em outro lugar');
    await montado.atualizar();

    const recarga = esperarRequisicao(montado.http, 'GET', '/anotacao');
    expect(recarga.request.params.get('tipos')).toBe('LEMBRETE');
    responderSucesso(recarga, [{ id: 4, usuarioId: ID_DE_OUTRA_PESSOA, tipo: 'LEMBRETE', texto: 'versão da IA', updatedDate: VERSAO_NOVA }]);
    await montado.atualizar();

    expect(lembretes.textoAtual).toBe('versão da IA');
    expect(lembretes.versaoLida).toBe(VERSAO_NOVA);
    expect(lembretes.estado()).toBe('ocioso');
    expect(avisos.some((aviso) => aviso.severity === 'warn' && aviso.summary === 'Seção atualizada' && /mudou em outro lugar/.test(aviso.detail ?? ''))).toBe(true);
  });

  it('erro no salvamento (500) deixa a seção em "erro" sem perder o texto', async () => {
    const montado = await abrirPad(TipoUsuarioEnum.GESTOR, ID_DE_OUTRA_PESSOA);
    const pessoal = secao(montado, TipoAnotacaoEnum.PESSOAL);
    pessoal.controle.setValue('rascunho');
    montado.componente.salvar();
    responderErro(esperarRequisicao(montado.http, 'PUT', `/anotacao/${ID_DE_OUTRA_PESSOA}/PESSOAL`), 500, 'falhou');
    await montado.atualizar();

    expect(pessoal.estado()).toBe('erro');
    expect(pessoal.textoAtual).toBe('rascunho');
    expect(montado.componente.estadoGeral()).toBe('erro');
  });
});

describe('UsuarioAnotacoesDialogComponent — "Enviar para" outra seção', () => {
  async function enviar(montado: Montado, trecho: string, destino: TipoAnotacaoEnum) {
    montado.componente.abrirMenuDoTrecho(secao(montado, TipoAnotacaoEnum.EM_ANDAMENTO), { inicio: 0, fim: trecho.length, texto: trecho, evento: new MouseEvent('contextmenu') });
    const itens = montado.componente.itensMenu[0].items!;
    itens.find((item) => item.id === destino)!.command!({});
    await montado.atualizar();
  }

  it('o menu esconde a própria seção e lista as outras quatro', async () => {
    const montado = await abrirPad(TipoUsuarioEnum.GESTOR, ID_DE_OUTRA_PESSOA, { EM_ANDAMENTO: 'x' });
    montado.componente.abrirMenuDoTrecho(secao(montado, TipoAnotacaoEnum.EM_ANDAMENTO), { inicio: 0, fim: 1, texto: 'x', evento: new MouseEvent('contextmenu') });
    const visiveis = montado.componente.itensMenu[0].items!.filter((item) => item.visible !== false).map((item) => item.id);
    expect(visiveis).toEqual(['FEITO', 'PENDENCIA', 'LEMBRETE', 'PESSOAL']);
  });

  const respostaDoMover = (origem: [TipoAnotacaoEnum, string], destino: [TipoAnotacaoEnum, string]) => ({
    origem: { id: 1, usuarioId: ID_DE_OUTRA_PESSOA, tipo: origem[0], texto: origem[1], updatedDate: VERSAO_NOVA },
    destino: { id: 3, usuarioId: ID_DE_OUTRA_PESSOA, tipo: destino[0], texto: destino[1], updatedDate: VERSAO_NOVA },
  });
  const pedidoDeMover = async (montado: Montado) => {
    await montado.atualizar();
    await montado.atualizar();
    return esperarRequisicao(montado.http, 'POST', `/anotacao/${ID_DE_OUTRA_PESSOA}/mover`);
  };

  it('move o trecho com as duas versões lidas, atualiza as duas seções e oferece Desfazer por 7 s', async () => {
    const montado = await abrirPad(TipoUsuarioEnum.GESTOR, ID_DE_OUTRA_PESSOA, { EM_ANDAMENTO: 'A\nB', PENDENCIA: 'P' });
    const desfazer = TestBed.inject(DesfazerService);
    await enviar(montado, 'B', TipoAnotacaoEnum.PENDENCIA);

    const requisicao = await pedidoDeMover(montado);
    expect(requisicao.request.body).toEqual({
      tipoOrigem: 'EM_ANDAMENTO', tipoDestino: 'PENDENCIA', trecho: 'B', updatedDateOrigemLido: VERSAO, updatedDateDestinoLido: VERSAO,
    });
    responderSucesso(requisicao, respostaDoMover([TipoAnotacaoEnum.EM_ANDAMENTO, 'A'], [TipoAnotacaoEnum.PENDENCIA, 'P\nB']));
    await montado.atualizar();

    expect(secao(montado, TipoAnotacaoEnum.EM_ANDAMENTO).textoAtual).toBe('A');
    expect(secao(montado, TipoAnotacaoEnum.PENDENCIA).textoAtual).toBe('P\nB');
    expect(secao(montado, TipoAnotacaoEnum.PENDENCIA).versaoLida).toBe(VERSAO_NOVA);
    expect(montado.componente.secoesAbertas()).toContain(TipoAnotacaoEnum.PENDENCIA);
    expect(desfazer.oferta()?.mensagem).toBe('Enviado para Pendências');
    expect(desfazer.oferta()?.duracaoMs).toBe(7000);
  });

  it('Desfazer devolve o trecho: o movimento inverso sai com as versões novas', async () => {
    const montado = await abrirPad(TipoUsuarioEnum.GESTOR, ID_DE_OUTRA_PESSOA, { EM_ANDAMENTO: 'A\nB', PENDENCIA: 'P' });
    const desfazer = TestBed.inject(DesfazerService);
    await enviar(montado, 'B', TipoAnotacaoEnum.PENDENCIA);
    responderSucesso(await pedidoDeMover(montado), respostaDoMover([TipoAnotacaoEnum.EM_ANDAMENTO, 'A'], [TipoAnotacaoEnum.PENDENCIA, 'P\nB']));
    await montado.atualizar();

    desfazer.executar();
    const inverso = await pedidoDeMover(montado);
    expect(inverso.request.body).toEqual({
      tipoOrigem: 'PENDENCIA', tipoDestino: 'EM_ANDAMENTO', trecho: 'B', updatedDateOrigemLido: VERSAO_NOVA, updatedDateDestinoLido: VERSAO_NOVA,
    });
    responderSucesso(inverso, respostaDoMover([TipoAnotacaoEnum.PENDENCIA, 'P'], [TipoAnotacaoEnum.EM_ANDAMENTO, 'A\nB']));
    await montado.atualizar();
    expect(secao(montado, TipoAnotacaoEnum.EM_ANDAMENTO).textoAtual).toBe('A\nB');
    expect(secao(montado, TipoAnotacaoEnum.PENDENCIA).textoAtual).toBe('P');
  });

  it('antes de enviar, salva o que a pessoa digitou nas duas seções (envia o que ela vê)', async () => {
    const montado = await abrirPad(TipoUsuarioEnum.GESTOR, ID_DE_OUTRA_PESSOA, { EM_ANDAMENTO: 'A\nB' });
    secao(montado, TipoAnotacaoEnum.EM_ANDAMENTO).controle.setValue('A\nB\nC');
    await enviar(montado, 'B', TipoAnotacaoEnum.PENDENCIA);
    await montado.atualizar();

    const gravacao = esperarRequisicao(montado.http, 'PUT', `/anotacao/${ID_DE_OUTRA_PESSOA}/EM_ANDAMENTO`);
    expect(gravacao.request.body.texto).toBe('A\nB\nC');
    montado.http.expectNone((r) => r.method === 'POST');
    responderSucesso(gravacao, { id: 1, usuarioId: ID_DE_OUTRA_PESSOA, tipo: 'EM_ANDAMENTO', texto: 'A\nB\nC', updatedDate: VERSAO_NOVA });
    const requisicao = await pedidoDeMover(montado);
    expect(requisicao.request.body.updatedDateOrigemLido).toBe(VERSAO_NOVA);
    requisicao.flush(null, { status: 500, statusText: 'x' });
  });

  it('seção alterada em outro lugar (409): nada é movido, recarrega as duas e avisa', async () => {
    const montado = await abrirPad(TipoUsuarioEnum.GESTOR, ID_DE_OUTRA_PESSOA, { EM_ANDAMENTO: 'A\nB', PENDENCIA: 'P' });
    const avisos = avisosDe(montado);
    await enviar(montado, 'B', TipoAnotacaoEnum.PENDENCIA);
    responderErro(await pedidoDeMover(montado), 409, 'A seção foi alterada em outro lugar');
    await montado.atualizar();

    const recarga = esperarRequisicao(montado.http, 'GET', '/anotacao');
    expect(recarga.request.params.get('tipos')).toBe('EM_ANDAMENTO,PENDENCIA');
    responderSucesso(recarga, [
      { id: 1, usuarioId: ID_DE_OUTRA_PESSOA, tipo: 'EM_ANDAMENTO', texto: 'A\nB\nX', updatedDate: VERSAO_NOVA },
      { id: 3, usuarioId: ID_DE_OUTRA_PESSOA, tipo: 'PENDENCIA', texto: 'P2', updatedDate: VERSAO_NOVA },
    ]);
    await montado.atualizar();

    expect(secao(montado, TipoAnotacaoEnum.EM_ANDAMENTO).textoAtual).toBe('A\nB\nX');
    expect(secao(montado, TipoAnotacaoEnum.PENDENCIA).textoAtual).toBe('P2');
    expect(avisos.some((aviso) => aviso.summary === 'Trecho não enviado' && /mudaram em outro lugar/.test(aviso.detail ?? ''))).toBe(true);
    expect(TestBed.inject(DesfazerService).oferta()).toBeNull();
  });

  it('trecho ausente ou repetido (400): nada é movido e o aviso diz isso', async () => {
    const montado = await abrirPad(TipoUsuarioEnum.GESTOR, ID_DE_OUTRA_PESSOA, { EM_ANDAMENTO: 'A\nB' });
    const avisos = avisosDe(montado);
    await enviar(montado, 'B', TipoAnotacaoEnum.LEMBRETE);
    responderErro(await pedidoDeMover(montado), 400, 'O trecho não foi encontrado na seção');
    await montado.atualizar();
    responderSucesso(esperarRequisicao(montado.http, 'GET', '/anotacao'), secoesDe(ID_DE_OUTRA_PESSOA, { EM_ANDAMENTO: 'A\nB' }).filter((s) => ['EM_ANDAMENTO', 'LEMBRETE'].includes(s.tipo)));

    expect(avisos.some((aviso) => aviso.summary === 'Trecho não enviado' && /aparece mais de uma vez/.test(aviso.detail ?? ''))).toBe(true);
    expect(TestBed.inject(DesfazerService).oferta()).toBeNull();
  });

  it('erro de servidor ao mover só avisa que não foi possível enviar', async () => {
    const montado = await abrirPad(TipoUsuarioEnum.GESTOR, ID_DE_OUTRA_PESSOA, { EM_ANDAMENTO: 'A\nB' });
    const avisos = avisosDe(montado);
    await enviar(montado, 'B', TipoAnotacaoEnum.LEMBRETE);
    responderErro(await pedidoDeMover(montado), 500, 'falhou');
    await montado.atualizar();
    expect(avisos.some((aviso) => aviso.severity === 'error' && aviso.detail === 'Não foi possível enviar o trecho.')).toBe(true);
    montado.http.expectNone((r) => r.method === 'GET' && r.url.endsWith('/anotacao'));
  });

  it('com a IA no ar o próprio pad não oferece o menu "Enviar para"', async () => {
    const montado = await abrirPad(TipoUsuarioEnum.DESENVOLVEDOR, ID_LOGADO, { EM_ANDAMENTO: 'A' });
    TestBed.inject(IaDisponibilidadeService).estadoReal.set(EstadoIaEnum.NO_AR);
    await montado.atualizar();
    montado.componente.abrirMenuDoTrecho(secao(montado, TipoAnotacaoEnum.EM_ANDAMENTO), { inicio: 0, fim: 1, texto: 'A', evento: new MouseEvent('contextmenu') });
    montado.componente.itensMenu[0].items!.find((item) => item.id === 'FEITO')!.command!({});
    await montado.atualizar();
    montado.http.expectNone((r) => r.method === 'POST');
  });
});

describe('UsuarioAnotacoesDialogComponent — Limpar', () => {
  it('esvazia a seção na hora, oferece Desfazer por 7 s e só grava o vazio quando a janela acaba', async () => {
    const montado = await abrirPad(TipoUsuarioEnum.GESTOR, ID_DE_OUTRA_PESSOA, { PESSOAL: 'comandos' });
    const desfazer = TestBed.inject(DesfazerService);
    const pessoal = secao(montado, TipoAnotacaoEnum.PESSOAL);

    montado.componente.limpar(pessoal);
    expect(pessoal.textoAtual).toBe('');
    expect(pessoal.limpando).toBe(true);
    expect(desfazer.oferta()?.mensagem).toBe('Seção "Pessoal" limpa');
    expect(desfazer.oferta()?.duracaoMs).toBe(7000);
    montado.http.expectNone((r) => r.method === 'PUT');

    desfazer.dispensar();
    const gravacao = esperarRequisicao(montado.http, 'PUT', `/anotacao/${ID_DE_OUTRA_PESSOA}/PESSOAL`);
    expect(gravacao.request.body).toEqual({ texto: '', updatedDateLido: VERSAO });
    gravacao.flush(null, { status: 500, statusText: 'x' });
  });

  it('Desfazer restaura o texto e não grava nada', async () => {
    const montado = await abrirPad(TipoUsuarioEnum.GESTOR, ID_DE_OUTRA_PESSOA, { PESSOAL: 'comandos' });
    const desfazer = TestBed.inject(DesfazerService);
    const pessoal = secao(montado, TipoAnotacaoEnum.PESSOAL);

    montado.componente.limpar(pessoal);
    desfazer.executar();
    await montado.atualizar();

    expect(pessoal.textoAtual).toBe('comandos');
    expect(pessoal.limpando).toBe(false);
    montado.http.expectNone((r) => r.method === 'PUT');
  });

  it('seção vazia não tem o que limpar', async () => {
    const montado = await abrirPad(TipoUsuarioEnum.GESTOR, ID_DE_OUTRA_PESSOA);
    montado.componente.limpar(secao(montado, TipoAnotacaoEnum.PESSOAL));
    expect(TestBed.inject(DesfazerService).oferta()).toBeNull();
  });
});

describe('UsuarioAnotacoesDialogComponent — quem pode editar', () => {
  it('com a IA no ar, o próprio pad é só de leitura (aviso e nenhum Salvar)', async () => {
    const proprio = await abrirPad(TipoUsuarioEnum.GESTOR, ID_LOGADO, { LEMBRETE: 'avisar' });
    TestBed.inject(IaDisponibilidadeService).estadoReal.set(EstadoIaEnum.NO_AR);
    await proprio.atualizar();
    expect(proprio.componente.somenteLeituraPelaIa()).toBe(true);
    expect(proprio.componente.editavelAgora()).toBe(false);
    expect(textoDaTela()).toContain('A IA cuida do seu pad');
    expect(textoDaTela()).not.toContain('Salvar');
    proprio.componente.limpar(secao(proprio, TipoAnotacaoEnum.LEMBRETE));
    expect(secao(proprio, TipoAnotacaoEnum.LEMBRETE).textoAtual).toBe('avisar');
  });

  it('com a IA no ar, o pad de outra pessoa continua editável pelo gestor', async () => {
    const alheio = await abrirPad(TipoUsuarioEnum.GESTOR, ID_DE_OUTRA_PESSOA);
    TestBed.inject(IaDisponibilidadeService).estadoReal.set(EstadoIaEnum.NO_AR);
    await alheio.atualizar();
    expect(alheio.componente.somenteLeituraPelaIa()).toBe(false);
    expect(alheio.componente.editavelAgora()).toBe(true);
  });

  it('com a IA desligada ou fora do ar o próprio pad volta a ser editável (fallback)', async () => {
    const montado = await abrirPad(TipoUsuarioEnum.DESENVOLVEDOR, ID_LOGADO);
    const ia = TestBed.inject(IaDisponibilidadeService);
    for (const estado of [EstadoIaEnum.DESLIGADA, EstadoIaEnum.FORA_DO_AR]) {
      ia.estadoReal.set(estado);
      expect(montado.componente.editavelAgora(), estado).toBe(true);
    }
  });

  it('com editavel=false cada seção só mostra o texto, sem editor e sem Limpar', async () => {
    const montado = await montarComponente(UsuarioAnotacoesDialogComponent, { usuario: TipoUsuarioEnum.GESTOR, entradas: { editavel: false } });
    montado.componente.abrir(ID_DE_OUTRA_PESSOA, 'Fulano');
    await montado.atualizar();
    responderSucesso(esperarRequisicao(montado.http, 'GET', '/anotacao'), secoesDe(ID_DE_OUTRA_PESSOA, { EM_ANDAMENTO: 'parei aqui' }));
    await montado.atualizar();

    expect(montado.componente.editavelAgora()).toBe(false);
    expect(document.body.querySelector('app-markdown-editor')).toBeNull();
    expect(textoDaTela()).not.toContain('Limpar');
    expect(textoDaTela()).toContain('parei aqui');
  });
});

