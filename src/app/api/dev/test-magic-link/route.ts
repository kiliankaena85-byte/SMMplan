import { requestMagicLink } from "@/actions/auth/request-magic-link";
import { NextResponse } from "next/server";

export async function GET(request: Request) {
  if (process.env.NODE_ENV === 'production') {
    return new NextResponse('Not Found', { status: 404 });
  }
  const url = new URL(request.url);
  const email = url.searchParams.get("email") || "test@example.com";
  
  const fd = new FormData();
  fd.append("email", email);
  
  const res = await requestMagicLink(null, fd);
  return NextResponse.json(res);
}
