import { describe, it, expect } from 'vitest';
import { TestBed } from '@angular/core/testing';
import { DESCRICAO_TIPO_USUARIO, TipoUsuarioEnum } from '@project20/shared';
import { montarComponente } from '../../../../../testes/montar-componente';
import { esperarRequisicao, responderSucesso } from '../../../../../testes/http-teste';
import { TipoUsuarioAjudaService } from '../../services/tipo-usuario-ajuda.service';
import { UsuarioTiposTextosComponent } from './usuario-tipos-textos.component';

// Edição dos textos dos tipos (task 308, só administrador), no molde de "Alterar prioridades".

async function montar() {
    const montado = await montarComponente(UsuarioTiposTextosComponent, { usuario: TipoUsuarioEnum.ADMINISTRADOR });
    await montado.atualizar();
    return montado;
}

const campos = (elemento: HTMLElement) => Array.from(elemento.querySelectorAll<HTMLTextAreaElement>('textarea'));
const botao = (elemento: HTMLElement, rotulo: string) =>
    Array.from(elemento.querySelectorAll<HTMLButtonElement>('button')).filter((candidato) => candidato.textContent?.includes(rotulo));
const digitar = (campo: HTMLTextAreaElement, valor: string) => {
    campo.value = valor;
    campo.dispatchEvent(new Event('input'));
};

describe('UsuarioTiposTextosComponent', () => {
    it('mostra um campo por tipo com o texto atual e nenhum botão de salvar habilitado', async () => {
        const montado = await montar();
        expect(campos(montado.elemento)).toHaveLength(4);
        expect(campos(montado.elemento)[0].value).toBe(DESCRICAO_TIPO_USUARIO[TipoUsuarioEnum.DESENVOLVEDOR]);
        expect(botao(montado.elemento, 'Salvar texto').every((salvar) => salvar.disabled)).toBe(true);
        expect(botao(montado.elemento, 'Descartar')).toHaveLength(0);
        expect(botao(montado.elemento, 'Restaurar padrão')).toHaveLength(0);
    });

    it('editar habilita Salvar e Descartar; Descartar volta ao texto gravado', async () => {
        const montado = await montar();
        digitar(campos(montado.elemento)[1], 'Texto mudado');
        await montado.atualizar();
        expect(botao(montado.elemento, 'Salvar texto')[1].disabled).toBe(false);
        botao(montado.elemento, 'Descartar')[0].click();
        await montado.atualizar();
        expect(campos(montado.elemento)[1].value).toBe(DESCRICAO_TIPO_USUARIO[TipoUsuarioEnum.AUXILIAR]);
    });

    it('salvar manda PUT com o texto do tipo e atualiza o cache do serviço', async () => {
        const montado = await montar();
        digitar(campos(montado.elemento)[2], 'Gestor novo\n✓ item');
        await montado.atualizar();
        botao(montado.elemento, 'Salvar texto')[2].click();
        const requisicao = esperarRequisicao(montado.http, 'PUT', '/tipo-usuario-ajuda/GESTOR');
        expect(requisicao.request.body).toEqual({ texto: 'Gestor novo\n✓ item' });
        responderSucesso(requisicao, { tipo: TipoUsuarioEnum.GESTOR, texto: 'Gestor novo\n✓ item' });
        await montado.atualizar();
        expect(TestBed.inject(TipoUsuarioAjudaService).textos()[TipoUsuarioEnum.GESTOR]).toBe('Gestor novo\n✓ item');
        expect(botao(montado.elemento, 'Descartar')).toHaveLength(0);
    });

    it('texto vazio não deixa salvar', async () => {
        const montado = await montar();
        digitar(campos(montado.elemento)[0], '   ');
        await montado.atualizar();
        expect(botao(montado.elemento, 'Salvar texto')[0].disabled).toBe(true);
        expect(montado.elemento.textContent).toContain('Escreva um texto');
    });

    it('Restaurar padrão aparece depois de mudar o texto e devolve o do shared ao campo', async () => {
        const montado = await montar();
        digitar(campos(montado.elemento)[3], 'Outro texto');
        await montado.atualizar();
        botao(montado.elemento, 'Restaurar padrão')[0].click();
        await montado.atualizar();
        expect(campos(montado.elemento)[3].value).toBe(DESCRICAO_TIPO_USUARIO[TipoUsuarioEnum.ADMINISTRADOR]);
    });

    it('o botão ✓ põe a marca no começo da linha do cursor', async () => {
        const montado = await montar();
        const campo = campos(montado.elemento)[0];
        digitar(campo, 'frase\nsem marca');
        campo.setSelectionRange(8, 8);
        await montado.atualizar();
        botao(montado.elemento, 'Pode')[0].click();
        await montado.atualizar();
        expect(campo.value).toBe('frase\n✓ sem marca');
    });
});
