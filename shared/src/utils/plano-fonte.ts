import { TipoPlanoFonteOrigemEnum } from '../enums/tipo-plano-fonte-origem.enum';

// ---------------------------------------------------------------------------
// Material de fora do plano (task 236)
// ---------------------------------------------------------------------------

/** Caracteres do conteúdo de uma fonte: o mesmo teto de uma mensagem do chat. */
export const LIMITE_CONTEUDO_DA_FONTE_DO_PLANO = 4000;
export const LIMITE_TITULO_DA_FONTE_DO_PLANO = 120;
/** Fontes por plano: todas entram no contexto da IA a cada resposta (no máximo ~40 mil caracteres). */
export const LIMITE_FONTES_POR_PLANO = 10;
/** Extensões de arquivo aceitas (só texto; o arquivo não é guardado, só o texto lido). */
export const EXTENSOES_DE_ARQUIVO_DA_FONTE = ['.txt', '.md'] as const;
/** Antes de ler: um arquivo bem maior que o limite não é texto que caiba (UTF-8 chega a 4 bytes por caractere). */
export const TAMANHO_MAXIMO_DO_ARQUIVO_DA_FONTE_BYTES = LIMITE_CONTEUDO_DA_FONTE_DO_PLANO * 4;

/** O nome termina numa extensão aceita? (sem diferenciar maiúsculas) */
export function temExtensaoAceitaDeFonte(nomeDoArquivo: string): boolean {
  const minusculo = nomeDoArquivo.trim().toLowerCase();
  return EXTENSOES_DE_ARQUIVO_DA_FONTE.some((extensao) => minusculo.endsWith(extensao));
}

/** O texto parece de um arquivo binário? NUL, caracteres de controle (menos tab e quebras de linha) ou o "�" de uma decodificação que falhou. */
export function pareceConteudoBinario(conteudo: string): boolean {
  return /[\u0000-\u0008\u000B\u000C\u000E-\u001F�]/.test(conteudo);
}

export interface FonteDoPlanoParaValidar {
  titulo: string;
  conteudo: string;
  origem: TipoPlanoFonteOrigemEnum;
}

/** A mensagem do primeiro problema da fonte, ou `null` se ela pode entrar no plano. Fonte de verdade da regra, usada pela service e pela tela. */
export function validarFonteDoPlano(fonte: FonteDoPlanoParaValidar): string | null {
  const titulo = fonte.titulo.trim();
  if (titulo === '') return 'Informe o título da fonte';
  if (titulo.length > LIMITE_TITULO_DA_FONTE_DO_PLANO) return `O título deve ter no máximo ${LIMITE_TITULO_DA_FONTE_DO_PLANO} caracteres`;
  if (fonte.origem === TipoPlanoFonteOrigemEnum.ARQUIVO && !temExtensaoAceitaDeFonte(titulo)) {
    return `Só arquivos de texto são aceitos (${EXTENSOES_DE_ARQUIVO_DA_FONTE.join(' e ')})`;
  }
  if (fonte.conteudo.trim() === '') return 'O conteúdo da fonte está vazio';
  if (fonte.conteudo.length > LIMITE_CONTEUDO_DA_FONTE_DO_PLANO) {
    return `O conteúdo deve ter no máximo ${LIMITE_CONTEUDO_DA_FONTE_DO_PLANO} caracteres`;
  }
  if (pareceConteudoBinario(fonte.conteudo)) return 'O arquivo não é um texto legível';
  return null;
}
