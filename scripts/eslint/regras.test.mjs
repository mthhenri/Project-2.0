import { RuleTester } from 'eslint';
import { resolve } from 'node:path';
import tseslint from 'typescript-eslint';
import regras from './regras.mjs';

RuleTester.describe = (texto, funcao) => funcao();
RuleTester.it = (texto, funcao) => funcao();

const verificador = new RuleTester({ languageOptions: { parser: tseslint.parser } });
const componenteReal = resolve('frontend/src/app/shared/layout/topbar/topbar.component.ts');

verificador.run('project/descriptive-identifiers', regras.rules['descriptive-identifiers'], {
    valid: [
        'const usuarioEncontrado = 1;',
        'function somar(primeiro: number, segundo: number) { return primeiro + segundo; }',
        'try { executar(); } catch (erro) { registrar(erro); }',
        'const { indice } = objeto;',
    ],
    invalid: [
        { code: 'const u = 1;', errors: [{ messageId: 'descriptive' }] },
        { code: 'function somar(a: number, b: number) { return a + b; }', errors: [{ messageId: 'descriptive' }, { messageId: 'descriptive' }] },
        { code: 'try { executar(); } catch (e) { registrar(e); }', errors: [{ messageId: 'descriptive' }] },
        { code: 'lista.map((p) => p.id);', errors: [{ messageId: 'descriptive' }] },
        { code: 'const { id: d } = objeto;', errors: [{ messageId: 'descriptive' }] },
    ],
});

const cabecalho = "import { Component } from '@angular/core';\n";

verificador.run('project/separate-component-files', regras.rules['separate-component-files'], {
    valid: [
        {
            code: `${cabecalho}@Component({ selector: 'app-x', templateUrl: './topbar.component.html', styleUrl: './topbar.component.scss' }) class X {}`,
            filename: componenteReal,
        },
        { code: 'class SemDecorator {}', filename: componenteReal },
    ],
    invalid: [
        { code: `${cabecalho}@Component({ selector: 'app-x', template: '<p></p>' }) class X {}`, filename: componenteReal, errors: [{ messageId: 'separate' }] },
        { code: `${cabecalho}@Component({ selector: 'app-x', templateUrl: './topbar.component.html', styles: ['a{}'] }) class X {}`, filename: componenteReal, errors: [{ messageId: 'separate' }] },
        { code: `${cabecalho}@Component({ selector: 'app-x', templateUrl: './nao-existe.html', styleUrl: './topbar.component.scss' }) class X {}`, filename: componenteReal, errors: [{ messageId: 'separate' }] },
        { code: `${cabecalho}@Component({ selector: 'app-x', templateUrl: './topbar.component.html' }) class X {}`, filename: componenteReal, errors: [{ messageId: 'separate' }] },
    ],
});
