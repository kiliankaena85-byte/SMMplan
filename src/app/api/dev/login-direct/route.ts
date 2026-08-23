import { db } from "@/lib/db";
import { createSession } from "@/lib/session";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { normalizeTenantId } from "@/lib/tenant-resolver-edge";

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  // Strict Gate: Never allow in production, require explicit ENABLE_DEV_ROUTES
  const isAllowed = 
    process.env.NODE_ENV !== 'production' && 
    process.env.ENABLE_DEV_ROUTES === 'true';

  if (!isAllowed) {
    return new Response('Not Found', { status: 404 });
  }

  const expectedSecret = process.env.QA_SECRET_KEY;
  if (!expectedSecret) {
    return new Response(JSON.stringify({ 
      error: "Service Unavailable: QA secret key is not configured on the server." 
    }), { 
      status: 503, 
      headers: { "Content-Type": "application/json" } 
    });
  }

  const url = new URL(request.url);
  const providedSecret = url.searchParams.get("secret") || url.searchParams.get("key") || request.headers.get("x-qa-secret");

  if (!providedSecret || providedSecret !== expectedSecret) {
    return new Response(JSON.stringify({ 
      error: "Forbidden: A valid QA secret key is required to access this test endpoint." 
    }), { 
      status: 403, 
      headers: { "Content-Type": "application/json" } 
    });
  }

  const email = url.searchParams.get("email");

  if (!email) {
    return new Response("Email parameter is required", { status: 400 });
  }

  const cleanEmail = email.toLowerCase();

  // Determine tenant context from query parameter
  const tenantParam = url.searchParams.get("tenant");
  const tenantId = normalizeTenantId(tenantParam || "smmplan") || "smmplan";

  // Find or merge user account
  let user = await db.user.findFirst({
    where: { 
      email: cleanEmail,
      tenantId: tenantId === "flux" ? { in: ["lovable", "flux"] } : tenantId
    }
  });

  if (user && user.tenantId === "lovable") {
    user = await db.user.update({
      where: { id: user.id },
      data: { tenantId: "flux" }
    });
  }

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
    secure: process.env.NODE_ENV === 'production',
    expires: expiresAt,
    sameSite: 'lax',
    path: '/',
  });

  cookieStore.set('x_tenant_override', tenantId, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    expires: expiresAt,
    sameSite: 'lax',
    path: '/',
  });

  // Redirect
  const redirectParam = url.searchParams.get("redirect");
  if (redirectParam && redirectParam.startsWith("/") && !redirectParam.startsWith("//") && !redirectParam.startsWith("/\\")) {
    redirect(redirectParam);
  }

  const isStaff = ["OWNER", "ADMIN", "MANAGER", "SUPPORT"].includes(user.role);
  if (isStaff) {
    redirect("/admin/dashboard");
  } else if (tenantId !== "smmplan") {
    redirect(`/dashboard?tenant=${tenantId}`);
  } else {
    redirect("/dashboard");
  }
}
