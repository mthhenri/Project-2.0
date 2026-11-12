/** O aviso interno de que as pessoas ligadas a uma demanda (`demanda_usuario`) mudaram: quem entrou, quem saiu ou quem já nasceu na demanda. */
export class DemandaMembrosAlteradosDto {
    demandaId: number;
    /** Só as pessoas cujo vínculo mudou, não a equipe inteira. */
    usuarioIds: number[];
}
