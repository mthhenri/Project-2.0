import { test } from 'node:test';
import assert from 'node:assert/strict';
import { PropostaIaNivelEnum } from '../enums/proposta-ia-nivel.enum';
import { TipoAnotacaoEnum } from '../enums/tipo-anotacao.enum';
import { TipoAtividadeStatusEnum } from '../enums/tipo-atividade-status.enum';
import { TipoPropostaIaEnum } from '../enums/tipo-proposta-ia.enum';
import {
  CHAVES_CONFIGURAVEIS_DE_NIVEL,
  ehEmNomeDeOutraPessoa,
  nivelDaProposta,
  nivelPadraoDaChave,
  NIVEIS_PADRAO_DA_PROPOSTA,
  normalizarNiveisDaProposta,
  REGRA_MARCAR_ATIVIDADE_DESENVOLVIDA,
  TIPOS_COM_NIVEL_FIXO,
  tipoDaChaveDeNivel,
  validarNiveisDaProposta,
} from './proposta-nivel';

const USUARIO = 7;

test('todo tipo de proposta tem um nível: ou é fixo, ou é configurável', () => {
  for (const tipo of Object.values(TipoPropostaIaEnum)) {
    const configuravel = CHAVES_CONFIGURAVEIS_DE_NIVEL.includes(tipo);
    const fixo = TIPOS_COM_NIVEL_FIXO.includes(tipo);
    assert.equal(configuravel !== fixo, true, `${tipo} deve ser configurável ou fixo, não os dois nem nenhum`);
  }
});

test('os fixos são os que mexem em horas, em ponto ou em projeto', () => {
  assert.deepEqual(
    [...TIPOS_COM_NIVEL_FIXO].sort(),
    [TipoPropostaIaEnum.CORRIGIR_EXECUCAO, TipoPropostaIaEnum.CRIAR_PROJETO, TipoPropostaIaEnum.JUSTIFICAR_PONTO, TipoPropostaIaEnum.REGISTRAR_EXECUCAO].sort(),
  );
});

test('o padrão segue a tabela de níveis da guarda-chuva', () => {
  const fazEAvisa = [
    TipoPropostaIaEnum.ANOTAR_PAD,
    TipoPropostaIaEnum.ATRIBUIR_TAG,
    TipoPropostaIaEnum.DESCREVER_EXECUCAO,
    TipoPropostaIaEnum.CONECTAR_DEMANDA,
    TipoPropostaIaEnum.DESCONECTAR_DEMANDA,
    TipoPropostaIaEnum.CRIAR_ATIVIDADE,
    TipoPropostaIaEnum.INICIAR_EXECUCAO,
    TipoPropostaIaEnum.PAUSAR_EXECUCAO,
    REGRA_MARCAR_ATIVIDADE_DESENVOLVIDA,
  ];
  const pergunta = [
    TipoPropostaIaEnum.ALTERAR_ATIVIDADE,
    TipoPropostaIaEnum.CRIAR_DEMANDA,
    TipoPropostaIaEnum.ALTERAR_DEMANDA,
    TipoPropostaIaEnum.DESCREVER_DEMANDA,
    TipoPropostaIaEnum.SUSPENDER_CHECKIN,
    TipoPropostaIaEnum.ATRIBUIR_MEMBRO,
    TipoPropostaIaEnum.CONCLUIR_DEMANDA,
    TipoPropostaIaEnum.MOVER_ATIVIDADE,
    TipoPropostaIaEnum.EXCLUIR_ATIVIDADE,
  ];
  for (const chave of fazEAvisa) assert.equal(nivelPadraoDaChave(chave), PropostaIaNivelEnum.FAZ_E_AVISA, chave);
  for (const chave of pergunta) assert.equal(nivelPadraoDaChave(chave), PropostaIaNivelEnum.PERGUNTA, chave);
  assert.deepEqual([...CHAVES_CONFIGURAVEIS_DE_NIVEL].sort(), [...fazEAvisa, ...pergunta].sort());
});

test('marcar desenvolvida pertence ao tipo Alterar atividade e vem logo depois dele no painel', () => {
  assert.equal(tipoDaChaveDeNivel(REGRA_MARCAR_ATIVIDADE_DESENVOLVIDA), TipoPropostaIaEnum.ALTERAR_ATIVIDADE);
  const posicao = CHAVES_CONFIGURAVEIS_DE_NIVEL.indexOf(TipoPropostaIaEnum.ALTERAR_ATIVIDADE);
  assert.equal(CHAVES_CONFIGURAVEIS_DE_NIVEL[posicao + 1], REGRA_MARCAR_ATIVIDADE_DESENVOLVIDA);
});

test('normalizar completa com o padrão e ignora chave desconhecida, fixa e valor inválido', () => {
  const normalizado = normalizarNiveisDaProposta({
    [TipoPropostaIaEnum.ANOTAR_PAD]: PropostaIaNivelEnum.PERGUNTA,
    [TipoPropostaIaEnum.CRIAR_PROJETO]: PropostaIaNivelEnum.FAZ_E_AVISA,
    [TipoPropostaIaEnum.CRIAR_ATIVIDADE]: PropostaIaNivelEnum.SEMPRE_PERGUNTA,
    [TipoPropostaIaEnum.CRIAR_DEMANDA]: 'QUALQUER',
    INVENTADA: PropostaIaNivelEnum.FAZ_E_AVISA,
  });
  assert.equal(normalizado[TipoPropostaIaEnum.ANOTAR_PAD], PropostaIaNivelEnum.PERGUNTA);
  assert.equal(normalizado[TipoPropostaIaEnum.CRIAR_ATIVIDADE], PropostaIaNivelEnum.FAZ_E_AVISA);
  assert.equal(normalizado[TipoPropostaIaEnum.CRIAR_DEMANDA], PropostaIaNivelEnum.PERGUNTA);
  assert.equal(TipoPropostaIaEnum.CRIAR_PROJETO in normalizado, false);
  assert.equal('INVENTADA' in normalizado, false);
  assert.deepEqual(Object.keys(normalizado).sort(), Object.keys(NIVEIS_PADRAO_DA_PROPOSTA).sort());
});

test('normalizar um mapa nulo, vazio ou que não é objeto devolve o padrão', () => {
  for (const entrada of [null, undefined, {}, [], 'texto', 3]) {
    assert.deepEqual(normalizarNiveisDaProposta(entrada), NIVEIS_PADRAO_DA_PROPOSTA);
  }
});

test('validar recusa chave que não se configura e valor que não é um nível configurável', () => {
  assert.deepEqual(validarNiveisDaProposta({ [TipoPropostaIaEnum.ANOTAR_PAD]: PropostaIaNivelEnum.PERGUNTA }), []);
  assert.match(validarNiveisDaProposta({ INVENTADA: PropostaIaNivelEnum.PERGUNTA })[0], /INVENTADA/);
  assert.match(validarNiveisDaProposta({ [TipoPropostaIaEnum.CRIAR_PROJETO]: PropostaIaNivelEnum.PERGUNTA })[0], /CRIAR_PROJETO/);
  assert.match(validarNiveisDaProposta({ [TipoPropostaIaEnum.ANOTAR_PAD]: PropostaIaNivelEnum.SEMPRE_PERGUNTA })[0], /SEMPRE_PERGUNTA/);
});

test('o tipo fixo sempre pergunta, mesmo que a configuração diga outra coisa', () => {
  for (const tipo of TIPOS_COM_NIVEL_FIXO) {
    const nivel = nivelDaProposta({ tipo, dados: {}, usuarioId: USUARIO, niveis: { [tipo]: PropostaIaNivelEnum.FAZ_E_AVISA } });
    assert.equal(nivel, PropostaIaNivelEnum.SEMPRE_PERGUNTA, tipo);
  }
});

test('sem configuração vale o padrão; com configuração vale o que o administrador escolheu', () => {
  const entrada = { tipo: TipoPropostaIaEnum.ANOTAR_PAD, dados: { secao: TipoAnotacaoEnum.FEITO }, usuarioId: USUARIO };
  assert.equal(nivelDaProposta(entrada), PropostaIaNivelEnum.FAZ_E_AVISA);
  assert.equal(nivelDaProposta({ ...entrada, niveis: null }), PropostaIaNivelEnum.FAZ_E_AVISA);
  assert.equal(nivelDaProposta({ ...entrada, niveis: { ANOTAR_PAD: PropostaIaNivelEnum.PERGUNTA } }), PropostaIaNivelEnum.PERGUNTA);
  const criarDemanda = { tipo: TipoPropostaIaEnum.CRIAR_DEMANDA, dados: {}, usuarioId: USUARIO };
  assert.equal(nivelDaProposta(criarDemanda), PropostaIaNivelEnum.PERGUNTA);
  assert.equal(nivelDaProposta({ ...criarDemanda, niveis: { CRIAR_DEMANDA: PropostaIaNivelEnum.FAZ_E_AVISA } }), PropostaIaNivelEnum.FAZ_E_AVISA);
});

test('a seção Pessoal do pad sempre pergunta, as outras seguem a configuração', () => {
  const niveis = { ANOTAR_PAD: PropostaIaNivelEnum.FAZ_E_AVISA };
  assert.equal(
    nivelDaProposta({ tipo: TipoPropostaIaEnum.ANOTAR_PAD, dados: { secao: TipoAnotacaoEnum.PESSOAL, pedidoExplicito: true }, usuarioId: USUARIO, niveis }),
    PropostaIaNivelEnum.SEMPRE_PERGUNTA,
  );
  for (const secao of [TipoAnotacaoEnum.EM_ANDAMENTO, TipoAnotacaoEnum.FEITO, TipoAnotacaoEnum.PENDENCIA, TipoAnotacaoEnum.LEMBRETE]) {
    assert.equal(nivelDaProposta({ tipo: TipoPropostaIaEnum.ANOTAR_PAD, dados: { secao }, usuarioId: USUARIO, niveis }), PropostaIaNivelEnum.FAZ_E_AVISA, secao);
  }
});

test('em nome de outra pessoa sempre pergunta (iniciar, pausar, criar atividade e pôr membro)', () => {
  const niveis = Object.fromEntries(CHAVES_CONFIGURAVEIS_DE_NIVEL.map((chave) => [chave, PropostaIaNivelEnum.FAZ_E_AVISA]));
  for (const tipo of [
    TipoPropostaIaEnum.INICIAR_EXECUCAO,
    TipoPropostaIaEnum.PAUSAR_EXECUCAO,
    TipoPropostaIaEnum.CRIAR_ATIVIDADE,
    TipoPropostaIaEnum.ATRIBUIR_MEMBRO,
  ]) {
    assert.equal(nivelDaProposta({ tipo, dados: { usuarioId: 99 }, usuarioId: USUARIO, niveis }), PropostaIaNivelEnum.SEMPRE_PERGUNTA, tipo);
  }
});

test('o próprio usuário nos dados não é "outra pessoa"', () => {
  assert.equal(ehEmNomeDeOutraPessoa({ usuarioId: USUARIO }, USUARIO), false);
  assert.equal(ehEmNomeDeOutraPessoa({}, USUARIO), false);
  assert.equal(ehEmNomeDeOutraPessoa({ usuarioId: '99' }, USUARIO), false);
  assert.equal(ehEmNomeDeOutraPessoa({ usuarioId: 99 }, USUARIO), true);
  assert.equal(nivelDaProposta({ tipo: TipoPropostaIaEnum.CRIAR_ATIVIDADE, dados: { usuarioId: USUARIO }, usuarioId: USUARIO }), PropostaIaNivelEnum.FAZ_E_AVISA);
  assert.equal(nivelDaProposta({ tipo: TipoPropostaIaEnum.ATRIBUIR_MEMBRO, dados: { usuarioId: USUARIO }, usuarioId: USUARIO }), PropostaIaNivelEnum.PERGUNTA);
});

test('marcar a própria atividade como desenvolvida faz e avisa; o resto de Alterar atividade pergunta', () => {
  const marcar = { status: TipoAtividadeStatusEnum.DESENVOLVIDA, atividadeUsuarioId: USUARIO };
  const entrada = { tipo: TipoPropostaIaEnum.ALTERAR_ATIVIDADE, usuarioId: USUARIO };
  assert.equal(nivelDaProposta({ ...entrada, dados: marcar }), PropostaIaNivelEnum.FAZ_E_AVISA);
  // de outra pessoa (o gestor marcando a de um desenvolvedor), ou sem o dono nos dados: segue Alterar atividade
  assert.equal(nivelDaProposta({ ...entrada, dados: { ...marcar, atividadeUsuarioId: 99 } }), PropostaIaNivelEnum.PERGUNTA);
  assert.equal(nivelDaProposta({ ...entrada, dados: { status: TipoAtividadeStatusEnum.DESENVOLVIDA } }), PropostaIaNivelEnum.PERGUNTA);
  // mudou também a prioridade ou o nome, ou outro status: não é só marcar
  assert.equal(nivelDaProposta({ ...entrada, dados: { ...marcar, prioridade: 'ALTA' } }), PropostaIaNivelEnum.PERGUNTA);
  assert.equal(nivelDaProposta({ ...entrada, dados: { ...marcar, nome: 'Outro nome' } }), PropostaIaNivelEnum.PERGUNTA);
  assert.equal(nivelDaProposta({ ...entrada, dados: { ...marcar, status: TipoAtividadeStatusEnum.PENDENTE } }), PropostaIaNivelEnum.PERGUNTA);
});

test('o administrador configura marcar desenvolvida separado do resto de Alterar atividade', () => {
  const marcar = { status: TipoAtividadeStatusEnum.DESENVOLVIDA, atividadeUsuarioId: USUARIO };
  const entrada = { tipo: TipoPropostaIaEnum.ALTERAR_ATIVIDADE, usuarioId: USUARIO };
  const niveis = { [REGRA_MARCAR_ATIVIDADE_DESENVOLVIDA]: PropostaIaNivelEnum.PERGUNTA, ALTERAR_ATIVIDADE: PropostaIaNivelEnum.FAZ_E_AVISA };
  assert.equal(nivelDaProposta({ ...entrada, dados: marcar, niveis }), PropostaIaNivelEnum.PERGUNTA);
  assert.equal(nivelDaProposta({ ...entrada, dados: { nome: 'Novo' }, niveis }), PropostaIaNivelEnum.FAZ_E_AVISA);
});
