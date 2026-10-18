import { test } from 'node:test';
import * as assert from 'node:assert/strict';
import { TipoUsuarioEnum } from '@project20/shared';
import { ConfigService } from '../../../config/config.service';
import { ocorrenciasNoIntervalo } from '../domain/dias-nao-uteis-no-intervalo';
import { CalendarioService } from '../services/calendario.service';
import { ConsultarDiasNaoUteisFerramenta, LIMITE_DIAS_NAO_UTEIS_DA_FERRAMENTA } from './consultar-dias-nao-uteis.ferramenta';

const USUARIO = { sub: 7, login: 'dev', tipo: TipoUsuarioEnum.DESENVOLVEDOR } as never;
const configService = { obter: () => ({ aplicacao: { fusoHorario: 'America/Sao_Paulo' } }) } as unknown as ConfigService;

const NATAL = { id: 1, diaData: '2020-12-25', descricao: 'Natal', tipo: 'FERIADO', duracao: 'INTEGRAL', recorrente: true };
const RECESSO = { id: 2, diaData: '2026-10-12', descricao: 'Recesso', tipo: 'RECESSO', duracao: 'MEIO_PERIODO', recorrente: false };
const ANO_NOVO = { id: 3, diaData: '2020-01-01', descricao: 'Confraternização', tipo: 'FERIADO', duracao: 'INTEGRAL', recorrente: true };

test('os recorrentes valem em todo ano do intervalo e os fixos só na própria data', () => {
  const resultado = ocorrenciasNoIntervalo([NATAL, RECESSO, ANO_NOVO], '2026-10-01', '2027-02-28');
  assert.deepEqual(resultado.map((item) => item.data), ['2026-10-12', '2026-12-25', '2027-01-01']);
});

test('intervalo sem ocorrência devolve vazio e as bordas do intervalo contam', () => {
  assert.deepEqual(ocorrenciasNoIntervalo([NATAL], '2026-01-01', '2026-06-30'), []);
  assert.equal(ocorrenciasNoIntervalo([NATAL], '2026-12-25', '2026-12-25').length, 1);
});

function criar(cadastrados: unknown[]) {
  const servico = { listar: async () => ({ sucesso: true, dados: cadastrados, mensagem: '' }) };
  class Fixa extends ConsultarDiasNaoUteisFerramenta {
    protected agora(): Date { return new Date('2026-10-01T15:00:00Z'); }
  }
  return new Fixa(servico as unknown as CalendarioService, configService);
}

test('sem intervalo, olha os próximos 60 dias a partir de hoje no fuso', async () => {
  const resultado = await criar([NATAL, RECESSO]).executar({}, USUARIO);
  assert.equal(resultado.dataInicio, '2026-10-01');
  assert.equal(resultado.dataFim, '2026-11-30');
  assert.deepEqual(resultado.dias.map((dia) => dia.data), ['2026-10-12']);
  assert.equal(resultado.total, 1);
  assert.equal(resultado.haMais, false);
});

test('limita a resposta e avisa que há mais', async () => {
  const muitos = Array.from({ length: LIMITE_DIAS_NAO_UTEIS_DA_FERRAMENTA + 5 }, (_, indice) => ({
    id: indice, diaData: `2026-${String((indice % 12) + 1).padStart(2, '0')}-${String(Math.floor(indice / 12) + 1).padStart(2, '0')}`,
    descricao: `Dia ${indice}`, tipo: 'RECESSO', duracao: 'INTEGRAL', recorrente: false,
  }));
  const resultado = await criar(muitos).executar({ dataInicio: '2026-01-01', dataFim: '2026-12-31' }, USUARIO);
  assert.equal(resultado.dias.length, LIMITE_DIAS_NAO_UTEIS_DA_FERRAMENTA);
  assert.equal(resultado.total, LIMITE_DIAS_NAO_UTEIS_DA_FERRAMENTA + 5);
  assert.equal(resultado.haMais, true);
});
