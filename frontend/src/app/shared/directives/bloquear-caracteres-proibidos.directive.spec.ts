import { describe, it, expect } from 'vitest';
import { Component } from '@angular/core';
import { FormControl, ReactiveFormsModule } from '@angular/forms';
import { CARACTERES_PROIBIDOS, REGEX_SEM_CARACTERES_PROIBIDOS, removerCaracteresProibidos } from '@project20/shared';
import { montarComponente } from '../../../testes/montar-componente';
import { BloquearCaracteresProibidosDirective } from './bloquear-caracteres-proibidos.directive';

@Component({
  selector: 'app-host-bloqueio',
  imports: [ReactiveFormsModule, BloquearCaracteresProibidosDirective],
  template: `
    <input aria-label="com-controle" appBloquearCaracteresProibidos [formControl]="controle" />
    <textarea aria-label="sem-controle" appBloquearCaracteresProibidos></textarea>
  `,
})
class HostBloqueioComponent {
  readonly controle = new FormControl('', { nonNullable: true });
}

function digitar(campo: HTMLInputElement | HTMLTextAreaElement, texto: string, cursor = texto.length): void {
  campo.value = texto;
  campo.setSelectionRange(cursor, cursor);
  campo.dispatchEvent(new Event('input'));
}

describe('BloquearCaracteresProibidosDirective', () => {
  it('remove os caracteres proibidos digitados e reescreve o valor no FormControl', async () => {
    const { elemento, componente, atualizar } = await montarComponente(HostBloqueioComponent);
    const campo = elemento.querySelector<HTMLInputElement>('[aria-label="com-controle"]')!;

    digitar(campo, `Nome 'com" aspas`);
    await atualizar();

    expect(campo.value).toBe('Nome com aspas');
    expect(componente.controle.value).toBe('Nome com aspas');
  });

  it('em campo sem Reactive Forms, limpa o valor do próprio elemento', async () => {
    const { elemento } = await montarComponente(HostBloqueioComponent);
    const campo = elemento.querySelector<HTMLTextAreaElement>('[aria-label="sem-controle"]')!;

    digitar(campo, 'a~b^c');

    expect(campo.value).toBe('abc');
  });

  it('texto sem caractere proibido não é tocado (o valor do controle segue o do campo)', async () => {
    const { elemento, componente } = await montarComponente(HostBloqueioComponent);
    const campo = elemento.querySelector<HTMLInputElement>('[aria-label="com-controle"]')!;

    digitar(campo, 'Texto normal, com acentuação: ação!');

    expect(campo.value).toBe('Texto normal, com acentuação: ação!');
    expect(componente.controle.value).toBe('Texto normal, com acentuação: ação!');
  });

  it('mantém o cursor no mesmo ponto lógico, descontando os removidos antes dele', async () => {
    const { elemento, atualizar } = await montarComponente(HostBloqueioComponent);
    const campo = elemento.querySelector<HTMLInputElement>('[aria-label="com-controle"]')!;

    // "ab'cd" com o cursor logo após o apóstrofo (posição 3): vira "abcd" com o cursor em 2.
    digitar(campo, "ab'cd", 3);
    await atualizar();

    expect(campo.value).toBe('abcd');
    expect(campo.selectionStart).toBe(2);
    expect(campo.selectionEnd).toBe(2);
  });

  it('aplica a mesma regra do validador do shared, caractere a caractere e em texto misto', async () => {
    const { elemento, componente } = await montarComponente(HostBloqueioComponent);
    const campo = elemento.querySelector<HTMLInputElement>('[aria-label="com-controle"]')!;
    const casos = [
      ...Array.from(CARACTERES_PROIBIDOS).map((caractere) => `x${caractere}y`),
      `a'b"c\`d~e^f\\g´h`,
      'texto normal',
      `${CARACTERES_PROIBIDOS}Nome${CARACTERES_PROIBIDOS}`,
      '',
    ];

    for (const caso of casos) {
      digitar(campo, caso);
      const esperado = removerCaracteresProibidos(caso);
      expect(campo.value, caso).toBe(esperado);
      expect(REGEX_SEM_CARACTERES_PROIBIDOS.test(campo.value), caso).toBe(true);
      if (esperado !== caso) expect(componente.controle.value, caso).toBe(esperado);
    }
  });
});
