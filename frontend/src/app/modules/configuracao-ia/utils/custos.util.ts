import { IaCustoPeriodoDto } from '@project20/shared';
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

export type ProvedorDeModelo = 'ANTHROPIC' | 'GOOGLE' | 'OPENAI' | 'OUTRO';

/** Tons de cada provedor, do mais escuro ao mais claro: laranja para a Anthropic, azul para o Google (Gemini), cinza para a OpenAI. */
const TONS_DO_PROVEDOR: Record<ProvedorDeModelo, readonly string[]> = {
  ANTHROPIC: ['#c2410c', '#ea580c', '#f97316', '#fb923c', '#fdba74'],
  GOOGLE: ['#1d4ed8', '#2563eb', '#3b82f6', '#60a5fa', '#93c5fd'],
  OPENAI: ['#374151', '#4b5563', '#6b7280', '#9ca3af', '#d1d5db'],
  OUTRO: ['#0f766e', '#14b8a6', '#5eead4'],
};
const ORDEM_DOS_PROVEDORES: readonly ProvedorDeModelo[] = ['ANTHROPIC', 'GOOGLE', 'OPENAI', 'OUTRO'];

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

/**
 * Uma cor por modelo: o provedor dá a família e a posição do modelo entre os do mesmo provedor (ordem de nome) dá o tom. A lista é a de
 * todos os modelos da consulta, não a do dia, para a cor de um modelo não mudar de um dia para o outro.
 */
export function montarLegendaDeCusto(modelos: readonly string[]): LegendaDeCusto[] {
  const ordenados = [...new Set(modelos)].sort(
    (primeiro, segundo) =>
      ORDEM_DOS_PROVEDORES.indexOf(provedorDoModelo(primeiro)) - ORDEM_DOS_PROVEDORES.indexOf(provedorDoModelo(segundo)) || primeiro.localeCompare(segundo),
  );
  const contagemPorProvedor = new Map<ProvedorDeModelo, number>();
  return ordenados.map((modelo) => {
    const provedor = provedorDoModelo(modelo);
    const posicao = contagemPorProvedor.get(provedor) ?? 0;
    contagemPorProvedor.set(provedor, posicao + 1);
    const tons = TONS_DO_PROVEDOR[provedor];
    return { modelo, cor: tons[posicao % tons.length] };
  });
}

/** Uma coluna de custo por dia (recorte de mês) ou por mês (recorte de ano), empilhada: um segmento por modelo, com o total no topo. */
export function montarCategoriasDeCusto(periodos: readonly IaCustoPeriodoDto[], modelosDaConsulta: readonly string[] = []): GraficoBarrasCategoria[] {
  const legenda = montarLegendaDeCusto([...modelosDaConsulta, ...periodos.flatMap((periodo) => periodo.modelos.map((parte) => parte.modelo))]);
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
