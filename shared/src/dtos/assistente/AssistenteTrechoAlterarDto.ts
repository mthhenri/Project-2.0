import { IsEnum, IsInt, IsNotEmpty, IsString, MaxLength, Min } from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty } from '@nestjs/swagger';
import { PlanoAbaEnum } from '../../enums/plano-aba.enum';

/**
 * Pedido de "alterar trecho com IA" da tela de Documentações (task 260): o bloco do texto (Markdown exato), a seleção dentro dele, o que mudar e o
 * tipo de texto. A chamada não grava nada: devolve o bloco com só a seleção alterada. O complemento `Trecho` precede o verbo.
 */
export class AssistenteTrechoAlterarDto {
  @ApiProperty({ example: 12, description: 'A demanda do texto: a permissão é a de quem pode editar aquela aba dela.' })
  @Type(() => Number)
  @IsInt()
  @Min(1)
  demandaId: number;

  @ApiProperty({ enum: PlanoAbaEnum, example: PlanoAbaEnum.DESCRICAO_TECNICA })
  @IsEnum(PlanoAbaEnum)
  aba: PlanoAbaEnum;

  @ApiProperty({ example: 'O sistema deve **exportar o relatório** em PDF.' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(8000)
  bloco: string;

  @ApiProperty({ example: 'exportar' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(8000)
  selecao: string;

  @ApiProperty({ example: 'trocar por "gerar"' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(2000)
  pedido: string;
}
