import { existsSync, statSync } from 'node:fs';
import { dirname, extname, resolve } from 'node:path';

const ABREVIACOES = new Set(['a', 'b', 'u', 'usr', 'd', 'p', 'r', 'e', 'i', 'j', 'el', 'ctx', 'evt', 'req', 'res', 'tp', 'tmp']);

function identificadoresDoPadrao(padrao) {
    if (!padrao) return [];
    if (padrao.type === 'Identifier') return [padrao];
    if (padrao.type === 'RestElement') return identificadoresDoPadrao(padrao.argument);
    if (padrao.type === 'AssignmentPattern') return identificadoresDoPadrao(padrao.left);
    if (padrao.type === 'TSParameterProperty') return identificadoresDoPadrao(padrao.parameter);
    if (padrao.type === 'ArrayPattern') return padrao.elements.flatMap(identificadoresDoPadrao);
    if (padrao.type === 'ObjectPattern') return padrao.properties.flatMap((propriedade) => identificadoresDoPadrao(propriedade.type === 'RestElement' ? propriedade.argument : propriedade.value));
    return [];
}

export default {
    rules: {
        'separate-component-files': {
            meta: { type: 'problem', schema: [], messages: { separate: 'O componente deve usar arquivos HTML e SCSS externos existentes.' } },
            create(context) {
                const componentes = new Set(['Component']);
                const namespaces = new Set();
                return {
                    ImportDeclaration(node) {
                        if (node.source.value !== '@angular/core') return;
                        for (const especificador of node.specifiers) {
                            if (especificador.type === 'ImportSpecifier' && especificador.imported.name === 'Component') componentes.add(especificador.local.name);
                            if (especificador.type === 'ImportNamespaceSpecifier') namespaces.add(especificador.local.name);
                        }
                    },
                    Decorator(node) {
                        const chamada = node.expression;
                        if (chamada.type !== 'CallExpression') return;
                        const alvo = chamada.callee;
                        const componente = alvo.type === 'Identifier' && componentes.has(alvo.name)
                            || alvo.type === 'MemberExpression' && namespaces.has(alvo.object.name) && alvo.property.name === 'Component';
                        if (!componente) return;
                        const configuracao = chamada.arguments[0];
                        if (configuracao?.type !== 'ObjectExpression') {
                            context.report({ node, messageId: 'separate' });
                            return;
                        }
                        const propriedades = new Map(configuracao.properties.filter((propriedade) => propriedade.type === 'Property').map((propriedade) => [propriedade.key.name ?? propriedade.key.value, propriedade.value]));
                        const template = propriedades.get('templateUrl');
                        const estilo = propriedades.get('styleUrl');
                        const estilos = propriedades.get('styleUrls');
                        const caminhos = [template, ...(estilo ? [estilo] : estilos?.type === 'ArrayExpression' ? estilos.elements : [])];
                        const recursosValidos = caminhos.length >= 2 && caminhos.every((recurso, indice) => {
                            if (recurso?.type !== 'Literal' || typeof recurso.value !== 'string' || extname(recurso.value) !== (indice === 0 ? '.html' : '.scss')) return false;
                            const caminho = resolve(dirname(context.filename), recurso.value);
                            return existsSync(caminho) && statSync(caminho).isFile();
                        });
                        if (propriedades.has('template') || propriedades.has('styles') || !recursosValidos) context.report({ node, messageId: 'separate' });
                    },
                };
            },
        },
        'descriptive-identifiers': {
            meta: { type: 'suggestion', schema: [], messages: { descriptive: 'Use um nome descritivo em vez de "{{name}}".' } },
            create(context) {
                const conferir = (padrao) => {
                    for (const identificador of identificadoresDoPadrao(padrao)) {
                        if (ABREVIACOES.has(identificador.name)) context.report({ node: identificador, messageId: 'descriptive', data: { name: identificador.name } });
                    }
                };
                const conferirParametros = (node) => node.params.forEach(conferir);
                return {
                    VariableDeclarator: (node) => conferir(node.id),
                    FunctionDeclaration: conferirParametros,
                    FunctionExpression: conferirParametros,
                    ArrowFunctionExpression: conferirParametros,
                    CatchClause: (node) => conferir(node.param),
                };
            },
        },
    },
};
