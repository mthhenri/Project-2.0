import { Type } from 'class-transformer';
import { IsBoolean, IsInt, IsOptional, Min } from 'class-validator';

/** Entrada da ferramenta `listar_minhas_atividades`. */
export class MinhasAtividadesListarDto {
  /** Só o gestor: as atividades de outra pessoa (`usuarioId` de `listar_usuarios`); sem ele, as do próprio usuário. */
  @IsOptional()
  @IsInt()
  @Min(1)
  @Type(() => Number)
  usuarioId?: number;

  /** Por padrão só as atividades em aberto (planejada, pendente e desenvolvendo); `true` inclui as desenvolvidas. */
  @IsOptional()
  @IsBoolean()
  incluirDesenvolvidas?: boolean;
}
