import { z } from 'zod';
import { passwordPolicySchema } from '@/validators/password-policy';

export const passwordLoginSchema = z.object({
  email: z.string().email('Введите корректный email').max(254, 'Email превышает допустимую длину (максимум 254 символа)'),
  password: z.string().min(1, 'Введите пароль').max(128, 'Пароль превышает допустимую длину (максимум 128 символов)'),
  twoFactorCode: z.string().optional(),
  captchaToken: z.string().optional(),
});

export const passwordRegisterSchema = z.object({
  email: z.string().email('Введите корректный email').max(254, 'Email превышает допустимую длину (максимум 254 символа)'),
  password: passwordPolicySchema,
  captchaToken: z.string().optional(),
});
