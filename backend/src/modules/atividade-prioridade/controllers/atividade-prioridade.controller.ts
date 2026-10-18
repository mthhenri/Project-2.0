import { Body, Controller, Get, Param, ParseEnumPipe, Patch } from '@nestjs/common';
import { AtividadePrioridadeCorAlterarDto, TipoAtividadePrioridadeEnum } from '@project20/shared';
import { ActiveUser } from '../../autenticacao/decorators/active-user.decorator';
import { AdministradorOnly } from '../../autenticacao/decorators/administrador-only.decorator';
import { JwtPayload } from '../../autenticacao/domain/interfaces/jwt-payload.interface';
import { AtividadePrioridadeService } from '../services/atividade-prioridade.service';

/** Prioridades da atividade: leitura para qualquer usuário autenticado; a cor só o administrador altera. */
@Controller('atividade-prioridade')
export class AtividadePrioridadeController {
  constructor(private readonly atividadePrioridadeService: AtividadePrioridadeService) {}

  @Get()
  listar() {
    return this.atividadePrioridadeService.listar();
  }

  @AdministradorOnly()
  @Patch(':codigo')
  alterarCor(
    @Param('codigo', new ParseEnumPipe(TipoAtividadePrioridadeEnum)) codigo: TipoAtividadePrioridadeEnum,
    @Body() dto: AtividadePrioridadeCorAlterarDto,
    @ActiveUser() usuarioAtivo: JwtPayload,
  ) {
    return this.atividadePrioridadeService.alterarCor(codigo, dto, usuarioAtivo);
  }
}
