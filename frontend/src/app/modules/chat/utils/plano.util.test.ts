import { describe, it, expect } from 'vitest';
import { PlanoAbaEnum } from '@project20/shared';
import { LARGURA_DO_DOCUMENTO, larguraDoDocumentoPeloPonteiro, limitarLarguraDoDocumento, montarPedidoDeAlteracaoDoTrecho } from './plano.util';

describe('largura do documento do plano', () => {
  it('mantém o valor entre o mínimo e o máximo', () => {
    expect(limitarLarguraDoDocumento(50)).toBe(50);
    expect(limitarLarguraDoDocumento(5)).toBe(LARGURA_DO_DOCUMENTO.minima);
    expect(limitarLarguraDoDocumento(95)).toBe(LARGURA_DO_DOCUMENTO.maxima);
  });

  it('valor ilegível volta ao padrão', () => {
    expect(limitarLarguraDoDocumento(Number.NaN)).toBe(LARGURA_DO_DOCUMENTO.padrao);
    expect(limitarLarguraDoDocumento(Number.POSITIVE_INFINITY)).toBe(LARGURA_DO_DOCUMENTO.padrao);
  });

  it('o ponteiro no meio da área dá metade; mais à esquerda, mais documento', () => {
    expect(larguraDoDocumentoPeloPonteiro(600, 200, 800)).toBe(50);
    expect(larguraDoDocumentoPeloPonteiro(400, 200, 800)).toBe(LARGURA_DO_DOCUMENTO.maxima);
    expect(larguraDoDocumentoPeloPonteiro(900, 200, 800)).toBe(LARGURA_DO_DOCUMENTO.minima);
  });

  it('área sem largura devolve o padrão', () => {
    expect(larguraDoDocumentoPeloPonteiro(100, 0, 0)).toBe(LARGURA_DO_DOCUMENTO.padrao);
  });
});

describe('pedido de alteração de um trecho', () => {
  it('cita o trecho linha a linha e diz a aba e o que mudar', () => {
    const mensagem = montarPedidoDeAlteracaoDoTrecho({ aba: PlanoAbaEnum.DOCUMENTACAO, trecho: 'Linha 1\nLinha 2', pedido: 'explicar o porquê' });
    expect(mensagem).toContain('"Documentação"');
    expect(mensagem).toContain('(aba DOCUMENTACAO)');
    expect(mensagem).toContain('> Linha 1\n> Linha 2');
    expect(mensagem.endsWith('O que mudar: explicar o porquê')).toBe(true);
  });

  it('com seleção dentro do bloco, a seleção é o único alvo e o bloco vai como contexto', () => {
    const mensagem = montarPedidoDeAlteracaoDoTrecho({ aba: PlanoAbaEnum.DESCRICAO_TECNICA, trecho: 'um **parágrafo** formatado', selecao: 'parágrafo', pedido: 'trocar por "texto"' });
    expect(mensagem).toContain('Seleção (o único alvo da mudança):\n\n> parágrafo');
    expect(mensagem).toContain('Bloco (contexto, não muda fora da seleção):\n\n> um **parágrafo** formatado');
    expect(mensagem).toContain('devolva-o igual');
    expect(mensagem.endsWith('O que mudar: trocar por "texto"')).toBe(true);
  });

  it('seleção igual ao bloco (Markdown cru) usa a mensagem do trecho único', () => {
    const mensagem = montarPedidoDeAlteracaoDoTrecho({ aba: PlanoAbaEnum.DOCUMENTACAO, trecho: 'Linha', selecao: 'Linha', pedido: 'x' });
    expect(mensagem).not.toContain('Seleção (o único alvo');
    expect(mensagem).toContain('> Linha');
  });
});
