import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  Query,
  ParseIntPipe,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiResponse, ApiQuery } from '@nestjs/swagger';
import { CalendarioService } from '../services/calendario.service';
import { DiaNaoUtilCriarDto, DiaNaoUtilAtualizarDto, CalendarioConsultarDto } from '@project20/shared';
import { GestorOnly } from '../../autenticacao/decorators/gestor-only.decorator';

const DIA_EXEMPLO = {
  id: 1,
  diaData: '2026-12-25',
  descricao: 'Natal',
  tipo: 'FERIADO',
  recorrente: true,
  createdDate: '2026-06-13T12:00:00.000Z',
};

const NAO_AUTORIZADO_EXEMPLO = { sucesso: false, dados: null, mensagem: 'Acesso não autorizado', erros: ['Acesso não autorizado'] };

const NAO_ENCONTRADO_EXEMPLO = { sucesso: false, dados: null, mensagem: 'Dia não útil não encontrado', erros: ['Dia não útil não encontrado'] };

@ApiTags('calendario')
@ApiBearerAuth()
@Controller('calendario')
export class CalendarioController {
  constructor(private readonly calendarioService: CalendarioService) {}

  @ApiOperation({ summary: 'Cadastrar dia não útil (somente gestor)' })
  @ApiResponse({ status: 201, description: 'Dia não útil cadastrado com sucesso', schema: { example: { sucesso: true, dados: DIA_EXEMPLO, mensagem: 'Dia não útil cadastrado com sucesso' } } })
  @ApiResponse({ status: 400, description: 'Dados inválidos', schema: { example: { sucesso: false, dados: null, mensagem: 'Dados inválidos', erros: ['diaData: deve ser uma data válida'] } } })
  @ApiResponse({ status: 401, description: 'Não autenticado', schema: { example: NAO_AUTORIZADO_EXEMPLO } })
  @ApiResponse({ status: 403, description: 'Acesso restrito a gestores', schema: { example: NAO_AUTORIZADO_EXEMPLO } })
  @GestorOnly()
  @Post()
  criar(@Body() dto: DiaNaoUtilCriarDto) {
    return this.calendarioService.criar(dto);
  }

  @ApiOperation({ summary: 'Verificar se uma data é dia útil (qualquer autenticado)' })
  @ApiQuery({ name: 'data', description: 'Data a verificar (formato ISO: YYYY-MM-DD)', example: '2026-12-25' })
  @ApiResponse({ status: 200, description: 'Verificação realizada com sucesso', schema: { example: { sucesso: true, dados: { data: '2026-12-25', ehDiaUtil: false, motivo: 'FERIADO' }, mensagem: 'Verificação de dia útil realizada com sucesso' } } })
  @ApiResponse({ status: 401, description: 'Não autenticado', schema: { example: NAO_AUTORIZADO_EXEMPLO } })
  @Get('verificar')
  verificarDiaUtil(@Query() dto: CalendarioConsultarDto) {
    return this.calendarioService.verificarDiaUtil(dto.data);
  }

  @ApiOperation({ summary: 'Listar dias não úteis (qualquer autenticado)' })
  @ApiResponse({ status: 200, description: 'Dias não úteis listados com sucesso', schema: { example: { sucesso: true, dados: [{ id: 1, diaData: '2026-12-25', descricao: 'Natal', tipo: 'FERIADO', recorrente: true }], mensagem: 'Dias não úteis listados com sucesso' } } })
  @ApiResponse({ status: 401, description: 'Não autenticado', schema: { example: NAO_AUTORIZADO_EXEMPLO } })
  @Get()
  listar() {
    return this.calendarioService.listar();
  }

  @ApiOperation({ summary: 'Recuperar dia não útil por ID (qualquer autenticado)' })
  @ApiResponse({ status: 200, description: 'Dia não útil recuperado com sucesso', schema: { example: { sucesso: true, dados: DIA_EXEMPLO, mensagem: 'Dia não útil recuperado com sucesso' } } })
  @ApiResponse({ status: 401, description: 'Não autenticado', schema: { example: NAO_AUTORIZADO_EXEMPLO } })
  @ApiResponse({ status: 404, description: 'Dia não útil não encontrado', schema: { example: NAO_ENCONTRADO_EXEMPLO } })
  @Get(':id')
  recuperar(@Param('id', ParseIntPipe) id: number) {
    return this.calendarioService.recuperar(id);
  }

  @ApiOperation({ summary: 'Atualizar dia não útil (somente gestor)' })
  @ApiResponse({ status: 200, description: 'Dia não útil atualizado com sucesso', schema: { example: { sucesso: true, dados: { ...DIA_EXEMPLO, descricao: 'Natal — Feriado Nacional' }, mensagem: 'Dia não útil atualizado com sucesso' } } })
  @ApiResponse({ status: 401, description: 'Não autenticado', schema: { example: NAO_AUTORIZADO_EXEMPLO } })
  @ApiResponse({ status: 403, description: 'Acesso restrito a gestores', schema: { example: NAO_AUTORIZADO_EXEMPLO } })
  @ApiResponse({ status: 404, description: 'Dia não útil não encontrado', schema: { example: NAO_ENCONTRADO_EXEMPLO } })
  @GestorOnly()
  @Put(':id')
  atualizar(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: DiaNaoUtilAtualizarDto,
  ) {
    return this.calendarioService.atualizar(id, dto);
  }

  @ApiOperation({ summary: 'Excluir dia não útil via soft delete (somente gestor)' })
  @ApiResponse({ status: 200, description: 'Dia não útil excluído com sucesso', schema: { example: { sucesso: true, dados: null, mensagem: 'Dia não útil excluído com sucesso' } } })
  @ApiResponse({ status: 401, description: 'Não autenticado', schema: { example: NAO_AUTORIZADO_EXEMPLO } })
  @ApiResponse({ status: 403, description: 'Acesso restrito a gestores', schema: { example: NAO_AUTORIZADO_EXEMPLO } })
  @ApiResponse({ status: 404, description: 'Dia não útil não encontrado', schema: { example: NAO_ENCONTRADO_EXEMPLO } })
  @GestorOnly()
  @Delete(':id')
  excluir(@Param('id', ParseIntPipe) id: number) {
    return this.calendarioService.excluir(id);
  }
}
