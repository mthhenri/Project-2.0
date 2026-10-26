import { test } from 'node:test';
import * as assert from 'node:assert/strict';
import { LIMITE_CONTEUDO_DA_FONTE_DO_PLANO, LIMITE_FONTES_POR_PLANO, TipoPlanoFonteOrigemEnum as Origem, TipoUsuarioEnum } from '@project20/shared';
import { BusinessException } from '../../../core/exceptions/business.exception';
import { ResourceNotFoundException } from '../../../core/exceptions/resource-not-found.exception';
import { PlanoFonteRepository } from '../repositories/plano-fonte.repository';
import { PlanoFonteService } from './plano-fonte.service';
import { PlanoService } from './plano.service';

// Fontes do plano (task 236): acesso do plano, limites e recusa de arquivo que não é texto, soft delete.

const USUARIO = { sub: 4, login: 'dev', tipo: TipoUsuarioEnum.DESENVOLVEDOR } as never;
const COLADO = { planoId: 7, titulo: 'E-mail do cliente', conteudo: 'Precisamos exportar.', origem: Origem.COLADO, usuarioId: 4 };

/** Confere que é uma `BusinessException` cuja mensagem (a que o usuário lê) contém o trecho. */
function mensagemContem(trecho: string) {
  return (erro: unknown) => erro instanceof BusinessException && String((erro.getResponse() as { mensagem: string }).mensagem).includes(trecho);
}

function criarServico(opcoes: { semAcessoAoPlano?: boolean; total?: number; fonte?: unknown } = {}) {
  const chamadas: Array<{ metodo: string; argumento: unknown }> = [];
  const repositorio = {
    inserir: async (dto: unknown) => { chamadas.push({ metodo: 'inserir', argumento: dto }); return { id: 9, ...(dto as object) }; },
    contar: async () => opcoes.total ?? 0,
    listar: async () => { chamadas.push({ metodo: 'listar', argumento: null }); return []; },
    listarComConteudo: async () => [],
    recuperar: async () => ('fonte' in opcoes ? opcoes.fonte : { id: 9 }),
    excluir: async (dto: unknown) => { chamadas.push({ metodo: 'excluir', argumento: dto }); return 'fonte' in opcoes && !opcoes.fonte ? null : { id: 9 }; },
  };
  const planoService = { recuperar: async () => { if (opcoes.semAcessoAoPlano) throw new ResourceNotFoundException('Plano'); return { dados: { id: 7 } }; } };
  const servico = new PlanoFonteService(repositorio as unknown as PlanoFonteRepository, planoService as unknown as PlanoService);
  return { servico, chamadas };
}

test('quem não vê o plano não cria, lista, lê nem remove fontes (404, nada gravado)', async () => {
  const { servico, chamadas } = criarServico({ semAcessoAoPlano: true });
  await assert.rejects(() => servico.criar(COLADO, USUARIO), ResourceNotFoundException);
  await assert.rejects(() => servico.listar({ planoId: 7 }, USUARIO), ResourceNotFoundException);
  await assert.rejects(() => servico.listarComConteudo({ planoId: 7 }, USUARIO), ResourceNotFoundException);
  await assert.rejects(() => servico.recuperar({ planoId: 7, id: 9 }, USUARIO), ResourceNotFoundException);
  await assert.rejects(() => servico.excluir({ planoId: 7, id: 9 }, USUARIO), ResourceNotFoundException);
  assert.deepEqual(chamadas, []);
});

test('criar grava o título aparado, a origem e quem trouxe (o usuário ativo, não o do corpo)', async () => {
  const { servico, chamadas } = criarServico();
  const resposta = await servico.criar({ ...COLADO, titulo: '  E-mail   do cliente ', usuarioId: 999 }, USUARIO);
  assert.deepEqual(chamadas[0].argumento, { ...COLADO, titulo: 'E-mail do cliente', usuarioId: 4 });
  assert.equal(resposta.sucesso, true);
});

test('recusa conteúdo em branco, grande demais, arquivo que não é .txt/.md e arquivo binário', async () => {
  const { servico, chamadas } = criarServico();
  await assert.rejects(() => servico.criar({ ...COLADO, conteudo: '  ' }, USUARIO), BusinessException);
  await assert.rejects(() => servico.criar({ ...COLADO, conteudo: 'a'.repeat(LIMITE_CONTEUDO_DA_FONTE_DO_PLANO + 1) }, USUARIO), BusinessException);
  await assert.rejects(() => servico.criar({ ...COLADO, titulo: 'contrato.pdf', origem: Origem.ARQUIVO }, USUARIO), mensagemContem('arquivos de texto'));
  await assert.rejects(() => servico.criar({ ...COLADO, titulo: 'dados.txt', origem: Origem.ARQUIVO, conteudo: 'PK\u0000\u0001' }, USUARIO), mensagemContem('legível'));
  assert.deepEqual(chamadas, []);

  await servico.criar({ ...COLADO, titulo: 'briefing.md', origem: Origem.ARQUIVO, conteudo: '# Briefing' }, USUARIO);
  assert.equal(chamadas.length, 1);
});

test('o plano com o teto de fontes não aceita outra', async () => {
  const { servico, chamadas } = criarServico({ total: LIMITE_FONTES_POR_PLANO });
  await assert.rejects(() => servico.criar(COLADO, USUARIO), BusinessException);
  assert.deepEqual(chamadas, []);
});

test('ler ou remover fonte que não é do plano dá 404', async () => {
  const { servico } = criarServico({ fonte: null });
  await assert.rejects(() => servico.recuperar({ planoId: 7, id: 9 }, USUARIO), ResourceNotFoundException);
  await assert.rejects(() => servico.excluir({ planoId: 7, id: 9 }, USUARIO), ResourceNotFoundException);
});
