import { afterEach, describe, expect, it, vi } from 'vitest';
import { TestBed } from '@angular/core/testing';
import { ProjectDesktopService } from './project-desktop.service';

// A ponte do Project Desktop (task 213): no navegador, ou num executável sem a ponte do chat, nada acontece; com ela, cada chamada vai ao Desktop.

type JanelaComPonte = { projectDesktop?: unknown };
const janela = window as unknown as JanelaComPonte;

function criar(): ProjectDesktopService {
  TestBed.resetTestingModule();
  return TestBed.inject(ProjectDesktopService);
}

describe('ProjectDesktopService', () => {
  afterEach(() => {
    delete janela.projectDesktop;
  });

  it('no navegador comum não está disponível e todas as chamadas são inofensivas', async () => {
    const servico = criar();
    expect(servico.disponivel).toBe(false);
    expect(() => servico.avisarMensagem({ usuarioId: 1, usuarioNome: 'A', texto: 'b', mencionaVoce: false, som: false })).not.toThrow();
    expect(servico.aoPedirChat(() => undefined)).toBeTypeOf('function');
    expect(await servico.pegarRascunho()).toBeNull();
    expect(await servico.situacaoDoAtalho()).toBeNull();
    servico.fecharChat();
    servico.abrirNoProject('/atividade/1');
  });

  it('um executável antigo (só com o check-in) também não conta como disponível', () => {
    janela.projectDesktop = { encerrarCheckin: vi.fn() };
    expect(criar().disponivel).toBe(false);
  });

  it('a janela oculta pelo Desktop torna a página oculta mesmo com visibilityState visible; a ponte também recebe a conversa à vista', () => {
    let ouvinte: ((estado: { oculta: boolean }) => void) | undefined;
    const informarConversa = vi.fn();
    janela.projectDesktop = { avisarMensagem: vi.fn(), informarConversa, aoMudarVisibilidade: (fn: typeof ouvinte) => ((ouvinte = fn), () => undefined) };
    const servico = criar();
    expect(servico.paginaOculta()).toBe(false);
    ouvinte!({ oculta: true });
    expect(servico.oculto()).toBe(true);
    expect(servico.paginaOculta()).toBe(true);
    ouvinte!({ oculta: false });
    expect(servico.paginaOculta()).toBe(false);
    servico.informarConversa(9);
    expect(informarConversa).toHaveBeenCalledWith(9);
  });

  it('com a ponte do chat entrega o aviso, o rascunho, a situação do atalho e os pedidos', async () => {
    const soltar = vi.fn();
    let ouvinteDoChat: ((pedido: { areaDeTransferencia: string | null }) => void) | undefined;
    const ponte = {
      avisarMensagem: vi.fn(),
      pegarRascunho: vi.fn().mockResolvedValue('const a = 1;'),
      situacaoDoAtalho: vi.fn().mockResolvedValue({ atalho: 'Alt+F1', registrado: false }),
      fecharChat: vi.fn(),
      abrirNoProject: vi.fn(),
      aoPedirChat: vi.fn((ouvinte) => {
        ouvinteDoChat = ouvinte;
        return soltar;
      }),
    };
    janela.projectDesktop = ponte;
    const servico = criar();
    expect(servico.disponivel).toBe(true);

    const aviso = { usuarioId: 9, usuarioNome: 'Camila', texto: 'Oi', mencionaVoce: true, som: true };
    servico.avisarMensagem(aviso);
    expect(ponte.avisarMensagem).toHaveBeenCalledWith(aviso);
    expect(await servico.pegarRascunho()).toBe('const a = 1;');
    expect(await servico.situacaoDoAtalho()).toEqual({ atalho: 'Alt+F1', registrado: false });
    servico.fecharChat();
    servico.abrirNoProject('/atividade/57');
    expect(ponte.fecharChat).toHaveBeenCalled();
    expect(ponte.abrirNoProject).toHaveBeenCalledWith('/atividade/57');

    const recebido = vi.fn();
    const remover = servico.aoPedirChat(recebido);
    ouvinteDoChat?.({ areaDeTransferencia: 'texto' });
    expect(recebido).toHaveBeenCalledWith('texto');
    remover();
    expect(soltar).toHaveBeenCalled();
  });

  it('falha da ponte não derruba a página', async () => {
    janela.projectDesktop = { avisarMensagem: vi.fn(), pegarRascunho: vi.fn().mockRejectedValue(new Error('x')), situacaoDoAtalho: vi.fn().mockRejectedValue(new Error('x')) };
    const servico = criar();
    expect(await servico.pegarRascunho()).toBeNull();
    expect(await servico.situacaoDoAtalho()).toBeNull();
  });
});
