import { IsInt, IsString, Min } from 'class-validator';

/** Uma chamada bem-sucedida à IA, para o custo (task 201): o modelo que respondeu e os tokens dela. Interno, nunca vem de uma rota. */
export class IaUsoRegistrarDto {
  @IsString()
  modelo: string;

  @IsInt()
  @Min(0)
  tokensEntrada: number;

  @IsInt()
  @Min(0)
  tokensSaida: number;

  /** Tokens lidos do cache do provedor (cobrados à parte, mais baratos). */
  @IsInt()
  @Min(0)
  tokensCache: number;
}
