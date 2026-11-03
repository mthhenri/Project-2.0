import { describe, it, expect } from 'vitest';
import { TestBed } from '@angular/core/testing';
import { DESCRICAO_TIPO_USUARIO, TipoUsuarioEnum } from '@project20/shared';
import { montarComponente } from '../../../../../testes/montar-componente';
import { TipoUsuarioAjudaService } from '../../services/tipo-usuario-ajuda.service';
import { UsuarioTipoDescricaoComponent } from './usuario-tipo-descricao.component';

// A ajuda de um tipo de usuário (task 306/308): rótulo, frase e as linhas ✓ (verde) e ✕ (vermelho) do texto Markdown.

const marcas = (elemento: HTMLElement, classe: string) => elemento.querySelectorAll(`.usuario-tipo-descricao__marca--${classe}`).length;

describe('UsuarioTipoDescricaoComponent', () => {
    for (const tipo of Object.values(TipoUsuarioEnum)) {
        it(`mostra o rótulo, a frase e cada linha ✓ e ✕ do texto padrão de ${tipo}`, async () => {
            const montado = await montarComponente(UsuarioTipoDescricaoComponent, { entradas: { tipo } });
            await montado.atualizar();
            const linhas = DESCRICAO_TIPO_USUARIO[tipo].split('\n');
            const texto = montado.elemento.textContent ?? '';
            expect(texto).toContain(linhas[0]);
            expect(marcas(montado.elemento, 'pode')).toBe(linhas.filter((linha) => linha.startsWith('✓')).length);
            expect(marcas(montado.elemento, 'nao-pode')).toBe(linhas.filter((linha) => linha.startsWith('✕')).length);
            for (const linha of linhas.filter((candidata) => candidata.startsWith('✓') || candidata.startsWith('✕'))) expect(texto).toContain(linha.slice(2));
        });
    }

    it('o auxiliar usa a cor verde (success) da tag da tabela', async () => {
        const montado = await montarComponente(UsuarioTipoDescricaoComponent, { entradas: { tipo: TipoUsuarioEnum.AUXILIAR } });
        await montado.atualizar();
        expect(montado.elemento.querySelector('.p-tag-success')).not.toBeNull();
    });

    it('o administrador usa a cor escura (contrast) da tag da tabela', async () => {
        const montado = await montarComponente(UsuarioTipoDescricaoComponent, { entradas: { tipo: TipoUsuarioEnum.ADMINISTRADOR } });
        await montado.atualizar();
        expect(montado.elemento.querySelector('.p-tag-contrast')).not.toBeNull();
    });

    it('mostra o texto que o administrador gravou, no lugar do padrão, assim que o serviço o recebe', async () => {
        const montado = await montarComponente(UsuarioTipoDescricaoComponent, { entradas: { tipo: TipoUsuarioEnum.GESTOR } });
        TestBed.inject(TipoUsuarioAjudaService).textos.update((atuais) => ({ ...atuais, [TipoUsuarioEnum.GESTOR]: 'Texto novo\n\n### Pode\n✓ Só isto' }));
        await montado.atualizar();
        const texto = montado.elemento.textContent ?? '';
        expect(texto).toContain('Texto novo');
        expect(texto).toContain('Só isto');
        expect(texto).not.toContain(DESCRICAO_TIPO_USUARIO[TipoUsuarioEnum.GESTOR].split('\n')[0]);
        expect(marcas(montado.elemento, 'nao-pode')).toBe(0);
    });
});
