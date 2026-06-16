/* eslint-disable @typescript-eslint/no-explicit-any */
const d = (..._args: any[]) => (_target: any, _key?: any): void => {};

export const IsArray      = d;
export const IsBoolean    = d;
export const IsDateString = d;
export const IsEnum       = d;
export const IsIn         = d;
export const IsNotEmpty   = d;
export const IsNumber     = d;
export const IsOptional   = d;
export const IsString     = d;
export const Matches      = d;
export const Max          = d;
export const MaxLength    = d;
export const Min          = d;
export const MinLength    = d;
