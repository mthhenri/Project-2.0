import { describe, it, expect } from 'vitest';
import { TestBed } from '@angular/core/testing';
import { TipoUsuarioEnum } from '@project20/shared';
import { montarComponente } from '../../../../../testes/montar-componente';
import { DIAGRAMA_MODELAGEM } from '../../data/modelagem.dados';
import { ModelagemPage } from './modelagem.page';

// A tela lê o módulo gerado de verdade: os testes derivam o esperado dele (nada de contagem fixa), para não
// quebrar a cada migration. Os grupos e as tabelas citadas existem desde as primeiras migrations.
async function montar(usuario = TipoUsuarioEnum.DESENVOLVEDOR) {
  TestBed.resetTestingModule();
  const montado = await montarComponente(ModelagemPage, { usuario });
  // O módulo dos dados chega por `import()` dinâmico, que o `whenStable` não enxerga: espera o corpo da tela aparecer.
  for (let tentativa = 0; tentativa < 100 && !montado.elemento.querySelector('.modelagem__corpo'); tentativa++) {
    await new Promise((resolver) => setTimeout(resolver, 10));
    await montado.atualizar();
  }
  return montado;
}

const tabelas = (elemento: HTMLElement) => Array.from(elemento.querySelectorAll<SVGGElement>('.modelagem-diagrama__tabela'));
const nome = (tabela: SVGGElement) => tabela.getAttribute('aria-label')?.replace('Tabela ', '');
const clicar = (alvo: Element) => {
  alvo.dispatchEvent(new MouseEvent('pointerdown', { bubbles: true, clientX: 0, clientY: 0 }));
  alvo.dispatchEvent(new MouseEvent('pointerup', { bubbles: true, clientX: 0, clientY: 0 }));
};

describe('ModelagemPage', () => {
  it('mostra o diagrama inteiro, com o total de tabelas, para qualquer tipo de usuário', async () => {
    for (const usuario of [TipoUsuarioEnum.DESENVOLVEDOR, TipoUsuarioEnum.GESTOR, TipoUsuarioEnum.ADMINISTRADOR]) {
      const { elemento } = await montar(usuario);
      expect(elemento.querySelector('h1')?.textContent).toContain('Modelagem do banco');
      expect(elemento.querySelector('.modelagem__contador')?.textContent).toContain(`${DIAGRAMA_MODELAGEM.tabelas.length} tabelas`);
      expect(tabelas(elemento).length).toBe(DIAGRAMA_MODELAGEM.tabelas.length);
    }
  });

  it('tem um botão de filtro por grupo e o painel de resumo no começo', async () => {
    const { elemento } = await montar();
    const botoes = Array.from(elemento.querySelectorAll('.modelagem__grupo')).map((botao) => botao.textContent?.trim());
    expect(botoes).toEqual(DIAGRAMA_MODELAGEM.grupos.map((grupo) => grupo.rotulo));
    expect(elemento.querySelector('.modelagem-detalhe__nome')?.textContent).toContain('Banco de dados');
  });

  it('desligar um grupo some com as tabelas dele; ligar de novo devolve', async () => {
    const { elemento, atualizar } = await montar();
    const grupo = DIAGRAMA_MODELAGEM.grupos[0];
    const doGrupo = DIAGRAMA_MODELAGEM.tabelas.filter((tabela) => tabela.grupo === grupo.id).length;
    const botao = elemento.querySelector<HTMLButtonElement>('.modelagem__grupo')!;
    botao.click();
    await atualizar();
    expect(botao.getAttribute('aria-pressed')).toBe('false');
    expect(tabelas(elemento).length).toBe(DIAGRAMA_MODELAGEM.tabelas.length - doGrupo);
    botao.click();
    await atualizar();
    expect(tabelas(elemento).length).toBe(DIAGRAMA_MODELAGEM.tabelas.length);
  });

  it('clicar em uma tabela abre as colunas e as relações dela no painel', async () => {
    const { elemento, atualizar } = await montar();
    const atividade = tabelas(elemento).find((tabela) => nome(tabela) === 'atividade')!;
    clicar(atividade);
    await atualizar();
    expect(elemento.querySelector('.modelagem-detalhe__nome')?.textContent).toContain('atividade');
    const relacoes = Array.from(elemento.querySelectorAll('.modelagem-detalhe__relacao')).map((botao) => botao.textContent?.replace(/\s+/g, ' ').trim());
    expect(relacoes).toContain('demanda via demanda_id');
    expect(relacoes).toContain('execucao via atividade_id');
  });

  it('escolher uma relação no painel passa para a outra tabela', async () => {
    const { elemento, atualizar } = await montar();
    clicar(tabelas(elemento).find((tabela) => nome(tabela) === 'atividade')!);
    await atualizar();
    const paraDemanda = Array.from(elemento.querySelectorAll<HTMLButtonElement>('.modelagem-detalhe__relacao')).find((botao) => botao.textContent?.includes('demanda via demanda_id'))!;
    paraDemanda.click();
    await atualizar();
    expect(elemento.querySelector('.modelagem-detalhe__nome')?.textContent).toContain('demanda');
  });

  it('a busca apaga as tabelas sem o termo e Enter escolhe a primeira que casa', async () => {
    const { elemento, atualizar } = await montar();
    const campo = elemento.querySelector<HTMLInputElement>('input[aria-label="Buscar tabela ou coluna"]')!;
    campo.value = 'senha_encriptada';
    campo.dispatchEvent(new Event('input'));
    await atualizar();
    const claras = tabelas(elemento).filter((tabela) => !tabela.classList.contains('modelagem-diagrama__tabela--apagada'));
    expect(claras.map(nome)).toEqual(['usuario']);
    campo.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true }));
    await atualizar();
    expect(elemento.querySelector('.modelagem-detalhe__nome')?.textContent).toContain('usuario');
  });

  it('Esc limpa a busca', async () => {
    const { elemento, atualizar } = await montar();
    const campo = elemento.querySelector<HTMLInputElement>('input[aria-label="Buscar tabela ou coluna"]')!;
    campo.value = 'usuario';
    campo.dispatchEvent(new Event('input'));
    campo.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
    await atualizar();
    expect(campo.value).toBe('');
  });
});
