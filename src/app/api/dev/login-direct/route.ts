import { db } from "@/lib/db";
import { createSession } from "@/lib/session";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  if (process.env.NODE_ENV === 'production') {
    return new Response("Not Allowed in Production", { status: 403 });
  }

  const url = new URL(request.url);
  const email = url.searchParams.get("email");

  if (!email) {
    return new Response("Email parameter is required", { status: 400 });
  }

  const cleanEmail = email.toLowerCase();

  // Determine if tenant is lovable
  const host = request.headers.get("host") || "";
  const isLovable = host.includes("lovable") || url.searchParams.get("tenant") === "lovable";
  const tenantId = isLovable ? "lovable" : "smmplan";

  // Find or create the user for the specific tenant
  let user = await db.user.findUnique({
    where: { 
      email_tenantId: {
        email: cleanEmail,
        tenantId: tenantId
      } 
    }
  });

  if (!user) {
    user = await db.user.create({
      data: {
        email: cleanEmail,
        role: "USER",
        tenantId: tenantId
      }
    });
  }

  // Create session
  const { sessionToken, expiresAt } = await createSession(user.id, true);
  
  const cookieStore = await cookies();
  cookieStore.set('session_token', sessionToken, {
    httpOnly: true,
    secure: false,
    expires: expiresAt,
    sameSite: 'lax',
    path: '/',
  });

  cookieStore.set('x_tenant_override', tenantId, {
    httpOnly: false,
    secure: false,
    expires: expiresAt,
    sameSite: 'lax',
    path: '/',
  });

  // Redirect to dashboard
  if (tenantId === "lovable") {
    redirect("/dashboard?tenant=lovable");
  } else {
    redirect("/dashboard");
  }
}
