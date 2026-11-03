import { describe, it, expect } from 'vitest';
import { DESCRICAO_TIPO_USUARIO, TipoUsuarioEnum } from '@project20/shared';
import { montarComponente } from '../../../../../testes/montar-componente';
import { UsuarioTipoDescricaoComponent } from './usuario-tipo-descricao.component';

// A ajuda de um tipo de usuário (task 306): rótulo, "o que é" e as listas "Pode" e "Não pode", vindos do `shared`.

describe('UsuarioTipoDescricaoComponent', () => {
    for (const tipo of Object.values(TipoUsuarioEnum)) {
        it(`mostra o rótulo, a frase e todos os itens de ${tipo}`, async () => {
            const montado = await montarComponente(UsuarioTipoDescricaoComponent, { entradas: { tipo } });
            await montado.atualizar();
            const descricao = DESCRICAO_TIPO_USUARIO[tipo];
            const texto = montado.elemento.textContent ?? '';
            expect(texto).toContain(descricao.queE);
            for (const item of [...descricao.pode, ...descricao.naoPode]) expect(texto).toContain(item);
            expect(montado.elemento.querySelectorAll('.usuario-tipo-descricao__item')).toHaveLength(descricao.pode.length + descricao.naoPode.length);
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
});
