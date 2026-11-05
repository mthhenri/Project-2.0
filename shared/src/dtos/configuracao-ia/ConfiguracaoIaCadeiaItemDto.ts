import { EsforcoIaEnum } from '../../enums/esforco-ia.enum';
import { TipoProvedorIaEnum } from '../../enums/tipo-provedor-ia.enum';

/**
 * Um item da cadeia de um nível da IA (spec 261): o provedor, o modelo dele e o esforço de raciocínio. O primeiro item da cadeia é o
 * principal do nível; os seguintes são a contingência, tentados em ordem. O nome de um modelo não vale em outro provedor.
 */
export interface ConfiguracaoIaCadeiaItemDto {
    provedor: TipoProvedorIaEnum;
    modelo: string;
    esforco: EsforcoIaEnum;
}
