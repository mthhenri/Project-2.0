import { ApiProperty } from '@nestjs/swagger';
import { ProjetoRecuperadoDto } from './ProjetoRecuperadoDto';

/** O projeto aberto na tela de detalhe: os dados do projeto e a situação do chat dele, para a tela não perguntar ao servidor. */
export class ProjetoDetalheRecuperadoDto extends ProjetoRecuperadoDto {
    @ApiProperty({ description: 'O projeto já tem chat (canal)? Escolhe "Abrir chat" ou "Criar chat".' })
    canalChatExiste: boolean;

    @ApiProperty({ description: 'Quem pede pode abrir o chat do projeto: gestor e administrador sempre; os demais só tendo ao menos uma demanda nele (o auxiliar também).' })
    podeAbrirCanalChat: boolean;
}
