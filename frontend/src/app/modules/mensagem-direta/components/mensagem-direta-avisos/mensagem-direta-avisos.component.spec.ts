import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { AutorMensagemDiretaEnum, TipoUsuarioEnum } from '@project20/shared';
import { montarComponente, ComponenteMontado } from '../../../../../testes/montar-componente';
import { esperarRequisicao, responderSucesso } from '../../../../../testes/http-teste';
import { MensagemDiretaAvisosService } from '../../services/mensagem-direta-avisos.service';
import { MensagemDiretaEstadoService } from '../../services/mensagem-direta-estado.service';
import { MensagemDiretaEventosService } from '../../services/mensagem-direta-eventos.service';
import { MensagemDiretaSomService } from '../../services/mensagem-direta-som.service';
import { normalizarConversa } from '../../utils/mensagem-direta.util';
import { MensagemDiretaAvisosComponent } from './mensagem-direta-avisos.component';

// Os avisos de mensagem nova (task 212): o cartão, a regra de quando avisar (preferências, silêncio geral, conversa silenciada, menção, conversa à vista),
// o som e a contagem de 8 s com pausa. O usuário autenticado de teste tem id 1; as outras pessoas são a 9 (Camila) e a 15 (Rafael).

class EventosFalso {
  readonly conectado = signal(true);
  iniciar(): void {}
  parar(): void {}
}

class SomFalso {
  toques = 0;
  tocar(): void {
    this.toques++;
  }
}

function mensagemDe(autorUsuarioId: number, texto: string, parcial: Record<string, unknown> = {}) {
  const outro = autorUsuarioId === 1 ? 9 : autorUsuarioId;
  return {
    mensagemId: `m-${Math.random().toString(36).slice(2)}`,
    conversaId: `${Math.min(1, outro)}-${Math.max(1, outro)}`,
    autor: AutorMensagemDiretaEnum.USUARIO,
    autorUsuarioId,
    texto,
    contemCodigo: false,
    mencoes: [] as number[],
    referencias: [],
    createdDate: new Date().toISOString() as never,
    ...parcial,
  };
}

function conversaDaLista(usuarioId: number, nome: string, silenciada = false) {
  return normalizarConversa({ conversaId: `1-${usuarioId}`, usuarioId, usuarioNome: nome, ultimaMensagem: null, naoLidas: 0, silenciada, online: false });
}

describe('MensagemDiretaAvisosComponent', () => {
  let tela: ComponenteMontado<MensagemDiretaAvisosComponent>;
  let estado: MensagemDiretaEstadoService;
  let avisos: MensagemDiretaAvisosService;
  let som: SomFalso;

  beforeEach(async () => {
    vi.useFakeTimers({ toFake: ['setTimeout', 'clearTimeout', 'setInterval', 'clearInterval', 'Date'] });
    tela = await montarComponente(MensagemDiretaAvisosComponent, {
      usuario: TipoUsuarioEnum.DESENVOLVEDOR,
      provedores: [
        { provide: MensagemDiretaEventosService, useClass: EventosFalso },
        { provide: MensagemDiretaSomService, useClass: SomFalso },
      ],
    });
    estado = TestBed.inject(MensagemDiretaEstadoService);
    avisos = TestBed.inject(MensagemDiretaAvisosService);
    som = TestBed.inject(MensagemDiretaSomService) as unknown as SomFalso;
    estado.conversas.set([conversaDaLista(9, 'Camila Duarte'), conversaDaLista(15, 'Rafael Lima')]);
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  const chegar = async (autorUsuarioId: number, texto: string, parcial: Record<string, unknown> = {}) => {
    estado.aplicarEvento({ tipo: 'MENSAGEM', mensagem: mensagemDe(autorUsuarioId, texto, parcial) as never });
    await vi.advanceTimersByTimeAsync(0);
    await tela.atualizar();
  };
  const cartoes = () => Array.from(tela.elemento.querySelectorAll('.aviso-direto'));
  const texto = () => tela.elemento.textContent ?? '';

  it('mensagem de outra pessoa mostra o cartão com o nome e a prévia sem marcação', async () => {
    await chegar(9, '**Oi**, dá uma olhada?');
    expect(cartoes().length).toBe(1);
    expect(texto()).toContain('Camila Duarte');
    expect(texto()).toContain('Oi, dá uma olhada?');
    expect(tela.elemento.querySelector('.aviso-direto')?.getAttribute('aria-label')).toBe('Mensagem nova de Camila Duarte');
  });

  it('mensagens seguidas da mesma pessoa atualizam o MESMO cartão; outra pessoa abre outro', async () => {
    await chegar(9, 'primeira');
    await chegar(9, 'segunda');
    await chegar(15, 'da outra pessoa');
    expect(cartoes().length).toBe(2);
    expect(texto()).toContain('2 mensagens novas');
    expect(texto()).toContain('segunda');
    expect(texto()).not.toContain('primeira');
  });

  it('a menção aparece destacada como "@você"', async () => {
    await chegar(9, 'veja isso', { mencoes: [1] });
    expect(tela.elemento.querySelector('.aviso-direto__mencao')?.textContent).toContain('@você');
  });

  it('não avisa mensagem minha (outra aba) nem a resposta do próprio envio', async () => {
    await chegar(1, 'escrevi em outra aba', { conversaId: '1-9' });
    expect(cartoes().length).toBe(0);
  });

  it('avisos desligados e silêncio geral calam tudo, inclusive a menção; vencido o prazo, voltam', async () => {
    avisos.preferencia.update((p) => ({ ...p, avisosAtivos: false }));
    await chegar(9, 'calada', { mencoes: [1] });
    expect(cartoes().length).toBe(0);

    avisos.preferencia.update((p) => ({ ...p, avisosAtivos: true, silenciadoAteDate: new Date(Date.now() + 3_600_000) }));
    await chegar(9, 'calada de novo', { mencoes: [1] });
    expect(cartoes().length).toBe(0);

    await vi.advanceTimersByTimeAsync(3_600_001);
    await chegar(9, 'agora avisa');
    expect(cartoes().length).toBe(1);
  });

  it('conversa silenciada só avisa se a mensagem menciona o usuário', async () => {
    estado.conversas.set([conversaDaLista(9, 'Camila Duarte', true)]);
    await chegar(9, 'sem menção');
    expect(cartoes().length).toBe(0);
    await chegar(9, 'com menção', { mencoes: [1] });
    expect(cartoes().length).toBe(1);
  });

  it('não avisa a conversa que o usuário está olhando (popup aberto nela e página visível)', async () => {
    void estado.abrirConversa(9, 'Camila Duarte');
    await vi.advanceTimersByTimeAsync(0);
    responderSucesso(esperarRequisicao(tela.http, 'GET', '/mensagem-direta/conversa/9'), { mensagens: [], proximoCursor: null, lidaAteDate: null });
    await vi.advanceTimersByTimeAsync(0);

    await chegar(9, 'estou vendo');
    expect(cartoes().length).toBe(0);
    // Outra pessoa, mesmo com o popup aberto: avisa.
    await chegar(15, 'em outra conversa');
    expect(cartoes().length).toBe(1);
    responderSucesso(esperarRequisicao(tela.http, 'PUT', '/mensagem-direta/conversa/9/leitura'), { conversaId: '1-9', lidaAteDate: new Date().toISOString() });
  });

  it('o som só toca com a preferência ligada', async () => {
    await chegar(9, 'sem som');
    expect(som.toques).toBe(0);
    avisos.preferencia.update((p) => ({ ...p, somAtivo: true }));
    await chegar(15, 'com som');
    expect(som.toques).toBe(1);
  });

  it('o cartão some sozinho em 8 s, o mouse em cima pausa a contagem e o fechar tira na hora', async () => {
    await chegar(9, 'some sozinho');
    await vi.advanceTimersByTimeAsync(7_000);
    await tela.atualizar();
    expect(cartoes().length).toBe(1);
    await vi.advanceTimersByTimeAsync(1_001);
    await tela.atualizar();
    expect(cartoes().length).toBe(0);

    await chegar(9, 'pausado');
    const cartao = cartoes()[0];
    await vi.advanceTimersByTimeAsync(3_000);
    cartao.dispatchEvent(new MouseEvent('mouseenter'));
    await vi.advanceTimersByTimeAsync(60_000);
    await tela.atualizar();
    expect(cartoes().length).toBe(1);

    cartao.dispatchEvent(new MouseEvent('mouseleave'));
    await vi.advanceTimersByTimeAsync(5_001);
    await tela.atualizar();
    expect(cartoes().length).toBe(0);

    await chegar(9, 'fechado à mão');
    tela.elemento.querySelector<HTMLButtonElement>('button[aria-label="Fechar aviso"]')!.click();
    await tela.atualizar();
    expect(cartoes().length).toBe(0);
  });

  it('uma mensagem nova reinicia a contagem do cartão', async () => {
    await chegar(9, 'primeira');
    await vi.advanceTimersByTimeAsync(7_000);
    await chegar(9, 'segunda');
    await vi.advanceTimersByTimeAsync(7_000);
    await tela.atualizar();
    expect(cartoes().length).toBe(1);
    await vi.advanceTimersByTimeAsync(1_100);
    await tela.atualizar();
    expect(cartoes().length).toBe(0);
  });

  it('Responder abre a conversa com quem escreveu e tira o cartão', async () => {
    await chegar(9, 'responda-me');
    Array.from(tela.elemento.querySelectorAll<HTMLButtonElement>('button')).find((b) => b.textContent?.includes('Responder'))!.click();
    await vi.advanceTimersByTimeAsync(0);
    await tela.atualizar();

    expect(estado.aberto()).toBe(true);
    expect(estado.visao()).toBe('CONVERSA');
    expect(estado.conversaAberta()?.usuarioId).toBe(9);
    expect(cartoes().length).toBe(0);
    esperarRequisicao(tela.http, 'GET', '/mensagem-direta/conversa/9');
  });

  it('conversa nova (fora da lista): o cartão espera a lista recarregar para ter o nome', async () => {
    estado.conversas.set([]);
    estado.aplicarEvento({ tipo: 'MENSAGEM', mensagem: mensagemDe(15, 'oi de quem eu não conhecia') as never });
    await vi.advanceTimersByTimeAsync(0);
    responderSucesso(esperarRequisicao(tela.http, 'GET', '/mensagem-direta/conversas'), {
      conversas: [{ conversaId: '1-15', usuarioId: 15, usuarioNome: 'Rafael Lima', ultimaMensagem: null, naoLidas: 1, silenciada: false, online: false }],
    });
    await vi.advanceTimersByTimeAsync(0);
    await tela.atualizar();
    expect(texto()).toContain('Rafael Lima');
  });

  it('o mouse e o foco pausam de forma independente: sair de um com o outro ainda em cima mantém o cartão', async () => {
    await chegar(9, 'foco e mouse');
    const cartao = cartoes()[0];
    cartao.dispatchEvent(new Event('focusin'));
    cartao.dispatchEvent(new MouseEvent('mouseenter'));
    cartao.dispatchEvent(new MouseEvent('mouseleave'));
    await vi.advanceTimersByTimeAsync(60_000);
    await tela.atualizar();
    expect(cartoes().length).toBe(1);

    cartao.dispatchEvent(new Event('focusout'));
    await vi.advanceTimersByTimeAsync(8_001);
    await tela.atualizar();
    expect(cartoes().length).toBe(0);
  });

  it('se a sessão acabar enquanto a lista recarrega, o aviso da mensagem da sessão anterior não aparece', async () => {
    estado.conversas.set([]);
    estado.aplicarEvento({ tipo: 'MENSAGEM', mensagem: mensagemDe(15, 'mensagem privada') as never });
    await vi.advanceTimersByTimeAsync(0);
    estado.parar();
    responderSucesso(esperarRequisicao(tela.http, 'GET', '/mensagem-direta/conversas'), { conversas: [] });
    await vi.advanceTimersByTimeAsync(0);
    await tela.atualizar();
    expect(cartoes().length).toBe(0);
    expect(avisos.avisos().length).toBe(0);
  });
});
