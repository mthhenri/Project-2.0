import { IsInt, Max, Min, ValidateIf } from 'class-validator';

/**
 * Põe uma tabela na modelagem (num grupo) ou muda o grupo e/ou a posição dela (só gestor). O nome da tabela vem da rota. Campo
 * ausente = manter o que está gravado agora no servidor (assim arrastar não desfaz uma troca de grupo feita por outra pessoa, e
 * trocar o grupo não desfaz a posição); `x` e `y` vão sempre juntos. Tirar a tabela da modelagem é outra rota (`DELETE`).
 */
export class ModelagemTabelaAlterarDto {
  @ValidateIf((dto: ModelagemTabelaAlterarDto) => dto.grupoId !== undefined)
  @IsInt()
  @Min(1)
  grupoId?: number;

  @ValidateIf((dto: ModelagemTabelaAlterarDto) => dto.x !== undefined || dto.y !== undefined)
  @IsInt()
  @Min(-100000)
  @Max(100000)
  x?: number;

  @ValidateIf((dto: ModelagemTabelaAlterarDto) => dto.x !== undefined || dto.y !== undefined)
  @IsInt()
  @Min(-100000)
  @Max(100000)
  y?: number;
}
