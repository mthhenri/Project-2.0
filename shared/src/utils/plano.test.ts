import { test } from 'node:test';
import assert from 'node:assert/strict';
import { PlanoAbaEnum } from '../enums/plano-aba.enum';
import { SituacaoDaAbaNaPublicacaoEnum } from '../enums/situacao-da-aba-na-publicacao.enum';
import { TipoUsuarioEnum } from '../enums/tipo-usuario.enum';
import {
  campoDaAbaDoPlano,
  situacaoDaAbaNaPublicacao,
  contarOcorrenciasDoTrecho,
  montarConversaIdDoPlano,
  podeAcessarPlano,
  podeArquivarOuExcluirPlano,
  podeVerAbaDoPlano,
  substituirTrechoUnico,
  textoDaAbaDoPlano,
  textoInicialDaAba,
} from './plano';

const base = { usuarioId: 2, criadorId: 1, projetoId: 10, isSolo: false, temAcessoAoProjeto: false };

test('a aba do cliente é só do gestor e do administrador; as outras são de todos', () => {
  for (const aba of [PlanoAbaEnum.DESCRICAO_TECNICA, PlanoAbaEnum.DOCUMENTACAO]) {
    for (const tipo of Object.values(TipoUsuarioEnum)) assert.equal(podeVerAbaDoPlano(aba, tipo), true);
  }
  assert.equal(podeVerAbaDoPlano(PlanoAbaEnum.DESCRICAO_CLIENTE, TipoUsuarioEnum.DESENVOLVEDOR), false);
  assert.equal(podeVerAbaDoPlano(PlanoAbaEnum.DESCRICAO_CLIENTE, TipoUsuarioEnum.GESTOR), true);
  assert.equal(podeVerAbaDoPlano(PlanoAbaEnum.DESCRICAO_CLIENTE, TipoUsuarioEnum.ADMINISTRADOR), true);
});

test('plano de projeto: gestor e administrador por tipo, desenvolvedor só com acesso ao projeto', () => {
  assert.equal(podeAcessarPlano({ ...base, tipoUsuario: TipoUsuarioEnum.GESTOR }), true);
  assert.equal(podeAcessarPlano({ ...base, tipoUsuario: TipoUsuarioEnum.ADMINISTRADOR }), true);
  assert.equal(podeAcessarPlano({ ...base, tipoUsuario: TipoUsuarioEnum.DESENVOLVEDOR }), false);
  assert.equal(podeAcessarPlano({ ...base, tipoUsuario: TipoUsuarioEnum.DESENVOLVEDOR, temAcessoAoProjeto: true }), true);
});

test('plano solo: só o criador, mesmo para gestor e administrador', () => {
  const solo = { ...base, isSolo: true, temAcessoAoProjeto: true };
  assert.equal(podeAcessarPlano({ ...solo, tipoUsuario: TipoUsuarioEnum.GESTOR }), false);
  assert.equal(podeAcessarPlano({ ...solo, tipoUsuario: TipoUsuarioEnum.ADMINISTRADOR }), false);
  assert.equal(podeAcessarPlano({ ...solo, tipoUsuario: TipoUsuarioEnum.DESENVOLVEDOR }), false);
  assert.equal(podeAcessarPlano({ ...solo, tipoUsuario: TipoUsuarioEnum.DESENVOLVEDOR, usuarioId: 1 }), true);
});

test('plano amplo (sem projeto): só o criador', () => {
  const amplo = { ...base, projetoId: null };
  assert.equal(podeAcessarPlano({ ...amplo, tipoUsuario: TipoUsuarioEnum.ADMINISTRADOR }), false);
  assert.equal(podeAcessarPlano({ ...amplo, tipoUsuario: TipoUsuarioEnum.GESTOR, usuarioId: 1 }), true);
});

test('arquivar e excluir: criador, gestor e administrador', () => {
  assert.equal(podeArquivarOuExcluirPlano(TipoUsuarioEnum.DESENVOLVEDOR, 1, 1), true);
  assert.equal(podeArquivarOuExcluirPlano(TipoUsuarioEnum.DESENVOLVEDOR, 2, 1), false);
  assert.equal(podeArquivarOuExcluirPlano(TipoUsuarioEnum.GESTOR, 2, 1), true);
  assert.equal(podeArquivarOuExcluirPlano(TipoUsuarioEnum.ADMINISTRADOR, 2, 1), true);
});

test('ponto de partida: só aba vazia recebe o texto da demanda', () => {
  assert.equal(textoInicialDaAba(null, 'da demanda'), 'da demanda');
  assert.equal(textoInicialDaAba('  \n', 'da demanda'), 'da demanda');
  assert.equal(textoInicialDaAba('já escrito', 'da demanda'), null);
  assert.equal(textoInicialDaAba(null, null), null);
  assert.equal(textoInicialDaAba('', '   '), null);
});

test('a conversa do plano tem um id que não casa com o da conversa do dia', () => {
  assert.equal(montarConversaIdDoPlano(7), 'plano-7');
  assert.doesNotMatch(montarConversaIdDoPlano(7), /^\d+-\d{4}-\d{2}-\d{2}$/);
});

test('textoDaAbaDoPlano devolve o texto de cada aba, e a do cliente ausente conta como vazia', () => {
  const plano = { descricaoTecnica: 'T', descricaoCliente: 'C', documentacao: null };
  assert.equal(textoDaAbaDoPlano(plano, PlanoAbaEnum.DESCRICAO_TECNICA), 'T');
  assert.equal(textoDaAbaDoPlano(plano, PlanoAbaEnum.DESCRICAO_CLIENTE), 'C');
  assert.equal(textoDaAbaDoPlano(plano, PlanoAbaEnum.DOCUMENTACAO), null);
  assert.equal(textoDaAbaDoPlano({ descricaoTecnica: 'T', documentacao: 'D' }, PlanoAbaEnum.DESCRICAO_CLIENTE), null);
});

test('contarOcorrenciasDoTrecho conta sem sobreposição e trecho vazio não conta', () => {
  assert.equal(contarOcorrenciasDoTrecho('abc abc abc', 'abc'), 3);
  assert.equal(contarOcorrenciasDoTrecho('aaaa', 'aa'), 2);
  assert.equal(contarOcorrenciasDoTrecho('abc', 'x'), 0);
  assert.equal(contarOcorrenciasDoTrecho('abc', ''), 0);
});

test('substituirTrechoUnico troca só quando o trecho aparece uma vez', () => {
  assert.equal(substituirTrechoUnico('Olá mundo cruel', 'mundo', 'planeta'), 'Olá planeta cruel');
  assert.equal(substituirTrechoUnico('Olá mundo', 'sumiu', 'x'), null, 'o texto mudou: o trecho não está mais lá');
  assert.equal(substituirTrechoUnico('a b a', 'a', 'x'), null, 'duas ocorrências: ambíguo');
  assert.equal(substituirTrechoUnico('texto', '', 'x'), null);
});

test('campoDaAbaDoPlano mapeia cada aba para o campo que guarda o texto', () => {
  assert.equal(campoDaAbaDoPlano(PlanoAbaEnum.DESCRICAO_TECNICA), 'descricaoTecnica');
  assert.equal(campoDaAbaDoPlano(PlanoAbaEnum.DESCRICAO_CLIENTE), 'descricaoCliente');
  assert.equal(campoDaAbaDoPlano(PlanoAbaEnum.DOCUMENTACAO), 'documentacao');
});

test('situacaoDaAbaNaPublicacao: igual, apagaria e publicaria', () => {
  assert.equal(situacaoDaAbaNaPublicacao(null, null), SituacaoDaAbaNaPublicacaoEnum.IGUAL);
  assert.equal(situacaoDaAbaNaPublicacao('  ', ''), SituacaoDaAbaNaPublicacaoEnum.IGUAL);
  assert.equal(situacaoDaAbaNaPublicacao('Texto', 'Texto'), SituacaoDaAbaNaPublicacaoEnum.IGUAL);
  assert.equal(situacaoDaAbaNaPublicacao('', 'Texto da demanda'), SituacaoDaAbaNaPublicacaoEnum.APAGARIA);
  assert.equal(situacaoDaAbaNaPublicacao(null, 'Texto da demanda'), SituacaoDaAbaNaPublicacaoEnum.APAGARIA);
  assert.equal(situacaoDaAbaNaPublicacao('Novo', 'Velho'), SituacaoDaAbaNaPublicacaoEnum.PUBLICARIA);
  assert.equal(situacaoDaAbaNaPublicacao('Novo', null), SituacaoDaAbaNaPublicacaoEnum.PUBLICARIA);
});
