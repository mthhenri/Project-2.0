import { test } from 'node:test';
import * as assert from 'node:assert/strict';
import { ConfiguracaoIaCadeiaItemDto, ConfiguracaoIaResumoDto, EsforcoIaEnum, EstadoIaEnum, IaModeloListadoDto, ModoContextoChatEnum, NivelIaEnum, TipoProvedorIaEnum } from '@project20/shared';
import { ConfiguracaoIaService } from '../../configuracao-ia/services/configuracao-ia.service';
import { IaException } from '../domain/ia.exception';
import { IaProvedor } from '../domain/ia-provedor';
import { IaMensagem, IaRespostaProvedor, IaSolicitacaoProvedor } from '../domain/ia.tipos';
import { executarNoTurno, TurnoIa } from '../domain/turno-ia';
import { IaProvedores, IaService } from './ia.service';

const A = TipoProvedorIaEnum.ANTHROPIC;
const G = TipoProvedorIaEnum.GOOGLE;
const O = TipoProvedorIaEnum.OPENAI;

const item = (provedor: TipoProvedorIaEnum, modelo: string, esforco: EsforcoIaEnum = EsforcoIaEnum.MEDIO): ConfiguracaoIaCadeiaItemDto => ({ provedor, modelo, esforco });

/** A configuração de hoje: tudo na Anthropic, uma cadeia de um item por nível. */
const CADEIAS_SO_ANTHROPIC = {
    cadeiaRapido: [item(A, 'haiku')],
    cadeiaPadrao: [item(A, 'sonnet')],
    cadeiaAnalitico: [item(A, 'opus')],
};

function configuracao(parcial: Partial<ConfiguracaoIaResumoDto> = {}): ConfiguracaoIaResumoDto {
    return {
        id: 1, versao: 1, ...CADEIAS_SO_ANTHROPIC,
        checkinMinimoMinutos: 30, checkinMaximoMinutos: 80, duracaoRecomendadaMinutos: 90,
        checkinInteligente: true, rigorProporcional: true, deteccaoAutomatica: true,
        duvidasCodigo: false, modoContextoChat: ModoContextoChatEnum.MISTURADO, iaDesligada: false, niveisProposta: {},
        usuarioId: 1, usuarioNome: 'Admin', createdDate: new Date(),
        ...parcial,
    };
}

function resposta(modelo: string): IaRespostaProvedor {
    return { texto: 'ok', blocos: [{ tipo: 'texto', texto: 'ok' }], modelo, tokens: { entrada: 1, saida: 1, cache: 0 }, motivoParada: 'fim' };
}

interface ComportamentoDoProvedor {
    disponivel?: boolean;
    falha?: unknown;
    /** Emite um trecho antes de falhar (só no streaming). */
    trechoAntesDaFalha?: string;
    /** Devolve o modelo com a data do lançamento, como os provedores fazem com um alias. */
    sufixoDoModeloDevolvido?: string;
}

function criarCom(
    parcial: Partial<ConfiguracaoIaResumoDto>,
    comportamentos: Partial<Record<TipoProvedorIaEnum, ComportamentoDoProvedor>> = {},
) {
    const estado = { atual: configuracao(parcial) };
    const chamadas: Array<{ provedor: TipoProvedorIaEnum; solicitacao: IaSolicitacaoProvedor }> = [];
    const provedores: IaProvedores = {};
    for (const tipo of Object.values(TipoProvedorIaEnum)) {
        const comportamento = comportamentos[tipo] ?? {};
        const devolvido = (modelo: string) => resposta(`${modelo}${comportamento.sufixoDoModeloDevolvido ?? ''}`);
        provedores[tipo] = {
            estaDisponivel: () => comportamento.disponivel ?? true,
            async gerar(solicitacao) {
                chamadas.push({ provedor: tipo, solicitacao });
                if (comportamento.falha) throw comportamento.falha;
                return devolvido(solicitacao.modelo);
            },
            async transmitir(solicitacao, aoTrecho) {
                chamadas.push({ provedor: tipo, solicitacao });
                if (comportamento.trechoAntesDaFalha) aoTrecho(comportamento.trechoAntesDaFalha);
                if (comportamento.falha) throw comportamento.falha;
                aoTrecho('um');
                aoTrecho('dois');
                return devolvido(solicitacao.modelo);
            },
            async listarModelos() {
                return [];
            },
        };
    }
    const configuracaoIaService = { obterAtiva: async () => estado.atual } as unknown as ConfiguracaoIaService;
    return { servico: new IaService(configuracaoIaService, provedores), estado, chamadas };
}

const PEDIDO = { mensagens: [{ papel: 'usuario' as const, conteudo: 'oi' }] };
const CAIU = new IaException('INDISPONIVEL', 'caiu');
const SEM_CHAVE = { disponivel: false };

test('cada nível usa o modelo e o esforço do item principal da própria cadeia', async () => {
    const { servico, chamadas } = criarCom({
        cadeiaRapido: [item(A, 'haiku', EsforcoIaEnum.BAIXO)],
        cadeiaPadrao: [item(A, 'sonnet', EsforcoIaEnum.MEDIO)],
        cadeiaAnalitico: [item(A, 'opus', EsforcoIaEnum.ALTO)],
    });
    const rapido = await servico.gerar({ ...PEDIDO, nivel: NivelIaEnum.RAPIDO });
    const padrao = await servico.gerar({ ...PEDIDO, nivel: NivelIaEnum.PADRAO });
    const analitico = await servico.gerar({ ...PEDIDO, nivel: NivelIaEnum.ANALITICO });

    assert.deepEqual(chamadas.map((c) => c.solicitacao.modelo), ['haiku', 'sonnet', 'opus']);
    assert.deepEqual(chamadas.map((c) => c.solicitacao.esforco), [EsforcoIaEnum.BAIXO, EsforcoIaEnum.MEDIO, EsforcoIaEnum.ALTO], 'o esforço é de cada item, em todos os níveis');
    assert.deepEqual([rapido.nivel, padrao.nivel, analitico.nivel], [NivelIaEnum.RAPIDO, NivelIaEnum.PADRAO, NivelIaEnum.ANALITICO]);
    assert.equal(chamadas[0].solicitacao.maximoTokens, 1024);
});

test('configuração híbrida: cada nível chama o provedor do seu item principal', async () => {
    const { servico, chamadas } = criarCom({
        cadeiaRapido: [item(A, 'claude-haiku-5-5')],
        cadeiaPadrao: [item(O, 'gpt-6.1-sol')],
        cadeiaAnalitico: [item(A, 'claude-opus-5-5')],
    });
    for (const nivel of Object.values(NivelIaEnum)) await servico.gerar({ ...PEDIDO, nivel });
    assert.deepEqual(chamadas.map((c) => [c.provedor, c.solicitacao.modelo]), [[A, 'claude-haiku-5-5'], [O, 'gpt-6.1-sol'], [A, 'claude-opus-5-5']]);
});

test('alterar só o esforço do analítico para ALTO vale na chamada seguinte e não mexe nos outros níveis', async () => {
    const { servico, estado, chamadas } = criarCom({});
    await servico.gerar({ ...PEDIDO, nivel: NivelIaEnum.ANALITICO });
    estado.atual = configuracao({ cadeiaAnalitico: [item(A, 'opus', EsforcoIaEnum.ALTO)], versao: 2 });
    await servico.gerar({ ...PEDIDO, nivel: NivelIaEnum.ANALITICO });
    await servico.gerar({ ...PEDIDO, nivel: NivelIaEnum.RAPIDO });
    assert.deepEqual(chamadas.map((c) => c.solicitacao.esforco), [EsforcoIaEnum.MEDIO, EsforcoIaEnum.ALTO, EsforcoIaEnum.MEDIO]);
});

test('trocar o modelo na configuração vale na chamada seguinte, sem reiniciar', async () => {
    const { servico, estado, chamadas } = criarCom({});
    await servico.gerar({ ...PEDIDO, nivel: NivelIaEnum.PADRAO });
    estado.atual = configuracao({ cadeiaPadrao: [item(A, 'sonnet-novo')], versao: 2 });
    await servico.gerar({ ...PEDIDO, nivel: NivelIaEnum.PADRAO });
    assert.deepEqual(chamadas.map((c) => c.solicitacao.modelo), ['sonnet', 'sonnet-novo']);
});

test('IA desligada recusa antes de chamar o provedor', async () => {
    const { servico, chamadas } = criarCom({ iaDesligada: true });
    await assert.rejects(
        () => servico.gerar({ ...PEDIDO, nivel: NivelIaEnum.RAPIDO }),
        (erro: unknown) => erro instanceof IaException && erro.motivo === 'DESLIGADA',
    );
    await assert.rejects(() => servico.transmitir({ ...PEDIDO, nivel: NivelIaEnum.RAPIDO }, () => undefined), IaException);
    assert.equal(chamadas.length, 0);
    assert.equal(await servico.obterEstado(), EstadoIaEnum.DESLIGADA);
});

test('transmitir entrega os trechos e devolve a resposta com o nível', async () => {
    const { servico } = criarCom({});
    const trechos: string[] = [];
    const resultado = await servico.transmitir({ ...PEDIDO, nivel: NivelIaEnum.PADRAO }, (t) => trechos.push(t));
    assert.deepEqual(trechos, ['um', 'dois']);
    assert.equal(resultado.nivel, NivelIaEnum.PADRAO);
});

// Estado da IA: por nível (decisão 7 da spec 261).

test('estado: nenhum item de nenhuma cadeia com chave deixa a IA fora do ar', async () => {
    assert.equal(await criarCom({}, { [A]: SEM_CHAVE }).servico.obterEstado(), EstadoIaEnum.FORA_DO_AR);
    // Provedor com chave que não está em cadeia nenhuma não conta.
    assert.equal(await criarCom({}, { [A]: SEM_CHAVE, [O]: { disponivel: true } }).servico.obterEstado(), EstadoIaEnum.FORA_DO_AR);
});

test('estado: um só nível sem item utilizável não derruba a IA; os outros níveis funcionam e o sem item falha citando o nível', async () => {
    const { servico, chamadas } = criarCom(
        { cadeiaPadrao: [item(O, 'gpt-5')] },
        { [O]: SEM_CHAVE },
    );
    assert.equal(await servico.obterEstado(), EstadoIaEnum.NO_AR);

    await servico.gerar({ ...PEDIDO, nivel: NivelIaEnum.RAPIDO });
    await servico.gerar({ ...PEDIDO, nivel: NivelIaEnum.ANALITICO });
    assert.deepEqual(chamadas.map((c) => c.solicitacao.modelo), ['haiku', 'opus']);

    await assert.rejects(
        () => servico.gerar({ ...PEDIDO, nivel: NivelIaEnum.PADRAO }),
        (erro: unknown) => erro instanceof IaException && erro.motivo === 'INDISPONIVEL' && /nível padrão/.test(erro.mensagem),
    );
    assert.equal(await servico.obterEstado(), EstadoIaEnum.NO_AR, 'um nível indisponível não derruba o sistema');
});

test('estado: com a detecção automática, o último resultado é por nível e o sistema só cai quando todos os níveis falharam', async () => {
    const { servico } = criarCom({}, { [A]: { falha: CAIU } });
    assert.equal(await servico.obterEstado(), EstadoIaEnum.NO_AR);

    await assert.rejects(() => servico.gerar({ ...PEDIDO, nivel: NivelIaEnum.RAPIDO }), IaException);
    await assert.rejects(() => servico.gerar({ ...PEDIDO, nivel: NivelIaEnum.PADRAO }), IaException);
    assert.equal(await servico.obterEstado(), EstadoIaEnum.NO_AR, 'rápido e padrão falharam, o analítico ainda não');

    await assert.rejects(() => servico.gerar({ ...PEDIDO, nivel: NivelIaEnum.ANALITICO }), IaException);
    assert.equal(await servico.obterEstado(), EstadoIaEnum.FORA_DO_AR, 'os três níveis falharam na última chamada');
});

test('estado: a primeira chamada bem-sucedida de um nível o recupera, e o sistema volta ao ar', async () => {
    const { servico, estado } = criarCom({ cadeiaRapido: [item(A, 'haiku')], cadeiaPadrao: [item(A, 'sonnet')], cadeiaAnalitico: [item(A, 'opus')] }, { [A]: { falha: CAIU } });
    for (const nivel of Object.values(NivelIaEnum)) await assert.rejects(() => servico.gerar({ ...PEDIDO, nivel }), IaException);
    assert.equal(await servico.obterEstado(), EstadoIaEnum.FORA_DO_AR);

    // O provedor volta: a mesma configuração, agora com um fallback que responde no nível rápido.
    estado.atual = configuracao({ cadeiaRapido: [item(A, 'haiku'), item(G, 'gemini-flash')], versao: 2 });
    await servico.gerar({ ...PEDIDO, nivel: NivelIaEnum.RAPIDO });
    assert.equal(await servico.obterEstado(), EstadoIaEnum.NO_AR);
});

test('estado: limite de uso não derruba o estado', async () => {
    const limite = criarCom({}, { [A]: { falha: new IaException('LIMITE', 'limite') } });
    for (const nivel of Object.values(NivelIaEnum)) await assert.rejects(() => limite.servico.gerar({ ...PEDIDO, nivel }), IaException);
    assert.equal(await limite.servico.obterEstado(), EstadoIaEnum.NO_AR);
});

test('detecção automática desligada: a falha do provedor não derruba o estado (só o desligamento manual troca as telas)', async () => {
    const { servico } = criarCom({ deteccaoAutomatica: false }, { [A]: { falha: CAIU } });
    for (const nivel of Object.values(NivelIaEnum)) await assert.rejects(() => servico.gerar({ ...PEDIDO, nivel }), IaException);
    assert.equal(await servico.obterEstado(), EstadoIaEnum.NO_AR);
});

test('detecção automática desligada depois de uma queda registrada: o estado volta ao ar, e ligar de novo traz a queda de volta', async () => {
    const { servico, estado } = criarCom({}, { [A]: { falha: CAIU } });
    for (const nivel of Object.values(NivelIaEnum)) await assert.rejects(() => servico.gerar({ ...PEDIDO, nivel }), IaException);
    assert.equal(await servico.obterEstado(), EstadoIaEnum.FORA_DO_AR);
    estado.atual = configuracao({ deteccaoAutomatica: false, versao: 2 });
    assert.equal(await servico.obterEstado(), EstadoIaEnum.NO_AR);
    estado.atual = configuracao({ deteccaoAutomatica: true, versao: 3 });
    assert.equal(await servico.obterEstado(), EstadoIaEnum.FORA_DO_AR);
});

test('desligar manualmente vale mesmo com a detecção automática desligada', async () => {
    const { servico } = criarCom({ deteccaoAutomatica: false, iaDesligada: true });
    assert.equal(await servico.obterEstado(), EstadoIaEnum.DESLIGADA);
});

// Task 188: o ponto único da coleta do turno do chat.

test('dentro de um turno, gerar e transmitir registram o nível, o modelo e os tokens; fora, nada muda', async () => {
    const { servico } = criarCom({});
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
    const { servico } = criarCom({}, { [A]: { falha: new IaException('INDISPONIVEL', 'fora do ar') } });
    const turno = new TurnoIa();
    await executarNoTurno(turno, () => assert.rejects(() => servico.gerar({ ...PEDIDO, nivel: NivelIaEnum.ANALITICO }), IaException));
    assert.deepEqual([turno.nivel, turno.modelo, turno.tokens], [NivelIaEnum.RAPIDO, null, { entrada: 0, saida: 0, cache: 0 }]);
});

test('turnos simultâneos pelo mesmo serviço não misturam o que cada um gastou', async () => {
    const { servico } = criarCom({});
    const primeiro = new TurnoIa();
    const segundo = new TurnoIa();
    await Promise.all([
        executarNoTurno(primeiro, async () => { await servico.gerar({ ...PEDIDO, nivel: NivelIaEnum.ANALITICO }); }),
        executarNoTurno(segundo, async () => { await servico.gerar({ ...PEDIDO, nivel: NivelIaEnum.RAPIDO }); await servico.gerar({ ...PEDIDO, nivel: NivelIaEnum.RAPIDO }); }),
    ]);
    assert.deepEqual([primeiro.nivel, primeiro.tokens.entrada], [NivelIaEnum.ANALITICO, 1]);
    assert.deepEqual([segundo.nivel, segundo.tokens.entrada], [NivelIaEnum.RAPIDO, 2]);
});

// Fallback dentro da cadeia de cada nível.

const CADEIA_DE_TRES = [item(A, 'opus', EsforcoIaEnum.ALTO), item(G, 'gemini-pro-max', EsforcoIaEnum.MEDIO), item(O, 'o3', EsforcoIaEnum.BAIXO)];

test('fallback: sem falha, só o item principal do nível é chamado', async () => {
    const { servico, chamadas } = criarCom({ cadeiaAnalitico: CADEIA_DE_TRES });
    await servico.gerar({ ...PEDIDO, nivel: NivelIaEnum.ANALITICO });
    assert.deepEqual(chamadas.map((chamada) => chamada.provedor), [A]);
});

test('fallback: cada item seguinte usa o modelo e o esforço dele, na ordem da cadeia do nível', async () => {
    const { servico, chamadas } = criarCom(
        { cadeiaAnalitico: CADEIA_DE_TRES },
        { [A]: { falha: CAIU }, [G]: { falha: new IaException('LIMITE', 'limite') } },
    );
    const resultado = await servico.gerar({ ...PEDIDO, nivel: NivelIaEnum.ANALITICO });

    assert.deepEqual(chamadas.map((chamada) => [chamada.provedor, chamada.solicitacao.modelo, chamada.solicitacao.esforco]), [
        [A, 'opus', EsforcoIaEnum.ALTO],
        [G, 'gemini-pro-max', EsforcoIaEnum.MEDIO],
        [O, 'o3', EsforcoIaEnum.BAIXO],
    ]);
    assert.equal(resultado.modelo, 'o3');
});

test('fallback: a cadeia de um nível não interfere na dos outros', async () => {
    const { servico, chamadas } = criarCom(
        { cadeiaRapido: [item(A, 'haiku'), item(O, 'gpt-5-mini')] },
        { [A]: { falha: CAIU } },
    );
    await servico.gerar({ ...PEDIDO, nivel: NivelIaEnum.RAPIDO });
    await assert.rejects(() => servico.gerar({ ...PEDIDO, nivel: NivelIaEnum.PADRAO }), IaException);
    assert.deepEqual(chamadas.map((chamada) => [chamada.provedor, chamada.solicitacao.modelo]), [[A, 'haiku'], [O, 'gpt-5-mini'], [A, 'sonnet']]);
});

test('fallback: item sem chave é pulado sem ser chamado', async () => {
    const { servico, chamadas } = criarCom({ cadeiaRapido: [item(A, 'haiku'), item(G, 'gemini-flash'), item(O, 'gpt-5-mini')] }, { [A]: SEM_CHAVE, [G]: SEM_CHAVE });
    const resultado = await servico.gerar({ ...PEDIDO, nivel: NivelIaEnum.RAPIDO });
    assert.deepEqual(chamadas.map((chamada) => chamada.provedor), [O]);
    assert.equal(resultado.modelo, 'gpt-5-mini');
});

test('fallback: principal sem chave e contingência com limite devolve o limite (item pulado não é falha) e não derruba o estado', async () => {
    const { servico } = criarCom(
        { cadeiaRapido: [item(A, 'haiku'), item(G, 'gemini-flash'), item(O, 'gpt-5-mini')] },
        { [A]: SEM_CHAVE, [G]: { falha: new IaException('LIMITE', 'limite do Gemini') }, [O]: SEM_CHAVE },
    );
    await assert.rejects(
        () => servico.gerar({ ...PEDIDO, nivel: NivelIaEnum.RAPIDO }),
        (erro: unknown) => erro instanceof IaException && erro.motivo === 'LIMITE',
    );
    assert.equal(await servico.obterEstado(), EstadoIaEnum.NO_AR);
});

test('fallback: cadeia inteira falhando devolve a falha do primeiro item chamado', async () => {
    const { servico } = criarCom(
        { cadeiaRapido: [item(A, 'haiku'), item(G, 'gemini-flash'), item(O, 'gpt-5-mini')] },
        { [A]: { falha: new IaException('LIMITE', 'limite do principal') }, [G]: { falha: CAIU }, [O]: { falha: CAIU } },
    );
    await assert.rejects(
        () => servico.gerar({ ...PEDIDO, nivel: NivelIaEnum.RAPIDO }),
        (erro: unknown) => erro instanceof IaException && erro.motivo === 'LIMITE' && erro.mensagem === 'limite do principal',
    );
});

test('fallback no streaming: falha antes de qualquer trecho passa ao próximo; depois de um trecho enviado, não repete a resposta', async () => {
    const cadeia = { cadeiaPadrao: [item(A, 'sonnet'), item(G, 'gemini-pro')] };
    const antes = criarCom(cadeia, { [A]: { falha: CAIU } });
    const trechos: string[] = [];
    await antes.servico.transmitir({ ...PEDIDO, nivel: NivelIaEnum.PADRAO }, (trecho) => trechos.push(trecho));
    assert.deepEqual(trechos, ['um', 'dois']);
    assert.deepEqual(antes.chamadas.map((chamada) => chamada.provedor), [A, G]);

    const depois = criarCom(cadeia, { [A]: { falha: CAIU, trechoAntesDaFalha: 'meio' } });
    const recebidos: string[] = [];
    await assert.rejects(() => depois.servico.transmitir({ ...PEDIDO, nivel: NivelIaEnum.PADRAO }, (trecho) => recebidos.push(trecho)), IaException);
    assert.deepEqual(recebidos, ['meio']);
    assert.deepEqual(depois.chamadas.map((chamada) => chamada.provedor), [A]);
});

test('fallback: a chamada que respondeu no fallback é a que entra no turno, com o modelo planejado do principal', async () => {
    const { servico } = criarCom({ cadeiaPadrao: [item(A, 'sonnet'), item(G, 'gemini-pro')] }, { [A]: { falha: CAIU } });
    const turno = new TurnoIa();
    await executarNoTurno(turno, async () => {
        await servico.gerar({ ...PEDIDO, nivel: NivelIaEnum.PADRAO });
    });
    assert.deepEqual([turno.modelo, turno.modeloPlanejado], ['gemini-pro', 'sonnet']);
});

// Modelo planejado (decisão 9 da spec 261).

test('modelo planejado: o item principal respondeu, então é o próprio modelo devolvido (o provedor acrescenta a data ao nome configurado)', async () => {
    const { servico } = criarCom({}, { [A]: { sufixoDoModeloDevolvido: '-20261015' } });
    const resultado = await servico.gerar({ ...PEDIDO, nivel: NivelIaEnum.PADRAO });
    assert.equal(resultado.modelo, 'sonnet-20261015');
    assert.equal(resultado.modeloPlanejado, 'sonnet-20261015', 'sem troca de item não há alerta de fallback');
});

test('modelo planejado: um item de contingência respondeu, então o planejado é o modelo configurado do principal', async () => {
    const { servico } = criarCom({ cadeiaPadrao: [item(A, 'sonnet'), item(O, 'gpt-5')] }, { [A]: { falha: CAIU } });
    const resultado = await servico.gerar({ ...PEDIDO, nivel: NivelIaEnum.PADRAO });
    assert.deepEqual([resultado.modelo, resultado.modeloPlanejado], ['gpt-5', 'sonnet']);
});

test('modelo planejado: o principal foi pulado por falta de chave, e o planejado continua sendo o dele', async () => {
    const { servico } = criarCom({ cadeiaPadrao: [item(A, 'sonnet'), item(O, 'gpt-5')] }, { [A]: SEM_CHAVE });
    const resultado = await servico.transmitir({ ...PEDIDO, nivel: NivelIaEnum.PADRAO }, () => undefined);
    assert.deepEqual([resultado.modelo, resultado.modeloPlanejado], ['gpt-5', 'sonnet']);
});

// Troca de provedor dentro do turno (decisão 8): o histórico neutro segue, a assinatura do Gemini não.

const HISTORICO_COM_ASSINATURA: IaMensagem[] = [
    { papel: 'usuario', conteudo: 'e o prazo?' },
    { papel: 'ia', conteudo: [{ tipo: 'uso_ferramenta', id: 'gem_1', nome: 'consultar_prazo', entrada: { demanda: 3 }, assinatura: 'ASSINATURA-DO-GEMINI' }] },
    { papel: 'usuario', conteudo: [{ tipo: 'resultado_ferramenta', usoId: 'gem_1', conteudo: '10/11' }] },
];

test('troca de provedor no meio do turno: o histórico neutro vai ao próximo item sem a assinatura do Gemini', async () => {
    const { servico, chamadas } = criarCom({ cadeiaPadrao: [item(G, 'gemini-pro'), item(A, 'sonnet')] }, { [G]: { falha: CAIU } });
    await servico.gerar({ nivel: NivelIaEnum.PADRAO, mensagens: HISTORICO_COM_ASSINATURA });

    const [paraOGemini, paraAAnthropic] = chamadas;
    const usoParaOGemini = (paraOGemini.solicitacao.mensagens[1].conteudo as Array<{ assinatura?: string }>)[0];
    const usoParaAAnthropic = (paraAAnthropic.solicitacao.mensagens[1].conteudo as Array<{ assinatura?: string; nome?: string }>)[0];
    assert.equal(usoParaOGemini.assinatura, 'ASSINATURA-DO-GEMINI', 'o próprio Gemini recebe a assinatura que ele deu');
    assert.equal('assinatura' in usoParaAAnthropic, false, 'outro provedor não recebe a assinatura');
    assert.equal(usoParaAAnthropic.nome, 'consultar_prazo', 'a chamada de ferramenta segue intacta');
    assert.deepEqual(paraAAnthropic.solicitacao.mensagens[2], HISTORICO_COM_ASSINATURA[2], 'o resultado da ferramenta também segue');
    assert.equal(HISTORICO_COM_ASSINATURA[1].conteudo !== undefined && (HISTORICO_COM_ASSINATURA[1].conteudo as Array<{ assinatura?: string }>)[0].assinatura, 'ASSINATURA-DO-GEMINI', 'o histórico de quem chamou não é alterado');
});

test('o estado completo (administrador) lista só os provedores com chave no ambiente, sem expor a chave', async () => {
    const provedor = (disponivel: boolean): IaProvedor => ({ estaDisponivel: () => disponivel }) as unknown as IaProvedor;
    const configuracaoIaService = { obterAtiva: async () => configuracao() } as unknown as ConfiguracaoIaService;
    const servico = new IaService(configuracaoIaService, { [A]: provedor(true), [G]: provedor(false), [O]: provedor(true) });

    const completo = await servico.recuperarEstadoCompleto();
    assert.deepEqual(completo.dados.provedoresComChave, [A, O]);
    assert.equal(completo.dados.estado, EstadoIaEnum.NO_AR);
    assert.deepEqual(Object.keys((await servico.recuperarEstado()).dados), ['estado']);
});

// Listagem de modelos dos provedores (spec 309).

interface ComportamentoDaListagem {
    disponivel?: boolean;
    listar?: () => Promise<IaModeloListadoDto[]>;
}

function criarServicoDeModelos(comportamentos: Partial<Record<TipoProvedorIaEnum, ComportamentoDaListagem>> = {}) {
    const chamadas: TipoProvedorIaEnum[] = [];
    const provedores: IaProvedores = {};
    for (const tipo of Object.values(TipoProvedorIaEnum)) {
        const comportamento = comportamentos[tipo] ?? {};
        provedores[tipo] = {
            estaDisponivel: () => comportamento.disponivel ?? true,
            gerar: async () => { throw new Error('não usado'); },
            transmitir: async () => { throw new Error('não usado'); },
            async listarModelos() {
                chamadas.push(tipo);
                return (comportamento.listar ?? (async () => [{ id: `${tipo.toLowerCase()}-modelo`, nome: `Modelo ${tipo}` }]))();
            },
        };
    }
    const configuracaoIaService = { obterAtiva: async () => configuracao() } as unknown as ConfiguracaoIaService;
    return { servico: new IaService(configuracaoIaService, provedores), chamadas };
}

test('listarModelos devolve um registro por provedor; sem chave, disponivel = false sem chamar o provedor', async () => {
    const { servico, chamadas } = criarServicoDeModelos({ [G]: SEM_CHAVE });
    const { dados } = await servico.listarModelos();

    assert.deepEqual(dados.map((registro) => [registro.provedor, registro.disponivel, registro.modelos.length]), [[A, true, 1], [G, false, 0], [O, true, 1]]);
    assert.deepEqual(dados[0].modelos, [{ id: 'anthropic-modelo', nome: 'Modelo ANTHROPIC' }]);
    assert.deepEqual(chamadas.sort(), [A, O], 'o provedor sem chave nem foi chamado');
});

test('listarModelos: o cache evita nova chamada ao provedor na abertura seguinte', async () => {
    const { servico, chamadas } = criarServicoDeModelos();
    await servico.listarModelos();
    await servico.listarModelos();
    assert.equal(chamadas.length, 3, 'uma chamada por provedor, só na primeira abertura');
});

test('listarModelos: falha de um provedor não derruba os outros e não é guardada; a próxima abertura tenta de novo', async () => {
    let falhar = true;
    const { servico, chamadas } = criarServicoDeModelos({
        [O]: { listar: async () => { if (falhar) throw Object.assign(new Error('chave aparece aqui: sk-segredo'), { status: 503 }); return [{ id: 'gpt-5', nome: 'gpt-5' }]; } },
    });

    const primeira = (await servico.listarModelos()).dados;
    assert.deepEqual(primeira.map((registro) => [registro.provedor, registro.disponivel]), [[A, true], [G, true], [O, false]]);
    assert.deepEqual(primeira[2].modelos, []);

    falhar = false;
    const segunda = (await servico.listarModelos()).dados;
    assert.deepEqual(segunda[2], { provedor: O, disponivel: true, modelos: [{ id: 'gpt-5', nome: 'gpt-5' }] });
    assert.equal(chamadas.filter((tipo) => tipo === O).length, 2, 'a falha não entrou no cache');
    assert.equal(chamadas.filter((tipo) => tipo === A).length, 1, 'o sucesso de outro provedor segue em cache');
});

test('listarModelos: lista vazia depois do filtro vale como indisponível e não é guardada', async () => {
    let vazia = true;
    const { servico } = criarServicoDeModelos({ [G]: { listar: async () => (vazia ? [] : [{ id: 'gemini-2.5-pro', nome: 'Gemini 2.5 Pro' }]) } });
    assert.equal((await servico.listarModelos()).dados[1].disponivel, false);
    vazia = false;
    assert.deepEqual((await servico.listarModelos()).dados[1], { provedor: G, disponivel: true, modelos: [{ id: 'gemini-2.5-pro', nome: 'Gemini 2.5 Pro' }] });
});

test('listarModelos: duas aberturas simultâneas geram uma só requisição ao provedor', async () => {
    let liberar!: (modelos: IaModeloListadoDto[]) => void;
    const { servico, chamadas } = criarServicoDeModelos({ [A]: { listar: () => new Promise((resolver) => { liberar = resolver; }) }, [G]: SEM_CHAVE, [O]: SEM_CHAVE });
    const primeira = servico.listarModelos();
    const segunda = servico.listarModelos();
    await new Promise((resolver) => setImmediate(resolver));
    liberar([{ id: 'claude-haiku-5-5', nome: 'Claude Haiku 5.5' }]);
    const [um, dois] = await Promise.all([primeira, segunda]);
    assert.deepEqual(um.dados[0], dois.dados[0]);
    assert.equal(chamadas.length, 1);
});
