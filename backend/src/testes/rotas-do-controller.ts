import { METHOD_METADATA, PATH_METADATA } from '@nestjs/common/constants';
import { RequestMethod } from '@nestjs/common';

export interface RotaDoController {
  /** Nome do método da classe (`criar`, `listar`...). */
  nome: string;
  /** Verbo HTTP em maiúsculas. */
  verbo: string;
  /** Caminho relativo ao controller (`:id/senha`; `/` na raiz). */
  caminho: string;
  publica: boolean;
  gestorOnly: boolean;
  administradorOnly: boolean;
}

/**
 * Lê os metadados de rota e de permissão de um controller sem subir a aplicação. Uma marca no controller
 * inteiro vale para todas as rotas (como os guards globais fazem com `getAllAndOverride`).
 */
export function listarRotasDoController(controller: new (...argumentos: never[]) => object): RotaDoController[] {
  const marcaDaClasse = (chave: string) => Reflect.getMetadata(chave, controller) === true;
  const prototipo = controller.prototype as Record<string, unknown>;

  return Object.getOwnPropertyNames(prototipo)
    .filter((nome) => nome !== 'constructor' && typeof prototipo[nome] === 'function')
    .filter((nome) => Reflect.getMetadata(METHOD_METADATA, prototipo[nome] as object) !== undefined)
    .map((nome) => {
      const manipulador = prototipo[nome] as object;
      const marca = (chave: string) => Reflect.getMetadata(chave, manipulador) === true || marcaDaClasse(chave);
      return {
        nome,
        verbo: RequestMethod[Reflect.getMetadata(METHOD_METADATA, manipulador) as number],
        caminho: String(Reflect.getMetadata(PATH_METADATA, manipulador) ?? ''),
        publica: marca('isPublic'),
        gestorOnly: marca('gestorOnly'),
        administradorOnly: marca('administradorOnly'),
      };
    });
}

/** `Rotas` indexadas por nome de método, para o teste afirmar rota a rota. */
export function rotasPorNome(controller: new (...argumentos: never[]) => object): Record<string, RotaDoController> {
  return Object.fromEntries(listarRotasDoController(controller).map((rota) => [rota.nome, rota]));
}
