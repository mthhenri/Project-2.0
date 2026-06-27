import type { Knex } from 'knex';

// Feriados nacionais brasileiros de DATA FIXA (mesmo dia/mês todo ano), para já
// popular o calendário e evitar o cadastro manual um a um. Todos entram como
// recorrente = true, tipo = FERIADO e duracao = INTEGRAL.
//
// Como recorrente = true, o CalendarioRepository.ehDiaNaoUtil casa apenas por
// mês e dia (EXTRACT(MONTH/DAY ...)), ignorando o ano — então o ano gravado em
// dia_data é só uma referência e NÃO afeta o comportamento. Usamos um ano de
// referência fixo (2024) para montar a data YYYY-MM-DD.
//
// Feriados móveis (Carnaval, Sexta-feira Santa, Corpus Christi) dependem da data
// da Páscoa, não têm dia/mês fixo e ficam de fora deste seed.
const ANO_REFERENCIA = 2024;

const FERIADOS_NACIONAIS_FIXOS: ReadonlyArray<{
  mes: number;
  dia: number;
  descricao: string;
}> = [
  { mes: 1,  dia: 1,  descricao: 'Confraternização Universal' },
  { mes: 4,  dia: 21, descricao: 'Tiradentes' },
  { mes: 5,  dia: 1,  descricao: 'Dia do Trabalho' },
  { mes: 9,  dia: 7,  descricao: 'Independência do Brasil' },
  { mes: 10, dia: 12, descricao: 'Nossa Senhora Aparecida' },
  { mes: 11, dia: 2,  descricao: 'Finados' },
  { mes: 11, dia: 15, descricao: 'Proclamação da República' },
  { mes: 11, dia: 20, descricao: 'Dia Nacional de Zumbi e da Consciência Negra' },
  { mes: 12, dia: 25, descricao: 'Natal' },
];

/** Monta a data YYYY-MM-DD no ano de referência (só mês/dia importam). */
function montarDataReferencia(mes: number, dia: number): string {
  const mesFormatado = String(mes).padStart(2, '0');
  const diaFormatado = String(dia).padStart(2, '0');
  return `${ANO_REFERENCIA}-${mesFormatado}-${diaFormatado}`;
}

export async function up(knex: Knex): Promise<void> {
  // Idempotente: cada feriado só é inserido se ainda não houver um recorrente ativo
  // com o mesmo mês/dia. O critério casa por mês e dia (não pelo ano de referência),
  // evitando duplicar um feriado de data fixa já cadastrado e preservando eventuais
  // registros não-recorrentes homônimos.
  for (const feriado of FERIADOS_NACIONAIS_FIXOS) {
    await knex.raw(
      `INSERT INTO dia_nao_util (dia_data, descricao, tipo, recorrente, duracao, created_date, updated_date, is_deleted)
       SELECT :diaData, :descricao, 'FERIADO', true, 'INTEGRAL', NOW(), NOW(), false
       WHERE NOT EXISTS (
         SELECT 1 FROM dia_nao_util
         WHERE dia_nao_util.recorrente = true
           AND dia_nao_util.is_deleted = false
           AND EXTRACT(MONTH FROM dia_nao_util.dia_data) = :mes
           AND EXTRACT(DAY   FROM dia_nao_util.dia_data) = :dia
       )`,
      {
        diaData: montarDataReferencia(feriado.mes, feriado.dia),
        descricao: feriado.descricao,
        mes: feriado.mes,
        dia: feriado.dia,
      },
    );
  }
}

export async function down(knex: Knex): Promise<void> {
  // Remove apenas as linhas ATIVAS semeadas, pelo mesmo critério de identidade
  // (mês/dia + recorrente). O filtro is_deleted = false evita apagar registros
  // soft-deletados ou não-recorrentes que já existiam antes do seed.
  for (const feriado of FERIADOS_NACIONAIS_FIXOS) {
    await knex.raw(
      `DELETE FROM dia_nao_util
       WHERE dia_nao_util.recorrente = true
         AND dia_nao_util.is_deleted = false
         AND EXTRACT(MONTH FROM dia_nao_util.dia_data) = :mes
         AND EXTRACT(DAY   FROM dia_nao_util.dia_data) = :dia`,
      { mes: feriado.mes, dia: feriado.dia },
    );
  }
}
