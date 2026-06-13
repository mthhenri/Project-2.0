import { IsString, MinLength } from 'class-validator';

export class UsuarioSenhaAlterarDto {
  @IsString()
  @MinLength(8)
  senhaAtual: string;

  @IsString()
  @MinLength(8)
  senhaNova: string;
}
