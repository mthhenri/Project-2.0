import { test } from 'node:test';
import * as assert from 'node:assert/strict';
import { ConfiguracaoIaResumoDto, EsforcoIaEnum, EstadoIaEnum, ModoContextoChatEnum, NivelIaEnum, TipoProvedorIaEnum } from '@project20/shared';
import { ConfiguracaoIaService } from '../../configuracao-ia/services/configuracao-ia.service';
import { IaException } from '../domain/ia.exception';
import { IaProvedor } from '../domain/ia-provedor';
import { IaRespostaProvedor, IaSolicitacaoProvedor } from '../domain/ia.tipos';
import { executarNoTurno, TurnoIa } from '../domain/turno-ia';
import { IaProvedores, IaService } from './ia.service';

function configuracao(parcial: Partial<ConfiguracaoIaResumoDto> = {}): ConfiguracaoIaResumoDto {
  return {
    id: 1, versao: 1, provedor: TipoProvedorIaEnum.ANTHROPIC,
    fallbacks: [], modelosProvedor: { [TipoProvedorIaEnum.ANTHROPIC]: { modeloRapido: 'haiku', modeloPadrao: 'sonnet', modeloAnalitico: 'opus' } }, esforcoAnalitico: EsforcoIaEnum.MEDIO,
    checkinMinimoMinutos: 30, checkinMaximoMinutos: 80, duracaoRecomendadaMinutos: 90,
    checkinInteligente: true, rigorProporcional: true, deteccaoAutomatica: true,
    duvidasCodigo: false, modoContextoChat: ModoContextoChatEnum.MISTURADO, iaDesligada: false,
    usuarioId: 1, usuarioNome: 'Admin', createdDate: new Date(),
    ...parcial,
  };
}

function criar(parcial: Partial<ConfiguracaoIaResumoDto> = {}, opcoes: { disponivel?: boolean; falha?: unknown } = {}) {
  const estado = { atual: configuracao(parcial) };
  const chamadas: IaSolicitacaoProvedor[] = [];
  const provedor: IaProvedor = {
    estaDisponivel: () => opcoes.disponivel ?? true,
    async gerar(solicitacao) {
      chamadas.push(solicitacao);
      if (opcoes.falha) throw opcoes.falha;
      return resposta(solicitacao.modelo);
    },
    async transmitir(solicitacao, aoTrecho) {
      chamadas.push(solicitacao);
      aoTrecho('um');
      aoTrecho('dois');
      return resposta(solicitacao.modelo);
    },
  };
  const configuracaoIaService = { obterAtiva: async () => estado.atual } as unknown as ConfiguracaoIaService;
  const provedores: IaProvedores = { [TipoProvedorIaEnum.ANTHROPIC]: provedor };
  return { servico: new IaService(configuracaoIaService, provedores), estado, chamadas };
}

function resposta(modelo: string): IaRespostaProvedor {
  return { texto: 'ok', blocos: [{ tipo: 'texto', texto: 'ok' }], modelo, tokens: { entrada: 1, saida: 1, cache: 0 }, motivoParada: 'fim' };
}

const PEDIDO = { mensagens: [{ papel: 'usuario' as const, conteudo: 'oi' }] };

test('cada nível usa o modelo da configuração; o esforço só vale no analítico', async () => {
  const { servico, chamadas } = criar();
  const rapido = await servico.gerar({ ...PEDIDO, nivel: NivelIaEnum.RAPIDO });
  const padrao = await servico.gerar({ ...PEDIDO, nivel: NivelIaEnum.PADRAO });
  const analitico = await servico.gerar({ ...PEDIDO, nivel: NivelIaEnum.ANALITICO });

  assert.deepEqual(chamadas.map((c) => c.modelo), ['haiku', 'sonnet', 'opus']);
  assert.deepEqual(chamadas.map((c) => c.esforco), [undefined, undefined, EsforcoIaEnum.MEDIO]);
  assert.deepEqual([rapido.nivel, padrao.nivel, analitico.nivel], [NivelIaEnum.RAPIDO, NivelIaEnum.PADRAO, NivelIaEnum.ANALITICO]);
  assert.equal(chamadas[0].maximoTokens, 1024);
});

test('trocar o modelo na configuração vale na chamada seguinte, sem reiniciar', async () => {
  const { servico, estado, chamadas } = criar();
  await servico.gerar({ ...PEDIDO, nivel: NivelIaEnum.PADRAO });
  estado.atual = configuracao({ modelosProvedor: { [TipoProvedorIaEnum.ANTHROPIC]: { modeloRapido: 'haiku', modeloPadrao: 'sonnet-novo', modeloAnalitico: 'opus' } }, versao: 2 });
  await servico.gerar({ ...PEDIDO, nivel: NivelIaEnum.PADRAO });
  assert.deepEqual(chamadas.map((c) => c.modelo), ['sonnet', 'sonnet-novo']);
});

test('IA desligada recusa antes de chamar o provedor', async () => {
  const { servico, chamadas } = criar({ iaDesligada: true });
  await assert.rejects(
    () => servico.gerar({ ...PEDIDO, nivel: NivelIaEnum.RAPIDO }),
    (erro: unknown) => erro instanceof IaException && erro.motivo === 'DESLIGADA',
  );
  await assert.rejects(() => servico.transmitir({ ...PEDIDO, nivel: NivelIaEnum.RAPIDO }, () => undefined), IaException);
  assert.equal(chamadas.length, 0);
  assert.equal(await servico.obterEstado(), EstadoIaEnum.DESLIGADA);
});

test('provedor sem chave (ou sem implementação) é pulado; sozinho na cadeia, a chamada falha como indisponível', async () => {
  const { servico } = criar({ provedor: TipoProvedorIaEnum.GOOGLE, modelosProvedor: { [TipoProvedorIaEnum.GOOGLE]: { modeloRapido: 'g', modeloPadrao: 'g', modeloAnalitico: 'g' } } });
  await assert.rejects(
    () => servico.gerar({ ...PEDIDO, nivel: NivelIaEnum.RAPIDO }),
    (erro: unknown) => erro instanceof IaException && erro.motivo === 'INDISPONIVEL',
  );
  assert.equal(await servico.obterEstado(), EstadoIaEnum.FORA_DO_AR);
});

test('transmitir entrega os trechos e devolve a resposta com o nível', async () => {
  const { servico } = criar();
  const trechos: string[] = [];
  const resultado = await servico.transmitir({ ...PEDIDO, nivel: NivelIaEnum.PADRAO }, (t) => trechos.push(t));
  assert.deepEqual(trechos, ['um', 'dois']);
  assert.equal(resultado.nivel, NivelIaEnum.PADRAO);
});

test('estado: falha de indisponibilidade põe fora do ar e o próximo sucesso volta ao ar', async () => {
  const falha = { falha: new IaException('INDISPONIVEL', 'caiu') };
  const { servico, estado } = criar();
  assert.equal(await servico.obterEstado(), EstadoIaEnum.NO_AR);

  const comFalha = criar({}, falha);
  await assert.rejects(() => comFalha.servico.gerar({ ...PEDIDO, nivel: NivelIaEnum.RAPIDO }), IaException);
  assert.equal(await comFalha.servico.obterEstado(), EstadoIaEnum.FORA_DO_AR);

  await servico.gerar({ ...PEDIDO, nivel: NivelIaEnum.RAPIDO });
  assert.equal(await servico.obterEstado(), EstadoIaEnum.NO_AR);
  void estado;
});

test('estado: provedor sem chave está fora do ar; limite de uso não derruba o estado', async () => {
  assert.equal(await criar({}, { disponivel: false }).servico.obterEstado(), EstadoIaEnum.FORA_DO_AR);

  const limite = criar({}, { falha: new IaException('LIMITE', 'limite') });
  await assert.rejects(() => limite.servico.gerar({ ...PEDIDO, nivel: NivelIaEnum.RAPIDO }), IaException);
  assert.equal(await limite.servico.obterEstado(), EstadoIaEnum.NO_AR);
});

test('detecção automática desligada: a falha do provedor não derruba o estado (só o desligamento manual troca as telas)', async () => {
  const { servico } = criar({ deteccaoAutomatica: false }, { falha: new IaException('INDISPONIVEL', 'caiu') });
  await assert.rejects(() => servico.gerar({ ...PEDIDO, nivel: NivelIaEnum.RAPIDO }), IaException);
  assert.equal(await servico.obterEstado(), EstadoIaEnum.NO_AR);
});

test('detecção automática desligada depois de uma queda registrada: o estado volta ao ar, e ligar de novo traz a queda de volta', async () => {
  const { servico, estado } = criar({}, { falha: new IaException('INDISPONIVEL', 'caiu') });
  await assert.rejects(() => servico.gerar({ ...PEDIDO, nivel: NivelIaEnum.RAPIDO }), IaException);
  assert.equal(await servico.obterEstado(), EstadoIaEnum.FORA_DO_AR);
  estado.atual = configuracao({ deteccaoAutomatica: false, versao: 2 });
  assert.equal(await servico.obterEstado(), EstadoIaEnum.NO_AR);
  estado.atual = configuracao({ deteccaoAutomatica: true, versao: 3 });
  assert.equal(await servico.obterEstado(), EstadoIaEnum.FORA_DO_AR);
});

test('desligar manualmente vale mesmo com a detecção automática desligada', async () => {
  const { servico } = criar({ deteccaoAutomatica: false, iaDesligada: true });
  assert.equal(await servico.obterEstado(), EstadoIaEnum.DESLIGADA);
});

// Task 188: o ponto único da coleta do turno do chat.

test('dentro de um turno, gerar e transmitir registram o nível, o modelo e os tokens; fora, nada muda', async () => {
  const { servico } = criar();
  const turno = new TurnoIa();
  await executarNoTurno(turno, async () => {
    await servico.gerar({ ...PEDIDO, nivel: NivelIaEnum.PADRAO });
    await servico.transmitir({ ...PEDIDO, nivel: NivelIaEnum.ANALITICO }, () => undefined);
  });
  assert.deepEqual([turno.nivel, turno.modelo, turno.tokens], [NivelIaEnum.ANALITICO, 'opus', { entrada: 2, saida: 2, cache: 0 }]);

  const fora = await servico.gerar({ ...PEDIDO, nivel: NivelIaEnum.ANALITICO });
  assert.equal(fora.nivel, NivelIaEnum.ANALITICO);
  assert.deepEqual(turno.tokens, { entrada: 2, saida: 2, cache: 0 }, 'chamada fora do turno não entra nele');
});

test('chamada que falhou dentro do turno não é registrada', async () => {
  const { servico } = criar({}, { falha: new IaException('INDISPONIVEL', 'fora do ar') });
  const turno = new TurnoIa();
  await executarNoTurno(turno, () => assert.rejects(() => servico.gerar({ ...PEDIDO, nivel: NivelIaEnum.ANALITICO }), IaException));
  assert.deepEqual([turno.nivel, turno.modelo, turno.tokens], [NivelIaEnum.RAPIDO, null, { entrada: 0, saida: 0, cache: 0 }]);
});

test('turnos simultâneos pelo mesmo serviço não misturam o que cada um gastou', async () => {
  const { servico } = criar();
  const primeiro = new TurnoIa();
  const segundo = new TurnoIa();
  await Promise.all([
    executarNoTurno(primeiro, async () => { await servico.gerar({ ...PEDIDO, nivel: NivelIaEnum.ANALITICO }); }),
    executarNoTurno(segundo, async () => { await servico.gerar({ ...PEDIDO, nivel: NivelIaEnum.RAPIDO }); await servico.gerar({ ...PEDIDO, nivel: NivelIaEnum.RAPIDO }); }),
  ]);
  assert.deepEqual([primeiro.nivel, primeiro.tokens.entrada], [NivelIaEnum.ANALITICO, 1]);
  assert.deepEqual([segundo.nivel, segundo.tokens.entrada], [NivelIaEnum.RAPIDO, 2]);
});

// Task 203: fallback entre provedores.

const MODELOS_POR_PROVEDOR = {
  [TipoProvedorIaEnum.ANTHROPIC]: { modeloRapido: 'haiku', modeloPadrao: 'sonnet', modeloAnalitico: 'opus' },
  [TipoProvedorIaEnum.GOOGLE]: { modeloRapido: 'gemini-flash', modeloPadrao: 'gemini-pro', modeloAnalitico: 'gemini-pro-max' },
  [TipoProvedorIaEnum.OPENAI]: { modeloRapido: 'gpt-mini', modeloPadrao: 'gpt-5', modeloAnalitico: 'o3' },
};

interface ComportamentoDoProvedor {
  disponivel?: boolean;
  falha?: unknown;
  /** Emite um trecho antes de falhar (só no streaming). */
  trechoAntesDaFalha?: string;
}

function criarCadeia(parcial: Partial<ConfiguracaoIaResumoDto>, comportamentos: Partial<Record<TipoProvedorIaEnum, ComportamentoDoProvedor>>) {
  const chamadas: Array<{ provedor: TipoProvedorIaEnum; solicitacao: IaSolicitacaoProvedor }> = [];
  const provedores: IaProvedores = {};
  for (const tipo of Object.values(TipoProvedorIaEnum)) {
    const comportamento = comportamentos[tipo] ?? {};
    provedores[tipo] = {
      estaDisponivel: () => comportamento.disponivel ?? true,
      async gerar(solicitacao) {
        chamadas.push({ provedor: tipo, solicitacao });
        if (comportamento.falha) throw comportamento.falha;
        return resposta(solicitacao.modelo);
      },
      async transmitir(solicitacao, aoTrecho) {
        chamadas.push({ provedor: tipo, solicitacao });
        if (comportamento.trechoAntesDaFalha) aoTrecho(comportamento.trechoAntesDaFalha);
        if (comportamento.falha) throw comportamento.falha;
        aoTrecho('ok');
        return resposta(solicitacao.modelo);
      },
    };
  }
  const configuracaoIaService = { obterAtiva: async () => configuracao(parcial) } as unknown as ConfiguracaoIaService;
  return { servico: new IaService(configuracaoIaService, provedores), chamadas };
}

const CADEIA = { fallbacks: [TipoProvedorIaEnum.GOOGLE, TipoProvedorIaEnum.OPENAI], modelosProvedor: MODELOS_POR_PROVEDOR };
const CAIU = new IaException('INDISPONIVEL', 'caiu');

test('fallback: sem falha, só o provedor padrão é chamado', async () => {
  const { servico, chamadas } = criarCadeia(CADEIA, {});
  await servico.gerar({ ...PEDIDO, nivel: NivelIaEnum.PADRAO });
  assert.deepEqual(chamadas.map((chamada) => chamada.provedor), [TipoProvedorIaEnum.ANTHROPIC]);
});

test('fallback: se o padrão cai, vai ao Gemini com os modelos do Gemini; se o Gemini cai também, vai à OpenAI', async () => {
  const { servico, chamadas } = criarCadeia(CADEIA, {
    [TipoProvedorIaEnum.ANTHROPIC]: { falha: CAIU },
    [TipoProvedorIaEnum.GOOGLE]: { falha: new IaException('LIMITE', 'limite') },
  });
  const resultado = await servico.gerar({ ...PEDIDO, nivel: NivelIaEnum.ANALITICO });

  assert.deepEqual(chamadas.map((chamada) => [chamada.provedor, chamada.solicitacao.modelo]), [
    [TipoProvedorIaEnum.ANTHROPIC, 'opus'],
    [TipoProvedorIaEnum.GOOGLE, 'gemini-pro-max'],
    [TipoProvedorIaEnum.OPENAI, 'o3'],
  ]);
  assert.equal(resultado.modelo, 'o3');
  assert.equal(chamadas[2].solicitacao.esforco, EsforcoIaEnum.MEDIO, 'o esforço do analítico acompanha a chamada de contingência');
});

test('fallback: a ordem é a da configuração, não a dos provedores', async () => {
  const { servico, chamadas } = criarCadeia(
    { fallbacks: [TipoProvedorIaEnum.OPENAI, TipoProvedorIaEnum.GOOGLE], modelosProvedor: MODELOS_POR_PROVEDOR },
    { [TipoProvedorIaEnum.ANTHROPIC]: { falha: CAIU } },
  );
  await servico.gerar({ ...PEDIDO, nivel: NivelIaEnum.RAPIDO });
  assert.deepEqual(chamadas.map((chamada) => chamada.provedor), [TipoProvedorIaEnum.ANTHROPIC, TipoProvedorIaEnum.OPENAI]);
});

test('fallback: provedor sem chave é pulado sem ser chamado', async () => {
  const { servico, chamadas } = criarCadeia(CADEIA, {
    [TipoProvedorIaEnum.ANTHROPIC]: { disponivel: false },
    [TipoProvedorIaEnum.GOOGLE]: { disponivel: false },
  });
  const resultado = await servico.gerar({ ...PEDIDO, nivel: NivelIaEnum.RAPIDO });
  assert.deepEqual(chamadas.map((chamada) => chamada.provedor), [TipoProvedorIaEnum.OPENAI]);
  assert.equal(resultado.modelo, 'gpt-mini');
});

test('fallback: padrão sem chave e fallback com limite devolve o limite (provedor pulado não é falha) e não derruba o estado', async () => {
  const { servico } = criarCadeia(CADEIA, {
    [TipoProvedorIaEnum.ANTHROPIC]: { disponivel: false },
    [TipoProvedorIaEnum.GOOGLE]: { falha: new IaException('LIMITE', 'limite do Gemini') },
    [TipoProvedorIaEnum.OPENAI]: { disponivel: false },
  });
  await assert.rejects(
    () => servico.gerar({ ...PEDIDO, nivel: NivelIaEnum.RAPIDO }),
    (erro: unknown) => erro instanceof IaException && erro.motivo === 'LIMITE',
  );
  assert.equal(await servico.obterEstado(), EstadoIaEnum.NO_AR);
});

test('fallback: cadeia inteira falhando devolve a falha do provedor padrão e marca fora do ar', async () => {
  const { servico } = criarCadeia(CADEIA, {
    [TipoProvedorIaEnum.ANTHROPIC]: { falha: new IaException('LIMITE', 'limite do padrão') },
    [TipoProvedorIaEnum.GOOGLE]: { falha: CAIU },
    [TipoProvedorIaEnum.OPENAI]: { falha: CAIU },
  });
  await assert.rejects(
    () => servico.gerar({ ...PEDIDO, nivel: NivelIaEnum.RAPIDO }),
    (erro: unknown) => erro instanceof IaException && erro.motivo === 'LIMITE' && erro.mensagem === 'limite do padrão',
  );
  assert.equal(await servico.obterEstado(), EstadoIaEnum.NO_AR, 'a falha do padrão foi limite de uso, não queda');

  const caidos = criarCadeia(CADEIA, {
    [TipoProvedorIaEnum.ANTHROPIC]: { falha: CAIU },
    [TipoProvedorIaEnum.GOOGLE]: { falha: CAIU },
    [TipoProvedorIaEnum.OPENAI]: { falha: CAIU },
  });
  await assert.rejects(() => caidos.servico.gerar({ ...PEDIDO, nivel: NivelIaEnum.RAPIDO }), IaException);
  assert.equal(await caidos.servico.obterEstado(), EstadoIaEnum.FORA_DO_AR);
});

test('fallback: o padrão caído mas o fallback respondendo mantém a IA no ar', async () => {
  const { servico } = criarCadeia(CADEIA, { [TipoProvedorIaEnum.ANTHROPIC]: { falha: CAIU } });
  await servico.gerar({ ...PEDIDO, nivel: NivelIaEnum.RAPIDO });
  assert.equal(await servico.obterEstado(), EstadoIaEnum.NO_AR);
});

test('estado: fora do ar só quando nenhum provedor da cadeia tem chave', async () => {
  const soOFallback = criarCadeia(CADEIA, { [TipoProvedorIaEnum.ANTHROPIC]: { disponivel: false }, [TipoProvedorIaEnum.GOOGLE]: { disponivel: false } });
  assert.equal(await soOFallback.servico.obterEstado(), EstadoIaEnum.NO_AR);
  const nenhum = criarCadeia(CADEIA, {
    [TipoProvedorIaEnum.ANTHROPIC]: { disponivel: false },
    [TipoProvedorIaEnum.GOOGLE]: { disponivel: false },
    [TipoProvedorIaEnum.OPENAI]: { disponivel: false },
  });
  assert.equal(await nenhum.servico.obterEstado(), EstadoIaEnum.FORA_DO_AR);
  // Provedor fora da cadeia não conta: o padrão sem chave e sem fallback está fora do ar mesmo com a OpenAI configurada no ambiente.
  const foraDaCadeia = criarCadeia({}, { [TipoProvedorIaEnum.ANTHROPIC]: { disponivel: false } });
  assert.equal(await foraDaCadeia.servico.obterEstado(), EstadoIaEnum.FORA_DO_AR);
});

test('fallback no streaming: falha antes de qualquer trecho passa ao próximo; depois de um trecho enviado, não repete a resposta', async () => {
  const antes = criarCadeia(CADEIA, { [TipoProvedorIaEnum.ANTHROPIC]: { falha: CAIU } });
  const trechos: string[] = [];
  await antes.servico.transmitir({ ...PEDIDO, nivel: NivelIaEnum.PADRAO }, (trecho) => trechos.push(trecho));
  assert.deepEqual(trechos, ['ok']);
  assert.deepEqual(antes.chamadas.map((chamada) => chamada.provedor), [TipoProvedorIaEnum.ANTHROPIC, TipoProvedorIaEnum.GOOGLE]);

  const depois = criarCadeia(CADEIA, { [TipoProvedorIaEnum.ANTHROPIC]: { falha: CAIU, trechoAntesDaFalha: 'meio' } });
  const recebidos: string[] = [];
  await assert.rejects(() => depois.servico.transmitir({ ...PEDIDO, nivel: NivelIaEnum.PADRAO }, (trecho) => recebidos.push(trecho)), IaException);
  assert.deepEqual(recebidos, ['meio']);
  assert.deepEqual(depois.chamadas.map((chamada) => chamada.provedor), [TipoProvedorIaEnum.ANTHROPIC]);
});

test('fallback: a chamada que respondeu no fallback é a que entra no turno', async () => {
  const { servico } = criarCadeia(CADEIA, { [TipoProvedorIaEnum.ANTHROPIC]: { falha: CAIU } });
  const turno = new TurnoIa();
  await executarNoTurno(turno, async () => {
    await servico.gerar({ ...PEDIDO, nivel: NivelIaEnum.PADRAO });
  });
  assert.equal(turno.modelo, 'gemini-pro');
});

test('trocar o provedor padrão e voltar: cada versão usa o trio do provedor que está no ponteiro, e o trio guardado de outro provedor não é chamado', async () => {
  const { servico, chamadas } = criarCadeia({ provedor: TipoProvedorIaEnum.GOOGLE, fallbacks: [], modelosProvedor: MODELOS_POR_PROVEDOR }, {});
  await servico.gerar({ ...PEDIDO, nivel: NivelIaEnum.PADRAO });
  assert.deepEqual(chamadas.map((chamada) => [chamada.provedor, chamada.solicitacao.modelo]), [[TipoProvedorIaEnum.GOOGLE, 'gemini-pro']]);

  const voltou = criarCadeia({ provedor: TipoProvedorIaEnum.ANTHROPIC, fallbacks: [], modelosProvedor: MODELOS_POR_PROVEDOR }, {});
  await voltou.servico.gerar({ ...PEDIDO, nivel: NivelIaEnum.PADRAO });
  assert.deepEqual(voltou.chamadas.map((chamada) => [chamada.provedor, chamada.solicitacao.modelo]), [[TipoProvedorIaEnum.ANTHROPIC, 'sonnet']]);
});
