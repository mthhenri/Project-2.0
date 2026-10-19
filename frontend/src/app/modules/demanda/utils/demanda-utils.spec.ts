import { describe, it, expect } from 'vitest';
import { DemandaGrafoNoDto, TipoDemandaStatusEnum } from '@project20/shared';
import { construirArvoreDemandas } from './demanda-arvore.util';
import { dataDoAtalho, formatarDataIso, lerDataIso } from './demanda-datas.util';
import {
  FILTRO_VAZIO, alternarStatusVisivel, contarPorStatus, dividirDestaque, filtroAtivo, nosCorrespondentes, normalizarTexto, recortarArvore, statusVisiveis,
} from './demanda-filtro.util';
import { construirMenuDemanda, DemandaMenuAcoes } from './demanda-context-menu.factory';

function no(id: number, nome: string, demandaPaiId: number | null = null, extra: Partial<DemandaGrafoNoDto> = {}): DemandaGrafoNoDto {
  return {
    id, nome, demandaPaiId, status: TipoDemandaStatusEnum.PENDENTE, isEstrutural: false, horasEstimadas: 1, minutosExecutados: 0,
    temDescricaoTecnica: false, temDescricaoCliente: false, temDocumentacao: false, tags: [], ...extra,
  } as DemandaGrafoNoDto;
}

// Raiz → (A, B); A → (A1); Outra (raiz solta)
const NOS = [no(1, 'Raiz'), no(2, 'A', 1), no(3, 'B', 1), no(4, 'A1', 2), no(5, 'Outra')];

describe('construirArvoreDemandas', () => {
  it('monta as raízes com os filhos aninhados', () => {
    const raizes = construirArvoreDemandas(NOS);
    expect(raizes.map((raiz) => raiz.id)).toEqual([1, 5]);
    expect(raizes[0].filhos.map((filho) => filho.id)).toEqual([2, 3]);
    expect(raizes[0].filhos[0].filhos.map((filho) => filho.id)).toEqual([4]);
  });

  it('um nó cujo pai não está na lista vira raiz (pai excluído ou fora do recorte)', () => {
    expect(construirArvoreDemandas([no(2, 'Órfã', 99)]).map((raiz) => raiz.id)).toEqual([2]);
  });

  it('lista vazia dá árvore vazia e tags ausentes viram lista vazia', () => {
    expect(construirArvoreDemandas([])).toEqual([]);
    const [raiz] = construirArvoreDemandas([{ ...no(1, 'X'), tags: undefined } as unknown as DemandaGrafoNoDto]);
    expect(raiz.tags).toEqual([]);
  });
});

describe('demanda-datas', () => {
  it('atalhos: +7 dias, +14 dias e último dia do mês', () => {
    const hoje = new Date(2026, 0, 28);
    expect(formatarDataIso(dataDoAtalho('semana1', hoje))).toBe('2026-02-04');
    expect(formatarDataIso(dataDoAtalho('semana2', hoje))).toBe('2026-02-11');
    expect(formatarDataIso(dataDoAtalho('fimMes', hoje))).toBe('2026-01-31');
    expect(formatarDataIso(dataDoAtalho('fimMes', new Date(2028, 1, 10)))).toBe('2028-02-29');
  });

  it('formatarDataIso usa o dia local com zeros à esquerda', () => {
    expect(formatarDataIso(new Date(2026, 2, 5))).toBe('2026-03-05');
  });

  it('lerDataIso ignora a hora do texto e devolve o meio-dia local (sem escorregar de dia)', () => {
    const data = lerDataIso('2026-03-05T23:59:00.000Z');
    expect([data.getFullYear(), data.getMonth(), data.getDate(), data.getHours()]).toEqual([2026, 2, 5, 12]);
  });
});

describe('demanda-filtro', () => {
  it('filtro vazio não filtra; termo, status ou tag ativam', () => {
    expect(filtroAtivo(FILTRO_VAZIO)).toBe(false);
    expect(filtroAtivo({ ...FILTRO_VAZIO, termo: '  ' })).toBe(false);
    expect(filtroAtivo({ ...FILTRO_VAZIO, termo: 'a' })).toBe(true);
    expect(filtroAtivo({ ...FILTRO_VAZIO, status: [TipoDemandaStatusEnum.PLANEJADA] })).toBe(true);
    expect(filtroAtivo({ ...FILTRO_VAZIO, tagIds: [1] })).toBe(true);
  });

  it('a busca ignora acento e caixa', () => {
    expect(normalizarTexto('Integração')).toBe('integracao');
    const nos = [no(1, 'Integração'), no(2, 'Outra')];
    expect(nosCorrespondentes(nos, { ...FILTRO_VAZIO, termo: 'INTEGRACAO' }).map((item) => item.id)).toEqual([1]);
  });

  it('recortarArvore mantém os correspondentes e todos os seus ancestrais, e manda abrir os ancestrais', () => {
    const { nos, expandir } = recortarArvore(NOS, { ...FILTRO_VAZIO, termo: 'a1' });
    expect(nos.map((item) => item.id)).toEqual([1, 2, 4]);
    expect([...expandir].sort()).toEqual([1, 2]);
  });

  it('recortarArvore sem filtro devolve tudo e nada a expandir', () => {
    const resultado = recortarArvore(NOS, FILTRO_VAZIO);
    expect(resultado.nos).toBe(NOS);
    expect(resultado.expandir.size).toBe(0);
  });

  it('filtro por status e por tag combinam (e)', () => {
    const nos = [
      no(1, 'A', null, { status: TipoDemandaStatusEnum.PLANEJADA, tags: [{ id: 7, nome: 't', cor: '#000' }] }),
      no(2, 'B', null, { status: TipoDemandaStatusEnum.PLANEJADA }),
      no(3, 'C', null, { tags: [{ id: 7, nome: 't', cor: '#000' }] }),
    ];
    expect(nosCorrespondentes(nos, { termo: '', status: [TipoDemandaStatusEnum.PLANEJADA], tagIds: [7] }).map((item) => item.id)).toEqual([1]);
  });

  it('contarPorStatus aplica busca e tag, mas não o próprio filtro de status', () => {
    const nos = [no(1, 'Alfa'), no(2, 'Alfa dois', null, { status: TipoDemandaStatusEnum.CONCLUIDA }), no(3, 'Beta', null, { status: TipoDemandaStatusEnum.CONCLUIDA })];
    const contagem = contarPorStatus(nos, { termo: 'alfa', status: [TipoDemandaStatusEnum.PENDENTE], tagIds: [] });
    expect(contagem).toEqual({ PENDENTE: 1, PLANEJADA: 0, CONCLUIDA: 1, CANCELADA: 0 });
  });

  it('dividirDestaque quebra o nome em trechos, sem acento e sem diferença de caixa, preservando o texto original', () => {
    expect(dividirDestaque('Integração de API', 'integracao')).toEqual([
      { texto: 'Integração', destaque: true },
      { texto: ' de API', destaque: false },
    ]);
    expect(dividirDestaque('abc abc', 'b')).toEqual([
      { texto: 'a', destaque: false }, { texto: 'b', destaque: true }, { texto: 'c a', destaque: false }, { texto: 'b', destaque: true }, { texto: 'c', destaque: false },
    ]);
    expect(dividirDestaque('Nome', '')).toEqual([{ texto: 'Nome', destaque: false }]);
    expect(dividirDestaque('Nome', 'zzz')).toEqual([{ texto: 'Nome', destaque: false }]);
  });

  it('statusVisiveis: lista vazia significa todos os status', () => {
    expect(statusVisiveis(FILTRO_VAZIO)).toHaveLength(4);
    expect(statusVisiveis({ ...FILTRO_VAZIO, status: [TipoDemandaStatusEnum.PENDENTE] })).toEqual([TipoDemandaStatusEnum.PENDENTE]);
  });

  it('alternarStatusVisivel: com tudo visível um clique esconde aquele; voltar a todos limpa a lista; nunca esconde o último', () => {
    const escondeuPendente = alternarStatusVisivel(FILTRO_VAZIO, TipoDemandaStatusEnum.PENDENTE);
    expect(escondeuPendente).not.toContain(TipoDemandaStatusEnum.PENDENTE);
    expect(escondeuPendente).toHaveLength(3);

    const voltou = alternarStatusVisivel({ ...FILTRO_VAZIO, status: escondeuPendente }, TipoDemandaStatusEnum.PENDENTE);
    expect(voltou).toEqual([]);

    const unico = { ...FILTRO_VAZIO, status: [TipoDemandaStatusEnum.CANCELADA] };
    expect(alternarStatusVisivel(unico, TipoDemandaStatusEnum.CANCELADA)).toEqual([TipoDemandaStatusEnum.CANCELADA]);
  });
});

describe('construirMenuDemanda', () => {
  const alvo = (sobrescrita = {}) => ({ id: 9, isEstrutural: false, temDescricaoTecnica: false, temDescricaoCliente: false, temDocumentacao: false, ...sobrescrita });
  const rotulos = (itens: ReturnType<typeof construirMenuDemanda>) => itens.filter((item) => !item.separator).map((item) => item.label);
  const acoesRegistradas = () => {
    const chamadas: Array<[string, ...unknown[]]> = [];
    const acoes: DemandaMenuAcoes = {
      aoVisualizar: (id) => chamadas.push(['visualizar', id]), aoEditar: (id) => chamadas.push(['editar', id]),
      aoNovaFilha: (id) => chamadas.push(['filha', id]), aoTags: (id) => chamadas.push(['tags', id]), aoMembros: (id) => chamadas.push(['membros', id]),
      aoDescricao: (id, campo) => chamadas.push(['descricao', id, campo]),
    };
    return { acoes, chamadas };
  };

  it('desenvolvedor vê só Visualizar e as três descrições', () => {
    expect(rotulos(construirMenuDemanda(alvo(), acoesRegistradas().acoes, false))).toEqual(['Visualizar', 'Desc. Técnica', 'Desc. Cliente', 'Documentação']);
  });

  it('gestor vê também Editar, Tags e Membros', () => {
    expect(rotulos(construirMenuDemanda(alvo(), acoesRegistradas().acoes, true))).toEqual(['Visualizar', 'Editar', 'Tags', 'Membros', 'Desc. Técnica', 'Desc. Cliente', 'Documentação']);
  });

  it('"Nova Sub-demanda" só aparece em demanda estrutural, para gestor e desenvolvedor', () => {
    expect(rotulos(construirMenuDemanda(alvo({ isEstrutural: true }), acoesRegistradas().acoes, false))).toContain('Nova Sub-demanda');
    expect(rotulos(construirMenuDemanda(alvo({ isEstrutural: true }), acoesRegistradas().acoes, true))).toContain('Nova Sub-demanda');
    expect(rotulos(construirMenuDemanda(alvo(), acoesRegistradas().acoes, true))).not.toContain('Nova Sub-demanda');
  });

  it('cada item dispara a ação certa com o id da demanda', () => {
    const { acoes, chamadas } = acoesRegistradas();
    const itens = construirMenuDemanda(alvo({ isEstrutural: true }), acoes, true);
    for (const item of itens) item.command?.({ originalEvent: new Event('click'), item });
    expect(chamadas).toEqual([
      ['visualizar', 9], ['editar', 9], ['filha', 9], ['tags', 9], ['membros', 9],
      ['descricao', 9, 'descricaoTecnica'], ['descricao', 9, 'descricaoCliente'], ['descricao', 9, 'documentacao'],
    ]);
  });

  it('o ícone da descrição ganha destaque só quando ela está preenchida', () => {
    const vazio = construirMenuDemanda(alvo(), acoesRegistradas().acoes, false).find((item) => item.label === 'Desc. Técnica')!;
    const cheio = construirMenuDemanda(alvo({ temDescricaoTecnica: true }), acoesRegistradas().acoes, false).find((item) => item.label === 'Desc. Técnica')!;
    expect(vazio.iconStyle).toEqual({});
    expect(cheio.iconStyle).toMatchObject({ fontWeight: '700' });
  });

  it('os itens são dados (propriedade), nunca getter: o PrimeNG relê o modelo a cada ciclo e um getter recriaria o menu', () => {
    const itens = construirMenuDemanda(alvo({ isEstrutural: true }), acoesRegistradas().acoes, true);
    expect(Array.isArray(itens)).toBe(true);
    for (const item of itens) {
      for (const chave of Object.keys(item)) {
        const descritor = Object.getOwnPropertyDescriptor(item, chave)!;
        expect(descritor.get, `${item.label ?? 'separador'}.${chave}`).toBeUndefined();
      }
    }
    expect(construirMenuDemanda(alvo(), acoesRegistradas().acoes, true)).not.toBe(itens);
  });
});
