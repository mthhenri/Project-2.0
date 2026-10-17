import { SetMetadata } from '@nestjs/common';

/** Rota ou controller exclusivo de administrador (o gestor também leva 403). */
export const AdministradorOnly = () => SetMetadata('administradorOnly', true);
