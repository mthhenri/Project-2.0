import { ApiProperty } from '@nestjs/swagger';

/** Value-object: usuário com execução aberta (em andamento) numa atividade da demanda. */
export class ExecutorAtivoDto {
    @ApiProperty({ example: 1 })
    usuarioId: number;

    @ApiProperty({ example: 'Maria Silva' })
    nomeCompleto: string;

    @ApiProperty({ example: '#1E3A8A', nullable: true, description: 'Cor da bolinha escolhida; null = cor padrão do tema' })
    corAvatar: string | null;

    @ApiProperty({ example: '2026-10-25T14:00:00.000Z', description: 'Início da execução aberta (inicio_data, timestamptz)' })
    inicioData: Date;
}
