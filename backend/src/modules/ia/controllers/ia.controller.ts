import { Controller, Get } from '@nestjs/common';
import { AdministradorOnly } from '../../autenticacao/decorators/administrador-only.decorator';
import { IaService } from '../services/ia.service';

/** Estado da IA: o completo é do administrador (tela de configurações); a disponibilidade é de qualquer usuário (chat e fallback). */
@Controller('ia')
export class IaController {
  constructor(private readonly iaService: IaService) {}

  @AdministradorOnly()
  @Get('estado')
  recuperarEstado() {
    return this.iaService.recuperarEstado();
  }

  /** Só o `EstadoIaEnum` (desligada, fora do ar, no ar): nenhum dado de configuração. Para qualquer usuário autenticado. */
  @Get('disponibilidade')
  recuperarDisponibilidade() {
    return this.iaService.recuperarEstado();
  }
}
