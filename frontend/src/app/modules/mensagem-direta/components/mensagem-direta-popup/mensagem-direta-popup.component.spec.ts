import { describe, it, expect, beforeEach } from 'vitest';
import { signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { AutorMensagemDiretaEnum, MensagemDiretaEventoDto, TipoUsuarioEnum } from '@project20/shared';
import { montarComponente, ComponenteMontado } from '../../../../../testes/montar-componente';
import { esperarRequisicao, responderErro, responderSucesso } from '../../../../../testes/http-teste';
import { campoDeMensagem, digitarNaMensagem, esperarCampoDeMensagem, teclarNaMensagem } from '../../../../../testes/campo-mensagem';
import { MensagemDiretaEstadoService } from '../../services/mensagem-direta-estado.service';
import { MensagemDiretaEventosService, OuvintesDoStream } from '../../services/mensagem-direta-eventos.service';
import { MensagemDiretaPopupComponent } from './mensagem-direta-popup.component';

// O popup do chat entre colaboradores (task 210) com a API em dublê de HTTP e o stream em dublê: lista, conversa, envio, falha e reenvio, eventos em tempo
// real, busca e nova conversa. O usuário autenticado de teste tem id 1; a outra pessoa é a 9 (conversa `1-9`).

class EventosFalso {
  readonly conectado = signal(true);
  ouvintes: OuvintesDoStream | null = null;
  iniciar(ouvintes: OuvintesDoStream): void {
    this.ouvintes = ouvintes;
  }
  parar(): void {
    this.ouvintes = null;
  }
}

function resumoDaMensagem(id: string, texto: string, autorUsuarioId: number, data = '2026-10-21T14:00:00.000Z', conversaId = '1-9') {
  return { mensagemId: id, conversaId, autor: AutorMensagemDiretaEnum.USUARIO, autorUsuarioId, texto, contemCodigo: false, mencoes: [], referencias: [], createdDate: data };
}

function conversaDaLista(usuarioId: number, nome: string, naoLidas = 0, texto = 'oi') {
  return {
    conversaId: `1-${usuarioId}`, usuarioId, usuarioNome: nome, naoLidas, silenciada: false, online: false,
    ultimaMensagem: resumoDaMensagem(`m${usuarioId}`, texto, usuarioId, '2026-10-21T14:00:00.000Z', `1-${usuarioId}`),
  };
}

/** O `@defer` do template exige resolver os metadados do componente antes de criá-lo (o `montarComponente` não o faz). */
async function montarPopup(): Promise<ComponenteMontado<MensagemDiretaPopupComponent>> {
  TestBed.configureTestingModule({ imports: [MensagemDiretaPopupComponent] });
  await TestBed.compileComponents();
  return montarComponente(MensagemDiretaPopupComponent, {
    usuario: TipoUsuarioEnum.DESENVOLVEDOR,
    provedores: [{ provide: MensagemDiretaEventosService, useClass: EventosFalso }],
  });
}

describe('MensagemDiretaPopupComponent', () => {
  let tela: ComponenteMontado<MensagemDiretaPopupComponent>;

  // O campo de mensagem é o editor formatado (task 218): escreve-se pela API dele e as teclas chegam no elemento editável.
  const DIGITAR = (_elemento: HTMLElement, texto: string) => digitarNaMensagem(tela.fixture, texto);
  const TECLAR_ENTER = (_elemento: HTMLElement) => teclarNaMensagem(tela.fixture, 'Enter');
  let estado: MensagemDiretaEstadoService;
  let eventos: EventosFalso;

  async function montar(conversas = [conversaDaLista(9, 'Camila Duarte', 2, 'Dá uma olhada na DEM-212?'), conversaDaLista(15, 'Rafael Lima', 0, 'rodei a migration')]) {
    tela = await montarPopup();
    estado = TestBed.inject(MensagemDiretaEstadoService);
    eventos = TestBed.inject(MensagemDiretaEventosService) as unknown as EventosFalso;
    responderSucesso(esperarRequisicao(tela.http, 'GET', '/mensagem-direta/conversas'), { conversas });
    estado.abrir();
    await tela.atualizar();
  }

  const texto = () => tela.elemento.textContent ?? '';

  beforeEach(() => localStorage.clear());

  it('fechado, o popup não aparece, mas o stream já está ligado e as não lidas contam', async () => {
    tela = await montarPopup();
    estado = TestBed.inject(MensagemDiretaEstadoService);
    eventos = TestBed.inject(MensagemDiretaEventosService) as unknown as EventosFalso;
    responderSucesso(esperarRequisicao(tela.http, 'GET', '/mensagem-direta/conversas'), { conversas: [conversaDaLista(9, 'Camila Duarte', 3)] });
    await tela.atualizar();

    expect(tela.elemento.querySelector('[role="dialog"]')).toBeNull();
    expect(eventos.ouvintes).not.toBeNull();
    expect(estado.naoLidas()).toBe(3);
  });

  it('mostra as conversas com nome, prévia e contador de não lidas', async () => {
    await montar();
    expect(texto()).toContain('Camila Duarte');
    expect(texto()).toContain('Dá uma olhada na DEM-212?');
    expect(texto()).toContain('Rafael Lima');
    expect(tela.elemento.querySelector('[aria-label="2 mensagens não lidas"]')).not.toBeNull();
    expect(texto()).toContain('Gestores e administradores podem ler as conversas entre desenvolvedores.');
  });

  it('sem conversas, mostra o estado vazio com o botão de nova conversa', async () => {
    await montar([]);
    expect(texto()).toContain('Nenhuma conversa ainda');
    expect(Array.from(tela.elemento.querySelectorAll('button')).some((b) => b.textContent?.includes('Nova conversa'))).toBe(true);
  });

  it('erro ao carregar a lista mostra o aviso e "Tentar de novo" recarrega', async () => {
    tela = await montarPopup();
    estado = TestBed.inject(MensagemDiretaEstadoService);
    responderErro(esperarRequisicao(tela.http, 'GET', '/mensagem-direta/conversas'), 500, 'falhou');
    estado.abrir();
    await tela.atualizar();
    expect(texto()).toContain('Não foi possível carregar as conversas.');

    Array.from(tela.elemento.querySelectorAll('button')).find((b) => b.textContent?.includes('Tentar de novo'))!.click();
    responderSucesso(esperarRequisicao(tela.http, 'GET', '/mensagem-direta/conversas'), { conversas: [conversaDaLista(9, 'Camila Duarte')] });
    await tela.atualizar();
    expect(texto()).toContain('Camila Duarte');
  });

  it('abrir uma conversa lê a página, marca como lida até a última do outro e zera o contador', async () => {
    await montar();
    Array.from(tela.elemento.querySelectorAll<HTMLButtonElement>('button')).find((b) => b.textContent?.includes('Camila Duarte'))!.click();
    await tela.atualizar();

    responderSucesso(esperarRequisicao(tela.http, 'GET', '/mensagem-direta/conversa/9'), {
      mensagens: [resumoDaMensagem('m2', 'Era isso mesmo, obrigada!', 9, '2026-10-21T14:07:00.000Z'), resumoDaMensagem('m1', 'Sabe por que some?', 9, '2026-10-21T14:02:00.000Z')],
      proximoCursor: null,
      lidaAteDate: null,
    });
    await tela.atualizar();

    expect(texto()).toContain('Sabe por que some?');
    expect(texto()).toContain('Era isso mesmo, obrigada!');
    const leitura = esperarRequisicao(tela.http, 'PUT', '/mensagem-direta/conversa/9/leitura');
    expect(leitura.request.body).toEqual({ lidaAteDate: '2026-10-21T14:07:00.000Z' });
    responderSucesso(leitura, { conversaId: '1-9', lidaAteDate: '2026-10-21T14:07:00.000Z' });
    await tela.atualizar();
    expect(estado.naoLidas()).toBe(0);
  });

  async function abrirConversaVazia() {
    await montar();
    void estado.abrirConversa(9, 'Camila Duarte');
    await tela.atualizar();
    responderSucesso(esperarRequisicao(tela.http, 'GET', '/mensagem-direta/conversa/9'), { mensagens: [], proximoCursor: null, lidaAteDate: null });
    await tela.atualizar();
    await esperarCampoDeMensagem(tela.fixture, () => tela.atualizar());
  }

  // --- rodapé enxuto (task 217) -----------------------------------------------------------------

  const AVISO = 'Gestores e administradores podem ler as conversas entre desenvolvedores.';

  it('na conversa o aviso de leitura vira um ícone no cabeçalho (texto no aria-label) e não ocupa o rodapé', async () => {
    await abrirConversaVazia();
    expect(tela.elemento.querySelector('.popup-direto__aviso')).toBeNull();
    expect(tela.elemento.querySelector(`.conversa-direta__cabecalho button[aria-label="${AVISO}"]`)).not.toBeNull();
    expect(tela.elemento.querySelector('.compositor-direto__legenda')).toBeNull();
  });

  it('o campo da conversa traz a dica de @ e # no placeholder, e o botão de enviar a dica do Enter', async () => {
    await abrirConversaVazia();
    expect(tela.elemento.querySelector('.editor-mensagem')!.getAttribute('data-placeholder')).toBe('Mensagem — @ pessoa, # demanda');
    expect(tela.elemento.textContent).not.toContain('Shift+Enter quebra a linha.');
  });

  it('o rodapé do aviso continua na lista de conversas e na nova conversa', async () => {
    await montar();
    expect(tela.elemento.querySelector('.popup-direto__aviso')?.textContent).toContain(AVISO);
    estado.visao.set('NOVA');
    await tela.atualizar();
    expect(tela.elemento.querySelector('.popup-direto__aviso')?.textContent).toContain(AVISO);
  });

  it('enviar com Enter: a mensagem aparece na hora, vai com um mensagemId e vira "Enviada"', async () => {
    await abrirConversaVazia();
    DIGITAR(tela.elemento, 'Vi isso ontem');
    TECLAR_ENTER(tela.elemento);
    await tela.atualizar();

    expect(texto()).toContain('Vi isso ontem');
    expect(texto()).toContain('Enviando');
    const envio = esperarRequisicao(tela.http, 'POST', '/mensagem-direta/mensagem');
    expect(envio.request.body.destinatarioId).toBe(9);
    expect(envio.request.body.texto).toBe('Vi isso ontem');
    expect(envio.request.body.mensagemId).toMatch(/^[0-9a-f-]{36}$/);
    responderSucesso(envio, { mensagem: resumoDaMensagem(envio.request.body.mensagemId, 'Vi isso ontem', 1, '2026-10-21T14:05:00.000Z'), jaExistia: false });
    await tela.atualizar();

    expect(texto()).toContain('Enviada');
    expect(texto()).not.toContain('Enviando');
    expect(tela.elemento.querySelectorAll('.conversa-direta__balao').length).toBe(1);
  });

  it('Shift+Enter não envia, e texto em branco não envia', async () => {
    await abrirConversaVazia();
    DIGITAR(tela.elemento, '   ');
    TECLAR_ENTER(tela.elemento);
    teclarNaMensagem(tela.fixture, 'Enter', { shiftKey: true });
    await tela.atualizar();
    tela.http.expectNone((r) => r.method === 'POST');
    expect(tela.elemento.querySelector<HTMLButtonElement>('button[aria-label="Enviar mensagem"]')!.disabled).toBe(true);
  });

  it('falha no envio mostra "Não enviada"; "Tentar de novo" reenvia com o MESMO mensagemId; "Excluir" descarta', async () => {
    await abrirConversaVazia();
    DIGITAR(tela.elemento, 'Então o filter precisa checar o undefined');
    TECLAR_ENTER(tela.elemento);
    await tela.atualizar();
    const primeira = esperarRequisicao(tela.http, 'POST', '/mensagem-direta/mensagem');
    const mensagemId = primeira.request.body.mensagemId;
    responderErro(primeira, 500, 'falhou');
    await tela.atualizar();

    expect(texto()).toContain('Não enviada');
    Array.from(tela.elemento.querySelectorAll<HTMLButtonElement>('button')).find((b) => b.textContent?.includes('Tentar de novo'))!.click();
    await tela.atualizar();
    const segunda = esperarRequisicao(tela.http, 'POST', '/mensagem-direta/mensagem');
    expect(segunda.request.body.mensagemId).toBe(mensagemId);
    responderSucesso(segunda, { mensagem: resumoDaMensagem(mensagemId, 'Então o filter precisa checar o undefined', 1), jaExistia: true });
    await tela.atualizar();
    expect(texto()).not.toContain('Não enviada');
    expect(tela.elemento.querySelectorAll('.conversa-direta__balao').length).toBe(1);

    DIGITAR(tela.elemento, 'outra');
    TECLAR_ENTER(tela.elemento);
    await tela.atualizar();
    responderErro(esperarRequisicao(tela.http, 'POST', '/mensagem-direta/mensagem'), 500, 'falhou');
    await tela.atualizar();
    Array.from(tela.elemento.querySelectorAll<HTMLButtonElement>('button')).find((b) => b.textContent?.includes('Excluir'))!.click();
    await tela.atualizar();
    expect(texto()).not.toContain('Não enviada');
  });

  it('evento MENSAGEM numa conversa que não está aberta soma uma não lida e leva a conversa ao topo', async () => {
    await montar();
    const evento: MensagemDiretaEventoDto = { tipo: 'MENSAGEM', mensagem: resumoDaMensagem('novo', 'Chegou agora', 15, '2026-10-21T15:00:00.000Z', '1-15') as never };
    eventos.ouvintes!.aoEvento(evento);
    await tela.atualizar();

    expect(estado.conversas()[0].usuarioId).toBe(15);
    expect(estado.naoLidas()).toBe(3);
    expect(texto()).toContain('Chegou agora');
  });

  it('evento MENSAGEM na conversa aberta aparece na tela, é marcado como lido e o evento repetido não duplica', async () => {
    await abrirConversaVazia();
    const evento: MensagemDiretaEventoDto = { tipo: 'MENSAGEM', mensagem: resumoDaMensagem('novo', 'Oi, tudo bem?', 9, '2026-10-21T15:00:00.000Z') as never };
    eventos.ouvintes!.aoEvento(evento);
    eventos.ouvintes!.aoEvento(evento);
    await tela.atualizar();

    expect(tela.elemento.querySelectorAll('.conversa-direta__balao').length).toBe(1);
    const leitura = esperarRequisicao(tela.http, 'PUT', '/mensagem-direta/conversa/9/leitura');
    expect(leitura.request.body).toEqual({ lidaAteDate: '2026-10-21T15:00:00.000Z' });
    responderSucesso(leitura, { conversaId: '1-9', lidaAteDate: '2026-10-21T15:00:00.000Z' });
  });

  it('evento LEITURA da outra pessoa mostra "Lida" na minha última mensagem', async () => {
    await montar();
    void estado.abrirConversa(9, 'Camila Duarte');
    await tela.atualizar();
    responderSucesso(esperarRequisicao(tela.http, 'GET', '/mensagem-direta/conversa/9'), {
      mensagens: [resumoDaMensagem('minha', 'Vi isso ontem', 1, '2026-10-21T14:05:00.000Z')], proximoCursor: null, lidaAteDate: null,
    });
    await tela.atualizar();
    expect(texto()).toContain('Enviada');
    expect(texto()).not.toContain('Lida');

    eventos.ouvintes!.aoEvento({ tipo: 'LEITURA', conversaId: '1-9', usuarioId: 9, lidaAteDate: '2026-10-21T14:06:00.000Z' as never });
    await tela.atualizar();
    expect(texto()).toContain('Lida');
  });

  it('PRESENCA e ABERTURA atualizam a bolinha de presença', async () => {
    await montar();
    eventos.ouvintes!.aoEvento({ tipo: 'ABERTURA', onlineUsuarioIds: [9] });
    await tela.atualizar();
    expect(tela.elemento.querySelectorAll('.avatar-direto__presenca--online').length).toBe(1);
    eventos.ouvintes!.aoEvento({ tipo: 'PRESENCA', usuarioId: 15, online: true });
    await tela.atualizar();
    expect(tela.elemento.querySelectorAll('.avatar-direto__presenca--online').length).toBe(2);
    eventos.ouvintes!.aoEvento({ tipo: 'PRESENCA', usuarioId: 9, online: false });
    await tela.atualizar();
    expect(tela.elemento.querySelectorAll('.avatar-direto__presenca--online').length).toBe(1);
  });

  it('SINCRONIZAR e a reconexão do stream releem a lista e a conversa aberta', async () => {
    await montar();
    void estado.abrirConversa(9, 'Camila Duarte');
    await tela.atualizar();
    responderSucesso(esperarRequisicao(tela.http, 'GET', '/mensagem-direta/conversa/9'), { mensagens: [], proximoCursor: null, lidaAteDate: null });
    await tela.atualizar();

    eventos.ouvintes!.aoEvento({ tipo: 'SINCRONIZAR', conversaId: '1-9' });
    responderSucesso(esperarRequisicao(tela.http, 'GET', '/mensagem-direta/conversas'), { conversas: [conversaDaLista(9, 'Camila Duarte')] });
    responderSucesso(esperarRequisicao(tela.http, 'GET', '/mensagem-direta/conversa/9'), {
      mensagens: [resumoDaMensagem('perdida', 'Mensagem que o stream perdeu', 9)], proximoCursor: null, lidaAteDate: null,
    });
    await tela.atualizar();
    expect(texto()).toContain('Mensagem que o stream perdeu');
    responderSucesso(esperarRequisicao(tela.http, 'PUT', '/mensagem-direta/conversa/9/leitura'), { conversaId: '1-9', lidaAteDate: '2026-10-21T14:00:00.000Z' });

    eventos.ouvintes!.aoReconectar();
    responderSucesso(esperarRequisicao(tela.http, 'GET', '/mensagem-direta/conversas'), { conversas: [conversaDaLista(9, 'Camila Duarte')] });
    responderSucesso(esperarRequisicao(tela.http, 'GET', '/mensagem-direta/conversa/9'), {
      mensagens: [resumoDaMensagem('perdida', 'Mensagem que o stream perdeu', 9)], proximoCursor: null, lidaAteDate: null,
    });
    await tela.atualizar();
    expect(texto()).toContain('Mensagem que o stream perdeu');
    expect(tela.elemento.querySelectorAll('.conversa-direta__balao').length).toBe(1);
  });

  it('a busca mostra as mensagens com o termo realçado e as pessoas pelo nome', async () => {
    await montar();
    const campo = tela.elemento.querySelector<HTMLInputElement>('input[aria-label="Buscar pessoa ou mensagem"]')!;
    campo.value = 'filtro';
    campo.dispatchEvent(new Event('input'));
    await new Promise((resolver) => setTimeout(resolver, 400));

    responderSucesso(esperarRequisicao(tela.http, 'GET', '/mensagem-direta/pessoas'), {
      pessoas: [{ usuarioId: 9, usuarioNome: 'Camila Duarte', tipo: TipoUsuarioEnum.DESENVOLVEDOR, online: true }],
    });
    const busca = esperarRequisicao(tela.http, 'GET', '/mensagem-direta/busca');
    expect(busca.request.params.get('texto')).toBe('filtro');
    responderSucesso(busca, { mensagens: [resumoDaMensagem('b1', 'Sabe por que o filtro some depois do reload?', 9)] });
    await tela.atualizar();

    expect(texto()).toContain('Mensagens · 1 resultado');
    expect(tela.elemento.querySelector('mark')?.textContent).toBe('filtro');
    expect(texto()).toContain('Pessoas · nenhuma com “filtro”');
  });

  it('nova conversa lista as pessoas, filtra pelo nome e abre a conversa da escolhida', async () => {
    await montar();
    tela.elemento.querySelector<HTMLButtonElement>('button[aria-label="Nova conversa"]')!.click();
    await tela.atualizar();
    responderSucesso(esperarRequisicao(tela.http, 'GET', '/mensagem-direta/pessoas'), {
      pessoas: [
        { usuarioId: 9, usuarioNome: 'Camila Duarte', tipo: TipoUsuarioEnum.DESENVOLVEDOR, online: false },
        { usuarioId: 20, usuarioNome: 'Thiago Mendes', tipo: TipoUsuarioEnum.GESTOR, online: false },
      ],
    });
    await tela.atualizar();
    expect(texto()).toContain('Nova conversa');
    expect(texto()).toContain('Camila Duarte');
    expect(texto()).toContain('Thiago Mendes');

    const campo = tela.elemento.querySelector<HTMLInputElement>('input[aria-label="Buscar pessoa pelo nome"]')!;
    campo.value = 'thi';
    campo.dispatchEvent(new Event('input'));
    await tela.atualizar();
    expect(texto()).not.toContain('Camila Duarte');

    Array.from(tela.elemento.querySelectorAll<HTMLButtonElement>('button')).find((b) => b.textContent?.includes('Thiago Mendes'))!.click();
    await tela.atualizar();
    responderSucesso(esperarRequisicao(tela.http, 'GET', '/mensagem-direta/conversa/20'), { mensagens: [], proximoCursor: null, lidaAteDate: null });
    await tela.atualizar();
    expect(texto()).toContain('Diga olá para Thiago Mendes.');
  });

  // --- correções da revisão (task 210) ------------------------------------------------------------

  async function abrirComConversaDoOutro(mensagensIniciais: ReturnType<typeof resumoDaMensagem>[] = []) {
    await montar();
    void estado.abrirConversa(9, 'Camila Duarte');
    await tela.atualizar();
    responderSucesso(esperarRequisicao(tela.http, 'GET', '/mensagem-direta/conversa/9'), { mensagens: mensagensIniciais, proximoCursor: null, lidaAteDate: null });
    await tela.atualizar();
    if (mensagensIniciais.some((m) => m.autorUsuarioId === 9)) {
      responderSucesso(esperarRequisicao(tela.http, 'PUT', '/mensagem-direta/conversa/9/leitura'), { conversaId: '1-9', lidaAteDate: mensagensIniciais[0].createdDate });
      await tela.atualizar();
    }
    await esperarCampoDeMensagem(tela.fixture, () => tela.atualizar());
  }

  function definirVisibilidade(estadoDaPagina: 'visible' | 'hidden') {
    Object.defineProperty(document, 'visibilityState', { value: estadoDaPagina, configurable: true });
  }

  it('com a página oculta, mensagem nova NÃO é marcada como lida e conta como não lida; ao voltar, é marcada', async () => {
    await abrirComConversaDoOutro();
    definirVisibilidade('hidden');
    try {
      eventos.ouvintes!.aoEvento({ tipo: 'MENSAGEM', mensagem: resumoDaMensagem('oculta', 'Chegou com a aba oculta', 9, '2026-10-21T16:00:00.000Z') as never });
      await tela.atualizar();
      tela.http.expectNone((r) => r.method === 'PUT');
      expect(estado.conversas().find((c) => c.usuarioId === 9)?.naoLidas).toBe(1);

      definirVisibilidade('visible');
      document.dispatchEvent(new Event('visibilitychange'));
      const leitura = esperarRequisicao(tela.http, 'PUT', '/mensagem-direta/conversa/9/leitura');
      expect(leitura.request.body).toEqual({ lidaAteDate: '2026-10-21T16:00:00.000Z' });
      responderSucesso(leitura, { conversaId: '1-9', lidaAteDate: '2026-10-21T16:00:00.000Z' });
      await tela.atualizar();
      expect(estado.naoLidas()).toBe(0);
    } finally {
      definirVisibilidade('visible');
    }
  });

  it('a mensagem que falhou NÃO se perde ao voltar para a lista: volta ao reabrir a conversa, com "Tentar de novo"', async () => {
    await abrirComConversaDoOutro();
    DIGITAR(tela.elemento, 'Texto que vai falhar');
    TECLAR_ENTER(tela.elemento);
    await tela.atualizar();
    responderErro(esperarRequisicao(tela.http, 'POST', '/mensagem-direta/mensagem'), 500, 'falhou');
    await tela.atualizar();
    expect(texto()).toContain('Não enviada');

    estado.voltarParaALista();
    await tela.atualizar();
    void estado.abrirConversa(9, 'Camila Duarte');
    await tela.atualizar();
    responderSucesso(esperarRequisicao(tela.http, 'GET', '/mensagem-direta/conversa/9'), { mensagens: [], proximoCursor: null, lidaAteDate: null });
    await tela.atualizar();

    expect(texto()).toContain('Texto que vai falhar');
    expect(texto()).toContain('Não enviada');
    expect(Array.from(tela.elemento.querySelectorAll('button')).some((b) => b.textContent?.includes('Tentar de novo'))).toBe(true);
  });

  it('falha do POST que chega DEPOIS de o evento trazer a mensagem não a volta para "Não enviada"', async () => {
    await abrirComConversaDoOutro();
    DIGITAR(tela.elemento, 'Gravada mas o POST deu erro');
    TECLAR_ENTER(tela.elemento);
    await tela.atualizar();
    const envio = esperarRequisicao(tela.http, 'POST', '/mensagem-direta/mensagem');
    const mensagemId = envio.request.body.mensagemId;

    eventos.ouvintes!.aoEvento({ tipo: 'MENSAGEM', mensagem: resumoDaMensagem(mensagemId, 'Gravada mas o POST deu erro', 1, '2026-10-21T16:05:00.000Z') as never });
    responderErro(envio, 504, 'timeout');
    await tela.atualizar();

    expect(texto()).not.toContain('Não enviada');
    expect(tela.elemento.querySelectorAll('.conversa-direta__balao').length).toBe(1);
  });

  it('uma mensagem ou um "Lida" que chega NÃO tira o foco de quem digita em outro lugar da página', async () => {
    await abrirComConversaDoOutro();
    const outroCampo = document.createElement('input');
    document.body.appendChild(outroCampo);
    try {
      outroCampo.focus();
      eventos.ouvintes!.aoEvento({ tipo: 'LEITURA', conversaId: '1-9', usuarioId: 9, lidaAteDate: '2026-10-21T16:00:00.000Z' as never });
      eventos.ouvintes!.aoEvento({ tipo: 'MENSAGEM', mensagem: resumoDaMensagem('nova', 'Oi', 9, '2026-10-21T16:01:00.000Z') as never });
      await tela.atualizar();
      await new Promise((resolver) => setTimeout(resolver, 20));
      expect(document.activeElement).toBe(outroCampo);
      responderSucesso(esperarRequisicao(tela.http, 'PUT', '/mensagem-direta/conversa/9/leitura'), { conversaId: '1-9', lidaAteDate: '2026-10-21T16:01:00.000Z' });
    } finally {
      outroCampo.remove();
    }
  });

  it('a recuperação SUBSTITUI a página do servidor: o que o stream perdeu aparece e o que já estava não duplica', async () => {
    await abrirComConversaDoOutro([resumoDaMensagem('antiga', 'Mensagem antiga', 9, '2026-10-21T14:00:00.000Z')]);
    eventos.ouvintes!.aoReconectar();
    responderSucesso(esperarRequisicao(tela.http, 'GET', '/mensagem-direta/conversas'), { conversas: [conversaDaLista(9, 'Camila Duarte')] });
    responderSucesso(esperarRequisicao(tela.http, 'GET', '/mensagem-direta/conversa/9'), {
      mensagens: [resumoDaMensagem('perdida', 'Perdida', 9, '2026-10-21T15:00:00.000Z'), resumoDaMensagem('antiga', 'Mensagem antiga', 9, '2026-10-21T14:00:00.000Z')],
      proximoCursor: null, lidaAteDate: null,
    });
    await tela.atualizar();
    expect(tela.elemento.querySelectorAll('.conversa-direta__balao').length).toBe(2);
    responderSucesso(esperarRequisicao(tela.http, 'PUT', '/mensagem-direta/conversa/9/leitura'), { conversaId: '1-9', lidaAteDate: '2026-10-21T15:00:00.000Z' });
  });

  it('resposta atrasada da lista não vence a mais nova, e a de um usuário que saiu (parar) não volta à tela', async () => {
    await montar();
    void estado.carregarConversas();
    void estado.carregarConversas();
    const [antiga, nova] = tela.http.match((r) => r.method === 'GET' && r.url.endsWith('/mensagem-direta/conversas'));
    responderSucesso(nova, { conversas: [conversaDaLista(15, 'Rafael Lima', 4)] });
    responderSucesso(antiga, { conversas: [conversaDaLista(9, 'Camila Duarte', 7)] });
    await tela.atualizar();
    expect(estado.conversas().map((c) => c.usuarioNome)).toEqual(['Rafael Lima']);

    void estado.carregarConversas();
    const emVoo = esperarRequisicao(tela.http, 'GET', '/mensagem-direta/conversas');
    estado.parar();
    responderSucesso(emVoo, { conversas: [conversaDaLista(9, 'Camila Duarte', 9)] });
    await tela.atualizar();
    expect(estado.conversas()).toEqual([]);
    expect(estado.naoLidas()).toBe(0);
  });

  it('Esc dentro do popup o oculta', async () => {
    await montar();
    expect(estado.aberto()).toBe(true);
    tela.elemento.querySelector('.popup-direto')!.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
    await tela.atualizar();
    expect(estado.aberto()).toBe(false);
  });

  // --- silêncio por conversa e contador (task 212) ----------------------------------------------

  it('o sino da conversa silencia e reativa: muda na hora, grava o silêncio e a lista mostra o sino cortado', async () => {
    await abrirConversaVazia();
    const sino = () => tela.elemento.querySelector<HTMLButtonElement>('button[aria-label$="os avisos desta conversa"]')!;
    expect(sino().getAttribute('aria-label')).toBe('Silenciar os avisos desta conversa');

    sino().click();
    await tela.atualizar();
    expect(sino().getAttribute('aria-label')).toBe('Reativar os avisos desta conversa');
    expect(estado.estaSilenciada(9)).toBe(true);
    const silenciar = esperarRequisicao(tela.http, 'PUT', '/mensagem-direta/conversa/9/silencio');
    expect(silenciar.request.body).toEqual({ silenciada: true });
    responderSucesso(silenciar, { conversaId: '1-9', silenciada: true });
    await tela.atualizar();

    sino().click();
    await tela.atualizar();
    const reativar = esperarRequisicao(tela.http, 'PUT', '/mensagem-direta/conversa/9/silencio');
    expect(reativar.request.body).toEqual({ silenciada: false });
    responderSucesso(reativar, { conversaId: '1-9', silenciada: false });
    await tela.atualizar();
    expect(estado.estaSilenciada(9)).toBe(false);
  });

  it('se o servidor recusar o silêncio da conversa, a tela volta ao estado anterior', async () => {
    await abrirConversaVazia();
    tela.elemento.querySelector<HTMLButtonElement>('button[aria-label="Silenciar os avisos desta conversa"]')!.click();
    await tela.atualizar();
    expect(estado.estaSilenciada(9)).toBe(true);
    responderErro(esperarRequisicao(tela.http, 'PUT', '/mensagem-direta/conversa/9/silencio'), 500, 'falhou');
    await tela.atualizar();
    expect(estado.estaSilenciada(9)).toBe(false);
    expect(tela.elemento.querySelector('button[aria-label="Silenciar os avisos desta conversa"]')).not.toBeNull();
  });

  it('conversa silenciada NÃO conta no contador do topbar, mas a linha dela na lista continua mostrando as suas não lidas', async () => {
    await montar([
      { ...conversaDaLista(9, 'Camila Duarte', 2), silenciada: true },
      conversaDaLista(15, 'Rafael Lima', 3),
    ]);
    expect(estado.naoLidas()).toBe(3);
    expect(tela.elemento.querySelector('[aria-label="2 mensagens não lidas"]')).not.toBeNull();
    expect(tela.elemento.querySelector('[aria-label="3 mensagens não lidas"]')).not.toBeNull();
  });

  it('silenciar uma conversa que ainda não tem mensagem lembra a escolha (e ela vale quando a primeira mensagem chegar)', async () => {
    await montar([]);
    void estado.abrirConversa(20, 'Thiago Mendes');
    await tela.atualizar();
    responderSucesso(esperarRequisicao(tela.http, 'GET', '/mensagem-direta/conversa/20'), { mensagens: [], proximoCursor: null, lidaAteDate: null });
    await tela.atualizar();

    tela.elemento.querySelector<HTMLButtonElement>('button[aria-label="Silenciar os avisos desta conversa"]')!.click();
    await tela.atualizar();
    responderSucesso(esperarRequisicao(tela.http, 'PUT', '/mensagem-direta/conversa/20/silencio'), { conversaId: '1-20', silenciada: true });
    await tela.atualizar();
    expect(estado.estaSilenciada(20)).toBe(true);
    expect(tela.elemento.querySelector('button[aria-label="Reativar os avisos desta conversa"]')).not.toBeNull();
  });
});
