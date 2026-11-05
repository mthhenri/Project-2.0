import { NivelIaEnum, TipoProvedorIaEnum } from '@project20/shared';

/** O provedor de um modelo como as telas de IA o agrupam: os três provedores e `OUTRO` para o nome que não casa com nenhum. */
export type ProvedorDeModelo = `${TipoProvedorIaEnum}` | 'OUTRO';

/**
 * A cor de cada provedor, em três tons por nível do modelo: laranja para a Anthropic, azul para o Google (Gemini), cinza para a OpenAI. Quanto
 * mais forte o nível, mais escuro. Fonte única das telas de IA: o gráfico de custos usa os três tons (uma barra só precisa distinguir os modelos)
 * e a configuração da IA usa só o tom médio (as caixas já estão separadas por nível).
 */
export const TONS_DO_PROVEDOR: Record<ProvedorDeModelo, Record<NivelIaEnum, string>> = {
    ANTHROPIC: { RAPIDO: '#fdba74', PADRAO: '#f97316', ANALITICO: '#c2410c' },
    GOOGLE: { RAPIDO: '#93c5fd', PADRAO: '#3b82f6', ANALITICO: '#1d4ed8' },
    OPENAI: { RAPIDO: '#d1d5db', PADRAO: '#6b7280', ANALITICO: '#374151' },
    OUTRO: { RAPIDO: '#5eead4', PADRAO: '#14b8a6', ANALITICO: '#0f766e' },
};

/** O tom médio do provedor: a cor das caixas na configuração. */
export function tomMedioDoProvedor(provedor: ProvedorDeModelo): string {
    return TONS_DO_PROVEDOR[provedor][NivelIaEnum.PADRAO];
}
