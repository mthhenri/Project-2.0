import { describe, it, expect, beforeEach } from 'vitest';
import { signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { PosicaoPopupChatEnum, TipoUsuarioEnum } from '@project20/shared';
import { montarComponente, ComponenteMontado } from '../../../../../testes/montar-componente';
import { esperarRequisicao, responderSucesso } from '../../../../../testes/http-teste';
import { MensagemDiretaAvisosService } from '../../services/mensagem-direta-avisos.service';
import { MensagemDiretaEstadoService } from '../../services/mensagem-direta-estado.service';
import { MensagemDiretaEventosService } from '../../services/mensagem-direta-eventos.service';
import { MensagemDiretaPosicaoService } from '../../services/mensagem-direta-posicao.service';
import { MARGEM_DA_JANELA_PX, TAMANHO_MINIMO_DO_POPUP, TAMANHO_PADRAO_DO_POPUP, ancorarPopup, chaveDoArranjo, serializarArranjo } from '../../utils/posicao-popup.util';
import { MensagemDiretaPopupComponent } from './mensagem-direta-popup.component';

// Posição e tamanho do popup (task 221): a posição preferida da conta, o arrasto pelo cabeçalho, a alça de redimensionar, o limite pela janela e o arranjo guardado
// no navegador. O usuário autenticado de teste tem id 1.

class EventosFalso {
  readonly conectado = signal(true);
  iniciar(): void {}
  parar(): void {}
}

async function montarPopup(armazenamento: Record<string, string> = {}): Promise<ComponenteMontado<MensagemDiretaPopupComponent>> {
  TestBed.configureTestingModule({ imports: [MensagemDiretaPopupComponent] });
  await TestBed.compileComponents();
  return montarComponente(MensagemDiretaPopupComponent, {
    usuario: TipoUsuarioEnum.DESENVOLVEDOR,
    armazenamento,
    provedores: [{ provide: MensagemDiretaEventosService, useClass: EventosFalso }],
  });
}

/** Um evento de ponteiro que o jsdom entende (ele não tem `PointerEvent` em todas as versões): um `MouseEvent` com o `pointerId`. */
function ponteiro(tipo: string, alvo: Element, x: number, y: number): void {
  const evento = new MouseEvent(tipo, { bubbles: true, cancelable: true, clientX: x, clientY: y, button: 0 });
  Object.defineProperty(evento, 'pointerId', { value: 1 });
  alvo.dispatchEvent(evento);
}

describe('MensagemDiretaPopupComponent — posição e tamanho', () => {
  let tela: ComponenteMontado<MensagemDiretaPopupComponent>;
  let posicao: MensagemDiretaPosicaoService;

  const janela = () => ({ largura: window.innerWidth, altura: window.innerHeight });
  const secao = () => tela.elemento.querySelector<HTMLElement>('.popup-direto')!;
  const retangulo = () => ({
    esquerda: parseFloat(secao().style.left), topo: parseFloat(secao().style.top), largura: parseFloat(secao().style.width), altura: parseFloat(secao().style.height),
  });
  const cabecalho = () => tela.elemento.querySelector<HTMLElement>('.lista-direta__titulo')!;
  const alca = () => tela.elemento.querySelector<HTMLButtonElement>('.popup-direto__redimensionar')!;

  async function montar(opcoes: { guardado?: string; posicaoPreferida?: PosicaoPopupChatEnum } = {}) {
    tela = await montarPopup(opcoes.guardado !== undefined ? { [chaveDoArranjo(1)]: opcoes.guardado } : {});
    posicao = TestBed.inject(MensagemDiretaPosicaoService);
    const estado = TestBed.inject(MensagemDiretaEstadoService);
    responderSucesso(esperarRequisicao(tela.http, 'GET', '/mensagem-direta/conversas'), { conversas: [] });
    if (opcoes.posicaoPreferida) {
      TestBed.inject(MensagemDiretaAvisosService).preferencia.update((atual) => ({ ...atual, posicaoPopup: opcoes.posicaoPreferida! }));
    }
    estado.abrir();
    await tela.atualizar();
  }

  beforeEach(() => localStorage.clear());

  it('sem arranjo nem preferência, o popup fica no canto inferior direito, 392×640 (o de sempre), dentro da janela', async () => {
    await montar();
    expect(retangulo()).toEqual(ancorarPopup(PosicaoPopupChatEnum.CANTO_INFERIOR_DIREITO, TAMANHO_PADRAO_DO_POPUP, janela()));
    expect(retangulo().largura).toBe(Math.min(TAMANHO_PADRAO_DO_POPUP.largura, janela().largura - 2 * MARGEM_DA_JANELA_PX));
  });

  it('a posição preferida da conta leva o popup para o canto escolhido', async () => {
    await montar({ posicaoPreferida: PosicaoPopupChatEnum.CANTO_SUPERIOR_ESQUERDO });
    expect(retangulo()).toEqual(ancorarPopup(PosicaoPopupChatEnum.CANTO_SUPERIOR_ESQUERDO, TAMANHO_PADRAO_DO_POPUP, janela()));
  });

  it('arrastar pelo cabeçalho move o popup, guarda o arranjo por usuário e o relê ao montar de novo', async () => {
    await montar();
    const antes = retangulo();
    ponteiro('pointerdown', cabecalho(), 500, 100);
    ponteiro('pointermove', secao(), 440, 60);
    ponteiro('pointerup', secao(), 440, 60);
    await tela.atualizar();

    expect(retangulo()).toMatchObject({ esquerda: antes.esquerda - 60, topo: Math.max(MARGEM_DA_JANELA_PX, antes.topo - 40) });
    const guardado = JSON.parse(localStorage.getItem(chaveDoArranjo(1))!);
    expect(guardado).toMatchObject({ esquerda: retangulo().esquerda, topo: retangulo().topo });

    const arranjado = retangulo();
    TestBed.resetTestingModule();
    await montar({ guardado: serializarArranjo(arranjado) });
    expect(retangulo()).toEqual(arranjado);
  });

  it('o arrasto nunca leva o popup para fora da janela', async () => {
    await montar();
    ponteiro('pointerdown', cabecalho(), 500, 100);
    ponteiro('pointermove', secao(), -9000, -9000);
    ponteiro('pointerup', secao(), -9000, -9000);
    await tela.atualizar();
    expect(retangulo()).toMatchObject({ esquerda: MARGEM_DA_JANELA_PX, topo: MARGEM_DA_JANELA_PX });
  });

  it('um botão do cabeçalho não inicia o arrasto, e um clique no cabeçalho sem mexer não grava nada', async () => {
    await montar();
    const botao = tela.elemento.querySelector<HTMLButtonElement>('.lista-direta__cabecalho button')!;
    ponteiro('pointerdown', botao, 500, 100);
    ponteiro('pointermove', secao(), 300, 300);
    ponteiro('pointerup', secao(), 300, 300);
    expect(posicao.arranjo()).toBeNull();

    ponteiro('pointerdown', cabecalho(), 500, 100);
    ponteiro('pointerup', secao(), 500, 100);
    expect(posicao.arranjo()).toBeNull();
    expect(localStorage.getItem(chaveDoArranjo(1))).toBeNull();
  });

  it('um clique no cabeçalho, sem mexer, preserva o arranjo que já existia', async () => {
    await montar({ guardado: serializarArranjo({ esquerda: 120, topo: 80, largura: 400, altura: 500 }) });
    ponteiro('pointerdown', cabecalho(), 500, 100);
    ponteiro('pointerup', secao(), 500, 100);
    expect(posicao.arranjo()).toEqual({ esquerda: 120, topo: 80, largura: 400, altura: 500 });
  });

  it('a alça fica no canto oposto ao da âncora e redimensiona, com o mínimo de 360×480', async () => {
    await montar();
    expect(alca().getAttribute('data-canto')).toBe('SUPERIOR_ESQUERDO');
    const antes = retangulo();
    ponteiro('pointerdown', alca(), 100, 100);
    ponteiro('pointermove', secao(), 60, 70);
    ponteiro('pointerup', secao(), 60, 70);
    await tela.atualizar();
    expect(retangulo().largura).toBe(antes.largura + 40);
    expect(retangulo().altura).toBe(antes.altura + 30);
    expect(retangulo().esquerda + retangulo().largura).toBe(antes.esquerda + antes.largura);

    ponteiro('pointerdown', alca(), 100, 100);
    ponteiro('pointermove', secao(), 9000, 9000);
    ponteiro('pointerup', secao(), 9000, 9000);
    await tela.atualizar();
    expect([retangulo().largura, retangulo().altura]).toEqual([TAMANHO_MINIMO_DO_POPUP.largura, TAMANHO_MINIMO_DO_POPUP.altura]);
  });

  it('as setas na alça redimensionam (16 px; 64 px com Shift)', async () => {
    await montar();
    const antes = retangulo();
    alca().dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowLeft', bubbles: true, cancelable: true }));
    await tela.atualizar();
    expect(retangulo().largura).toBe(antes.largura + 16);
    alca().dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowUp', shiftKey: true, bubbles: true, cancelable: true }));
    await tela.atualizar();
    expect(retangulo().altura).toBe(antes.altura + 64);
  });

  it('restaurar descarta o arranjo e o registro, e volta à posição preferida', async () => {
    await montar({ posicaoPreferida: PosicaoPopupChatEnum.CENTRO });
    ponteiro('pointerdown', cabecalho(), 500, 100);
    ponteiro('pointermove', secao(), 480, 90);
    ponteiro('pointerup', secao(), 480, 90);
    expect(localStorage.getItem(chaveDoArranjo(1))).not.toBeNull();

    posicao.restaurar();
    await tela.atualizar();
    expect(localStorage.getItem(chaveDoArranjo(1))).toBeNull();
    expect(retangulo()).toEqual(ancorarPopup(PosicaoPopupChatEnum.CENTRO, TAMANHO_PADRAO_DO_POPUP, janela()));
  });

  it('um registro corrompido é ignorado, e um registro fora da janela é puxado para dentro dela', async () => {
    await montar({ guardado: 'lixo' });
    expect(posicao.arranjo()).toBeNull();

    TestBed.resetTestingModule();
    await montar({ guardado: serializarArranjo({ esquerda: 99_999, topo: 99_999, largura: 400, altura: 500 }) });
    expect(posicao.arranjo()).not.toBeNull();
    expect(retangulo().esquerda + retangulo().largura).toBeLessThanOrEqual(janela().largura - MARGEM_DA_JANELA_PX);
    expect(retangulo().topo + retangulo().altura).toBeLessThanOrEqual(janela().altura - MARGEM_DA_JANELA_PX);
  });

  it('na janela do Desktop o popup não tem posição própria, alça nem arrasto', async () => {
    TestBed.configureTestingModule({ imports: [MensagemDiretaPopupComponent] });
    await TestBed.compileComponents();
    tela = await montarComponente(MensagemDiretaPopupComponent, {
      usuario: TipoUsuarioEnum.DESENVOLVEDOR,
      provedores: [{ provide: MensagemDiretaEventosService, useClass: EventosFalso }],
    });
    tela.fixture.componentRef.setInput('emJanela', true);
    responderSucesso(esperarRequisicao(tela.http, 'GET', '/mensagem-direta/conversas'), { conversas: [] });
    TestBed.inject(MensagemDiretaEstadoService).abrir();
    await tela.atualizar();

    expect(secao().style.left).toBe('');
    expect(alca()).toBeNull();
    ponteiro('pointerdown', cabecalho(), 500, 100);
    ponteiro('pointermove', secao(), 100, 100);
    ponteiro('pointerup', secao(), 100, 100);
    expect(TestBed.inject(MensagemDiretaPosicaoService).arranjo()).toBeNull();
  });
});
