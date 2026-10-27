import { IsInt, IsOptional, IsString, Min } from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

/**
 * Corpo de `PATCH /demanda/:id/textos` (task 258): grava um ou mais dos três textos com a `versao` que a pessoa leu. Versão mais nova no banco
 * recusa a gravação (409). O complemento `Textos` precede o verbo.
 */
export class DemandaTextosAlterarDto {
  @ApiPropertyOptional({ example: 'Implementar autenticação JWT com refresh token' })
  @IsOptional()
  @IsString()
  descricaoTecnica?: string;

  @ApiPropertyOptional({ example: 'O usuário deve poder entrar no sistema com email e senha' })
  @IsOptional()
  @IsString()
  descricaoCliente?: string;

  @ApiPropertyOptional({ example: '# Documentação\n\nDescrição detalhada...' })
  @IsOptional()
  @IsString()
  documentacao?: string;

  @ApiProperty({ example: 1, description: 'A versão dos textos que a pessoa leu (`DemandaRecuperadaDto.versao`).' })
  @Type(() => Number)
  @IsInt()
  @Min(1)
  versao: number;
}
