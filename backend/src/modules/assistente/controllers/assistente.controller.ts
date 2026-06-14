import { Body, Controller, Post, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../../autenticacao/guards/jwt-auth.guard';
import { AssistenteDescricaoAuxiliarDto } from '@project20/shared';
import { AssistenteService } from '../services/assistente.service';

@Controller('assistente')
@UseGuards(JwtAuthGuard)
export class AssistenteController {
  constructor(private readonly assistenteService: AssistenteService) {}

  @Post('auxiliar-descricao')
  auxiliarDescricao(@Body() dto: AssistenteDescricaoAuxiliarDto) {
    return this.assistenteService.auxiliarDescricao(dto);
  }
}
