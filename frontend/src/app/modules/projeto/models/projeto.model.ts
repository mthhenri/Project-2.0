import { ProjetoResumoDto, ProjetoRecuperadoDto } from '@project20/shared';

export type ProjetoModelo = ProjetoRecuperadoDto;
export type ProjetoListagemModelo = ProjetoResumoDto;

/**
 * Deriva um c\u00f3digo de projeto a partir do nome: mai\u00fasculas, sem acentos,
 * caracteres n\u00e3o-alfanum\u00e9ricos viram h\u00edfen. Limitado a 50 caracteres
 * (MaxLength do campo no ProjetoCriarDto).
 *
 * Ex.: 'Sistema de Gest\u00e3o' -> 'SISTEMA-DE-GESTAO'
 */
export function gerarCodigoDoNome(nome: string): string {
  return nome
    .normalize('NFD')                  // separa letras de seus diacr\u00edticos
    .replace(/[\u0300-\u036f]/g, '')   // remove os acentos
    .toUpperCase()
    .replace(/[^A-Z0-9]+/g, '-')       // qualquer sequ\u00eancia n\u00e3o-alfanum\u00e9rica vira h\u00edfen
    .replace(/^-+|-+$/g, '')           // remove h\u00edfens das pontas
    .slice(0, 50)                      // respeita o limite do campo
    .replace(/-+$/g, '');              // remove h\u00edfen sobrado no corte dos 50
}
