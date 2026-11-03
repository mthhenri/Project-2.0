import { Body, Controller, Get, Param, ParseEnumPipe, Put } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { TipoUsuarioAjudaAlterarDto, TipoUsuarioEnum } from '@project20/shared';
import { ActiveUser } from '../../autenticacao/decorators/active-user.decorator';
import { AdministradorOnly } from '../../autenticacao/decorators/administrador-only.decorator';
import { GestorOnly } from '../../autenticacao/decorators/gestor-only.decorator';
import { JwtPayload } from '../../autenticacao/domain/interfaces/jwt-payload.interface';
import { TipoUsuarioAjudaService } from '../services/tipo-usuario-ajuda.service';

@ApiTags('tipo-usuario-ajuda')
@ApiBearerAuth()
@Controller('tipo-usuario-ajuda')
export class TipoUsuarioAjudaController {
    constructor(private readonly ajudaService: TipoUsuarioAjudaService) {}

    @ApiOperation({ summary: 'Listar os textos de ajuda dos tipos de usuário (gestor e administrador)' })
    @GestorOnly()
    @Get()
    listar() {
        return this.ajudaService.listar();
    }

    @ApiOperation({ summary: 'Alterar o texto de ajuda de um tipo de usuário (somente administrador)' })
    @AdministradorOnly()
    @Put(':tipo')
    alterar(
        @Param('tipo', new ParseEnumPipe(TipoUsuarioEnum)) tipo: TipoUsuarioEnum,
        @Body() dto: TipoUsuarioAjudaAlterarDto,
        @ActiveUser() usuarioAtivo: JwtPayload,
    ) {
        return this.ajudaService.alterar({ ...dto, tipo }, usuarioAtivo);
    }
}
