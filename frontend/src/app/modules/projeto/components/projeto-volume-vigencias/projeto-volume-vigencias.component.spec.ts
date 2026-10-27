import { describe, it, expect } from 'vitest';
import { TipoUsuarioEnum } from '@project20/shared';
import { montarComponente } from '../../../../../testes/montar-componente';
import { esperarRequisicao, responderErro, responderSucesso } from '../../../../../testes/http-teste';
import { ProjetoVolumeVigenciasComponent } from './projeto-volume-vigencias.component';

const janeiro = { id: 1, projetoId: 12, vigenciaInicioData: '2026-01-01', volumeEsperadoHoras: 160 };
const abril = { id: 2, projetoId: 12, vigenciaInicioData: '2026-04-01', volumeEsperadoHoras: 120 };
async function montar() { return montarComponente(ProjetoVolumeVigenciasComponent, { usuario: TipoUsuarioEnum.GESTOR, entradas: { projetoId: 12 } }); }

describe('volume por vigência', () => {
  it('carrega, mostra vazio e registra zero; repetir mês substitui, excluir preserva anterior', async () => {
    const montado = await montar();
    expect(montado.elemento.textContent).toContain('Carregando');
    responderSucesso(esperarRequisicao(montado.http, 'GET', '/projeto/12/volume-vigencia'), []);
    await montado.atualizar();
    expect(montado.elemento.textContent).toContain('Nenhuma vigência');
    montado.componente.formulario.patchValue({ mes: new Date(2026, 3, 1), horas: 0 });
    montado.componente.salvar();
    const primeira = esperarRequisicao(montado.http, 'POST', '/projeto/12/volume-vigencia');
    expect(primeira.request.body.volumeEsperadoHoras).toBe(0);
    responderSucesso(primeira, { ...abril, volumeEsperadoHoras: 0 });
    await montado.atualizar();
    expect(montado.elemento.textContent).toContain('0h');
    montado.componente.formulario.patchValue({ horas: 120 });
    montado.componente.salvar();
    responderSucesso(esperarRequisicao(montado.http, 'POST', '/projeto/12/volume-vigencia'), abril);
    expect(montado.componente.vigencias()).toEqual([abril]);
    montado.componente.excluir(abril);
    responderSucesso(esperarRequisicao(montado.http, 'DELETE', '/projeto/12/volume-vigencia/2'), null);
    expect(montado.componente.vigencias()).toEqual([]);
  });

  it('sem volume manda null, lista o histórico e exclui só após sucesso', async () => {
    const montado = await montar();
    responderSucesso(esperarRequisicao(montado.http, 'GET', '/projeto/12/volume-vigencia'), [abril, janeiro]);
    await montado.atualizar();
    expect(montado.elemento.textContent).toContain('jan');
    montado.componente.formulario.patchValue({ semVolume: true });
    montado.componente.salvar();
    const requisicao = esperarRequisicao(montado.http, 'POST', '/projeto/12/volume-vigencia');
    expect(requisicao.request.body.volumeEsperadoHoras).toBeNull();
    responderErro(requisicao, 500, 'Falha de teste');
    await montado.atualizar();
    expect(montado.elemento.textContent).toContain('Não foi possível salvar');
    expect(montado.componente.vigencias()).toHaveLength(2);
    montado.componente.excluir(abril);
    responderErro(esperarRequisicao(montado.http, 'DELETE', '/projeto/12/volume-vigencia/2'), 500, 'Falha de teste');
    expect(montado.componente.vigencias()).toHaveLength(2);
  });

  it('erro de carga permite tentar novamente e resposta antiga não invade outro projeto', async () => {
    const montado = await montar();
    responderErro(esperarRequisicao(montado.http, 'GET', '/projeto/12/volume-vigencia'), 500, 'Falha de teste');
    await montado.atualizar();
    expect(montado.elemento.textContent).toContain('Não foi possível carregar');
    montado.componente.carregar();
    const antiga = esperarRequisicao(montado.http, 'GET', '/projeto/12/volume-vigencia');
    montado.fixture.componentRef.setInput('projetoId', 13);
    await montado.atualizar();
    responderSucesso(esperarRequisicao(montado.http, 'GET', '/projeto/13/volume-vigencia'), []);
    responderSucesso(antiga, [abril]);
    expect(montado.componente.vigencias()).toEqual([]);
  });
});
