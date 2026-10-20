import { test } from 'node:test';
import * as assert from 'node:assert/strict';
import { ConfiguracaoIaResumoDto, IaUsoRegistrarDto, TipoUsuarioEnum } from '@project20/shared';
import { UnauthorizedAccessException } from '../../../core/exceptions/unauthorized-access.exception';
import { ConfiguracaoIaService } from '../../configuracao-ia/services/configuracao-ia.service';
import { UsoSomado } from '../domain/calculo-de-custo';
import { IaCustoRepository, IaUsoSomarDto } from '../repositories/ia-custo.repository';
import { IaCustoService } from './ia-custo.service';

const ADMINISTRADOR = { sub: 1, login: 'admin', tipo: TipoUsuarioEnum.ADMINISTRADOR } as never;
const GESTOR = { sub: 2, login: 'gestor', tipo: TipoUsuarioEnum.GESTOR } as never;
const PRECO = { modelo: 'sonnet', precoEntradaMilhao: 3, precoSaidaMilhao: 15, precoCacheMilhao: 0.3 };

function montar(opcoes: { falhaAoRegistrar?: boolean; usos?: UsoSomado[] } = {}) {
  const somas: IaUsoSomarDto[] = [];
  const registrados: IaUsoRegistrarDto[] = [];
  const repositorio = {
    registrarUso: async (dto: IaUsoRegistrarDto) => {
      if (opcoes.falhaAoRegistrar) throw new Error('banco fora');
      registrados.push(dto);
    },
    somarUso: async (dto: IaUsoSomarDto) => {
      somas.push(dto);
      return opcoes.usos ?? [];
    },
    listarPrecos: async () => [PRECO],
    salvarPreco: async (dto: unknown) => dto,
  } as unknown as IaCustoRepository;
  const configuracao = { obterAtiva: async () => ({ modeloRapido: 'haiku', modeloPadrao: 'sonnet', modeloAnalitico: 'sonnet' }) as ConfiguracaoIaResumoDto };
  return { service: new IaCustoService(repositorio, configuracao as unknown as ConfiguracaoIaService), somas, registrados };
}

test('só o administrador consulta os custos e altera preços', async () => {
  const { service } = montar();
  await assert.rejects(service.consultar({ ano: 2026, mes: 10 }, GESTOR), UnauthorizedAccessException);
  await assert.rejects(service.alterarPreco({ modelo: 'sonnet', precoEntradaMilhao: 1, precoSaidaMilhao: 1, precoCacheMilhao: 1 }, GESTOR), UnauthorizedAccessException);
});

test('o mês vira os dias do mês; o ano, os meses do ano', async () => {
  const { service, somas } = montar({ usos: [{ periodo: '2026-10-03', modelo: 'sonnet', chamadas: 2, tokensEntrada: 1_000_000, tokensSaida: 0, tokensCache: 0 }] });
  const mensal = (await service.consultar({ ano: 2026, mes: 10 }, ADMINISTRADOR)).dados!;
  assert.deepEqual(somas[0], { dataInicio: '2026-10-01', dataFim: '2026-10-31', porMes: false });
  assert.equal(mensal.periodos.length, 31);
  assert.equal(mensal.totais.custoDolar, 3);
  assert.deepEqual(mensal.modelos.map((modelo) => [modelo.modelo, modelo.emUso]), [['sonnet', true], ['haiku', true]]);

  const anual = (await service.consultar({ ano: 2026 }, ADMINISTRADOR)).dados!;
  assert.deepEqual(somas[1], { dataInicio: '2026-01-01', dataFim: '2026-12-31', porMes: true });
  assert.equal(anual.mes, null);
  assert.equal(anual.periodos.length, 12);
});

test('registrar o uso grava e uma falha do banco não sobe para quem chamou a IA', async () => {
  const bom = montar();
  await bom.service.registrarUso({ modelo: 'sonnet', tokensEntrada: 1, tokensSaida: 2, tokensCache: 3 });
  assert.equal(bom.registrados.length, 1);
  await assert.doesNotReject(montar({ falhaAoRegistrar: true }).service.registrarUso({ modelo: 'sonnet', tokensEntrada: 1, tokensSaida: 2, tokensCache: 3 }));
});
