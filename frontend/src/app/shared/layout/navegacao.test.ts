import { test } from 'vitest';
import * as assert from 'node:assert/strict';
import { ITENS_NAVEGACAO, ItemNavegacao, agruparItensNavegacao } from './navegacao';

const porRota = (rota: string) => ITENS_NAVEGACAO.find((item) => item.rotaLink === rota);

test('as teclas de atalho (g + letra) são únicas e de uma letra', () => {
  const teclas = ITENS_NAVEGACAO.map((item) => item.tecla);
  assert.equal(new Set(teclas).size, teclas.length);
  for (const tecla of teclas) assert.match(tecla, /^[a-z]$/);
});

test('as rotas e os rótulos são únicos e as rotas começam com /', () => {
  const rotas = ITENS_NAVEGACAO.map((item) => item.rotaLink);
  assert.equal(new Set(rotas).size, rotas.length);
  assert.equal(new Set(ITENS_NAVEGACAO.map((item) => item.label)).size, rotas.length);
  for (const rota of rotas) assert.ok(rota.startsWith('/'), rota);
});

const doDesenvolvedor = ITENS_NAVEGACAO.filter((item) => !item.somenteGestor);
const doGestor = ITENS_NAVEGACAO.filter((item) => !item.somenteAdministrador);
const resumo = (itens: readonly ItemNavegacao[]) => {
  const { grupos, fundo } = agruparItensNavegacao(itens);
  return { grupos: grupos.map((grupo) => [grupo.titulo, grupo.itens.map((item) => item.label)]), fundo: fundo.map((item) => item.label) };
};

test('o desenvolvedor vê Chat, Atividades, Execuções, Ponto, Demandas e Modelagem', () => {
  assert.deepEqual(doDesenvolvedor.map((item) => item.rotaLink), ['/chat', '/atividade', '/execucao', '/ponto', '/documentacao', '/demanda', '/modelagem']);
});

test('o gestor vê tudo menos o que é só do administrador', () => {
  assert.deepEqual(doGestor.map((item) => item.rotaLink), [
    '/chat', '/atividade', '/execucao', '/ponto', '/documentacao', '/projeto', '/demanda', '/calendario', '/tag', '/usuario', '/supervisao-chat', '/modelagem',
  ]);
});

test('o administrador vê todos os itens e só a IA é exclusiva dele', () => {
  const exclusivos = ITENS_NAVEGACAO.filter((item) => item.somenteAdministrador).map((item) => item.rotaLink);
  assert.deepEqual(exclusivos, ['/configuracao-ia']);
});

test('item exclusivo do administrador também é de gestor (nunca aparece para o desenvolvedor)', () => {
  for (const item of ITENS_NAVEGACAO.filter((candidato) => candidato.somenteAdministrador)) {
    assert.equal(item.somenteGestor, true, item.label);
  }
});

test('Atividades segue aberta com a IA no ar e o Chat exige a IA', () => {
  assert.equal(porRota('/atividade')?.substituidoPelaIa, undefined);
  assert.equal(porRota('/chat')?.exigeIa, true);
});

test('Modelagem fica sem grupo, por último, e qualquer usuário a vê', () => {
  const modelagem = porRota('/modelagem');
  assert.equal(modelagem?.grupo, undefined);
  assert.equal(ITENS_NAVEGACAO.at(-1)?.rotaLink, '/modelagem');
  assert.equal(modelagem?.somenteGestor, false);
  assert.equal(modelagem?.somenteAdministrador, undefined);
});

test('só a Modelagem fica fora dos grupos', () => {
  assert.deepEqual(ITENS_NAVEGACAO.filter((item) => item.grupo === undefined).map((item) => item.rotaLink), ['/modelagem']);
});

test('desenvolvedor: Dia a dia e Projetos (só Demandas); Gestão e IA somem por ficarem vazios', () => {
  assert.deepEqual(resumo(doDesenvolvedor), {
    grupos: [['Dia a dia', ['Chat', 'Atividades', 'Execuções', 'Ponto', 'Documentações']], ['Projetos', ['Demandas']]],
    fundo: ['Modelagem'],
  });
});

test('gestor: os grupos de gestão aparecem e a IA traz só a Supervisão do chat (IA Config. é do administrador)', () => {
  assert.deepEqual(resumo(doGestor), {
    grupos: [
      ['Dia a dia', ['Chat', 'Atividades', 'Execuções', 'Ponto', 'Documentações']],
      ['Projetos', ['Projetos', 'Demandas']],
      ['Gestão', ['Calendário', 'Tags', 'Usuários']],
      ['IA', ['Supervisão do chat']],
    ],
    fundo: ['Modelagem'],
  });
});

test('administrador: os quatro grupos, com Supervisão do chat e IA Config. no grupo IA', () => {
  const { grupos, fundo } = agruparItensNavegacao(ITENS_NAVEGACAO);
  assert.deepEqual(grupos.map((grupo) => grupo.titulo), ['Dia a dia', 'Projetos', 'Gestão', 'IA']);
  assert.deepEqual(grupos.at(-1)?.itens.map((item) => item.label), ['Supervisão do chat', 'IA Config.']);
  assert.deepEqual(fundo.map((item) => item.label), ['Modelagem']);
});

test('dentro do grupo vale a ordem recebida, e a lista vazia não gera grupo nem fundo', () => {
  const invertida = [...ITENS_NAVEGACAO].reverse();
  assert.deepEqual(agruparItensNavegacao(invertida).grupos[0].itens.map((item) => item.label), ['Documentações', 'Ponto', 'Execuções', 'Atividades', 'Chat']);
  assert.deepEqual(agruparItensNavegacao([]), { grupos: [], fundo: [] });
});
