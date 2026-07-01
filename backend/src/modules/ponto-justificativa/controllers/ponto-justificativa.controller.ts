import {
  Controller,
  Get,
  Post,
  Delete,
  Body,
  Query,
  Param,
  ParseIntPipe,
  UseGuards,
} from '@nestjs/common';
import { JwtAuthGuard } from '../../autenticacao/guards/jwt-auth.guard';
import { GestorOnly } from '../../autenticacao/decorators/gestor-only.decorator';
import { ActiveUser } from '../../autenticacao/decorators/active-user.decorator';
import { JwtPayload } from '../../autenticacao/domain/interfaces/jwt-payload.interface';
import { PontoJustificativaService } from '../services/ponto-justificativa.service';
import { PontoJustificativaCriarDto, PontoJustificativaListarDto } from '@project20/shared';

@Controller('ponto-justificativa')
@UseGuards(JwtAuthGuard)
@GestorOnly()
export class PontoJustificativaController {
  constructor(private readonly pontoJustificativaService: PontoJustificativaService) {}

  @Post()
  criar(@Body() dto: PontoJustificativaCriarDto, @ActiveUser() usuarioAtivo: JwtPayload) {
    return this.pontoJustificativaService.criar(dto, usuarioAtivo);
  }

  @Get()
  listar(@Query() dto: PontoJustificativaListarDto) {
    return this.pontoJustificativaService.listar(dto);
  }

  @Delete(':id')
  excluir(@Param('id', ParseIntPipe) id: number) {
    return this.pontoJustificativaService.excluir({ id });
  }
}
