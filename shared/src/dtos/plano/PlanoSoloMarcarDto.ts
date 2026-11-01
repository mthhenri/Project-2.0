import { IsBoolean } from 'class-validator';

export class PlanoSoloMarcarDto {
    @IsBoolean()
    solo: boolean;
}
