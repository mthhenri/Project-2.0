import { IsInt, IsOptional, Max, Min, ValidateIf } from 'class-validator';

/**
 * Muda o grupo e/ou a posição de uma tabela no diagrama (só gestor). O nome da tabela vem da rota. Campo ausente = manter o que está
 * gravado agora no servidor (assim arrastar não desfaz uma troca de grupo feita por outra pessoa, e trocar o grupo não desfaz a
 * posição). `grupoId` nulo = "Sem grupo"; `x` e `y` vão sempre juntos.
 */
export class ModelagemTabelaAlterarDto {
  @IsOptional()
  @IsInt()
  grupoId?: number | null;

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
