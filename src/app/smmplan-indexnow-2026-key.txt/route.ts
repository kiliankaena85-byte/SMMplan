import { IndexNowService } from '@/services/seo/indexnow.service';

export const dynamic = 'force-dynamic';

export async function GET() {
  const key = IndexNowService.getKey();

  return new Response(key, {
    status: 200,
    headers: {
      'Content-Type': 'text/plain; charset=utf-8',
      'Cache-Control': 'public, max-age=86400, s-maxage=86400',
    },
  });
}
