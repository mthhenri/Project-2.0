import { compararVersoes } from '@project20/shared';

/** Um executável publicado: o nome do arquivo e a versão tirada dele. */
export interface ExecutavelDoDesktop {
  nomeArquivo: string;
  versao: string;
}

const PADRAO_DO_NOME = /^Project-Desktop-(\d+\.\d+\.\d+)\.exe$/;

/** A versão de um arquivo `Project-Desktop-<versão>.exe`; `null` para qualquer outro nome (inclusive os que tentam sair da pasta). */
export function lerExecutavelDoNome(nomeArquivo: string): ExecutavelDoDesktop | null {
  const encontrado = PADRAO_DO_NOME.exec(nomeArquivo);
  return encontrado ? { nomeArquivo, versao: encontrado[1] } : null;
}

/** O executável de maior versão entre os nomes de uma pasta (1.10.0 vence 1.9.0); `null` se nenhum tem o nome esperado. */
export function escolherExecutavelMaisNovo(nomes: readonly string[]): ExecutavelDoDesktop | null {
  let maisNovo: ExecutavelDoDesktop | null = null;
  for (const nome of nomes) {
    const candidato = lerExecutavelDoNome(nome);
    if (candidato && (!maisNovo || compararVersoes(candidato.versao, maisNovo.versao) > 0)) maisNovo = candidato;
  }
  return maisNovo;
}
