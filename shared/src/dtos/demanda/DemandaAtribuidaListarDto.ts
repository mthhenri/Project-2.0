import { Type } from 'class-transformer';
import { IsInt, IsOptional, Min } from 'class-validator';

/**
 * Filtro de `GET /demanda/atribuidas`: as demandas que a tela oferece ao criar atividade.
 * Sem `usuarioId` valem as do próprio usuário do token; com ele, só o gestor e o administrador pedem as de outra pessoa
 * (as demandas em que ela é membro; quem tem visibilidade total vê todas), para a tela de nova atividade refazer a lista ao trocar o dono (task 377).
 */
export class DemandaAtribuidaListarDto {
    @IsOptional()
    @IsInt()
    @Min(1)
    @Type(() => Number)
    usuarioId?: number;
}
