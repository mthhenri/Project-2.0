import { describe, it, expect } from 'vitest';
import { TipoUsuarioEnum } from '@project20/shared';
import { montarComponente, ComponenteMontado } from '../../../../../testes/montar-componente';
import { ProjetoCampoEditavelComponent } from './projeto-campo-editavel.component';

// Edição no lugar do cabeçalho do projeto (task 271): botão direito → "Editar" → campo → "Salvar alteração? Sim / Não".

type Montado = ComponenteMontado<ProjetoCampoEditavelComponent>;

async function montar(tipo: 'texto' | 'data' | 'cor', valor: string | null, editavel = true): Promise<{ montado: Montado; emitidos: string[] }> {
  const montado = await montarComponente(ProjetoCampoEditavelComponent, {
    usuario: TipoUsuarioEnum.GESTOR,
    entradas: { tipo, valor, editavel, rotulo: 'nome do projeto' },
  });
  const emitidos: string[] = [];
  montado.componente.confirmado.subscribe((novo) => emitidos.push(novo));
  await montado.atualizar();
  return { montado, emitidos };
}

const campoTexto = (montado: Montado) => montado.elemento.querySelector('input') as HTMLInputElement;
const botao = (montado: Montado, rotulo: string) =>
  Array.from(montado.elemento.querySelectorAll('button')).find((candidato) => candidato.textContent?.trim() === rotulo) as HTMLButtonElement;

async function digitar(montado: Montado, texto: string): Promise<void> {
  const campo = campoTexto(montado);
  campo.value = texto;
  campo.dispatchEvent(new Event('input'));
  await montado.atualizar();
}

describe('ProjetoCampoEditavelComponent', () => {
  it('o botão direito de quem edita abre o menu com "Editar"', async () => {
    const { montado } = await montar('texto', 'Portal');
    montado.elemento.querySelector('.campo-editavel__exibicao')!.dispatchEvent(new MouseEvent('contextmenu', { bubbles: true, cancelable: true }));
    await montado.atualizar();
    expect(document.body.textContent).toContain('Editar');
  });

  it('sem permissão de editar, o botão direito não abre menu', async () => {
    const { montado } = await montar('texto', 'Portal', false);
    expect(montado.elemento.querySelector('.campo-editavel__exibicao--editavel')).toBeNull();
    montado.elemento.querySelector('.campo-editavel__exibicao')!.dispatchEvent(new MouseEvent('contextmenu', { bubbles: true, cancelable: true }));
    await montado.atualizar();
    expect(document.body.querySelector('.p-contextmenu')).toBeNull();
  });

  it('o lápis ao lado do campo abre a edição, e só aparece para quem pode editar', async () => {
    const { montado } = await montar('texto', 'Portal');
    (montado.elemento.querySelector('.campo-editavel__lapis') as HTMLElement).click();
    await montado.atualizar();
    expect(montado.componente.editando()).toBe(true);
    expect(campoTexto(montado).value).toBe('Portal');
  });

  it('sem permissão não há lápis', async () => {
    const { montado } = await montar('texto', 'Portal', false);
    expect(montado.elemento.querySelector('.campo-editavel__lapis')).toBeNull();
  });

  it('Editar troca o texto pelo campo, já preenchido', async () => {
    const { montado } = await montar('texto', 'Portal');
    montado.componente.iniciarEdicao();
    await montado.atualizar();
    expect(campoTexto(montado).value).toBe('Portal');
  });

  it('Enter com mudança pergunta; "Sim" emite o valor novo e volta à exibição', async () => {
    const { montado, emitidos } = await montar('texto', 'Portal');
    montado.componente.iniciarEdicao();
    await montado.atualizar();
    await digitar(montado, 'Portal Novo');
    montado.componente.sair();
    await montado.atualizar();
    expect(montado.elemento.textContent).toContain('Salvar alteração?');

    botao(montado, 'Sim').click();
    await montado.atualizar();
    expect(emitidos).toEqual(['Portal Novo']);
    expect(montado.componente.editando()).toBe(false);
  });

  it('"Não" descarta, sem emitir', async () => {
    const { montado, emitidos } = await montar('texto', 'Portal');
    montado.componente.iniciarEdicao();
    await montado.atualizar();
    await digitar(montado, 'Outro nome');
    montado.componente.sair();
    await montado.atualizar();
    botao(montado, 'Não').click();
    await montado.atualizar();
    expect(emitidos).toEqual([]);
    expect(montado.componente.editando()).toBe(false);
  });

  it('sair sem mudança fecha em silêncio, sem perguntar', async () => {
    const { montado, emitidos } = await montar('texto', 'Portal');
    montado.componente.iniciarEdicao();
    await montado.atualizar();
    montado.componente.sair();
    await montado.atualizar();
    expect(montado.componente.editando()).toBe(false);
    expect(montado.elemento.textContent).not.toContain('Salvar alteração?');
    expect(emitidos).toEqual([]);
  });

  it('nome com menos de 3 caracteres fica na edição com o erro, sem perguntar', async () => {
    const { montado } = await montar('texto', 'Portal');
    montado.componente.iniciarEdicao();
    await montado.atualizar();
    await digitar(montado, 'ab');
    montado.componente.sair();
    await montado.atualizar();
    expect(montado.componente.confirmando()).toBe(false);
    expect(montado.elemento.textContent).toContain('ao menos 3 caracteres');
  });

  it('Esc cancela a edição', async () => {
    const { montado, emitidos } = await montar('texto', 'Portal');
    montado.componente.iniciarEdicao();
    await montado.atualizar();
    await digitar(montado, 'Mudou');
    montado.elemento.querySelector('.campo-editavel__editor')!.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
    await montado.atualizar();
    expect(montado.componente.editando()).toBe(false);
    expect(emitidos).toEqual([]);
  });

  it('data: sem valor, o campo começa vazio e sair vazio é desistir (a API não limpa a data)', async () => {
    const { montado, emitidos } = await montar('data', null);
    montado.componente.iniciarEdicao();
    await montado.atualizar();
    expect(montado.componente.rascunhoData.value).toBeNull();
    montado.componente.sair();
    expect(montado.componente.editando()).toBe(false);
    expect(emitidos).toEqual([]);
  });

  it('data: escolher outro dia pergunta e emite yyyy-mm-dd', async () => {
    const { montado, emitidos } = await montar('data', '2026-03-01');
    montado.componente.iniciarEdicao();
    await montado.atualizar();
    expect(montado.componente.rascunhoData.value?.getDate()).toBe(1);
    montado.componente.rascunhoData.setValue(new Date(2026, 3, 15));
    montado.componente.sair();
    await montado.atualizar();
    botao(montado, 'Sim').click();
    expect(emitidos).toEqual(['2026-04-15']);
  });

  it('cor: escolher outra cor pergunta na hora e emite o hex', async () => {
    const { montado, emitidos } = await montar('cor', '#336699');
    montado.componente.iniciarEdicao();
    await montado.atualizar();
    expect(montado.componente.confirmando()).toBe(false);
    montado.componente.rascunhoCor.setValue('#ef4444');
    await montado.atualizar();
    expect(montado.componente.confirmando()).toBe(true);
    botao(montado, 'Sim').click();
    expect(emitidos).toEqual(['#ef4444']);
  });
});
