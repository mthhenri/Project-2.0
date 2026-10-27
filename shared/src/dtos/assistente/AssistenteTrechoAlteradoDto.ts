import { ApiProperty } from '@nestjs/swagger';

/** O bloco como veio e o bloco com só a seleção alterada (task 260). Nada foi gravado: quem pediu decide se aceita. */
export class AssistenteTrechoAlteradoDto {
  @ApiProperty({ example: 'O sistema deve **exportar o relatório** em PDF.' })
  bloco: string;

  @ApiProperty({ example: 'O sistema deve **gerar o relatório** em PDF.' })
  blocoNovo: string;
}
