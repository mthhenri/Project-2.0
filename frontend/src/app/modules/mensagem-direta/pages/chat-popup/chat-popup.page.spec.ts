import { describe, it, expect, beforeEach, vi } from 'vitest';
import { signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { ActivatedRoute, Router, convertToParamMap } from '@angular/router';
import { AutorMensagemDiretaEnum, TipoUsuarioEnum } from '@project20/shared';
import { montarComponente, ComponenteMontado } from '../../../../../testes/montar-componente';
import { esperarRequisicao, responderSucesso } from '../../../../../testes/http-teste';
import { esperarCampoDeMensagem, textoDaMensagem } from '../../../../../testes/campo-mensagem';
import { ProjectDesktopService } from '../../../../core/services/project-desktop.service';
import { MensagemDiretaPopupComponent } from '../../components/mensagem-direta-popup/mensagem-direta-popup.component';
import { MensagemDiretaAvisosService } from '../../services/mensagem-direta-avisos.service';
import { MensagemDiretaEstadoService } from '../../services/mensagem-direta-estado.service';
import { MensagemDiretaEventosService } from '../../services/mensagem-direta-eventos.service';
import { ChatPopupPage } from './chat-popup.page';

// A janela de chat do Project Desktop (task 213) e o atendimento ao atalho dentro do Project, com a ponte do Desktop em dublê. O usuário de teste tem id 1;
// a outra pessoa é a 9 (conversa `1-9`).

class EventosFalso {
  readonly conectado = signal(true);
  iniciar(): void {}
  parar(): void {}
}

class DesktopFalso {
  readonly disponivel = true;
  readonly naJanelaDeChat = true;
  readonly oculto = signal(false);
  paginaOculta = () => false;
  conversasInformadas: (number | null)[] = [];
  informarConversa = (usuarioId: number | null) => this.conversasInformadas.push(usuarioId);
  rascunho: string | null = null;
  fechamentos = 0;
  abertosNoProject: string[] = [];
  chat: ((areaDeTransferencia: string | null) => void) | null = null;
  navegacao: ((caminho: string) => void) | null = null;
  conversa: ((usuarioId: number, usuarioNome: string) => void) | null = null;
  aoPedirChat(ouvinte: (areaDeTransferencia: string | null) => void) {
    this.chat = ouvinte;
    return () => (this.chat = null);
  }
  aoPedirNavegacao(ouvinte: (caminho: string) => void) {
    this.navegacao = ouvinte;
    return () => (this.navegacao = null);
  }
  aoPedirConversa(ouvinte: (usuarioId: number, usuarioNome: string) => void) {
    this.conversa = ouvinte;
    return () => (this.conversa = null);
  }
  pegarRascunho = () => Promise.resolve(this.rascunho);
  fecharChat = () => this.fechamentos++;
  abrirNoProject = (caminho: string) => this.abertosNoProject.push(caminho);
  avisarMensagem(): void {}
  situacaoDoAtalho = () => Promise.resolve({ atalho: 'Ctrl+Shift+Space', registrado: true });
}

const CODIGO = 'const a = 1;\nconst b = 2;\nreturn a + b;';

function conversaDaLista(usuarioId: number, nome: string) {
  return {
    conversaId: `1-${usuarioId}`, usuarioId, usuarioNome: nome, naoLidas: 0, silenciada: false, online: false,
    ultimaMensagem: { mensagemId: `m${usuarioId}`, conversaId: `1-${usuarioId}`, autor: AutorMensagemDiretaEnum.USUARIO, autorUsuarioId: usuarioId, texto: 'oi', contemCodigo: false, mencoes: [], referencias: [], createdDate: '2026-10-21T14:00:00.000Z' },
  };
}

async function montar<T>(componente: new () => T, desktop: DesktopFalso, parametros: Record<string, string> = {}, entradas: Record<string, unknown> = {}): Promise<ComponenteMontado<T>> {
  TestBed.configureTestingModule({ imports: [componente] });
  await TestBed.compileComponents();
  const tela = await montarComponente(componente, {
    usuario: TipoUsuarioEnum.DESENVOLVEDOR,
    entradas,
    provedores: [
      { provide: MensagemDiretaEventosService, useClass: EventosFalso },
      { provide: ProjectDesktopService, useValue: desktop },
      { provide: ActivatedRoute, useValue: { snapshot: { queryParamMap: convertToParamMap(parametros) } } },
    ],
  });
  return tela;
}

describe('ChatPopupPage (janela de chat do Desktop)', () => {
  let desktop: DesktopFalso;
  beforeEach(() => {
    desktop = new DesktopFalso();
  });

  const responderListas = (tela: ComponenteMontado<unknown>) => {
    responderSucesso(esperarRequisicao(tela.http, 'GET', '/mensagem-direta/conversas'), { conversas: [conversaDaLista(9, 'Camila Duarte')] });
  };

  it('abre no chat com a lista quando não havia nada copiado', async () => {
    const tela = await montar(ChatPopupPage, desktop);
    responderListas(tela);
    await tela.atualizar();
    expect(tela.elemento.querySelector('.popup-direto--janela')).not.toBeNull();
    expect(tela.elemento.textContent).toContain('Camila Duarte');
    expect(tela.elemento.textContent).toContain('Gestores e administradores podem ler as conversas entre desenvolvedores.');
    expect(TestBed.inject(MensagemDiretaEstadoService).visao()).toBe('LISTA');
  });

  it('com código copiado vai direto a escolher a pessoa e, escolhida, o código entra no campo como bloco (sem enviar)', async () => {
    desktop.rascunho = CODIGO;
    const tela = await montar(ChatPopupPage, desktop);
    responderListas(tela);
    responderSucesso(esperarRequisicao(tela.http, 'GET', '/mensagem-direta/pessoas'), { pessoas: [{ usuarioId: 9, usuarioNome: 'Camila Duarte', tipo: TipoUsuarioEnum.DESENVOLVEDOR, online: false }] });
    await tela.atualizar();
    expect(tela.elemento.textContent).toContain('Nova conversa');

    tela.elemento.querySelector<HTMLButtonElement>('.nova-direta__linha')!.click();
    await tela.atualizar();
    responderSucesso(esperarRequisicao(tela.http, 'GET', '/mensagem-direta/conversa/9'), { mensagens: [], proximoCursor: null, lidaAteDate: null });
    await tela.atualizar();
    await esperarCampoDeMensagem(tela.fixture, () => tela.atualizar());
    // O código entra como bloco assim que o editor monta (o editor carrega por `import()`).
    await vi.waitFor(() => expect(textoDaMensagem(tela.fixture)).toBe('```\n' + CODIGO + '\n```'), { timeout: 5000 });
    expect(TestBed.inject(MensagemDiretaEstadoService).rascunhoDoDesktop()).toBeNull();
    tela.http.expectNone((requisicao) => requisicao.method === 'POST');
  });

  it('texto comum copiado não vira rascunho: a janela abre na lista', async () => {
    desktop.rascunho = 'uma senha ou uma frase qualquer';
    const tela = await montar(ChatPopupPage, desktop);
    responderListas(tela);
    await tela.atualizar();
    expect(TestBed.inject(MensagemDiretaEstadoService).visao()).toBe('LISTA');
    expect(TestBed.inject(MensagemDiretaEstadoService).rascunhoDoDesktop()).toBeNull();
  });

  it('o clique numa notificação abre direto a conversa pedida (parâmetros da janela)', async () => {
    const tela = await montar(ChatPopupPage, desktop, { usuarioId: '9', nome: 'Camila Duarte' });
    responderListas(tela);
    responderSucesso(esperarRequisicao(tela.http, 'GET', '/mensagem-direta/conversa/9'), { mensagens: [], proximoCursor: null, lidaAteDate: null });
    await tela.atualizar();
    const estado = TestBed.inject(MensagemDiretaEstadoService);
    expect(estado.visao()).toBe('CONVERSA');
    expect(estado.conversaAberta()?.usuarioNome).toBe('Camila Duarte');
  });

  it('uma notificação com a janela já aberta troca de conversa; parâmetro inválido cai na lista', async () => {
    const tela = await montar(ChatPopupPage, desktop, { usuarioId: 'abc', nome: 'x' });
    responderListas(tela);
    await tela.atualizar();
    expect(TestBed.inject(MensagemDiretaEstadoService).visao()).toBe('LISTA');

    desktop.conversa?.(9, 'Camila Duarte');
    await tela.atualizar();
    responderSucesso(esperarRequisicao(tela.http, 'GET', '/mensagem-direta/conversa/9'), { mensagens: [], proximoCursor: null, lidaAteDate: null });
    await tela.atualizar();
    expect(TestBed.inject(MensagemDiretaEstadoService).conversaAberta()?.usuarioId).toBe(9);
  });

  it('ocultar o chat fecha a janela do Desktop', async () => {
    const tela = await montar(ChatPopupPage, desktop);
    responderListas(tela);
    await tela.atualizar();
    expect(desktop.fechamentos).toBe(0);
    tela.elemento.querySelector<HTMLButtonElement>('button[aria-label="Ocultar o chat"]')!.click();
    await tela.atualizar();
    expect(desktop.fechamentos).toBe(1);
  });

  it('Esc fecha a janela mesmo com o foco no corpo da página (lista e nova conversa)', async () => {
    const tela = await montar(ChatPopupPage, desktop);
    responderListas(tela);
    await tela.atualizar();
    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
    await tela.atualizar();
    expect(desktop.fechamentos).toBe(1);
  });

  it('diz ao Desktop qual conversa está à vista, e nenhuma ao voltar para a lista', async () => {
    const tela = await montar(ChatPopupPage, desktop, { usuarioId: '9', nome: 'Camila Duarte' });
    responderListas(tela);
    await tela.atualizar();
    expect(desktop.conversasInformadas.at(-1)).toBe(9);
    TestBed.inject(MensagemDiretaEstadoService).voltarParaALista();
    await tela.atualizar();
    expect(desktop.conversasInformadas.at(-1)).toBeNull();
  });

  it('um código copiado e descartado (Esc) não cai numa conversa aberta depois', async () => {
    const estado = TestBed.inject(MensagemDiretaEstadoService);
    estado.abrirPeloDesktop(CODIGO);
    expect(estado.rascunhoDoDesktop()).toBe(CODIGO);
    estado.fechar();
    expect(estado.rascunhoDoDesktop()).toBeNull();
    estado.abrirPeloDesktop(CODIGO);
    await estado.abrirConversaDoAviso(9, 'Camila Duarte', 'aviso-1');
    expect(estado.rascunhoDoDesktop()).toBeNull();
  });

  it('link interno dentro da janela abre no Project, não nela; link externo segue o caminho normal', async () => {
    const tela = await montar(ChatPopupPage, desktop);
    responderListas(tela);
    await tela.atualizar();
    const interno = document.createElement('a');
    interno.setAttribute('href', '/atividade/57');
    tela.elemento.appendChild(interno);
    const clique = new MouseEvent('click', { bubbles: true, cancelable: true });
    interno.dispatchEvent(clique);
    expect(clique.defaultPrevented).toBe(true);
    expect(desktop.abertosNoProject).toEqual(['/atividade/57']);

    const externo = document.createElement('a');
    externo.setAttribute('href', 'https://exemplo.com/');
    tela.elemento.appendChild(externo);
    const cliqueExterno = new MouseEvent('click', { bubbles: true, cancelable: true });
    externo.addEventListener('click', (evento) => evento.preventDefault());
    externo.dispatchEvent(cliqueExterno);
    expect(desktop.abertosNoProject).toEqual(['/atividade/57']);
  });

  it('a janela não avisa de mensagem nova (ela é o chat) e libera o aviso ao sair', async () => {
    const tela = await montar(ChatPopupPage, desktop);
    responderListas(tela);
    await tela.atualizar();
    const avisos = TestBed.inject(MensagemDiretaAvisosService);
    expect(avisos.suprimido()).toBe(true);
    tela.fixture.destroy();
    expect(avisos.suprimido()).toBe(false);
  });
});

describe('MensagemDiretaPopupComponent com o Project Desktop (atalho global)', () => {
  let desktop: DesktopFalso;
  beforeEach(() => {
    desktop = new DesktopFalso();
  });

  it('o atalho com o Project à vista abre o popup interno; com código copiado, na nova conversa', async () => {
    const tela = await montar(MensagemDiretaPopupComponent, desktop);
    responderSucesso(esperarRequisicao(tela.http, 'GET', '/mensagem-direta/conversas'), { conversas: [] });
    await tela.atualizar();
    const estado = TestBed.inject(MensagemDiretaEstadoService);
    expect(estado.aberto()).toBe(false);

    desktop.chat?.(null);
    await tela.atualizar();
    expect(estado.aberto()).toBe(true);
    expect(estado.visao()).toBe('LISTA');

    desktop.chat?.(CODIGO);
    await tela.atualizar();
    responderSucesso(esperarRequisicao(tela.http, 'GET', '/mensagem-direta/pessoas'), { pessoas: [] });
    await tela.atualizar();
    expect(estado.visao()).toBe('NOVA');
    expect(estado.rascunhoDoDesktop()).toBe(CODIGO);
  });

  it('a rota pedida pela janela de chat é aberta no Project', async () => {
    const tela = await montar(MensagemDiretaPopupComponent, desktop);
    responderSucesso(esperarRequisicao(tela.http, 'GET', '/mensagem-direta/conversas'), { conversas: [] });
    await tela.atualizar();
    const navegar = vi.spyOn(TestBed.inject(Router), 'navigateByUrl').mockResolvedValue(true);
    desktop.navegacao?.('/atividade/57');
    expect(navegar).toHaveBeenCalledWith('/atividade/57');
  });

  it('dentro da janela de chat o popup não atende o atalho nem a navegação (quem atende é o Project)', async () => {
    const tela = await montar(MensagemDiretaPopupComponent, desktop, {}, { emJanela: true });
    responderSucesso(esperarRequisicao(tela.http, 'GET', '/mensagem-direta/conversas'), { conversas: [] });
    await tela.atualizar();
    expect(desktop.chat).toBeNull();
    expect(desktop.navegacao).toBeNull();
  });

  it('ao sair da página o popup solta o atalho e a navegação', async () => {
    const tela = await montar(MensagemDiretaPopupComponent, desktop);
    responderSucesso(esperarRequisicao(tela.http, 'GET', '/mensagem-direta/conversas'), { conversas: [] });
    await tela.atualizar();
    expect(desktop.chat).not.toBeNull();
    tela.fixture.destroy();
    expect(desktop.chat).toBeNull();
    expect(desktop.navegacao).toBeNull();
  });
});
