/**
 * Lógica pura do diagrama da modelagem (`npm run modelagem`): transforma o que o PostgreSQL informa sobre
 * colunas e chaves em um modelo posicionado e o injeta no molde HTML. Não toca no banco nem no disco.
 */

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

export interface GrupoConfiguracao {
  titulo: string;
  rotulo: string;
}

export interface ConfiguracaoModelagem {
  /** Ordem do objeto = ordem dos filtros e da paleta de cores. */
  grupos: Record<string, GrupoConfiguracao>;
  tabelaGrupo: Record<string, string>;
  colunasOcultas: string[];
  /** "tabela.coluna" → tabela referenciada, para colunas sem FK que o nome não revela. */
  referenciasLogicas: Record<string, string>;
  posicoes: Record<string, [number, number]>;
}

export type MarcaColuna = 'pk' | 'fk' | 'lg' | '';
/** [nome, tipo, marca, tabela referenciada] */
export type ColunaModelo = [string, string, MarcaColuna, string | null];

export interface TabelaModelo {
  n: string;
  x: number;
  y: number;
  w: number;
  g: string;
  cols: ColunaModelo[];
}

export interface DadosDiagrama {
  origem: string;
  grupos: Record<string, GrupoConfiguracao & { cor: string }>;
  colunasOcultas: string[];
  avisos: string[];
  tabelas: TabelaModelo[];
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

function larguraDaTabela(nome: string, colunas: ColunaModelo[]): number {
  const larguraDoNome = 22 + nome.length * 8.6;
  const maiorColuna = Math.max(0, ...colunas.map(([coluna]) => coluna.length));
  const maiorTipo = Math.max(0, ...colunas.map(([, tipo]) => tipo.length));
  const larguraDasColunas = 30 + maiorColuna * 7.3 + 16 + maiorTipo * 6.5 + 8;
  return Math.max(200, Math.ceil(Math.max(larguraDoNome, larguraDasColunas) / 10) * 10);
}

export function alturaDaTabela(quantidadeColunas: number): number {
  return ALTURA_CABECALHO + ALTURA_LINHA * quantidadeColunas + 6;
}

export interface ModeloSemPosicao {
  tabelas: Omit<TabelaModelo, 'x' | 'y'>[];
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
      .map((coluna): ColunaModelo => {
        const chave = `${nome}.${coluna.coluna}`;
        const tipo = abreviarTipo(coluna);
        if (primarias.has(chave)) return [coluna.coluna, tipo, 'pk', null];
        if (estrangeiras.has(chave)) return [coluna.coluna, tipo, 'fk', estrangeiras.get(chave) as string];
        const explicita = configuracao.referenciasLogicas[chave];
        const inferida = TIPOS_INTEIROS.includes(coluna.tipo) ? inferirReferenciaLogica(coluna.coluna, nomesTabelas) : null;
        const destino = explicita ?? inferida;
        if (destino && nomesTabelas.includes(destino) && destino !== nome) return [coluna.coluna, tipo, 'lg', destino];
        return [coluna.coluna, tipo, '', null];
      });
    return { n: nome, g: grupoDe.get(nome) as string, w: larguraDaTabela(nome, colunasDaTabela), cols: colunasDaTabela };
  });
  return { tabelas, avisos };
}

/** Aplica as posições da configuração; as tabelas novas ficam abaixo do grupo (ou de tudo, se o grupo é novo). */
export function posicionar(
  modelo: ModeloSemPosicao,
  posicoes: Record<string, [number, number]>,
  ordemDosGrupos: string[],
): { tabelas: TabelaModelo[]; avisos: string[] } {
  const avisos: string[] = [];
  const nomes = new Set(modelo.tabelas.map((tabela) => tabela.n));
  const obsoletas = Object.keys(posicoes).filter((nome) => !nomes.has(nome));
  if (obsoletas.length) avisos.push(`Posições de tabelas que não existem mais (apague de posicoes): ${obsoletas.join(', ')}.`);

  const posicionadas: TabelaModelo[] = modelo.tabelas
    .filter((tabela) => posicoes[tabela.n])
    .map((tabela) => ({ ...tabela, x: posicoes[tabela.n][0], y: posicoes[tabela.n][1] }));
  const novas = modelo.tabelas.filter((tabela) => !posicoes[tabela.n]).sort((a, b) => a.n.localeCompare(b.n));
  if (novas.length) avisos.push(`Sem posição em posicoes (usei posição automática; arraste e use "Copiar posições"): ${novas.map((tabela) => tabela.n).join(', ')}.`);

  const resultado = [...posicionadas];
  const limiteInferior = () => (resultado.length ? Math.max(...resultado.map((tabela) => tabela.y + alturaDaTabela(tabela.cols.length))) : MARGEM);
  const gruposComNovas = [...new Set(novas.map((tabela) => tabela.g))].sort((a, b) => ordemDosGrupos.indexOf(a) - ordemDosGrupos.indexOf(b));
  for (const grupo of gruposComNovas) {
    const doGrupo = resultado.filter((tabela) => tabela.g === grupo);
    const esquerda = doGrupo.length ? Math.min(...doGrupo.map((tabela) => tabela.x)) : MARGEM;
    const largura = doGrupo.length ? Math.max(700, Math.max(...doGrupo.map((tabela) => tabela.x + tabela.w)) - esquerda) : LARGURA_MAXIMA_LINHA;
    let cursorX = esquerda;
    let cursorY = (doGrupo.length ? Math.max(...doGrupo.map((tabela) => tabela.y + alturaDaTabela(tabela.cols.length))) : limiteInferior()) + AFASTAMENTO_ABAIXO;
    let alturaDaLinha = 0;
    for (const nova of novas.filter((tabela) => tabela.g === grupo)) {
      if (cursorX > esquerda && cursorX + nova.w > esquerda + largura) {
        cursorX = esquerda;
        cursorY += alturaDaLinha + AFASTAMENTO_ABAIXO;
        alturaDaLinha = 0;
      }
      resultado.push({ ...nova, x: cursorX, y: cursorY });
      cursorX += nova.w + AFASTAMENTO_ABAIXO;
      alturaDaLinha = Math.max(alturaDaLinha, alturaDaTabela(nova.cols.length));
    }
  }
  return { tabelas: resultado.sort((a, b) => a.n.localeCompare(b.n)), avisos };
}

export function montarDados(
  tabelas: TabelaModelo[],
  configuracao: ConfiguracaoModelagem,
  origem: string,
  avisos: string[],
): DadosDiagrama {
  const grupos: DadosDiagrama['grupos'] = {};
  Object.entries(configuracao.grupos).forEach(([id, grupo], indice) => {
    if (tabelas.some((tabela) => tabela.g === id)) grupos[id] = { ...grupo, cor: `--g${indice % 8}` };
  });
  if (tabelas.some((tabela) => tabela.g === GRUPO_SEM_CONFIGURACAO) && !grupos[GRUPO_SEM_CONFIGURACAO]) {
    grupos[GRUPO_SEM_CONFIGURACAO] = { titulo: 'Sem grupo na configuração', rotulo: 'Sem grupo', cor: '--goutros' };
  }
  return { origem, grupos, colunasOcultas: configuracao.colunasOcultas, avisos, tabelas };
}

/** Injeta os dados no molde. `<` vira `<` para que nenhum texto do banco feche o `<script>`. */
export function renderizarHtml(molde: string, dados: DadosDiagrama): string {
  const json = JSON.stringify(dados).replace(/</g, '\\u003c');
  if (!molde.includes('__DADOS__')) throw new Error('O molde do diagrama não tem o marcador __DADOS__.');
  return molde.replace('__DADOS__', () => json);
}
