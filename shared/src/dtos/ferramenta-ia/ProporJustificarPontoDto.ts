import { IsOptional, IsString } from 'class-validator';
import { PontoJustificativaCriarDto } from '../ponto-justificativa/PontoJustificativaCriarDto';

/**
 * Entrada da ferramenta `propor_justificar_ponto` (só gestor) e, com o nome da pessoa para o cartão, os dados da proposta `JUSTIFICAR_PONTO`:
 * os mesmos campos da tela de justificativas, para o ponto de **outra pessoa**. As regras (jornada, um dia, duplicidade) são da service.
 */
export class ProporJustificarPontoDto extends PontoJustificativaCriarDto {}

/** Os dados guardados na proposta: a entrada mais o nome da pessoa e a jornada dela, só para o cartão mostrar. */
export class PropostaJustificarPontoDadosDto extends ProporJustificarPontoDto {
  @IsOptional()
  @IsString()
  usuarioNome?: string;
}
