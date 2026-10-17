import { IsNotEmpty, IsString } from 'class-validator';

/** Escreve na seção Feito, debaixo do título do dia de hoje (`## dd/MM`, criado se faltar). */
export class AnotacaoFeitoAnexarDto {
  @IsString()
  @IsNotEmpty()
  texto: string;
}
