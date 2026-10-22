import { Transform } from 'class-transformer';
import { IsNotEmpty, IsString, MaxLength, MinLength } from 'class-validator';

/** Busca, pelo nome, as demandas e atividades que o usuário pode referenciar numa mensagem (o `#` do compositor). */
export class MensagemDiretaReferenciaBuscarDto {
  /** Pelo menos duas letras, **depois** de aparar os espaços: uma só (ou só espaços) devolveria a base inteira. */
  @Transform(({ value }) => (typeof value === 'string' ? value.trim() : value))
  @IsString()
  @IsNotEmpty()
  @MinLength(2)
  @MaxLength(100)
  texto: string;
}
