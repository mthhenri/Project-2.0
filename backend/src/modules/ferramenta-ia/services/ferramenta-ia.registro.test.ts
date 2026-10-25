import { test } from 'node:test';
import * as assert from 'node:assert/strict';
import { IsInt, IsOptional, IsString, Min } from 'class-validator';
import { BusinessException } from '../../../core/exceptions/business.exception';
import { StatusPropostaIaEnum, TipoPropostaIaEnum, TipoUsuarioEnum } from '@project20/shared';
import { PropostaIaService } from '../../proposta-ia/services/proposta-ia.service';
import { DescricaoCampoIa } from '../domain/esquema-da-classe';
import { ClasseDeEntrada, FerramentaIa, PermissaoFerramentaIa } from '../domain/ferramenta-ia';
import { EXCECOES_DE_EXCLUSAO_DA_IA, exclusaoNaoPermitida, sugereExclusao } from '../domain/sem-exclusao';
import { FerramentaPropostaIa } from '../ferramentas/ferramenta-proposta-ia';
import { FerramentaIaRegistro, LIMITE_RESULTADO_CARACTERES, NOTA_DO_RESULTADO_DA_PROPOSTA } from './ferramenta-ia.registro';

const DESENVOLVEDOR = { sub: 1, login: 'dev', tipo: TipoUsuarioEnum.DESENVOLVEDOR } as never;
const GESTOR = { sub: 2, login: 'gestor', tipo: TipoUsuarioEnum.GESTOR } as never;
const ADMINISTRADOR = { sub: 3, login: 'admin', tipo: TipoUsuarioEnum.ADMINISTRADOR } as never;

class EntradaSomaDto {
  @IsInt()
  @DescricaoCampoIa('Primeiro número')
  a: number;

  @IsInt()
  @Min(0)
  b: number;

  @IsOptional()
  @IsString()
  rotulo?: string;
}

class EntradaVaziaDto {}

function ferramentaDeLeitura(permissao: PermissaoFerramentaIa, nome = 'somar', executar?: () => Promise<unknown>) {
  const chamadas: { entrada: EntradaSomaDto; usuarioId: number }[] = [];
  const ferramenta = new (class extends FerramentaIa<EntradaSomaDto> {
    readonly nome = nome;
    readonly descricao = 'Soma dois números';
    readonly tipo = 'LEITURA' as const;
    readonly permissao = permissao;
    readonly classeDeEntrada: ClasseDeEntrada<EntradaSomaDto> = EntradaSomaDto;
    async executar(entrada: EntradaSomaDto, usuarioAtivo: { sub: number }) {
      chamadas.push({ entrada, usuarioId: usuarioAtivo.sub });
      return executar ? executar() : { soma: entrada.a + entrada.b };
    }
  })();
  return { ferramenta, chamadas };
}

test('o registro mostra ao modelo só as ferramentas que o tipo de usuário pode usar', () => {
  const registro = new FerramentaIaRegistro();
  registro.registrar(ferramentaDeLeitura('QUALQUER', 'para_todos').ferramenta);
  registro.registrar(ferramentaDeLeitura('GESTOR', 'so_gestor').ferramenta);
  registro.registrar(ferramentaDeLeitura('ADMINISTRADOR', 'so_administrador').ferramenta);
  const nomes = (usuario: never) => registro.listarParaUsuario(usuario).map((ferramenta) => ferramenta.nome);
  assert.deepEqual(nomes(DESENVOLVEDOR), ['para_todos']);
  assert.deepEqual(nomes(GESTOR), ['para_todos', 'so_gestor']);
  assert.deepEqual(nomes(ADMINISTRADOR), ['para_todos', 'so_gestor', 'so_administrador']);
});

test('o esquema enviado ao modelo é gerado da classe validada, com descrição, limites e opcionais', () => {
  const registro = new FerramentaIaRegistro();
  registro.registrar(ferramentaDeLeitura('QUALQUER').ferramenta);
  const [ferramenta] = registro.listarParaUsuario(DESENVOLVEDOR);
  assert.deepEqual(ferramenta.esquemaEntrada, {
    type: 'object',
    properties: {
      a: { type: 'integer', description: 'Primeiro número' },
      b: { type: 'integer', minimum: 0 },
      rotulo: { type: 'string' },
    },
    required: ['a', 'b'],
    additionalProperties: false,
  });
});

test('executar roda a ferramenta com o usuário do token e a entrada validada', async () => {
  const registro = new FerramentaIaRegistro();
  const { ferramenta, chamadas } = ferramentaDeLeitura('QUALQUER');
  registro.registrar(ferramenta);
  const resultado = await registro.executar('somar', { a: 2, b: 3 }, GESTOR);
  assert.equal(resultado.erro, false);
  assert.deepEqual(JSON.parse(resultado.conteudo), { soma: 5 });
  assert.equal(chamadas[0].usuarioId, 2);
});

test('nome desconhecido, falta de permissão e entrada inválida voltam como erro ao modelo, sem lançar', async () => {
  const registro = new FerramentaIaRegistro();
  const { ferramenta, chamadas } = ferramentaDeLeitura('GESTOR');
  registro.registrar(ferramenta);

  const desconhecida = await registro.executar('nao_existe', {}, GESTOR);
  assert.equal(desconhecida.erro, true);
  assert.match(desconhecida.conteudo, /não existe/);

  const semPermissao = await registro.executar('somar', { a: 1, b: 1 }, DESENVOLVEDOR);
  assert.equal(semPermissao.erro, true);
  assert.match(semPermissao.conteudo, /permissão/);

  const invalida = await registro.executar('somar', { a: 'um', b: -1 }, GESTOR);
  assert.equal(invalida.erro, true);
  assert.match(invalida.conteudo, /Entrada inválida/);

  const extra = await registro.executar('somar', { a: 1, b: 1, intruso: true }, GESTOR);
  assert.equal(extra.erro, true);

  assert.equal(chamadas.length, 0);
});

test('falha da ferramenta: erro de negócio vai ao modelo com a mensagem; erro interno vira texto genérico', async () => {
  const registro = new FerramentaIaRegistro();
  registro.registrar(ferramentaDeLeitura('QUALQUER', 'negocio', async () => { throw new BusinessException('Já existe uma execução ativa'); }).ferramenta);
  registro.registrar(ferramentaDeLeitura('QUALQUER', 'interna', async () => { throw new Error('senha do banco: 123'); }).ferramenta);
  const negocio = await registro.executar('negocio', { a: 1, b: 1 }, GESTOR);
  assert.equal(negocio.erro, true);
  assert.match(negocio.conteudo, /execução ativa/);
  const interna = await registro.executar('interna', { a: 1, b: 1 }, GESTOR);
  assert.equal(interna.erro, true);
  assert.doesNotMatch(interna.conteudo, /senha/);
});

test('resultado grande é cortado com aviso', async () => {
  const registro = new FerramentaIaRegistro();
  registro.registrar(ferramentaDeLeitura('QUALQUER', 'grande', async () => 'x'.repeat(LIMITE_RESULTADO_CARACTERES * 2)).ferramenta);
  const resultado = await registro.executar('grande', { a: 1, b: 1 }, GESTOR);
  assert.equal(resultado.erro, false);
  assert.match(resultado.conteudo, /resultado cortado/);
  assert.ok(resultado.conteudo.length < LIMITE_RESULTADO_CARACTERES + 200);
});

test('duas ferramentas com o mesmo nome é erro de programação', () => {
  const registro = new FerramentaIaRegistro();
  registro.registrar(ferramentaDeLeitura('QUALQUER').ferramenta);
  assert.throws(() => registro.registrar(ferramentaDeLeitura('QUALQUER').ferramenta), /Já existe uma ferramenta/);
});

test('sem exclusão: o registro recusa ferramenta com nome de exclusão e nenhum tipo de proposta sugere exclusão', () => {
  const registro = new FerramentaIaRegistro();
  for (const nome of ['excluir_atividade', 'apagar_demanda', 'remover_tag', 'deletar_execucao', 'eliminar_nota', 'descartar_proposta']) {
    assert.throws(() => registro.registrar(ferramentaDeLeitura('QUALQUER', nome).ferramenta), /não exclui nada/, nome);
  }
  assert.equal(sugereExclusao('consultar_data_e_hora'), false);
  assert.deepEqual(Object.values(TipoPropostaIaEnum).filter(exclusaoNaoPermitida), []);
});

test('sem exclusão: a exceção nomeada (task 230) vale só para as duas ferramentas da lista fechada; uma terceira com "excluir" no nome é recusada', () => {
  const registro = new FerramentaIaRegistro();
  for (const nome of ['propor_excluir_atividade', 'propor_desconectar_demanda']) {
    assert.doesNotThrow(() => registro.registrar(ferramentaDeLeitura('QUALQUER', nome).ferramenta), nome);
  }
  for (const nome of ['propor_excluir_demanda', 'propor_excluir_execucao', 'excluir_atividade', 'propor_apagar_atividade', 'propor_remover_tag']) {
    assert.throws(() => registro.registrar(ferramentaDeLeitura('QUALQUER', nome).ferramenta), /não exclui nada/, nome);
  }
});

test('sem exclusão: a lista de exceções é fechada, e os tipos de proposta que sugerem exclusão são só os da lista', () => {
  // Se a lista crescer, este teste quebra: o nome novo precisa de uma spec que o aprove.
  assert.deepEqual([...EXCECOES_DE_EXCLUSAO_DA_IA].sort(), ['DESCONECTAR_DEMANDA', 'EXCLUIR_ATIVIDADE', 'propor_desconectar_demanda', 'propor_excluir_atividade']);
  assert.deepEqual(Object.values(TipoPropostaIaEnum).filter(sugereExclusao), [TipoPropostaIaEnum.EXCLUIR_ATIVIDADE]);
});

/** Ferramenta de proposta de teste: a única coisa que ela enxerga é a service de proposta. */
class EntradaPropostaDto {
  @IsString()
  nome: string;
}

test('ferramenta de proposta cria a proposta pendente e devolve o id, sem executar a ação', async () => {
  const criadas: { usuarioId: number; tipo: TipoPropostaIaEnum; dados: Record<string, unknown> }[] = [];
  const propostaIaService = {
    criarComAutonomia: async (dto: (typeof criadas)[number]) => {
      criadas.push(dto);
      return { id: 77, status: StatusPropostaIaEnum.PENDENTE };
    },
  } as unknown as PropostaIaService;

  const ferramenta = new (class extends FerramentaPropostaIa<EntradaPropostaDto> {
    readonly nome = 'propor_atividade';
    readonly descricao = 'Propõe criar uma atividade';
    readonly permissao = 'QUALQUER' as const;
    readonly classeDeEntrada = EntradaPropostaDto;
    readonly tipoProposta = TipoPropostaIaEnum.CRIAR_ATIVIDADE;
  })(propostaIaService);

  const registro = new FerramentaIaRegistro();
  registro.registrar(ferramenta);
  const resultado = await registro.executar('propor_atividade', { nome: 'Corrigir login' }, DESENVOLVEDOR);
  assert.equal(resultado.erro, false);
  assert.equal(resultado.propostaId, 77);
  assert.match(resultado.conteudo, /precisa confirmar/);
  assert.deepEqual(criadas, [{ usuarioId: 1, tipo: TipoPropostaIaEnum.CRIAR_ATIVIDADE, dados: { nome: 'Corrigir login' } }]);
  assert.equal(ferramenta.tipo, 'PROPOSTA');
});

test('ferramenta de proposta cuja criação falha devolve o motivo ao modelo', async () => {
  const propostaIaService = {
    criarComAutonomia: async () => {
      throw new BusinessException('A ação "CRIAR_ATIVIDADE" ainda não está disponível para a IA');
    },
  } as unknown as PropostaIaService;
  const ferramenta = new (class extends FerramentaPropostaIa<EntradaPropostaDto> {
    readonly nome = 'propor_atividade';
    readonly descricao = 'Propõe criar uma atividade';
    readonly permissao = 'QUALQUER' as const;
    readonly classeDeEntrada = EntradaPropostaDto;
    readonly tipoProposta = TipoPropostaIaEnum.CRIAR_ATIVIDADE;
  })(propostaIaService);
  const registro = new FerramentaIaRegistro();
  registro.registrar(ferramenta);
  const resultado = await registro.executar('propor_atividade', { nome: 'x' }, DESENVOLVEDOR);
  assert.equal(resultado.erro, true);
  assert.equal(resultado.propostaId, undefined);
  assert.match(resultado.conteudo, /não está disponível/);
});

test('classe de entrada vazia gera esquema sem campos e aceita {}', async () => {
  const registro = new FerramentaIaRegistro();
  registro.registrar(
    new (class extends FerramentaIa<EntradaVaziaDto> {
      readonly nome = 'sem_entrada';
      readonly descricao = 'Sem entrada';
      readonly tipo = 'LEITURA' as const;
      readonly permissao = 'QUALQUER' as const;
      readonly classeDeEntrada = EntradaVaziaDto;
      async executar() {
        return { ok: true };
      }
    })(),
  );
  assert.deepEqual(registro.listarParaUsuario(DESENVOLVEDOR)[0].esquemaEntrada, { type: 'object', properties: {}, required: [], additionalProperties: false });
  assert.equal((await registro.executar('sem_entrada', {}, DESENVOLVEDOR)).erro, false);
});

test('a descrição de toda ferramenta de proposta ganha a nota de que o sistema decide se roda na hora; a de leitura fica como está (task 228)', () => {
  const registro = new FerramentaIaRegistro();
  registro.registrar(ferramentaDeLeitura('QUALQUER', 'leitura').ferramenta);
  const proposta = new (class extends FerramentaPropostaIa<EntradaPropostaDto> {
    readonly nome = 'propor_nota';
    readonly descricao = 'Propõe algo';
    readonly permissao = 'QUALQUER' as const;
    readonly classeDeEntrada = EntradaPropostaDto;
    readonly tipoProposta = TipoPropostaIaEnum.CRIAR_ATIVIDADE;
  })({} as unknown as PropostaIaService);
  registro.registrar(proposta);
  const descricoes = Object.fromEntries(registro.listarParaUsuario(DESENVOLVEDOR).map((ferramenta) => [ferramenta.nome, ferramenta.descricao]));
  assert.equal(descricoes['propor_nota'], 'Propõe algo' + NOTA_DO_RESULTADO_DA_PROPOSTA);
  assert.match(descricoes['propor_nota'], /Feito/);
  assert.doesNotMatch(descricoes['leitura'], /Feito/);
  assert.equal(proposta.descricao, 'Propõe algo', 'a descrição da própria ferramenta não muda: a nota entra só na lista enviada ao modelo');
});
