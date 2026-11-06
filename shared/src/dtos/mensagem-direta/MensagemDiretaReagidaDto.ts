import { ReacaoMensagemDiretaDto } from './ReacaoMensagemDiretaDto';

/** Como ficaram as reações da mensagem depois de reagir (vazia quando a última foi removida). */
export interface MensagemDiretaReagidaDto {
    mensagemId: string;
    reacoes: ReacaoMensagemDiretaDto[];
}
