import { describe, it, expect } from 'vitest';
import { montarComponente } from '../../../../testes/montar-componente';
import { ErrorMessageComponent } from './error-message.component';

// Mensagem de erro principal (severidade erro) e lista de erros de validação (severidade aviso).

describe('ErrorMessageComponent', () => {
  it('sem mensagem nem erros não mostra nada', async () => {
    const montado = await montarComponente(ErrorMessageComponent);
    expect(montado.elemento.querySelector('p-message')).toBeNull();
  });

  it('mostra a mensagem principal', async () => {
    const montado = await montarComponente(ErrorMessageComponent, { entradas: { mensagem: 'Falha ao salvar' } });
    expect(montado.elemento.querySelectorAll('p-message')).toHaveLength(1);
    expect(montado.elemento.textContent).toContain('Falha ao salvar');
  });

  it('mostra um aviso para cada erro da lista, além da mensagem', async () => {
    const montado = await montarComponente(ErrorMessageComponent, {
      entradas: { mensagem: 'Dados inválidos', erros: ['Nome obrigatório', 'Login já existe'] },
    });
    expect(montado.elemento.querySelectorAll('p-message')).toHaveLength(3);
    expect(montado.elemento.textContent).toContain('Nome obrigatório');
    expect(montado.elemento.textContent).toContain('Login já existe');
  });
});
