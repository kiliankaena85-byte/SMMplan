import nodemailer from 'nodemailer';

export async function sendMagicLink(email: string, token: string) {
  // Имитация отправки для проверки
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
  const link = `${baseUrl}/api/auth/verify?token=${token}`;

  if (!process.env.SMTP_HOST) {
    if (process.env.NODE_ENV === 'production') {
      console.error(`[SMTP] Error: Cannot send email to ${email} - SMTP_HOST is missing.`);
      return;
    }
    console.warn('⚠️ SMTP_HOST is not set. Magic link printed to console only.');
    console.log('------------ MAGIC LINK ------------');
    console.log(`To: ${email}`);
    console.log(`Link: ${link}`);
    console.log('------------------------------------');
    return;
  }

  const transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: Number(process.env.SMTP_PORT) || 465,
    secure: true,
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASSWORD,
    },
  });

  const htmlContent = `
    <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; background: #ffffff; padding: 24px; border-radius: 12px; border: 1px solid #e4e4e7;">
      <h2 style="color: #18181b;">Вход в SMMplan Lite</h2>
      <p style="color: #71717a; line-height: 1.5;">Вы запросили ссылку для входа. Нажмите на кнопку ниже, чтобы войти в аккаунт. Ссылка действительна 15 минут.</p>
      <div style="margin-top: 32px; text-align: center;">
        <a href="${link}" style="background-color: #18181b; color: #ffffff; padding: 12px 24px; text-decoration: none; border-radius: 8px; font-weight: 500; display: inline-block;">
          Войти в панель
        </a>
      </div>
      <p style="margin-top: 32px; font-size: 12px; color: #a1a1aa;">Если вы не запрашивали письмо, проигнорируйте его.</p>
    </div>
  `;

  await transporter.sendMail({
    from: `"SMMplan Support" <${process.env.SMTP_USER}>`,
    to: email,
    subject: 'Ваша ссылка для входа',
    html: htmlContent,
  });
}

export async function sendMail(email: string, subject: string, htmlContent: string) {
  if (!process.env.SMTP_HOST) {
    if (process.env.NODE_ENV === 'production') {
      console.error(`[SMTP] Error: Cannot send email to ${email} - SMTP_HOST is missing.`);
      return;
    }
    console.warn('⚠️ SMTP_HOST is not set. Email printed to console only.');
    console.log(`[EMAIL to ${email}] ${subject}:`);
    console.log(htmlContent);
    return;
  }

  const transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: Number(process.env.SMTP_PORT) || 465,
    secure: true,
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASSWORD,
    },
  });

  await transporter.sendMail({
    from: `"SMMplan Support" <${process.env.SMTP_USER}>`,
    to: email,
    subject,
    html: htmlContent,
  });
}

export async function sendWelcomeLetter(email: string) {
  const htmlContent = `
    <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; background: #ffffff; padding: 24px; border-radius: 12px; border: 1px solid #e4e4e7;">
      <h2 style="color: #18181b;">Добро пожаловать в Smmplan! 🎉</h2>
      <p style="color: #71717a; line-height: 1.5;">Спасибо за регистрацию в нашем сервисе! Мы предоставляем качественное продвижение в социальных сетях.</p>
      <div style="margin-top: 32px; padding: 16px; background-color: #f4f4f5; border-radius: 8px;">
        <h4 style="margin-top: 0; color: #18181b;">Ваши преимущества:</h4>
        <ul style="color: #71717a; padding-left: 20px;">
          <li>Сотни услуг для всех популярных соцсетей</li>
          <li>Быстрый старт заказов — от 5 минут</li>
          <li>Реферальная программа — платим 15% с заказов друзей</li>
        </ul>
      </div>
      <p style="margin-top: 32px; font-size: 14px; color: #71717a;">Пополняйте баланс и запускайте накрутку прямо сейчас!</p>
    </div>
  `;
  return sendMail(email, 'Добро пожаловать в Smmplan!', htmlContent);
}

export async function sendOrderCompletedMail(email: string, orderId: string, serviceName: string) {
  const htmlContent = `
    <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; background: #ffffff; padding: 24px; border-radius: 12px; border: 1px solid #e4e4e7;">
      <h2 style="color: #10b981;">Заказ #<span>${orderId}</span> выполнен! ✅</h2>
      <p style="color: #71717a; line-height: 1.5;">Ваш заказ на услугу <strong>${serviceName}</strong> был успешно выполнен.</p>
      <div style="margin-top: 32px; text-align: center;">
        <a href="${process.env.NEXT_PUBLIC_APP_URL || 'https://smmplan.ru'}/dashboard/orders" style="background-color: #18181b; color: #ffffff; padding: 12px 24px; text-decoration: none; border-radius: 8px; font-weight: 500; display: inline-block;">
          Посмотреть мои заказы
        </a>
      </div>
    </div>
  `;
  return sendMail(email, `Ваш заказ #${orderId} выполнен!`, htmlContent);
}
