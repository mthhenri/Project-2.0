import { Controller, Get } from '@nestjs/common';
import { ActiveUser } from '../../autenticacao/decorators/active-user.decorator';
import { JwtPayload } from '../../autenticacao/domain/interfaces/jwt-payload.interface';
import { CheckinSuspensaoService } from '../services/checkin-suspensao.service';

/** Check-in do próprio usuário (qualquer usuário autenticado; nunca o de outro). */
@Controller('checkin')
export class CheckinController {
  constructor(private readonly checkinSuspensaoService: CheckinSuspensaoService) {}

  /** O Electron e a barra superior perguntam se os check-ins estão suspensos. */
  @Get('suspensao')
  consultarSuspensao(@ActiveUser() usuarioAtivo: JwtPayload) {
    return {
      sucesso: true,
      dados: this.checkinSuspensaoService.consultar(usuarioAtivo.sub),
      mensagem: 'Suspensão dos check-ins consultada com sucesso',
    };
  }
}
