import { test } from 'node:test';
import * as assert from 'node:assert/strict';
import { PromptResumoDto, TipoPromptEnum, TipoUsuarioEnum } from '@project20/shared';
import { BusinessException } from '../../../core/exceptions/business.exception';
import { ResourceNotFoundException } from '../../../core/exceptions/resource-not-found.exception';
import { UnauthorizedAccessException } from '../../../core/exceptions/unauthorized-access.exception';
import { PromptRepository } from '../repositories/prompt.repository';
import { PromptService } from './prompt.service';

const ADMINISTRADOR = { sub: 1, tipo: TipoUsuarioEnum.ADMINISTRADOR } as never;
const GESTOR = { sub: 2, tipo: TipoUsuarioEnum.GESTOR } as never;
const DESENVOLVEDOR = { sub: 3, tipo: TipoUsuarioEnum.DESENVOLVEDOR } as never;
const TIPO = TipoPromptEnum.PAD;

function versao(numero: number, parcial: Partial<PromptResumoDto> = {}): PromptResumoDto {
  return { id: numero, tipo: TIPO, versao: numero, conteudo: `texto ${numero}`, ativo: false, rascunho: false, usuarioId: 1, usuarioNome: 'Admin', createdDate: new Date(), ...parcial };
}

/** Repositório em memória de UM tipo, com as mesmas regras de transição do SQL (uma ativa, um rascunho). */
function criarRepositorio() {
  const versoes: PromptResumoDto[] = [versao(1, { ativo: true })];
  const estado = { leiturasDaAtiva: 0 };
  const repositorio = {
    async listarTipos() {
      return [{ tipo: TIPO, descricao: 'Pad', ativa: versoes.find((v) => v.ativo)!, rascunho: versoes.find((v) => v.rascunho) ?? null }];
    },
    async recuperarAtivo() {
      estado.leiturasDaAtiva++;
      return versoes.find((v) => v.ativo);
    },
    async listarVersoes() {
      return { itens: [...versoes].reverse(), total: versoes.length };
    },
    async salvarRascunho(_tipo: TipoPromptEnum, conteudo: string) {
      const existente = versoes.find((v) => v.rascunho);
      if (existente) {
        existente.conteudo = conteudo;
        return existente;
      }
      const novo = versao(Math.max(...versoes.map((v) => v.versao)) + 1, { conteudo, rascunho: true });
      versoes.push(novo);
      return novo;
    },
    async ativarRascunho() {
      const rascunho = versoes.find((v) => v.rascunho);
      if (!rascunho) return undefined;
      versoes.forEach((v) => (v.ativo = false));
      rascunho.rascunho = false;
      rascunho.ativo = true;
      return rascunho;
    },
    async restaurarPadrao() {
      const padrao = versoes.find((v) => v.versao === 1);
      if (!padrao) return undefined;
      versoes.forEach((v) => (v.ativo = false));
      padrao.ativo = true;
      return padrao;
    },
    async descartarRascunho() {
      const indice = versoes.findIndex((v) => v.rascunho);
      if (indice < 0) return false;
      versoes.splice(indice, 1);
      return true;
    },
  } as unknown as PromptRepository;
  return { repositorio, versoes, estado };
}

const ativas = (versoes: PromptResumoDto[]) => versoes.filter((v) => v.ativo).map((v) => v.versao);

test('ativar o rascunho troca a ativa, mantém a anterior no histórico e renova o cache', async () => {
  const { repositorio, versoes } = criarRepositorio();
  const servico = new PromptService(repositorio);

  assert.equal((await servico.obterAtivo(TIPO)).versao, 1);
  await servico.salvarRascunho(TIPO, { conteudo: 'novo texto' }, ADMINISTRADOR);
  assert.equal((await servico.obterAtivo(TIPO)).versao, 1, 'o rascunho ainda não vale');

  const resposta = await servico.ativarRascunho(TIPO, ADMINISTRADOR);
  assert.equal(resposta.dados.versao, 2);
  assert.deepEqual(ativas(versoes), [2]);
  assert.equal(versoes.length, 2, 'a versão 1 continua no histórico');
  assert.equal((await servico.obterAtivo(TIPO)).conteudo, 'novo texto');
});

test('um só rascunho por tipo: salvar de novo substitui o texto, sem criar outra versão', async () => {
  const { repositorio, versoes } = criarRepositorio();
  const servico = new PromptService(repositorio);
  await servico.salvarRascunho(TIPO, { conteudo: 'a' }, ADMINISTRADOR);
  await servico.salvarRascunho(TIPO, { conteudo: 'b' }, ADMINISTRADOR);
  assert.equal(versoes.filter((v) => v.rascunho).length, 1);
  assert.equal(versoes.length, 2);
  assert.equal(versoes[1].conteudo, 'b');
});

test('restaurar o padrão reativa a versão 1 sem apagar o histórico', async () => {
  const { repositorio, versoes } = criarRepositorio();
  const servico = new PromptService(repositorio);
  await servico.salvarRascunho(TIPO, { conteudo: 'outro' }, ADMINISTRADOR);
  await servico.ativarRascunho(TIPO, ADMINISTRADOR);
  assert.equal((await servico.obterAtivo(TIPO)).versao, 2);

  await servico.restaurarPadrao(TIPO, ADMINISTRADOR);
  assert.deepEqual(ativas(versoes), [1]);
  assert.equal(versoes.length, 2);
  assert.equal((await servico.obterAtivo(TIPO)).versao, 1);
});

test('ativar sem rascunho, rascunho vazio e descartar sem rascunho são recusados', async () => {
  const { repositorio } = criarRepositorio();
  const servico = new PromptService(repositorio);
  await assert.rejects(() => servico.ativarRascunho(TIPO, ADMINISTRADOR), BusinessException);
  await assert.rejects(() => servico.salvarRascunho(TIPO, { conteudo: '   \n' }, ADMINISTRADOR), BusinessException);
  await assert.rejects(() => servico.descartarRascunho(TIPO, ADMINISTRADOR), ResourceNotFoundException);
});

test('descartar remove o rascunho e a ativa continua valendo', async () => {
  const { repositorio, versoes } = criarRepositorio();
  const servico = new PromptService(repositorio);
  await servico.salvarRascunho(TIPO, { conteudo: 'x' }, ADMINISTRADOR);
  await servico.descartarRascunho(TIPO, ADMINISTRADOR);
  assert.equal(versoes.some((v) => v.rascunho), false);
  assert.deepEqual(ativas(versoes), [1]);
});

test('obterAtivo lê o banco uma vez e depois usa o cache', async () => {
  const { repositorio, estado } = criarRepositorio();
  const servico = new PromptService(repositorio);
  await servico.obterAtivo(TIPO);
  await servico.obterAtivo(TIPO);
  assert.equal(estado.leiturasDaAtiva, 1);
});

test('só administrador usa a API; gestor e desenvolvedor são recusados em tudo', async () => {
  const { repositorio, versoes } = criarRepositorio();
  const servico = new PromptService(repositorio);
  for (const usuario of [GESTOR, DESENVOLVEDOR]) {
    await assert.rejects(() => servico.listarTipos(usuario), UnauthorizedAccessException);
    await assert.rejects(() => servico.listarVersoes(TIPO, {}, usuario), UnauthorizedAccessException);
    await assert.rejects(() => servico.salvarRascunho(TIPO, { conteudo: 'x' }, usuario), UnauthorizedAccessException);
    await assert.rejects(() => servico.ativarRascunho(TIPO, usuario), UnauthorizedAccessException);
    await assert.rejects(() => servico.restaurarPadrao(TIPO, usuario), UnauthorizedAccessException);
    await assert.rejects(() => servico.descartarRascunho(TIPO, usuario), UnauthorizedAccessException);
  }
  assert.equal(versoes.length, 1);
});
