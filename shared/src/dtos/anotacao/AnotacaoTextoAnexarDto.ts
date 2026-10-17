import { IsNotEmpty, IsString } from 'class-validator';

/** Anexa um texto ao fim da seção (com uma linha em branco antes, se ela já tiver conteúdo). */
export class AnotacaoTextoAnexarDto {
  @IsString()
  @IsNotEmpty()
  texto: string;
}
