"use strict";
var __create = Object.create;
var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __getProtoOf = Object.getPrototypeOf;
var __hasOwnProp = Object.prototype.hasOwnProperty;
var __copyProps = (to, from, except, desc) => {
  if (from && typeof from === "object" || typeof from === "function") {
    for (let key of __getOwnPropNames(from))
      if (!__hasOwnProp.call(to, key) && key !== except)
        __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
  }
  return to;
};
var __toESM = (mod, isNodeMode, target) => (target = mod != null ? __create(__getProtoOf(mod)) : {}, __copyProps(
  // If the importer is in node compatibility mode or this is not an ESM
  // file that has been converted to a CommonJS file using a Babel-
  // compatible transform (i.e. "__esModule" has not been set), then set
  // "default" to the CommonJS "module.exports" for node compatibility.
  isNodeMode || !mod || !mod.__esModule ? __defProp(target, "default", { value: mod, enumerable: true }) : target,
  mod
));

// prisma/seed.ts
var import_client = require("@prisma/client");

// src/lib/auth/password.ts
var import_crypto = __toESM(require("crypto"));
var COST_N = 65536;
var KEY_LEN = 64;
var MAX_MEM = 128 * 1024 * 1024;
function scryptAsync(password, salt, keylen, options) {
  return new Promise((resolve, reject) => {
    import_crypto.default.scrypt(password, salt, keylen, options, (err, derivedKey) => {
      if (err) reject(err);
      else resolve(derivedKey);
    });
  });
}
async function hashPassword(password) {
  const salt = import_crypto.default.randomBytes(16).toString("hex");
  const derivedKey = await scryptAsync(password, salt, KEY_LEN, { N: COST_N, r: 8, p: 1, maxmem: MAX_MEM });
  return `$s2$${COST_N}$${salt}$${derivedKey.toString("hex")}`;
}

// src/lib/crypto/encryption.ts
var import_crypto2 = require("crypto");
var ALGORITHM = "aes-256-gcm";
var IV_LENGTH = 16;
var DEFAULT_KEY_VERSION = "v1";
function deriveKeyBuffer(secret) {
  if (secret.length === 64 && /^[0-9a-fA-F]+$/.test(secret)) {
    return Buffer.from(secret, "hex");
  }
  return (0, import_crypto2.createHash)("sha256").update(secret).digest();
}
function getKeyRegistry() {
  const keysMap = /* @__PURE__ */ new Map();
  let primaryVersion = DEFAULT_KEY_VERSION;
  const multiKeysStr = process.env.APP_ENCRYPTION_KEYS;
  if (multiKeysStr && multiKeysStr.trim()) {
    const entries = multiKeysStr.split(",").map((e) => e.trim()).filter(Boolean);
    let isFirst = true;
    for (const entry of entries) {
      const colonIdx = entry.indexOf(":");
      if (colonIdx === -1) {
        throw new Error(`[Encryption] Malformed APP_ENCRYPTION_KEYS entry "${entry}". Expected format "vX:secret"`);
      }
      const version = entry.substring(0, colonIdx).trim().toLowerCase();
      const secret = entry.substring(colonIdx + 1).trim();
      if (!version || !secret) {
        throw new Error(`[Encryption] Empty version or secret in APP_ENCRYPTION_KEYS entry "${entry}"`);
      }
      keysMap.set(version, deriveKeyBuffer(secret));
      if (isFirst) {
        primaryVersion = version;
        isFirst = false;
      }
    }
  }
  const singleKeyStr = process.env.APP_ENCRYPTION_KEY || process.env.DATA_ENCRYPTION_KEY || process.env.VAULT_MASTER_KEY;
  if (singleKeyStr) {
    const singleBuffer = deriveKeyBuffer(singleKeyStr);
    if (!keysMap.has(DEFAULT_KEY_VERSION)) {
      keysMap.set(DEFAULT_KEY_VERSION, singleBuffer);
    }
    if (keysMap.size === 1) {
      primaryVersion = DEFAULT_KEY_VERSION;
    }
  }
  if (keysMap.size === 0) {
    throw new Error("[Encryption] APP_ENCRYPTION_KEY, APP_ENCRYPTION_KEYS or DATA_ENCRYPTION_KEY must be configured in environment");
  }
  if (process.env.NODE_ENV === "production") {
    const rawKey = singleKeyStr || "";
    if (rawKey.includes("CHANGE_ME") || rawKey.includes("GENERATE_WITH") || rawKey.includes("INSECURE")) {
      throw new Error("FATAL [SECURITY]: Insecure default APP_ENCRYPTION_KEY placeholder detected in production environment!");
    }
  }
  return { primaryVersion, keys: keysMap };
}
var getKeyForVersion = (version) => {
  const registry = getKeyRegistry();
  if (!version) {
    const key2 = registry.keys.get(registry.primaryVersion);
    if (!key2) {
      throw new Error(`[Encryption] Primary key version "${registry.primaryVersion}" not found in key registry`);
    }
    return { key: key2, version: registry.primaryVersion };
  }
  const key = registry.keys.get(version.toLowerCase());
  if (!key) {
    throw new Error(`[Encryption] Encryption key version "${version}" not found in key registry. Please configure it in APP_ENCRYPTION_KEYS.`);
  }
  return { key, version };
};
function encrypt(text, forcedVersion) {
  if (!text || typeof text !== "string") return text;
  const iv = (0, import_crypto2.randomBytes)(IV_LENGTH);
  const { key, version } = getKeyForVersion(forcedVersion);
  const cipher = (0, import_crypto2.createCipheriv)(ALGORITHM, key, iv);
  let encrypted = cipher.update(text, "utf8", "hex");
  encrypted += cipher.final("hex");
  const authTag = cipher.getAuthTag().toString("hex");
  return `${version}:${iv.toString("hex")}:${authTag}:${encrypted}`;
}

// prisma/seed.ts
var import_crypto3 = require("crypto");
if (process.env.NODE_ENV === "production") {
  console.error("\u274C FATAL: seed.ts cannot run in production! NODE_ENV=production detected.");
  console.error("   This script is for development/testing only.");
  process.exit(1);
}
var prisma = new import_client.PrismaClient();
async function ensureSeedLedger(userId, amount) {
  if (amount <= 0) return;
  const idempotencyKey = `seed-ledger-user-${userId}`;
  const existing = await prisma.ledgerEntry.findFirst({ where: { idempotencyKey } });
  if (existing) return;
  await prisma.ledgerEntry.create({
    data: {
      userId,
      amount,
      reason: "Initial Seed Balance",
      transactionType: "DEPOSIT",
      idempotencyKey
    }
  });
}
async function main() {
  console.log("Seeding Database...");
  const tenants = [
    { id: "smmplan", name: "SMMplan", slug: "smmplan", domain: "smmplan.pro" },
    { id: "flux", name: "SMMflux", slug: "flux", domain: "smmflux.ru" }
  ];
  for (const t of tenants) {
    await prisma.tenant.upsert({
      where: { id: t.id },
      update: { name: t.name, slug: t.slug, domain: t.domain },
      create: { id: t.id, name: t.name, slug: t.slug, domain: t.domain, isActive: true }
    });
    await prisma.systemSettings.upsert({
      where: { id: t.id },
      update: {},
      create: {
        id: t.id,
        taxRate: 6,
        opexMonthly: 0,
        maintenanceMode: false,
        isTestMode: true,
        siteName: t.name,
        siteDescription: `${t.name} Production Platform`
      }
    });
  }
  console.log("Upserted Tenants and SystemSettings");
  const provider = await prisma.provider.upsert({
    where: { name: "Vexboost" },
    update: {
      ticketUrl: "https://vexboost.ru/tickets/"
    },
    create: {
      name: "Vexboost",
      apiUrl: "https://vexboost.ru/api/v2/",
      apiKey: encrypt(process.env.VEXBOOST_API_KEY || "dummy_key"),
      isActive: true,
      ticketUrl: "https://vexboost.ru/tickets/"
    }
  });
  console.log("Upserted Provider Vexboost");
  const adminRawId = process.env.SEED_ADMIN_EMAIL || "admin@example.com";
  let adminUser = await prisma.user.findFirst({ where: { email: adminRawId } });
  if (adminUser) {
    adminUser = await prisma.user.update({
      where: { id: adminUser.id },
      data: { role: "OWNER", balance: 1e7 }
    });
  } else {
    adminUser = await prisma.user.create({
      data: {
        email: adminRawId,
        role: "OWNER",
        balance: 1e7
      }
    });
  }
  await ensureSeedLedger(adminUser.id, 1e7);
  console.log(`Upserted Admin User (OWNER): ${adminRawId}`);
  const testAdminEmail = "admin@smmplan.test";
  const testAdminHash = await hashPassword(process.env.SEED_ADMIN_PASSWORD || (0, import_crypto3.randomBytes)(16).toString("hex"));
  let testAdminUser = await prisma.user.findFirst({ where: { email: testAdminEmail } });
  if (testAdminUser) {
    testAdminUser = await prisma.user.update({
      where: { id: testAdminUser.id },
      data: { passwordHash: testAdminHash, role: "OWNER", balance: 2e7 }
    });
  } else {
    testAdminUser = await prisma.user.create({
      data: { email: testAdminEmail, passwordHash: testAdminHash, role: "OWNER", balance: 2e7 }
    });
  }
  await ensureSeedLedger(testAdminUser.id, 2e7);
  console.log(`Upserted Test Admin: ${testAdminEmail}`);
  const testClientEmail = "client@smmplan.test";
  const testClientHash = await hashPassword(process.env.SEED_CLIENT_PASSWORD || (0, import_crypto3.randomBytes)(16).toString("hex"));
  let testClientUser = await prisma.user.findFirst({ where: { email: testClientEmail } });
  if (testClientUser) {
    testClientUser = await prisma.user.update({
      where: { id: testClientUser.id },
      data: { passwordHash: testClientHash, role: "USER", balance: 5e7, telegramId: "123456789" }
    });
  } else {
    testClientUser = await prisma.user.create({
      data: { email: testClientEmail, passwordHash: testClientHash, role: "USER", balance: 5e7, telegramId: "123456789" }
    });
  }
  await ensureSeedLedger(testClientUser.id, 5e7);
  console.log(`Upserted Test Client: ${testClientEmail}`);
  const defaultCatalogData = [
    {
      network: { name: "Telegram", slug: "telegram", icon: "telegram", sort: 1 },
      categories: [
        {
          name: "\u041F\u043E\u0434\u043F\u0438\u0441\u0447\u0438\u043A\u0438",
          slug: "telegram-subscribers",
          services: [
            { name: "Telegram \u041F\u043E\u0434\u043F\u0438\u0441\u0447\u0438\u043A\u0438 (\u0411\u044B\u0441\u0442\u0440\u044B\u0435, \u041C\u0438\u043A\u0441)", rate: 0.15, markup: 3, minQty: 100, maxQty: 5e4, externalId: "tg_sub_fast", targetType: "CHANNEL" },
            { name: "Telegram \u041F\u043E\u0434\u043F\u0438\u0441\u0447\u0438\u043A\u0438 (\u0416\u0438\u0432\u044B\u0435 \u0421\u041D\u0413 / \u0411\u0435\u0437 \u043E\u0442\u043F\u0438\u0441\u043E\u043A)", rate: 0.35, markup: 3, minQty: 50, maxQty: 2e4, externalId: "tg_sub_real", targetType: "CHANNEL" }
          ]
        },
        {
          name: "\u041F\u0440\u043E\u0441\u043C\u043E\u0442\u0440\u044B",
          slug: "telegram-views",
          services: [
            { name: "Telegram \u041F\u0440\u043E\u0441\u043C\u043E\u0442\u0440\u044B \u043D\u0430 \u043F\u043E\u0441\u0442 (\u041C\u043E\u043C\u0435\u043D\u0442\u0430\u043B\u044C\u043D\u044B\u0435)", rate: 5e-3, markup: 3, minQty: 100, maxQty: 1e5, externalId: "tg_views_fast", targetType: "POST" },
            { name: "Telegram \u0410\u0432\u0442\u043E\u043F\u0440\u043E\u0441\u043C\u043E\u0442\u0440\u044B \u043D\u0430 10 \u043F\u043E\u0441\u0442\u043E\u0432", rate: 0.05, markup: 3, minQty: 100, maxQty: 5e4, externalId: "tg_views_auto", targetType: "POST" }
          ]
        },
        {
          name: "\u0420\u0435\u0430\u043A\u0446\u0438\u0438",
          slug: "telegram-reactions",
          services: [
            { name: "Telegram \u0420\u0435\u0430\u043A\u0446\u0438\u0438 (\u041F\u043E\u0437\u0438\u0442\u0438\u0432\u043D\u044B\u0435 \u{1F525}\u{1F44D}\u2764\uFE0F)", rate: 0.02, markup: 3, minQty: 50, maxQty: 5e4, externalId: "tg_react_pos", targetType: "POST" }
          ]
        }
      ]
    },
    {
      network: { name: "\u0412\u041A\u043E\u043D\u0442\u0430\u043A\u0442\u0435", slug: "vk", icon: "vk", sort: 2 },
      categories: [
        {
          name: "\u041F\u043E\u0434\u043F\u0438\u0441\u0447\u0438\u043A\u0438",
          slug: "vk-subscribers",
          services: [
            { name: "VK \u041F\u043E\u0434\u043F\u0438\u0441\u0447\u0438\u043A\u0438 \u0432 \u0441\u043E\u043E\u0431\u0449\u0435\u0441\u0442\u0432\u043E (\u0421\u041D\u0413, \u0411\u0435\u0437\u043E\u043F\u0430\u0441\u043D\u044B\u0435)", rate: 0.25, markup: 3, minQty: 100, maxQty: 25e3, externalId: "vk_sub_group", targetType: "GROUP" }
          ]
        },
        {
          name: "\u041B\u0430\u0439\u043A\u0438",
          slug: "vk-likes",
          services: [
            { name: "VK \u041B\u0430\u0439\u043A\u0438 \u043D\u0430 \u043F\u043E\u0441\u0442", rate: 0.05, markup: 3, minQty: 50, maxQty: 1e4, externalId: "vk_likes", targetType: "POST" }
          ]
        },
        {
          name: "\u041F\u0440\u043E\u0441\u043C\u043E\u0442\u0440\u044B",
          slug: "vk-views",
          services: [
            { name: "VK \u041F\u0440\u043E\u0441\u043C\u043E\u0442\u0440\u044B \u0437\u0430\u043F\u0438\u0441\u0435\u0439 / \u043A\u043B\u0438\u043F\u043E\u0432", rate: 0.01, markup: 3, minQty: 100, maxQty: 1e5, externalId: "vk_views", targetType: "POST" }
          ]
        }
      ]
    },
    {
      network: { name: "YouTube", slug: "youtube", icon: "youtube", sort: 3 },
      categories: [
        {
          name: "\u041F\u043E\u0434\u043F\u0438\u0441\u0447\u0438\u043A\u0438",
          slug: "youtube-subscribers",
          services: [
            { name: "YouTube \u041F\u043E\u0434\u043F\u0438\u0441\u0447\u0438\u043A\u0438 \u043D\u0430 \u043A\u0430\u043D\u0430\u043B (\u0413\u0430\u0440\u0430\u043D\u0442\u0438\u044F 30 \u0434\u043D\u0435\u0439)", rate: 1.5, markup: 3, minQty: 50, maxQty: 1e4, externalId: "yt_subs_guar", targetType: "PROFILE" }
          ]
        },
        {
          name: "\u041F\u0440\u043E\u0441\u043C\u043E\u0442\u0440\u044B",
          slug: "youtube-views",
          services: [
            { name: "YouTube \u041F\u0440\u043E\u0441\u043C\u043E\u0442\u0440\u044B \u0441 \u0443\u0434\u0435\u0440\u0436\u0430\u043D\u0438\u0435\u043C (High Retention)", rate: 0.4, markup: 3, minQty: 500, maxQty: 5e5, externalId: "yt_views_hr", targetType: "VIDEO" }
          ]
        },
        {
          name: "\u041B\u0430\u0439\u043A\u0438",
          slug: "youtube-likes",
          services: [
            { name: "YouTube \u041B\u0430\u0439\u043A\u0438 \u043D\u0430 \u0432\u0438\u0434\u0435\u043E / Shorts", rate: 0.1, markup: 3, minQty: 50, maxQty: 25e3, externalId: "yt_likes", targetType: "VIDEO" }
          ]
        }
      ]
    },
    {
      network: { name: "Instagram", slug: "instagram", icon: "instagram", sort: 4 },
      categories: [
        {
          name: "\u041F\u043E\u0434\u043F\u0438\u0441\u0447\u0438\u043A\u0438",
          slug: "instagram-followers",
          services: [
            { name: "Instagram \u041F\u043E\u0434\u043F\u0438\u0441\u0447\u0438\u043A\u0438 (\u0411\u044B\u0441\u0442\u0440\u044B\u0439 \u0441\u0442\u0430\u0440\u0442)", rate: 0.18, markup: 3, minQty: 100, maxQty: 5e4, externalId: "ig_fol_fast", targetType: "PROFILE" }
          ]
        },
        {
          name: "\u041B\u0430\u0439\u043A\u0438",
          slug: "instagram-likes",
          services: [
            { name: "Instagram \u041B\u0430\u0439\u043A\u0438 \u043D\u0430 \u0444\u043E\u0442\u043E / Reels", rate: 0.03, markup: 3, minQty: 50, maxQty: 25e3, externalId: "ig_likes_fast", targetType: "POST" }
          ]
        },
        {
          name: "\u041F\u0440\u043E\u0441\u043C\u043E\u0442\u0440\u044B",
          slug: "instagram-views",
          services: [
            { name: "Instagram \u041F\u0440\u043E\u0441\u043C\u043E\u0442\u0440\u044B Reels / \u0412\u0438\u0434\u0435\u043E", rate: 8e-3, markup: 3, minQty: 100, maxQty: 1e5, externalId: "ig_views_reels", targetType: "POST" }
          ]
        }
      ]
    },
    {
      network: { name: "TikTok", slug: "tiktok", icon: "tiktok", sort: 5 },
      categories: [
        {
          name: "\u041F\u043E\u0434\u043F\u0438\u0441\u0447\u0438\u043A\u0438",
          slug: "tiktok-followers",
          services: [
            { name: "TikTok \u041F\u043E\u0434\u043F\u0438\u0441\u0447\u0438\u043A\u0438 (\u0411\u044B\u0441\u0442\u0440\u044B\u0439 \u0441\u0442\u0430\u0440\u0442)", rate: 0.3, markup: 3, minQty: 50, maxQty: 2e4, externalId: "tt_sub_fast", targetType: "PROFILE" }
          ]
        },
        {
          name: "\u041F\u0440\u043E\u0441\u043C\u043E\u0442\u0440\u044B",
          slug: "tiktok-views",
          services: [
            { name: "TikTok \u041F\u0440\u043E\u0441\u043C\u043E\u0442\u0440\u044B \u0432\u0438\u0434\u0435\u043E (\u041C\u043E\u043B\u043D\u0438\u0435\u043D\u043E\u0441\u043D\u044B\u0435)", rate: 8e-3, markup: 3, minQty: 200, maxQty: 1e6, externalId: "tt_views_fast", targetType: "VIDEO" }
          ]
        },
        {
          name: "\u041B\u0430\u0439\u043A\u0438",
          slug: "tiktok-likes",
          services: [
            { name: "TikTok \u041B\u0430\u0439\u043A\u0438 (\u0412\u044B\u0441\u043E\u043A\u043E\u0435 \u043A\u0430\u0447\u0435\u0441\u0442\u0432\u043E)", rate: 0.12, markup: 3, minQty: 50, maxQty: 2e4, externalId: "tt_likes", targetType: "VIDEO" }
          ]
        }
      ]
    }
  ];
  for (const item of defaultCatalogData) {
    let nw = await prisma.network.findFirst({ where: { slug: item.network.slug } });
    if (!nw) {
      nw = await prisma.network.create({
        data: {
          name: item.network.name,
          slug: item.network.slug,
          icon: item.network.icon,
          tenantId: "all",
          isActive: true,
          sort: item.network.sort
        }
      });
      console.log(`Created Network: ${item.network.name}`);
    } else {
      nw = await prisma.network.update({
        where: { id: nw.id },
        data: { isActive: true, tenantId: "all", sort: item.network.sort }
      });
    }
    for (const cat of item.categories) {
      let category = await prisma.category.findFirst({ where: { slug: cat.slug } });
      if (!category) {
        category = await prisma.category.create({
          data: {
            name: cat.name,
            slug: cat.slug,
            tenantId: "all",
            network: { connect: { id: nw.id } }
          }
        });
        console.log(`  Created Category: ${cat.name}`);
      } else {
        category = await prisma.category.update({
          where: { id: category.id },
          data: { name: cat.name, network: { connect: { id: nw.id } }, tenantId: "all" }
        });
      }
      for (const srv of cat.services) {
        let service = await prisma.service.findFirst({ where: { externalId: srv.externalId } });
        const pricePer1000Cents = Math.round(srv.rate * srv.markup * 1e4);
        if (!service) {
          service = await prisma.service.create({
            data: {
              name: srv.name,
              category: { connect: { id: category.id } },
              provider: { connect: { id: provider.id } },
              rate: srv.rate,
              markup: srv.markup,
              pricePer1000Cents,
              minQty: srv.minQty,
              maxQty: srv.maxQty,
              externalId: srv.externalId,
              targetType: srv.targetType,
              tenantId: "all",
              isActive: true,
              isQuarantined: false
            }
          });
          console.log(`    Created Service: ${srv.name}`);
        } else {
          await prisma.service.update({
            where: { id: service.id },
            data: {
              name: srv.name,
              category: { connect: { id: category.id } },
              targetType: srv.targetType,
              tenantId: "all",
              isActive: true,
              isQuarantined: false,
              cooldownReason: null,
              cooldownUntil: null
            }
          });
        }
      }
    }
  }
  const existingPayments = await prisma.payment.count();
  if (existingPayments === 0 && process.env.NODE_ENV !== "production") {
    console.log("Generating dummy dashboard data [TEST_DATA]...");
    const users = [];
    for (let i = 1; i <= 3; i++) {
      let u = await prisma.user.findFirst({ where: { email: `testclient${i}@example.com` } });
      if (u) {
        u = await prisma.user.update({ where: { id: u.id }, data: { balance: 5e5 } });
      } else {
        u = await prisma.user.create({ data: { email: `testclient${i}@example.com`, role: "USER", balance: 5e5 } });
      }
      await ensureSeedLedger(u.id, 5e5);
      users.push(u);
    }
    for (let i = 0; i < 10; i++) {
      await prisma.payment.create({
        data: {
          userId: users[i % 3].id,
          amount: Math.floor(Math.random() * 5e5) + 1e5,
          gateway: "yookassa",
          status: "SUCCEEDED",
          createdAt: new Date(Date.now() - Math.floor(Math.random() * 2592e6))
        }
      });
    }
    const statuses = ["COMPLETED", "CANCELED", "IN_PROGRESS", "PENDING", "ERROR"];
    const firstService = await prisma.service.findFirst();
    for (let i = 0; i < 50; i++) {
      const status = statuses[Math.floor(Math.random() * statuses.length)];
      await prisma.order.create({
        data: {
          userId: users[i % 3].id,
          serviceId: firstService ? firstService.id : "1",
          externalId: `ext_${Date.now()}_${i}`,
          link: "https://instagram.com/p/test",
          quantity: 1e3,
          charge: 1500,
          providerCost: 500,
          remains: status === "CANCELED" ? 1e3 : 0,
          status,
          createdAt: new Date(Date.now() - Math.floor(Math.random() * 2592e6))
        }
      });
    }
    console.log("Created Mock Financial Data for Dashboard");
  }
  console.log("Seeding Complete \u2705");
  console.info('\u26A1 Next.js Cache Notice: If you are deploying in production, run "npm run build" again or save settings in Admin Panel to purge stale catalog caches.');
}
main().catch((e) => {
  console.error(e);
  process.exit(1);
}).finally(async () => {
  await prisma.$disconnect();
});
