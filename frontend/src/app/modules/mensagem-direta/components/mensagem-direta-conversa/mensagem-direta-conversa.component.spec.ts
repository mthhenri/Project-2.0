import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { AutorMensagemDiretaEnum, TipoUsuarioEnum } from '@project20/shared';
import { montarComponente, ComponenteMontado } from '../../../../../testes/montar-componente';
import { esperarRequisicao, responderSucesso } from '../../../../../testes/http-teste';
import { esperarCampoDeMensagem, teclarNaMensagem } from '../../../../../testes/campo-mensagem';
import { TEMPO_DO_COPIADO_MS } from '../../../../shared/components/markdown-bloco-codigo/markdown-bloco-codigo.component';
import { MensagemDiretaEstadoService } from '../../services/mensagem-direta-estado.service';
import { MensagemDiretaEventosService } from '../../services/mensagem-direta-eventos.service';
import { ESPERA_ENTRE_AVISOS_DE_DIGITACAO_MS, VALIDADE_DO_DIGITANDO_MS } from '../../utils/mensagem-direta.util';
import { MensagemDiretaConversaComponent } from './mensagem-direta-conversa.component';

// O "digitando…" do chat entre colaboradores: o aviso de quem digita (no máximo a cada poucos segundos) e o que a outra pessoa vê (no cabeçalho da conversa e
// na lista), que some sozinho depois de uns segundos ou quando a mensagem chega. O usuário autenticado de teste tem id 1; a outra pessoa é a 9 (Camila).

class EventosFalso {
  readonly conectado = signal(true);
  iniciar(): void {}
  parar(): void {}
}

describe('MensagemDiretaConversaComponent — digitando…', () => {
  let tela: ComponenteMontado<MensagemDiretaConversaComponent>;
  let estado: MensagemDiretaEstadoService;

  const status = () => tela.elemento.querySelector('.conversa-direta__status')?.textContent?.trim() ?? '';
  const redesenhar = async () => {
    await vi.advanceTimersByTimeAsync(0);
    await tela.atualizar();
  };

  beforeEach(async () => {
    vi.useFakeTimers({ toFake: ['setTimeout', 'clearTimeout', 'Date'] });
    tela = await montarComponente(MensagemDiretaConversaComponent, {
      usuario: TipoUsuarioEnum.DESENVOLVEDOR,
      provedores: [{ provide: MensagemDiretaEventosService, useClass: EventosFalso }],
    });
    estado = TestBed.inject(MensagemDiretaEstadoService);
    estado.conversaAberta.set({
      usuarioId: 9,
      usuarioNome: 'Camila Duarte',
      conversaId: '1-9',
      mensagens: [],
      lidaPeloOutroAte: null,
      proximoCursor: null,
      carregando: false,
      carregandoMais: false,
      erro: false,
    });
    await redesenhar();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('o evento DIGITANDO da outra pessoa troca o status do cabeçalho por "digitando" e ele some sozinho', async () => {
    expect(status()).toBe('Offline');
    estado.aplicarEvento({ tipo: 'DIGITANDO', conversaId: '1-9', usuarioId: 9 });
    await redesenhar();
    expect(status()).toContain('digitando');

    await vi.advanceTimersByTimeAsync(VALIDADE_DO_DIGITANDO_MS - 1);
    await tela.atualizar();
    expect(status()).toContain('digitando');

    await vi.advanceTimersByTimeAsync(1);
    await tela.atualizar();
    expect(status()).toBe('Offline');
  });

  it('um novo aviso renova a validade, em vez de somar', async () => {
    estado.aplicarEvento({ tipo: 'DIGITANDO', conversaId: '1-9', usuarioId: 9 });
    await vi.advanceTimersByTimeAsync(VALIDADE_DO_DIGITANDO_MS - 1_000);
    estado.aplicarEvento({ tipo: 'DIGITANDO', conversaId: '1-9', usuarioId: 9 });
    await vi.advanceTimersByTimeAsync(VALIDADE_DO_DIGITANDO_MS - 1_000);
    await tela.atualizar();
    expect(status()).toContain('digitando');
  });

  it('a mensagem da pessoa apaga o "digitando…" na hora; DIGITANDO de si mesmo ou de outra pessoa não aparece nesta conversa', async () => {
    estado.aplicarEvento({ tipo: 'DIGITANDO', conversaId: '1-9', usuarioId: 1 });
    estado.aplicarEvento({ tipo: 'DIGITANDO', conversaId: '1-15', usuarioId: 15 });
    await redesenhar();
    expect(status()).toBe('Offline');

    estado.aplicarEvento({ tipo: 'DIGITANDO', conversaId: '1-9', usuarioId: 9 });
    await redesenhar();
    expect(status()).toContain('digitando');
    estado.aplicarEvento({
      tipo: 'MENSAGEM',
      mensagem: {
        mensagemId: 'm-1', conversaId: '1-9', autor: AutorMensagemDiretaEnum.USUARIO, autorUsuarioId: 9, texto: 'oi',
        contemCodigo: false, mencoes: [], referencias: [], respondeA: null, createdDate: new Date().toISOString() as never,
      },
    });
    await redesenhar();
    expect(status()).toBe('Offline');
  });

  it('quem digita avisa a outra pessoa uma vez e só de novo depois da espera; enviar zera a espera', async () => {
    await esperarCampoDeMensagem(tela.fixture, async () => {
      await vi.advanceTimersByTimeAsync(0);
      await tela.atualizar();
    });
    const caminho = '/mensagem-direta/conversa/9/digitando';

    teclarNaMensagem(tela.fixture, 'o');
    teclarNaMensagem(tela.fixture, 'i');
    responderSucesso(esperarRequisicao(tela.http, 'POST', caminho), null);

    await vi.advanceTimersByTimeAsync(ESPERA_ENTRE_AVISOS_DE_DIGITACAO_MS - 1);
    teclarNaMensagem(tela.fixture, 'a');
    tela.http.expectNone((requisicao) => requisicao.url.endsWith(caminho));

    await vi.advanceTimersByTimeAsync(1);
    teclarNaMensagem(tela.fixture, 'b');
    responderSucesso(esperarRequisicao(tela.http, 'POST', caminho), null);
  });

  it('o menu Copiar texto põe o Markdown na área de transferência e mostra "Copiado" por um instante', async () => {
    const escrever = vi.fn().mockResolvedValue(undefined);
    Object.defineProperty(navigator, 'clipboard', { value: { writeText: escrever }, configurable: true });
    estado.conversaAberta.update((aberta) => ({
      ...aberta!,
      mensagens: [
        {
          mensagemId: 'm-2', conversaId: '1-9', autor: AutorMensagemDiretaEnum.USUARIO, autorUsuarioId: 9, texto: '**oi**\n\n```ts\nconst a = 1;\n```',
          contemCodigo: true, mencoes: [], referencias: [], respondeA: null, createdDate: new Date(), situacao: 'ENVIADA',
        },
      ],
    }));
    await redesenhar();

    const botao = () => tela.elemento.querySelector<HTMLButtonElement>('[aria-label="Ações da mensagem"]')!;
    expect(botao()).not.toBeNull();
    botao().click();
    await redesenhar();
    expect(document.querySelector('.p-contextmenu')).not.toBeNull();
    botao().click();
    await redesenhar();
    expect(document.querySelector('.p-contextmenu')).toBeNull();
    botao().click();
    await redesenhar();
    const copiar = Array.from(document.querySelectorAll<HTMLElement>('.p-contextmenu-item-link')).find((item) => item.textContent?.includes('Copiar texto'));
    expect(copiar).toBeDefined();
    copiar!.click();
    await redesenhar();
    expect(escrever).toHaveBeenCalledWith('**oi**\n\n```ts\nconst a = 1;\n```');
    expect(botao().querySelector('.pi-check')).not.toBeNull();

    await vi.advanceTimersByTimeAsync(TEMPO_DO_COPIADO_MS);
    await tela.atualizar();
    expect(botao().querySelector('.pi-ellipsis-h')).not.toBeNull();
  });
  it('o botão direito abre as ações da mensagem escolhida e trocar de conversa fecha o menu', async () => {
    const escrever = vi.fn().mockResolvedValue(undefined);
    Object.defineProperty(navigator, 'clipboard', { value: { writeText: escrever }, configurable: true });
    estado.conversaAberta.update((aberta) => ({ ...aberta!, mensagens: [
      { mensagemId: 'minha', conversaId: '1-9', autor: AutorMensagemDiretaEnum.USUARIO, autorUsuarioId: 1, texto: 'Meu texto', contemCodigo: false, mencoes: [], referencias: [], respondeA: null, createdDate: new Date(), situacao: 'ENVIADA' },
      { mensagemId: 'recebida', conversaId: '1-9', autor: AutorMensagemDiretaEnum.USUARIO, autorUsuarioId: 9, texto: 'Texto da Camila', contemCodigo: false, mencoes: [], referencias: [], respondeA: null, createdDate: new Date(), situacao: 'ENVIADA' },
    ] }));
    await redesenhar();
    const mensagens = tela.elemento.querySelectorAll<HTMLElement>('.conversa-direta__balao');
    const abrir = async (indice: number) => {
      const evento = new MouseEvent('contextmenu', { bubbles: true, cancelable: true, clientX: 40, clientY: 60 });
      mensagens[indice].dispatchEvent(evento);
      await redesenhar();
      expect(evento.defaultPrevented).toBe(true);
    };
    const acao = (rotulo: string) => Array.from(document.querySelectorAll<HTMLElement>('.p-contextmenu-item-link')).find((item) => item.textContent?.includes(rotulo))!;

    await abrir(0);
    acao('Copiar texto').click();
    await redesenhar();
    expect(escrever).toHaveBeenCalledWith('Meu texto');
    await abrir(1);
    acao('Responder').click();
    await redesenhar();
    expect(estado.respondendoA()?.mensagemId).toBe('recebida');
    await abrir(0);
    acao('Responder').click();
    await redesenhar();
    expect(estado.respondendoA()?.mensagemId).toBe('minha');
    await abrir(1);
    estado.voltarParaALista();
    await redesenhar();
    expect(document.querySelector('.p-contextmenu')).toBeNull();
  });
});

describe('MensagemDiretaConversaComponent — aviso do sistema', () => {
  it('a mensagem do sistema (a supervisão leu a conversa) aparece como linha central, sem balão nem botão de responder', async () => {
    const tela = await montarComponente(MensagemDiretaConversaComponent, {
      usuario: TipoUsuarioEnum.DESENVOLVEDOR,
      provedores: [{ provide: MensagemDiretaEventosService, useClass: EventosFalso }],
    });
    TestBed.inject(MensagemDiretaEstadoService).conversaAberta.set({
      usuarioId: 9,
      usuarioNome: 'Camila Duarte',
      conversaId: '1-9',
      mensagens: [{
        mensagemId: 'sistema-1', conversaId: '1-9', autor: AutorMensagemDiretaEnum.SISTEMA, autorUsuarioId: null, texto: 'Carla, gestor, leu esta conversa',
        contemCodigo: false, mencoes: [], referencias: [], respondeA: null, createdDate: new Date('2026-10-21T14:05:00.000Z'), situacao: 'ENVIADA',
      }],
      lidaPeloOutroAte: null,
      proximoCursor: null,
      carregando: false,
      carregandoMais: false,
      erro: false,
    });
    await tela.atualizar();

    expect(tela.elemento.querySelector('.conversa-direta__sistema')?.textContent).toContain('Carla, gestor, leu esta conversa');
    expect(tela.elemento.querySelector('.conversa-direta__balao')).toBeNull();
    expect(tela.elemento.querySelector('[aria-label="Ações da mensagem"]')).toBeNull();
  });
});
