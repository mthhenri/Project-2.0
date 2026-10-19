import { describe, it, expect } from 'vitest';
import { TestBed } from '@angular/core/testing';
import { AtividadePrioridadeResumoDto } from '@project20/shared';
import { montarComponente } from '../../../../testes/montar-componente';
import { AtividadePrioridadeService } from '../../../core/services/atividade-prioridade.service';
import { PrioridadeSeloComponent } from './prioridade-selo.component';

// Selo da prioridade (task 143): mostra o nome; a cor vem da pré-visualização, do cache do serviço (troca do administrador vale em
// todas as telas abertas) ou, sem cache, da própria atividade.

const ALTA = { codigo: 'ALTA', descricao: 'Alta', cor: '#ff0000' };
const selo = (elemento: HTMLElement) => elemento.querySelector<HTMLElement>('.prioridade-selo')!;

describe('PrioridadeSeloComponent', () => {
  it('mostra a descrição da prioridade', async () => {
    const montado = await montarComponente(PrioridadeSeloComponent, { entradas: { prioridade: ALTA } });
    expect(montado.elemento.textContent).toContain('Alta');
  });

  it('sem cache usa a cor que veio com a atividade', async () => {
    const montado = await montarComponente(PrioridadeSeloComponent, { entradas: { prioridade: ALTA } });
    expect(montado.componente.cor()).toBe('#ff0000');
    expect(selo(montado.elemento).style.getPropertyValue('--cor-prioridade')).toBe('#ff0000');
  });

  it('a cor forçada (pré-visualização) vence a da atividade', async () => {
    const montado = await montarComponente(PrioridadeSeloComponent, { entradas: { prioridade: ALTA, corForcada: '#00ff00' } });
    expect(montado.componente.cor()).toBe('#00ff00');
  });

  it('a cor do cache do serviço vence a da atividade quando o administrador a trocou', async () => {
    const montado = await montarComponente(PrioridadeSeloComponent, { entradas: { prioridade: ALTA } });
    TestBed.inject(AtividadePrioridadeService).prioridades.set([{ ...ALTA, ordem: 1, cor: '#0000ff' } as unknown as AtividadePrioridadeResumoDto]);
    await montado.atualizar();
    expect(montado.componente.cor()).toBe('#0000ff');
  });
});
