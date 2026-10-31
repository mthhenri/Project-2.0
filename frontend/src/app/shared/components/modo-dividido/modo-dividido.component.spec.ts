import { describe, it, expect } from 'vitest';
import { Component } from '@angular/core';
import { montarComponente } from '../../../../testes/montar-componente';
import { ModoDivididoComponent } from './modo-dividido.component';

@Component({
  standalone: true,
  imports: [ModoDivididoComponent],
  template: `
    <app-modo-dividido rotuloLista="Demandas" rotuloEditor="Editor de descrição">
      <ul lista><li class="item">Uma demanda</li></ul>
      <p class="conteudo">O editor</p>
    </app-modo-dividido>
  `,
})
class HospedeiraComponent {}

describe('ModoDivididoComponent', () => {
  it('põe o que vem em [lista] na coluna estreita e o resto no editor, com o nome acessível de cada lado', async () => {
    const montado = await montarComponente(HospedeiraComponent);
    const lista = montado.elemento.querySelector('.modo-dividido__lista')!;
    const editor = montado.elemento.querySelector('.modo-dividido__editor')!;

    expect(lista.getAttribute('aria-label')).toBe('Demandas');
    expect(editor.getAttribute('aria-label')).toBe('Editor de descrição');
    expect(lista.querySelector('.item')?.textContent).toBe('Uma demanda');
    expect(editor.querySelector('.conteudo')?.textContent).toBe('O editor');
    expect(lista.querySelector('.conteudo')).toBeNull();
  });

  it('sem nomes dados usa "Lista" e "Editor"', async () => {
    const montado = await montarComponente(ModoDivididoComponent);
    expect(montado.elemento.querySelector('.modo-dividido__lista')?.getAttribute('aria-label')).toBe('Lista');
    expect(montado.elemento.querySelector('.modo-dividido__editor')?.getAttribute('aria-label')).toBe('Editor');
  });
});
