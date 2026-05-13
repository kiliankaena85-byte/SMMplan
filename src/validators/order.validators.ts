import { z } from "zod";

export const orderFormSchema = z.object({
  link: z.string()
    .min(3, "Ссылка слишком короткая")
    .refine(val => !val.includes(' '), "Ссылка не должна содержать пробелов")
    .refine(val => val.includes('.') || val.includes('t.me/'), "Ссылка должна быть корректным URL или username"),
  quantity: z.number()
    .min(10, "Минимум 10 штук")
    .max(1000000, "Максимум 1,000,000 штук за один заказ"),
  email: z.string()
    .email("Введите корректный Email для получения чека"),
  serviceId: z.string().min(1, "Пожалуйста, выберите услугу"),
  customData: z.string().max(5000, "Слишком много текста (макс. 5000 символов)").optional(),
  agreedToTerms: z.boolean().refine(v => v === true, {
    message: "Вы должны согласиться с офертой"
  })
});

type OrderFormData = z.infer<typeof orderFormSchema>;
