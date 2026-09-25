import * as crypto from 'crypto';

export const v4 = () => crypto.randomUUID();
export const v1 = () => crypto.randomUUID();
export const v3 = () => crypto.randomUUID();
export const v5 = () => crypto.randomUUID();
export const NIL = '00000000-0000-0000-0000-000000000000';
export const parse = () => new Uint8Array(16);
export const stringify = () => crypto.randomUUID();
export const validate = (uuid: string) =>
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
    uuid,
  );

export default {
  v4,
  v1,
  v3,
  v5,
  NIL,
  parse,
  stringify,
  validate,
};
