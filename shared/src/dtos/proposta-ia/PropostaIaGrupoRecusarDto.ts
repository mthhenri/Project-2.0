import { Type } from 'class-transformer';
import { ArrayMaxSize, ArrayMinSize, ArrayUnique, IsArray, IsInt, Min } from 'class-validator';

/** As propostas do grupo a recusar de uma vez (task 227); todas precisam ser do usuário que chama. */
export class PropostaIaGrupoRecusarDto {
  @IsArray()
  @ArrayMinSize(1)
  @ArrayMaxSize(20)
  @ArrayUnique()
  @Type(() => Number)
  @IsInt({ each: true })
  @Min(1, { each: true })
  propostaIds: number[];
}
