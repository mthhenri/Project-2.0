import { test } from 'node:test';
import * as assert from 'node:assert/strict';
import { TipoPropostaIaEnum, TipoUsuarioEnum } from '@project20/shared';
import { BusinessException } from '../../../core/exceptions/business.exception';
import { UnauthorizedAccessException } from '../../../core/exceptions/unauthorized-access.exception';
import { FerramentaIaRegistro } from '../../ferramenta-ia/services/ferramenta-ia.registro';
import { PontoJustificativaRepository } from '../../ponto-justificativa/repositories/ponto-justificativa.repository';
import { PontoJustificativaService } from '../../ponto-justificativa/services/ponto-justificativa.service';
import { PropostaIaService } from '../../proposta-ia/services/proposta-ia.service';
import { UsuarioService } from '../../usuario/services/usuario.service';
import { JustificarPontoExecutor } from '../executores/justificar-ponto.executor';
import { ProporJustificarPontoFerramenta } from './propor-justificar-ponto.ferramenta';

// Justificar o ponto (task 231): só o gestor, para outra pessoa. A ferramenta só cria a proposta; o executor cria pela service com o token e o
// desfazer exclui a justificativa, só se ela continua como a proposta a deixou.

const GESTOR = { sub: 1, login: 'gestor', tipo: TipoUsuarioEnum.GESTOR } as never;
const ADMINISTRADOR = { sub: 2, login: 'admin', tipo: TipoUsuarioEnum.ADMINISTRADOR } as never;
const DESENVOLVEDOR = { sub: 7, login: 'dev', tipo: TipoUsuarioEnum.DESENVOLVEDOR } as never;

/** `HttpException.message` não traz o texto da resposta; o texto do usuário está em `getResponse().mensagem`. */
const contem = (trecho: string) => (erro: unknown) => String(((erro as BusinessException).getResponse() as { mensagem: string }).mensagem).includes(trecho);

const ENTRADA = { usuarioId: 7, diaData: '2026-10-20', nome: 'Consulta médica', descricao: 'Combinado com o gestor', horasCobertas: 4 };

function montar(opcoes: { jornada?: number; jaExiste?: boolean; atual?: Record<string, unknown> | null } = {}) {
  const propostas: { tipo: TipoPropostaIaEnum; dados: Record<string, unknown> }[] = [];
  const criacoes: { dto: Record<string, unknown>; usuario: unknown }[] = [];
  const exclusoes: number[] = [];
  let jaExiste = opcoes.jaExiste ?? false;
  const usuarioService = { recuperar: async () => ({ dados: { id: 7, nomeCompleto: 'Dev de Teste', horasDiariasNecessarias: opcoes.jornada ?? 8 } }) } as unknown as UsuarioService;
  const repositorio = {
    validarPorUsuarioEDia: async () => jaExiste,
    recuperar: async () => (opcoes.atual === undefined ? { id: 90, ...ENTRADA } : opcoes.atual),
  } as unknown as PontoJustificativaRepository;
  const servico = {
    criar: async (dto: Record<string, unknown>, usuario: unknown) => { criacoes.push({ dto, usuario }); jaExiste = true; return { dados: { id: 90 } }; },
    excluir: async (dto: { id: number }) => { exclusoes.push(dto.id); return { dados: null }; },
  } as unknown as PontoJustificativaService;
  const propostaIa = { criarComAutonomia: async (dto: { tipo: TipoPropostaIaEnum; dados: Record<string, unknown> }) => { propostas.push(dto); return { id: 91, status: 'PENDENTE' }; } } as unknown as PropostaIaService;
  return {
    ferramenta: new ProporJustificarPontoFerramenta(propostaIa, usuarioService, repositorio),
    executor: new JustificarPontoExecutor(servico, repositorio),
    propostas, criacoes, exclusoes,
  };
}

test('propor: guarda o nome da pessoa e os campos da justificativa, sem gravar nada; é ferramenta só do gestor', async () => {
  const { ferramenta, propostas, criacoes } = montar();
  assert.equal(ferramenta.permissao, 'GESTOR');
  assert.equal(ferramenta.tipoProposta, TipoPropostaIaEnum.JUSTIFICAR_PONTO);
  await ferramenta.executar(ENTRADA, GESTOR);
  assert.deepEqual(propostas[0].dados, { ...ENTRADA, usuarioNome: 'Dev de Teste' });
  assert.deepEqual(criacoes, []);
});

test('o desenvolvedor não vê nem usa a ferramenta; gestor e administrador veem', async () => {
  const registro = new FerramentaIaRegistro();
  registro.registrar(montar().ferramenta);
  assert.deepEqual(registro.listarParaUsuario(DESENVOLVEDOR).map((ferramenta) => ferramenta.nome), []);
  for (const usuario of [GESTOR, ADMINISTRADOR]) assert.deepEqual(registro.listarParaUsuario(usuario).map((ferramenta) => ferramenta.nome), ['propor_justificar_ponto']);
  const resultado = await registro.executar('propor_justificar_ponto', ENTRADA, DESENVOLVEDOR);
  assert.equal(resultado.erro, true);
  assert.match(resultado.conteudo, /permissão/);
});

test('propor: o próprio ponto, horas acima da jornada e dia que já tem justificativa são recusados sem proposta', async () => {
  const proprio = montar();
  await assert.rejects(() => proprio.ferramenta.executar({ ...ENTRADA, usuarioId: 1 }, GESTOR), contem('outra pessoa'));
  const acima = montar({ jornada: 4 });
  await assert.rejects(() => acima.ferramenta.executar({ ...ENTRADA, horasCobertas: 5 }, GESTOR), contem('jornada diária'));
  const repetida = montar({ jaExiste: true });
  await assert.rejects(() => repetida.ferramenta.executar(ENTRADA, GESTOR), contem('Já existe uma justificativa'));
  assert.equal(proprio.propostas.length + acima.propostas.length + repetida.propostas.length, 0);
});

test('executar: cria pela service com o usuário do token e guarda o que foi criado para o desfazer', async () => {
  const { executor, criacoes } = montar();
  const resultado = await executor.executar({ ...ENTRADA, usuarioNome: 'Dev de Teste' }, GESTOR);
  assert.deepEqual(criacoes, [{ dto: ENTRADA, usuario: GESTOR }]);
  assert.deepEqual(resultado, { justificativaId: 90, ...ENTRADA });
});

test('executar: desenvolvedor não cria e o gestor não justifica o próprio ponto; nada é gravado', async () => {
  const { executor, criacoes } = montar();
  await assert.rejects(() => executor.executar(ENTRADA, DESENVOLVEDOR), UnauthorizedAccessException);
  await assert.rejects(() => executor.executar({ ...ENTRADA, usuarioId: 1 }, GESTOR), BusinessException);
  assert.deepEqual(criacoes, []);
});

test('desfazer: exclui a justificativa criada; recusa se já foi excluída, se mudou ou sem permissão', async () => {
  const resultado = { justificativaId: 90, ...ENTRADA };
  const feito = montar();
  await feito.executor.desfazer(resultado, GESTOR);
  assert.deepEqual(feito.exclusoes, [90]);

  const excluida = montar({ atual: null });
  await assert.rejects(() => excluida.executor.desfazer(resultado, GESTOR), BusinessException);
  const mudou = montar({ atual: { id: 90, ...ENTRADA, horasCobertas: 2 } });
  await assert.rejects(() => mudou.executor.desfazer(resultado, GESTOR), BusinessException);
  await assert.rejects(() => feito.executor.desfazer(resultado, DESENVOLVEDOR), UnauthorizedAccessException);
  await assert.rejects(() => feito.executor.desfazer({}, GESTOR), BusinessException);
  assert.deepEqual(excluida.exclusoes.concat(mudou.exclusoes), []);
});

test('validar: dados inválidos são recusados; obsoleta quando o dia já tem justificativa', async () => {
  const { executor } = montar();
  assert.doesNotThrow(() => executor.validar({ ...ENTRADA, usuarioNome: 'Dev' }));
  assert.throws(() => executor.validar({ ...ENTRADA, nome: '' }), BusinessException);
  assert.throws(() => executor.validar({ ...ENTRADA, diaData: 'ontem' }), BusinessException);
  assert.throws(() => executor.validar({ ...ENTRADA, campoInventado: 1 }), BusinessException);
  assert.equal(await executor.estaObsoleta(ENTRADA, GESTOR), false);
  assert.equal(await montar({ jaExiste: true }).executor.estaObsoleta(ENTRADA, GESTOR), true);
});
