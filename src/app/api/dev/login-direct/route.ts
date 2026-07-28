import { db } from "@/lib/db";
import { createSession } from "@/lib/session";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { normalizeTenantId } from "@/lib/tenant-resolver";

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  if (process.env.NODE_ENV === 'production' || process.env.ENABLE_DEV_ROUTES !== 'true') {
    return new Response('Not Found', { status: 404 });
  }
  

  const url = new URL(request.url);
  const email = url.searchParams.get("email");

  if (!email) {
    return new Response("Email parameter is required", { status: 400 });
  }

  const cleanEmail = email.toLowerCase();

  // Determine tenant context from query parameter or host
  const host = request.headers.get("host") || "";
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
    httpOnly: true,
    secure: false,
    expires: expiresAt,
    sameSite: 'lax',
    path: '/',
  });

  // Redirect to dashboard
  if (tenantId !== "smmplan") {
    redirect(`/dashboard?tenant=${tenantId}`);
  } else {
    redirect("/dashboard");
  }
}
