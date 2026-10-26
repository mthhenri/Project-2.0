import { BaseEntity } from '../../../../core/base/base.entity';

export class Plano extends BaseEntity {
  titulo: string;
  projetoId: number | null;
  usuarioId: number;
  isSolo: boolean;
  isArquivado: boolean;
  descricaoTecnica: string | null;
  descricaoCliente: string | null;
  documentacao: string | null;
  versao: number;
}
