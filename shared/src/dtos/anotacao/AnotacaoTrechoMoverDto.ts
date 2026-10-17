import { Type } from 'class-transformer';
import { IsDate, IsEnum, IsNotEmpty, IsString } from 'class-validator';
import { TipoAnotacaoEnum } from '../../enums/tipo-anotacao.enum';

/** Move um trecho de uma seção para o fim de outra, numa operação só. */
export class AnotacaoTrechoMoverDto {
  @IsEnum(TipoAnotacaoEnum)
  tipoOrigem: TipoAnotacaoEnum;

  @IsEnum(TipoAnotacaoEnum)
  tipoDestino: TipoAnotacaoEnum;

  /** Texto exato a mover; precisa aparecer uma única vez na origem. */
  @IsString()
  @IsNotEmpty()
  trecho: string;

  @Type(() => Date)
  @IsDate()
  updatedDateOrigemLido: Date;

  @Type(() => Date)
  @IsDate()
  updatedDateDestinoLido: Date;
}
