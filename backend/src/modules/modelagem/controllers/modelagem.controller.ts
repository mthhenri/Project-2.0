import { Controller, Get } from '@nestjs/common';
import { ModelagemService } from '../services/modelagem.service';

/** O diagrama da modelagem do banco: qualquer usuário autenticado (sem `@GestorOnly` nem `@AdministradorOnly`). */
@Controller('modelagem')
export class ModelagemController {
  constructor(private readonly modelagemService: ModelagemService) {}

  @Get()
  obterDiagrama() {
    return this.modelagemService.obterDiagrama();
  }
}
