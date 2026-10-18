import { IsString, Matches } from 'class-validator';

/** Altera a cor de uma prioridade (só administrador); o código vem da rota. */
export class AtividadePrioridadeCorAlterarDto {
  @IsString()
  @Matches(/^#[0-9a-fA-F]{6}$/, { message: 'cor deve estar no formato #rrggbb' })
  cor: string;
}
