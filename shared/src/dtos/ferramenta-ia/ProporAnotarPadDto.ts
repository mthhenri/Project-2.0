import { IsBoolean, IsEnum, IsIn, IsOptional, IsString, MaxLength } from 'class-validator';
import { TipoAnotacaoEnum } from '../../enums/tipo-anotacao.enum';

/** As operações pontuais que a IA pode propor no pad (nunca reescrever a seção inteira). */
export const OPERACOES_DE_ANOTACAO_DA_IA = ['ANEXAR', 'TROCAR'] as const;
export type OperacaoDeAnotacaoDaIa = (typeof OPERACOES_DE_ANOTACAO_DA_IA)[number];

/**
 * Entrada da ferramenta `propor_anotar_pad` e, como está, os dados da proposta `ANOTAR_PAD`. `ANEXAR` acrescenta `texto` ao fim da
 * seção (em Feito, debaixo do título de hoje); `TROCAR` troca `trechoAntigo` (que aparece uma única vez) por `trechoNovo`.
 */
export class ProporAnotarPadDto {
  @IsEnum(TipoAnotacaoEnum)
  secao: TipoAnotacaoEnum;

  @IsIn(OPERACOES_DE_ANOTACAO_DA_IA)
  operacao: OperacaoDeAnotacaoDaIa;

  /** Só em ANEXAR. */
  @IsOptional()
  @IsString()
  @MaxLength(4000)
  texto?: string;

  /** Só em TROCAR: o trecho como está hoje na seção (copiado de `consultar_pad`). */
  @IsOptional()
  @IsString()
  @MaxLength(4000)
  trechoAntigo?: string;

  /** Só em TROCAR. */
  @IsOptional()
  @IsString()
  @MaxLength(4000)
  trechoNovo?: string;

  /** Obrigatório (e verdadeiro) para escrever em Pessoal: a seção é do usuário e a IA só escreve ali quando ele pede. */
  @IsOptional()
  @IsBoolean()
  pedidoExplicito?: boolean;
}

/** Os dados guardados na proposta: os mesmos da entrada (o cartão lê a seção, o texto e os trechos direto deles). */
export class PropostaAnotarPadDadosDto extends ProporAnotarPadDto {}
