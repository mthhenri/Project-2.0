import { TipoUsuarioEnum, TipoUsuarioStatusEnum, UsuarioRecuperadoDto } from '@project20/shared';

/** Usuário autenticado de teste do tipo pedido (todos os campos preenchidos). */
export function criarUsuarioTeste(tipo: TipoUsuarioEnum = TipoUsuarioEnum.DESENVOLVEDOR): UsuarioRecuperadoDto {
  return {
    id: 1,
    login: `${tipo.toLowerCase()}.teste`,
    nomeCompleto: `Usuário ${tipo}`,
    cargoTitulo: 'Cargo de teste',
    tipo,
    status: TipoUsuarioStatusEnum.ATIVO,
    horasDiariasNecessarias: 8,
    createdDate: new Date('2026-01-15T12:00:00.000Z'),
  };
}
