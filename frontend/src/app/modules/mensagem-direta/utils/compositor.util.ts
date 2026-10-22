import { ReferenciaMensagemDiretaEnum, ReferenciaMensagemDto } from '@project20/shared';

// Lógica pura do compositor do chat entre colaboradores (task 211): gatilhos `@` e `#`, inserção da escolha, o que ainda vale no envio e o bloco de código.

export type TipoDeGatilho = 'MENCAO' | 'REFERENCIA';

/** O `@` ou `#` aberto no cursor e o que já foi digitado depois dele. */
export interface Gatilho {
  tipo: TipoDeGatilho;
  /** Posição do `@` ou `#` no texto. */
  inicio: number;
  /** O que veio depois do símbolo, até o cursor. */
  termo: string;
}

const MAXIMO_DO_TERMO = 40;
/** Pontuação que encerra o gatilho: "@Camila, vamos?" é frase, não uma menção em andamento. */
const PONTUACAO_QUE_ENCERRA = /[,;:!?()[\]{}<>"`\n\\]/;

/**
 * O gatilho aberto no cursor, ou `null`. Vale um `@` ou `#` no início de uma palavra (começo do texto ou depois de espaço ou quebra de linha), com
 * o que foi digitado depois dele até o cursor: sem espaço logo depois do símbolo nem no fim do termo, até 40 letras, sem pontuação de frase. Espaços no meio são aceitos
 * porque os nomes têm mais de uma palavra ("@Camila Du", "#Corrigir filtro"). `a@b` (e-mail) e `#` solto não abrem nada.
 */
export function detectarGatilho(texto: string, cursor: number): Gatilho | null {
  const ate = texto.slice(0, cursor);
  let inicio = -1;
  for (let indice = ate.length - 1; indice >= 0 && ate.length - indice <= MAXIMO_DO_TERMO + 1; indice--) {
    const caractere = ate[indice];
    if (caractere === '\n') return null;
    if (caractere === '@' || caractere === '#') {
      const antes = indice === 0 ? ' ' : ate[indice - 1];
      if (/\s/.test(antes)) inicio = indice;
      break;
    }
  }
  if (inicio < 0) return null;
  const termo = ate.slice(inicio + 1);
  // Espaço logo depois do símbolo ou no fim do termo encerra: é como a escolha feita (`@Nome `) deixa a lista fechada.
  if (/^\s/.test(termo) || /\s$/.test(termo) || PONTUACAO_QUE_ENCERRA.test(termo) || termo.length > MAXIMO_DO_TERMO) return null;
  return { tipo: ate[inicio] === '@' ? 'MENCAO' : 'REFERENCIA', inicio, termo };
}

export interface TextoComCursor {
  texto: string;
  cursor: number;
}

export interface EscolhaAplicada extends TextoComCursor {
  /** A escolha acrescentou um espaço depois do item (não acrescenta se o texto depois do cursor já começa com espaço). */
  espacoAcrescentado: boolean;
}

/** Troca o gatilho (do símbolo até o cursor) pelo item escolhido, com um espaço depois (se o texto adiante já não começa com um), e põe o cursor depois dele. */
export function aplicarEscolha(texto: string, gatilho: Gatilho, cursor: number, rotulo: string): EscolhaAplicada {
  const simbolo = gatilho.tipo === 'MENCAO' ? '@' : '#';
  const depois = texto.slice(cursor);
  const espacoAcrescentado = !/^\s/.test(depois);
  const inserido = `${simbolo}${rotulo}${espacoAcrescentado ? ' ' : ''}`;
  return { texto: texto.slice(0, gatilho.inicio) + inserido + depois, cursor: gatilho.inicio + inserido.length, espacoAcrescentado };
}

export interface PessoaEscolhida {
  usuarioId: number;
  nome: string;
}

export interface ReferenciaEscolhida extends ReferenciaMensagemDto {
  nome: string;
}

function contemMarcado(texto: string, marcado: string): boolean {
  let posicao = texto.indexOf(marcado);
  while (posicao >= 0) {
    const depois = texto[posicao + marcado.length];
    // O nome inteiro: depois dele vem o fim do texto ou algo que não continua a palavra.
    if (depois === undefined || !/[\p{L}\p{N}_]/u.test(depois)) return true;
    posicao = texto.indexOf(marcado, posicao + 1);
  }
  return false;
}

/** Os ids das pessoas escolhidas cujo `@Nome` ainda está no texto (quem apagou a menção digitando por cima não avisa ninguém). */
export function mencoesPresentes(texto: string, escolhidas: PessoaEscolhida[]): number[] {
  const ids = new Set<number>();
  for (const pessoa of escolhidas) if (contemMarcado(texto, `@${pessoa.nome}`)) ids.add(pessoa.usuarioId);
  return [...ids];
}

/** As referências escolhidas cujo `#Nome` ainda está no texto, sem repetição. */
export function referenciasPresentes(texto: string, escolhidas: ReferenciaEscolhida[]): ReferenciaMensagemDto[] {
  const vistas = new Set<string>();
  const presentes: ReferenciaMensagemDto[] = [];
  for (const referencia of escolhidas) {
    const chave = `${referencia.tipo}:${referencia.id}`;
    if (vistas.has(chave) || !contemMarcado(texto, `#${referencia.nome}`)) continue;
    vistas.add(chave);
    presentes.push({ tipo: referencia.tipo, id: referencia.id });
  }
  return presentes;
}

export interface SelecaoNoTexto extends TextoComCursor {
  /** Fim da seleção resultante (igual a `cursor` quando é só o cursor). */
  fimDaSelecao: number;
}

/**
 * Troca `[inicio, fim)` por um bloco de código cercado com `conteudo`. A cerca começa e termina na própria linha: se o trecho está no meio de uma
 * linha, entra quebra antes e depois. Com `conteudo` vazio o cursor fica **dentro** do bloco, pronto para digitar; com conteúdo, depois do bloco.
 */
export function inserirBlocoDeCodigo(texto: string, inicio: number, fim: number, conteudo: string): SelecaoNoTexto {
  const antes = texto.slice(0, inicio);
  const depois = texto.slice(fim);
  const prefixo = antes.length > 0 && !antes.endsWith('\n') ? '\n' : '';
  const sufixo = depois.length > 0 && !depois.startsWith('\n') ? '\n' : '';
  const corpo = conteudo.replace(/\s+$/, '');
  const abertura = `${prefixo}\`\`\`\n`;
  // Bloco vazio ganha uma linha em branco entre as cercas: é nela que o cursor fica, e o que for digitado não gruda na cerca de baixo.
  const bloco = `${abertura}${corpo}\n\`\`\`${sufixo}`;
  const novo = antes + bloco + depois;
  if (corpo === '') {
    const cursor = antes.length + abertura.length;
    return { texto: novo, cursor, fimDaSelecao: cursor };
  }
  const cursor = antes.length + bloco.length - sufixo.length;
  return { texto: novo, cursor, fimDaSelecao: cursor };
}

const LINHA_COM_CARA_DE_CODIGO =
  /[{};]\s*$|=>|^\s{2,}\S|^\s*(?:const|let|var|function|class|interface|import|export|return|if|else|for|while|try|catch|def|public|private|protected|async|await|SELECT|FROM|WHERE|INSERT|UPDATE|DELETE)\b|\)\s*\{?\s*$|<\/?[a-z][^>]*>|^\s*[@#]\w+|^\s*\/\/|^\s*\/\*|\*\/\s*$/i;

/**
 * O texto colado parece código? Só vale com **duas linhas ou mais** e quando a maior parte das linhas tem cara de código (terminam em `;`, `{`, `}`,
 * têm `=>`, recuo, palavra-chave de linguagem ou SQL). O que já traz cerca de código não é tocado. O resultado vira bloco, desfazível com Ctrl+Z;
 * o botão "Código" continua disponível para os casos em que a detecção erra.
 */
export function pareceCodigo(texto: string): boolean {
  if (texto.includes('```')) return false;
  const linhas = texto.split(/\r?\n/).filter((linha) => linha.trim() !== '');
  if (linhas.length < 2) return false;
  const comCara = linhas.filter((linha) => LINHA_COM_CARA_DE_CODIGO.test(linha)).length;
  return comCara >= 2 && comCara / linhas.length >= 0.5;
}

/** Rótulo curto de um status (`DESENVOLVENDO` vira "Desenvolvendo"); sem valor, vazio. */
export function rotuloDaSituacao(codigo: string | null | undefined): string {
  if (!codigo) return '';
  const texto = codigo.replaceAll('_', ' ').toLowerCase();
  return texto.charAt(0).toUpperCase() + texto.slice(1);
}

export const ROTULO_DO_TIPO_DE_REFERENCIA: Record<ReferenciaMensagemDiretaEnum, string> = {
  [ReferenciaMensagemDiretaEnum.DEMANDA]: 'Demanda',
  [ReferenciaMensagemDiretaEnum.ATIVIDADE]: 'Atividade',
};

/** Para onde o clique do cartão leva: a atividade tem página própria; a demanda abre o projeto dela. */
export function destinoDaReferencia(tipo: ReferenciaMensagemDiretaEnum, id: number, projetoId: number | null): { caminho: string[]; parametros?: Record<string, number> } | null {
  if (tipo === ReferenciaMensagemDiretaEnum.ATIVIDADE) return { caminho: ['/atividade', String(id)] };
  return projetoId === null ? null : { caminho: ['/demanda'], parametros: { projetoId } };
}
