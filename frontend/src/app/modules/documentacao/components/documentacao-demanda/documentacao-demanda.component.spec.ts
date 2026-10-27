import { describe, expect, it } from 'vitest';
import { PlanoAbaEnum, TipoDemandaStatusEnum, TipoUsuarioEnum } from '@project20/shared';
import { esperarRequisicao, responderErro, responderSucesso } from '../../../../../testes/http-teste';
import { montarComponente, ComponenteMontado } from '../../../../../testes/montar-componente';
import { DocumentacaoDemandaComponent } from './documentacao-demanda.component';

// Os três textos da demanda na tela de Documentações (task 259): leitura e edição por perfil, gravar com a versão lida e o aviso de versão mais nova.

type Montado = ComponenteMontado<DocumentacaoDemandaComponent>;

function demanda(sobrescrita: Record<string, unknown> = {}) {
  return {
    id: 9, projetoId: 3, demandaPaiId: null, nome: 'Cadastro de usuário', descricaoTecnica: 'Texto técnico', descricaoCliente: 'Texto do cliente', documentacao: null,
    versao: 4, horasEstimadas: 8, status: TipoDemandaStatusEnum.PLANEJADA, isEstrutural: false, previsaoFimData: null, createdDate: '2026-01-15T12:00:00.000Z',
    podeEditar: true, ...sobrescrita,
  };
}

async function montar(usuario: TipoUsuarioEnum, dados: Record<string, unknown> = demanda()): Promise<Montado> {
  const montado = await montarComponente(DocumentacaoDemandaComponent, { usuario, entradas: { demandaId: 9 } });
  responderSucesso(esperarRequisicao(montado.http, 'GET', '/demanda/9'), dados);
  await montado.atualizar();
  return montado;
}

const texto = (montado: Montado) => montado.elemento.textContent ?? '';
const botao = (montado: Montado, rotulo: string) =>
  Array.from(montado.elemento.querySelectorAll<HTMLButtonElement>('button')).find((item) => item.textContent?.includes(rotulo));

describe('DocumentacaoDemandaComponent', () => {
  it('mostra o título, o status e as três abas; o gestor edita todas, a do cliente inclusive', async () => {
    const montado = await montar(TipoUsuarioEnum.GESTOR);
    expect(montado.elemento.querySelector('h2')?.textContent).toContain('Cadastro de usuário');
    expect(Array.from(montado.elemento.querySelectorAll('[role="tab"]')).map((aba) => aba.textContent?.trim())).toEqual(['Técnica', 'Cliente', 'Documentação']);
    expect(montado.componente.editaAba()(PlanoAbaEnum.DESCRICAO_CLIENTE)).toBe(true);
    expect(montado.componente.controleTecnica.value).toBe('Texto técnico');
    expect(texto(montado)).toContain('Tudo gravado');
  });

  it('o desenvolvedor membro edita Técnica e Documentação; a Cliente é leitura com cadeado e aviso', async () => {
    const montado = await montar(TipoUsuarioEnum.DESENVOLVEDOR);
    const edita = montado.componente.editaAba();
    expect(edita(PlanoAbaEnum.DESCRICAO_TECNICA)).toBe(true);
    expect(edita(PlanoAbaEnum.DOCUMENTACAO)).toBe(true);
    expect(edita(PlanoAbaEnum.DESCRICAO_CLIENTE)).toBe(false);
    expect(montado.elemento.querySelector('[role="tab"] .pi-lock')).not.toBeNull();

    montado.componente.escolherAba(PlanoAbaEnum.DESCRICAO_CLIENTE);
    await montado.atualizar();
    expect(texto(montado)).toContain('O pedido do cliente: você lê, só gestores alteram');
    expect(texto(montado)).toContain('Texto do cliente');
    expect(montado.elemento.querySelector('app-markdown-editor')).toBeNull();
  });

  it('o desenvolvedor de fora da demanda lê as três abas, sem editor, sem Gravar e com o aviso', async () => {
    const montado = await montar(TipoUsuarioEnum.DESENVOLVEDOR, demanda({ podeEditar: false }));
    expect(texto(montado)).toContain('Você não é membro desta demanda');
    expect(montado.elemento.querySelector('app-markdown-editor')).toBeNull();
    expect(botao(montado, 'Gravar')).toBeUndefined();
    expect(texto(montado)).toContain('Texto técnico');
  });

  it('grava só o que mudou, com a versão lida, e passa a valer a versão nova', async () => {
    const montado = await montar(TipoUsuarioEnum.GESTOR);
    montado.componente.controleDocumentacao.setValue('Documentação nova');
    await montado.atualizar();
    expect(montado.componente.sujo()).toBe(true);
    expect(texto(montado)).toContain('Alterações sem gravar');

    botao(montado, 'Gravar')!.click();
    const requisicao = esperarRequisicao(montado.http, 'PATCH', '/demanda/9/textos');
    expect(requisicao.request.body).toEqual({ versao: 4, documentacao: 'Documentação nova' });
    responderSucesso(requisicao, { id: 9, descricaoTecnica: 'Texto técnico', descricaoCliente: 'Texto do cliente', documentacao: 'Documentação nova', versao: 5 });
    await montado.atualizar();

    expect(montado.componente.sujo()).toBe(false);
    expect(montado.componente.demanda()?.versao).toBe(5);
    expect(texto(montado)).toContain('Tudo gravado');
  });

  it('versão mais nova (409) avisa com Recarregar e não apaga o texto digitado; Recarregar traz a versão dela', async () => {
    const montado = await montar(TipoUsuarioEnum.GESTOR);
    montado.componente.controleTecnica.setValue('O que eu escrevi');
    await montado.atualizar();

    botao(montado, 'Gravar')!.click();
    responderErro(esperarRequisicao(montado.http, 'PATCH', '/demanda/9/textos'), 409, 'Alguém gravou uma versão mais nova');
    await montado.atualizar();

    expect(texto(montado)).toContain('Outra pessoa gravou este texto depois que você abriu a demanda');
    expect(montado.componente.controleTecnica.value).toBe('O que eu escrevi');
    expect(montado.componente.sujo()).toBe(true);

    botao(montado, 'Recarregar')!.click();
    responderSucesso(esperarRequisicao(montado.http, 'GET', '/demanda/9'), demanda({ descricaoTecnica: 'Versão dela', versao: 6 }));
    await montado.atualizar();
    expect(montado.componente.controleTecnica.value).toBe('Versão dela');
    expect(montado.componente.sujo()).toBe(false);
    expect(texto(montado)).not.toContain('Outra pessoa gravou este texto');
  });

  it('Descartar volta o campo ao último texto gravado', async () => {
    const montado = await montar(TipoUsuarioEnum.GESTOR);
    montado.componente.controleTecnica.setValue('Rascunho');
    await montado.atualizar();
    botao(montado, 'Descartar')!.click();
    await montado.atualizar();
    expect(montado.componente.controleTecnica.value).toBe('Texto técnico');
    expect(montado.componente.sujo()).toBe(false);
  });

  it('avisa a tela quando há texto sem gravar e quando deixa de haver', async () => {
    const montado = await montar(TipoUsuarioEnum.GESTOR);
    const avisos: boolean[] = [];
    montado.componente.sujoMudou.subscribe((sujo) => avisos.push(sujo));
    montado.componente.controleDocumentacao.setValue('x');
    await montado.atualizar();
    montado.componente.descartar();
    await montado.atualizar();
    expect(avisos).toEqual([true, false]);
  });

  it('erro ao abrir: avisa e oferece tentar de novo', async () => {
    const montado = await montarComponente(DocumentacaoDemandaComponent, { usuario: TipoUsuarioEnum.GESTOR, entradas: { demandaId: 9 } });
    responderErro(esperarRequisicao(montado.http, 'GET', '/demanda/9'), 404, 'Demanda não encontrada');
    await montado.atualizar();
    expect(montado.elemento.querySelector('[role="alert"]')?.textContent).toContain('Não foi possível abrir a demanda');
    expect(botao(montado, 'Tentar de novo')).toBeDefined();
  });
});
