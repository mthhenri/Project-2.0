import { describe, expect, it, vi } from 'vitest';
import { TestBed } from '@angular/core/testing';
import { Router } from '@angular/router';
import { TIPOS_ANOTACAO_ORDENADOS, TipoAnotacaoEnum, TipoAtividadeStatusEnum, TipoDemandaStatusEnum, TipoUsuarioEnum } from '@project20/shared';
import { esperarRequisicao, responderErro, responderSucesso } from '../../../../../testes/http-teste';
import { montarComponente } from '../../../../../testes/montar-componente';
import { criarUsuarioTeste } from '../../../../../testes/usuarios-teste';
import { PadService } from '../../../usuario/services/pad.service';
import { DemandaLeituraComponent } from './demanda-leitura.component';

// Demanda aberta no chat (task 245): só leitura, com Checklist, Anotações (o pad, aberta ao abrir a demanda), Técnica, Cliente (todos leem, só gestor e administrador alteram) e Documentação.

const DEMANDA = {
  id: 9, nome: 'Cadastro de usuário', projetoId: 3, status: TipoDemandaStatusEnum.PENDENTE, horasEstimadas: 8,
  descricaoTecnica: 'Texto técnico', descricaoCliente: 'Texto do cliente', documentacao: null, podeEditar: true,
};

function atividade(id: number, status: TipoAtividadeStatusEnum, sobrescrita: Record<string, unknown> = {}) {
  return { id, nome: `Bloco ${id}`, status, totalMinutosExecutados: 30, totalExecucoes: 2, execucaoAtivaId: null, nomeProjeto: 'Portal', ...sobrescrita };
}

function secoesDoPad(textos: Partial<Record<TipoAnotacaoEnum, string>> = {}) {
  return TIPOS_ANOTACAO_ORDENADOS.map((tipo, indice) => ({
    id: indice + 1, usuarioId: criarUsuarioTeste().id, tipo, texto: textos[tipo] ?? '', updatedDate: '2026-01-15T12:00:00.000Z',
  }));
}

async function montar(usuario: TipoUsuarioEnum, atividades: unknown[] = [], textosDoPad: Partial<Record<TipoAnotacaoEnum, string>> = {}, abaInicial?: 'checklist') {
  const montado = await montarComponente(DemandaLeituraComponent, { usuario, entradas: abaInicial ? { demandaId: 9, abaInicial } : { demandaId: 9 } });
  // O pad da própria pessoa carrega junto com a demanda; a requisição pendente seguraria o `whenStable`.
  responderSucesso(esperarRequisicao(montado.http, 'GET', '/anotacao'), secoesDoPad(textosDoPad));
  responderSucesso(esperarRequisicao(montado.http, 'GET', '/demanda/9'), DEMANDA);
  await montado.atualizar();
  responderSucesso(esperarRequisicao(montado.http, 'GET', '/atividade'), { itens: atividades, totalItens: atividades.length, paginaAtual: 1, itensPorPagina: 100, totalPaginas: 1 });
  await montado.atualizar();
  return montado;
}

const abas = (elemento: HTMLElement) => Array.from(elemento.querySelectorAll('p-tab')).map((aba) => aba.textContent?.trim());

describe('DemandaLeituraComponent', () => {
  it('abre no Checklist ao escolher a aba: desenvolvidas riscadas primeiro, a que roda destacada e as em aberto depois', async () => {
    const montado = await montar(TipoUsuarioEnum.DESENVOLVEDOR, [
      atividade(1, TipoAtividadeStatusEnum.PLANEJADA),
      atividade(2, TipoAtividadeStatusEnum.DESENVOLVENDO, { execucaoAtivaId: 80 }),
      atividade(3, TipoAtividadeStatusEnum.DESENVOLVIDA),
    ]);
    montado.componente.aba.set('checklist');
    await montado.atualizar();
    expect(montado.elemento.querySelector('h2')?.textContent).toContain('Cadastro de usuário');
    const nomes = Array.from(montado.elemento.querySelectorAll('.demanda-leitura__atividade-nome')).map((no) => no.textContent?.trim());
    expect(nomes).toEqual(['Bloco 3', 'Bloco 2', 'Bloco 1']);
    expect(montado.elemento.querySelectorAll('.demanda-leitura__atividade--desenvolvida').length).toBe(1);
    expect(montado.elemento.querySelectorAll('.demanda-leitura__atividade--rodando').length).toBe(1);
    expect(montado.elemento.textContent).toContain('1 de 3 desenvolvidas');
  });

  it('na demanda em que a pessoa executa, abre direto no Checklist', async () => {
    const montado = await montar(TipoUsuarioEnum.DESENVOLVEDOR, [atividade(2, TipoAtividadeStatusEnum.DESENVOLVENDO, { execucaoAtivaId: 80 })], {}, 'checklist');
    expect(montado.componente.abaAtiva()).toBe('checklist');
  });

  it('nas demais demandas, abre nas Anotações', async () => {
    const montado = await montar(TipoUsuarioEnum.DESENVOLVEDOR);
    expect(montado.componente.abaAtiva()).toBe('anotacoes');
  });

  it('sem atividades, diz que o checklist está vazio', async () => {
    const montado = await montar(TipoUsuarioEnum.DESENVOLVEDOR);
    montado.componente.aba.set('checklist');
    await montado.atualizar();
    expect(montado.elemento.textContent).toContain('ainda não tem atividades');
  });

  it.each([TipoUsuarioEnum.DESENVOLVEDOR, TipoUsuarioEnum.GESTOR, TipoUsuarioEnum.ADMINISTRADOR])('o %s vê a aba Cliente', async (tipo) => {
    const montado = await montar(tipo);
    expect(abas(montado.elemento)).toEqual(['Checklist', 'Anotações', 'Técnica', 'Cliente', 'Documentação']);
    expect(montado.elemento.querySelector('.icone-descricao--tecnica')).not.toBeNull();
    expect(montado.elemento.querySelector('.icone-descricao--doc')).not.toBeNull();
  });

  it('o desenvolvedor lê o texto do cliente, com cadeado na aba e o aviso de que só gestores alteram', async () => {
    const montado = await montar(TipoUsuarioEnum.DESENVOLVEDOR);
    expect(montado.elemento.querySelector('p-tab .pi-lock')).not.toBeNull();
    montado.componente.aba.set('cliente');
    await montado.atualizar();
    expect(montado.componente.abaAtiva()).toBe('cliente');
    expect(montado.elemento.textContent).toContain('Texto do cliente');
    expect(montado.elemento.textContent).toContain('O pedido do cliente: você lê, só gestores alteram');
  });

  it('o gestor lê o texto do cliente sem o aviso nem o cadeado', async () => {
    const montado = await montar(TipoUsuarioEnum.GESTOR);
    expect(montado.elemento.querySelector('p-tab .pi-lock')).toBeNull();
    montado.componente.aba.set('cliente');
    await montado.atualizar();
    expect(montado.elemento.textContent).not.toContain('você lê, só gestores alteram');
  });

  it('o gestor lê o texto do cliente; aba sem texto diz que está vazia', async () => {
    const montado = await montar(TipoUsuarioEnum.GESTOR);
    montado.componente.aba.set('cliente');
    await montado.atualizar();
    expect(montado.elemento.textContent).toContain('Texto do cliente');
    montado.componente.aba.set('documentacao');
    await montado.atualizar();
    expect(montado.elemento.textContent).toContain('Nada escrito nesta aba ainda');
  });

  it('a demanda abre na aba Anotações, com o pad à mostra e sem o cabeçalho próprio', async () => {
    const montado = await montar(TipoUsuarioEnum.DESENVOLVEDOR, [], { EM_ANDAMENTO: 'fazendo agora' });
    expect(montado.componente.abaAtiva()).toBe('anotacoes');
    expect(montado.elemento.querySelector('app-pad-painel')).not.toBeNull();
    expect(montado.elemento.querySelector('.pad-painel__cabecalho')).toBeNull();
    expect(montado.elemento.textContent).toContain('Em andamento');
    expect(montado.elemento.textContent).toContain('Pendências');
  });

  it('o contador mostra os itens em aberto das Pendências', async () => {
    const montado = await montar(TipoUsuarioEnum.DESENVOLVEDOR, [], { PENDENCIA: '- [ ] um\n- [x] feito\n- [ ] dois' });
    expect(montado.elemento.querySelector('.demanda-leitura__aba-contador')?.textContent?.trim()).toBe('2');
  });

  it('sem item em aberto o contador não aparece', async () => {
    const montado = await montar(TipoUsuarioEnum.DESENVOLVEDOR, [], { PENDENCIA: '- [x] feito' });
    expect(montado.elemento.querySelector('.demanda-leitura__aba-contador')).toBeNull();
  });

  it('trocar de aba não perde o que foi digitado no pad, e o contador acompanha', async () => {
    const montado = await montar(TipoUsuarioEnum.DESENVOLVEDOR);
    const pad = TestBed.inject(PadService);
    const pendencias = pad.secoes().find((secao) => secao.tipo === TipoAnotacaoEnum.PENDENCIA)!;
    pendencias.controle.setValue('- [ ] nova pendência');
    await montado.atualizar();
    expect(montado.elemento.querySelector('.demanda-leitura__aba-contador')?.textContent?.trim()).toBe('1');

    montado.componente.aba.set('tecnica');
    await montado.atualizar();
    montado.componente.aba.set('anotacoes');
    await montado.atualizar();
    expect(pendencias.controle.value).toBe('- [ ] nova pendência');
    expect(pad.secoes().find((secao) => secao.tipo === TipoAnotacaoEnum.PENDENCIA)).toBe(pendencias);
  });

  it('Voltar à lista e Planejar com a IA emitem os eventos; Editar leva à tela de Demandas do projeto', async () => {
    const montado = await montar(TipoUsuarioEnum.DESENVOLVEDOR);
    const voltou = vi.fn();
    const planejou = vi.fn();
    montado.componente.voltar.subscribe(voltou);
    montado.componente.planejar.subscribe(planejou);
    const navegar = vi.spyOn(TestBed.inject(Router), 'navigate').mockResolvedValue(true);
    const botoes = Array.from(montado.elemento.querySelectorAll<HTMLButtonElement>('button'));
    botoes.find((botao) => botao.textContent?.includes('Demandas'))!.click();
    botoes.find((botao) => botao.textContent?.includes('Planejar com a IA'))!.click();
    botoes.find((botao) => botao.textContent?.includes('Editar'))!.click();
    expect(voltou).toHaveBeenCalledTimes(1);
    expect(planejou).toHaveBeenCalledTimes(1);
    expect(navegar).toHaveBeenCalledWith(['/demanda'], { queryParams: { projetoId: 3 } });
  });

  it('erro ao abrir: avisa, oferece tentar de novo e voltar à lista', async () => {
    const montado = await montarComponente(DemandaLeituraComponent, { usuario: TipoUsuarioEnum.DESENVOLVEDOR, entradas: { demandaId: 9 } });
    responderSucesso(esperarRequisicao(montado.http, 'GET', '/anotacao'), secoesDoPad());
    responderErro(esperarRequisicao(montado.http, 'GET', '/demanda/9'), 404, 'Demanda não encontrada');
    await montado.atualizar();
    expect(montado.elemento.querySelector('[role="alert"]')?.textContent).toContain('Não foi possível abrir a demanda');
    expect(montado.elemento.textContent).toContain('Voltar à lista');
  });
});
