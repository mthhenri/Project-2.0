/* eslint-disable @typescript-eslint/no-explicit-any */
const propertyDecorator =
  (_options?: Record<string, any>) =>
  (_target: object, _key?: string | symbol): void => {};

export const ApiProperty = propertyDecorator;
export const ApiPropertyOptional = propertyDecorator;
