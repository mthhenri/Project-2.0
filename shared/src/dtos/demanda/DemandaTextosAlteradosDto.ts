import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

/** Saída de `PATCH /demanda/:id/textos` (task 258): os três textos como ficaram e a versão nova, para a próxima gravação. */
export class DemandaTextosAlteradosDto {
  @ApiProperty({ example: 1 })
  id: number;

  @ApiPropertyOptional({ example: 'Implementar autenticação JWT com refresh token' })
  descricaoTecnica: string | null;

  @ApiPropertyOptional({ example: 'O usuário deve poder entrar no sistema com email e senha' })
  descricaoCliente: string | null;

  @ApiPropertyOptional({ example: '# Documentação' })
  documentacao: string | null;

  @ApiProperty({ example: 2 })
  versao: number;
}
