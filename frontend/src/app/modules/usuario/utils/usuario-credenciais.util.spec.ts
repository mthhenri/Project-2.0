import { describe, it, expect } from 'vitest';
import { iniciaisDoNome, sugerirLogin, sugerirSenha } from './usuario-credenciais.util';

describe('sugerirLogin', () => {
  it('usa primeiro e último nome, sem acento e em minúsculas', () => {
    expect(sugerirLogin('João da Silva')).toBe('joao.silva');
    expect(sugerirLogin('  Ana   Maria  de Souza ')).toBe('ana.souza');
  });

  it('nome único vira só ele; vazio ou símbolos viram vazio', () => {
    expect(sugerirLogin('Madonna')).toBe('madonna');
    expect(sugerirLogin('')).toBe('');
    expect(sugerirLogin('   ')).toBe('');
    expect(sugerirLogin('!!! ???')).toBe('');
  });

  it('remove pontuação do meio do nome', () => {
    expect(sugerirLogin('D’Ávila Neto')).toBe('davila.neto');
  });
});

describe('sugerirSenha', () => {
  it('é Dev@ + inicial do primeiro nome + último nome + !', () => {
    expect(sugerirSenha('Matheus Caranguejo')).toBe('Dev@MCaranguejo!');
    expect(sugerirSenha('  ana   maria  de souza ')).toBe('Dev@ASouza!');
  });

  it('sem acento nem símbolo, e o último nome sempre com a inicial maiúscula', () => {
    expect(sugerirSenha('João da Conceição')).toBe('Dev@JConceicao!');
    expect(sugerirSenha('maria D’Ávila NETO')).toBe('Dev@MNeto!');
  });

  it('nome único vira Dev@Nome!; sem nome, vazia', () => {
    expect(sugerirSenha('Madonna')).toBe('Dev@Madonna!');
    expect(sugerirSenha('')).toBe('');
    expect(sugerirSenha('!!! ???')).toBe('');
  });
});

describe('iniciaisDoNome', () => {
  it('pega as duas primeiras iniciais em maiúsculas', () => {
    expect(iniciaisDoNome('maria clara souza')).toBe('MC');
    expect(iniciaisDoNome('Madonna')).toBe('M');
    expect(iniciaisDoNome('')).toBe('');
  });
});
