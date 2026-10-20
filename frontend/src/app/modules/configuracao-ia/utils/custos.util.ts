import { IaCustoPeriodoDto } from '@project20/shared';
import { GraficoBarrasCategoria } from '../../../shared/components/grafico-barras/grafico-barras.component';

const MESES_ABREVIADOS = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'] as const;
const MESES_POR_EXTENSO = ['janeiro', 'fevereiro', 'março', 'abril', 'maio', 'junho', 'julho', 'agosto', 'setembro', 'outubro', 'novembro', 'dezembro'] as const;

export const COR_CUSTO = 'var(--p-primary-500)';

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

/** Uma barra de custo por dia (recorte de mês) ou por mês (recorte de ano). */
export function montarCategoriasDeCusto(periodos: readonly IaCustoPeriodoDto[]): GraficoBarrasCategoria[] {
  return periodos.map((periodo) => {
    const partes = periodo.periodo.split('-');
    const eMensal = partes.length === 3;
    const rotulo = eMensal ? String(Number(partes[2])) : MESES_ABREVIADOS[Number(partes[1]) - 1];
    const quando = eMensal ? `${Number(partes[2])} de ${MESES_POR_EXTENSO[Number(partes[1]) - 1]}` : `${MESES_POR_EXTENSO[Number(partes[1]) - 1]} de ${partes[0]}`;
    return {
      rotulo,
      descricao: quando,
      barras: [
        {
          valor: periodo.custoDolar,
          cor: COR_CUSTO,
          rotulo: periodo.custoDolar > 0 ? formatarDolar(periodo.custoDolar).replace('US$', '').trim() : '',
          descricao: `${quando}: ${formatarDolar(periodo.custoDolar)} em ${periodo.chamadas} ${periodo.chamadas === 1 ? 'chamada' : 'chamadas'} (${formatarTokens(periodo.tokens)} tokens)`,
        },
      ],
    };
  });
}
