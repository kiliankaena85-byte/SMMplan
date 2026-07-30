export interface LocalizedError {
  code: string;
  message: string;
  originalMessage?: string;
}

/**
 * Maps system, database, authentication, and integration errors to highly clear,
 * Russian-localized messages with unique error codes.
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function handleServerError(error: any): LocalizedError {
  if (!error) {
    return {
      code: 'ERR_UNKNOWN',
      message: 'Произошла неизвестная системная ошибка.'
    };
  }

  const message = typeof error === 'string' ? error : error.message || '';
  const code = error.code || '';

  // 1. Connection / Timeout Errors (Anti-Stall & Network Resilience)
  if (
    message.includes('ConnectTimeoutError') ||
    message.includes('UND_ERR_CONNECT_TIMEOUT') ||
    message.includes('Timeout') ||
    message.includes('timeout')
  ) {
    return {
      code: 'ERR_PROVIDER_TIMEOUT',
      message: `Ошибка: Превышено время ожидания ответа от API провайдера (10 секунд). Сервер провайдера перегружен или недоступен. Пожалуйста, повторите попытку позже.`
    };
  }

  if (
    message.includes('ECONNREFUSED') ||
    message.includes('ENOTFOUND') ||
    message.includes('fetch failed') ||
    message.includes('connect ECONNREFUSED')
  ) {
    return {
      code: 'ERR_PROVIDER_NETWORK',
      message: `Сетевая ошибка: Не удалось установить соединение с сервером провайдера. Пожалуйста, проверьте корректность URL-адреса API в настройках провайдеров или статус сети.`
    };
  }

  // 1.b Wallet Balance Errors
  if (error.name === 'WalletInsufficientFundsError') {
    return {
      code: 'ERR_BUSINESS_LOGIC',
      message: `Недостаточно средств на балансе. Пожалуйста, пополните счет.`
    };
  }
  if (error.name === 'WalletUserNotFoundError') {
    return {
      code: 'ERR_BUSINESS_LOGIC',
      message: `Пользователь не найден. Пожалуйста, авторизуйтесь заново.`
    };
  }
  if (error.name === 'WalletInvalidAmountError') {
    return {
      code: 'ERR_BUSINESS_LOGIC',
      message: `Некорректная сумма операции.`
    };
  }

  // 2. Prisma Database Errors (Serialization / Integrity)
  if (message.includes('PrismaClientKnownRequestError') || code.startsWith('P')) {
    return {
      code: `ERR_DB_ERROR_${code || 'GENERIC'}`,
      message: `Системная ошибка базы данных (Код: ${code || 'PXXXX'}). Операция не может быть завершена для предотвращения повреждения данных. Пожалуйста, обратитесь в службу поддержки.`
    };
  }

  // 3. Auth & Authorization Errors (RBAC Governance)
  if (
    message.includes('Unauthorized') || 
    message.includes('unauthorized') || 
    message.includes('Session expired') ||
    message.includes('Forbidden: User not found')
  ) {
    return {
      code: 'ERR_AUTH_UNAUTHORIZED',
      message: `Ошибка авторизации: Ваша сессия истекла или вы не вошли в систему. Пожалуйста, обновите страницу и авторизуйтесь заново.`
    };
  }

  if (
    message.includes('Forbidden') || 
    message.includes('forbidden') || 
    message.includes('context required') ||
    message.includes('No permissions')
  ) {
    return {
      code: 'ERR_AUTH_FORBIDDEN',
      message: `Ошибка доступа: У вас недостаточно прав для выполнения этой операции (требуются права Владельца или Администратора с соответствующим доступом).`
    };
  }

  // 4. Provider Catalog Format Errors (Cherry-Pick Validation)
  if (message.includes('did not return an array') || message.includes('invalid format')) {
    return {
      code: 'ERR_PROVIDER_FORMAT',
      message: `Ошибка формата: Ответ API провайдера пуст или не соответствует ожидаемому формату каталога SMM-услуг. Проверьте настройки API-ключа.`
    };
  }

  // 5. Next.js Server Action Masking Fallback
  if (message.includes('Internal Server Error during execution')) {
    return {
      code: 'ERR_INTERNAL_SERVER',
      message: `Внутренняя ошибка сервера: Во время выполнения операции на сервере произошел сбой. Пожалуйста, проверьте журналы ошибок (logs) разработчика.`
    };
  }

  // 6. Safe Operational Business Logic Errors (Russian messages thrown by developers)
  if (/[а-яА-ЯёЁ]/.test(message)) {
    return {
      code: 'ERR_BUSINESS_LOGIC',
      message: message.replace(/^\[.*?\]\s*/, '') // Remove existing brackets if they accidentally got injected earlier
    };
  }

  // General Fallback (Task 1.1: Production masking of raw errors)
  const isDev = process.env.NODE_ENV === 'development';
  return {
    code: 'ERR_INTERNAL_SERVER',
    message: `Произошла непредвиденная ошибка на сервере. Мы уже получили отчет о сбое и работаем над исправлением.`,
    originalMessage: isDev ? message : undefined
  };
}
