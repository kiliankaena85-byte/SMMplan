// Mock server-only for standalone script execution
const Module = require('module');
const originalRequire = Module.prototype.require;
Module.prototype.require = function(id: string) {
  if (id === 'server-only') return {};
  return originalRequire.apply(this, arguments);
};

require('dotenv').config();

async function main() {
  console.log("=== 1. Testing SettingsProvider.getEmailSettings ===");
  const { SettingsProvider } = await import('../src/lib/settings');
  const { VaultService } = await import('../src/lib/vault');
  const { db } = await import('../src/lib/db');
  const nodemailer = await import('nodemailer');

  const fluxSettings = await SettingsProvider.getEmailSettings('flux');
  const planSettings = await SettingsProvider.getEmailSettings('smmplan');

  console.log("Flux Settings:", {
    emailProvider: fluxSettings.emailProvider,
    smtpHost: fluxSettings.smtpHost,
    smtpPort: fluxSettings.smtpPort,
    smtpUser: fluxSettings.smtpUser,
    hasPass: !!fluxSettings.smtpPassword,
    passLen: fluxSettings.smtpPassword ? fluxSettings.smtpPassword.length : 0,
    supportEmailDomain: fluxSettings.supportEmailDomain
  });

  console.log("Plan Settings:", {
    emailProvider: planSettings.emailProvider,
    smtpHost: planSettings.smtpHost,
    smtpPort: planSettings.smtpPort,
    smtpUser: planSettings.smtpUser,
    hasPass: !!planSettings.smtpPassword,
    passLen: planSettings.smtpPassword ? planSettings.smtpPassword.length : 0,
    supportEmailDomain: planSettings.supportEmailDomain
  });

  console.log("\n=== 2. Testing Transporter for Flux ===");
  const transporterFlux = nodemailer.createTransport({
    host: fluxSettings.smtpHost || '',
    port: fluxSettings.smtpPort || 465,
    secure: fluxSettings.smtpPort === 465,
    auth: {
      user: fluxSettings.smtpUser || '',
      pass: fluxSettings.smtpPassword || '',
    },
    family: 4,
    connectionTimeout: 10000,
    greetingTimeout: 10000,
    socketTimeout: 10000,
  } as any);

  try {
    const verified = await transporterFlux.verify();
    console.log("✅ Flux Transporter verify result:", verified);
  } catch (err: any) {
    console.error("❌ Flux Transporter verify error:", err.message, {
      code: err.code,
      response: err.response,
      responseCode: err.responseCode,
      command: err.command
    });
  }

  console.log("\n=== 3. Testing From-Address and Tenant Details ===");
  const { normalizeTenantId, getTenantHost, getTenantSiteName } = await import('../src/lib/seo-helpers');
  const normTenant = normalizeTenantId('flux');
  const companyName = getTenantSiteName(normTenant);
  const fromEmail = fluxSettings.smtpUser;
  const fromAddress = `"${companyName} Support" <${fromEmail}>`;
  console.log("Normalized Tenant:", normTenant);
  console.log("Company Name:", companyName);
  console.log("From Address:", fromAddress);
  console.log("Support Domain:", getTenantHost(normTenant));

  console.log("\n=== 4. Checking SystemSettings raw values ===");
  const rows = await db.systemSettings.findMany({
    where: { id: { in: ['flux', 'smmplan'] } }
  });
  for (const r of rows) {
    console.log(`Row [${r.id}]:`, {
      siteName: r.siteName,
      contactSupportEmail: r.contactSupportEmail,
      smtpHost: r.smtpHost,
      smtpPort: r.smtpPort,
      smtpUser: r.smtpUser,
      supportEmailDomain: r.supportEmailDomain,
      hasSmtpPasswordRaw: !!r.smtpPassword,
      smtpPasswordRawPrefix: r.smtpPassword ? r.smtpPassword.substring(0, 10) : null
    });
  }

  process.exit(0);
}

main().catch(err => {
  console.error("Fatal error:", err);
  process.exit(1);
});
