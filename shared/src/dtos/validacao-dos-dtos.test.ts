import 'reflect-metadata';
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { plainToInstance } from 'class-transformer';
import { validate, getMetadataStorage } from 'class-validator';
import * as dtos from './index';
import { REGEX_SEM_CARACTERES_PROIBIDOS } from '../validators/caracteres-proibidos.validator';

// O ValidationPipe do backend roda com whitelist + forbidNonWhitelisted + transform (main.ts, SYSTEM.SPEC.md §10).
const OPCOES_DO_PIPE = { whitelist: true, forbidNonWhitelisted: true };

type Construtor = new () => object;
const classes = dtos as unknown as Record<string, Construtor>;

async function erros(nomeDaClasse: string, carga: Record<string, unknown>): Promise<string[]> {
  const instancia = plainToInstance(classes[nomeDaClasse], carga);
  const resultado = await validate(instancia, OPCOES_DO_PIPE);
  return resultado.map((erro) => erro.property).sort();
}

// ---------------------------------------------------------------------------
// Convenção: caracteres proibidos (§10)
// ---------------------------------------------------------------------------

function propriedadesComRegexProibida(classe: Construtor): Set<string> {
  const metadados = getMetadataStorage().getTargetValidationMetadatas(classe, '', false, false);
  return new Set(
    metadados
      .filter((metadado) => (metadado.constraints ?? []).some((restricao) => restricao === REGEX_SEM_CARACTERES_PROIBIDOS))
      .map((metadado) => metadado.propertyName),
  );
}

function propriedadesValidadas(classe: Construtor): Set<string> {
  return new Set(getMetadataStorage().getTargetValidationMetadatas(classe, '', false, false).map((metadado) => metadado.propertyName));
}

test('os DTOs de entrada de nome (projeto, demanda, atividade, tag) aplicam o validador de caracteres proibidos', () => {
  const esperados = [
    'ProjetoCriarDto', 'ProjetoAlterarDto', 'DemandaCriarDto', 'DemandaAlterarDto',
    'AtividadeCriarDto', 'AtividadeAlterarDto', 'TagCriarDto', 'TagAlterarDto',
  ];
  const faltando = esperados.filter((nome) => !propriedadesComRegexProibida(classes[nome]).has('nome'));
  assert.deepEqual(faltando, [], `DTOs sem @Matches(REGEX_SEM_CARACTERES_PROIBIDOS) em "nome": ${faltando.join(', ')}`);
});

test('os DTOs de entrada de execução aplicam o validador de caracteres proibidos em "descricao"', () => {
  const esperados = ['ExecucaoIniciarDto', 'ExecucaoEncerrarDto', 'ExecucaoRegistrarDto', 'ExecucaoAlterarDto'];
  const faltando = esperados.filter((nome) => !propriedadesComRegexProibida(classes[nome]).has('descricao'));
  assert.deepEqual(faltando, [], `DTOs sem @Matches(REGEX_SEM_CARACTERES_PROIBIDOS) em "descricao": ${faltando.join(', ')}`);
});

// §10 lista os DTOs cobertos (projeto, demanda, atividade, tag e execução); o título da justificativa de ponto não está na lista.
const FORA_DA_REGRA_DE_CARACTERES = new Set(['PontoJustificativaCriarDto']);

test('varredura: todo DTO de entrada com campo "nome" validado exige o validador de caracteres proibidos', () => {
  const ehEntrada = (nome: string) => /(Criar|Alterar)Dto$/.test(nome) && !/InternoAlterarDto$/.test(nome);
  const semValidador: string[] = [];
  for (const [nome, classe] of Object.entries(classes)) {
    if (typeof classe !== 'function' || !ehEntrada(nome)) continue;
    if (FORA_DA_REGRA_DE_CARACTERES.has(nome)) continue;
    if (propriedadesValidadas(classe).has('nome') && !propriedadesComRegexProibida(classe).has('nome')) semValidador.push(nome);
  }
  assert.deepEqual(semValidador, [], `DTOs de entrada com "nome" sem o validador: ${semValidador.join(', ')}`);
});

test('DTOs internos e de saída não recebem o validador de caracteres proibidos', () => {
  const indevidos: string[] = [];
  for (const [nome, classe] of Object.entries(classes)) {
    if (typeof classe !== 'function') continue;
    const ehInternoOuSaida = /InternoAlterarDto$/.test(nome) || /(ado|ada|ido|ida)Dto$|ResumoDto$/.test(nome);
    if (ehInternoOuSaida && propriedadesComRegexProibida(classe).size > 0) indevidos.push(nome);
  }
  assert.deepEqual(indevidos, []);
});

// ---------------------------------------------------------------------------
// Validação estrutural dos DTOs de entrada críticos
// ---------------------------------------------------------------------------

const CARGAS_VALIDAS: Record<string, Record<string, unknown>> = {
  UsuarioCriarDto: { login: 'maria.silva', senhaNaoEncriptada: 'senhaForte1', nomeCompleto: 'Maria Silva', cargoTitulo: 'Dev', tipo: 'DESENVOLVEDOR', horasDiariasNecessarias: 8 },
  ProjetoCriarDto: { nome: 'Projeto A', codigo: 'PA', cor: '#336699', status: 'ATIVO' },
  DemandaCriarDto: { projetoId: 1, nome: 'Demanda A', horasEstimadas: 8, status: 'PENDENTE', isEstrutural: false },
  AtividadeCriarDto: { demandaId: 1, nome: 'Atividade A', status: 'PENDENTE' },
  ExecucaoRegistrarDto: { atividadeId: 1, inicioData: '2026-01-15T10:00:00-03:00', fimData: '2026-01-15T11:00:00-03:00', descricao: 'Trabalho feito' },
  DiaNaoUtilCriarDto: { diaData: '2026-03-10', descricao: 'Feriado', tipo: 'FERIADO', duracao: 'INTEGRAL', recorrente: false },
  TagCriarDto: { nome: 'Backend', cor: '#112233' },
  AutenticacaoLoginDto: { login: 'maria', senha: 'segredo' },
  // Alteração: todos os campos são opcionais, então a carga mínima válida é vazia.
  UsuarioAlterarDto: {},
  ProjetoAlterarDto: {},
  DemandaAlterarDto: {},
  AtividadeAlterarDto: {},
  ExecucaoAlterarDto: { descricao: 'Ajuste' },
  DiaNaoUtilAlterarDto: {},
  TagAlterarDto: {},
};

const OBRIGATORIOS: Record<string, string[]> = {
  UsuarioCriarDto: ['login', 'senhaNaoEncriptada', 'nomeCompleto', 'cargoTitulo', 'tipo', 'horasDiariasNecessarias'],
  ProjetoCriarDto: ['nome', 'codigo', 'cor', 'status'],
  DemandaCriarDto: ['projetoId', 'nome', 'horasEstimadas', 'status', 'isEstrutural'],
  AtividadeCriarDto: ['demandaId', 'nome', 'status'],
  ExecucaoRegistrarDto: ['atividadeId', 'inicioData', 'fimData', 'descricao'],
  DiaNaoUtilCriarDto: ['diaData', 'descricao', 'tipo', 'duracao', 'recorrente'],
  TagCriarDto: ['nome', 'cor'],
  AutenticacaoLoginDto: ['login', 'senha'],
  ExecucaoAlterarDto: ['descricao'],
};

for (const [nome, carga] of Object.entries(CARGAS_VALIDAS)) {
  test(`${nome}: a carga válida de referência passa`, async () => {
    assert.deepEqual(await erros(nome, carga), []);
  });

  test(`${nome}: campo desconhecido é recusado (forbidNonWhitelisted)`, async () => {
    assert.deepEqual(await erros(nome, { ...carga, campoQueNaoExiste: 'x' }), ['campoQueNaoExiste']);
  });
}

for (const [nome, obrigatorios] of Object.entries(OBRIGATORIOS)) {
  test(`${nome}: recusa a ausência de cada campo obrigatório`, async () => {
    assert.deepEqual(await erros(nome, {}), [...obrigatorios].sort());
    for (const campo of obrigatorios) {
      const { [campo]: _removido, ...semOCampo } = CARGAS_VALIDAS[nome];
      assert.deepEqual(await erros(nome, semOCampo), [campo], `sem ${campo}`);
    }
  });
}

const TIPO_ERRADO: Array<[string, string, unknown]> = [
  ['UsuarioCriarDto', 'horasDiariasNecessarias', 'oito'],
  ['UsuarioCriarDto', 'tipo', 'CHEFE'],
  ['UsuarioCriarDto', 'login', 123],
  ['AutenticacaoLoginDto', 'login', 123],
  ['AutenticacaoLoginDto', 'senha', 123],
  ['ProjetoCriarDto', 'codigo', 42],
  ['UsuarioAlterarDto', 'status', 'DESCONHECIDO'],
  ['ProjetoCriarDto', 'status', 'EM_ABERTO'],
  ['ProjetoCriarDto', 'cor', 'azul'],
  ['ProjetoCriarDto', 'inicioData', 'ontem'],
  ['DemandaCriarDto', 'isEstrutural', 'sim'],
  ['DemandaCriarDto', 'horasEstimadas', 'muitas'],
  ['DemandaCriarDto', 'projetoId', 0],
  ['AtividadeCriarDto', 'status', 'FEITA'],
  ['AtividadeCriarDto', 'nome', 42],
  ['AtividadeAlterarDto', 'prioridade', 'CRITICA'],
  ['ExecucaoRegistrarDto', 'inicioData', 'amanhã'],
  ['ExecucaoAlterarDto', 'fimData', 'nunca'],
  ['DiaNaoUtilCriarDto', 'tipo', 'FOLGA'],
  ['DiaNaoUtilCriarDto', 'recorrente', 'talvez'],
  ['TagCriarDto', 'cor', '#12'],
  ['TagCriarDto', 'nome', ['lista']],
];

for (const [nome, campo, valor] of TIPO_ERRADO) {
  test(`${nome}: ${campo} com tipo/valor errado (${JSON.stringify(valor)}) é recusado`, async () => {
    assert.deepEqual(await erros(nome, { ...CARGAS_VALIDAS[nome], [campo]: valor }), [campo]);
  });
}

test('nome de projeto, demanda, atividade e tag com caractere proibido é recusado; acento e hífen passam', async () => {
  for (const nome of ['ProjetoCriarDto', 'DemandaCriarDto', 'AtividadeCriarDto', 'TagCriarDto']) {
    assert.deepEqual(await erros(nome, { ...CARGAS_VALIDAS[nome], nome: "Aspas ' proibida" }), ['nome'], nome);
    assert.deepEqual(await erros(nome, { ...CARGAS_VALIDAS[nome], nome: 'Ação – relatório-mensal' }), [], nome);
  }
});

test('descrição de execução com caractere proibido é recusada', async () => {
  assert.deepEqual(await erros('ExecucaoRegistrarDto', { ...CARGAS_VALIDAS['ExecucaoRegistrarDto'], descricao: 'usei `crase`' }), ['descricao']);
});

test('ExecucaoAlterarDto aceita fimData nulo (manter a execução em andamento)', async () => {
  assert.deepEqual(await erros('ExecucaoAlterarDto', { descricao: 'Ajuste', fimData: null }), []);
});

test('login do usuário é normalizado (minúsculo e sem espaços) antes de validar o tamanho', async () => {
  const instancia = plainToInstance(classes['UsuarioCriarDto'], { ...CARGAS_VALIDAS['UsuarioCriarDto'], login: '  MARIA.SILVA ' }) as { login: string };
  assert.equal(instancia.login, 'maria.silva');
  assert.deepEqual(await erros('UsuarioCriarDto', { ...CARGAS_VALIDAS['UsuarioCriarDto'], login: ' ab ' }), ['login']);
});

test('senha com menos de 8 caracteres e nome completo com menos de 3 são recusados', async () => {
  assert.deepEqual(await erros('UsuarioCriarDto', { ...CARGAS_VALIDAS['UsuarioCriarDto'], senhaNaoEncriptada: '1234567' }), ['senhaNaoEncriptada']);
  assert.deepEqual(await erros('UsuarioCriarDto', { ...CARGAS_VALIDAS['UsuarioCriarDto'], nomeCompleto: 'Al' }), ['nomeCompleto']);
});

test('horas diárias do usuário ficam entre 1 e 24', async () => {
  for (const horas of [0, 25]) {
    assert.deepEqual(await erros('UsuarioCriarDto', { ...CARGAS_VALIDAS['UsuarioCriarDto'], horasDiariasNecessarias: horas }), ['horasDiariasNecessarias'], String(horas));
  }
  for (const horas of [1, 24]) {
    assert.deepEqual(await erros('UsuarioCriarDto', { ...CARGAS_VALIDAS['UsuarioCriarDto'], horasDiariasNecessarias: horas }), [], String(horas));
  }
});

test('código de projeto é normalizado para maiúsculas', () => {
  const instancia = plainToInstance(classes['ProjetoCriarDto'], { ...CARGAS_VALIDAS['ProjetoCriarDto'], codigo: ' pa-1 ' }) as { codigo: string };
  assert.equal(instancia.codigo, 'PA-1');
});
