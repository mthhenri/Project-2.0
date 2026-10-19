import { describe, it, expect } from 'vitest';
import { TipoAtividadePrioridadeEnum, TipoUsuarioEnum } from '@project20/shared';
import { montarComponente, ComponenteMontado } from '../../../../../testes/montar-componente';
import { esperarRequisicao, responderErro, responderSucesso } from '../../../../../testes/http-teste';
import { PrioridadesAbaComponent } from './prioridades-aba.component';

// Task 143: o administrador troca a cor de cada prioridade (#rrggbb); nome e ordem são fixos.

type Montado = ComponenteMontado<PrioridadesAbaComponent>;

const PRIORIDADES = [
  { codigo: TipoAtividadePrioridadeEnum.URGENTE, descricao: 'Urgente', ordem: 1, cor: '#dc2626' },
  { codigo: TipoAtividadePrioridadeEnum.ALTA, descricao: 'Alta', ordem: 2, cor: '#f97316' },
  { codigo: TipoAtividadePrioridadeEnum.MEDIA, descricao: 'Média', ordem: 3, cor: '#eab308' },
];

async function abrir(): Promise<Montado> {
  const montado = await montarComponente(PrioridadesAbaComponent, { usuario: TipoUsuarioEnum.ADMINISTRADOR });
  responderSucesso(esperarRequisicao(montado.http, 'GET', '/atividade-prioridade'), PRIORIDADES);
  await montado.atualizar();
  return montado;
}

const campoHex = (montado: Montado, descricao: string) =>
  montado.elemento.querySelector(`[aria-label="Código da cor da prioridade ${descricao}"]`) as HTMLInputElement;
const botaoSalvar = (montado: Montado, indice: number) =>
  Array.from(montado.elemento.querySelectorAll('button')).filter((botao) => botao.textContent?.includes('Salvar cor'))[indice] as HTMLButtonElement;
const botaoPorRotulo = (montado: Montado, rotulo: string) =>
  Array.from(montado.elemento.querySelectorAll('button')).find((botao) => botao.textContent?.includes(rotulo)) as HTMLButtonElement;

async function digitar(montado: Montado, descricao: string, valor: string): Promise<void> {
  const campo = campoHex(montado, descricao);
  campo.value = valor;
  campo.dispatchEvent(new Event('input'));
  await montado.atualizar();
}

describe('PrioridadesAbaComponent', () => {
  it('enquanto a lista não chega mostra o esqueleto', async () => {
    const montado = await montarComponente(PrioridadesAbaComponent, { usuario: TipoUsuarioEnum.ADMINISTRADOR });
    expect(montado.elemento.querySelector('[aria-busy="true"]')).not.toBeNull();
    expect(montado.elemento.querySelector('ul')).toBeNull();
    responderSucesso(esperarRequisicao(montado.http, 'GET', '/atividade-prioridade'), PRIORIDADES);
    await montado.atualizar();
    expect(montado.elemento.querySelector('[aria-busy="true"]')).toBeNull();
  });

  it('lista cada prioridade na ordem, com a ordem, o nome e a cor atual no campo', async () => {
    const montado = await abrir();
    const linhas = Array.from(montado.elemento.querySelectorAll('li'));
    expect(linhas).toHaveLength(3);
    expect(linhas[0].textContent).toContain('Urgente');
    expect(linhas[1].textContent).toContain('Alta');
    expect(campoHex(montado, 'Urgente').value).toBe('#dc2626');
    expect(campoHex(montado, 'Média').value).toBe('#eab308');
  });

  it('sem alteração, "Salvar cor" fica desabilitado e "Descartar" não aparece', async () => {
    const montado = await abrir();
    expect(botaoSalvar(montado, 0).disabled).toBe(true);
    expect(montado.elemento.textContent).not.toContain('Descartar');
  });

  it('cor fora do formato #rrggbb mostra o erro e não deixa salvar', async () => {
    const montado = await abrir();
    for (const invalida of ['#12345', 'vermelho', '#gggggg', '#1234567']) {
      await digitar(montado, 'Alta', invalida);
      expect(montado.elemento.textContent, invalida).toContain('Use o formato #rrggbb');
      expect(botaoSalvar(montado, 1).disabled, invalida).toBe(true);
    }
    montado.http.expectNone((requisicao) => requisicao.method === 'PATCH');
  });

  it('cor válida habilita salvar; maiúsculas valem e voltar ao valor original desabilita de novo', async () => {
    const montado = await abrir();
    await digitar(montado, 'Alta', '#00AA11');
    expect(montado.elemento.textContent).not.toContain('Use o formato #rrggbb');
    expect(botaoSalvar(montado, 1).disabled).toBe(false);

    await digitar(montado, 'Alta', '#F97316');
    expect(botaoSalvar(montado, 1).disabled).toBe(true);
  });

  it('"Salvar cor" faz PATCH em /atividade-prioridade/:codigo só com a cor e avisa o sucesso', async () => {
    const montado = await abrir();
    const avisos: { severity?: string; detail?: string }[] = [];
    montado.mensagens.messageObserver.subscribe((mensagem) => avisos.push(...[mensagem].flat()));
    await digitar(montado, 'Alta', '#00aa11');

    botaoSalvar(montado, 1).click();
    const requisicao = esperarRequisicao(montado.http, 'PATCH', '/atividade-prioridade/ALTA');
    expect(requisicao.request.body).toEqual({ cor: '#00aa11' });
    responderSucesso(requisicao, { ...PRIORIDADES[1], cor: '#00aa11' });
    await montado.atualizar();

    expect(avisos.some((aviso) => aviso.severity === 'success' && aviso.detail === 'Cor de "Alta" alterada')).toBe(true);
    expect(montado.componente.salvando()).toBeNull();
    expect(montado.componente.prioridades()[1].cor).toBe('#00aa11');
    expect(botaoSalvar(montado, 1).disabled).toBe(true);
  });

  it('erro ao salvar libera o botão e mantém a cor digitada para nova tentativa', async () => {
    const montado = await abrir();
    await digitar(montado, 'Urgente', '#112233');
    botaoSalvar(montado, 0).click();
    responderErro(esperarRequisicao(montado.http, 'PATCH', '/atividade-prioridade/URGENTE'), 500, 'Falhou');
    await montado.atualizar();

    expect(montado.componente.salvando()).toBeNull();
    expect(campoHex(montado, 'Urgente').value).toBe('#112233');
    expect(botaoSalvar(montado, 0).disabled).toBe(false);
  });

  it('"Descartar" devolve a cor salva', async () => {
    const montado = await abrir();
    await digitar(montado, 'Média', '#abcdef');
    botaoPorRotulo(montado, 'Descartar').click();
    await montado.atualizar();

    expect(campoHex(montado, 'Média').value).toBe('#eab308');
    expect(montado.elemento.textContent).not.toContain('Descartar');
  });
});
