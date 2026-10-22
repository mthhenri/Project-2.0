import { describe, expect, it } from 'vitest';
import { ReferenciaMensagemDiretaEnum } from '@project20/shared';
import {
  aplicarEscolha,
  destinoDaReferencia,
  detectarGatilho,
  inserirBlocoDeCodigo,
  mencoesPresentes,
  pareceCodigo,
  referenciasPresentes,
  rotuloDaSituacao,
} from './compositor.util';

const { DEMANDA, ATIVIDADE } = ReferenciaMensagemDiretaEnum;

describe('detectarGatilho', () => {
  it('abre com @ ou # no começo do texto e depois de espaço ou quebra de linha, com o termo até o cursor', () => {
    expect(detectarGatilho('@', 1)).toEqual({ tipo: 'MENCAO', inicio: 0, termo: '' });
    expect(detectarGatilho('Valeu! Vou chamar o @Ra', 23)).toEqual({ tipo: 'MENCAO', inicio: 20, termo: 'Ra' });
    expect(detectarGatilho('veja a #filt', 12)).toEqual({ tipo: 'REFERENCIA', inicio: 7, termo: 'filt' });
    expect(detectarGatilho('linha 1\n#dem', 12)).toEqual({ tipo: 'REFERENCIA', inicio: 8, termo: 'dem' });
  });

  it('aceita espaço no meio do termo (nomes com mais de uma palavra) mas não logo depois do símbolo', () => {
    expect(detectarGatilho('oi @Camila Du', 13)).toEqual({ tipo: 'MENCAO', inicio: 3, termo: 'Camila Du' });
    expect(detectarGatilho('oi #Corrigir filtro de', 22)?.termo).toBe('Corrigir filtro de');
    expect(detectarGatilho('oi @ Camila', 11)).toBeNull();
    expect(detectarGatilho('oi @Camila ', 11)).toBeNull();
  });

  it('não abre em e-mail, no meio de palavra, depois de pontuação de frase, com o cursor antes do símbolo ou em outra linha', () => {
    expect(detectarGatilho('fale com a@b.com', 16)).toBeNull();
    expect(detectarGatilho('item#3', 6)).toBeNull();
    expect(detectarGatilho('@Camila, vamos?', 15)).toBeNull();
    expect(detectarGatilho('oi @Camila', 2)).toBeNull();
    expect(detectarGatilho('@Camila\nsegunda linha', 21)).toBeNull();
    expect(detectarGatilho('sem gatilho nenhum', 18)).toBeNull();
  });

  it('o termo passa de 40 caracteres e fecha', () => {
    expect(detectarGatilho(`@${'a'.repeat(40)}`, 41)?.termo.length).toBe(40);
    expect(detectarGatilho(`@${'a'.repeat(41)}`, 42)).toBeNull();
  });

  it('só olha até o cursor: o texto depois dele não interfere', () => {
    expect(detectarGatilho('oi @Ra e mais coisa depois', 6)).toEqual({ tipo: 'MENCAO', inicio: 3, termo: 'Ra' });
  });
});

describe('aplicarEscolha', () => {
  it('troca o gatilho pelo item com um espaço depois e põe o cursor depois dele', () => {
    const gatilho = detectarGatilho('Valeu! Vou chamar o @Ra', 23)!;
    expect(aplicarEscolha('Valeu! Vou chamar o @Ra', gatilho, 23, 'Rafael Lima')).toEqual({ texto: 'Valeu! Vou chamar o @Rafael Lima ', cursor: 33, espacoAcrescentado: true });
  });

  it('preserva o texto depois do cursor', () => {
    const texto = 'veja #fil e depois';
    const gatilho = detectarGatilho(texto, 9)!;
    // O texto depois do cursor já começa com espaço: a escolha não acrescenta outro.
    expect(aplicarEscolha(texto, gatilho, 9, 'Filtro de tags')).toEqual({ texto: 'veja #Filtro de tags e depois', cursor: 20, espacoAcrescentado: false });
  });
});

describe('mencoesPresentes e referenciasPresentes', () => {
  const pessoas = [{ usuarioId: 9, nome: 'Camila Duarte' }, { usuarioId: 4, nome: 'Ana' }];

  it('só vale a menção cujo @Nome ainda está no texto', () => {
    expect(mencoesPresentes('oi @Camila Duarte, tudo bem?', pessoas)).toEqual([9]);
    expect(mencoesPresentes('oi Camila Duarte', pessoas)).toEqual([]);
    expect(mencoesPresentes('@Ana e @Camila Duarte', pessoas).sort()).toEqual([4, 9]);
  });

  it('o nome inteiro: "@Ana" não vale dentro de "@Anabela" e a repetição conta uma vez', () => {
    expect(mencoesPresentes('oi @Anabela', pessoas)).toEqual([]);
    expect(mencoesPresentes('@Ana @Ana. e @Ana', pessoas)).toEqual([4]);
    expect(mencoesPresentes('olá @Ana.', pessoas)).toEqual([4]);
  });

  it('referências: só as que ainda estão no texto, sem repetição e sem o nome no resultado', () => {
    const escolhidas = [
      { tipo: DEMANDA, id: 212, nome: 'Corrigir filtro' },
      { tipo: ATIVIDADE, id: 57, nome: 'Filtro de tags' },
      { tipo: DEMANDA, id: 212, nome: 'Corrigir filtro' },
    ];
    expect(referenciasPresentes('veja #Corrigir filtro e #Filtro de tags', escolhidas)).toEqual([{ tipo: DEMANDA, id: 212 }, { tipo: ATIVIDADE, id: 57 }]);
    expect(referenciasPresentes('só #Filtro de tags', escolhidas)).toEqual([{ tipo: ATIVIDADE, id: 57 }]);
    expect(referenciasPresentes('apaguei tudo', escolhidas)).toEqual([]);
  });
});

describe('inserirBlocoDeCodigo', () => {
  it('sem seleção abre um bloco vazio com o cursor DENTRO', () => {
    const resultado = inserirBlocoDeCodigo('', 0, 0, '');
    expect(resultado.texto).toBe('```\n\n```');
    expect(resultado.cursor).toBe(4);
  });

  it('com seleção envolve o trecho e põe o cursor depois do bloco', () => {
    const resultado = inserirBlocoDeCodigo('veja\nconst a = 1;\nfim', 5, 17, 'const a = 1;');
    expect(resultado.texto).toBe('veja\n```\nconst a = 1;\n```\nfim');
    expect(resultado.texto.slice(0, resultado.cursor).endsWith('```')).toBe(true);
  });

  it('no meio de uma linha, a cerca ganha quebra antes e depois', () => {
    const resultado = inserirBlocoDeCodigo('antes x depois', 6, 7, 'x');
    expect(resultado.texto).toBe('antes \n```\nx\n```\n depois');
  });

  it('tira a quebra de linha sobrando do fim do conteúdo colado', () => {
    expect(inserirBlocoDeCodigo('', 0, 0, 'a();\nb();\n\n').texto).toBe('```\na();\nb();\n```');
  });
});

describe('pareceCodigo', () => {
  it('várias linhas com cara de código viram bloco', () => {
    expect(pareceCodigo('ngOnInit() {\n  this.filtro.set(this.filtroSalvo() ?? \'\');\n}')).toBe(true);
    expect(pareceCodigo('const a = 1;\nconst b = 2;\nreturn a + b;')).toBe(true);
    expect(pareceCodigo('SELECT id\nFROM usuario\nWHERE is_deleted = false')).toBe(true);
    expect(pareceCodigo('<div class="a">\n  <span>oi</span>\n</div>')).toBe(true);
  });

  it('uma linha só, prosa, lista e texto que já tem cerca não são tocados', () => {
    expect(pareceCodigo('const a = 1;')).toBe(false);
    expect(pareceCodigo('Oi Camila,\nvocê consegue olhar isso hoje?\nObrigado!')).toBe(false);
    expect(pareceCodigo('- primeiro\n- segundo\n- terceiro')).toBe(false);
    expect(pareceCodigo('```ts\nconst a = 1;\nconst b = 2;\n```')).toBe(false);
    expect(pareceCodigo('')).toBe(false);
  });
});

describe('rótulos e destino', () => {
  it('rotuloDaSituacao capitaliza o status', () => {
    expect(rotuloDaSituacao('DESENVOLVENDO')).toBe('Desenvolvendo');
    expect(rotuloDaSituacao('EM_ANALISE')).toBe('Em analise');
    expect(rotuloDaSituacao(null)).toBe('');
  });

  it('destinoDaReferencia: a atividade tem página, a demanda abre o projeto, e sem projeto não há destino', () => {
    expect(destinoDaReferencia(ATIVIDADE, 57, 5)).toEqual({ caminho: ['/atividade', '57'] });
    expect(destinoDaReferencia(DEMANDA, 212, 5)).toEqual({ caminho: ['/demanda'], parametros: { projetoId: 5 } });
    expect(destinoDaReferencia(DEMANDA, 212, null)).toBeNull();
  });
});
