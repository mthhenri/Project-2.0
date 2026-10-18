import { IsArray, IsNotEmpty, IsString } from 'class-validator';

/** Pede o teste de um texto de prompt (o candidato) contra de 1 a 5 narrativas, comparando com o prompt ativo do tipo. */
export class PromptTestarDto {
  /** O texto candidato: o do rascunho salvo ou o que está no editor. */
  @IsString()
  @IsNotEmpty()
  conteudo: string;

  /** Textos livres colados pelo administrador; cada um vira uma mensagem do usuário. */
  @IsArray()
  @IsString({ each: true })
  narrativas: string[];
}
