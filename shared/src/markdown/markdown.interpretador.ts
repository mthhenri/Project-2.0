import type {
  MarkdownBlocoNo,
  MarkdownInlineNo,
  MarkdownItemLista,
  MarkdownListaNo,
} from './markdown.tipos';

/**
 * Interpretador de Markdown próprio, sem biblioteca. Subconjunto: títulos `#` a `####`, parágrafos,
 * **negrito**, *itálico*, ~~tachado~~, `código`, listas (com aninhamento e tarefas), citações, blocos de
 * código cercados, régua e links `http`/`https`/`mailto`.
 *
 * Decisões que importam para quem lê o resultado:
 * - **HTML embutido não existe**: `<tag>` é texto literal; entidades (`&lt;`) também não são decodificadas.
 * - **Sem imagens, sem tabelas** (viram texto).
 * - **Quebra de linha dentro do parágrafo é quebra** (como em comentário de GitHub), não espaço.
 * - **Nunca lança**: construção não terminada (`**sem fechar`, link incompleto) vira texto.
 * - **Tempo linear**: nenhuma regex com retrocesso e nenhuma busca de fechamento que reinicie a cada
 *   abertura; o aninhamento é limitado.
 */

const MAX_ANINHAMENTO_LISTA = 6;
const MAX_ANINHAMENTO_CITACAO = 6;
const MAX_ANINHAMENTO_ENFASE = 20;
const ESQUEMAS_PERMITIDOS = /^(https?:\/\/|mailto:)/i;

export function interpretarMarkdown(texto: string): MarkdownBlocoNo[] {
  if (typeof texto !== 'string' || texto.length === 0) return [];
  const linhas = texto.split(/\r\n|\r|\n/);
  return interpretarBlocos(linhas, 0);
}

// ---------------------------------------------------------------------------------------------
// Blocos
// ---------------------------------------------------------------------------------------------

function linhaEmBranco(linha: string): boolean {
  for (let i = 0; i < linha.length; i++) {
    const c = linha.charCodeAt(i);
    if (c !== 32 && c !== 9) return false;
  }
  return true;
}

function larguraDoRecuo(linha: string): { recuo: number; posicao: number } {
  let recuo = 0;
  let posicao = 0;
  while (posicao < linha.length) {
    const c = linha[posicao];
    if (c === ' ') recuo += 1;
    else if (c === '\t') recuo += 4;
    else break;
    posicao++;
  }
  return { recuo, posicao };
}

function ehEspaco(caractere: string | undefined): boolean {
  return caractere === ' ' || caractere === '\t';
}

interface Cerca {
  tamanho: number;
  linguagem: string | null;
}

function cercaDeAbertura(linha: string): Cerca | null {
  const { recuo, posicao } = larguraDoRecuo(linha);
  if (recuo > 3) return null;
  let fim = posicao;
  while (fim < linha.length && linha[fim] === '`') fim++;
  const tamanho = fim - posicao;
  if (tamanho < 3) return null;
  const informacao = linha.slice(fim).trim();
  if (informacao.includes('`')) return null;
  return { tamanho, linguagem: informacao.length > 0 ? informacao.split(/\s/)[0] : null };
}

function cercaDeFechamento(linha: string, tamanhoMinimo: number): boolean {
  const { recuo, posicao } = larguraDoRecuo(linha);
  if (recuo > 3) return false;
  let fim = posicao;
  while (fim < linha.length && linha[fim] === '`') fim++;
  return fim - posicao >= tamanhoMinimo && linhaEmBranco(linha.slice(fim));
}

function ehRegua(linha: string): boolean {
  const { recuo, posicao } = larguraDoRecuo(linha);
  if (recuo > 3) return false;
  const marca = linha[posicao];
  if (marca !== '-' && marca !== '*' && marca !== '_') return false;
  let quantidade = 0;
  for (let i = posicao; i < linha.length; i++) {
    const c = linha[i];
    if (c === marca) quantidade++;
    else if (c !== ' ' && c !== '\t') return false;
  }
  return quantidade >= 3;
}

function tituloDaLinha(linha: string): { nivel: 1 | 2 | 3 | 4; conteudo: string } | null {
  const { recuo, posicao } = larguraDoRecuo(linha);
  if (recuo > 3) return null;
  let fim = posicao;
  while (fim < linha.length && linha[fim] === '#') fim++;
  const hashes = fim - posicao;
  if (hashes < 1 || hashes > 4) return null;
  if (fim < linha.length && !ehEspaco(linha[fim])) return null;
  let conteudo = linha.slice(fim).trim();
  // `## Título ##`: remove o fechamento opcional, desde que separado por espaço.
  let corte = conteudo.length;
  while (corte > 0 && conteudo[corte - 1] === '#') corte--;
  if (corte < conteudo.length && (corte === 0 || ehEspaco(conteudo[corte - 1]))) {
    conteudo = conteudo.slice(0, corte).trim();
  }
  return { nivel: hashes as 1 | 2 | 3 | 4, conteudo };
}

function ehCitacao(linha: string): boolean {
  const { recuo, posicao } = larguraDoRecuo(linha);
  return recuo <= 3 && linha[posicao] === '>';
}

function removerMarcaDeCitacao(linha: string): string {
  const { posicao } = larguraDoRecuo(linha);
  const resto = linha.slice(posicao + 1);
  return resto.startsWith(' ') ? resto.slice(1) : resto;
}

interface Marcador {
  recuo: number;
  ordenada: boolean;
  numero: number;
  resto: string;
}

function marcadorDeLista(linha: string): Marcador | null {
  const { recuo, posicao } = larguraDoRecuo(linha);
  const c = linha[posicao];
  if (c === undefined) return null;
  if (c === '-' || c === '*' || c === '+') {
    const proximo = linha[posicao + 1];
    if (proximo !== undefined && !ehEspaco(proximo)) return null;
    return { recuo, ordenada: false, numero: 1, resto: linha.slice(posicao + 1).trim() };
  }
  if (c >= '0' && c <= '9') {
    let fim = posicao;
    while (fim < linha.length && linha[fim] >= '0' && linha[fim] <= '9') fim++;
    if (fim - posicao > 9) return null;
    const separador = linha[fim];
    if (separador !== '.' && separador !== ')') return null;
    const proximo = linha[fim + 1];
    if (proximo !== undefined && !ehEspaco(proximo)) return null;
    return {
      recuo,
      ordenada: true,
      numero: Number(linha.slice(posicao, fim)),
      resto: linha.slice(fim + 1).trim(),
    };
  }
  return null;
}

/** Linha que encerra um parágrafo: outro bloco começa. Só `1.` e marcadores de bullet interrompem. */
function interrompeParagrafo(linha: string, profundidade: number): boolean {
  if (cercaDeAbertura(linha) || tituloDaLinha(linha) || ehRegua(linha)) return true;
  if (profundidade < MAX_ANINHAMENTO_CITACAO && ehCitacao(linha)) return true;
  const marcador = marcadorDeLista(linha);
  return marcador !== null && (!marcador.ordenada || marcador.numero === 1) && marcador.resto.length > 0;
}

function interpretarBlocos(linhas: string[], profundidade: number): MarkdownBlocoNo[] {
  const blocos: MarkdownBlocoNo[] = [];
  let i = 0;

  while (i < linhas.length) {
    const linha = linhas[i];

    if (linhaEmBranco(linha)) {
      i++;
      continue;
    }

    const cerca = cercaDeAbertura(linha);
    if (cerca) {
      const conteudo: string[] = [];
      i++;
      while (i < linhas.length && !cercaDeFechamento(linhas[i], cerca.tamanho)) {
        conteudo.push(linhas[i]);
        i++;
      }
      i++; // pula a cerca de fechamento (se faltar, o código vai até o fim do texto)
      blocos.push({ tipo: 'bloco-codigo', linguagem: cerca.linguagem, valor: conteudo.join('\n') });
      continue;
    }

    const titulo = tituloDaLinha(linha);
    if (titulo) {
      blocos.push({ tipo: 'titulo', nivel: titulo.nivel, filhos: interpretarInline(titulo.conteudo) });
      i++;
      continue;
    }

    if (ehRegua(linha)) {
      blocos.push({ tipo: 'regua' });
      i++;
      continue;
    }

    if (profundidade < MAX_ANINHAMENTO_CITACAO && ehCitacao(linha)) {
      const interno: string[] = [];
      while (i < linhas.length && ehCitacao(linhas[i])) {
        interno.push(removerMarcaDeCitacao(linhas[i]));
        i++;
      }
      blocos.push({ tipo: 'citacao', filhos: interpretarBlocos(interno, profundidade + 1) });
      continue;
    }

    if (marcadorDeLista(linha)) {
      const resultado = interpretarListas(linhas, i);
      blocos.push(...resultado.listas);
      i = resultado.proximaLinha;
      continue;
    }

    // Parágrafo: linhas seguidas até uma em branco ou o início de outro bloco.
    const paragrafo: string[] = [linha.trim()];
    i++;
    while (i < linhas.length && !linhaEmBranco(linhas[i]) && !interrompeParagrafo(linhas[i], profundidade)) {
      paragrafo.push(linhas[i].trim());
      i++;
    }
    blocos.push({ tipo: 'paragrafo', filhos: interpretarInline(paragrafo.join('\n')) });
  }

  return blocos;
}

// ---------------------------------------------------------------------------------------------
// Listas
// ---------------------------------------------------------------------------------------------

interface ItemPlano {
  recuo: number;
  ordenada: boolean;
  numero: number;
  texto: string;
}

function interpretarListas(
  linhas: string[],
  inicio: number,
): { listas: MarkdownListaNo[]; proximaLinha: number } {
  const planos: ItemPlano[] = [];
  let i = inicio;

  while (i < linhas.length) {
    const linha = linhas[i];

    if (linhaEmBranco(linha)) {
      // Uma linha em branco só mantém a lista quando o próximo item vem logo em seguida.
      if (i + 1 < linhas.length && !ehRegua(linhas[i + 1]) && marcadorDeLista(linhas[i + 1])) {
        i++;
        continue;
      }
      break;
    }

    if (ehRegua(linha)) break;

    const marcador = marcadorDeLista(linha);
    if (marcador) {
      planos.push({ recuo: marcador.recuo, ordenada: marcador.ordenada, numero: marcador.numero, texto: marcador.resto });
      i++;
      continue;
    }

    if (cercaDeAbertura(linha) || tituloDaLinha(linha) || ehCitacao(linha)) break;

    // Continuação do item anterior (linha sem marcador, logo abaixo).
    planos[planos.length - 1].texto += '\n' + linha.trim();
    i++;
  }

  return { listas: montarListas(planos), proximaLinha: i };
}

function criarItem(texto: string): MarkdownItemLista {
  let tarefa: MarkdownItemLista['tarefa'] = null;
  let conteudo = texto;
  if (
    texto.length >= 3 &&
    texto[0] === '[' &&
    texto[2] === ']' &&
    (texto[1] === ' ' || texto[1] === 'x' || texto[1] === 'X') &&
    (texto.length === 3 || ehEspaco(texto[3]) || texto[3] === '\n')
  ) {
    tarefa = texto[1] === ' ' ? 'desmarcada' : 'marcada';
    conteudo = texto.slice(3).trim();
  }
  return { tarefa, filhos: interpretarInline(conteudo), sublistas: [] };
}

function criarLista(plano: ItemPlano): MarkdownListaNo {
  return { tipo: 'lista', ordenada: plano.ordenada, inicio: plano.ordenada ? plano.numero : 1, itens: [] };
}

function montarListas(planos: ItemPlano[]): MarkdownListaNo[] {
  const resultado: MarkdownListaNo[] = [];
  let pilha: { recuo: number; lista: MarkdownListaNo }[] = [];

  for (const plano of planos) {
    const item = criarItem(plano.texto);

    if (pilha.length === 0) {
      const lista = criarLista(plano);
      lista.itens.push(item);
      resultado.push(lista);
      pilha = [{ recuo: plano.recuo, lista }];
      continue;
    }

    const topo = pilha[pilha.length - 1];
    if (plano.recuo >= topo.recuo + 2 && pilha.length < MAX_ANINHAMENTO_LISTA) {
      const pai = topo.lista.itens[topo.lista.itens.length - 1];
      const sublista = criarLista(plano);
      sublista.itens.push(item);
      pai.sublistas.push(sublista);
      pilha.push({ recuo: plano.recuo, lista: sublista });
      continue;
    }

    while (pilha.length > 1 && plano.recuo < pilha[pilha.length - 1].recuo) pilha.pop();
    const atual = pilha[pilha.length - 1];

    if (pilha.length === 1 && atual.lista.ordenada !== plano.ordenada) {
      const lista = criarLista(plano);
      lista.itens.push(item);
      resultado.push(lista);
      pilha = [{ recuo: plano.recuo, lista }];
    } else {
      atual.lista.itens.push(item);
    }
  }

  return resultado;
}

// ---------------------------------------------------------------------------------------------
// Inline
// ---------------------------------------------------------------------------------------------

type Unidade = '**' | '*' | '__' | '_' | '~~';

type Token =
  | { k: 'texto'; valor: string }
  | { k: 'no'; no: MarkdownInlineNo }
  | { k: 'delim'; unidade: Unidade; abre: boolean; fecha: boolean };

function ehPontuacaoAscii(c: string): boolean {
  return /[!-/:-@[-`{-~]/.test(c);
}

function ehAlfanumerico(c: string | undefined): boolean {
  return c !== undefined && /[\p{L}\p{N}]/u.test(c);
}

function ehEspacoBranco(c: string | undefined): boolean {
  return c === undefined || /\s/.test(c);
}

function esquemaPermitido(url: string): boolean {
  // eslint-disable-next-line no-control-regex
  if (/[\u0000-\u001f\u007f]/.test(url)) return false;
  return ESQUEMAS_PERMITIDOS.test(url) && url.replace(ESQUEMAS_PERMITIDOS, '').length > 0;
}

function interpretarInline(texto: string, permitirLinks = true): MarkdownInlineNo[] {
  const tokens = tokenizarInline(texto, permitirLinks);
  return montarInline(tokens);
}

function tokenizarInline(texto: string, permitirLinks: boolean): Token[] {
  const tokens: Token[] = [];
  const comprimento = texto.length;
  let buffer = '';
  const descarregar = (): void => {
    if (buffer.length > 0) {
      tokens.push({ k: 'texto', valor: buffer });
      buffer = '';
    }
  };

  // Corridas de crases, para achar o fechamento de um código em tempo linear.
  const corridas: { inicio: number; tamanho: number }[] = [];
  for (let p = 0; p < comprimento; ) {
    if (texto[p] === '`') {
      let fim = p;
      while (fim < comprimento && texto[fim] === '`') fim++;
      corridas.push({ inicio: p, tamanho: fim - p });
      p = fim;
    } else {
      p++;
    }
  }
  const proximaIgual: number[] = new Array(corridas.length).fill(-1);
  const ultimaPorTamanho = new Map<number, number>();
  for (let r = corridas.length - 1; r >= 0; r--) {
    proximaIgual[r] = ultimaPorTamanho.get(corridas[r].tamanho) ?? -1;
    ultimaPorTamanho.set(corridas[r].tamanho, r);
  }
  let ponteiroCorrida = 0;

  let i = 0;
  while (i < comprimento) {
    const c = texto[i];

    if (c === '\\' && i + 1 < comprimento && ehPontuacaoAscii(texto[i + 1])) {
      buffer += texto[i + 1];
      i += 2;
      continue;
    }

    if (c === '\n') {
      descarregar();
      tokens.push({ k: 'no', no: { tipo: 'quebra' } });
      i++;
      continue;
    }

    if (c === '`') {
      while (ponteiroCorrida < corridas.length && corridas[ponteiroCorrida].inicio < i) ponteiroCorrida++;
      const corrida = corridas[ponteiroCorrida];
      const fechamento = proximaIgual[ponteiroCorrida];
      if (fechamento === -1) {
        buffer += texto.slice(i, i + corrida.tamanho);
        i += corrida.tamanho;
        continue;
      }
      const inicioConteudo = i + corrida.tamanho;
      const fimConteudo = corridas[fechamento].inicio;
      let conteudo = texto.slice(inicioConteudo, fimConteudo).replace(/\n/g, ' ');
      if (conteudo.length > 2 && conteudo.startsWith(' ') && conteudo.endsWith(' ') && conteudo.trim().length > 0) {
        conteudo = conteudo.slice(1, -1);
      }
      descarregar();
      tokens.push({ k: 'no', no: { tipo: 'codigo', valor: conteudo } });
      i = fimConteudo + corrida.tamanho;
      continue;
    }

    if (c === '[' && permitirLinks) {
      // Procura o `]` sem atravessar outro `[`: cada abertura varre só até a próxima, então é linear.
      let fechaColchete = -1;
      for (let j = i + 1; j < comprimento; j++) {
        const d = texto[j];
        if (d === '\\') {
          j++;
          continue;
        }
        if (d === '[') break;
        if (d === ']') {
          fechaColchete = j;
          break;
        }
      }
      if (fechaColchete !== -1 && texto[fechaColchete + 1] === '(') {
        let fechaParentese = -1;
        for (let j = fechaColchete + 2; j < comprimento; j++) {
          const d = texto[j];
          if (d === ')') {
            fechaParentese = j;
            break;
          }
          if (d === '(' || /\s/.test(d)) break;
        }
        if (fechaParentese !== -1) {
          const url = texto.slice(fechaColchete + 2, fechaParentese);
          const ehImagem = i > 0 && texto[i - 1] === '!';
          if (esquemaPermitido(url) && !ehImagem) {
            descarregar();
            tokens.push({
              k: 'no',
              no: { tipo: 'link', url, filhos: interpretarInline(texto.slice(i + 1, fechaColchete), false) },
            });
          } else {
            // Esquema fora da lista (javascript:, data: etc.), link relativo ou imagem (`![alt](url)`, que não
            // existe): fica o texto como foi escrito.
            buffer += texto.slice(i, fechaParentese + 1);
          }
          i = fechaParentese + 1;
          continue;
        }
      }
      buffer += c;
      i++;
      continue;
    }

    if (c === '*' || c === '_' || c === '~') {
      let fim = i;
      while (fim < comprimento && texto[fim] === c) fim++;
      const tamanho = fim - i;
      const anterior = i > 0 ? texto[i - 1] : undefined;
      const seguinte = fim < comprimento ? texto[fim] : undefined;

      let abre = !ehEspacoBranco(seguinte);
      let fecha = !ehEspacoBranco(anterior);
      if (c === '_') {
        abre = abre && !ehAlfanumerico(anterior);
        fecha = fecha && !ehAlfanumerico(seguinte);
      }

      let unidades: Unidade[] | null = null;
      if (c === '~') {
        if (tamanho === 2) unidades = ['~~'];
      } else {
        const simples = c as '*' | '_';
        const dupla = (c + c) as '**' | '__';
        if (tamanho === 1) unidades = [simples];
        else if (tamanho === 2) unidades = [dupla];
        else if (tamanho === 3) unidades = fecha && !abre ? [simples, dupla] : [dupla, simples];
      }

      if (unidades && (abre || fecha)) {
        descarregar();
        for (const unidade of unidades) tokens.push({ k: 'delim', unidade, abre, fecha });
      } else {
        buffer += texto.slice(i, fim);
      }
      i = fim;
      continue;
    }

    buffer += c;
    i++;
  }

  descarregar();
  return tokens;
}

function montarInline(tokens: Token[]): MarkdownInlineNo[] {
  // 1) Pareia aberturas e fechamentos com uma pilha por tipo de marcador. Quando um par fecha, as
  //    aberturas de outros tipos que ficaram dentro dele cruzariam o par e viram texto.
  const parDe: number[] = new Array(tokens.length).fill(-1);
  const pilhas = new Map<Unidade, number[]>();
  const pilhaDe = (unidade: Unidade): number[] => {
    let pilha = pilhas.get(unidade);
    if (!pilha) {
      pilha = [];
      pilhas.set(unidade, pilha);
    }
    return pilha;
  };

  for (let t = 0; t < tokens.length; t++) {
    const token = tokens[t];
    if (token.k !== 'delim') continue;
    const unidade = token.unidade;
    const pilha = pilhaDe(unidade);

    if (token.fecha && pilha.length > 0) {
      const abertura = pilha.pop() as number;
      parDe[abertura] = t;
      parDe[t] = abertura;
      for (const [outra, outraPilha] of pilhas) {
        if (outra === unidade) continue;
        while (outraPilha.length > 0 && outraPilha[outraPilha.length - 1] > abertura) outraPilha.pop();
      }
    } else if (token.abre) {
      pilha.push(t);
    }
  }

  // 2) Monta a árvore com uma pilha explícita (sem recursão), limitando o aninhamento.
  interface Quadro {
    unidade: Unidade;
    filhos: MarkdownInlineNo[];
    abertura: number;
  }
  const raiz: MarkdownInlineNo[] = [];
  const quadros: Quadro[] = [];
  const destino = (): MarkdownInlineNo[] => (quadros.length > 0 ? quadros[quadros.length - 1].filhos : raiz);
  const acrescentarTexto = (valor: string): void => {
    const alvo = destino();
    const ultimo = alvo[alvo.length - 1];
    if (ultimo && ultimo.tipo === 'texto') ultimo.valor += valor;
    else alvo.push({ tipo: 'texto', valor });
  };
  for (let t = 0; t < tokens.length; t++) {
    const token = tokens[t];

    if (token.k === 'texto') {
      acrescentarTexto(token.valor);
      continue;
    }
    if (token.k === 'no') {
      destino().push(token.no);
      continue;
    }

    const unidade = token.unidade;
    const par = parDe[t];

    if (par === -1) {
      acrescentarTexto(token.unidade);
      continue;
    }

    if (par > t) {
      if (quadros.length >= MAX_ANINHAMENTO_ENFASE) {
        parDe[par] = -1;
        acrescentarTexto(token.unidade);
      } else {
        quadros.push({ unidade, filhos: [], abertura: t });
      }
      continue;
    }

    const quadro = quadros[quadros.length - 1];
    if (!quadro || quadro.abertura !== par) {
      acrescentarTexto(token.unidade);
      continue;
    }
    quadros.pop();
    const tipo = unidade === '**' || unidade === '__' ? 'negrito' : unidade === '~~' ? 'tachado' : 'italico';
    destino().push({ tipo, filhos: quadro.filhos });
  }

  // Aberturas que ficaram sem fechamento viram texto (não deveria sobrar, pois só pareadas abrem quadro).
  while (quadros.length > 0) {
    const quadro = quadros.pop() as Quadro;
    const alvo = destino();
    alvo.push({ tipo: 'texto', valor: quadro.unidade }, ...quadro.filhos);
  }

  return raiz;
}
