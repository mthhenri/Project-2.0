import { describe, it, expect, vi, afterEach } from 'vitest';
import { TestBed } from '@angular/core/testing';
import { PontoDiaResumoDto, PontoMensalDto, TipoUsuarioEnum } from '@project20/shared';
import { montarComponente } from '../../../../../testes/montar-componente';
import { esperarRequisicao, responderErro, responderSucesso } from '../../../../../testes/http-teste';
import { criarUsuarioTeste } from '../../../../../testes/usuarios-teste';
import { PontoImpressaoComponent } from './ponto-impressao.component';

afterEach(() => vi.restoreAllMocks());

const texto = (elemento: Element) => (elemento.textContent ?? '').replace(/\s+/g, ' ').trim();

const dia = (data: string, sobrescrita: Partial<PontoDiaResumoDto> = {}): PontoDiaResumoDto => ({
  data, ehDiaUtil: true, motivoNaoUtil: null, primeiroInicioData: null, ultimoFimData: null, totalMinutosTrabalhados: 0,
  saldoMinutos: -480, metaMinutos: 480, intervalos: [], justificativaNome: null, justificativaMinutosCobertos: null, ...sobrescrita,
}) as PontoDiaResumoDto;

const mensal: PontoMensalDto = {
  usuarioId: 3, nomeUsuario: 'Ana Souza', ano: 2026, mes: 3, diasUteisMes: 21, metaMinutosMes: 10080,
  totalMinutosTrabalhadosMes: 540, saldoMinutosMes: -9540,
  dias: [
    dia('2026-03-02', {
      primeiroInicioData: new Date(2026, 2, 2, 9, 0), ultimoFimData: new Date(2026, 2, 2, 18, 0), totalMinutosTrabalhados: 480,
      saldoMinutos: 0, intervalos: [{ inicioData: new Date(2026, 2, 2, 12, 0), fimData: new Date(2026, 2, 2, 13, 0), duracaoMinutos: 60 }],
    }),
    dia('2026-03-03', { justificativaNome: 'Consulta', justificativaMinutosCobertos: 270, metaMinutos: 210, saldoMinutos: -210 }),
    dia('2026-03-07', { ehDiaUtil: false, motivoNaoUtil: 'Fim de semana', metaMinutos: 0, saldoMinutos: 0 }),
  ],
};

const montar = (entradas: Record<string, unknown>) =>
  montarComponente(PontoImpressaoComponent, { usuario: TipoUsuarioEnum.GESTOR, entradas });

describe('PontoImpressaoComponent', () => {
  it('sem espelho carregado não renderiza a folha', async () => {
    const montado = await montar({ mensal: null });
    expect(montado.elemento.querySelector('.ponto-impressao')).toBeNull();
  });

  it('o cabeçalho traz o usuário, o mês por extenso e os totais do mês', async () => {
    const montado = await montar({ mensal, nomeGestor: 'Gil Gestor' });
    const folha = texto(montado.elemento);
    expect(folha).toContain('Espelho de Ponto');
    expect(folha).toContain('Ana Souza');
    expect(folha).toContain('Março de 2026');
    expect(folha).toContain('168h');
    expect(folha).toContain('9h');
    expect(folha).toContain('-159h 0min');
  });

  it('uma linha por dia, com entrada, saída, intervalos, trabalhado e saldo', async () => {
    const montado = await montar({ mensal });
    const linhas = Array.from(montado.elemento.querySelectorAll('tbody tr'));
    expect(linhas).toHaveLength(3);
    const primeira = texto(linhas[0]);
    expect(primeira).toContain('2 Seg');
    expect(primeira).toContain('09:00');
    expect(primeira).toContain('18:00');
    expect(primeira).toContain('12:00–13:00');
    expect(primeira).toContain('+0h 0min');
    expect(texto(linhas[1])).toContain('—');
  });

  it('observação: justificativa com as horas cobertas, e o motivo do dia não útil (que também recebe a marca de não útil)', async () => {
    const montado = await montar({ mensal });
    const linhas = Array.from(montado.elemento.querySelectorAll('tbody tr'));
    expect(texto(linhas[1])).toContain('Consulta (4.5h)');
    expect(texto(linhas[2])).toContain('Fim de semana');
    expect(linhas[2].classList.contains('ponto-impressao__linha--nao-util')).toBe(true);
    expect(linhas[0].classList.contains('ponto-impressao__linha--nao-util')).toBe(false);
  });

  it('horasCobertas escreve horas cheias sem casa decimal e, quebradas, com uma', async () => {
    const montado = await montar({ mensal });
    expect(montado.componente.horasCobertas(240)).toBe('4h');
    expect(montado.componente.horasCobertas(90)).toBe('1.5h');
    expect(montado.componente.horasCobertas(null)).toBe('');
  });

  it('as assinaturas levam o gestor responsável quando há um e o colaborador sempre', async () => {
    const comGestor = await montar({ mensal, nomeGestor: 'Gil Gestor' });
    expect(texto(comGestor.elemento)).toContain('Gestor responsável: Gil Gestor');
    expect(texto(comGestor.elemento)).toContain('Colaborador: Ana Souza');

    TestBed.resetTestingModule();
    const semGestor = await montarComponente(PontoImpressaoComponent, { entradas: { mensal } });
    expect(texto(semGestor.elemento)).toContain('Gestor responsável:');
    expect(texto(semGestor.elemento)).not.toContain('Gestor responsável: ');
  });

  it('imprimir busca cargo e jornada do usuário, mostra no cabeçalho e então abre a impressão do navegador', async () => {
    const imprimir = vi.spyOn(window, 'print').mockImplementation(() => undefined);
    const montado = await montar({ mensal });
    montado.componente.imprimir();
    responderSucesso(esperarRequisicao(montado.http, 'GET', '/usuario/3'), { ...criarUsuarioTeste(), cargoTitulo: 'Analista', horasDiariasNecessarias: 6 });
    await montado.atualizar();
    expect(texto(montado.elemento)).toContain('Analista');
    expect(texto(montado.elemento)).toContain('Jornada diária: 6h');
    await new Promise((resolver) => setTimeout(resolver, 5));
    expect(imprimir).toHaveBeenCalledTimes(1);
  });

  it('se a leitura do usuário falha, imprime mesmo assim, sem cargo e jornada', async () => {
    const imprimir = vi.spyOn(window, 'print').mockImplementation(() => undefined);
    const montado = await montar({ mensal });
    montado.componente.imprimir();
    responderErro(esperarRequisicao(montado.http, 'GET', '/usuario/3'), 500, 'Erro interno');
    await montado.atualizar();
    await new Promise((resolver) => setTimeout(resolver, 5));
    expect(imprimir).toHaveBeenCalledTimes(1);
    expect(texto(montado.elemento)).not.toContain('Jornada diária');
  });

  it('sem espelho, imprimir não faz nada', async () => {
    const imprimir = vi.spyOn(window, 'print').mockImplementation(() => undefined);
    const montado = await montar({ mensal: null });
    montado.componente.imprimir();
    montado.http.expectNone(() => true);
    expect(imprimir).not.toHaveBeenCalled();
  });
});
