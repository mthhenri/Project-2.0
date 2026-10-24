/**
 * Lógica pura do diagrama da modelagem (`GET /modelagem`): junta o que o catálogo do PostgreSQL informa sobre colunas e chaves
 * com os grupos e as posições que o gestor guardou, no contrato `ModelagemDiagramaDto` lido pela tela Modelagem. Não toca no banco.
 */
import type { ModelagemColunaDto, ModelagemDiagramaDto, ModelagemGrupoDto, ModelagemTabelaDto } from '@project20/shared';

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

/** Grupo e posição de uma tabela, como estão em `modelagem_tabela`. */
export interface ColocacaoDeTabela {
  nomeTabela: string;
  grupoId: number | null;
  x: number;
  y: number;
}

export interface ConfiguracaoModelagem {
  colunasOcultas: string[];
  /** "tabela.coluna" → tabela referenciada, para colunas sem FK que o nome não revela. */
  referenciasLogicas: Record<string, string>;
}

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

function larguraDaTabela(nome: string, colunas: ModelagemColunaDto[]): number {
  const larguraDoNome = 22 + nome.length * 8.6;
  const maiorColuna = Math.max(0, ...colunas.map((coluna) => coluna.nome.length));
  const maiorTipo = Math.max(0, ...colunas.map((coluna) => coluna.tipo.length));
  const larguraDasColunas = 30 + maiorColuna * 7.3 + 16 + maiorTipo * 6.5 + 8;
  return Math.max(200, Math.ceil(Math.max(larguraDoNome, larguraDasColunas) / 10) * 10);
}

export function alturaDaTabela(quantidadeColunas: number): number {
  return ALTURA_CABECALHO + ALTURA_LINHA * quantidadeColunas + 6;
}

/** A tabela do catálogo (colunas e largura), ainda sem grupo nem posição. */
export type TabelaDoCatalogo = Pick<ModelagemTabelaDto, 'nome' | 'largura' | 'colunas'>;

/** Colunas e chaves do banco no modelo (marcas PK/FK/lógica, larguras). Ignora as tabelas do Knex e oculta as colunas de BaseEntity. */
export function montarModelo(
  colunas: ColunaBanco[],
  chavesPrimarias: ChaveBanco[],
  chavesEstrangeiras: ChaveBanco[],
  configuracao: ConfiguracaoModelagem,
): TabelaDoCatalogo[] {
  const nomesTabelas = [...new Set(colunas.map((coluna) => coluna.tabela))]
    .filter((tabela) => !TABELAS_DO_KNEX.includes(tabela))
    .sort();
  const primarias = new Set(chavesPrimarias.map((chave) => `${chave.tabela}.${chave.coluna}`));
  const estrangeiras = new Map(chavesEstrangeiras.map((chave) => [`${chave.tabela}.${chave.coluna}`, chave.tabelaDestino as string]));

  return nomesTabelas.map((nome) => {
    const colunasDaTabela = colunas
      .filter((coluna) => coluna.tabela === nome && (coluna.coluna === 'id' || !configuracao.colunasOcultas.includes(coluna.coluna)))
      .map((coluna): ModelagemColunaDto => {
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
    return { nome, largura: larguraDaTabela(nome, colunasDaTabela), colunas: colunasDaTabela };
  });
}

/**
 * Grupo de cada tabela: o guardado (se o grupo ainda existe); sem linha guardada, a tabela `tipo_*` herda o grupo de quem a
 * referencia (a primeira por nome, entre as que têm grupo); o resto fica sem grupo (`null`).
 */
export function resolverGrupos(
  tabelas: TabelaDoCatalogo[],
  colocacoes: ColocacaoDeTabela[],
  chavesEstrangeiras: ChaveBanco[],
  gruposExistentes: ReadonlySet<number>,
): Map<string, number | null> {
  const guardadas = new Map(colocacoes.map((colocacao) => [colocacao.nomeTabela, colocacao]));
  const grupoDe = new Map<string, number | null>();
  for (const tabela of tabelas) {
    const guardada = guardadas.get(tabela.nome);
    if (guardada) grupoDe.set(tabela.nome, guardada.grupoId !== null && gruposExistentes.has(guardada.grupoId) ? guardada.grupoId : null);
  }
  for (const tabela of tabelas.filter((candidata) => !guardadas.has(candidata.nome))) {
    const referenciadora = tabela.nome.startsWith(PREFIXO_REFERENCIA)
      ? chavesEstrangeiras
          .filter((chave) => chave.tabelaDestino === tabela.nome && grupoDe.get(chave.tabela) !== undefined && grupoDe.get(chave.tabela) !== null)
          .map((chave) => chave.tabela)
          .sort()[0]
      : undefined;
    grupoDe.set(tabela.nome, referenciadora ? (grupoDe.get(referenciadora) as number) : null);
  }
  return grupoDe;
}

/** Aplica as posições guardadas; as tabelas sem posição ficam abaixo do grupo (ou de tudo, se o grupo ainda não tem tabela posicionada). */
export function posicionar(
  tabelas: TabelaDoCatalogo[],
  grupoDe: ReadonlyMap<string, number | null>,
  colocacoes: ColocacaoDeTabela[],
  ordemDosGrupos: number[],
): ModelagemTabelaDto[] {
  const guardadas = new Map(colocacoes.map((colocacao) => [colocacao.nomeTabela, colocacao]));
  const comGrupo = (tabela: TabelaDoCatalogo) => ({ ...tabela, grupoId: grupoDe.get(tabela.nome) ?? null });

  const resultado: ModelagemTabelaDto[] = tabelas
    .filter((tabela) => guardadas.has(tabela.nome))
    .map((tabela) => ({ ...comGrupo(tabela), x: (guardadas.get(tabela.nome) as ColocacaoDeTabela).x, y: (guardadas.get(tabela.nome) as ColocacaoDeTabela).y }));
  const novas = tabelas.filter((tabela) => !guardadas.has(tabela.nome)).map(comGrupo).sort((a, b) => a.nome.localeCompare(b.nome));

  const limiteInferior = () => (resultado.length ? Math.max(...resultado.map((tabela) => tabela.y + alturaDaTabela(tabela.colunas.length))) : MARGEM);
  const posicaoDoGrupo = (grupoId: number | null) => (grupoId === null ? Number.MAX_SAFE_INTEGER : ordemDosGrupos.indexOf(grupoId));
  const gruposComNovas = [...new Set(novas.map((tabela) => tabela.grupoId))].sort((a, b) => posicaoDoGrupo(a) - posicaoDoGrupo(b));
  for (const grupoId of gruposComNovas) {
    const doGrupo = resultado.filter((tabela) => tabela.grupoId === grupoId);
    const esquerda = doGrupo.length ? Math.min(...doGrupo.map((tabela) => tabela.x)) : MARGEM;
    const largura = doGrupo.length ? Math.max(700, Math.max(...doGrupo.map((tabela) => tabela.x + tabela.largura)) - esquerda) : LARGURA_MAXIMA_LINHA;
    let cursorX = esquerda;
    let cursorY = (doGrupo.length ? Math.max(...doGrupo.map((tabela) => tabela.y + alturaDaTabela(tabela.colunas.length))) : limiteInferior()) + AFASTAMENTO_ABAIXO;
    let alturaDaLinha = 0;
    for (const nova of novas.filter((tabela) => tabela.grupoId === grupoId)) {
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
  return resultado.sort((a, b) => a.nome.localeCompare(b.nome));
}

export function montarDiagrama(
  tabelas: ModelagemTabelaDto[],
  grupos: ModelagemGrupoDto[],
  configuracao: ConfiguracaoModelagem,
  origem: string,
): ModelagemDiagramaDto {
  const semGrupo = tabelas.filter((tabela) => tabela.grupoId === null).map((tabela) => tabela.nome);
  const avisos = semGrupo.length ? [`Tabelas sem grupo (escolha um no painel da tabela): ${semGrupo.join(', ')}.`] : [];
  return { origem, colunasOcultas: configuracao.colunasOcultas, avisos, grupos, tabelas };
}
