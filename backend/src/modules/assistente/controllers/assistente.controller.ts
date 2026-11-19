import { Body, Controller, Post } from '@nestjs/common';
import { AssistenteDescricaoAuxiliarDto, AssistenteTrechoAlterarDto } from '@project20/shared';
import { ActiveUser } from '../../autenticacao/decorators/active-user.decorator';
import { JwtPayload } from '../../autenticacao/domain/interfaces/jwt-payload.interface';
import { AssistenteService } from '../services/assistente.service';

@Controller('assistente')
export class AssistenteController {
    constructor(private readonly assistenteService: AssistenteService) {}

    @Post('auxiliar-descricao')
    auxiliarDescricao(@Body() dto: AssistenteDescricaoAuxiliarDto, @ActiveUser() usuarioAtivo: JwtPayload) {
        return this.assistenteService.auxiliarDescricao(dto, usuarioAtivo);
    }

    @Post('alterar-trecho')
    alterarTrecho(@Body() dto: AssistenteTrechoAlterarDto, @ActiveUser() usuarioAtivo: JwtPayload) {
        return this.assistenteService.alterarTrecho(dto, usuarioAtivo);
    }
}
