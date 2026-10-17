/**
 * Conversor de HTML (a saída do Quill) para Markdown, usado uma única vez pelo script
 * `converter-descricoes` (task 123). O subconjunto do Quill é fechado, então o conversor é próprio e
 * sem dependências. O Markdown gerado é o que `interpretarMarkdown` (shared) entende:
 *
 * - Parágrafos seguidos viram linhas seguidas; um parágrafo vazio vira uma linha em branco (como o
 *   Quill mostra). Quebra de linha (`<br>`) dentro do parágrafo vira quebra de linha.
 * - Texto é escapado para não virar marcação (`*`, `_`, crase, `[`, `<`, início de linha com `#`/`-`/`1.`),
 *   o que também garante que rodar o script de novo não reconverte o resultado.
 * - Sem equivalente em Markdown: sublinhado (fica o texto), imagem (some), link com esquema fora de
 *   `http`/`https`/`mailto` (fica o texto). As perdas são contadas para o relatório.
 */

export interface PerdasConversao {
  sublinhado: number;
  imagens: number;
  linksRemovidos: number;
}

export interface ResultadoConversao {
  markdown: string;
  perdas: PerdasConversao;
}

type NoHtml =
  | { tipo: 'texto'; valor: string }
  | { tipo: 'elemento'; nome: string; atributos: Record<string, string>; filhos: NoHtml[] };

const ELEMENTOS_VAZIOS = new Set(['br', 'img', 'hr', 'input', 'meta', 'link']);
const ELEMENTOS_IGNORADOS = new Set(['script', 'style', 'head', 'template']);
const BLOCOS_DE_FLUXO = new Set([
  'p', 'div', 'section', 'article', 'header', 'footer', 'main', 'aside', 'figure', 'figcaption',
  'table', 'thead', 'tbody', 'tfoot', 'tr', 'td', 'th', 'dl', 'dt', 'dd', 'details', 'summary',
]);
const MAX_PROFUNDIDADE = 200;
const ESQUEMAS_PERMITIDOS = /^(https?:\/\/|mailto:)/i;
const ENTIDADES: Record<string, string> = {
  nbsp: ' ', amp: '&', lt: '<', gt: '>', quot: '"', apos: "'", '#39': "'",
};

/**
 * Valor que parece saída do Quill: começa por uma tag de bloco e tem alguma tag de fechamento. É a
 * heurística de idempotência do script; um Markdown que comece por um `<p>` literal seria um falso
 * positivo (o conversor escapa o `<`, então o Markdown gerado nunca casa com isto).
 */
export function pareceHtmlDoQuill(valor: string | null | undefined): boolean {
  if (typeof valor !== 'string') return false;
  return /^\s*<(?:p|h[1-6]|ul|ol|blockquote|pre|div)(?:\s[^>]*)?>/i.test(valor) && valor.includes('</');
}

// ---------------------------------------------------------------------------------------------
// Parser de HTML (subconjunto, linear, sem lançar)
// ---------------------------------------------------------------------------------------------

function decodificarEntidades(texto: string): string {
  if (!texto.includes('&')) return texto;
  return texto.replace(/&(#x[0-9a-fA-F]{1,6}|#[0-9]{1,7}|[a-zA-Z]{2,8});/g, (original, nome: string) => {
    if (nome[0] === '#') {
      const codigo = nome[1] === 'x' || nome[1] === 'X' ? parseInt(nome.slice(2), 16) : parseInt(nome.slice(1), 10);
      if (!Number.isFinite(codigo) || codigo <= 0 || codigo > 0x10ffff) return original;
      return codigo === 0xa0 ? ' ' : String.fromCodePoint(codigo);
    }
    return ENTIDADES[nome.toLowerCase()] ?? original;
  });
}

function lerAtributos(texto: string): Record<string, string> {
  const atributos: Record<string, string> = {};
  let i = 0;
  const comprimento = texto.length;
  while (i < comprimento) {
    while (i < comprimento && /[\s/]/.test(texto[i])) i++;
    const inicioNome = i;
    while (i < comprimento && !/[\s=/>]/.test(texto[i])) i++;
    const nome = texto.slice(inicioNome, i).toLowerCase();
    if (!nome) {
      i++;
      continue;
    }
    while (i < comprimento && /\s/.test(texto[i])) i++;
    let valor = '';
    if (texto[i] === '=') {
      i++;
      while (i < comprimento && /\s/.test(texto[i])) i++;
      const aspas = texto[i];
      if (aspas === '"' || aspas === "'") {
        const fim = texto.indexOf(aspas, i + 1);
        const limite = fim === -1 ? comprimento : fim;
        valor = texto.slice(i + 1, limite);
        i = limite + 1;
      } else {
        const inicioValor = i;
        while (i < comprimento && !/\s/.test(texto[i])) i++;
        valor = texto.slice(inicioValor, i);
      }
    }
    atributos[nome] = decodificarEntidades(valor);
  }
  return atributos;
}

function interpretarHtml(html: string): NoHtml[] {
  const raiz: NoHtml[] = [];
  const pilha: { nome: string; filhos: NoHtml[] }[] = [];
  const destino = (): NoHtml[] => (pilha.length > 0 ? pilha[pilha.length - 1].filhos : raiz);
  const acrescentarTexto = (valor: string): void => {
    if (valor.length > 0) destino().push({ tipo: 'texto', valor: decodificarEntidades(valor) });
  };

  const comprimento = html.length;
  let i = 0;
  let textoPendente = '';

  while (i < comprimento) {
    const abre = html.indexOf('<', i);
    if (abre === -1) {
      textoPendente += html.slice(i);
      break;
    }
    textoPendente += html.slice(i, abre);

    if (html.startsWith('<!--', abre)) {
      const fimComentario = html.indexOf('-->', abre + 4);
      i = fimComentario === -1 ? comprimento : fimComentario + 3;
      continue;
    }

    const proximo = html[abre + 1];
    const fechamento = proximo === '/';
    if (!(fechamento || (proximo !== undefined && /[a-zA-Z]/.test(proximo)))) {
      textoPendente += '<';
      i = abre + 1;
      continue;
    }

    // Fim da tag: o primeiro `>` fora de aspas.
    let cursor = abre + 1;
    let aspas: string | null = null;
    while (cursor < comprimento) {
      const c = html[cursor];
      if (aspas) {
        if (c === aspas) aspas = null;
      } else if (c === '"' || c === "'") {
        aspas = c;
      } else if (c === '>') {
        break;
      }
      cursor++;
    }
    if (cursor >= comprimento) {
      textoPendente += html.slice(abre);
      i = comprimento;
      break;
    }

    acrescentarTexto(textoPendente);
    textoPendente = '';

    const interior = html.slice(abre + 1 + (fechamento ? 1 : 0), cursor);
    const nome = (/^[a-zA-Z][a-zA-Z0-9-]*/.exec(interior)?.[0] ?? '').toLowerCase();
    i = cursor + 1;
    if (!nome) continue;

    if (fechamento) {
      let indice = pilha.length - 1;
      while (indice >= 0 && pilha[indice].nome !== nome) indice--;
      if (indice >= 0) pilha.length = indice;
      continue;
    }

    const atributos = lerAtributos(interior.slice(nome.length));
    const autoFechado = ELEMENTOS_VAZIOS.has(nome) || interior.endsWith('/');
    const filhos: NoHtml[] = [];
    destino().push({ tipo: 'elemento', nome, atributos, filhos });
    if (!autoFechado && pilha.length < MAX_PROFUNDIDADE) pilha.push({ nome, filhos });

    // Conteúdo de <script>/<style> é texto cru até o fechamento.
    if (!autoFechado && ELEMENTOS_IGNORADOS.has(nome)) {
      const fim = html.toLowerCase().indexOf(`</${nome}`, i);
      i = fim === -1 ? comprimento : fim;
    }
  }

  acrescentarTexto(textoPendente);
  return raiz;
}

// ---------------------------------------------------------------------------------------------
// Renderização
// ---------------------------------------------------------------------------------------------

interface Contexto {
  perdas: PerdasConversao;
}

function textoPuro(nos: NoHtml[]): string {
  let saida = '';
  for (const no of nos) {
    if (no.tipo === 'texto') saida += no.valor;
    else if (no.nome === 'br') saida += '\n';
    else if (!ELEMENTOS_IGNORADOS.has(no.nome)) saida += textoPuro(no.filhos);
  }
  return saida;
}

function ehAlfanumerico(c: string | undefined): boolean {
  return c !== undefined && /[\p{L}\p{N}]/u.test(c);
}

/** Escapa o que o interpretador trataria como marcação dentro de uma linha. */
function escaparTexto(texto: string): string {
  let saida = '';
  for (let i = 0; i < texto.length; i++) {
    const c = texto[i];
    if (c === '\\' || c === '`' || c === '*' || c === '[' || c === ']' || c === '<') {
      saida += '\\' + c;
    } else if (c === '_') {
      saida += ehAlfanumerico(texto[i - 1]) && ehAlfanumerico(texto[i + 1]) ? c : '\\_';
    } else if (c === '~' && (texto[i - 1] === '~' || texto[i + 1] === '~')) {
      saida += '\\~';
    } else {
      saida += c;
    }
  }
  return saida;
}

/** Linha que começaria um bloco (título, citação, lista, régua, cerca): escapa o primeiro caractere. */
function escaparInicioDeLinha(linha: string): string {
  const recuo = linha.length - linha.trimStart().length;
  const resto = linha.slice(recuo);
  const prefixo = linha.slice(0, recuo);
  if (/^#{1,6}(?:[ \t]|$)/.test(resto) || resto.startsWith('>')) return `${prefixo}\\${resto}`;
  if (/^[-+](?:[ \t]|$)/.test(resto) || /^(?:-[ \t]*){3,}$/.test(resto)) return `${prefixo}\\${resto}`;
  const numerada = /^(\d{1,9})([.)])(?:[ \t]|$)/.exec(resto);
  if (numerada) return `${prefixo}${numerada[1]}\\${resto.slice(numerada[1].length)}`;
  return linha;
}

function escaparLinhas(texto: string): string {
  return texto.split('\n').map(escaparInicioDeLinha).join('\n');
}

/** Marca de ênfase sem espaço colado por dentro (`** a **` não renderiza): o espaço sai para fora. */
function marcar(conteudo: string, marca: string): string {
  const aparado = conteudo.trim();
  if (aparado.length === 0) return conteudo;
  const antes = conteudo.slice(0, conteudo.length - conteudo.trimStart().length);
  const depois = conteudo.slice(conteudo.length - (conteudo.length - conteudo.trimEnd().length));
  return `${antes}${marca}${aparado}${marca}${depois}`;
}

function codigoEmLinha(texto: string): string {
  const unico = texto.replace(/\n/g, ' ');
  let maior = 0;
  let atual = 0;
  for (const c of unico) {
    atual = c === '`' ? atual + 1 : 0;
    if (atual > maior) maior = atual;
  }
  const cerca = '`'.repeat(maior + 1);
  const comFolga = unico.startsWith('`') || unico.endsWith('`') ? ` ${unico} ` : unico;
  return `${cerca}${comFolga}${cerca}`;
}

function enderecoPermitido(href: string | undefined): string | null {
  if (!href) return null;
  const limpo = href.trim();
  // eslint-disable-next-line no-control-regex
  if (/[\u0000-\u001f\u007f\s]/.test(limpo) || !ESQUEMAS_PERMITIDOS.test(limpo)) return null;
  if (limpo.replace(ESQUEMAS_PERMITIDOS, '').length === 0) return null;
  return limpo.replace(/\(/g, '%28').replace(/\)/g, '%29');
}

function renderizarInline(nos: NoHtml[], contexto: Contexto): string {
  let saida = '';
  for (const no of nos) {
    if (no.tipo === 'texto') {
      saida += escaparTexto(no.valor.replace(/\r?\n/g, ' '));
      continue;
    }
    const interno = (): string => renderizarInline(no.filhos, contexto);
    switch (no.nome) {
      case 'br':
        saida += '\n';
        break;
      case 'strong':
      case 'b':
        saida += marcar(interno(), '**');
        break;
      case 'em':
      case 'i':
        saida += marcar(interno(), '*');
        break;
      case 's':
      case 'strike':
      case 'del':
        saida += marcar(interno(), '~~');
        break;
      case 'u':
      case 'ins':
        contexto.perdas.sublinhado++;
        saida += interno();
        break;
      case 'code':
        saida += codigoEmLinha(textoPuro(no.filhos));
        break;
      case 'img':
        contexto.perdas.imagens++;
        break;
      case 'a': {
        const rotulo = interno();
        const endereco = enderecoPermitido(no.atributos['href']);
        if (endereco) {
          saida += `[${rotulo.trim().length > 0 ? rotulo.replace(/\n/g, ' ') : escaparTexto(endereco)}](${endereco})`;
        } else {
          if (no.atributos['href']) contexto.perdas.linksRemovidos++;
          saida += rotulo;
        }
        break;
      }
      case 'span':
        // O Quill 2 põe `<span class="ql-ui">` (o marcador) dentro dos itens de lista.
        if (!(no.atributos['class'] ?? '').split(/\s+/).includes('ql-ui')) saida += interno();
        break;
      default:
        if (!ELEMENTOS_IGNORADOS.has(no.nome)) saida += interno();
    }
  }
  return saida;
}

interface BlocoSaida {
  tipo: 'paragrafo' | 'vazio' | 'citacao' | 'outro';
  texto: string;
}

function eListaOuBloco(no: NoHtml): boolean {
  if (no.tipo !== 'elemento') return false;
  return (
    BLOCOS_DE_FLUXO.has(no.nome) ||
    /^h[1-6]$/.test(no.nome) ||
    ['ul', 'ol', 'blockquote', 'pre', 'hr'].includes(no.nome)
  );
}

function recuarCitacao(texto: string): string {
  return texto
    .split('\n')
    .map((linha) => (linha.length > 0 ? `> ${linha}` : '>'))
    .join('\n');
}

function renderizarBlocos(nos: NoHtml[], contexto: Contexto): BlocoSaida[] {
  const blocos: BlocoSaida[] = [];
  let pendentes: NoHtml[] = [];

  const descarregar = (): void => {
    if (pendentes.length === 0) return;
    const texto = renderizarInline(pendentes, contexto).trim();
    pendentes = [];
    if (texto.length > 0) blocos.push({ tipo: 'paragrafo', texto: escaparLinhas(texto) });
  };

  for (const no of nos) {
    if (no.tipo === 'texto') {
      if (no.valor.trim().length > 0 || pendentes.length > 0) pendentes.push(no);
      continue;
    }
    if (ELEMENTOS_IGNORADOS.has(no.nome)) continue;
    if (!eListaOuBloco(no)) {
      pendentes.push(no);
      continue;
    }
    descarregar();

    if (/^h[1-6]$/.test(no.nome)) {
      const nivel = Math.min(Number(no.nome[1]), 4);
      const texto = renderizarInline(no.filhos, contexto).replace(/\n/g, ' ').trim();
      if (texto.length > 0) blocos.push({ tipo: 'outro', texto: `${'#'.repeat(nivel)} ${texto}` });
      continue;
    }

    switch (no.nome) {
      case 'ul':
      case 'ol': {
        const linhas = renderizarLista(no, 0, contexto);
        if (linhas.length > 0) blocos.push({ tipo: 'outro', texto: linhas.join('\n') });
        break;
      }
      case 'blockquote': {
        const internos = no.filhos.some(eListaOuBloco)
          ? juntarBlocos(renderizarBlocos(no.filhos, contexto))
          : escaparLinhas(renderizarInline(no.filhos, contexto).trim());
        const citacao = internos.length > 0 ? recuarCitacao(internos) : '';
        const ultimo = blocos[blocos.length - 1];
        if (citacao.length === 0) break;
        // Várias `<blockquote>` seguidas (uma por linha, no Quill) formam uma citação só.
        if (ultimo && ultimo.tipo === 'citacao') ultimo.texto += `\n${citacao}`;
        else blocos.push({ tipo: 'citacao', texto: citacao });
        break;
      }
      case 'pre': {
        const codigo = textoPuro(no.filhos).replace(/\n$/, '');
        let maior = 0;
        for (const trecho of codigo.match(/`+/g) ?? []) maior = Math.max(maior, trecho.length);
        const cerca = '`'.repeat(Math.max(3, maior + 1));
        blocos.push({ tipo: 'outro', texto: `${cerca}\n${codigo}\n${cerca}` });
        break;
      }
      case 'hr':
        blocos.push({ tipo: 'outro', texto: '---' });
        break;
      default: {
        // p, div e afins: o conteúdo é inline; contêiner com blocos dentro vira fluxo.
        if (no.filhos.some(eListaOuBloco)) {
          blocos.push(...renderizarBlocos(no.filhos, contexto));
          break;
        }
        const texto = renderizarInline(no.filhos, contexto).trim();
        blocos.push(texto.length > 0 ? { tipo: 'paragrafo', texto: escaparLinhas(texto) } : { tipo: 'vazio', texto: '' });
      }
    }
  }
  descarregar();
  return blocos;
}

function juntarBlocos(blocos: BlocoSaida[]): string {
  let saida = '';
  let anterior: BlocoSaida | null = null;
  let brancoPendente = false;
  for (const bloco of blocos) {
    if (bloco.tipo === 'vazio') {
      brancoPendente = true;
      continue;
    }
    if (anterior) {
      const colados = anterior.tipo === 'paragrafo' && bloco.tipo === 'paragrafo' && !brancoPendente;
      saida += colados ? '\n' : '\n\n';
    }
    saida += bloco.texto;
    anterior = bloco;
    brancoPendente = false;
  }
  return saida;
}

// ---------------------------------------------------------------------------------------------
// Listas (Quill 2: `<ol><li data-list="bullet|ordered|checked|unchecked" class="ql-indent-N">`)
// ---------------------------------------------------------------------------------------------

interface ItemPlano {
  nivel: number;
  tipo: 'marcador' | 'numerado' | 'marcada' | 'desmarcada';
  conteudo: string;
}

function recuoDoQuill(item: NoHtml & { tipo: 'elemento' }): number {
  const classe = /ql-indent-(\d+)/.exec(item.atributos['class'] ?? '');
  return classe ? Math.min(Number(classe[1]), 8) : 0;
}

function tipoDoItem(item: NoHtml & { tipo: 'elemento' }, lista: NoHtml & { tipo: 'elemento' }): ItemPlano['tipo'] {
  switch (item.atributos['data-list']) {
    case 'bullet':
      return 'marcador';
    case 'ordered':
      return 'numerado';
    case 'checked':
      return 'marcada';
    case 'unchecked':
      return 'desmarcada';
  }
  if (lista.atributos['data-checked'] === 'true') return 'marcada';
  if (lista.atributos['data-checked'] === 'false') return 'desmarcada';
  return lista.nome === 'ol' ? 'numerado' : 'marcador';
}

function coletarItens(lista: NoHtml & { tipo: 'elemento' }, nivelBase: number, contexto: Contexto, saida: ItemPlano[]): void {
  for (const filho of lista.filhos) {
    if (filho.tipo !== 'elemento' || filho.nome !== 'li') continue;
    const nivel = nivelBase + recuoDoQuill(filho);
    const proprios = filho.filhos.filter((no) => !(no.tipo === 'elemento' && (no.nome === 'ul' || no.nome === 'ol')));
    const aninhadas = filho.filhos.filter(
      (no): no is NoHtml & { tipo: 'elemento' } => no.tipo === 'elemento' && (no.nome === 'ul' || no.nome === 'ol'),
    );
    saida.push({
      nivel,
      tipo: tipoDoItem(filho, lista),
      conteudo: escaparLinhas(renderizarInline(proprios, contexto).trim()),
    });
    for (const sublista of aninhadas) coletarItens(sublista, nivel + 1, contexto, saida);
  }
}

function renderizarLista(lista: NoHtml & { tipo: 'elemento' }, nivelBase: number, contexto: Contexto): string[] {
  const itens: ItemPlano[] = [];
  coletarItens(lista, nivelBase, contexto, itens);

  const linhas: string[] = [];
  const contadores: number[] = [];
  let nivelAnterior = -1;

  for (const item of itens) {
    const nivel = Math.min(item.nivel, nivelAnterior + 1);
    nivelAnterior = nivel;
    contadores.length = nivel + 1;
    let marcador: string;
    switch (item.tipo) {
      case 'numerado':
        contadores[nivel] = (contadores[nivel] ?? 0) + 1;
        marcador = `${contadores[nivel]}. `;
        break;
      case 'marcada':
        contadores[nivel] = 0;
        marcador = '- [x] ';
        break;
      case 'desmarcada':
        contadores[nivel] = 0;
        marcador = '- [ ] ';
        break;
      default:
        contadores[nivel] = 0;
        marcador = '- ';
    }
    const recuo = '  '.repeat(nivel);
    const [primeira, ...demais] = item.conteudo.split('\n');
    linhas.push(`${recuo}${marcador}${primeira}`);
    for (const continuacao of demais) linhas.push(`${recuo}  ${continuacao}`);
  }
  return linhas;
}

// ---------------------------------------------------------------------------------------------

export function converterHtmlParaMarkdown(html: string): ResultadoConversao {
  const contexto: Contexto = { perdas: { sublinhado: 0, imagens: 0, linksRemovidos: 0 } };
  const arvore = interpretarHtml(html ?? '');
  const markdown = juntarBlocos(renderizarBlocos(arvore, contexto));
  return { markdown, perdas: contexto.perdas };
}
