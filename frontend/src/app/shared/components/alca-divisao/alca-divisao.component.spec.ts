import { describe, it, expect } from 'vitest';
import { Component } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { montarComponente } from '../../../../testes/montar-componente';
import { AlcaDivisaoComponent } from './alca-divisao.component';

// A alça entre duas colunas: arrastar e as setas ajustam a largura da primeira, o duplo clique restaura, e ela fica guardada.

@Component({
  standalone: true,
  imports: [AlcaDivisaoComponent],
  template: `
    <div class="area" id="area-teste" style="display: flex; width: 1200px">
      <div class="primeira"></div>
      <app-alca-divisao chave="teste.divisao" />
      <div class="segunda"></div>
    </div>
  `,
})
class HospedeiraComponent {}

const CHAVE = 'teste.divisao';

async function montar(guardada?: string) {
  TestBed.resetTestingModule();
  const montado = await montarComponente(HospedeiraComponent, { armazenamento: guardada === undefined ? {} : { [CHAVE]: guardada } });
  const area = montado.elemento.querySelector<HTMLElement>('#area-teste')!;
  const alca = montado.elemento.querySelector<HTMLElement>('.alca-divisao')!;
  const largura = () => area.style.getPropertyValue('--largura-primeira');
  return { montado, area, alca, largura };
}

const teclar = (alca: HTMLElement, key: string) => alca.dispatchEvent(new KeyboardEvent('keydown', { key, bubbles: true, cancelable: true }));

describe('AlcaDivisaoComponent', () => {
  it('sem largura guardada, a primeira coluna começa com a largura padrão, escrita na área', async () => {
    const { largura, alca } = await montar();
    expect(largura()).toBe('496px');
    expect(alca.getAttribute('role')).toBe('separator');
    expect(alca.getAttribute('aria-valuenow')).toBe('496');
  });

  it('usa a largura guardada, nunca abaixo do mínimo', async () => {
    expect((await montar('600')).largura()).toBe('600px');
    expect((await montar('50')).largura()).toBe('352px');
  });

  it('as setas ajustam em passos de 16 px e guardam; Esc e outras teclas não fazem nada', async () => {
    const { montado, alca, largura } = await montar();
    teclar(alca, 'ArrowRight');
    expect(largura()).toBe('512px');
    teclar(alca, 'ArrowLeft');
    teclar(alca, 'ArrowLeft');
    expect(largura()).toBe('480px');
    teclar(alca, 'Escape');
    expect(largura()).toBe('480px');
    expect(localStorage.getItem(CHAVE)).toBe('480');
    await montado.atualizar();
    expect(alca.getAttribute('aria-valuenow')).toBe('480');
  });

  it('o duplo clique volta ao padrão e guarda', async () => {
    const { alca, largura } = await montar('700');
    alca.dispatchEvent(new MouseEvent('dblclick', { bubbles: true }));
    expect(largura()).toBe('496px');
    expect(localStorage.getItem(CHAVE)).toBe('496');
  });

  it('arrastar acompanha o ponteiro sem transição e só guarda ao soltar', async () => {
    const { area, alca, largura } = await montar();
    const esquerda = area.getBoundingClientRect().left;
    alca.dispatchEvent(new PointerEvent('pointerdown', { pointerId: 1, bubbles: true, cancelable: true }));
    expect(area.style.getPropertyValue('--transicao-primeira')).toBe('none');

    alca.dispatchEvent(new PointerEvent('pointermove', { pointerId: 1, clientX: esquerda + 608, bubbles: true }));
    expect(largura()).toBe('600px');
    expect(localStorage.getItem(CHAVE)).toBeNull();

    alca.dispatchEvent(new PointerEvent('pointerup', { pointerId: 1, bubbles: true }));
    expect(area.style.getPropertyValue('--transicao-primeira')).toBe('');
    expect(localStorage.getItem(CHAVE)).toBe('600');
  });

  it('mover o ponteiro sem ter pressionado não ajusta nada', async () => {
    const { area, alca, largura } = await montar();
    alca.dispatchEvent(new PointerEvent('pointermove', { pointerId: 1, clientX: area.getBoundingClientRect().left + 900, bubbles: true }));
    expect(largura()).toBe('496px');
  });
});
