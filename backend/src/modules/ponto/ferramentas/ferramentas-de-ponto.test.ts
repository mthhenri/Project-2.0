import { test } from 'node:test';
import * as assert from 'node:assert/strict';
import { PontoConsultarDto, PontoMensalConsultarDto, TipoUsuarioEnum } from '@project20/shared';
import { ConfigService } from '../../../config/config.service';
import { PontoService } from '../services/ponto.service';
import { ConsultarPontoDoDiaFerramenta } from './consultar-ponto-do-dia.ferramenta';
import { ConsultarPontoDoMesFerramenta } from './consultar-ponto-do-mes.ferramenta';

const DESENVOLVEDOR = { sub: 7, login: 'dev', tipo: TipoUsuarioEnum.DESENVOLVEDOR } as never;
const GESTOR = { sub: 1, login: 'gestor', tipo: TipoUsuarioEnum.GESTOR } as never;

const configService = { obter: () => ({ aplicacao: { fusoHorario: 'America/Sao_Paulo' } }) } as unknown as ConfigService;

function criar() {
  const diarios: { dto: PontoConsultarDto; usuarioId: number }[] = [];
  const mensais: { dto: PontoMensalConsultarDto; usuarioId: number }[] = [];
  const servico = {
    consultarDiario: async (dto: PontoConsultarDto, usuarioAtivo: { sub: number }) => {
      diarios.push({ dto, usuarioId: usuarioAtivo.sub });
      return {
        data: dto.data, usuarioId: 7, nomeUsuario: 'Dev', ehDiaUtil: true, motivoNaoUtil: null, metaMinutos: 480,
        minutosTrabalhadosDiaUtil: 300, minutosTrabalhadosExtra: 0, totalMinutosTrabalhados: 300, saldoMinutos: -180,
        intervalos: [], execucoes: [{}, {}],
      };
    },
    consultarMensal: async (dto: PontoMensalConsultarDto, usuarioAtivo: { sub: number }) => {
      mensais.push({ dto, usuarioId: usuarioAtivo.sub });
      return {
        usuarioId: 7, nomeUsuario: 'Dev', ano: dto.ano, mes: dto.mes, diasUteisMes: 21, metaMinutosMes: 10080,
        totalMinutosTrabalhadosMes: 600, saldoMinutosMes: -9480,
        dias: [
          { data: '2026-10-01', totalMinutosTrabalhados: 300, saldoMinutos: -180, justificativaNome: null },
          { data: '2026-10-02', totalMinutosTrabalhados: 0, saldoMinutos: -480, justificativaNome: null },
          { data: '2026-10-05', totalMinutosTrabalhados: 0, saldoMinutos: 0, justificativaNome: 'Consulta médica' },
        ],
      };
    },
  };
  const pontoService = servico as unknown as PontoService;
  class DiaFixo extends ConsultarPontoDoDiaFerramenta {
    protected agora(): Date { return new Date('2026-10-18T15:00:00Z'); }
  }
  class MesFixo extends ConsultarPontoDoMesFerramenta {
    protected agora(): Date { return new Date('2026-10-18T15:00:00Z'); }
  }
  return { dia: new DiaFixo(pontoService, configService), mes: new MesFixo(pontoService, configService), diarios, mensais };
}

test('ponto do dia: sem data, é hoje no fuso, do usuário do token, e devolve só os totais', async () => {
  const { dia, diarios } = criar();
  const resultado = await dia.executar({}, DESENVOLVEDOR);
  assert.equal(diarios[0].dto.data, '2026-10-18');
  assert.equal(diarios[0].dto.usuarioId, undefined);
  assert.equal(diarios[0].usuarioId, 7);
  assert.deepEqual(resultado, {
    data: '2026-10-18', usuario: 'Dev', ehDiaUtil: true, motivoNaoUtil: null,
    metaMinutos: 480, trabalhadosMinutos: 300, extraMinutos: 0, saldoMinutos: -180, totalExecucoes: 2,
  });
});

test('ponto do dia: o usuarioId e a data informados seguem para a service, que decide a permissão', async () => {
  const { dia, diarios } = criar();
  await dia.executar({ data: '2026-10-10', usuarioId: 7 }, GESTOR);
  assert.deepEqual(diarios[0].dto, { data: '2026-10-10', usuarioId: 7 });
  assert.equal(diarios[0].usuarioId, 1);
});

test('ponto do mês: sem ano e mês, é o mês atual, e só os dias com trabalho ou justificativa voltam', async () => {
  const { mes, mensais } = criar();
  const resultado = await mes.executar({}, DESENVOLVEDOR);
  assert.deepEqual([mensais[0].dto.ano, mensais[0].dto.mes], [2026, 10]);
  assert.equal(resultado.metaMinutos, 10080);
  assert.equal(resultado.saldoMinutos, -9480);
  assert.deepEqual(resultado.dias.map((dia) => dia.data), ['2026-10-01', '2026-10-05']);
  assert.equal(resultado.dias[1].justificativa, 'Consulta médica');
});

test('ponto: as duas ferramentas são de leitura e abertas a qualquer usuário (a service confere o dono)', () => {
  const { dia, mes } = criar();
  for (const ferramenta of [dia, mes]) {
    assert.equal(ferramenta.tipo, 'LEITURA');
    assert.equal(ferramenta.permissao, 'QUALQUER');
  }
});

test('ponto do dia: perto da meia-noite "hoje" é a data no fuso, não a do UTC', async () => {
  const servico = { consultarDiario: async (dto: PontoConsultarDto) => ({ data: dto.data, nomeUsuario: 'Dev', execucoes: [] }) };
  class DiaTarde extends ConsultarPontoDoDiaFerramenta {
    protected agora(): Date { return new Date('2026-10-19T01:30:00Z'); } // 22:30 do dia 18 em São Paulo
  }
  const ferramenta = new DiaTarde(servico as unknown as PontoService, configService);
  assert.equal((await ferramenta.executar({}, DESENVOLVEDOR)).data, '2026-10-18');
});

test('ponto do mês: ano, mês e usuário informados seguem para a service, e a data de hoje não os substitui', async () => {
  const { mes, mensais } = criar();
  await mes.executar({ ano: 2026, mes: 3, usuarioId: 7 }, GESTOR);
  assert.deepEqual(mensais[0].dto, { ano: 2026, mes: 3, usuarioId: 7 });
  assert.equal(mensais[0].usuarioId, 1);
});

test('ponto: a recusa da service (desenvolvedor pedindo o ponto de outro) chega à IA sem ser engolida', async () => {
  const recusa = new Error('sem permissão');
  const servico = { consultarDiario: async () => { throw recusa; }, consultarMensal: async () => { throw recusa; } } as unknown as PontoService;
  await assert.rejects(() => new ConsultarPontoDoDiaFerramenta(servico, configService).executar({ usuarioId: 99 }, DESENVOLVEDOR), recusa);
  await assert.rejects(() => new ConsultarPontoDoMesFerramenta(servico, configService).executar({ usuarioId: 99 }, DESENVOLVEDOR), recusa);
});

test('ponto do mês: dia só com justificativa entra na lista, dia sem nada fica de fora', async () => {
  const { mes } = criar();
  const resultado = await mes.executar({}, DESENVOLVEDOR);
  assert.deepEqual(resultado.dias.map((dia) => [dia.data, dia.justificativa]), [['2026-10-01', null], ['2026-10-05', 'Consulta médica']]);
});
