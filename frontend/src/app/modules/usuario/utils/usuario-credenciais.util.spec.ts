import { describe, it, expect } from 'vitest';
import { gerarSenha, iniciaisDoNome, sugerirLogin, TAMANHO_SENHA_GERADA } from './usuario-credenciais.util';

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

describe('gerarSenha', () => {
  it('tem o tamanho certo, ao menos um símbolo e um dígito, e nenhum caractere ambíguo', () => {
    for (let tentativa = 0; tentativa < 50; tentativa++) {
      const senha = gerarSenha();
      expect(senha).toHaveLength(TAMANHO_SENHA_GERADA);
      expect(senha).toMatch(/[@#$%&*!?]/);
      expect(senha).toMatch(/[2-9]/);
      expect(senha).not.toMatch(/[0O1lI]/);
    }
  });

  it('gera senhas diferentes a cada chamada', () => {
    expect(new Set(Array.from({ length: 20 }, () => gerarSenha())).size).toBeGreaterThan(18);
  });
});

describe('iniciaisDoNome', () => {
  it('pega as duas primeiras iniciais em maiúsculas', () => {
    expect(iniciaisDoNome('maria clara souza')).toBe('MC');
    expect(iniciaisDoNome('Madonna')).toBe('M');
    expect(iniciaisDoNome('')).toBe('');
  });
});
