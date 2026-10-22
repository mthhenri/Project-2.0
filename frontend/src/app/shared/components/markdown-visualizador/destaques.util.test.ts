import { describe, expect, it } from 'vitest';
import { partirPorDestaques } from './destaques.util';

describe('partirPorDestaques', () => {
  it('sem destaques devolve o texto inteiro', () => {
    expect(partirPorDestaques('oi', [])).toEqual([{ valor: 'oi', destaque: false }]);
  });

  it('marca o nome inteiro de uma menção e deixa o resto', () => {
    expect(partirPorDestaques('@Gabriel Zimmermann teste', ['@Gabriel Zimmermann'])).toEqual([
      { valor: '@Gabriel Zimmermann', destaque: true },
      { valor: ' teste', destaque: false },
    ]);
  });

  it('marca referência no meio da frase', () => {
    expect(partirPorDestaques('cuidando do #Relatório financeiro automático', ['#Relatório financeiro automático'])).toEqual([
      { valor: 'cuidando do ', destaque: false },
      { valor: '#Relatório financeiro automático', destaque: true },
    ]);
  });

  it('não marca quando o nome continua em letra ou vem colado em palavra', () => {
    expect(partirPorDestaques('@Camilas e a@Camila', ['@Camila'])).toEqual([{ valor: '@Camilas e a@Camila', destaque: false }]);
  });

  it('o nome mais longo vence', () => {
    expect(partirPorDestaques('#Filtro novo', ['#Filtro', '#Filtro novo'])).toEqual([{ valor: '#Filtro novo', destaque: true }]);
  });
});
