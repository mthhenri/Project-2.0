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
  grupoId: number;
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
const AFASTAMENTO_DO_CANTO = 120;
const LARGURA_DO_CANTO = 2200;
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
 * Grupo de cada tabela: o guardado em `modelagem_tabela`, se o grupo ainda existe. Tabela sem linha guardada (nova no banco ou tirada da
 * modelagem) não tem grupo (`null`): fica no canto do diagrama, "Fora da modelagem". O banco só traz o visual; quem organiza é o gestor.
 */
export function resolverGrupos(
  tabelas: TabelaDoCatalogo[],
  colocacoes: ColocacaoDeTabela[],
  gruposExistentes: ReadonlySet<number>,
): Map<string, number | null> {
  const guardadas = new Map(colocacoes.map((colocacao) => [colocacao.nomeTabela, colocacao]));
  return new Map(
    tabelas.map((tabela) => {
      const guardada = guardadas.get(tabela.nome);
      return [tabela.nome, guardada && gruposExistentes.has(guardada.grupoId) ? guardada.grupoId : null];
    }),
  );
}

/**
 * Posição de cada tabela: as da modelagem usam a gravada; as de fora dela (sem grupo) ficam arrumadas em grade no canto de baixo, à
 * esquerda, embaixo de todo o desenho (longe dos botões flutuantes), e não guardam posição nenhuma (a posição é só de quem está na modelagem).
 */
export function posicionar(
  tabelas: TabelaDoCatalogo[],
  grupoDe: ReadonlyMap<string, number | null>,
  colocacoes: ColocacaoDeTabela[],
): ModelagemTabelaDto[] {
  const guardadas = new Map(colocacoes.map((colocacao) => [colocacao.nomeTabela, colocacao]));
  const naModelagem = tabelas.filter((tabela) => (grupoDe.get(tabela.nome) ?? null) !== null && guardadas.has(tabela.nome));
  const foraDela = tabelas.filter((tabela) => !naModelagem.includes(tabela)).sort((a, b) => a.nome.localeCompare(b.nome));

  const resultado: ModelagemTabelaDto[] = naModelagem.map((tabela) => {
    const guardada = guardadas.get(tabela.nome) as ColocacaoDeTabela;
    return { ...tabela, grupoId: grupoDe.get(tabela.nome) as number, x: guardada.x, y: guardada.y };
  });

  const esquerda = resultado.length ? Math.min(...resultado.map((tabela) => tabela.x)) : MARGEM;
  const topo = resultado.length ? Math.max(...resultado.map((tabela) => tabela.y + alturaDaTabela(tabela.colunas.length))) + AFASTAMENTO_DO_CANTO : MARGEM;
  let cursorX = esquerda;
  let cursorY = topo;
  let alturaDaLinha = 0;
  for (const tabela of foraDela) {
    if (cursorX > esquerda && cursorX + tabela.largura > esquerda + LARGURA_DO_CANTO) {
      cursorX = esquerda;
      cursorY += alturaDaLinha + AFASTAMENTO_ABAIXO;
      alturaDaLinha = 0;
    }
    resultado.push({ ...tabela, grupoId: null, x: cursorX, y: cursorY });
    cursorX += tabela.largura + AFASTAMENTO_ABAIXO;
    alturaDaLinha = Math.max(alturaDaLinha, alturaDaTabela(tabela.colunas.length));
  }
  return resultado.sort((a, b) => a.nome.localeCompare(b.nome));
}

/**
 * Onde uma tabela que acaba de entrar na modelagem cai: embaixo das que já estão no grupo (alinhada à esquerda delas) ou, se o grupo
 * ainda não tem tabela, embaixo de todo o desenho.
 */
export function posicionarTabelaNova(grupoId: number, tabela: Pick<ModelagemTabelaDto, 'nome'>, naModelagem: ModelagemTabelaDto[]): { x: number; y: number } {
  const doGrupo = naModelagem.filter((candidata) => candidata.grupoId === grupoId && candidata.nome !== tabela.nome);
  const referencias = doGrupo.length ? doGrupo : naModelagem.filter((candidata) => candidata.nome !== tabela.nome);
  const base = referencias.length ? Math.max(...referencias.map((candidata) => candidata.y + alturaDaTabela(candidata.colunas.length))) : MARGEM - AFASTAMENTO_ABAIXO;
  return { x: doGrupo.length ? Math.min(...doGrupo.map((candidata) => candidata.x)) : MARGEM, y: base + AFASTAMENTO_ABAIXO };
}

export function montarDiagrama(
  tabelas: ModelagemTabelaDto[],
  grupos: ModelagemGrupoDto[],
  configuracao: ConfiguracaoModelagem,
  origem: string,
): ModelagemDiagramaDto {
  const foraDaModelagem = tabelas.filter((tabela) => tabela.grupoId === null).map((tabela) => tabela.nome);
  const avisos = foraDaModelagem.length
    ? [`Tabelas do banco fora da modelagem (no canto de baixo do desenho; escolha um grupo para trazê-las): ${foraDaModelagem.join(', ')}.`]
    : [];
  return { origem, colunasOcultas: configuracao.colunasOcultas, avisos, grupos, tabelas };
}
