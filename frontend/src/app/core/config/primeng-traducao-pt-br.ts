import { Translation } from 'primeng/api';

/**
 * Tradução pt-BR do PrimeNG, aplicada globalmente via `providePrimeNG`.
 * Cobre principalmente os rótulos do `p-datepicker` (nomes de meses e dias),
 * além de textos genéricos de filtros e ações reutilizados pelos componentes.
 */
export const TRADUCAO_PT_BR: Translation = {
  dayNames: ['Domingo', 'Segunda-feira', 'Terça-feira', 'Quarta-feira', 'Quinta-feira', 'Sexta-feira', 'Sábado'],
  dayNamesShort: ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'],
  dayNamesMin: ['D', 'S', 'T', 'Q', 'Q', 'S', 'S'],
  monthNames: [
    'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
    'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro',
  ],
  monthNamesShort: ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'],
  today: 'Hoje',
  clear: 'Limpar',
  dateFormat: 'dd/mm/yy',
  firstDayOfWeek: 0,
  weekHeader: 'Sem',
  chooseYear: 'Escolher ano',
  chooseMonth: 'Escolher mês',
  chooseDate: 'Escolher data',
  prevDecade: 'Década anterior',
  nextDecade: 'Próxima década',
  prevYear: 'Ano anterior',
  nextYear: 'Próximo ano',
  prevMonth: 'Mês anterior',
  nextMonth: 'Próximo mês',
  prevHour: 'Hora anterior',
  nextHour: 'Próxima hora',
  prevMinute: 'Minuto anterior',
  nextMinute: 'Próximo minuto',
  prevSecond: 'Segundo anterior',
  nextSecond: 'Próximo segundo',
  am: 'AM',
  pm: 'PM',
  accept: 'Sim',
  reject: 'Não',
  choose: 'Escolher',
  upload: 'Enviar',
  cancel: 'Cancelar',
  emptyMessage: 'Nenhum resultado encontrado',
  emptyFilterMessage: 'Nenhum resultado encontrado',
};
