import { IsString, IsNotEmpty, MinLength } from 'class-validator';
import { Transform } from 'class-transformer';
import { ApiProperty } from '@nestjs/swagger';

export class AutenticacaoLoginDto {
  @ApiProperty({ example: 'joao.silva' })
  @Transform(({ value }) => value?.toLowerCase().trim())
  @IsString()
  @MinLength(4)
  login: string;

  @ApiProperty({ example: 'senha@123' })
  @IsString()
  @IsNotEmpty()
  senha: string;
}
