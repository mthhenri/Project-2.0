import { IsString, IsNotEmpty, MaxLength, Matches } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class TagCriarDto {
  @ApiProperty({ example: 'Backend' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  nome: string;

  @ApiProperty({ example: '#6366f1' })
  @IsString()
  @Matches(/^#[0-9A-Fa-f]{6}$/)
  cor: string;
}
