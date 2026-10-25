import { PropostaIaNivelEnum } from '../../enums/proposta-ia-nivel.enum';

/**
 * O nível de autonomia da IA por regra de proposta (task 228): chave (`ChaveDeNivelDaProposta`: o tipo da proposta ou um caso dele) → nível.
 * Só as regras configuráveis aparecem, e só com `FAZ_E_AVISA` ou `PERGUNTA`; a que falta vale o padrão do `shared`.
 */
export type PropostaIaNiveisDto = Partial<Record<string, PropostaIaNivelEnum>>;
