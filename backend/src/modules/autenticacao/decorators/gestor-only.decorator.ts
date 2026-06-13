import { SetMetadata } from '@nestjs/common';

export const GestorOnly = () => SetMetadata('gestorOnly', true);
