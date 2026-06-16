/* eslint-disable @typescript-eslint/no-explicit-any */
const noop = (_target: any, _key?: any): void => {};

export const Transform = (
  _fn?: (params: { value: any; key: string; obj: any; type: number }) => any,
  _options?: any,
) => noop;

export const Type = (_fn?: () => any, _options?: any) => noop;
