import { Body, Controller, Get, Put, Query } from '@nestjs/common';
import { IaCustoConsultarDto, IaModeloPrecoAlterarDto } from '@project20/shared';
import { ActiveUser } from '../../autenticacao/decorators/active-user.decorator';
import { AdministradorOnly } from '../../autenticacao/decorators/administrador-only.decorator';
import { JwtPayload } from '../../autenticacao/domain/interfaces/jwt-payload.interface';
import { IaCustoService } from '../services/ia-custo.service';

/** A aba "Custos" das Configurações da IA: só o administrador. */
@Controller('ia-custo')
export class IaCustoController {
  constructor(private readonly iaCustoService: IaCustoService) {}

  @AdministradorOnly()
  @Get()
  consultar(@Query() dto: IaCustoConsultarDto, @ActiveUser() usuarioAtivo: JwtPayload) {
    return this.iaCustoService.consultar(dto, usuarioAtivo);
  }

  @AdministradorOnly()
  @Put('preco')
  alterarPreco(@Body() dto: IaModeloPrecoAlterarDto, @ActiveUser() usuarioAtivo: JwtPayload) {
    return this.iaCustoService.alterarPreco(dto, usuarioAtivo);
  }
}
