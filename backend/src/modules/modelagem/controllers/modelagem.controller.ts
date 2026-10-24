import { Body, Controller, Delete, Get, Param, ParseIntPipe, Post, Put } from '@nestjs/common';
import { ModelagemGrupoAlterarDto, ModelagemGrupoCriarDto, ModelagemTabelaAlterarDto } from '@project20/shared';
import { GestorOnly } from '../../autenticacao/decorators/gestor-only.decorator';
import { ModelagemService } from '../services/modelagem.service';

/** O diagrama da modelagem do banco: qualquer usuário autenticado vê; só o gestor (e o administrador) altera grupos e posições. */
@Controller('modelagem')
export class ModelagemController {
  constructor(private readonly modelagemService: ModelagemService) {}

  @Get()
  obterDiagrama() {
    return this.modelagemService.obterDiagrama();
  }

  @GestorOnly()
  @Post('grupo')
  criarGrupo(@Body() dto: ModelagemGrupoCriarDto) {
    return this.modelagemService.criarGrupo(dto);
  }

  @GestorOnly()
  @Put('grupo/:id')
  alterarGrupo(@Param('id', ParseIntPipe) id: number, @Body() dto: ModelagemGrupoAlterarDto) {
    return this.modelagemService.alterarGrupo({ ...dto, id });
  }

  @GestorOnly()
  @Delete('grupo/:id')
  excluirGrupo(@Param('id', ParseIntPipe) id: number) {
    return this.modelagemService.excluirGrupo({ id });
  }

  @GestorOnly()
  @Put('tabela/:nome')
  alterarTabela(@Param('nome') nomeTabela: string, @Body() dto: ModelagemTabelaAlterarDto) {
    return this.modelagemService.alterarTabela({ ...dto, nomeTabela });
  }
}
