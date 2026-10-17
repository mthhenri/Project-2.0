import { IsObject } from 'class-validator';

/** Os dados corrigidos pelo usuário; a ação roda com eles. */
export class PropostaIaAjustarDto {
  @IsObject()
  dados: Record<string, unknown>;
}
