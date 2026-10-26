import { Type } from 'class-transformer';
import { IsEnum, IsInt, IsNotEmpty, IsOptional, IsString, MaxLength, Min } from 'class-validator';
import { PlanoAbaEnum } from '../../enums/plano-aba.enum';

/**
 * Os dados da proposta `ALTERAR_TRECHO_PLANO`: o plano, a aba, o trecho antigo e o novo, a versão lida quando a proposta nasceu e o título do plano
 * (para o cartão). A confirmação usa a versão **de agora**; a proposta expira quando o trecho antigo não está mais no texto.
 */
export class PropostaAlterarTrechoPlanoDadosDto {
  @IsInt()
  @Min(1)
  @Type(() => Number)
  planoId: number;

  @IsEnum(PlanoAbaEnum)
  aba: PlanoAbaEnum;

  @IsString()
  @IsNotEmpty()
  @MaxLength(20000)
  trechoAntigo: string;

  @IsString()
  @MaxLength(20000)
  trechoNovo: string;

  @IsInt()
  @Min(1)
  @Type(() => Number)
  versao: number;

  @IsOptional()
  @IsString()
  @MaxLength(255)
  planoTitulo?: string;
}
