import { Controller, Get } from '@nestjs/common';
import { AdministradorOnly } from '../../autenticacao/decorators/administrador-only.decorator';
import { IaService } from '../services/ia.service';

/** Só leitura do estado da IA, para a tela de configurações (administrador). O estado para o usuário comum é do bloco 10. */
@AdministradorOnly()
@Controller('ia')
export class IaController {
  constructor(private readonly iaService: IaService) {}

  @Get('estado')
  recuperarEstado() {
    return this.iaService.recuperarEstado();
  }
}
