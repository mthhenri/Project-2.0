import { test } from 'vitest';
import * as assert from 'node:assert/strict';
import { FormControl, FormGroup } from '@angular/forms';
import {
    ConfiguracaoIaCadeiaItemDto,
    ConfiguracaoIaResumoDto,
    EsforcoIaEnum,
    EstadoIaEnum,
    ModoContextoChatEnum,
    NIVEIS_PADRAO_DA_PROPOSTA,
    NivelIaEnum,
    PropostaIaNivelEnum,
    TipoProvedorIaEnum,
    TipoPropostaIaEnum,
} from '@project20/shared';
import {
    AVISO_SEM_CHAVE,
    MAXIMO_DE_ITENS_DA_CADEIA,
    ROTULO_OUTRO_MODELO,
    VALOR_OUTRO_MODELO,
    modeloInicialDoProvedor,
    opcoesDoSelectDeModelo,
    NIVEIS_DA_TELA,
    OPCOES_PROVEDOR,
    ROTULO_ESTADO_IA,
    SEVERIDADE_ESTADO_IA,
    cadeiaSemItemUtilizavel,
    errosDeCadeias,
    errosPorNivel,
    formularioIgualAVersao,
    intervaloDoCheckinValido,
    moverItemDaCadeia,
    novoItemDaCadeia,
    paraDtoDeCriacao,
    proximoProvedorLivre,
    resumoDoItem,
    rotuloDoEsforco,
    rotuloDoProvedor,
    valoresDaVersao,
} from './configuracao-ia.util';

const { ANTHROPIC, GOOGLE, OPENAI } = TipoProvedorIaEnum;

const item = (provedor: TipoProvedorIaEnum, modelo: string, esforco: EsforcoIaEnum = EsforcoIaEnum.MEDIO): ConfiguracaoIaCadeiaItemDto => ({ provedor, modelo, esforco });

const VERSAO: ConfiguracaoIaResumoDto = {
    id: 4, versao: 3,
    cadeiaRapido: [item(ANTHROPIC, 'claude-haiku-5-5')],
    cadeiaPadrao: [item(ANTHROPIC, 'claude-sonnet-5-5')],
    cadeiaAnalitico: [item(ANTHROPIC, 'claude-opus-5-5', EsforcoIaEnum.ALTO)],
    checkinMinimoMinutos: 20, checkinMaximoMinutos: 40, duracaoRecomendadaMinutos: 90,
    checkinInteligente: true, rigorProporcional: false, deteccaoAutomatica: true,
    duvidasCodigo: false, modoContextoChat: ModoContextoChatEnum.MISTURADO, iaDesligada: false, niveisProposta: {},
    usuarioId: 1, usuarioNome: 'Admin', createdDate: new Date('2026-10-01T12:00:00Z'),
};

const grupoCom = (minimo: number | null, maximo: number | null) =>
    new FormGroup({ checkinMinimoMinutos: new FormControl(minimo), checkinMaximoMinutos: new FormControl(maximo) });

test('os três provedores podem ser escolhidos', () => {
    assert.deepEqual(OPCOES_PROVEDOR.filter((opcao) => !opcao.desabilitada).map((opcao) => opcao.valor), [
        TipoProvedorIaEnum.ANTHROPIC, TipoProvedorIaEnum.GOOGLE, TipoProvedorIaEnum.OPENAI,
    ]);
});

test('rotuloDoProvedor devolve o nome de cada provedor', () => {
    assert.equal(rotuloDoProvedor(TipoProvedorIaEnum.ANTHROPIC), 'Anthropic');
    assert.equal(rotuloDoProvedor(TipoProvedorIaEnum.GOOGLE), 'Google (Gemini)');
    assert.equal(rotuloDoProvedor(TipoProvedorIaEnum.OPENAI), 'OpenAI');
});

test('rotuloDoEsforco devolve o rótulo em português; valor desconhecido volta como veio', () => {
    assert.equal(rotuloDoEsforco(EsforcoIaEnum.BAIXO), 'Baixo');
    assert.equal(rotuloDoEsforco(EsforcoIaEnum.MEDIO), 'Médio');
    assert.equal(rotuloDoEsforco(EsforcoIaEnum.ALTO), 'Alto');
    assert.equal(rotuloDoEsforco('EXTREMO' as EsforcoIaEnum), 'EXTREMO');
});

test('todo estado da IA tem rótulo e severidade (no ar verde, fora do ar vermelho, desligada neutra)', () => {
    for (const estado of Object.values(EstadoIaEnum)) {
        assert.ok(ROTULO_ESTADO_IA[estado], estado);
        assert.ok(SEVERIDADE_ESTADO_IA[estado], estado);
    }
    assert.equal(ROTULO_ESTADO_IA[EstadoIaEnum.NO_AR], 'No ar');
    assert.equal(SEVERIDADE_ESTADO_IA[EstadoIaEnum.NO_AR], 'success');
    assert.equal(SEVERIDADE_ESTADO_IA[EstadoIaEnum.FORA_DO_AR], 'danger');
    assert.equal(SEVERIDADE_ESTADO_IA[EstadoIaEnum.DESLIGADA], 'secondary');
});

test('intervaloDoCheckinValido: mínimo menor que o máximo passa; igual ou maior falha', () => {
    assert.equal(intervaloDoCheckinValido(grupoCom(20, 40)), null);
    assert.deepEqual(intervaloDoCheckinValido(grupoCom(40, 40)), { intervaloInvalido: true });
    assert.deepEqual(intervaloDoCheckinValido(grupoCom(50, 40)), { intervaloInvalido: true });
});

test('intervaloDoCheckinValido: campo ainda vazio não acusa intervalo (o "obrigatório" é de cada campo)', () => {
    assert.equal(intervaloDoCheckinValido(grupoCom(null, 40)), null);
    assert.equal(intervaloDoCheckinValido(grupoCom(20, null)), null);
    assert.equal(intervaloDoCheckinValido(new FormGroup({})), null);
});

test('valoresDaVersao copia só os campos do formulário (sem id, versão, autor nem data)', () => {
    const valores = valoresDaVersao(VERSAO);
    assert.deepEqual(Object.keys(valores).sort(), [
        'cadeiaAnalitico', 'cadeiaPadrao', 'cadeiaRapido', 'checkinInteligente', 'checkinMaximoMinutos', 'checkinMinimoMinutos', 'deteccaoAutomatica',
        'duracaoRecomendadaMinutos', 'duvidasCodigo', 'iaDesligada', 'modoContextoChat', 'niveisProposta', 'rigorProporcional',
    ]);
    assert.deepEqual(valores.cadeiaAnalitico, [item(ANTHROPIC, 'claude-opus-5-5', EsforcoIaEnum.ALTO)]);
    assert.equal(valores.rigorProporcional, false);
});

test('valoresDaVersao copia as cadeias: mexer no formulário não altera a versão do histórico', () => {
    const valores = valoresDaVersao(VERSAO);
    valores.cadeiaRapido[0].modelo = 'outro';
    assert.equal(VERSAO.cadeiaRapido[0].modelo, 'claude-haiku-5-5');
});

test('formularioIgualAVersao: igual à versão não há o que salvar; qualquer campo diferente habilita salvar', () => {
    assert.equal(formularioIgualAVersao(valoresDaVersao(VERSAO), VERSAO), true);
    assert.equal(formularioIgualAVersao({ ...valoresDaVersao(VERSAO), iaDesligada: true }, VERSAO), false);
    assert.equal(formularioIgualAVersao({ ...valoresDaVersao(VERSAO), checkinMaximoMinutos: 41 }, VERSAO), false);
    assert.equal(formularioIgualAVersao({ ...valoresDaVersao(VERSAO), duvidasCodigo: true }, VERSAO), false);
    assert.equal(formularioIgualAVersao({ ...valoresDaVersao(VERSAO), modoContextoChat: ModoContextoChatEnum.SEPARADO }, VERSAO), false);
});

test('formularioIgualAVersao: mudar só o esforço de um item, o modelo, a ordem ou o tamanho da cadeia habilita salvar', () => {
    const base = valoresDaVersao(VERSAO);
    assert.equal(formularioIgualAVersao({ ...base, cadeiaAnalitico: [item(ANTHROPIC, 'claude-opus-5-5', EsforcoIaEnum.MEDIO)] }, VERSAO), false);
    assert.equal(formularioIgualAVersao({ ...base, cadeiaRapido: [item(ANTHROPIC, 'claude-haiku-5-6')] }, VERSAO), false);
    assert.equal(formularioIgualAVersao({ ...base, cadeiaPadrao: [...base.cadeiaPadrao, item(OPENAI, 'gpt-5')] }, VERSAO), false);
    const comDuas = { ...VERSAO, cadeiaPadrao: [item(ANTHROPIC, 'a'), item(OPENAI, 'gpt-5')] };
    const duas = valoresDaVersao(comDuas);
    assert.equal(formularioIgualAVersao({ ...duas, cadeiaPadrao: [duas.cadeiaPadrao[1], duas.cadeiaPadrao[0]] }, comDuas), false);
});

test('espaços nas pontas do modelo não contam como alteração e o DTO os apara', () => {
    const base = valoresDaVersao(VERSAO);
    const comEspaco = { ...base, cadeiaRapido: [item(ANTHROPIC, '  claude-haiku-5-5 ')] };
    assert.equal(formularioIgualAVersao(comEspaco, VERSAO), true);
    assert.equal(paraDtoDeCriacao(comEspaco).cadeiaRapido[0].modelo, 'claude-haiku-5-5');
});

test('paraDtoDeCriacao leva as três cadeias e mantém o restante', () => {
    const dto = paraDtoDeCriacao(valoresDaVersao(VERSAO));
    assert.deepEqual([dto.cadeiaRapido, dto.cadeiaPadrao, dto.cadeiaAnalitico], [VERSAO.cadeiaRapido, VERSAO.cadeiaPadrao, VERSAO.cadeiaAnalitico]);
    assert.equal(dto.checkinMinimoMinutos, 20);
    assert.equal(dto.duracaoRecomendadaMinutos, 90);
    assert.equal(dto.iaDesligada, false);
    assert.equal(dto.duvidasCodigo, false);
    assert.equal(dto.modoContextoChat, ModoContextoChatEnum.MISTURADO);
});

test('errosDeCadeias aponta cadeia vazia, provedor repetido, modelo vazio ou de outro provedor, com a mensagem do shared', () => {
    const base = valoresDaVersao(VERSAO);
    assert.deepEqual(errosDeCadeias(base), []);
    assert.deepEqual(errosDeCadeias({ ...base, cadeiaRapido: [] }), ['A cadeia do nível rápido precisa ter ao menos um item']);
    assert.deepEqual(errosDeCadeias({ ...base, cadeiaPadrao: [item(OPENAI, 'gpt-5'), item(OPENAI, 'gpt-5-mini')] }), ['OpenAI aparece mais de uma vez na cadeia do nível padrão']);
    assert.deepEqual(errosDeCadeias({ ...base, cadeiaAnalitico: [item(ANTHROPIC, '   ')] }), ['O modelo do item 1 (Anthropic) da cadeia do nível analítico não foi informado']);
    assert.deepEqual(errosDeCadeias({ ...base, cadeiaRapido: [item(ANTHROPIC, 'gpt-5')] }), ['O modelo "gpt-5" não é de Anthropic (cadeia do nível rápido)']);
});

test('provedor sem chave no ambiente não é erro de cadeia: só ganha o aviso na tela', () => {
    const base = valoresDaVersao({ ...VERSAO, cadeiaRapido: [item(GOOGLE, 'gemini-2.5-flash')] });
    assert.deepEqual(errosDeCadeias(base), []);
    assert.equal(AVISO_SEM_CHAVE, 'Chave de Provedor não configurada');
});

test('errosPorNivel: só os níveis com problema, cada um com as suas mensagens', () => {
    const base = valoresDaVersao(VERSAO);
    assert.deepEqual(errosPorNivel(base), {});
    const quebrado = { ...base, cadeiaPadrao: [], cadeiaAnalitico: [item(ANTHROPIC, 'gpt-5')] };
    assert.deepEqual(errosPorNivel(quebrado), {
        [NivelIaEnum.PADRAO]: ['A cadeia do nível padrão precisa ter ao menos um item'],
        [NivelIaEnum.ANALITICO]: ['O modelo "gpt-5" não é de Anthropic (cadeia do nível analítico)'],
    });
});

test('os três níveis da tela: rápido, padrão e analítico, cada um com o seu campo de cadeia', () => {
    assert.deepEqual(NIVEIS_DA_TELA.map((nivel) => [nivel.nivel, nivel.campo, nivel.titulo]), [
        [NivelIaEnum.RAPIDO, 'cadeiaRapido', 'Rápido'],
        [NivelIaEnum.PADRAO, 'cadeiaPadrao', 'Padrão'],
        [NivelIaEnum.ANALITICO, 'cadeiaAnalitico', 'Analítico'],
    ]);
});

test('proximoProvedorLivre e novoItemDaCadeia: o primeiro provedor que a cadeia ainda não usa, com a primeira sugestão dele e esforço médio', () => {
    assert.equal(proximoProvedorLivre([item(ANTHROPIC, 'a')]), GOOGLE);
    assert.equal(proximoProvedorLivre([item(ANTHROPIC, 'a'), item(GOOGLE, 'g')]), OPENAI);
    assert.equal(proximoProvedorLivre([item(GOOGLE, 'g')]), ANTHROPIC);
    assert.equal(novoItemDaCadeia([item(ANTHROPIC, 'a')])?.provedor, GOOGLE);
    assert.deepEqual(novoItemDaCadeia([item(ANTHROPIC, 'a'), item(GOOGLE, 'g')]), { provedor: OPENAI, modelo: 'gpt-5-mini', esforco: EsforcoIaEnum.MEDIO });
});

test('a cadeia cheia (um item por provedor) não aceita mais itens', () => {
    const cheia = OPCOES_PROVEDOR.map((opcao) => item(opcao.valor, 'x'));
    assert.equal(cheia.length, MAXIMO_DE_ITENS_DA_CADEIA);
    assert.equal(proximoProvedorLivre(cheia), null);
    assert.equal(novoItemDaCadeia(cheia), null);
});

test('moverItemDaCadeia troca com o vizinho e não passa dos limites nem altera a cadeia original', () => {
    const cadeia = [item(ANTHROPIC, 'a'), item(GOOGLE, 'g'), item(OPENAI, 'o')];
    assert.deepEqual(moverItemDaCadeia(cadeia, 1, -1).map((itemDaCadeia) => itemDaCadeia.provedor), [GOOGLE, ANTHROPIC, OPENAI]);
    assert.deepEqual(moverItemDaCadeia(cadeia, 1, 1).map((itemDaCadeia) => itemDaCadeia.provedor), [ANTHROPIC, OPENAI, GOOGLE]);
    assert.deepEqual(moverItemDaCadeia(cadeia, 0, -1).map((itemDaCadeia) => itemDaCadeia.provedor), [ANTHROPIC, GOOGLE, OPENAI], 'o primeiro não sobe');
    assert.deepEqual(moverItemDaCadeia(cadeia, 2, 1).map((itemDaCadeia) => itemDaCadeia.provedor), [ANTHROPIC, GOOGLE, OPENAI], 'o último não desce');
    assert.deepEqual(cadeia.map((itemDaCadeia) => itemDaCadeia.provedor), [ANTHROPIC, GOOGLE, OPENAI]);
});

test('cadeiaSemItemUtilizavel: só afirma quando se sabe quais provedores têm chave', () => {
    const cadeia = [item(ANTHROPIC, 'a'), item(GOOGLE, 'g')];
    assert.equal(cadeiaSemItemUtilizavel(cadeia, [OPENAI]), true);
    assert.equal(cadeiaSemItemUtilizavel(cadeia, [GOOGLE]), false);
    assert.equal(cadeiaSemItemUtilizavel(cadeia, null), false, 'estado não lido: o nível não é acusado');
});

test('resumoDoItem escreve provedor, modelo e esforço', () => {
    assert.equal(resumoDoItem(item(OPENAI, 'gpt-6.1-sol', EsforcoIaEnum.MEDIO)), 'OpenAI · gpt-6.1-sol · Médio');
});

test('níveis de autonomia (task 228): a versão sem o mapa, ou com o mapa incompleto, abre no formulário com o padrão do shared', () => {
    assert.deepEqual(valoresDaVersao({ ...VERSAO, niveisProposta: null as never }).niveisProposta, NIVEIS_PADRAO_DA_PROPOSTA);
    const parcial = valoresDaVersao({ ...VERSAO, niveisProposta: { [TipoPropostaIaEnum.ANOTAR_PAD]: PropostaIaNivelEnum.PERGUNTA } }).niveisProposta;
    assert.equal(parcial[TipoPropostaIaEnum.ANOTAR_PAD], PropostaIaNivelEnum.PERGUNTA);
    assert.equal(parcial[TipoPropostaIaEnum.CRIAR_ATIVIDADE], PropostaIaNivelEnum.FAZ_E_AVISA);
});

test('níveis de autonomia: o DTO de criação leva o mapa completo e o formulário com o padrão explícito é igual à versão sem o mapa', () => {
    const valor = valoresDaVersao(VERSAO);
    assert.deepEqual(paraDtoDeCriacao(valor).niveisProposta, NIVEIS_PADRAO_DA_PROPOSTA);
    assert.equal(formularioIgualAVersao(valor, VERSAO), true);
    assert.equal(formularioIgualAVersao({ ...valor, niveisProposta: { ...valor.niveisProposta, [TipoPropostaIaEnum.ANOTAR_PAD]: PropostaIaNivelEnum.PERGUNTA } }, VERSAO), false);
});

test('opcoesDoSelectDeModelo: a lista do provedor e, no fim, "Outro modelo…" (que nunca é um modelo gravado)', () => {
    const lista = [{ id: 'claude-opus-5-5', nome: 'Claude Opus 5.5' }, { id: 'claude-haiku-5-5', nome: 'Claude Haiku 5.5' }];
    const opcoes = opcoesDoSelectDeModelo(lista, 'claude-haiku-5-5');
    assert.deepEqual(opcoes, [...lista, { id: VALOR_OUTRO_MODELO, nome: ROTULO_OUTRO_MODELO }]);
    assert.equal(ROTULO_OUTRO_MODELO, 'Outro modelo…');
});

test('opcoesDoSelectDeModelo: o valor salvo fora da lista continua como opção (modelo retirado, filtrado ou digitado à mão)', () => {
    const lista = [{ id: 'claude-opus-5-5', nome: 'Claude Opus 5.5' }];
    const opcoes = opcoesDoSelectDeModelo(lista, 'claude-experimental');
    assert.deepEqual(opcoes.map((opcao) => opcao.id), ['claude-experimental', 'claude-opus-5-5', VALOR_OUTRO_MODELO]);
    assert.equal(opcoes[0].nome, 'claude-experimental');
    assert.deepEqual(opcoesDoSelectDeModelo(lista, '  ').map((opcao) => opcao.id), ['claude-opus-5-5', VALOR_OUTRO_MODELO], 'valor vazio não vira opção');
});

test('modeloInicialDoProvedor: o primeiro da lista (o mais novo) ou, sem lista, a primeira sugestão fixa', () => {
    assert.equal(modeloInicialDoProvedor(OPENAI, [{ id: 'gpt-6.1-sol', nome: 'gpt-6.1-sol' }, { id: 'gpt-5', nome: 'gpt-5' }]), 'gpt-6.1-sol');
    assert.equal(modeloInicialDoProvedor(OPENAI, null), 'gpt-5-mini');
    assert.equal(modeloInicialDoProvedor(OPENAI, []), 'gpt-5-mini');
    assert.equal(modeloInicialDoProvedor(GOOGLE, null), 'gemini-2.5-flash');
});
