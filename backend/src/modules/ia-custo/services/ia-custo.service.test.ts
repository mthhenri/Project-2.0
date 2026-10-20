import { test } from 'node:test';
import * as assert from 'node:assert/strict';
import { ConfiguracaoIaResumoDto, TipoUsuarioEnum } from '@project20/shared';
import { ConfigService } from '../../../config/config.service';
import { UnauthorizedAccessException } from '../../../core/exceptions/unauthorized-access.exception';
import { ConsultaTokens, TokensSomados } from '../../chat/domain/chat-consultas';
import { ArmazenamentoDeChat } from '../../chat/repositories/armazenamento-de-chat';
import { ConfiguracaoIaService } from '../../configuracao-ia/services/configuracao-ia.service';
import { IaCustoService } from './ia-custo.service';

const ADMINISTRADOR = { sub: 1, login: 'admin', tipo: TipoUsuarioEnum.ADMINISTRADOR } as never;
const GESTOR = { sub: 2, login: 'gestor', tipo: TipoUsuarioEnum.GESTOR } as never;
const PRECO = { modelo: 'sonnet', precoEntradaMilhao: 3, precoSaidaMilhao: 15, precoCacheMilhao: 0.3 };

function montar(opcoes: { usos?: TokensSomados[] } = {}) {
  const somas: ConsultaTokens[] = [];
  const precosAlterados: unknown[] = [];
  const armazenamento = {
    somarTokens: async (consulta: ConsultaTokens) => {
      somas.push(consulta);
      return opcoes.usos ?? [];
    },
  } as unknown as ArmazenamentoDeChat;
  const configuracao = {
    obterAtiva: async () => ({ provedor: 'ANTHROPIC', modelosProvedor: { ANTHROPIC: { modeloRapido: 'haiku', modeloPadrao: 'sonnet', modeloAnalitico: 'sonnet' } } }) as unknown as ConfiguracaoIaResumoDto,
    listarPrecos: async () => [PRECO],
    alterarPreco: async (dto: unknown) => {
      precosAlterados.push(dto);
      return dto;
    },
  };
  const configService = { obter: () => ({ aplicacao: { fusoHorario: 'America/Sao_Paulo' } }) } as unknown as ConfigService;
  return { service: new IaCustoService(armazenamento, configuracao as unknown as ConfiguracaoIaService, configService), somas, precosAlterados };
}

test('só o administrador consulta os custos e altera preços', async () => {
  const { service } = montar();
  await assert.rejects(service.consultar({ ano: 2026, mes: 10 }, GESTOR), UnauthorizedAccessException);
  await assert.rejects(service.alterarPreco({ modelo: 'sonnet', precoEntradaMilhao: 1, precoSaidaMilhao: 1, precoCacheMilhao: 1 }, GESTOR), UnauthorizedAccessException);
});

test('o mês vira os dias do mês; o ano, os meses do ano, no fuso do sistema', async () => {
  const { service, somas } = montar({ usos: [{ periodo: '2026-10-03', modelo: 'sonnet', mensagens: 2, tokensEntrada: 1_000_000, tokensSaida: 0, tokensCache: 0 }] });
  const mensal = (await service.consultar({ ano: 2026, mes: 10 }, ADMINISTRADOR)).dados!;
  assert.deepEqual(somas[0], { dataInicio: '2026-10-01', dataFim: '2026-10-31', porMes: false, fusoHorario: 'America/Sao_Paulo' });
  assert.equal(mensal.periodos.length, 31);
  assert.equal(mensal.totais.custoDolar, 3);
  assert.deepEqual(mensal.modelos.map((modelo) => [modelo.modelo, modelo.emUso]), [['sonnet', true], ['haiku', true]]);

  const anual = (await service.consultar({ ano: 2026 }, ADMINISTRADOR)).dados!;
  assert.deepEqual(somas[1], { dataInicio: '2026-01-01', dataFim: '2026-12-31', porMes: true, fusoHorario: 'America/Sao_Paulo' });
  assert.equal(anual.mes, null);
  assert.equal(anual.periodos.length, 12);
});

test('o uso gravado com o id datado do provedor é precificado pelo nome da configuração', async () => {
  const { service } = montar({ usos: [{ periodo: '2026-10-03', modelo: 'sonnet-20261015', mensagens: 1, tokensEntrada: 1_000_000, tokensSaida: 0, tokensCache: 0 }] });
  const { dados } = await service.consultar({ ano: 2026, mes: 10 }, ADMINISTRADOR);
  assert.deepEqual(dados!.modelos.map((modelo) => modelo.modelo), ['sonnet', 'haiku']);
  assert.equal(dados!.totais.custoDolar, 3);
  assert.equal(dados!.totais.modelosSemPreco, 0);
});

test('alterar o preço vai para a configuração da IA', async () => {
  const { service, precosAlterados } = montar();
  const dto = { modelo: 'sonnet', precoEntradaMilhao: 4, precoSaidaMilhao: 16, precoCacheMilhao: 0.4 };
  const resposta = await service.alterarPreco(dto, ADMINISTRADOR);
  assert.deepEqual(precosAlterados, [dto]);
  assert.deepEqual(resposta.dados, dto);
});
