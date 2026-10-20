import { ProjetoVolumeAnualResumoDto, ProjetoVolumeResumoDto } from '@project20/shared';
import { formatarTempoExibicao } from '../../../core/models/visualizacao-tempo.model';
import { GraficoBarrasCategoria } from '../../../shared/components/grafico-barras/grafico-barras.component';
import { montarLinhaDeVolume } from './volume-projeto.util';

export const MESES_ABREVIADOS = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'] as const;

/** Cores do gráfico: barra do esperado, e o vermelho do estouro (o mesmo do Planejamento de demandas). */
export const COR_VOLUME_ESPERADO = 'var(--app-surface-300)';
export const COR_VOLUME_ESTOURO = 'var(--p-red-500)';

const minutosParaHoras = (minutos: number): number => Math.round((minutos / 60) * 100) / 100;

/**
 * Visão mensal: uma categoria por projeto com duas barras, as horas gastas (cor do projeto, vermelha acima do esperado) e as esperadas.
 * Projeto sem volume definido leva só a barra de gastas, e o tooltip diz isso. Valores em horas; os rótulos seguem a preferência horas/dias.
 */
export function montarCategoriasMensais(itens: readonly ProjetoVolumeResumoDto[], emDias: boolean): GraficoBarrasCategoria[] {
  return itens.map((item) => {
    const linha = montarLinhaDeVolume(item);
    const gasto = formatarTempoExibicao(item.minutosGastos, emDias, 'minutos');
    const barraGasta = {
      valor: minutosParaHoras(item.minutosGastos),
      cor: linha.estourou ? COR_VOLUME_ESTOURO : item.cor,
      destaque: linha.estourou,
      rotulo: gasto,
      descricao: linha.minutosEsperados === null
        ? `${item.nome}: ${gasto} gastas, sem volume definido`
        : `${item.nome}: ${gasto} gastas de ${formatarTempoExibicao(linha.minutosEsperados, emDias, 'minutos')}${linha.percentual === null ? '' : ` (${linha.percentual}%)`}${linha.estourou ? ', acima do esperado' : ''}`,
    };
    const barras = linha.minutosEsperados === null
      ? [barraGasta]
      : [barraGasta, {
          valor: item.volumeEsperadoHorasMes!,
          cor: COR_VOLUME_ESPERADO,
          rotulo: formatarTempoExibicao(linha.minutosEsperados, emDias, 'minutos'),
          descricao: `${item.nome}: ${formatarTempoExibicao(linha.minutosEsperados, emDias, 'minutos')} esperadas no mês`,
        }];
    return { rotulo: item.codigo, descricao: item.nome, barras };
  });
}

/** Visão anual de um projeto: doze categorias (os meses), uma barra de horas gastas cada, vermelha no mês acima do esperado. */
export function montarCategoriasAnuais(item: ProjetoVolumeAnualResumoDto, emDias: boolean): GraficoBarrasCategoria[] {
  const minutosEsperados = item.volumeEsperadoHorasMes === null ? null : item.volumeEsperadoHorasMes * 60;
  return item.minutosGastosPorMes.map((minutos, indice) => {
    const estourou = minutosEsperados !== null && minutos > minutosEsperados;
    const gasto = formatarTempoExibicao(minutos, emDias, 'minutos');
    return {
      rotulo: MESES_ABREVIADOS[indice],
      barras: [{
        valor: minutosParaHoras(minutos),
        cor: estourou ? COR_VOLUME_ESTOURO : item.cor,
        destaque: estourou,
        rotulo: minutos > 0 ? gasto : '',
        descricao: `${MESES_ABREVIADOS[indice]}: ${gasto}${minutosEsperados === null ? '' : ` de ${formatarTempoExibicao(minutosEsperados, emDias, 'minutos')}`}${estourou ? ', acima do esperado' : ''}`,
      }],
    };
  });
}
