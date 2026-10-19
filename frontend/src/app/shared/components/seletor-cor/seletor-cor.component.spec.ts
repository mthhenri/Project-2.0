import { Component } from '@angular/core';
import { FormControl, ReactiveFormsModule } from '@angular/forms';
import { describe, it, expect } from 'vitest';
import { montarComponente, ComponenteMontado } from '../../../../testes/montar-componente';
import { CORES_PREDEFINIDAS, SeletorCorComponent } from './seletor-cor.component';

// Seletor de cor: ControlValueAccessor sobre um FormControl interno. Paleta de 15 cores; o modo compacto esconde a roda e o campo hex
// atrás de "Outra cor…" (a menos que a cor atual esteja fora da paleta).

@Component({
  standalone: true,
  imports: [ReactiveFormsModule, SeletorCorComponent],
  template: `<app-seletor-cor [formControl]="controle" [compacto]="compacto" />`,
})
class AnfitriaoComponent {
  controle = new FormControl<string | null>('#22c55e');
  compacto = true;
}

type Montado = ComponenteMontado<AnfitriaoComponent>;

const amostra = (montado: Montado, cor: string) =>
  montado.elemento.querySelector<HTMLButtonElement>(`button[aria-label="Selecionar cor ${cor}"]`)!;
const campoHex = (montado: Montado) => montado.elemento.querySelector<HTMLInputElement>('input[placeholder="#3b82f6"]');
const botaoOutraCor = (montado: Montado) =>
  Array.from(montado.elemento.querySelectorAll<HTMLButtonElement>('button')).find((candidato) => /Outra cor|Menos opções/.test(candidato.textContent ?? ''));

describe('SeletorCorComponent', () => {
  it('mostra uma amostra para cada cor da paleta e marca a que o formulário trouxe', async () => {
    const montado = await montarComponente(AnfitriaoComponent);
    expect(montado.elemento.querySelectorAll('button[aria-label^="Selecionar cor"]')).toHaveLength(CORES_PREDEFINIDAS.length);
    expect(amostra(montado, '#22c55e').className).toContain('seletor-cor__amostra--ativa');
    expect(amostra(montado, '#ef4444').className).not.toContain('seletor-cor__amostra--ativa');
  });

  it('clicar numa amostra grava a cor no formulário e a marca como ativa', async () => {
    const montado = await montarComponente(AnfitriaoComponent);
    amostra(montado, '#ec4899').click();
    await montado.atualizar();

    expect(montado.componente.controle.value).toBe('#ec4899');
    expect(amostra(montado, '#ec4899').className).toContain('seletor-cor__amostra--ativa');
    expect(amostra(montado, '#22c55e').className).not.toContain('seletor-cor__amostra--ativa');
    expect(montado.componente.controle.touched).toBe(true);
  });

  it('valor escrito pelo formulário (setValue) troca a amostra ativa sem marcar o controle como alterado', async () => {
    const montado = await montarComponente(AnfitriaoComponent);
    montado.componente.controle.setValue('#3B82F6');
    await montado.atualizar();

    expect(amostra(montado, '#3b82f6').className).toContain('seletor-cor__amostra--ativa');
    expect(montado.componente.controle.dirty).toBe(false);
  });

  it('valor nulo cai no azul padrão', async () => {
    const montado = await montarComponente(AnfitriaoComponent);
    montado.componente.controle.setValue(null);
    await montado.atualizar();
    expect(amostra(montado, '#3b82f6').className).toContain('seletor-cor__amostra--ativa');
  });

  it('modo compacto esconde o campo hex até clicar em "Outra cor…" e volta com "Menos opções"', async () => {
    const montado = await montarComponente(AnfitriaoComponent);
    expect(campoHex(montado)).toBeNull();

    botaoOutraCor(montado)!.click();
    await montado.atualizar();
    expect(campoHex(montado)).not.toBeNull();
    expect(botaoOutraCor(montado)!.textContent).toContain('Menos opções');

    botaoOutraCor(montado)!.click();
    await montado.atualizar();
    expect(campoHex(montado)).toBeNull();
  });

  it('modo compacto com cor fora da paleta já mostra o campo hex aberto e sem o botão "Outra cor…"', async () => {
    const montado = await montarComponente(AnfitriaoComponent);
    montado.componente.controle.setValue('#123456');
    await montado.atualizar();

    expect(campoHex(montado)?.value).toBe('#123456');
    expect(botaoOutraCor(montado)).toBeUndefined();
  });

  it('modo completo (não compacto) mostra sempre o campo hex e nunca o botão "Outra cor…"', async () => {
    const montado = await montarComponente(AnfitriaoComponent);
    montado.componente.compacto = false;
    montado.fixture.changeDetectorRef.markForCheck();
    await montado.atualizar();

    expect(campoHex(montado)).not.toBeNull();
    expect(botaoOutraCor(montado)).toBeUndefined();
  });

  it('digitar um hex válido (com ou sem #) grava no formulário; hex incompleto é ignorado', async () => {
    const montado = await montarComponente(AnfitriaoComponent);
    montado.componente.controle.setValue('#123456');
    await montado.atualizar();
    const campo = campoHex(montado)!;

    campo.value = 'abc123';
    campo.dispatchEvent(new Event('input'));
    await montado.atualizar();
    expect(montado.componente.controle.value).toBe('#abc123');

    campo.value = '#12';
    campo.dispatchEvent(new Event('input'));
    await montado.atualizar();
    expect(montado.componente.controle.value).toBe('#abc123');
  });

  it('desabilitado, as amostras ficam inativas e o clique não altera o valor', async () => {
    const montado = await montarComponente(AnfitriaoComponent);
    montado.componente.controle.disable();
    await montado.atualizar();

    expect(amostra(montado, '#ef4444').disabled).toBe(true);
    amostra(montado, '#ef4444').click();
    expect(montado.componente.controle.value).toBe('#22c55e');
  });
});
