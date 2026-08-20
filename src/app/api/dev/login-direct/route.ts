import { db } from "@/lib/db";
import { createSession } from "@/lib/session";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { normalizeTenantId } from "@/lib/tenant-resolver-edge";

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  const host = request.headers.get("host") || "";
  const isAllowed = 
    process.env.NODE_ENV !== 'production' || 
    process.env.ENABLE_DEV_ROUTES === 'true' ||
    process.env.NEXT_PUBLIC_STAGING === 'true' ||
    host.includes('localhost') ||
    host.includes('127.0.0.1') ||
    host.includes('test.') ||
    host.includes('stage.') ||
    host.includes('trycloudflare.com');

  if (!isAllowed) {
    return new Response('Not Found', { status: 404 });
  }

  const url = new URL(request.url);

  // 🛡️ SECURITY AUDIT GUARD: Require secret QA key even on dev/staging to prevent unauthorized direct sessions
  const expectedSecret = process.env.QA_SECRET_KEY || 'smmplan_qa_sec_2026_master_key';
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

  // Determine tenant context from query parameter or host
  const tenantParam = url.searchParams.get("tenant");
  const rawTenantId = tenantParam || (host.includes("lovable") || host.includes("flux") ? "flux" : "smmplan");
  const tenantId = normalizeTenantId(rawTenantId) || "smmplan";

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

  const isMasterAdmin = cleanEmail.includes("admin") || cleanEmail.includes("infosokoloff") || cleanEmail.includes("sokolov");

  if (!user) {
    user = await db.user.create({
      data: {
        email: cleanEmail,
        role: isMasterAdmin ? "ADMIN" : "USER",
        tenantId: tenantId
      }
    });
  } else if (isMasterAdmin && user.role !== "ADMIN") {
    user = await db.user.update({
      where: { id: user.id },
      data: { role: "ADMIN" }
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

  cookieStore.set('x_tenant', tenantId, {
    httpOnly: false, // Must match middleware — QA Dock reads this client-side
    secure: false,
    expires: expiresAt,
    sameSite: 'lax',
    path: '/',
  });

  // Redirect
  const redirectParam = url.searchParams.get("redirect");
  if (redirectParam && redirectParam.startsWith("/")) {
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
