import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';

export async function GET(request: Request) {
  // Получаем инстанс куки
  const cookieStore = await cookies();
  
  // Удаляем session_token (основная аутентификация в Smmplan)
  cookieStore.delete('session_token');

  // Генерируем абсолютный URL для редиректа на главную страницу
  // Используем request.url для определения базового домена
  const url = new URL('/', request.url);
  
  // Редирект (307 Temporary Redirect) на главную
  return NextResponse.redirect(url);
}

export async function POST(request: Request) {
  // На случай, если кнопка будет переделана в форму с POST-запросом
  const cookieStore = await cookies();
  cookieStore.delete('session_token');
  
  const url = new URL('/', request.url);
  return NextResponse.redirect(url);
}
