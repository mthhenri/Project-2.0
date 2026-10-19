import { test } from 'node:test';
import * as assert from 'node:assert/strict';
import { RelatorioPeriodoTipoEnum, TipoUsuarioEnum } from '@project20/shared';
import { RelatorioService } from '../services/relatorio.service';
import { ConsultarRelatorioDeExecucoesFerramenta, LIMITE_ATIVIDADES_DO_RELATORIO, somarPorChave } from './consultar-relatorio-de-execucoes.ferramenta';

const GESTOR = { sub: 1, login: 'gestor', tipo: TipoUsuarioEnum.GESTOR } as never;

function linha(usuario: string, demanda: string, atividade: string, minutos: number) {
  return { nomeProjeto: 'Loja', nomeDemanda: demanda, nomeAtividade: atividade, nomeUsuario: usuario, duracaoMinutos: minutos, descricao: 'texto longo que não deve voltar' };
}

function criar(linhas: ReturnType<typeof linha>[]) {
  const chamadas: Record<string, unknown>[] = [];
  const servico = {
    gerarRelatorio: async (dto: Record<string, unknown>) => {
      chamadas.push(dto);
      return {
        sucesso: true, mensagem: '',
        dados: {
          projetoId: 3, nomeProjeto: 'Loja', periodoDescricao: 'Outubro/2026', dataInicio: '2026-10-01', dataFim: '2026-10-31',
          totalExecucoes: linhas.length, totalMinutos: linhas.reduce((soma, item) => soma + item.duracaoMinutos, 0), linhas,
        },
      };
    },
  };
  return { ferramenta: new ConsultarRelatorioDeExecucoesFerramenta(servico as unknown as RelatorioService), chamadas };
}

test('somarPorChave soma minutos e execuções e ordena do maior para o menor', () => {
  const totais = somarPorChave([{ chave: 'Ana', minutos: 30 }, { chave: 'Bia', minutos: 90 }, { chave: 'Ana', minutos: 40 }]);
  assert.deepEqual(totais, [{ nome: 'Bia', minutos: 90, execucoes: 1 }, { nome: 'Ana', minutos: 70, execucoes: 2 }]);
});

test('resume por pessoa e por atividade, sem as linhas nem as descrições', async () => {
  const { ferramenta } = criar([linha('Ana', 'Login', 'Formulário', 60), linha('Bia', 'Login', 'Formulário', 30), linha('Ana', 'Relatórios', 'PDF', 120)]);
  const resultado = await ferramenta.executar({ projetoId: 3, ano: 2026, mes: 10 }, GESTOR);
  assert.equal(resultado.totalMinutos, 210);
  assert.deepEqual(resultado.porUsuario, [{ nome: 'Ana', minutos: 180, execucoes: 2 }, { nome: 'Bia', minutos: 30, execucoes: 1 }]);
  assert.equal(resultado.porAtividade[0].nome, 'Relatórios › PDF');
  assert.equal(JSON.stringify(resultado).includes('texto longo'), false);
});

test('o período vem de intervalo, mês ou ano, nessa ordem', async () => {
  const { ferramenta, chamadas } = criar([]);
  await ferramenta.executar({ projetoId: 3, dataInicio: '2026-09-01', dataFim: '2026-09-15', ano: 2026, mes: 9 }, GESTOR);
  await ferramenta.executar({ projetoId: 3, ano: 2026, mes: 9 }, GESTOR);
  await ferramenta.executar({ projetoId: 3, ano: 2026 }, GESTOR);
  assert.deepEqual(chamadas, [
    { periodoTipo: RelatorioPeriodoTipoEnum.CUSTOM, dataInicio: '2026-09-01', dataFim: '2026-09-15', projetoId: 3 },
    { periodoTipo: RelatorioPeriodoTipoEnum.MENSAL, ano: 2026, mes: 9, projetoId: 3 },
    { periodoTipo: RelatorioPeriodoTipoEnum.ANUAL, ano: 2026, projetoId: 3 },
  ]);
});

test('limita as atividades do resumo e avisa que há mais; só o gestor tem a ferramenta', async () => {
  const linhas = Array.from({ length: LIMITE_ATIVIDADES_DO_RELATORIO + 4 }, (_, indice) => linha('Ana', 'Demanda', `Atividade ${indice}`, indice + 1));
  const { ferramenta } = criar(linhas);
  const resultado = await ferramenta.executar({ projetoId: 3, ano: 2026 }, GESTOR);
  assert.equal(resultado.porAtividade.length, LIMITE_ATIVIDADES_DO_RELATORIO);
  assert.equal(resultado.haMaisAtividades, true);
  assert.equal(ferramenta.permissao, 'GESTOR');
});

test('somarPorChave desempata minutos iguais pelo nome', () => {
  const totais = somarPorChave([{ chave: 'Bia', minutos: 30 }, { chave: 'Ana', minutos: 30 }]);
  assert.deepEqual(totais.map((total) => total.nome), ['Ana', 'Bia']);
});

test('período sem execuções devolve totais zerados e nenhuma atividade extra', async () => {
  const { ferramenta } = criar([]);
  const resultado = await ferramenta.executar({ projetoId: 3, ano: 2026 }, GESTOR);
  assert.equal(resultado.totalMinutos, 0);
  assert.equal(resultado.totalExecucoes, 0);
  assert.deepEqual(resultado.porUsuario, []);
  assert.deepEqual(resultado.porAtividade, []);
  assert.equal(resultado.haMaisAtividades, false);
});

test('é ferramenta de leitura, e a falha da service (período inválido, projeto inexistente) chega a quem chamou', async () => {
  const falha = new Error('Projeto não encontrado');
  const ferramenta = new ConsultarRelatorioDeExecucoesFerramenta({ gerarRelatorio: async () => { throw falha; } } as unknown as RelatorioService);
  assert.equal(ferramenta.tipo, 'LEITURA');
  await assert.rejects(() => ferramenta.executar({ projetoId: 99, ano: 2026 }, GESTOR), falha);
});
