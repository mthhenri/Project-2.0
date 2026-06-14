import { IsNumber, Min } from 'class-validator';

export class DemandaUsuarioAtribuirDto {
  @IsNumber()
  @Min(1)
  usuarioId: number;
}
