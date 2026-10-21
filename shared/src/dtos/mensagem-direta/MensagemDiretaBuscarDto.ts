import { Transform } from 'class-transformer';
import { IsBoolean, IsDateString, IsNotEmpty, IsOptional, IsString } from 'class-validator';

/** Busca textual (em português, sem acento) nas mensagens das conversas do próprio usuário, com período e filtro de código opcionais. */
export class MensagemDiretaBuscarDto {
  @IsString()
  @IsNotEmpty()
  texto: string;

  @IsOptional()
  @IsDateString()
  inicio?: string;

  @IsOptional()
  @IsDateString()
  fim?: string;

  /** Só as mensagens com bloco de código (o filtro "Com código"). */
  @IsOptional()
  @IsBoolean()
  @Transform(({ value }) => {
    if (value === 'true') return true;
    if (value === 'false') return false;
    return value;
  })
  somenteCodigo?: boolean;
}
