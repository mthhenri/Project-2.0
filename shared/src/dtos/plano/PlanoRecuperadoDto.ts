export interface PlanoRecuperadoDto {
  id: number;
  titulo: string;
  projetoId: number | null;
  projetoNome: string | null;
  demandaId: number | null;
  demandaNome: string | null;
  /** Instante em que o plano foi publicado na demanda ligada; `null` se nunca foi. */
  publicacaoData: string | null;
  criadorId: number;
  criadorNome: string;
  isSolo: boolean;
  isArquivado: boolean;
  descricaoTecnica: string | null;
  /** Ausente para quem não é gestor ou administrador: a aba é exclusiva deles (`SYSTEM.SPEC.md` §14). */
  descricaoCliente?: string | null;
  documentacao: string | null;
  /** Versão lida: volta em `PlanoAlterarDto.versao` na gravação. */
  versao: number;
  createdDate: string;
  updatedDate: string;
}
