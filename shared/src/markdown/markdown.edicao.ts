/**
 * Edições puras de texto Markdown, usadas pelo editor: cada função recebe o texto e a seleção e devolve
 * o texto novo com a nova seleção. Não tocam no DOM, por isso são testáveis.
 */

export interface EdicaoMarkdown {
  texto: string;
  /** Início da seleção depois da edição. */
  inicio: number;
  /** Fim da seleção depois da edição (igual ao início quando é só o cursor). */
  fim: number;
}

export type PrefixoDeLinha = 'titulo' | 'lista' | 'numerada' | 'tarefa' | 'citacao';

const PADROES_DE_PREFIXO: Record<PrefixoDeLinha, RegExp> = {
  titulo: /^#{1,4}[ \t]+/,
  lista: /^[ \t]*[-*+][ \t]+(?!\[[ xX]\])/,
  numerada: /^[ \t]*\d{1,9}[.)][ \t]+/,
  tarefa: /^[ \t]*[-*+][ \t]+\[[ xX]\][ \t]+/,
  citacao: /^>[ \t]?/,
};

/** Qualquer prefixo de bloco que a barra de ferramentas sabe aplicar, para trocar um pelo outro. */
const QUALQUER_PREFIXO = /^(?:#{1,4}[ \t]+|[ \t]*[-*+][ \t]+(?:\[[ xX]\][ \t]+)?|[ \t]*\d{1,9}[.)][ \t]+|>[ \t]?)/;

/**
 * Negrito/itálico/tachado/código: envolve a seleção com a marca, ou tira a marca se ela já envolve a
 * seleção (por fora ou por dentro). Sem seleção, insere o par de marcas e deixa o cursor entre elas.
 */
export function alternarEnvolvimento(texto: string, inicio: number, fim: number, marca: string): EdicaoMarkdown {
  const tamanho = marca.length;
  const selecionado = texto.slice(inicio, fim);
  const caractere = marca[0];

  const marcasPorFora =
    inicio >= tamanho &&
    texto.slice(inicio - tamanho, inicio) === marca &&
    texto.slice(fim, fim + tamanho) === marca &&
    texto[inicio - tamanho - 1] !== caractere &&
    texto[fim + tamanho] !== caractere;
  if (marcasPorFora) {
    return {
      texto: texto.slice(0, inicio - tamanho) + selecionado + texto.slice(fim + tamanho),
      inicio: inicio - tamanho,
      fim: fim - tamanho,
    };
  }

  const marcasPorDentro =
    selecionado.length >= tamanho * 2 && selecionado.startsWith(marca) && selecionado.endsWith(marca);
  if (marcasPorDentro) {
    const semMarcas = selecionado.slice(tamanho, selecionado.length - tamanho);
    return { texto: texto.slice(0, inicio) + semMarcas + texto.slice(fim), inicio, fim: inicio + semMarcas.length };
  }

  return {
    texto: texto.slice(0, inicio) + marca + selecionado + marca + texto.slice(fim),
    inicio: inicio + tamanho,
    fim: fim + tamanho,
  };
}

interface LinhasSelecionadas {
  primeiraLinha: number;
  ultimaLinha: number;
  linhas: string[];
  inicioDoBloco: number;
  fimDoBloco: number;
}

/** Linhas tocadas pela seleção (se a seleção termina no começo de uma linha, essa linha não conta). */
function linhasDaSelecao(texto: string, inicio: number, fim: number): LinhasSelecionadas {
  const inicioDoBloco = texto.lastIndexOf('\n', inicio - 1) + 1;
  const ultimoCaractere = fim > inicio && texto[fim - 1] === '\n' ? fim - 1 : fim;
  const proximaQuebra = texto.indexOf('\n', ultimoCaractere);
  const fimDoBloco = proximaQuebra === -1 ? texto.length : proximaQuebra;
  const linhas = texto.slice(inicioDoBloco, fimDoBloco).split('\n');
  const primeiraLinha = texto.slice(0, inicioDoBloco).split('\n').length - 1;
  return { primeiraLinha, ultimaLinha: primeiraLinha + linhas.length - 1, linhas, inicioDoBloco, fimDoBloco };
}

function removerPrefixoDeBloco(linha: string): string {
  return linha.replace(QUALQUER_PREFIXO, '');
}

/**
 * Título, lista, lista numerada, tarefa e citação: liga o prefixo em todas as linhas da seleção, ou
 * desliga se todas as linhas não vazias já o têm. Trocar de tipo troca o prefixo.
 */
export function alternarPrefixo(texto: string, inicio: number, fim: number, tipo: PrefixoDeLinha): EdicaoMarkdown {
  const { linhas, inicioDoBloco, fimDoBloco } = linhasDaSelecao(texto, inicio, fim);
  const padrao = PADROES_DE_PREFIXO[tipo];
  const naoVazias = linhas.filter((linha) => linha.trim().length > 0);
  const todasJaTem = naoVazias.length > 0 && naoVazias.every((linha) => padrao.test(linha));

  let contador = 0;
  const novas = linhas.map((linha) => {
    if (linha.trim().length === 0) return linha;
    const base = todasJaTem ? linha.replace(padrao, '') : removerPrefixoDeBloco(linha);
    if (todasJaTem) return base;
    contador++;
    switch (tipo) {
      case 'titulo':
        return `## ${base}`;
      case 'lista':
        return `- ${base}`;
      case 'numerada':
        return `${contador}. ${base}`;
      case 'tarefa':
        return `- [ ] ${base}`;
      case 'citacao':
        return `> ${base}`;
    }
  });

  const novoBloco = novas.join('\n');
  return {
    texto: texto.slice(0, inicioDoBloco) + novoBloco + texto.slice(fimDoBloco),
    inicio: inicioDoBloco,
    fim: inicioDoBloco + novoBloco.length,
  };
}

/** `[texto](https://)`: usa a seleção como texto e deixa o endereço selecionado para ser digitado. */
export function inserirLink(texto: string, inicio: number, fim: number): EdicaoMarkdown {
  const rotulo = texto.slice(inicio, fim) || 'texto';
  const endereco = 'https://';
  const inserido = `[${rotulo}](${endereco})`;
  const inicioDoEndereco = inicio + rotulo.length + 3;
  return {
    texto: texto.slice(0, inicio) + inserido + texto.slice(fim),
    inicio: inicioDoEndereco,
    fim: inicioDoEndereco + endereco.length,
  };
}

/**
 * Enter no fim de um item de lista: continua a lista com o próximo marcador (ou sai dela, se o item
 * está vazio). Devolve `null` quando o cursor não está no fim de um item (vale o Enter nativo).
 */
export function continuarLista(texto: string, cursor: number): EdicaoMarkdown | null {
  const inicioDaLinha = texto.lastIndexOf('\n', cursor - 1) + 1;
  const proximaQuebra = texto.indexOf('\n', cursor);
  const fimDaLinha = proximaQuebra === -1 ? texto.length : proximaQuebra;
  if (cursor !== fimDaLinha) return null;

  const linha = texto.slice(inicioDaLinha, fimDaLinha);
  const item = /^([ \t]*)([-*+]|\d{1,9}[.)])([ \t]+)(\[[ xX]\][ \t]+)?(.*)$/.exec(linha);
  if (!item) return null;

  const [, recuo, marcador, espaco, tarefa, conteudo] = item;
  if (conteudo.trim().length === 0) {
    // Item vazio (inclusive tarefa vazia): Enter sai da lista, apagando o marcador.
    return { texto: texto.slice(0, inicioDaLinha) + texto.slice(fimDaLinha), inicio: inicioDaLinha, fim: inicioDaLinha };
  }

  const ordenado = /^\d/.test(marcador);
  const proximoMarcador = ordenado ? `${Number(marcador.slice(0, -1)) + 1}${marcador.slice(-1)}` : marcador;
  const novaLinha = `\n${recuo}${proximoMarcador}${espaco}${tarefa ? '[ ] ' : ''}`;
  const posicao = cursor + novaLinha.length;
  return { texto: texto.slice(0, cursor) + novaLinha + texto.slice(cursor), inicio: posicao, fim: posicao };
}

/**
 * Tab / Shift+Tab em itens de lista: aninha ou desaninha (2 espaços) as linhas da seleção. Devolve
 * `null` quando a primeira linha não é um item de lista (a tecla segue o caminho nativo do foco).
 */
export function ajustarRecuoDeItens(texto: string, inicio: number, fim: number, reduzir: boolean): EdicaoMarkdown | null {
  const { linhas, inicioDoBloco, fimDoBloco } = linhasDaSelecao(texto, inicio, fim);
  const ehItem = (linha: string): boolean => /^[ \t]*(?:[-*+]|\d{1,9}[.)])(?:[ \t]|$)/.test(linha);
  if (!ehItem(linhas[0])) return null;

  let deslocamentoDaPrimeira = 0;
  let deslocamentoTotal = 0;
  const novas = linhas.map((linha, indice) => {
    let nova = linha;
    if (!reduzir) {
      nova = `  ${linha}`;
    } else if (linha.startsWith('  ')) {
      nova = linha.slice(2);
    } else if (linha.startsWith('\t') || linha.startsWith(' ')) {
      nova = linha.slice(1);
    }
    const delta = nova.length - linha.length;
    if (indice === 0) deslocamentoDaPrimeira = delta;
    deslocamentoTotal += delta;
    return nova;
  });

  return {
    texto: texto.slice(0, inicioDoBloco) + novas.join('\n') + texto.slice(fimDoBloco),
    inicio: Math.max(inicioDoBloco, inicio + deslocamentoDaPrimeira),
    fim: Math.max(inicioDoBloco, fim + deslocamentoTotal),
  };
}
