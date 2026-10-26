import { describe, it, expect } from 'vitest';
import { DemandaGrafoNoDto, TipoDemandaStatusEnum } from '@project20/shared';
import {
  ancestraisDe,
  calcularBarraHoras,
  corDaBarraHoras,
  executoresUnicos,
  haQuantoTempo,
  iniciaisDoNome,
  linhasVisiveisDeHoras,
  montarArvoreDeHoras,
  percentualDeHoras,
  resumirHoras,
} from './demanda-horas.util';

function no(id: number, sobrescritas: Partial<DemandaGrafoNoDto> = {}): DemandaGrafoNoDto {
  return {
    id, nome: `D${id}`, status: TipoDemandaStatusEnum.PLANEJADA, isEstrutural: false, horasEstimadas: 0, minutosExecutados: 0,
    demandaPaiId: null, temDescricaoTecnica: false, temDescricaoCliente: false, temDocumentacao: false, tags: [], ...sobrescritas,
  };
}

describe('corDaBarraHoras', () => {
  it('azul até 75% e sem estimativa', () => {
    expect(corDaBarraHoras(null)).toBe('rgb(59, 130, 246)');
    expect(corDaBarraHoras(0)).toBe('rgb(59, 130, 246)');
    expect(corDaBarraHoras(75)).toBe('rgb(59, 130, 246)');
  });

  it('chega ao amarelo em 85, ao laranja em 95 e ao vermelho em 100', () => {
    expect(corDaBarraHoras(85)).toBe('rgb(234, 179, 8)');
    expect(corDaBarraHoras(95)).toBe('rgb(249, 115, 22)');
    expect(corDaBarraHoras(100)).toBe('rgb(239, 68, 68)');
  });

  it('entre os cortes interpola', () => {
    expect(corDaBarraHoras(80)).toBe('rgb(147, 155, 127)');
  });

  it('acima de 100 escurece e satura em 150', () => {
    expect(corDaBarraHoras(125)).not.toBe(corDaBarraHoras(100));
    expect(corDaBarraHoras(150)).toBe('rgb(185, 28, 28)');
    expect(corDaBarraHoras(400)).toBe('rgb(185, 28, 28)');
  });
});

describe('calcularBarraHoras', () => {
  it('sem estimativa não tem percentual, nem alerta, nem sobra', () => {
    const barra = calcularBarraHoras(120, 0);
    expect(barra.percentual).toBeNull();
    expect(barra.larguraPreenchimento).toBe(0);
    expect(barra.estourou).toBe(false);
    expect(barra.minutosRestantes).toBeNull();
  });

  it('dentro do estimado mostra o que resta; os 100% exatos ainda não estouraram', () => {
    const barra = calcularBarraHoras(60, 3);
    expect(barra.percentual).toBe(33);
    expect(barra.minutosRestantes).toBe(120);
    expect(barra.estourou).toBe(false);
    expect(calcularBarraHoras(180, 3).estourou).toBe(false);
    expect(calcularBarraHoras(180, 3).minutosRestantes).toBe(0);
  });

  it('passou: mostra quanto passou, com o risco dos 100% a dois terços da barra', () => {
    const barra = calcularBarraHoras(360, 3);
    expect(barra.percentual).toBe(200);
    expect(barra.estourou).toBe(true);
    expect(barra.minutosAcima).toBe(180);
    expect(barra.minutosRestantes).toBeNull();
    expect(barra.larguraPreenchimento).toBe(100);
    expect(barra.posicaoDoRisco).toBeCloseTo(66.67, 1);
  });

  it('o preenchimento acompanha o percentual até os 150%', () => {
    expect(calcularBarraHoras(90, 3).larguraPreenchimento).toBeCloseTo(33.33, 1);
    expect(calcularBarraHoras(180, 3).larguraPreenchimento).toBeCloseTo(66.67, 1);
    expect(calcularBarraHoras(270, 3).larguraPreenchimento).toBe(100);
  });

  it('percentualDeHoras arredonda e devolve null sem estimativa', () => {
    expect(percentualDeHoras(100, 3)).toBe(56);
    expect(percentualDeHoras(100, 0)).toBeNull();
  });
});

describe('montarArvoreDeHoras', () => {
  const nos = [
    no(1, { isEstrutural: true, horasEstimadas: 2, minutosExecutados: 30 }),
    no(2, { demandaPaiId: 1, horasEstimadas: 4, minutosExecutados: 120 }),
    no(3, { isEstrutural: true, demandaPaiId: 1 }),
    no(4, { demandaPaiId: 3, horasEstimadas: 6, minutosExecutados: 60, status: TipoDemandaStatusEnum.CONCLUIDA }),
    no(5, { demandaPaiId: 3, horasEstimadas: 9, minutosExecutados: 600, status: TipoDemandaStatusEnum.CANCELADA }),
    no(6, { horasEstimadas: 1, minutosExecutados: 10 }),
  ];

  it('a pasta soma as próprias horas e as de tudo que está dentro; a cancelada fica fora', () => {
    const pasta = montarArvoreDeHoras(nos).find((raiz) => raiz.no.id === 1)!;
    expect(pasta.horasTotais).toBe(2 + 4 + 6);
    expect(pasta.minutosTotais).toBe(30 + 120 + 60);
    expect(pasta.filhos.map((filho) => filho.no.id)).toEqual([3, 2]);
    expect(pasta.filhos[0].filhos.map((filho) => filho.no.id)).toEqual([4]);
  });

  it('pasta vem antes da demanda solta na raiz; os níveis crescem', () => {
    const raizes = montarArvoreDeHoras(nos);
    expect(raizes.map((raiz) => raiz.no.id)).toEqual([1, 6]);
    expect(raizes[0].filhos[0].nivel).toBe(1);
  });

  it('demanda cujo pai não está na lista vira raiz', () => {
    expect(montarArvoreDeHoras([no(10, { demandaPaiId: 99 })]).map((raiz) => raiz.no.id)).toEqual([10]);
  });

  it('pasta recolhida esconde o que tem dentro', () => {
    const raizes = montarArvoreDeHoras(nos);
    expect(linhasVisiveisDeHoras(raizes, new Set()).map((linha) => linha.no.id)).toEqual([1, 3, 4, 2, 6]);
    expect(linhasVisiveisDeHoras(raizes, new Set([3])).map((linha) => linha.no.id)).toEqual([1, 3, 2, 6]);
    expect(linhasVisiveisDeHoras(raizes, new Set([1])).map((linha) => linha.no.id)).toEqual([1, 6]);
  });

  it('ancestraisDe lista do pai para cima', () => {
    const raizes = montarArvoreDeHoras(nos);
    expect(ancestraisDe(raizes, 4)).toEqual([3, 1]);
    expect(ancestraisDe(raizes, 1)).toEqual([]);
    expect(ancestraisDe(raizes, 999)).toEqual([]);
  });

  it('o resumo soma cada demanda uma vez e conta o que passou do próprio estimado', () => {
    const resumo = resumirHoras(montarArvoreDeHoras(nos));
    expect(resumo.horasEstimadas).toBe(2 + 4 + 6 + 1);
    expect(resumo.minutosExecutados).toBe(30 + 120 + 60 + 10);
    expect(resumo.demandasEstouradas).toBe(0);
    const estourado = resumirHoras(montarArvoreDeHoras([no(1, { horasEstimadas: 1, minutosExecutados: 90 }), no(2, { minutosExecutados: 50 })]));
    expect(estourado.minutosAcima).toBe(30);
    expect(estourado.demandasEstouradas).toBe(1);
  });
});

describe('quem executa agora', () => {
  const agora = new Date('2026-10-25T12:00:00Z');

  it('haQuantoTempo usa min, h e dias', () => {
    expect(haQuantoTempo('2026-10-25T11:59:40Z', agora)).toBe('agora há pouco');
    expect(haQuantoTempo('2026-10-25T11:48:00Z', agora)).toBe('há 12 min');
    expect(haQuantoTempo('2026-10-25T09:00:00Z', agora)).toBe('há 3h');
    expect(haQuantoTempo('2026-10-24T10:00:00Z', agora)).toBe('há 1 dia');
    expect(haQuantoTempo('2026-10-20T10:00:00Z', agora)).toBe('há 5 dias');
    expect(haQuantoTempo('xx', agora)).toBe('');
  });

  it('iniciais: primeiro e último nome', () => {
    expect(iniciaisDoNome('Maria da Silva')).toBe('MS');
    expect(iniciaisDoNome('maria')).toBe('M');
    expect(iniciaisDoNome('  ')).toBe('?');
  });

  it('executoresUnicos junta a mesma pessoa e guarda o início mais antigo', () => {
    const unicos = executoresUnicos([
      { usuarioId: 1, nomeCompleto: 'Ana', inicioData: new Date('2026-10-25T10:00:00Z') },
      { usuarioId: 2, nomeCompleto: 'Bia', inicioData: new Date('2026-10-25T09:00:00Z') },
      { usuarioId: 1, nomeCompleto: 'Ana', inicioData: new Date('2026-10-25T08:00:00Z') },
    ]);
    expect(unicos.map((pessoa) => pessoa.usuarioId)).toEqual([1, 2]);
    expect(new Date(unicos[0].inicioData).toISOString()).toBe('2026-10-25T08:00:00.000Z');
  });
});
