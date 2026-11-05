import { test } from 'node:test';
import * as assert from 'node:assert/strict';
import {
    ConfiguracaoIaCadeiaItemDto,
    ConfiguracaoIaCriarDto,
    ConfiguracaoIaResumoDto,
    EsforcoIaEnum,
    ModoContextoChatEnum,
    NIVEIS_PADRAO_DA_PROPOSTA,
    PropostaIaNivelEnum,
    TipoProvedorIaEnum,
    TipoPropostaIaEnum,
    TipoUsuarioEnum,
} from '@project20/shared';
import { BusinessException } from '../../../core/exceptions/business.exception';
import { UnauthorizedAccessException } from '../../../core/exceptions/unauthorized-access.exception';
import { ConfiguracaoIaRepository } from '../repositories/configuracao-ia.repository';
import { ConfiguracaoIaService } from './configuracao-ia.service';

const ADMINISTRADOR = { sub: 1, tipo: TipoUsuarioEnum.ADMINISTRADOR } as never;
const GESTOR = { sub: 2, tipo: TipoUsuarioEnum.GESTOR } as never;
const DESENVOLVEDOR = { sub: 3, tipo: TipoUsuarioEnum.DESENVOLVEDOR } as never;

const A = TipoProvedorIaEnum.ANTHROPIC;
const G = TipoProvedorIaEnum.GOOGLE;
const O = TipoProvedorIaEnum.OPENAI;

const item = (provedor: TipoProvedorIaEnum, modelo: string, esforco: EsforcoIaEnum = EsforcoIaEnum.MEDIO): ConfiguracaoIaCadeiaItemDto => ({ provedor, modelo, esforco });

const BASE: ConfiguracaoIaCriarDto = {
    cadeiaRapido: [item(A, 'claude-haiku-5-5')],
    cadeiaPadrao: [item(A, 'claude-sonnet-5-5')],
    cadeiaAnalitico: [item(A, 'claude-opus-5-5')],
    checkinMinimoMinutos: 30,
    checkinMaximoMinutos: 80,
    duracaoRecomendadaMinutos: 90,
    checkinInteligente: true,
    rigorProporcional: true,
    deteccaoAutomatica: true,
    duvidasCodigo: false,
    modoContextoChat: ModoContextoChatEnum.MISTURADO,
    iaDesligada: true,
};

function resumoDe(versao: number, dto: ConfiguracaoIaCriarDto): ConfiguracaoIaResumoDto {
    return { id: versao, versao, usuarioId: 1, usuarioNome: 'Admin', createdDate: new Date(), ...dto, niveisProposta: dto.niveisProposta ?? {} };
}

/** Repositório em memória: guarda as versões e conta as leituras da ativa. */
function criarRepositorio() {
    const versoes: ConfiguracaoIaResumoDto[] = [resumoDe(1, BASE)];
    const estado = { leiturasDaAtiva: 0, recebidos: [] as ConfiguracaoIaCriarDto[] };
    const repositorio = {
        async recuperarAtiva() {
            estado.leiturasDaAtiva++;
            return versoes[versoes.length - 1];
        },
        async listar() {
            return { itens: [...versoes].reverse(), total: versoes.length };
        },
        async inserirNovaVersao(dto: ConfiguracaoIaCriarDto) {
            estado.recebidos.push(dto);
            const nova = resumoDe(versoes[versoes.length - 1].versao + 1, dto);
            versoes.push(nova);
            return nova;
        },
    } as unknown as ConfiguracaoIaRepository;
    return { repositorio, versoes, estado };
}

test('criar grava a versão seguinte sem alterar a anterior e renova o cache', async () => {
    const { repositorio, versoes, estado } = criarRepositorio();
    const servico = new ConfiguracaoIaService(repositorio);

    assert.equal((await servico.obterAtiva()).versao, 1);
    const resposta = await servico.criar({ ...BASE, cadeiaPadrao: [item(A, 'claude-sonnet-5-5-novo')], iaDesligada: false }, ADMINISTRADOR);

    assert.equal(resposta.dados.versao, 2);
    assert.equal(versoes[0].cadeiaPadrao[0].modelo, 'claude-sonnet-5-5', 'a versão 1 não muda');
    assert.equal((await servico.obterAtiva()).cadeiaPadrao[0].modelo, 'claude-sonnet-5-5-novo');
    assert.equal(estado.leiturasDaAtiva, 1, 'a leitura seguinte vem do cache, sem ir ao banco');
});

test('criar leva as duas flags das dúvidas de código para a versão nova e a anterior continua intacta', async () => {
    const { repositorio, versoes } = criarRepositorio();
    const servico = new ConfiguracaoIaService(repositorio);

    const resposta = await servico.criar({ ...BASE, duvidasCodigo: true, modoContextoChat: ModoContextoChatEnum.SEPARADO }, ADMINISTRADOR);

    assert.equal(resposta.dados.duvidasCodigo, true);
    assert.equal(resposta.dados.modoContextoChat, ModoContextoChatEnum.SEPARADO);
    assert.equal(versoes[0].duvidasCodigo, false, 'a versão 1 não muda');
    assert.equal(versoes[0].modoContextoChat, ModoContextoChatEnum.MISTURADO);
    const ativa = await servico.obterAtiva();
    assert.equal(ativa.duvidasCodigo, true);
    assert.equal(ativa.modoContextoChat, ModoContextoChatEnum.SEPARADO);
});

test('obterAtiva lê o banco uma vez e depois usa o cache', async () => {
    const { repositorio, estado } = criarRepositorio();
    const servico = new ConfiguracaoIaService(repositorio);
    await servico.obterAtiva();
    await servico.obterAtiva();
    await servico.obterAtiva();
    assert.equal(estado.leiturasDaAtiva, 1);
});

test('intervalo de check-in invertido ou igual é recusado e nada é gravado', async () => {
    const { repositorio, versoes } = criarRepositorio();
    const servico = new ConfiguracaoIaService(repositorio);
    await assert.rejects(() => servico.criar({ ...BASE, checkinMinimoMinutos: 80, checkinMaximoMinutos: 30 }, ADMINISTRADOR), BusinessException);
    await assert.rejects(() => servico.criar({ ...BASE, checkinMinimoMinutos: 50, checkinMaximoMinutos: 50 }, ADMINISTRADOR), BusinessException);
    assert.equal(versoes.length, 1);
});

const mensagemDe = (erro: BusinessException): string => (erro.getResponse() as { mensagem: string }).mensagem;

test('criar grava uma cadeia por nível, na ordem dada, cada uma com os itens dela', async () => {
    const { repositorio } = criarRepositorio();
    const servico = new ConfiguracaoIaService(repositorio);
    const cadeias = {
        cadeiaRapido: [item(O, 'gpt-5-mini', EsforcoIaEnum.ALTO), item(A, 'claude-haiku-5-5')],
        cadeiaPadrao: [item(O, 'gpt-6.1-sol')],
        cadeiaAnalitico: [item(A, 'claude-opus-5-5', EsforcoIaEnum.ALTO), item(G, 'gemini-pro'), item(O, 'o3', EsforcoIaEnum.BAIXO)],
    };
    const resposta = await servico.criar({ ...BASE, ...cadeias }, ADMINISTRADOR);
    assert.deepEqual([resposta.dados.cadeiaRapido, resposta.dados.cadeiaPadrao, resposta.dados.cadeiaAnalitico], [cadeias.cadeiaRapido, cadeias.cadeiaPadrao, cadeias.cadeiaAnalitico]);
});

test('alterar só o esforço do item do analítico cria uma versão nova e deixa os outros níveis como estavam', async () => {
    const { repositorio, versoes } = criarRepositorio();
    const servico = new ConfiguracaoIaService(repositorio);
    const resposta = await servico.criar({ ...BASE, cadeiaAnalitico: [item(A, 'claude-opus-5-5', EsforcoIaEnum.ALTO)] }, ADMINISTRADOR);
    assert.equal(resposta.dados.versao, 2);
    assert.equal(resposta.dados.cadeiaAnalitico[0].esforco, EsforcoIaEnum.ALTO);
    assert.deepEqual([resposta.dados.cadeiaRapido, resposta.dados.cadeiaPadrao], [BASE.cadeiaRapido, BASE.cadeiaPadrao]);
    assert.equal(versoes[0].cadeiaAnalitico[0].esforco, EsforcoIaEnum.MEDIO, 'a versão 1 não muda');
});

test('provedor sem chave não invalida a configuração: o servidor não conhece chave, só a regra de coerência', async () => {
    const { repositorio } = criarRepositorio();
    const servico = new ConfiguracaoIaService(repositorio);
    const resposta = await servico.criar({ ...BASE, cadeiaRapido: [item(G, 'gemini-flash')] }, ADMINISTRADOR);
    assert.equal(resposta.dados.cadeiaRapido[0].provedor, G);
});

test('cadeia vazia, provedor repetido, modelo vazio, de outro provedor ou esforço inválido são recusados e nada é gravado', async () => {
    const { repositorio, versoes } = criarRepositorio();
    const servico = new ConfiguracaoIaService(repositorio);
    const recusas: Array<[Partial<ConfiguracaoIaCriarDto>, RegExp]> = [
        [{ cadeiaRapido: [] }, /A cadeia do nível rápido precisa ter ao menos um item/],
        [{ cadeiaPadrao: [item(O, 'gpt-5'), item(A, 'claude-sonnet-5-5'), item(O, 'gpt-5-mini')] }, /OpenAI aparece mais de uma vez na cadeia do nível padrão/],
        [{ cadeiaAnalitico: [item(A, '   ')] }, /não foi informado/],
        [{ cadeiaAnalitico: [item(O, 'claude-opus-5-5')] }, /não é de OpenAI/],
        [{ cadeiaRapido: [item(A, 'claude-haiku-5-5', 'ENORME' as never)] }, /esforço do item 1/],
    ];
    for (const [alteracao, mensagem] of recusas) {
        await assert.rejects(
            () => servico.criar({ ...BASE, ...alteracao }, ADMINISTRADOR),
            (erro: unknown) => erro instanceof BusinessException && mensagem.test(mensagemDe(erro)),
        );
    }
    assert.equal(versoes.length, 1);
});

test('os nomes de modelo são gravados sem espaço nas pontas', async () => {
    const { repositorio } = criarRepositorio();
    const servico = new ConfiguracaoIaService(repositorio);
    const resposta = await servico.criar(
        { ...BASE, cadeiaRapido: [item(A, ' claude-haiku-5-5 ')], cadeiaPadrao: [item(A, 'claude-sonnet-5-5\n')], cadeiaAnalitico: [item(A, ' Claude-Opus-5-5')] },
        ADMINISTRADOR,
    );
    assert.deepEqual([resposta.dados.cadeiaRapido[0].modelo, resposta.dados.cadeiaPadrao[0].modelo, resposta.dados.cadeiaAnalitico[0].modelo], ['claude-haiku-5-5', 'claude-sonnet-5-5', 'Claude-Opus-5-5']);
});

test('só administrador lê, lista e grava; gestor e desenvolvedor são recusados', async () => {
    const { repositorio, versoes } = criarRepositorio();
    const servico = new ConfiguracaoIaService(repositorio);
    for (const usuario of [GESTOR, DESENVOLVEDOR]) {
        await assert.rejects(() => servico.recuperarAtiva(usuario), UnauthorizedAccessException);
        await assert.rejects(() => servico.listar({}, usuario), UnauthorizedAccessException);
        await assert.rejects(() => servico.criar(BASE, usuario), UnauthorizedAccessException);
    }
    assert.equal(versoes.length, 1);
    assert.equal((await servico.recuperarAtiva(ADMINISTRADOR)).dados.versao, 1);
});

test('listar devolve o histórico paginado, mais nova primeiro', async () => {
    const { repositorio } = criarRepositorio();
    const servico = new ConfiguracaoIaService(repositorio);
    await servico.criar(BASE, ADMINISTRADOR);
    const resposta = await servico.listar({ itensPorPagina: 1 }, ADMINISTRADOR);
    assert.equal(resposta.dados.itens[0].versao, 2);
    assert.equal(resposta.dados.totalItens, 2);
    assert.equal(resposta.dados.totalPaginas, 2);
});

// --- Autonomia da IA por tipo de proposta (task 228) ---

test('criar com níveis grava o mapa completo: a regra que faltou vem com o padrão', async () => {
    const { repositorio, estado } = criarRepositorio();
    const servico = new ConfiguracaoIaService(repositorio);
    const resposta = await servico.criar({ ...BASE, niveisProposta: { [TipoPropostaIaEnum.ANOTAR_PAD]: PropostaIaNivelEnum.PERGUNTA } }, ADMINISTRADOR);

    assert.deepEqual(estado.recebidos[0].niveisProposta, { ...NIVEIS_PADRAO_DA_PROPOSTA, [TipoPropostaIaEnum.ANOTAR_PAD]: PropostaIaNivelEnum.PERGUNTA });
    assert.equal(resposta.dados.niveisProposta[TipoPropostaIaEnum.ANOTAR_PAD], PropostaIaNivelEnum.PERGUNTA);
    assert.equal((await servico.obterAtiva()).niveisProposta[TipoPropostaIaEnum.ANOTAR_PAD], PropostaIaNivelEnum.PERGUNTA, 'o cache já traz o mapa novo');
});

test('criar recusa regra que não se configura e nível fixo, sem gravar versão', async () => {
    const { repositorio, estado, versoes } = criarRepositorio();
    const servico = new ConfiguracaoIaService(repositorio);
    for (const niveisProposta of [
        { [TipoPropostaIaEnum.CRIAR_PROJETO]: PropostaIaNivelEnum.FAZ_E_AVISA },
        { INVENTADA: PropostaIaNivelEnum.PERGUNTA },
        { [TipoPropostaIaEnum.ANOTAR_PAD]: PropostaIaNivelEnum.SEMPRE_PERGUNTA },
    ]) {
        await assert.rejects(() => servico.criar({ ...BASE, niveisProposta }, ADMINISTRADOR), BusinessException);
    }
    assert.equal(estado.recebidos.length, 0);
    assert.equal(versoes.length, 1);
});

test('criar sem níveis deixa o repositório copiar os da versão anterior', async () => {
    const { repositorio, estado } = criarRepositorio();
    const servico = new ConfiguracaoIaService(repositorio);
    await servico.criar(BASE, ADMINISTRADOR);
    assert.equal(estado.recebidos[0].niveisProposta, undefined);
});

test('uma versão anterior à autonomia (níveis nulos) é lida com o padrão, na ativa e no histórico', async () => {
    const { repositorio, versoes } = criarRepositorio();
    versoes[0] = { ...versoes[0], niveisProposta: null as never };
    const servico = new ConfiguracaoIaService(repositorio);
    assert.deepEqual((await servico.obterAtiva()).niveisProposta, NIVEIS_PADRAO_DA_PROPOSTA);
    assert.deepEqual((await servico.listar({}, ADMINISTRADOR)).dados.itens[0].niveisProposta, NIVEIS_PADRAO_DA_PROPOSTA);
});
