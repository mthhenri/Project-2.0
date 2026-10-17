/**
 * Operações puras sobre o texto Markdown das seções do pad. Nada aqui toca no banco: a service as usa
 * dentro da transação e elas são testadas isoladamente.
 */

export type ResultadoDeTrecho =
  | { ok: true; texto: string }
  | { ok: false; motivo: 'AUSENTE' | 'AMBIGUO' };

/** Ocorrências do trecho no texto, sem sobreposição. Trecho vazio nunca ocorre. */
export function contarOcorrencias(texto: string, trecho: string): number {
  if (trecho.length === 0) return 0;
  let total = 0;
  let posicao = texto.indexOf(trecho);
  while (posicao !== -1) {
    total++;
    posicao = texto.indexOf(trecho, posicao + trecho.length);
  }
  return total;
}

function localizarUnico(texto: string, trecho: string): { inicio: number } | { motivo: 'AUSENTE' | 'AMBIGUO' } {
  const ocorrencias = contarOcorrencias(texto, trecho);
  if (ocorrencias === 0) return { motivo: 'AUSENTE' };
  if (ocorrencias > 1) return { motivo: 'AMBIGUO' };
  return { inicio: texto.indexOf(trecho) };
}

/** Troca um trecho por outro, só quando ele aparece uma única vez. */
export function substituirTrechoUnico(texto: string, trechoAntigo: string, trechoNovo: string): ResultadoDeTrecho {
  const achado = localizarUnico(texto, trechoAntigo);
  if ('motivo' in achado) return { ok: false, motivo: achado.motivo };
  return {
    ok: true,
    texto: texto.slice(0, achado.inicio) + trechoNovo + texto.slice(achado.inicio + trechoAntigo.length),
  };
}

/**
 * Tira um trecho (que aparece uma única vez). Quando ele ocupava linhas inteiras, leva junto uma das quebras de
 * linha vizinhas, para não deixar um buraco em branco no lugar.
 */
export function removerTrechoUnico(texto: string, trecho: string): ResultadoDeTrecho {
  const achado = localizarUnico(texto, trecho);
  if ('motivo' in achado) return { ok: false, motivo: achado.motivo };

  let antes = texto.slice(0, achado.inicio);
  let depois = texto.slice(achado.inicio + trecho.length);
  const comecaLinha = antes === '' || antes.endsWith('\n');
  const terminaLinha = depois === '' || depois.startsWith('\n');
  if (comecaLinha && terminaLinha) {
    if (depois.startsWith('\n')) depois = depois.slice(1);
    else if (antes.endsWith('\n')) antes = antes.slice(0, -1);
  }
  return { ok: true, texto: antes + depois };
}

function aparar(texto: string): string {
  return texto.replace(/^(?:[ \t]*\n)+/, '').trimEnd();
}

/** Anexa ao fim, com uma linha em branco antes quando a seção já tem conteúdo. */
export function anexarAoFim(texto: string, anexo: string): string {
  const novo = aparar(anexo);
  if (novo === '') return texto;
  return texto.trim() === '' ? novo : `${texto.trimEnd()}\n\n${novo}`;
}

/** Escreve debaixo do título `## dd/MM` do dia, que é criado quando falta. Depende só do texto e do dia. */
export function anexarAoFeitoDoDia(texto: string, diaMes: string, anexo: string): string {
  const novo = aparar(anexo);
  if (novo === '') return texto;

  const titulo = `## ${diaMes}`;
  const linhas = texto.split('\n');
  const indiceTitulo = linhas.findIndex((linha) => linha.trim() === titulo);
  if (indiceTitulo === -1) return anexarAoFim(texto, `${titulo}\n${novo}`);

  let proximoTitulo = linhas.length;
  for (let i = indiceTitulo + 1; i < linhas.length; i++) {
    if (linhas[i].startsWith('## ')) {
      proximoTitulo = i;
      break;
    }
  }

  const bloco = linhas.slice(indiceTitulo + 1, proximoTitulo);
  while (bloco.length > 0 && bloco[bloco.length - 1].trim() === '') bloco.pop();

  const resultado = [
    ...linhas.slice(0, indiceTitulo + 1),
    ...bloco,
    ...novo.split('\n'),
    ...(proximoTitulo < linhas.length ? [''] : []),
    ...linhas.slice(proximoTitulo),
  ];
  return resultado.join('\n');
}

/** Duas leituras são a mesma versão quando as datas coincidem (as duas passam pelo mesmo driver, em milissegundos). */
export function mesmaVersao(atual: Date, lida: Date): boolean {
  return new Date(atual).getTime() === new Date(lida).getTime();
}
