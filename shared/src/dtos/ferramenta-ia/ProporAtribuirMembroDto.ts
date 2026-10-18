import { Type } from 'class-transformer';
import { IsIn, IsInt, IsOptional, IsString, Min } from 'class-validator';

export const ACOES_DE_MEMBRO = ['ADICIONAR', 'REMOVER'] as const;
export type AcaoDeMembro = (typeof ACOES_DE_MEMBRO)[number];

/**
 * Entrada da ferramenta `propor_atribuir_membro` (gestor) e, com os campos de exibição, os dados da proposta `ATRIBUIR_MEMBRO`:
 * adiciona ou remove **um desenvolvedor** (`usuarioId` de `listar_usuarios`) como membro de uma demanda. Gestores não entram em
 * `demanda_usuario` (o acesso deles é por tipo), então a ferramenta recusa atribuí-los.
 */
export class ProporAtribuirMembroDto {
  @IsInt()
  @Min(1)
  @Type(() => Number)
  demandaId: number;

  @IsInt()
  @Min(1)
  @Type(() => Number)
  usuarioId: number;

  @IsIn(ACOES_DE_MEMBRO)
  acao: AcaoDeMembro;
}

/** Os dados guardados na proposta: a entrada mais os nomes, só para o cartão mostrar. */
export class PropostaAtribuirMembroDadosDto extends ProporAtribuirMembroDto {
  @IsOptional()
  @IsString()
  demandaNome?: string;

  @IsOptional()
  @IsString()
  projetoNome?: string;

  @IsOptional()
  @IsString()
  usuarioNome?: string;

  @IsOptional()
  @IsString()
  usuarioCargo?: string;
}
