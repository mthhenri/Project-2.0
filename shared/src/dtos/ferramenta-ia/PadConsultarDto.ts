import { IsArray, IsEnum, IsOptional, IsString, Matches } from 'class-validator';
import { TipoAnotacaoEnum } from '../../enums/tipo-anotacao.enum';

/** Entrada da ferramenta `consultar_pad`: quais seções do pad do próprio usuário ler (carregar só o que precisa economiza tokens). */
export class PadConsultarDto {
  /** Sem o campo, vêm as cinco seções. */
  @IsOptional()
  @IsArray()
  @IsEnum(TipoAnotacaoEnum, { each: true })
  secoes?: TipoAnotacaoEnum[];

  /** Só para a seção Feito: o dia (`dd/MM`) cujo título será lido. Sem o campo, é hoje. */
  @IsOptional()
  @IsString()
  @Matches(/^\d{2}\/\d{2}$/, { message: 'diaDoFeito deve estar no formato dd/MM' })
  diaDoFeito?: string;
}
