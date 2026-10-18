import { Type } from 'class-transformer';
import { IsInt, IsOptional, Min } from 'class-validator';

/**
 * Entrada da ferramenta `consultar_execucao_ativa`: por padrão a execução em andamento do próprio usuário; o gestor pode informar o
 * `usuarioId` (de `listar_usuarios`) para ver a de outra pessoa.
 */
export class ExecucaoAtivaConsultarDto {
  @IsOptional()
  @IsInt()
  @Min(1)
  @Type(() => Number)
  usuarioId?: number;
}
