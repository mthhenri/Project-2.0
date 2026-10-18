import { IsEnum, IsOptional, IsString, MaxLength } from 'class-validator';
import { TipoUsuarioEnum } from '../../enums/tipo-usuario.enum';

/** Entrada da ferramenta `listar_usuarios` (gestor): filtros opcionais; só usuários ativos voltam. */
export class UsuariosListarDto {
  @IsOptional()
  @IsEnum(TipoUsuarioEnum)
  tipo?: TipoUsuarioEnum;

  /** Parte do nome ou do login. */
  @IsOptional()
  @IsString()
  @MaxLength(100)
  busca?: string;
}

/** Um usuário como a IA o lê: nunca inclui senha nem dado de acesso. */
export interface UsuarioDaFerramentaDto {
  id: number;
  nome: string;
  login: string;
  cargo: string;
  tipo: string;
}

/** O que a ferramenta `listar_usuarios` devolve à IA. */
export interface UsuariosListadosDto {
  usuarios: UsuarioDaFerramentaDto[];
  total: number;
  haMais: boolean;
}
