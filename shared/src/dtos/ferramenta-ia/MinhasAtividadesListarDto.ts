import { IsBoolean, IsOptional } from 'class-validator';

/** Entrada da ferramenta `listar_minhas_atividades`. */
export class MinhasAtividadesListarDto {
  /** Por padrão só as atividades em aberto (planejada, pendente e desenvolvendo); `true` inclui as desenvolvidas. */
  @IsOptional()
  @IsBoolean()
  incluirDesenvolvidas?: boolean;
}
