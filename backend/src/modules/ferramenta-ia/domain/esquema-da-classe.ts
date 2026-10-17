import { getMetadataStorage } from 'class-validator';

type EsquemaCampo = Record<string, unknown>;
export interface EsquemaObjeto {
  type: 'object';
  properties: Record<string, EsquemaCampo>;
  required: string[];
  additionalProperties: false;
}

const descricoesDosCampos = new WeakMap<object, Record<string, string>>();

/** Descrição de um campo para o modelo (o que ele deve colocar ali). Vai para o esquema JSON da ferramenta. */
export function DescricaoCampoIa(descricao: string): PropertyDecorator {
  return (alvo, propriedade) => {
    const atuais = descricoesDosCampos.get(alvo.constructor) ?? {};
    atuais[String(propriedade)] = descricao;
    descricoesDosCampos.set(alvo.constructor, atuais);
  };
}

/**
 * Gera o esquema JSON de uma classe de entrada a partir dos decoradores do `class-validator`, para o modelo nunca ver um campo que
 * a validação recusa (um só lugar). Reconhece `IsString`, `IsInt`, `IsNumber`, `IsBoolean`, `IsEnum`, `IsIn`, `IsArray` (com
 * `each`), `MinLength`, `MaxLength`, `Min`, `Max` e `IsOptional`; qualquer outro decorador continua valendo na validação, só não
 * aparece no esquema.
 */
export function gerarEsquemaDeClasse(classe: new () => object): EsquemaObjeto {
  const metadados = getMetadataStorage().getTargetValidationMetadatas(classe, '', true, false);
  const descricoes = descricoesDosCampos.get(classe) ?? {};
  const propriedades: Record<string, EsquemaCampo> = {};
  const opcionais = new Set<string>();

  for (const metadado of metadados) {
    const nome = metadado.propertyName;
    const campo = (propriedades[nome] ??= {});
    if (metadado.type === 'conditionalValidation') {
      opcionais.add(nome);
      continue;
    }
    const restricao = metadado.name;
    const parametros = metadado.constraints ?? [];
    const alvo = metadado.each ? ((campo['items'] ??= {}) as EsquemaCampo) : campo;
    switch (restricao) {
      case 'isString': alvo['type'] = 'string'; break;
      case 'isInt': alvo['type'] = 'integer'; break;
      case 'isNumber': alvo['type'] = 'number'; break;
      case 'isBoolean': alvo['type'] = 'boolean'; break;
      case 'isArray': campo['type'] = 'array'; break;
      case 'isEnum': alvo['type'] = 'string'; alvo['enum'] = parametros[1]; break;
      case 'isIn': alvo['enum'] = parametros[0]; break;
      case 'minLength': alvo['minLength'] = parametros[0]; break;
      case 'maxLength': alvo['maxLength'] = parametros[0]; break;
      case 'min': alvo['minimum'] = parametros[0]; break;
      case 'max': alvo['maximum'] = parametros[0]; break;
    }
  }

  for (const nome of Object.keys(propriedades)) {
    if (descricoes[nome]) propriedades[nome]['description'] = descricoes[nome];
  }
  return {
    type: 'object',
    properties: propriedades,
    required: Object.keys(propriedades).filter((nome) => !opcionais.has(nome)),
    additionalProperties: false,
  };
}
