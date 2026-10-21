import { IsEnum, IsInt, Min } from 'class-validator';
import { ReferenciaMensagemDiretaEnum } from '../../enums/referencia-mensagem-direta.enum';

/** Uma referência `#` numa mensagem direta: a demanda ou a atividade que o cartão clicável abre. */
export class ReferenciaMensagemDto {
  @IsEnum(ReferenciaMensagemDiretaEnum)
  tipo: ReferenciaMensagemDiretaEnum;

  @IsInt()
  @Min(1)
  id: number;
}
