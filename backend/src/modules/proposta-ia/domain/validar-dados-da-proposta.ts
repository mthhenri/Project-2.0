import { plainToInstance } from 'class-transformer';
import { validateSync } from 'class-validator';
import { BusinessException } from '../../../core/exceptions/business.exception';

/**
 * Valida os dados de uma proposta contra a classe do `shared` (a mesma que valida a entrada da ferramenta) e devolve a instância
 * convertida. Campo desconhecido é recusado: o cartão "Ajustar" não grava nada que o executor não conheça. Lança `BusinessException`.
 */
export function validarDadosDaProposta<T extends object>(classe: new () => T, dados: Record<string, unknown>): T {
  const instancia = plainToInstance(classe, dados);
  const problemas = validateSync(instancia, { whitelist: true, forbidNonWhitelisted: true, forbidUnknownValues: false });
  if (problemas.length > 0) {
    const detalhes = problemas.flatMap((problema) => Object.values(problema.constraints ?? {})).join('; ');
    throw new BusinessException(`Dados da proposta inválidos: ${detalhes}`);
  }
  return instancia;
}
