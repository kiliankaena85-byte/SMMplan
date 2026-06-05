import { z } from 'zod';
import { handleServerError } from '@/utils/error-handler';

type ServerActionResponse<T> =
  | { success: true; data: T }
  | { success: false; error: string; issues?: string[] };

/**
 * A highly secured wrapper for Server Actions.
 * It validates input using Zod and catches any internal throws
 * (including Prisma errors) so that stack traces never leak to the client.
 */
export async function createSafeAction<TInput, TOutput>(
  schema: z.Schema<TInput> | null,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  input: any,
  handler: (validatedInput: TInput) => Promise<TOutput>
): Promise<ServerActionResponse<TOutput>> {
  try {
    let parsedInput = input as TInput;

    if (schema) {
      const validation = schema.safeParse(input);
      if (!validation.success) {
        const formattedIssues = validation.error.issues.map((i) => i.message);
        return {
          success: false,
          error: formattedIssues.length > 0 ? formattedIssues[0] : 'Ошибка заполнения формы',
          issues: validation.error.issues.map((i) => `${i.path.join('.')}: ${i.message}`),
        };
      }
      parsedInput = validation.data;
    }

    const data = await handler(parsedInput);
    return { success: true, data };
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  } catch (error: any) {
    // 1. Log the full detailed error securely on the server
    console.error('[SAFE_ACTION_ERROR]', {
      name: error.name,
      message: error.message,
      stack: error.stack,
    });

    // 2. Standardize and localize the error for the client (Task 1.2)
    const localized = handleServerError(error);
    return { success: false, error: localized.message };
  }
}
