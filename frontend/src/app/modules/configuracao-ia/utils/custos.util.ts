import { IaCustoModeloDto, IaCustoPeriodoDto, NivelIaEnum, rotuloDoNivelIa } from '@project20/shared';
import { ProvedorDeModelo, TONS_DO_PROVEDOR } from '../../../shared/utils/tons-de-provedor';
import { GraficoBarrasCategoria } from '../../../shared/components/grafico-barras/grafico-barras.component';

const MESES_ABREVIADOS = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'] as const;
const MESES_POR_EXTENSO = ['janeiro', 'fevereiro', 'março', 'abril', 'maio', 'junho', 'julho', 'agosto', 'setembro', 'outubro', 'novembro', 'dezembro'] as const;

/** Dólar em pt-BR ("US$ 1.234,56"). Valor pequeno mas não nulo ganha 4 casas para não virar "US$ 0,00". */
export function formatarDolar(valor: number): string {
    const casas = valor > 0 && valor < 0.01 ? 4 : 2;
    return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'USD', minimumFractionDigits: casas, maximumFractionDigits: casas }).format(valor);
}

/** Quantidade de tokens legível: "950", "12,3 mil", "4,56 mi". */
export function formatarTokens(quantidade: number): string {
    const formato = (valor: number, casas: number) => new Intl.NumberFormat('pt-BR', { maximumFractionDigits: casas }).format(valor);
    if (quantidade >= 1_000_000) return `${formato(quantidade / 1_000_000, 2)} mi`;
    if (quantidade >= 10_000) return `${formato(quantidade / 1_000, 1)} mil`;
    return formato(quantidade, 0);
}

/** "outubro de 2026" ou, no recorte anual, "2026". */
export function rotuloDoRecorte(ano: number, mes: number | null): string {
    return mes === null ? String(ano) : `${MESES_POR_EXTENSO[mes - 1]} de ${ano}`;
}

const ORDEM_DOS_PROVEDORES: readonly ProvedorDeModelo[] = ['ANTHROPIC', 'GOOGLE', 'OPENAI', 'OUTRO'];
const FORCA_DO_NIVEL: Record<NivelIaEnum, number> = { RAPIDO: 0, PADRAO: 1, ANALITICO: 2 };

/** O provedor pelo nome do modelo (`claude-*`, `gemini-*`, `gpt-*`/`o1`/`o3`...). */
export function provedorDoModelo(modelo: string): ProvedorDeModelo {
    const nome = modelo.toLowerCase();
    if (nome.startsWith('claude')) return 'ANTHROPIC';
    if (nome.startsWith('gemini') || nome.startsWith('gemma')) return 'GOOGLE';
    if (nome.startsWith('gpt') || /^o\d/.test(nome) || nome.startsWith('chatgpt')) return 'OPENAI';
    return 'OUTRO';
}

export interface LegendaDeCusto {
    modelo: string;
    cor: string;
}

/** O modelo e os níveis que a configuração ativa lhe dá (como vêm na consulta de custos). */
export type ModeloDeCusto = Pick<IaCustoModeloDto, 'modelo' | 'niveis'>;

/**
 * Uma cor por modelo: o provedor dá a família e o nível dá o tom (rápido mais claro, padrão médio, analítico mais escuro). Um modelo que serve
 * a mais de um nível usa o mais forte; um modelo fora da configuração ativa (só histórico) usa o tom médio. A lista é a de todos os modelos
 * da consulta, não a do dia, para a cor de um modelo não mudar de um dia para o outro.
 */
export function montarLegendaDeCusto(modelos: readonly ModeloDeCusto[]): LegendaDeCusto[] {
    const unicos = [...new Map([...modelos].reverse().map((modelo) => [modelo.modelo, modelo])).values()];
    return unicos
        .sort(
            (primeiro, segundo) =>
                ORDEM_DOS_PROVEDORES.indexOf(provedorDoModelo(primeiro.modelo)) - ORDEM_DOS_PROVEDORES.indexOf(provedorDoModelo(segundo.modelo)) ||
        primeiro.modelo.localeCompare(segundo.modelo),
        )
        .map(({ modelo, niveis }) => {
            const maisForte = niveis.reduce<NivelIaEnum | null>((atual, nivel) => (atual === null || FORCA_DO_NIVEL[nivel] > FORCA_DO_NIVEL[atual] ? nivel : atual), null);
            return { modelo, cor: TONS_DO_PROVEDOR[provedorDoModelo(modelo)][maisForte ?? NivelIaEnum.PADRAO] };
        });
}

/** Uma coluna de custo por dia (recorte de mês) ou por mês (recorte de ano), empilhada: um segmento por modelo, com o total no topo. */
export function montarCategoriasDeCusto(periodos: readonly IaCustoPeriodoDto[], modelosDaConsulta: readonly ModeloDeCusto[] = []): GraficoBarrasCategoria[] {
    const legenda = montarLegendaDeCusto([...modelosDaConsulta, ...periodos.flatMap((periodo) => periodo.modelos.map((parte) => ({ modelo: parte.modelo, niveis: [] })))]);
    const coresPorModelo = new Map(legenda.map((item) => [item.modelo, item.cor]));
    const ordemDosModelos = legenda.map((item) => item.modelo);
    return periodos.map((periodo) => {
        const partes = periodo.periodo.split('-');
        const eMensal = partes.length === 3;
        const rotulo = eMensal ? String(Number(partes[2])) : MESES_ABREVIADOS[Number(partes[1]) - 1];
        const quando = eMensal ? `${Number(partes[2])} de ${MESES_POR_EXTENSO[Number(partes[1]) - 1]}` : `${MESES_POR_EXTENSO[Number(partes[1]) - 1]} de ${partes[0]}`;
        const segmentos = periodo.modelos
            .filter((parte) => parte.custoDolar > 0)
            .sort((primeiro, segundo) => ordemDosModelos.indexOf(primeiro.modelo) - ordemDosModelos.indexOf(segundo.modelo));
        const totalComoRotulo = periodo.custoDolar > 0 ? formatarDolar(periodo.custoDolar).replace('US$', '').trim() : '';
        return {
            rotulo,
            descricao: `${quando}: ${formatarDolar(periodo.custoDolar)} em ${periodo.mensagens} ${periodo.mensagens === 1 ? 'mensagem' : 'mensagens'} da IA (${formatarTokens(periodo.tokens)} tokens)`,
            barras: segmentos.map((parte, posicao) => ({
                valor: parte.custoDolar,
                cor: coresPorModelo.get(parte.modelo) as string,
                rotulo: posicao === segmentos.length - 1 ? totalComoRotulo : '',
                descricao: `${quando} · ${parte.modelo}: ${formatarDolar(parte.custoDolar)} em ${parte.mensagens} ${parte.mensagens === 1 ? 'mensagem' : 'mensagens'} (${formatarTokens(parte.tokens)} tokens)`,
            })),
        };
    });
}

export interface UsoDoModeloNoNivel {
    chave: string;
    /** "Rápido · principal" ou "Analítico · contingência". */
    rotulo: string;
    principal: boolean;
}

/** Em que níveis a configuração ativa usa o modelo, e se ele abre a cadeia do nível (principal) ou é a contingência. Vazio: modelo fora de uso. */
export function usosDoModeloNosNiveis(modelo: Pick<IaCustoModeloDto, 'niveis' | 'niveisPrincipais'>): UsoDoModeloNoNivel[] {
    return modelo.niveis.map((nivel) => {
        const principal = modelo.niveisPrincipais.includes(nivel);
        const nome = rotuloDoNivelIa(nivel);
        return { chave: nivel, rotulo: `${nome.charAt(0).toUpperCase()}${nome.slice(1)} · ${principal ? 'principal' : 'contingência'}`, principal };
    });
}
