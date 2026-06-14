import { IsDateString } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class CalendarioConsultarDto {
  @ApiProperty({ example: '2026-12-25' })
  @IsDateString()
  data: string;
}
