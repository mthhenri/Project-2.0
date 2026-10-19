import { describe, it, expect } from 'vitest';
import { TipoUsuarioEnum } from '@project20/shared';
import { montarComponente } from '../../../../../testes/montar-componente';
import { esperarRequisicao, responderErro, responderSucesso } from '../../../../../testes/http-teste';
import { TagEdicaoDialogComponent } from './tag-edicao-dialog.component';

// Formulário de referência (task 172): validação, envio e erro do backend.

const TAG = { id: 7, nome: 'Backend', cor: '#112233' };

async function abrirDialog() {
  const montado = await montarComponente(TagEdicaoDialogComponent, { usuario: TipoUsuarioEnum.GESTOR });
  const salvas: unknown[] = [];
  montado.componente.aoSalvar.subscribe((tag) => salvas.push(tag));
  montado.componente.abrir(TAG);
  await montado.atualizar();
  return { montado, salvas };
}

const botao = (rotulo: string) =>
  Array.from(document.body.querySelectorAll('button')).find((elemento) => elemento.textContent?.trim() === rotulo)!;

describe('TagEdicaoDialogComponent', () => {
  it('abre com o nome e a cor da tag', async () => {
    const { montado } = await abrirDialog();
    expect(montado.componente.formulario.getRawValue()).toEqual({ nome: 'Backend', cor: '#112233' });
    expect(document.body.textContent).toContain('Editar Tag');
  });

  it('nome vazio bloqueia o envio e mostra a mensagem', async () => {
    const { montado } = await abrirDialog();
    montado.componente.formulario.controls.nome.setValue('');
    botao('Salvar').click();
    await montado.atualizar();

    montado.http.expectNone((requisicao) => requisicao.method === 'PUT');
    expect(document.body.textContent).toContain('Nome é obrigatório');
  });

  it('salvar envia a alteração, fecha o dialog e emite a tag salva', async () => {
    const { montado, salvas } = await abrirDialog();
    montado.componente.formulario.controls.nome.setValue('Back-end');
    botao('Salvar').click();
    await montado.atualizar();

    const requisicao = esperarRequisicao(montado.http, 'PUT', '/tag/7');
    expect(requisicao.request.body).toEqual({ nome: 'Back-end', cor: '#112233' });
    responderSucesso(requisicao, { id: 7, nome: 'Back-end', cor: '#112233', createdDate: '2026-01-15' });
    await montado.atualizar();

    expect(salvas).toEqual([{ id: 7, nome: 'Back-end', cor: '#112233', createdDate: '2026-01-15' }]);
    expect(montado.componente.mostrarDialog()).toBe(false);
  });

  it('erro do backend: o dialog continua aberto, nada é emitido e o botão volta a ficar livre', async () => {
    const { montado, salvas } = await abrirDialog();
    botao('Salvar').click();
    await montado.atualizar();

    responderErro(esperarRequisicao(montado.http, 'PUT', '/tag/7'), 400, 'Nome já usado', ['Nome já usado']);
    await montado.atualizar();

    expect(salvas).toHaveLength(0);
    expect(montado.componente.mostrarDialog()).toBe(true);
    expect(montado.componente.carregando()).toBe(false);
  });
});
