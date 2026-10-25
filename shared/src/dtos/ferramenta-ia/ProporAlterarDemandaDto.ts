import { Type } from 'class-transformer';
import { IsEnum, IsInt, IsNumber, IsOptional, IsString, Matches, MaxLength, Min } from 'class-validator';
import { TipoDemandaStatusEnum } from '../../enums/tipo-demanda-status.enum';
import { MENSAGEM_CARACTERES_PROIBIDOS, REGEX_SEM_CARACTERES_PROIBIDOS } from '../../validators/caracteres-proibidos.validator';

/**
 * Entrada da ferramenta `propor_alterar_demanda` e, com os campos de exibição, os dados da proposta `ALTERAR_DEMANDA`. Ao menos um entre
 * `nome`, `status`, `horasEstimadas`, `previsaoFimData`, `acrescentarDocumentacao` e `demandaPaiId` deve mudar a demanda (a ferramenta
 * confere); o que não muda fica de fora. O desenvolvedor edita as demandas de que é membro (a service confere). As descrições seguem por
 * outra proposta.
 */
export class ProporAlterarDemandaDto {
  @IsInt()
  @Min(1)
  @Type(() => Number)
  demandaId: number;

  @IsOptional()
  @IsString()
  @MaxLength(255)
  @Matches(REGEX_SEM_CARACTERES_PROIBIDOS, { message: MENSAGEM_CARACTERES_PROIBIDOS })
  nome?: string;

  @IsOptional()
  @IsEnum(TipoDemandaStatusEnum)
  status?: TipoDemandaStatusEnum;

  /** Em horas inteiras (0 ou mais). */
  @IsOptional()
  @IsInt()
  @Min(0)
  @Type(() => Number)
  horasEstimadas?: number;

  /** `yyyy-mm-dd`. */
  @IsOptional()
  @Matches(/^\d{4}-\d{2}-\d{2}$/)
  previsaoFimData?: string;

  /** Markdown **acrescentado** ao fim da documentação que já existe (nunca a substitui). */
  @IsOptional()
  @IsString()
  @MaxLength(20000)
  acrescentarDocumentacao?: string;

  /** A nova demanda pai (de `listar_demandas_do_projeto`; estrutural, do mesmo projeto e fora da subárvore desta). Não move para o topo. */
  @IsOptional()
  @IsInt()
  @Min(1)
  @Type(() => Number)
  demandaPaiId?: number;
}

/** Os dados guardados na proposta: a entrada mais os nomes e os valores de antes, para o cartão mostrar o antes e o depois e para o desfazer. */
export class PropostaAlterarDemandaDadosDto extends ProporAlterarDemandaDto {
  /** O nome da demanda antes da proposta (e o que o cartão mostra em destaque). */
  @IsOptional()
  @IsString()
  demandaNome?: string;

  @IsOptional()
  @IsString()
  projetoNome?: string;

  /** Só presentes nos campos que a proposta muda. `previsaoAnteriorData` é nulo se não havia previsão. */
  @IsOptional()
  @IsEnum(TipoDemandaStatusEnum)
  statusAnterior?: TipoDemandaStatusEnum;

  @IsOptional()
  @IsNumber()
  horasAnteriores?: number;

  @IsOptional()
  @IsString()
  previsaoAnteriorData?: string | null;

  /** Só ao acrescentar documentação: a documentação de antes (nulo se não havia), para o cartão mostrar o diff por palavra. */
  @IsOptional()
  @IsString()
  documentacaoAnterior?: string | null;

  /** Só ao mover: o nome do pai de antes (`null` se estava no topo) e do novo. */
  @IsOptional()
  @IsString()
  paiAnteriorNome?: string | null;

  @IsOptional()
  @IsString()
  paiNovoNome?: string;

  /** Ao concluir: quantas atividades da demanda ainda não estão desenvolvidas (o cartão avisa; a regra de hoje não bloqueia). */
  @IsOptional()
  @IsNumber()
  atividadesEmAberto?: number;
}
