import { IsNotEmpty, IsString, MaxLength } from 'class-validator';

/** Um ponto em aberto novo. O rótulo é texto livre ("Lacuna", "Risco", "Pergunta"...): nenhuma lista fecha o que se pode anotar. */
export class PlanoPontoCriarDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(60)
  rotulo: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(4000)
  texto: string;
}
