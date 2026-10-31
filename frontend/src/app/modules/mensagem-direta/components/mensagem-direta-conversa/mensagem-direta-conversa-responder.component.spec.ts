import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { AutorMensagemDiretaEnum, TipoUsuarioEnum } from '@project20/shared';
import { montarComponente, ComponenteMontado } from '../../../../../testes/montar-componente';
import { esperarRequisicao, responderErro, responderSucesso } from '../../../../../testes/http-teste';
import { digitarNaMensagem, esperarCampoDeMensagem, teclarNaMensagem } from '../../../../../testes/campo-mensagem';
import { MensagemDiretaEstadoService } from '../../services/mensagem-direta-estado.service';
import { MensagemDiretaEventosService } from '../../services/mensagem-direta-eventos.service';
import { MensagemNaConversa } from '../../utils/mensagem-direta.util';
import { MensagemDiretaConversaComponent } from './mensagem-direta-conversa.component';

// Responder a uma mensagem (task 220): a ação no balão, a barra "Respondendo a…" do compositor, a citação no balão e o clique que leva à original.
// O usuário autenticado de teste tem id 1; a outra pessoa é a 9 (Camila).

class EventosFalso {
  readonly conectado = signal(true);
  iniciar(): void {}
  parar(): void {}
}

const ORIGINAL_ID = '11111111-2222-4333-8444-555555555555';

function mensagem(mensagemId: string, autorUsuarioId: number, texto: string, parcial: Partial<MensagemNaConversa> = {}): MensagemNaConversa {
  return {
    mensagemId, conversaId: '1-9', autor: AutorMensagemDiretaEnum.USUARIO, autorUsuarioId, texto, contemCodigo: false, mencoes: [], referencias: [],
    respondeA: null, createdDate: new Date('2026-10-26T14:00:00'), situacao: 'ENVIADA', ...parcial,
  };
}

describe('MensagemDiretaConversaComponent — responder', () => {
  let tela: ComponenteMontado<MensagemDiretaConversaComponent>;
  let estado: MensagemDiretaEstadoService;

  const redesenhar = async () => {
    await vi.advanceTimersByTimeAsync(0);
    await tela.atualizar();
  };
  const botoesDeAcoes = () => Array.from(tela.elemento.querySelectorAll<HTMLButtonElement>('[aria-label="Ações da mensagem"]'));
  const responderPeloMenu = async () => {
    botoesDeAcoes()[0].click();
    await redesenhar();
    const responder = Array.from(document.querySelectorAll<HTMLElement>('.p-contextmenu-item-link')).find((item) => item.textContent?.includes('Responder'));
    expect(responder).toBeDefined();
    responder!.click();
    await redesenhar();
  };
  const barra = () => tela.elemento.querySelector('.compositor-direto__resposta');
  const citacoes = () => Array.from(tela.elemento.querySelectorAll<HTMLButtonElement>('.conversa-direta__citacao'));
  const abrirComMensagens = async (mensagens: MensagemNaConversa[], proximoCursor: string | null = null) => {
    estado.conversaAberta.set({
      usuarioId: 9, usuarioNome: 'Camila Duarte', conversaId: '1-9', mensagens, lidaPeloOutroAte: null, proximoCursor,
      carregando: false, carregandoMais: false, erro: false,
    });
    await redesenhar();
  };

  beforeEach(async () => {
    vi.useFakeTimers({ toFake: ['setTimeout', 'clearTimeout', 'Date'] });
    tela = await montarComponente(MensagemDiretaConversaComponent, {
      usuario: TipoUsuarioEnum.DESENVOLVEDOR,
      provedores: [{ provide: MensagemDiretaEventosService, useClass: EventosFalso }],
    });
    estado = TestBed.inject(MensagemDiretaEstadoService);
    await abrirComMensagens([mensagem(ORIGINAL_ID, 9, 'Subi o **ajuste** do cadastro')]);
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('Responder abre a barra "Respondendo a…" com o nome e o trecho sem marcação; o X cancela', async () => {
    expect(barra()).toBeNull();
    await responderPeloMenu();

    expect(barra()?.textContent).toContain('Respondendo a Camila Duarte');
    expect(barra()?.textContent).toContain('Subi o ajuste do cadastro');

    tela.elemento.querySelector<HTMLButtonElement>('.compositor-direto__resposta button')!.click();
    await redesenhar();
    expect(barra()).toBeNull();
    expect(estado.respondendoA()).toBeNull();
  });

  it('Esc no campo cancela só a resposta, mantém o texto e não deixa o evento seguir para o popup', async () => {
    await esperarCampoDeMensagem(tela.fixture, redesenhar);
    await responderPeloMenu();
    digitarNaMensagem(tela.fixture, 'rascunho');

    const evento = teclarNaMensagem(tela.fixture, 'Escape');
    await redesenhar();
    expect(evento.defaultPrevented).toBe(true);
    expect(barra()).toBeNull();
    expect(estado.respondendoA()).toBeNull();
  });

  it('não oferece Responder em mensagem do sistema nem em mensagem que ainda não chegou', async () => {
    await abrirComMensagens([
      mensagem('a', 9, 'Fulano leu esta conversa', { autor: AutorMensagemDiretaEnum.SISTEMA, autorUsuarioId: null }),
      mensagem('b', 1, 'enviando…', { situacao: 'ENVIANDO' }),
      mensagem('falhou', 1, 'não enviada', { situacao: 'FALHOU' }),
      mensagem('c', 9, 'normal'),
    ]);
    expect(botoesDeAcoes().length).toBe(1);

    estado.responder(mensagem('b', 1, 'enviando…', { situacao: 'ENVIANDO' }));
    expect(estado.respondendoA()).toBeNull();
  });

  it('enviar uma resposta manda só o id da original, mostra a citação na hora e limpa a barra', async () => {
    await esperarCampoDeMensagem(tela.fixture, redesenhar);
    await responderPeloMenu();
    digitarNaMensagem(tela.fixture, 'Revisei, ficou certo');
    await redesenhar();
    tela.elemento.querySelector<HTMLButtonElement>('.compositor-direto__enviar')!.click();
    await redesenhar();

    const requisicao = esperarRequisicao(tela.http, 'POST', '/mensagem-direta/mensagem');
    expect(requisicao.request.body.respondeAMensagemId).toBe(ORIGINAL_ID);
    expect(requisicao.request.body.respondeA).toBeUndefined();
    expect(barra()).toBeNull();
    const citacao = citacoes()[0];
    expect(citacao.textContent).toContain('Camila Duarte');
    expect(citacao.textContent).toContain('Subi o ajuste do cadastro');
  });

  it('"Tentar de novo" reenvia a resposta com o mesmo id da original', async () => {
    await esperarCampoDeMensagem(tela.fixture, redesenhar);
    await responderPeloMenu();
    digitarNaMensagem(tela.fixture, 'Revisei');
    await redesenhar();
    tela.elemento.querySelector<HTMLButtonElement>('.compositor-direto__enviar')!.click();
    await redesenhar();
    responderErro(esperarRequisicao(tela.http, 'POST', '/mensagem-direta/mensagem'), 500, 'caiu');
    await redesenhar();

    tela.elemento.querySelector<HTMLButtonElement>('.conversa-direta__link')!.click();
    await redesenhar();
    const reenvio = esperarRequisicao(tela.http, 'POST', '/mensagem-direta/mensagem');
    expect(reenvio.request.body.respondeAMensagemId).toBe(ORIGINAL_ID);
  });

  it('a citação mostra "Você" para a minha mensagem e leva até a original, realçando-a por um instante', async () => {
    await abrirComMensagens([
      mensagem(ORIGINAL_ID, 1, 'Pode mergear?'),
      mensagem('resposta', 9, 'Pode sim', { respondeA: { mensagemId: ORIGINAL_ID, autorUsuarioId: 1, trecho: 'Pode mergear?' } }),
    ]);
    const rolar = vi.fn();
    Element.prototype.scrollIntoView = rolar;

    expect(citacoes()[0].textContent).toContain('Você');
    citacoes()[0].click();
    await vi.advanceTimersByTimeAsync(60);
    await tela.atualizar();

    expect(rolar).toHaveBeenCalled();
    expect(tela.elemento.querySelector(`[data-mensagem-id="${ORIGINAL_ID}"]`)?.classList).toContain('conversa-direta__balao--destacado');
    await vi.advanceTimersByTimeAsync(1_500);
    await tela.atualizar();
    expect(tela.elemento.querySelector('.conversa-direta__balao--destacado')).toBeNull();
  });

  it('se a original está numa página antiga, carrega as anteriores; sem achar, avisa na conversa', async () => {
    const citacaoAntiga = { mensagemId: 'sumida', autorUsuarioId: 9, trecho: 'lá atrás' };
    await abrirComMensagens([mensagem('resposta', 1, 'ok', { respondeA: citacaoAntiga })], 'cursor-1');

    citacoes()[0].click();
    await vi.advanceTimersByTimeAsync(0);
    responderSucesso(esperarRequisicao(tela.http, 'GET', '/mensagem-direta/conversa/9'), { mensagens: [], proximoCursor: null, lidaAteDate: null });
    await vi.advanceTimersByTimeAsync(60);
    await tela.atualizar();

    expect(tela.elemento.querySelector('.conversa-direta__faixa')?.textContent).toContain('Mensagem antiga demais para localizar');
  });

  it('abrir outra conversa descarta a resposta em preparo', async () => {
    await responderPeloMenu();
    expect(estado.respondendoA()).not.toBeNull();
    estado.voltarParaALista();
    expect(estado.respondendoA()).toBeNull();
  });
});
