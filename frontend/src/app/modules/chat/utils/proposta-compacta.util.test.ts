import { test } from 'vitest';
import * as assert from 'node:assert/strict';
import { TipoPropostaIaEnum } from '@project20/shared';
import { LIMITE_DE_CAMPOS_COMPACTO, LIMITE_DE_TEXTO_COMPACTO, periodoAnteriorDaExecucao, periodoNovoDaExecucao, resumirProposta } from './proposta-compacta.util';

const Tipo = TipoPropostaIaEnum;

// Cada tipo com os dados de uma proposta pequena e típica; o segundo valor diz se ela cabe numa linha.
const TIPICAS: [TipoPropostaIaEnum, Record<string, unknown>, boolean][] = [
  [Tipo.INICIAR_EXECUCAO, { atividadeId: 3, atividadeNome: 'Revisar PR do login', demandaNome: 'Tela de login', statusAnterior: 'PENDENTE', novoStatus: 'DESENVOLVENDO', descricao: 'Retomando a revisão', pausaraAtividadeNome: 'Ajustar filtros' }, true],
  [Tipo.PAUSAR_EXECUCAO, { atividadeNome: 'Ajustar filtros da tela de Ponto', descricao: 'Filtro por período funcionando; falta a ordenação.' }, true],
  [Tipo.CRIAR_ATIVIDADE, { nome: 'Montar o formulário', demandaNome: 'Login', prioridade: 'ALTA', usuarioNome: 'Ana' }, true],
  [Tipo.ALTERAR_ATIVIDADE, { atividadeNome: 'Ajustar filtros', nome: 'Ajustar filtros e ordenação', statusAnterior: 'PLANEJADA', status: 'DESENVOLVENDO' }, true],
  [Tipo.REGISTRAR_EXECUCAO, { atividadeNome: 'Reunião de planejamento', usuarioNome: 'Ana Souza', periodoTexto: 'Ontem, 14:00 até 16:30', duracaoMinutos: 150, descricao: 'Planejamento da sprint com o cliente.' }, true],
  [Tipo.CORRIGIR_EXECUCAO, { atividadeNome: 'Ajustar filtros', periodoAnteriorTexto: '09:00 até 11:45', periodoNovoTexto: '08:30 até 11:45', duracaoNovaMinutos: 195 }, true],
  [Tipo.ALTERAR_DEMANDA, { demandaNome: 'Tela de login', statusAnterior: 'PLANEJADA', status: 'CONCLUIDA', horasAnteriores: 8, horasEstimadas: 12 }, true],
  [Tipo.ATRIBUIR_MEMBRO, { usuarioNome: 'Ana', demandaNome: 'Relatórios', projetoNome: 'Portal', acao: 'ADICIONAR' }, true],
  [Tipo.ATRIBUIR_TAG, { alvo: 'DEMANDA', alvoNome: 'Tela de login', tagsAntesNomes: ['Frontend'], tagsDepoisNomes: ['Frontend', 'Urgente'] }, true],
  [Tipo.CRIAR_PROJETO, { nome: 'Portal do cliente', codigo: 'PORTAL', cor: '#336699' }, true],
  [Tipo.DESCREVER_EXECUCAO, { atividadeNome: 'Ajustar filtros', descricao: 'Filtros por período e por pessoa.', escolha: 'CONTINUAR' }, true],
  [Tipo.SUSPENDER_CHECKIN, { acao: 'SUSPENDER', motivo: 'reunião com o cliente' }, true],
  [Tipo.ANOTAR_PAD, { secao: 'FEITO', operacao: 'ANEXAR', texto: '- Filtros do Ponto prontos' }, true],
  [Tipo.CRIAR_DEMANDA, { nome: 'Exportar relatório em PDF', projetoNome: 'Portal', demandaPaiNome: 'Relatórios' }, true],
  [Tipo.DESCREVER_DEMANDA, { demandaNome: 'Exportar PDF', descricaoTecnica: 'Curto.' }, false],
  [Tipo.CONECTAR_DEMANDA, { demandaOrigemNome: 'API de relatórios', demandaDestinoNome: 'Exportar PDF', motivo: 'o PDF usa os dados da API' }, true],
  [Tipo.CONCLUIR_DEMANDA, { demandaNome: 'Tela de login', projetoNome: 'Portal', statusAnterior: 'PLANEJADA', atividadesEmAberto: 0 }, true],
  [Tipo.MOVER_ATIVIDADE, { atividadeNome: 'Montar o formulário', demandaOrigemNome: 'Login', demandaDestinoNome: 'Relatórios' }, true],
  [Tipo.DESCONECTAR_DEMANDA, { demandaOrigemNome: 'API de relatórios', demandaDestinoNome: 'Exportar PDF', ehBidirecional: false }, true],
  [Tipo.EXCLUIR_ATIVIDADE, { atividadeNome: 'Montar o formulário', demandaNome: 'Login' }, true],
  [Tipo.ALTERAR_TRECHO_PLANO, { planoId: 7, planoTitulo: 'Relatório mensal', aba: 'DESCRICAO_TECNICA', trechoAntigo: 'Texto velho.', trechoNovo: 'Texto novo.', versao: 3 }, false],
  [Tipo.JUSTIFICAR_PONTO, { usuarioNome: 'Ana', diaData: '2026-10-20', nome: 'Consulta médica', descricao: 'Combinado com o gestor', horasCobertas: 4 }, true],
];

test('todos os tipos de proposta têm resumo e a regra decide cada um', () => {
  assert.equal(TIPICAS.length, Object.values(Tipo).length, 'um caso por tipo');
  for (const [tipo, dados, compacto] of TIPICAS) {
    const resumo = resumirProposta(tipo, dados);
    assert.ok(resumo.acao.length > 0, `${tipo} sem ação`);
    assert.equal(resumo.compacto, compacto, `${tipo}`);
  }
});

test('Descrever demanda é sempre cartão grande, mesmo com texto curto', () => {
  assert.equal(resumirProposta(Tipo.DESCREVER_DEMANDA, { demandaNome: 'X', descricaoCliente: 'Oi' }).compacto, false);
});

test('texto de até 80 caracteres cabe; com 81, vai para o cartão grande', () => {
  const dadosCom = (descricao: string) => ({ atividadeNome: 'Ajustar', descricao });
  assert.equal(LIMITE_DE_TEXTO_COMPACTO, 80);
  assert.equal(resumirProposta(Tipo.PAUSAR_EXECUCAO, dadosCom('a'.repeat(80))).compacto, true);
  assert.equal(resumirProposta(Tipo.PAUSAR_EXECUCAO, dadosCom('a'.repeat(81))).compacto, false);
});

test('texto com quebra de linha não cabe numa linha', () => {
  assert.equal(resumirProposta(Tipo.ANOTAR_PAD, { secao: 'FEITO', operacao: 'ANEXAR', texto: '- um\n- dois' }).compacto, false);
});

test('até 3 campos cabem; com 4, cartão grande', () => {
  assert.equal(LIMITE_DE_CAMPOS_COMPACTO, 3);
  const tresCampos = { atividadeNome: 'A', statusAnterior: 'PLANEJADA', novoStatus: 'DESENVOLVENDO', pausaraAtividadeNome: 'B', descricao: 'curta' };
  assert.equal(resumirProposta(Tipo.INICIAR_EXECUCAO, tresCampos).campos.length, 3);
  assert.equal(resumirProposta(Tipo.INICIAR_EXECUCAO, tresCampos).compacto, true);
  const quatroCampos = { demandaNome: 'D', statusAnterior: 'PLANEJADA', status: 'CONCLUIDA', horasAnteriores: 1, horasEstimadas: 2, previsaoAnteriorData: null, previsaoFimData: '2026-11-30' };
  assert.equal(resumirProposta(Tipo.ALTERAR_DEMANDA, quatroCampos).campos.length, 3);
  assert.equal(resumirProposta(Tipo.ALTERAR_DEMANDA, quatroCampos).compacto, true);
  assert.equal(resumirProposta(Tipo.ALTERAR_DEMANDA, { ...quatroCampos, paiNovoNome: 'Autenticação', paiAnteriorNome: null }).campos.length, 4);
  assert.equal(resumirProposta(Tipo.ALTERAR_DEMANDA, { ...quatroCampos, paiNovoNome: 'Autenticação', paiAnteriorNome: null }).compacto, false);
});

test('o que o usuário precisa ler antes de confirmar manda a proposta para o cartão grande', () => {
  assert.equal(resumirProposta(Tipo.ALTERAR_DEMANDA, { demandaNome: 'D', acrescentarDocumentacao: 'Curto' }).compacto, false);
  assert.equal(resumirProposta(Tipo.ALTERAR_DEMANDA, { demandaNome: 'D', status: 'CONCLUIDA', statusAnterior: 'PLANEJADA', atividadesEmAberto: 2 }).compacto, false);
  assert.equal(resumirProposta(Tipo.CRIAR_DEMANDA, { nome: 'N', projetoNome: 'P', projetoPropostaId: 5 }).compacto, false);
  assert.equal(resumirProposta(Tipo.CRIAR_DEMANDA, { nome: 'N', projetoNome: 'P', demandaPaiPropostaId: 6 }).compacto, false);
  // Com descrição, a criação de demanda passa de 3 campos (projeto, pai, tipo e a descrição).
  assert.equal(resumirProposta(Tipo.CRIAR_DEMANDA, { nome: 'N', projetoNome: 'P', descricaoTecnica: 'Curta' }).compacto, false);
});

test('alterar atividade: o nome novo vem com o de antes para o diff, e status e prioridade viram antes → depois', () => {
  const resumo = resumirProposta(Tipo.ALTERAR_ATIVIDADE, {
    atividadeNome: 'Ajustar filtros', nome: 'Ajustar filtros e ordenação', statusAnterior: 'PLANEJADA', status: 'DESENVOLVENDO', prioridadeAnterior: 'MEDIA', prioridade: 'ALTA',
  });
  assert.equal(resumo.nome, 'Ajustar filtros e ordenação');
  assert.equal(resumo.nomeAnterior, 'Ajustar filtros');
  assert.deepEqual(resumo.campos.map((campo) => campo.tipo), ['mudanca', 'prioridade']);
  const semRenomear = resumirProposta(Tipo.ALTERAR_ATIVIDADE, { atividadeNome: 'Ajustar filtros', statusAnterior: 'PLANEJADA', status: 'DESENVOLVENDO' });
  assert.equal(semRenomear.nome, 'Ajustar filtros');
  assert.equal(semRenomear.nomeAnterior, undefined);
});

test('tags: o que entra e o que sai viram um campo cada', () => {
  const resumo = resumirProposta(Tipo.ATRIBUIR_TAG, { alvo: 'ATIVIDADE', alvoNome: 'Revisar PR', demandaNome: 'Login', tagsAntesNomes: ['Bloqueado', 'Frontend'], tagsDepoisNomes: ['Frontend', 'Revisão'] });
  assert.deepEqual(resumo.campos, [{ tipo: 'chip', texto: '+ Revisão' }, { tipo: 'chip', texto: '− Bloqueado' }]);
  assert.equal(resumo.contexto, 'Login');
});

test('atribuir membro: a ação diz quem entra ou sai e em quê', () => {
  assert.equal(resumirProposta(Tipo.ATRIBUIR_MEMBRO, { usuarioNome: 'Ana', demandaNome: 'Relatórios', acao: 'REMOVER' }).acao, 'Tirar Ana de');
  assert.equal(resumirProposta(Tipo.ATRIBUIR_MEMBRO, { usuarioNome: 'Ana', demandaNome: 'Relatórios' }).acao, 'Colocar Ana em');
});

test('em nome de outra pessoa a ação diz para quem', () => {
  assert.equal(resumirProposta(Tipo.INICIAR_EXECUCAO, { atividadeNome: 'X', usuarioNome: 'Ana' }).acao, 'Iniciar para Ana');
  assert.equal(resumirProposta(Tipo.CRIAR_ATIVIDADE, { nome: 'X', usuarioNome: 'Bruno' }).acao, 'Criar atividade para Bruno');
  assert.equal(resumirProposta(Tipo.REGISTRAR_EXECUCAO, { atividadeNome: 'X', usuarioNome: 'Ana' }).acao, 'Registrar para Ana');
});

test('conectar demandas mostra o sentido da conexão no nome', () => {
  assert.equal(resumirProposta(Tipo.CONECTAR_DEMANDA, { demandaOrigemNome: 'A', demandaDestinoNome: 'B' }).nome, 'A → B');
  assert.equal(resumirProposta(Tipo.CONECTAR_DEMANDA, { demandaOrigemNome: 'A', demandaDestinoNome: 'B', ehBidirecional: true }).nome, 'A ↔ B');
});

test('trocar trecho do pad vira um diff em uma linha; trecho longo vai para o cartão grande', () => {
  const resumo = resumirProposta(Tipo.ANOTAR_PAD, { secao: 'FAZER', operacao: 'TROCAR', trechoAntigo: '- Revisar o login', trechoNovo: '- Revisar o fluxo de senha' });
  assert.equal(resumo.acao, 'Trocar no pad');
  assert.deepEqual(resumo.campos, [{ tipo: 'mudanca', antes: '- Revisar o login', depois: '- Revisar o fluxo de senha', diff: true }]);
  assert.equal(resumo.compacto, true);
  assert.equal(resumirProposta(Tipo.ANOTAR_PAD, { secao: 'FAZER', operacao: 'TROCAR', trechoAntigo: 'a'.repeat(90), trechoNovo: 'b' }).compacto, false);
});

test('corrigir execução: horário e duração de antes e depois, com a duração do período de antes calculada das datas', () => {
  const dados = {
    inicioAnteriorData: '2026-10-24T12:00:00.000Z', fimAnteriorData: '2026-10-24T14:45:00.000Z',
    periodoAnteriorTexto: '09:00 até 11:45', periodoNovoTexto: '08:30 até 11:45', duracaoNovaMinutos: 195,
  };
  assert.equal(periodoAnteriorDaExecucao(dados), '09:00 até 11:45 (2h45)');
  assert.equal(periodoNovoDaExecucao(dados), '08:30 até 11:45 (3h15)');
  assert.equal(periodoAnteriorDaExecucao({ periodoAnteriorTexto: 'sem datas' }), 'sem datas');
  assert.equal(periodoNovoDaExecucao({ periodoNovoTexto: 'sem duração' }), 'sem duração');
});

test('tipo desconhecido não quebra: vira cartão grande', () => {
  const resumo = resumirProposta('NOVO_TIPO' as TipoPropostaIaEnum, {});
  assert.equal(resumo.compacto, false);
});

test('concluir demanda com atividades abertas vai para o cartão grande, onde o aviso aparece (task 229)', () => {
  const resumo = resumirProposta(Tipo.CONCLUIR_DEMANDA, { demandaNome: 'Tela de login', statusAnterior: 'PLANEJADA', atividadesEmAberto: 2 });
  assert.equal(resumo.compacto, false);
  assert.equal(resumo.acao, 'Concluir demanda');
});

test('mover atividade mostra de onde para onde e que as execuções vão junto (task 229)', () => {
  const resumo = resumirProposta(Tipo.MOVER_ATIVIDADE, { atividadeNome: 'Montar o formulário', demandaOrigemNome: 'Login', demandaDestinoNome: 'Relatórios' });
  assert.deepEqual(resumo.campos, [
    { tipo: 'mudanca', antes: 'Login', depois: 'Relatórios', diff: false },
    { tipo: 'chip', texto: 'Execuções vão junto' },
  ]);
});

test('desconectar mostra as duas demandas com a seta do sentido e que elas ficam onde estão (task 230)', () => {
  const unica = resumirProposta(Tipo.DESCONECTAR_DEMANDA, { demandaOrigemNome: 'API', demandaDestinoNome: 'Tela', ehBidirecional: false });
  assert.equal(unica.nome, 'API → Tela');
  assert.deepEqual(unica.campos, [{ tipo: 'chip', texto: 'As demandas ficam onde estão' }]);
  assert.equal(resumirProposta(Tipo.DESCONECTAR_DEMANDA, { demandaOrigemNome: 'API', demandaDestinoNome: 'Tela', ehBidirecional: true }).nome, 'API ↔ Tela');
});

test('excluir atividade mostra o nome, a demanda e que ela não tem execuções (task 230)', () => {
  const resumo = resumirProposta(Tipo.EXCLUIR_ATIVIDADE, { atividadeNome: 'Montar o formulário', demandaNome: 'Login' });
  assert.equal(resumo.acao, 'Excluir atividade');
  assert.equal(resumo.contexto, 'Login');
  assert.deepEqual(resumo.campos, [{ tipo: 'chip', texto: 'Sem execuções' }]);
});

test('justificar ponto mostra a pessoa, o dia, as horas cobertas e o motivo (task 231)', () => {
  const resumo = resumirProposta(Tipo.JUSTIFICAR_PONTO, { usuarioNome: 'Ana', diaData: '2026-10-20', nome: 'Consulta médica', descricao: 'Combinado com o gestor', horasCobertas: 4 });
  assert.equal(resumo.acao, 'Justificar ponto para Ana');
  assert.equal(resumo.nome, 'Consulta médica');
  assert.equal(resumo.contexto, '20/10/2026');
  assert.deepEqual(resumo.campos, [{ tipo: 'chip', texto: '4 h cobertas' }, { tipo: 'citacao', texto: 'Combinado com o gestor' }]);
});
