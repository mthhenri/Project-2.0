import assert from 'node:assert/strict';
import test from 'node:test';
import { estilosInlineDoTemplate } from './verificar-estilo-inline.mjs';

test('pega o atributo style literal e ignora os bindings do Angular', () => {
    assert.equal(estilosInlineDoTemplate('<div style="width: 1px"></div>').length, 1);
    assert.equal(estilosInlineDoTemplate("<p-dialog [style]=\"{ width: '40rem' }\"></p-dialog>").length, 0);
    assert.equal(estilosInlineDoTemplate('<i [style.width.px]="largura"></i><span class="estilo"></span>').length, 0);
});
