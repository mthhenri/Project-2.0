import { IsNotEmpty, IsString } from 'class-validator';

/** Cria o rascunho do tipo ou substitui o texto do rascunho que já existe (no máximo um por tipo). */
export class PromptRascunhoSalvarDto {
  @IsString()
  @IsNotEmpty()
  conteudo: string;
}
