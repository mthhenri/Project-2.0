import { describe, expect, it, vi } from 'vitest';
import { TipoUsuarioEnum } from '@project20/shared';
import { montarComponente } from '../../../../../testes/montar-componente';
import { DocumentacaoPropostaComponent } from './documentacao-proposta.component';

// O cartão da proposta da IA (task 260): diff do trecho, aceitar, descartar, pedir de novo, e os estados pedindo, erro e expirada.

async function montar(entradas: Record<string, unknown>) {
  return montarComponente(DocumentacaoPropostaComponent, { usuario: TipoUsuarioEnum.GESTOR, entradas });
}

const botao = (montado: Awaited<ReturnType<typeof montar>>, rotulo: string) =>
  Array.from(montado.elemento.querySelectorAll<HTMLButtonElement>('button')).find((item) => item.textContent?.includes(rotulo));

describe('DocumentacaoPropostaComponent', () => {
  it('pronta: mostra o diff por palavra do bloco e oferece Aceitar, Descartar e Pedir de novo', async () => {
    const montado = await montar({ estado: 'PRONTA', bloco: 'O sistema deve exportar o relatório.', blocoNovo: 'O sistema deve gerar o relatório.' });
    expect(montado.elemento.textContent).toContain('Proposta da IA');
    expect(montado.elemento.textContent).toContain('só o trecho marcado');
    expect(montado.elemento.querySelector('del')?.textContent).toContain('exportar');
    expect(montado.elemento.querySelector('ins')?.textContent).toContain('gerar');

    const aceitar = vi.fn();
    const descartar = vi.fn();
    const pedirDeNovo = vi.fn();
    montado.componente.aceitar.subscribe(aceitar);
    montado.componente.descartar.subscribe(descartar);
    montado.componente.pedirDeNovo.subscribe(pedirDeNovo);
    botao(montado, 'Aceitar')!.click();
    botao(montado, 'Descartar')!.click();
    botao(montado, 'Pedir de novo')!.click();
    expect(aceitar).toHaveBeenCalledTimes(1);
    expect(descartar).toHaveBeenCalledTimes(1);
    expect(pedirDeNovo).toHaveBeenCalledTimes(1);
  });

  it('pedindo: carregamento discreto, sem botões de decisão', async () => {
    const montado = await montar({ estado: 'PEDINDO', bloco: 'a' });
    expect(montado.elemento.querySelector('[aria-busy="true"]')).not.toBeNull();
    expect(montado.elemento.textContent).toContain('A IA está alterando o trecho');
    expect(botao(montado, 'Aceitar')).toBeUndefined();
  });

  it('erro: mostra a mensagem e oferece "Tentar de novo" e Descartar', async () => {
    const montado = await montar({ estado: 'ERRO', bloco: 'a', mensagemDeErro: 'A IA devolveu um texto que muda além da seleção.' });
    expect(montado.elemento.querySelector('[role="alert"]')?.textContent).toContain('muda além da seleção');
    const tentar = vi.fn();
    montado.componente.tentarDeNovo.subscribe(tentar);
    botao(montado, 'Tentar de novo')!.click();
    expect(tentar).toHaveBeenCalledTimes(1);
    expect(botao(montado, 'Descartar')).toBeDefined();
    expect(botao(montado, 'Aceitar')).toBeUndefined();
  });

  it('expirada: avisa que o texto mudou e só deixa descartar', async () => {
    const montado = await montar({ estado: 'EXPIRADA', bloco: 'a', blocoNovo: 'b' });
    expect(montado.elemento.textContent).toContain('esta proposta expirou');
    expect(botao(montado, 'Aceitar')).toBeUndefined();
    expect(botao(montado, 'Descartar')).toBeDefined();
  });
});
