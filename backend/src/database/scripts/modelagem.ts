/**
 * Lógica pura do diagrama da modelagem (`npm run modelagem`): transforma o que o PostgreSQL informa sobre
 * colunas e chaves em um modelo posicionado, no contrato `ModelagemDiagrama` lido pela tela Modelagem do
 * frontend. Não toca no banco nem no disco.
 */
import type { ModelagemColuna, ModelagemDiagrama, ModelagemGrupo, ModelagemTabela } from '@project20/shared';

export interface ColunaBanco {
  tabela: string;
  coluna: string;
  tipo: string;
  tipoInterno: string;
  anulavel: boolean;
  padrao: string | null;
}

export interface ChaveBanco {
  tabela: string;
  coluna: string;
  tabelaDestino?: string;
  colunaDestino?: string;
}

export type GrupoConfiguracao = Omit<ModelagemGrupo, 'id'>;

export interface ConfiguracaoModelagem {
  /** Ordem do objeto = ordem dos filtros e da paleta de cores. */
  grupos: Record<string, GrupoConfiguracao>;
  tabelaGrupo: Record<string, string>;
  colunasOcultas: string[];
  /** "tabela.coluna" → tabela referenciada, para colunas sem FK que o nome não revela. */
  referenciasLogicas: Record<string, string>;
  posicoes: Record<string, [number, number]>;
}

export const GRUPO_SEM_CONFIGURACAO = 'outros';
const PREFIXO_REFERENCIA = 'tipo_';
const TABELAS_DO_KNEX = ['knex_migrations', 'knex_migrations_lock'];
const TIPOS_INTEIROS = ['integer', 'bigint', 'smallint'];
const ALTURA_CABECALHO = 28;
const ALTURA_LINHA = 18;
const AFASTAMENTO_ABAIXO = 50;
const LARGURA_MAXIMA_LINHA = 2200;
const MARGEM = 40;

const TIPOS_CURTOS: Record<string, string> = {
  'character varying': 'varchar',
  character: 'char',
  integer: 'int',
  boolean: 'bool',
  'timestamp with time zone': 'timestamptz',
  'timestamp without time zone': 'timestamp',
  'double precision': 'float',
};

const ELEMENTOS_DE_LISTA: Record<string, string> = { _int4: 'int', _int8: 'bigint', _text: 'text', _varchar: 'varchar', _bool: 'bool', _uuid: 'uuid' };

/** Tipo como aparece no diagrama: `serial` para coluna com sequência, `?` no fim quando aceita nulo. */
export function abreviarTipo(coluna: ColunaBanco): string {
  let tipo: string;
  if (coluna.padrao?.startsWith('nextval(')) tipo = 'serial';
  else if (coluna.tipo === 'ARRAY') tipo = `${ELEMENTOS_DE_LISTA[coluna.tipoInterno] ?? coluna.tipoInterno.replace(/^_/, '')}[]`;
  else tipo = TIPOS_CURTOS[coluna.tipo] ?? coluna.tipo;
  return coluna.anulavel ? `${tipo}?` : tipo;
}

/** Sugere a tabela de uma coluna inteira sem FK: `usuario_id` → `usuario`, `autor_usuario_id` → `usuario`. */
export function inferirReferenciaLogica(nomeColuna: string, nomesTabelas: string[]): string | null {
  if (!nomeColuna.endsWith('_id')) return null;
  const radical = nomeColuna.slice(0, -3);
  const candidatas = nomesTabelas.filter((tabela) => radical === tabela || radical.endsWith(`_${tabela}`));
  if (!candidatas.length) return null;
  return candidatas.sort((a, b) => b.length - a.length)[0];
}

function larguraDaTabela(nome: string, colunas: ModelagemColuna[]): number {
  const larguraDoNome = 22 + nome.length * 8.6;
  const maiorColuna = Math.max(0, ...colunas.map((coluna) => coluna.nome.length));
  const maiorTipo = Math.max(0, ...colunas.map((coluna) => coluna.tipo.length));
  const larguraDasColunas = 30 + maiorColuna * 7.3 + 16 + maiorTipo * 6.5 + 8;
  return Math.max(200, Math.ceil(Math.max(larguraDoNome, larguraDasColunas) / 10) * 10);
}

export function alturaDaTabela(quantidadeColunas: number): number {
  return ALTURA_CABECALHO + ALTURA_LINHA * quantidadeColunas + 6;
}

export interface ModeloSemPosicao {
  tabelas: Omit<ModelagemTabela, 'x' | 'y'>[];
  avisos: string[];
}

/** Junta colunas e chaves do banco no modelo (grupos, marcas PK/FK/lógica, larguras), ainda sem posição. */
export function montarModelo(
  colunas: ColunaBanco[],
  chavesPrimarias: ChaveBanco[],
  chavesEstrangeiras: ChaveBanco[],
  configuracao: ConfiguracaoModelagem,
): ModeloSemPosicao {
  const avisos: string[] = [];
  const nomesTabelas = [...new Set(colunas.map((coluna) => coluna.tabela))]
    .filter((tabela) => !TABELAS_DO_KNEX.includes(tabela))
    .sort();
  const primarias = new Set(chavesPrimarias.map((chave) => `${chave.tabela}.${chave.coluna}`));
  const estrangeiras = new Map(chavesEstrangeiras.map((chave) => [`${chave.tabela}.${chave.coluna}`, chave.tabelaDestino as string]));

  const grupoDe = new Map<string, string>();
  for (const tabela of nomesTabelas) {
    if (configuracao.tabelaGrupo[tabela]) grupoDe.set(tabela, configuracao.tabelaGrupo[tabela]);
  }
  for (const tabela of nomesTabelas.filter((nome) => nome.startsWith(PREFIXO_REFERENCIA) && !grupoDe.has(nome))) {
    const referenciadora = chavesEstrangeiras
      .filter((chave) => chave.tabelaDestino === tabela && grupoDe.has(chave.tabela))
      .map((chave) => chave.tabela)
      .sort()[0];
    if (referenciadora) grupoDe.set(tabela, grupoDe.get(referenciadora) as string);
  }
  const semGrupo = nomesTabelas.filter((tabela) => !grupoDe.has(tabela));
  if (semGrupo.length) {
    avisos.push(`Sem grupo em tabelaGrupo (foram para "${GRUPO_SEM_CONFIGURACAO}"): ${semGrupo.join(', ')}.`);
    for (const tabela of semGrupo) grupoDe.set(tabela, GRUPO_SEM_CONFIGURACAO);
  }

  const tabelas = nomesTabelas.map((nome) => {
    const colunasDaTabela = colunas
      .filter((coluna) => coluna.tabela === nome && (coluna.coluna === 'id' || !configuracao.colunasOcultas.includes(coluna.coluna)))
      .map((coluna): ModelagemColuna => {
        const chave = `${nome}.${coluna.coluna}`;
        const tipo = abreviarTipo(coluna);
        if (primarias.has(chave)) return { nome: coluna.coluna, tipo, marca: 'pk', tabelaReferenciada: null };
        if (estrangeiras.has(chave)) return { nome: coluna.coluna, tipo, marca: 'fk', tabelaReferenciada: estrangeiras.get(chave) as string };
        const explicita = configuracao.referenciasLogicas[chave];
        const inferida = TIPOS_INTEIROS.includes(coluna.tipo) ? inferirReferenciaLogica(coluna.coluna, nomesTabelas) : null;
        const destino = explicita ?? inferida;
        if (destino && nomesTabelas.includes(destino) && destino !== nome) return { nome: coluna.coluna, tipo, marca: 'lg', tabelaReferenciada: destino };
        return { nome: coluna.coluna, tipo, marca: '', tabelaReferenciada: null };
      });
    return { nome, grupo: grupoDe.get(nome) as string, largura: larguraDaTabela(nome, colunasDaTabela), colunas: colunasDaTabela };
  });
  return { tabelas, avisos };
}

/** Aplica as posições da configuração; as tabelas novas ficam abaixo do grupo (ou de tudo, se o grupo é novo). */
export function posicionar(
  modelo: ModeloSemPosicao,
  posicoes: Record<string, [number, number]>,
  ordemDosGrupos: string[],
): { tabelas: ModelagemTabela[]; avisos: string[] } {
  const avisos: string[] = [];
  const nomes = new Set(modelo.tabelas.map((tabela) => tabela.nome));
  const obsoletas = Object.keys(posicoes).filter((nome) => !nomes.has(nome));
  if (obsoletas.length) avisos.push(`Posições de tabelas que não existem mais (apague de posicoes): ${obsoletas.join(', ')}.`);

  const posicionadas: ModelagemTabela[] = modelo.tabelas
    .filter((tabela) => posicoes[tabela.nome])
    .map((tabela) => ({ ...tabela, x: posicoes[tabela.nome][0], y: posicoes[tabela.nome][1] }));
  const novas = modelo.tabelas.filter((tabela) => !posicoes[tabela.nome]).sort((a, b) => a.nome.localeCompare(b.nome));
  if (novas.length) avisos.push(`Sem posição em posicoes (usei posição automática; arraste e use "Copiar posições"): ${novas.map((tabela) => tabela.nome).join(', ')}.`);

  const resultado = [...posicionadas];
  const limiteInferior = () => (resultado.length ? Math.max(...resultado.map((tabela) => tabela.y + alturaDaTabela(tabela.colunas.length))) : MARGEM);
  const gruposComNovas = [...new Set(novas.map((tabela) => tabela.grupo))].sort((a, b) => ordemDosGrupos.indexOf(a) - ordemDosGrupos.indexOf(b));
  for (const grupo of gruposComNovas) {
    const doGrupo = resultado.filter((tabela) => tabela.grupo === grupo);
    const esquerda = doGrupo.length ? Math.min(...doGrupo.map((tabela) => tabela.x)) : MARGEM;
    const largura = doGrupo.length ? Math.max(700, Math.max(...doGrupo.map((tabela) => tabela.x + tabela.largura)) - esquerda) : LARGURA_MAXIMA_LINHA;
    let cursorX = esquerda;
    let cursorY = (doGrupo.length ? Math.max(...doGrupo.map((tabela) => tabela.y + alturaDaTabela(tabela.colunas.length))) : limiteInferior()) + AFASTAMENTO_ABAIXO;
    let alturaDaLinha = 0;
    for (const nova of novas.filter((tabela) => tabela.grupo === grupo)) {
      if (cursorX > esquerda && cursorX + nova.largura > esquerda + largura) {
        cursorX = esquerda;
        cursorY += alturaDaLinha + AFASTAMENTO_ABAIXO;
        alturaDaLinha = 0;
      }
      resultado.push({ ...nova, x: cursorX, y: cursorY });
      cursorX += nova.largura + AFASTAMENTO_ABAIXO;
      alturaDaLinha = Math.max(alturaDaLinha, alturaDaTabela(nova.colunas.length));
    }
  }
  return { tabelas: resultado.sort((a, b) => a.nome.localeCompare(b.nome)), avisos };
}

export function montarDiagrama(
  tabelas: ModelagemTabela[],
  configuracao: ConfiguracaoModelagem,
  origem: string,
  avisos: string[],
): ModelagemDiagrama {
  const grupos: ModelagemGrupo[] = Object.entries(configuracao.grupos)
    .filter(([id]) => tabelas.some((tabela) => tabela.grupo === id))
    .map(([id, grupo]) => ({ id, ...grupo }));
  if (tabelas.some((tabela) => tabela.grupo === GRUPO_SEM_CONFIGURACAO) && !grupos.some((grupo) => grupo.id === GRUPO_SEM_CONFIGURACAO)) {
    grupos.push({ id: GRUPO_SEM_CONFIGURACAO, titulo: 'Sem grupo na configuração', rotulo: 'Sem grupo' });
  }
  return { origem, colunasOcultas: configuracao.colunasOcultas, avisos, grupos, tabelas };
}

const CABECALHO_DO_ARQUIVO_GERADO = [
  '// GERADO por `npm run modelagem` (backend/src/database/scripts/gerar-modelagem.ts) a partir do banco migrado.',
  '// Não edite à mão: grupos e posições ficam em backend/src/database/scripts/modelagem.config.json.',
].join('\n');

/** Fonte TypeScript do diagrama, estável (sem data) para o `git diff` mostrar só mudança real de modelagem. */
export function serializarDiagrama(diagrama: ModelagemDiagrama): string {
  return `${CABECALHO_DO_ARQUIVO_GERADO}\nimport type { ModelagemDiagrama } from '@project20/shared';\n\nexport const DIAGRAMA_MODELAGEM: ModelagemDiagrama = ${JSON.stringify(diagrama, null, 2)};\n`;
}
