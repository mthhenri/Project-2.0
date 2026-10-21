import { describe, it, expect } from 'vitest';
import { TipoAtividadePrioridadeEnum, TipoUsuarioEnum } from '@project20/shared';
import { montarComponente } from '../../../../../testes/montar-componente';
import { esperarRequisicao, responderSucesso } from '../../../../../testes/http-teste';
import { AtividadePrioridadesDialogComponent } from './atividade-prioridades-dialog.component';

// Task 204: o dialog das cores das prioridades só carrega e mostra as cores depois de aberto.

describe('AtividadePrioridadesDialogComponent', () => {
  it('fechado não mostra nem busca nada; ao abrir mostra as prioridades e "Fechar" esconde o dialog', async () => {
    const montado = await montarComponente(AtividadePrioridadesDialogComponent, { usuario: TipoUsuarioEnum.ADMINISTRADOR });
    expect(document.body.textContent).not.toContain('Alterar prioridades');
    montado.http.expectNone((requisicao) => requisicao.url.includes('/atividade-prioridade'));

    montado.componente.abrir();
    await montado.atualizar();
    responderSucesso(esperarRequisicao(montado.http, 'GET', '/atividade-prioridade'), [
      { codigo: TipoAtividadePrioridadeEnum.URGENTE, descricao: 'Urgente', ordem: 1, cor: '#dc2626' },
    ]);
    await montado.atualizar();
    expect(document.body.textContent).toContain('Alterar prioridades');
    expect(document.body.querySelector('[aria-label="Código da cor da prioridade Urgente"]')).not.toBeNull();

    montado.componente.visivel.set(false);
    await montado.atualizar();
    expect(montado.componente.visivel()).toBe(false);
  });
});
