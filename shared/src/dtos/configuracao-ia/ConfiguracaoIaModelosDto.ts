import { TipoProvedorIaEnum } from '../../enums/tipo-provedor-ia.enum';

/** Os três modelos de um provedor (um por nível). O nome de um modelo não vale em outro provedor. */
export interface ConfiguracaoIaModelosDto {
  modeloRapido: string;
  modeloPadrao: string;
  modeloAnalitico: string;
}

/**
 * Os modelos de cada provedor, guardados mesmo quando o provedor está fora da cadeia: trocar o padrão de volta para um provedor
 * já usado reaproveita o que foi digitado. Só os provedores da cadeia precisam estar presentes.
 */
export type ConfiguracaoIaModelosPorProvedorDto = Partial<Record<TipoProvedorIaEnum, ConfiguracaoIaModelosDto>>;
