import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { TestBed } from '@angular/core/testing';
import { Router, provideRouter } from '@angular/router';
import { MensagemDiretaEventoDto } from '@project20/shared';
import { MensagemDiretaEventosService, OuvintesDoStream } from './mensagem-direta-eventos.service';

// O stream de eventos do chat entre colaboradores (task 210) com `fetch` em dublê: a conexão só vale depois da ABERTURA, a recuperação vem depois dela,
// o ENCERRANDO do servidor conta como falha (a espera cresce, não há tempestade de reconexões) e a sessão expirada (401) leva ao login.

function corpoDoStream(eventos: MensagemDiretaEventoDto[], aoFim: 'fechar' | 'ficarAberto' = 'fechar') {
  const codificador = new TextEncoder();
  let fechar: (() => void) | undefined;
  const corpo = new ReadableStream<Uint8Array>({
    start(controlador) {
      for (const evento of eventos) controlador.enqueue(codificador.encode(`data: ${JSON.stringify(evento)}\n\n`));
      if (aoFim === 'fechar') controlador.close();
      else fechar = () => controlador.close();
    },
  });
  return { corpo, fechar: () => fechar?.() };
}

function respostaDoStream(eventos: MensagemDiretaEventoDto[], aoFim: 'fechar' | 'ficarAberto' = 'fechar'): Response {
  return new Response(corpoDoStream(eventos, aoFim).corpo, { status: 200, headers: { 'Content-Type': 'text/event-stream' } });
}

const ABERTURA: MensagemDiretaEventoDto = { tipo: 'ABERTURA', onlineUsuarioIds: [1, 2] };

describe('MensagemDiretaEventosService', () => {
  let servico: MensagemDiretaEventosService;
  let ouvintes: OuvintesDoStream & { eventos: MensagemDiretaEventoDto[]; reconexoes: number };
  let chamadas: number;

  beforeEach(() => {
    vi.useFakeTimers({ toFake: ['setTimeout', 'clearTimeout', 'setInterval', 'clearInterval', 'Date'] });
    TestBed.configureTestingModule({ providers: [provideRouter([])] });
    servico = TestBed.inject(MensagemDiretaEventosService);
    chamadas = 0;
    const eventos: MensagemDiretaEventoDto[] = [];
    ouvintes = { eventos, reconexoes: 0, aoEvento: (evento) => eventos.push(evento), aoReconectar: () => { ouvintes.reconexoes++; } };
  });

  afterEach(() => {
    servico.parar();
    vi.useRealTimers();
    vi.unstubAllGlobals();
  });

  async function deixarRodar(): Promise<void> {
    await vi.advanceTimersByTimeAsync(0);
    await vi.advanceTimersByTimeAsync(0);
  }

  it('só fica conectado depois da ABERTURA e entrega os eventos na ordem', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => { chamadas++; return respostaDoStream([ABERTURA, { tipo: 'PRESENCA', usuarioId: 3, online: true }], 'ficarAberto'); }));
    expect(servico.conectado()).toBe(false);
    servico.iniciar(ouvintes);
    await deixarRodar();

    expect(servico.conectado()).toBe(true);
    expect(ouvintes.eventos.map((e) => e.tipo)).toEqual(['ABERTURA', 'PRESENCA']);
    expect(ouvintes.reconexoes).toBe(0);
  });

  it('a queda do stream reconecta, e a recuperação (aoReconectar) só vem depois da ABERTURA da nova conexão', async () => {
    const respostas = [
      () => respostaDoStream([ABERTURA]), // fecha logo: queda
      () => respostaDoStream([ABERTURA], 'ficarAberto'),
    ];
    vi.stubGlobal('fetch', vi.fn(async () => respostas[Math.min(chamadas++, respostas.length - 1)]()));
    servico.iniciar(ouvintes);
    await deixarRodar();
    expect(chamadas).toBe(1);
    expect(servico.conectado()).toBe(false);
    expect(ouvintes.reconexoes).toBe(0);

    await vi.advanceTimersByTimeAsync(2_000);
    expect(chamadas).toBe(2);
    expect(servico.conectado()).toBe(true);
    expect(ouvintes.reconexoes).toBe(1);
  });

  it('conexão que o servidor encerra (ENCERRANDO) conta como falha: sem recuperação, sem "conectado" e com a espera crescendo', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => { chamadas++; return respostaDoStream([{ tipo: 'ENCERRANDO' }]); }));
    servico.iniciar(ouvintes);
    await deixarRodar();

    expect(servico.conectado()).toBe(false);
    expect(ouvintes.reconexoes).toBe(0);
    const primeira = chamadas;
    // Em 30 s uma espera que dobra permite poucas tentativas (1, 2, 4, 8, 16 s = 5); uma que voltasse a 1 s faria ~30.
    await vi.advanceTimersByTimeAsync(30_000);
    expect(chamadas - primeira).toBeLessThanOrEqual(6);
  });

  it('401 limpa a sessão, leva ao login com o retorno e NÃO tenta de novo', async () => {
    localStorage.setItem('access_token', 'x');
    localStorage.setItem('usuario_sessao', '{}');
    const roteador = TestBed.inject(Router);
    const navegar = vi.spyOn(roteador, 'navigate').mockResolvedValue(true);
    vi.stubGlobal('fetch', vi.fn(async () => { chamadas++; return new Response(null, { status: 401 }); }));
    servico.iniciar(ouvintes);
    await deixarRodar();
    await vi.advanceTimersByTimeAsync(60_000);

    expect(chamadas).toBe(1);
    expect(localStorage.getItem('access_token')).toBeNull();
    expect(localStorage.getItem('usuario_sessao')).toBeNull();
    expect(navegar).toHaveBeenCalledWith(['/autenticacao'], expect.anything());
    expect(servico.conectado()).toBe(false);
  });

  it('sem nenhum dado por mais de 70 s (conexão meio aberta) o vigia reinicia a conexão', async () => {
    vi.stubGlobal('fetch', vi.fn(async (_url: string, opcoes?: { signal?: AbortSignal }) => {
      chamadas++;
      const codificador = new TextEncoder();
      // Como o fetch de verdade: ao abortar, o corpo falha e a leitura rejeita.
      const corpo = new ReadableStream<Uint8Array>({
        start(controlador) {
          controlador.enqueue(codificador.encode(`data: ${JSON.stringify(ABERTURA)}\n\n`));
          opcoes?.signal?.addEventListener('abort', () => controlador.error(new DOMException('abortado', 'AbortError')));
        },
      });
      return new Response(corpo, { status: 200 });
    }));
    servico.iniciar(ouvintes);
    await deixarRodar();
    expect(chamadas).toBe(1);

    await vi.advanceTimersByTimeAsync(90_000);
    expect(chamadas).toBeGreaterThanOrEqual(2);
  });

  it('parar() interrompe e não reconecta', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => { chamadas++; return respostaDoStream([ABERTURA], 'ficarAberto'); }));
    servico.iniciar(ouvintes);
    await deixarRodar();
    servico.parar();
    await vi.advanceTimersByTimeAsync(60_000);

    expect(chamadas).toBe(1);
    expect(servico.conectado()).toBe(false);
  });
});
