import { describe, it, expect } from 'vitest';
import { TipoUsuarioEnum } from '@project20/shared';
import { montarComponente } from '../../../../../testes/montar-componente';
import { esperarRequisicao, responderErro, responderSucesso } from '../../../../../testes/http-teste';
import { CustosAbaComponent } from './custos-aba.component';

// Aba "Custos" (task 201): carrega o recorte do mês, mostra totais e modelos, e salva o preço de um modelo.

const consulta = {
  ano: 2026,
  mes: 10,
  totais: { mensagens: 3, tokensEntrada: 1500, tokensSaida: 500, tokensCache: 0, custoDolar: 0.5, modelosSemPreco: 1 },
  modelos: [
    { modelo: 'claude-haiku-5-5', mensagens: 3, tokensEntrada: 1500, tokensSaida: 500, tokensCache: 0, preco: { modelo: 'claude-haiku-5-5', precoEntradaMilhao: 1, precoSaidaMilhao: 5, precoCacheMilhao: 0.1 }, custoDolar: 0.5, emUso: true },
    { modelo: 'claude-sonnet-5-5', mensagens: 0, tokensEntrada: 0, tokensSaida: 0, tokensCache: 0, preco: null, custoDolar: null, emUso: true },
  ],
  periodos: Array.from({ length: 31 }, (_, indice) => ({ periodo: `2026-10-${String(indice + 1).padStart(2, '0')}`, mensagens: indice === 4 ? 3 : 0, tokens: indice === 4 ? 2000 : 0, custoDolar: indice === 4 ? 0.5 : 0, modelos: indice === 4 ? [{ modelo: 'claude-sonnet-5-5', mensagens: 3, tokens: 2000, custoDolar: 0.5 }] : [] })),
};

async function montar() {
  const montado = await montarComponente(CustosAbaComponent, { usuario: TipoUsuarioEnum.ADMINISTRADOR });
  return montado;
}

describe('CustosAbaComponent', () => {
  it('mostra o esqueleto na primeira carga e consulta o mês atual', async () => {
    const montado = await montar();
    expect(montado.elemento.querySelector('.custos-aba__esqueleto')).not.toBeNull();
    const requisicao = esperarRequisicao(montado.http, 'GET', '/ia-custo');
    expect(requisicao.request.params.get('mes')).not.toBeNull();
    expect(requisicao.request.params.get('ano')).not.toBeNull();
  });

  it('com a resposta, mostra o custo, o aviso de modelo sem preço e uma linha por modelo', async () => {
    const montado = await montar();
    responderSucesso(esperarRequisicao(montado.http, 'GET', '/ia-custo'), consulta);
    await montado.atualizar();
    const texto = montado.elemento.textContent ?? '';
    expect(texto).toContain('Custo estimado');
    expect(texto).toContain('1 modelo sem preço');
    expect(montado.elemento.querySelectorAll('tbody tr').length).toBe(2);
    expect(texto).toContain('claude-sonnet-5-5');
    expect(montado.elemento.querySelector('[aria-label="Definir o preço de claude-sonnet-5-5"]')).not.toBeNull();
  });

  it('o recorte anual consulta sem o mês', async () => {
    const montado = await montar();
    responderSucesso(esperarRequisicao(montado.http, 'GET', '/ia-custo'), consulta);
    await montado.atualizar();
    montado.componente.recorteControl.setValue('ANUAL');
    const requisicao = esperarRequisicao(montado.http, 'GET', '/ia-custo');
    expect(requisicao.request.params.has('mes')).toBe(false);
  });

  it('erro na consulta mostra a mensagem com "Tentar de novo"', async () => {
    const montado = await montar();
    responderErro(esperarRequisicao(montado.http, 'GET', '/ia-custo'), 500, 'Falha');
    await montado.atualizar();
    expect(montado.elemento.textContent).toContain('Não foi possível carregar os custos da IA.');
  });

  it('salvar o preço de um modelo faz PUT e recarrega a consulta', async () => {
    const montado = await montar();
    responderSucesso(esperarRequisicao(montado.http, 'GET', '/ia-custo'), consulta);
    await montado.atualizar();
    montado.componente.precos.at(1).setValue({ entrada: 3, saida: 15, cache: 0.3 });
    montado.componente.salvar(1, consulta.modelos[1]);
    const salvar = esperarRequisicao(montado.http, 'PUT', '/ia-custo/preco');
    expect(salvar.request.body).toEqual({ modelo: 'claude-sonnet-5-5', precoEntradaMilhao: 3, precoSaidaMilhao: 15, precoCacheMilhao: 0.3 });
    responderSucesso(salvar, { modelo: 'claude-sonnet-5-5', precoEntradaMilhao: 3, precoSaidaMilhao: 15, precoCacheMilhao: 0.3 });
    esperarRequisicao(montado.http, 'GET', '/ia-custo');
  });
});
