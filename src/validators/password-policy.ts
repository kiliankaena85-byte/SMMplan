import { z } from 'zod';

const WEAK_PASSWORDS = new Set([
  '123456',
  'qwerty',
  'password',
  '123456789012',
  'password1234',
  'qwertyuiop12',
  '123456789000',
  'smmplan12345',
  'administrator',
  'password12345',
  '1234567890123',
  'superpassword',
  '012345678901',
]);

export const passwordPolicySchema = z.string()
  .min(6, 'Пароль должен быть не менее 6 символов')
  .max(128, 'Пароль не должен превышать 128 символов')
  .refine(val => !WEAK_PASSWORDS.has(val.toLowerCase()), 'Пароль слишком простой или распространенный')
  .refine(val => !/^(.)\1+$/.test(val), 'Пароль не должен состоять из одного повторяющегося символа');
