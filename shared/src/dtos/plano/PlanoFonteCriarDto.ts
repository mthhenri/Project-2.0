import { IsEnum, IsNotEmpty, IsString, MaxLength } from 'class-validator';
import { LIMITE_CONTEUDO_DA_FONTE_DO_PLANO, LIMITE_TITULO_DA_FONTE_DO_PLANO } from '../../utils/plano-fonte';
import { TipoPlanoFonteOrigemEnum } from '../../enums/tipo-plano-fonte-origem.enum';

/**
 * Material de fora trazido para o plano: texto colado (o e-mail do cliente) ou o texto de um arquivo `.txt`/`.md` que o front leu. Só o texto é
 * guardado. Em `ARQUIVO`, o `titulo` é o nome do arquivo e a service confere a extensão; a service também recusa conteúdo que não é texto.
 */
export class PlanoFonteCriarDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(LIMITE_TITULO_DA_FONTE_DO_PLANO)
  titulo: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(LIMITE_CONTEUDO_DA_FONTE_DO_PLANO)
  conteudo: string;

  @IsEnum(TipoPlanoFonteOrigemEnum)
  origem: TipoPlanoFonteOrigemEnum;
}
