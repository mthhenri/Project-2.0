import { Type } from 'class-transformer';
import { IsIn, IsInt, IsNumber, IsOptional, IsString, Matches, MaxLength, Min, MinLength } from 'class-validator';
import { MENSAGEM_CARACTERES_PROIBIDOS, REGEX_SEM_CARACTERES_PROIBIDOS } from '../../validators/caracteres-proibidos.validator';

export const ESCOLHAS_APOS_DESCREVER = ['CONTINUAR', 'TROCAR'] as const;
export type EscolhaAposDescrever = (typeof ESCOLHAS_APOS_DESCREVER)[number];

/**
 * Entrada da ferramenta `propor_descrever_execucao`: o **relato** do desenvolvedor (a narrativa crua, que não é guardada na execução) e
 * o que fazer depois de descrever: `CONTINUAR` na mesma atividade (padrão) ou `TROCAR` para outra (`atividadeSeguinteId`). A descrição
 * formal é redigida pelo sistema (nível padrão, prompt `DESCRICAO_EXECUCAO`), não pelo modelo da conversa.
 */
export class ProporDescreverExecucaoDto {
  @IsString()
  @MinLength(3)
  @MaxLength(4000)
  relato: string;

  @IsOptional()
  @IsIn(ESCOLHAS_APOS_DESCREVER)
  escolha?: EscolhaAposDescrever;

  /** Só em TROCAR: a atividade que o desenvolvedor vai começar (id de `listar_minhas_atividades`). */
  @IsOptional()
  @IsInt()
  @Min(1)
  @Type(() => Number)
  atividadeSeguinteId?: number;

  /** Descrição provisória do trecho seguinte (opcional; sem ela, o sistema usa um texto padrão). */
  @IsOptional()
  @IsString()
  @MaxLength(1000)
  @Matches(REGEX_SEM_CARACTERES_PROIBIDOS, { message: MENSAGEM_CARACTERES_PROIBIDOS })
  descricaoSeguinte?: string;
}

/**
 * Os dados da proposta `DESCREVER_EXECUCAO`: a descrição formal já redigida (editável no cartão), a escolha, a execução a que se
 * refere (para recusar a proposta velha se a execução em andamento mudou) e nomes só para o cartão.
 */
export class PropostaDescreverExecucaoDadosDto {
  @IsString()
  @MinLength(3)
  @MaxLength(2000)
  @Matches(REGEX_SEM_CARACTERES_PROIBIDOS, { message: MENSAGEM_CARACTERES_PROIBIDOS })
  descricao: string;

  @IsIn(ESCOLHAS_APOS_DESCREVER)
  escolha: EscolhaAposDescrever;

  @IsOptional()
  @IsInt()
  @Min(1)
  @Type(() => Number)
  atividadeSeguinteId?: number;

  @IsOptional()
  @IsString()
  @MaxLength(1000)
  @Matches(REGEX_SEM_CARACTERES_PROIBIDOS, { message: MENSAGEM_CARACTERES_PROIBIDOS })
  descricaoSeguinte?: string;

  /** A execução descrita (a ativa quando a proposta nasceu). */
  @IsOptional()
  @IsInt()
  @Min(1)
  @Type(() => Number)
  execucaoId?: number;

  @IsOptional()
  @IsString()
  atividadeNome?: string;

  @IsOptional()
  @IsString()
  demandaNome?: string;

  @IsOptional()
  @IsString()
  atividadeSeguinteNome?: string;

  /** Quanto tempo a execução tinha quando a proposta nasceu. */
  @IsOptional()
  @IsNumber()
  minutos?: number;
}
