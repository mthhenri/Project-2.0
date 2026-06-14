import { ApiProperty } from '@nestjs/swagger';
import { DemandaGrafoNoDto } from './DemandaGrafoNoDto';
import { DemandaGrafoArestaDto } from './DemandaGrafoArestaDto';

export class DemandaGrafoDto {
  @ApiProperty({ type: [DemandaGrafoNoDto] })
  nos: DemandaGrafoNoDto[];

  @ApiProperty({ type: [DemandaGrafoArestaDto] })
  arestas: DemandaGrafoArestaDto[];
}
