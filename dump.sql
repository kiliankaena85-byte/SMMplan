--
-- PostgreSQL database dump
--

\restrict lTV7muNSLdWAZl5h4csuTOBLZslvdacaXgOsapxWS10hSBTInSfdn14GFv5SUVC

-- Dumped from database version 15.19
-- Dumped by pg_dump version 15.19

SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;

--
-- Name: public; Type: SCHEMA; Schema: -; Owner: postgres
--

-- *not* creating schema, since initdb creates it


ALTER SCHEMA public OWNER TO postgres;

--
-- Name: SCHEMA public; Type: COMMENT; Schema: -; Owner: postgres
--

COMMENT ON SCHEMA public IS '';


--
-- Name: ArticleStatus; Type: TYPE; Schema: public; Owner: postgres
--

CREATE TYPE public."ArticleStatus" AS ENUM (
    'DRAFT',
    'PUBLISHED'
);


ALTER TYPE public."ArticleStatus" OWNER TO postgres;

--
-- Name: ContentType; Type: TYPE; Schema: public; Owner: postgres
--

CREATE TYPE public."ContentType" AS ENUM (
    'PAGE',
    'ACADEMY_LESSON',
    'GLOSSARY_TERM',
    'NEWS_POST'
);


ALTER TYPE public."ContentType" OWNER TO postgres;

--
-- Name: MessageSender; Type: TYPE; Schema: public; Owner: postgres
--

CREATE TYPE public."MessageSender" AS ENUM (
    'USER',
    'STAFF',
    'INTERNAL'
);


ALTER TYPE public."MessageSender" OWNER TO postgres;

--
-- Name: OptimizationSnapshotStatus; Type: TYPE; Schema: public; Owner: postgres
--

CREATE TYPE public."OptimizationSnapshotStatus" AS ENUM (
    'GENERATED',
    'APPLIED',
    'PARTIALLY_APPLIED',
    'REJECTED',
    'EXPIRED',
    'ARCHIVED'
);


ALTER TYPE public."OptimizationSnapshotStatus" OWNER TO postgres;

--
-- Name: OrderStatus; Type: TYPE; Schema: public; Owner: postgres
--

CREATE TYPE public."OrderStatus" AS ENUM (
    'AWAITING_PAYMENT',
    'PENDING',
    'PENDING_CHECK',
    'PROVISIONING',
    'IN_PROGRESS',
    'COMPLETED',
    'PARTIAL',
    'CANCELED',
    'ERROR',
    'CANCELING'
);


ALTER TYPE public."OrderStatus" OWNER TO postgres;

--
-- Name: RecommendationStatus; Type: TYPE; Schema: public; Owner: postgres
--

CREATE TYPE public."RecommendationStatus" AS ENUM (
    'PENDING',
    'APPROVED',
    'REJECTED',
    'AUTO_APPLIED'
);


ALTER TYPE public."RecommendationStatus" OWNER TO postgres;

--
-- Name: SmartCampaignStatus; Type: TYPE; Schema: public; Owner: postgres
--

CREATE TYPE public."SmartCampaignStatus" AS ENUM (
    'PLANNED',
    'RUNNING',
    'PAUSED',
    'COMPLETED',
    'ERROR'
);


ALTER TYPE public."SmartCampaignStatus" OWNER TO postgres;

--
-- Name: SmartTaskStatus; Type: TYPE; Schema: public; Owner: postgres
--

CREATE TYPE public."SmartTaskStatus" AS ENUM (
    'PLANNED',
    'SENT',
    'COMPLETED',
    'ERROR'
);


ALTER TYPE public."SmartTaskStatus" OWNER TO postgres;

--
-- Name: TelegramBotRole; Type: TYPE; Schema: public; Owner: postgres
--

CREATE TYPE public."TelegramBotRole" AS ENUM (
    'STORE_FULL',
    'SUPPORT_ONLY',
    'NEWS_BROADCAST',
    'STAFF_ADMIN',
    'CUSTOM_BUILDER'
);


ALTER TYPE public."TelegramBotRole" OWNER TO postgres;

--
-- Name: TicketSource; Type: TYPE; Schema: public; Owner: postgres
--

CREATE TYPE public."TicketSource" AS ENUM (
    'WEB',
    'TELEGRAM',
    'EMAIL'
);


ALTER TYPE public."TicketSource" OWNER TO postgres;

--
-- Name: TicketStatus; Type: TYPE; Schema: public; Owner: postgres
--

CREATE TYPE public."TicketStatus" AS ENUM (
    'OPEN',
    'PENDING',
    'CLOSED'
);


ALTER TYPE public."TicketStatus" OWNER TO postgres;

--
-- Name: UsnScheme; Type: TYPE; Schema: public; Owner: postgres
--

CREATE TYPE public."UsnScheme" AS ENUM (
    'INCOME',
    'INCOME_EXPENSES'
);


ALTER TYPE public."UsnScheme" OWNER TO postgres;

SET default_tablespace = '';

SET default_table_access_method = heap;

--
-- Name: AdminAuditLog; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public."AdminAuditLog" (
    id text NOT NULL,
    "tenantId" text DEFAULT 'smmplan'::text,
    "adminId" text NOT NULL,
    "adminEmail" text NOT NULL,
    action text NOT NULL,
    target text NOT NULL,
    "targetType" text NOT NULL,
    "oldValue" text,
    "newValue" text,
    "ipAddress" text,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


ALTER TABLE public."AdminAuditLog" OWNER TO postgres;

--
-- Name: AiPricingRecommendation; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public."AiPricingRecommendation" (
    id text NOT NULL,
    "snapshotId" text NOT NULL,
    "serviceId" text NOT NULL,
    "currentPriceRub" double precision NOT NULL,
    "proposedPriceRub" double precision NOT NULL,
    "currentMarkup" double precision NOT NULL,
    "proposedMarkup" double precision NOT NULL,
    "projectedMonthlyGainRub" double precision DEFAULT 0.0 NOT NULL,
    "confidenceScore" double precision DEFAULT 1.0 NOT NULL,
    status public."RecommendationStatus" DEFAULT 'PENDING'::public."RecommendationStatus" NOT NULL,
    "rejectionReason" text,
    "appliedAt" timestamp(3) without time zone,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL
);


ALTER TABLE public."AiPricingRecommendation" OWNER TO postgres;

--
-- Name: AnalyticsEvent; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public."AnalyticsEvent" (
    id text NOT NULL,
    event text NOT NULL,
    metadata jsonb,
    "sessionId" text,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


ALTER TABLE public."AnalyticsEvent" OWNER TO postgres;

--
-- Name: ApiConfig; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public."ApiConfig" (
    id text NOT NULL,
    "userId" text NOT NULL,
    "isApiEnabled" boolean DEFAULT true NOT NULL,
    "prioritySupport" boolean DEFAULT true NOT NULL,
    "webhookUrl" text,
    "webhookSecret" text,
    "isWebhookActive" boolean DEFAULT false NOT NULL,
    "customLimitCents" integer,
    created_at timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at timestamp(3) without time zone NOT NULL
);


ALTER TABLE public."ApiConfig" OWNER TO postgres;

--
-- Name: Article; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public."Article" (
    id text NOT NULL,
    slug text NOT NULL,
    title text NOT NULL,
    description text NOT NULL,
    content text NOT NULL,
    status public."ArticleStatus" NOT NULL,
    category text NOT NULL,
    "viewCount" integer DEFAULT 0 NOT NULL,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL,
    "authorName" text DEFAULT 'Михаил'::text NOT NULL,
    "authorRole" text DEFAULT 'Системный архитектор прокси-сетей Smmplan'::text NOT NULL,
    priority integer DEFAULT 0 NOT NULL
);


ALTER TABLE public."Article" OWNER TO postgres;

--
-- Name: AuditLog; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public."AuditLog" (
    id text NOT NULL,
    "userId" text NOT NULL,
    action text NOT NULL,
    details text NOT NULL,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


ALTER TABLE public."AuditLog" OWNER TO postgres;

--
-- Name: AuthToken; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public."AuthToken" (
    id text NOT NULL,
    token text NOT NULL,
    "tenantId" text DEFAULT 'smmplan'::text NOT NULL,
    "userId" text NOT NULL,
    used boolean DEFAULT false NOT NULL,
    "usedAt" timestamp(3) without time zone,
    "expiresAt" timestamp(3) without time zone NOT NULL,
    "ipIssued" text,
    "ipUsed" text,
    "userAgentIssued" text,
    "userAgentUsed" text,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


ALTER TABLE public."AuthToken" OWNER TO postgres;

--
-- Name: BalanceAdjustmentPolicy; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public."BalanceAdjustmentPolicy" (
    id text NOT NULL,
    "scopeType" text NOT NULL,
    "staffRoleId" text,
    "userId" text,
    "isActive" boolean DEFAULT true NOT NULL,
    enabled boolean DEFAULT false NOT NULL,
    "canRequestCredit" boolean DEFAULT false NOT NULL,
    "canRequestDebit" boolean DEFAULT false NOT NULL,
    "canApprove" boolean DEFAULT false NOT NULL,
    "canReject" boolean DEFAULT false NOT NULL,
    "canViewAll" boolean DEFAULT false NOT NULL,
    "canViewStats" boolean DEFAULT false NOT NULL,
    "maxCreditPerRequest" bigint DEFAULT 0 NOT NULL,
    "maxDebitPerRequest" bigint DEFAULT 0 NOT NULL,
    "maxCreditPerDay" bigint DEFAULT 0 NOT NULL,
    "maxDebitPerDay" bigint DEFAULT 0 NOT NULL,
    "maxTotalPerDay" bigint DEFAULT 0 NOT NULL,
    "maxApprovalPerRequest" bigint DEFAULT 0 NOT NULL,
    "allowedCreditReasonCodes" jsonb NOT NULL,
    "allowedDebitReasonCodes" jsonb NOT NULL,
    "allowedTargetRoles" jsonb NOT NULL,
    "requireTicket" boolean DEFAULT true NOT NULL,
    "requireOrderForDebit" boolean DEFAULT false NOT NULL,
    "blockBannedTargets" boolean DEFAULT true NOT NULL,
    "blockDeletedTargets" boolean DEFAULT true NOT NULL,
    "autoExecuteBelow" bigint DEFAULT 0 NOT NULL,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL
);


ALTER TABLE public."BalanceAdjustmentPolicy" OWNER TO postgres;

--
-- Name: BonusRedemptionLog; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public."BonusRedemptionLog" (
    id text NOT NULL,
    "userId" text NOT NULL,
    "bonusType" text NOT NULL,
    "amountCents" bigint NOT NULL,
    "paymentFingerprint" text,
    "ipAddress" text,
    "userAgent" text,
    status text DEFAULT 'GRANTED'::text NOT NULL,
    "unlockAt" timestamp(3) without time zone,
    reason text,
    "tenantId" text DEFAULT 'smmplan'::text,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL
);


ALTER TABLE public."BonusRedemptionLog" OWNER TO postgres;

--
-- Name: Category; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public."Category" (
    id text NOT NULL,
    name text NOT NULL,
    slug text NOT NULL,
    "networkId" text,
    "tenantId" text DEFAULT 'smmplan'::text NOT NULL,
    sort integer DEFAULT 0 NOT NULL,
    "activityType" text,
    "requireWarning" boolean DEFAULT false NOT NULL,
    "warningMessage" text,
    "analyzerTags" text,
    icon text,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL
);


ALTER TABLE public."Category" OWNER TO postgres;

--
-- Name: Commission; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public."Commission" (
    id text NOT NULL,
    "orderId" text NOT NULL,
    "referrerId" text NOT NULL,
    amount bigint NOT NULL,
    status text DEFAULT 'PENDING'::text NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


ALTER TABLE public."Commission" OWNER TO postgres;

--
-- Name: ContentCategory; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public."ContentCategory" (
    id text NOT NULL,
    name text NOT NULL,
    slug text NOT NULL,
    "parentId" text,
    sort integer DEFAULT 0 NOT NULL,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL
);


ALTER TABLE public."ContentCategory" OWNER TO postgres;

--
-- Name: ContentItem; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public."ContentItem" (
    id text NOT NULL,
    type public."ContentType" DEFAULT 'PAGE'::public."ContentType" NOT NULL,
    slug text NOT NULL,
    title text NOT NULL,
    excerpt text,
    "coverImage" text,
    "contentJson" text,
    "contentHtml" text,
    "categoryId" text,
    "authorName" text,
    "viewCount" integer DEFAULT 0 NOT NULL,
    "isPublished" boolean DEFAULT false NOT NULL,
    "publishedAt" timestamp(3) without time zone,
    "metaTitle" text,
    "metaDescription" text,
    "readTimeMinutes" integer,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL
);


ALTER TABLE public."ContentItem" OWNER TO postgres;

--
-- Name: CustomerGroup; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public."CustomerGroup" (
    id text NOT NULL,
    name text NOT NULL,
    slug text NOT NULL,
    description text,
    "tenantId" text DEFAULT 'smmplan'::text NOT NULL,
    "isDefault" boolean DEFAULT false NOT NULL,
    "discountPercent" double precision DEFAULT 0.0 NOT NULL,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL
);


ALTER TABLE public."CustomerGroup" OWNER TO postgres;

--
-- Name: CxApologyCompensation; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public."CxApologyCompensation" (
    id text NOT NULL,
    "userId" text NOT NULL,
    "orderId" text NOT NULL,
    "amountCents" bigint NOT NULL,
    reason text NOT NULL,
    status text DEFAULT 'GRANTED'::text NOT NULL,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


ALTER TABLE public."CxApologyCompensation" OWNER TO postgres;

--
-- Name: EconomicOptimizationSnapshot; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public."EconomicOptimizationSnapshot" (
    id text NOT NULL,
    "tenantId" text DEFAULT 'smmplan'::text NOT NULL,
    "analyzedPeriodDays" integer DEFAULT 30 NOT NULL,
    "totalLeakageRub" double precision DEFAULT 0.0 NOT NULL,
    "leakingServicesCount" integer DEFAULT 0 NOT NULL,
    "executiveSummary" text NOT NULL,
    "toolExecutionTrace" jsonb,
    status public."OptimizationSnapshotStatus" DEFAULT 'GENERATED'::public."OptimizationSnapshotStatus" NOT NULL,
    "appliedBy" text,
    "appliedAt" timestamp(3) without time zone,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL
);


ALTER TABLE public."EconomicOptimizationSnapshot" OWNER TO postgres;

--
-- Name: EmployeeResponsibilityConsent; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public."EmployeeResponsibilityConsent" (
    id text NOT NULL,
    "userId" text NOT NULL,
    "tenantId" text DEFAULT 'smmplan'::text NOT NULL,
    "documentVersionId" text,
    "documentVersionText" text DEFAULT '1.0'::text NOT NULL,
    "documentHash" text NOT NULL,
    "acceptedAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "acceptedIp" text,
    "acceptedUserAgent" text,
    status text DEFAULT 'ACTIVE'::text NOT NULL,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


ALTER TABLE public."EmployeeResponsibilityConsent" OWNER TO postgres;

--
-- Name: FeatureFlag; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public."FeatureFlag" (
    id text NOT NULL,
    key text NOT NULL,
    label text NOT NULL,
    description text DEFAULT ''::text NOT NULL,
    state text DEFAULT 'OFF'::text NOT NULL,
    "updatedBy" text,
    "updatedAt" timestamp(3) without time zone NOT NULL,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


ALTER TABLE public."FeatureFlag" OWNER TO postgres;

--
-- Name: Invoice; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public."Invoice" (
    id text NOT NULL,
    "userId" text NOT NULL,
    amount bigint NOT NULL,
    status text DEFAULT 'PENDING'::text NOT NULL,
    "fileUrl" text,
    "actUrl" text,
    "paymentId" text,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL
);


ALTER TABLE public."Invoice" OWNER TO postgres;

--
-- Name: LedgerEntry; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public."LedgerEntry" (
    id text NOT NULL,
    "tenantId" text DEFAULT 'smmplan'::text,
    "userId" text NOT NULL,
    "adminId" text,
    amount bigint NOT NULL,
    reason text NOT NULL,
    status text DEFAULT 'APPROVED'::text NOT NULL,
    "idempotencyKey" text,
    "transactionType" text DEFAULT 'PAYMENT'::text NOT NULL,
    immutable boolean DEFAULT false NOT NULL,
    "periodId" text,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL
);


ALTER TABLE public."LedgerEntry" OWNER TO postgres;

--
-- Name: LegalDocumentVersion; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public."LegalDocumentVersion" (
    id text NOT NULL,
    "tenantId" text DEFAULT 'smmplan'::text NOT NULL,
    type text NOT NULL,
    version text NOT NULL,
    title text NOT NULL,
    "contentHash" text NOT NULL,
    "isActive" boolean DEFAULT true NOT NULL,
    "effectiveAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "createdBy" text,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


ALTER TABLE public."LegalDocumentVersion" OWNER TO postgres;

--
-- Name: LoginLog; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public."LoginLog" (
    id text NOT NULL,
    "tenantId" text DEFAULT 'smmplan'::text,
    email text NOT NULL,
    "userId" text,
    "ipAddress" text NOT NULL,
    "userAgent" text,
    success boolean NOT NULL,
    "failReason" text,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


ALTER TABLE public."LoginLog" OWNER TO postgres;

--
-- Name: ManualBalanceAdjustment; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public."ManualBalanceAdjustment" (
    id text NOT NULL,
    "userId" text NOT NULL,
    "requestedBy" text NOT NULL,
    direction text NOT NULL,
    amount bigint NOT NULL,
    "reasonCode" text NOT NULL,
    "reasonNote" text NOT NULL,
    "ticketId" text,
    "orderId" text,
    "paymentId" text,
    status text DEFAULT 'PENDING_APPROVAL'::text NOT NULL,
    "idempotencyKey" text NOT NULL,
    "approvedBy" text,
    "approvedAt" timestamp(3) without time zone,
    "rejectedBy" text,
    "rejectedAt" timestamp(3) without time zone,
    "rejectionReason" text,
    "executionError" text,
    "ledgerEntryId" text,
    "policySnapshot" jsonb,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL
);


ALTER TABLE public."ManualBalanceAdjustment" OWNER TO postgres;

--
-- Name: MessageAttachment; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public."MessageAttachment" (
    id text NOT NULL,
    "messageId" text NOT NULL,
    url text NOT NULL,
    type text NOT NULL,
    "mimeType" text NOT NULL,
    name text NOT NULL,
    size integer,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


ALTER TABLE public."MessageAttachment" OWNER TO postgres;

--
-- Name: Network; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public."Network" (
    id text NOT NULL,
    name text NOT NULL,
    slug text NOT NULL,
    icon text,
    sort integer DEFAULT 0 NOT NULL,
    "isActive" boolean DEFAULT true NOT NULL,
    "tenantId" text DEFAULT 'smmplan'::text NOT NULL,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL
);


ALTER TABLE public."Network" OWNER TO postgres;

--
-- Name: Order; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public."Order" (
    id text NOT NULL,
    "numericId" integer NOT NULL,
    "userId" text NOT NULL,
    "serviceId" text NOT NULL,
    "providerId" text,
    "providerServiceId" text,
    "externalId" text,
    "dripExternalIds" text[] DEFAULT ARRAY[]::text[],
    link text NOT NULL,
    "isLinkOverridden" boolean DEFAULT false NOT NULL,
    quantity integer NOT NULL,
    status public."OrderStatus" DEFAULT 'AWAITING_PAYMENT'::public."OrderStatus" NOT NULL,
    remains integer DEFAULT 0 NOT NULL,
    start_count integer,
    charge bigint NOT NULL,
    "providerCost" bigint NOT NULL,
    error text,
    "actualProviderCost" bigint,
    "realMarginDelta" bigint,
    "retryCount" integer DEFAULT 0 NOT NULL,
    "isTest" boolean DEFAULT false NOT NULL,
    email text,
    "customData" text,
    "usdToRubRate" double precision,
    "environmentMode" text DEFAULT 'PRODUCTION'::text NOT NULL,
    "isDripFeed" boolean DEFAULT false NOT NULL,
    runs integer,
    "interval" integer,
    "currentRun" integer DEFAULT 0 NOT NULL,
    "nextRunAt" timestamp(3) without time zone,
    "waitingUntil" timestamp(3) without time zone,
    "discountCents" bigint DEFAULT 0 NOT NULL,
    "promoCodeId" text,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL,
    "paymentId" text,
    "idempotencyKey" text,
    "abVariant" text,
    "tenantId" text DEFAULT 'smmplan'::text NOT NULL
);


ALTER TABLE public."Order" OWNER TO postgres;

--
-- Name: OrderRecoveryIncident; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public."OrderRecoveryIncident" (
    id text NOT NULL,
    "orderId" text NOT NULL,
    "userId" text NOT NULL,
    "originalProviderId" text NOT NULL,
    "swappedProviderId" text NOT NULL,
    "absorbedDeltaCents" bigint DEFAULT 0 NOT NULL,
    reason text NOT NULL,
    status text DEFAULT 'EXECUTED'::text NOT NULL,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


ALTER TABLE public."OrderRecoveryIncident" OWNER TO postgres;

--
-- Name: Order_numericId_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public."Order_numericId_seq"
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER TABLE public."Order_numericId_seq" OWNER TO postgres;

--
-- Name: Order_numericId_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public."Order_numericId_seq" OWNED BY public."Order"."numericId";


--
-- Name: Page; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public."Page" (
    id text NOT NULL,
    slug text NOT NULL,
    title text NOT NULL,
    content text NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


ALTER TABLE public."Page" OWNER TO postgres;

--
-- Name: Payment; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public."Payment" (
    id text NOT NULL,
    "userId" text NOT NULL,
    "orderId" text,
    amount bigint NOT NULL,
    currency text DEFAULT 'RUB'::text NOT NULL,
    status text DEFAULT 'PENDING'::text NOT NULL,
    "gatewayId" text,
    gateway text DEFAULT 'yookassa'::text NOT NULL,
    "consentIp" text,
    "consentUserAgent" text,
    "consentVersion" text,
    "checkoutUrl" text,
    "receiptId" text,
    "refundReceiptId" text,
    "abVariant" text,
    "tenantId" text DEFAULT 'smmplan'::text NOT NULL,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL
);


ALTER TABLE public."Payment" OWNER TO postgres;

--
-- Name: PiiAccessLog; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public."PiiAccessLog" (
    id text NOT NULL,
    "staffId" text NOT NULL,
    "staffEmail" text NOT NULL,
    action text NOT NULL,
    "targetId" text NOT NULL,
    "targetType" text NOT NULL,
    fields text[],
    ip text,
    "userAgent" text,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


ALTER TABLE public."PiiAccessLog" OWNER TO postgres;

--
-- Name: PreLaunchLead; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public."PreLaunchLead" (
    id text NOT NULL,
    email text NOT NULL,
    "tenantId" text DEFAULT 'smmplan'::text NOT NULL,
    "ipHash" text,
    source text DEFAULT 'holding_page'::text NOT NULL,
    "isNotified" boolean DEFAULT false NOT NULL,
    "notifiedAt" timestamp(3) without time zone,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


ALTER TABLE public."PreLaunchLead" OWNER TO postgres;

--
-- Name: ProcessedBonusEvent; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public."ProcessedBonusEvent" (
    id text NOT NULL,
    "eventType" text NOT NULL,
    "eventId" text NOT NULL,
    "userId" text NOT NULL,
    "amountCents" bigint NOT NULL,
    status text DEFAULT 'PROCESSED'::text NOT NULL,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


ALTER TABLE public."ProcessedBonusEvent" OWNER TO postgres;

--
-- Name: PromoCode; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public."PromoCode" (
    id text NOT NULL,
    code text NOT NULL,
    type text DEFAULT 'DISCOUNT'::text NOT NULL,
    "discountPercent" double precision NOT NULL,
    amount integer DEFAULT 0 NOT NULL,
    "maxUses" integer DEFAULT 1 NOT NULL,
    uses integer DEFAULT 0 NOT NULL,
    "isActive" boolean DEFAULT true NOT NULL,
    "expiresAt" timestamp(3) without time zone,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    description text,
    "utmSource" text,
    "utmMedium" text,
    "utmCampaign" text,
    "budgetCents" integer DEFAULT 0 NOT NULL,
    "isSuspicious" boolean DEFAULT false NOT NULL
);


ALTER TABLE public."PromoCode" OWNER TO postgres;

--
-- Name: PromoCodeUsage; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public."PromoCodeUsage" (
    id text NOT NULL,
    "promoCodeId" text NOT NULL,
    "userId" text NOT NULL,
    "orderId" text,
    "discountCents" bigint NOT NULL,
    "revenueCents" bigint NOT NULL,
    "profitCents" bigint NOT NULL,
    "isSuspicious" boolean DEFAULT false NOT NULL,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


ALTER TABLE public."PromoCodeUsage" OWNER TO postgres;

--
-- Name: Provider; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public."Provider" (
    id text NOT NULL,
    name text NOT NULL,
    "apiUrl" text NOT NULL,
    "apiKey" text NOT NULL,
    "isActive" boolean DEFAULT true NOT NULL,
    metadata jsonb,
    "providerType" text DEFAULT 'SMM_PANEL'::text NOT NULL,
    "syncLock" boolean DEFAULT false NOT NULL,
    "balanceCurrency" text DEFAULT 'USD'::text NOT NULL,
    "ticketUrl" text,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL,
    "errorCount5m" integer DEFAULT 0 NOT NULL,
    "lastErrorAt" timestamp(3) without time zone,
    "lastSuccessAt" timestamp(3) without time zone,
    "avgResponseMs" integer DEFAULT 0 NOT NULL,
    "proxyId" text
);


ALTER TABLE public."Provider" OWNER TO postgres;

--
-- Name: ProviderOutbox; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public."ProviderOutbox" (
    id text NOT NULL,
    "orderId" text NOT NULL,
    "providerId" text NOT NULL,
    "idempotencyKey" text NOT NULL,
    status text DEFAULT 'PENDING'::text NOT NULL,
    "providerOrderId" text,
    payload jsonb NOT NULL,
    "responseBody" jsonb,
    error text,
    attempts integer DEFAULT 0 NOT NULL,
    "lastAttemptAt" timestamp(3) without time zone,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL
);


ALTER TABLE public."ProviderOutbox" OWNER TO postgres;

--
-- Name: ProviderProxy; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public."ProviderProxy" (
    id text NOT NULL,
    label text NOT NULL,
    description text DEFAULT ''::text NOT NULL,
    protocol text DEFAULT 'https'::text NOT NULL,
    host text NOT NULL,
    port integer NOT NULL,
    username text,
    "passwordEncrypted" text,
    "isActive" boolean DEFAULT true NOT NULL,
    "isRotating" boolean DEFAULT false NOT NULL,
    "geoCountry" text,
    tags text DEFAULT '[]'::text NOT NULL,
    "lastTestAt" timestamp(3) without time zone,
    "lastTestLatencyMs" integer,
    "lastTestSuccess" boolean,
    "errorCount" integer DEFAULT 0 NOT NULL,
    "lastErrorAt" timestamp(3) without time zone,
    "consecutiveFailures" integer DEFAULT 0 NOT NULL,
    category text DEFAULT 'PAID_PREMIUM'::text NOT NULL,
    "subscriptionUrl" text,
    "expiresAt" timestamp(3) without time zone,
    "trafficUsedBytes" bigint,
    "trafficTotalBytes" bigint,
    "lastSyncAt" timestamp(3) without time zone,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL
);


ALTER TABLE public."ProviderProxy" OWNER TO postgres;

--
-- Name: ProviderProxyLog; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public."ProviderProxyLog" (
    id text NOT NULL,
    "proxyId" text NOT NULL,
    "providerId" text,
    action text NOT NULL,
    url text,
    method text,
    "statusCode" integer,
    "latencyMs" integer,
    error text,
    "bytesSent" integer DEFAULT 0 NOT NULL,
    "bytesReceived" integer DEFAULT 0 NOT NULL,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


ALTER TABLE public."ProviderProxyLog" OWNER TO postgres;

--
-- Name: RateLimit; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public."RateLimit" (
    id text NOT NULL,
    ip text NOT NULL,
    endpoint text NOT NULL,
    hits integer DEFAULT 1 NOT NULL,
    "expiresAt" timestamp(3) without time zone NOT NULL,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


ALTER TABLE public."RateLimit" OWNER TO postgres;

--
-- Name: Refill; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public."Refill" (
    id text NOT NULL,
    "numericId" integer NOT NULL,
    "orderId" text NOT NULL,
    status text DEFAULT 'PENDING'::text NOT NULL,
    "externalId" text,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL
);


ALTER TABLE public."Refill" OWNER TO postgres;

--
-- Name: Refill_numericId_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public."Refill_numericId_seq"
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER TABLE public."Refill_numericId_seq" OWNER TO postgres;

--
-- Name: Refill_numericId_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public."Refill_numericId_seq" OWNED BY public."Refill"."numericId";


--
-- Name: RoutingAuditLog; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public."RoutingAuditLog" (
    id text NOT NULL,
    "serviceId" text NOT NULL,
    "adminId" text,
    action text NOT NULL,
    "fromProviderId" text,
    "toProviderId" text,
    reason text,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


ALTER TABLE public."RoutingAuditLog" OWNER TO postgres;

--
-- Name: SecurityEvent; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public."SecurityEvent" (
    id text NOT NULL,
    "tenantId" text DEFAULT 'smmplan'::text,
    event text NOT NULL,
    severity text NOT NULL,
    ip text,
    details jsonb,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


ALTER TABLE public."SecurityEvent" OWNER TO postgres;

--
-- Name: Service; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public."Service" (
    id text NOT NULL,
    "numericId" integer NOT NULL,
    name text NOT NULL,
    description text,
    icon text,
    features jsonb,
    "categoryId" text NOT NULL,
    "tenantId" text DEFAULT 'smmplan'::text NOT NULL,
    "providerId" text,
    rate double precision NOT NULL,
    "providerCurrency" text DEFAULT 'USD'::text NOT NULL,
    "costPer1kRub" double precision,
    "currencyCapturedAt" timestamp(3) without time zone,
    "usdRateAtCapture" double precision,
    markup double precision DEFAULT 8.0 NOT NULL,
    "anomalyScore" integer DEFAULT 0 NOT NULL,
    "minQty" integer DEFAULT 10 NOT NULL,
    "maxQty" integer DEFAULT 100000 NOT NULL,
    "externalId" text,
    "dataHash" text,
    "lastSeenAt" timestamp(3) without time zone,
    "isDripFeedEnabled" boolean DEFAULT true NOT NULL,
    "isRefillEnabled" boolean DEFAULT false NOT NULL,
    "isCancelEnabled" boolean DEFAULT false NOT NULL,
    "isCustomName" boolean DEFAULT false NOT NULL,
    "isCustomDescription" boolean DEFAULT false NOT NULL,
    "qualityTier" text DEFAULT 'STANDARD'::text NOT NULL,
    "isQuarantined" boolean DEFAULT false NOT NULL,
    "pendingRate" double precision,
    "quarantineReason" text,
    "quarantinedAt" timestamp(3) without time zone,
    "cooldownUntil" timestamp(3) without time zone,
    "cooldownReason" text,
    "etaP50Seconds" integer,
    "etaP90Seconds" integer,
    "etaSampleCount" integer DEFAULT 0 NOT NULL,
    "etaSpeedClass" text,
    "etaUpdatedAt" timestamp(3) without time zone,
    "targetType" text DEFAULT 'POST'::text NOT NULL,
    "customDataType" text DEFAULT 'NONE'::text NOT NULL,
    "customDataLabel" text,
    "isMediaGroupAware" boolean DEFAULT false NOT NULL,
    "linkValidatorRegex" text,
    "linkPlaceholder" text,
    "linkHint" text,
    "requiresBotAdmin" boolean DEFAULT false NOT NULL,
    "requireWarning" boolean DEFAULT false NOT NULL,
    "warningMessage" text,
    "clientRequirement" text,
    "clientConfirmation" text,
    "isActive" boolean DEFAULT true NOT NULL,
    "pricePer1000Cents" integer DEFAULT 0 NOT NULL,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL,
    slug text,
    "sortOrder" integer DEFAULT 0 NOT NULL
);


ALTER TABLE public."Service" OWNER TO postgres;

--
-- Name: ServiceCustomerAccess; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public."ServiceCustomerAccess" (
    id text NOT NULL,
    "serviceId" text NOT NULL,
    "customerGroupId" text NOT NULL,
    "isCustomPrice" boolean DEFAULT false NOT NULL,
    "customPriceRub" double precision,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL
);


ALTER TABLE public."ServiceCustomerAccess" OWNER TO postgres;

--
-- Name: ServiceDraft; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public."ServiceDraft" (
    id text NOT NULL,
    "serviceId" text,
    "providerId" text,
    "externalId" text,
    "tenantId" text DEFAULT 'smmplan'::text NOT NULL,
    name text NOT NULL,
    "cleanName" text,
    description text,
    "categoryId" text,
    "targetType" text DEFAULT 'POST'::text NOT NULL,
    status text DEFAULT 'DRAFT'::text NOT NULL,
    "procurementRate" double precision DEFAULT 0.0 NOT NULL,
    "procurementCurrency" text DEFAULT 'USD'::text NOT NULL,
    markup double precision DEFAULT 3.0 NOT NULL,
    "retailPriceRub" double precision DEFAULT 0.0 NOT NULL,
    "minQty" integer DEFAULT 10 NOT NULL,
    "maxQty" integer DEFAULT 100000 NOT NULL,
    "validationStatus" text DEFAULT 'PENDING'::text NOT NULL,
    "linkCheckStatus" text DEFAULT 'UNCHECKED'::text NOT NULL,
    payload jsonb,
    "adminId" text,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL
);


ALTER TABLE public."ServiceDraft" OWNER TO postgres;

--
-- Name: ServiceEditHistory; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public."ServiceEditHistory" (
    id text NOT NULL,
    "serviceId" text,
    "draftId" text,
    "adminId" text,
    "adminEmail" text,
    "changeType" text DEFAULT 'UPDATE'::text NOT NULL,
    field text,
    "oldValue" text,
    "newValue" text,
    comment text,
    "ipAddress" text,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


ALTER TABLE public."ServiceEditHistory" OWNER TO postgres;

--
-- Name: ServiceLinkCheck; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public."ServiceLinkCheck" (
    id text NOT NULL,
    "serviceId" text,
    "targetType" text NOT NULL,
    "testUrl" text NOT NULL,
    "isSuccess" boolean DEFAULT false NOT NULL,
    "statusCode" integer,
    "responseTimeMs" integer,
    "errorMessage" text,
    "checkedBy" text,
    "checkedAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


ALTER TABLE public."ServiceLinkCheck" OWNER TO postgres;

--
-- Name: ServicePriceHistory; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public."ServicePriceHistory" (
    id text NOT NULL,
    "serviceId" text NOT NULL,
    rate double precision NOT NULL,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


ALTER TABLE public."ServicePriceHistory" OWNER TO postgres;

--
-- Name: ServiceRoute; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public."ServiceRoute" (
    id text NOT NULL,
    "serviceId" text NOT NULL,
    "providerId" text NOT NULL,
    "providerServiceId" text NOT NULL,
    "isPrimary" boolean DEFAULT false NOT NULL,
    "isActive" boolean DEFAULT true NOT NULL,
    priority integer DEFAULT 0 NOT NULL,
    "failoverMode" text DEFAULT 'manual'::text NOT NULL,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL
);


ALTER TABLE public."ServiceRoute" OWNER TO postgres;

--
-- Name: ServiceSmartConfig; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public."ServiceSmartConfig" (
    id text NOT NULL,
    "serviceId" text NOT NULL,
    "isEnabled" boolean DEFAULT false NOT NULL,
    "isTestMode" boolean DEFAULT false NOT NULL,
    "minChunk" integer DEFAULT 50 NOT NULL,
    "maxChunk" integer DEFAULT 200 NOT NULL,
    markup double precision DEFAULT 0.15 NOT NULL,
    "providersPriority" text[] DEFAULT ARRAY[]::text[],
    "useInviteBuffer" boolean DEFAULT false NOT NULL,
    "autoCompensate" boolean DEFAULT true NOT NULL,
    "checkIntervalMins" integer DEFAULT 120 NOT NULL,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL
);


ALTER TABLE public."ServiceSmartConfig" OWNER TO postgres;

--
-- Name: Service_numericId_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public."Service_numericId_seq"
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER TABLE public."Service_numericId_seq" OWNER TO postgres;

--
-- Name: Service_numericId_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public."Service_numericId_seq" OWNED BY public."Service"."numericId";


--
-- Name: Session; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public."Session" (
    id text NOT NULL,
    "userId" text NOT NULL,
    "expiresAt" timestamp(3) without time zone NOT NULL,
    "userAgent" text,
    "ipAddress" text,
    "impersonatedBy" text,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


ALTER TABLE public."Session" OWNER TO postgres;

--
-- Name: ShadowService; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public."ShadowService" (
    id text NOT NULL,
    "providerId" text NOT NULL,
    "externalId" text NOT NULL,
    name text NOT NULL,
    type text,
    category text,
    rate double precision NOT NULL,
    "rateRub" double precision NOT NULL,
    min integer NOT NULL,
    max integer NOT NULL,
    refill boolean DEFAULT false NOT NULL,
    cancel boolean DEFAULT false NOT NULL,
    dripfeed boolean DEFAULT false NOT NULL,
    "cleanName" text,
    platform text,
    "normalizedCategory" text,
    "targetType" text DEFAULT 'POST'::text NOT NULL,
    "customDataType" text DEFAULT 'NONE'::text NOT NULL,
    "isMediaGroupAware" boolean DEFAULT false NOT NULL,
    "isPrivate" boolean DEFAULT false NOT NULL,
    warranty integer DEFAULT 0 NOT NULL,
    geo text,
    velocity integer DEFAULT 0 NOT NULL,
    "anomalyScore" double precision DEFAULT 0.0 NOT NULL,
    "tenantId" text DEFAULT 'all'::text,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL
);


ALTER TABLE public."ShadowService" OWNER TO postgres;

--
-- Name: SlaTelemetrySnapshot; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public."SlaTelemetrySnapshot" (
    id text NOT NULL,
    "providerId" text NOT NULL,
    "serviceId" text,
    "p50Seconds" integer NOT NULL,
    "p90Seconds" integer NOT NULL,
    "p99Seconds" integer NOT NULL,
    "sampleCount" integer NOT NULL,
    "isDegraded" boolean DEFAULT false NOT NULL,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


ALTER TABLE public."SlaTelemetrySnapshot" OWNER TO postgres;

--
-- Name: SmartCampaign; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public."SmartCampaign" (
    id text NOT NULL,
    "userId" text NOT NULL,
    "serviceId" text NOT NULL,
    status public."SmartCampaignStatus" DEFAULT 'PLANNED'::public."SmartCampaignStatus" NOT NULL,
    link text NOT NULL,
    "totalQuantity" integer NOT NULL,
    "totalDays" integer NOT NULL,
    "isTestMode" boolean DEFAULT false NOT NULL,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL,
    "paymentId" text,
    "orderId" text
);


ALTER TABLE public."SmartCampaign" OWNER TO postgres;

--
-- Name: SmartChannelMetric; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public."SmartChannelMetric" (
    id text NOT NULL,
    "campaignId" text NOT NULL,
    "recordedAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "memberCount" integer NOT NULL,
    delta integer NOT NULL,
    "detectedDrops" integer DEFAULT 0 NOT NULL,
    "compensatedQty" integer DEFAULT 0 NOT NULL
);


ALTER TABLE public."SmartChannelMetric" OWNER TO postgres;

--
-- Name: SmartDetectedUser; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public."SmartDetectedUser" (
    id text NOT NULL,
    "campaignId" text NOT NULL,
    "telegramId" text NOT NULL,
    score integer DEFAULT 0 NOT NULL,
    reasons text[],
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


ALTER TABLE public."SmartDetectedUser" OWNER TO postgres;

--
-- Name: SmartExecution; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public."SmartExecution" (
    id text NOT NULL,
    "taskId" text NOT NULL,
    "providerId" text,
    "externalOrderId" text,
    "qtySent" integer NOT NULL,
    "qtyDelivered" integer DEFAULT 0 NOT NULL,
    status text DEFAULT 'PENDING'::text NOT NULL,
    error text,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL
);


ALTER TABLE public."SmartExecution" OWNER TO postgres;

--
-- Name: SmartSnapshot; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public."SmartSnapshot" (
    id text NOT NULL,
    "campaignId" text NOT NULL,
    "channelUrl" text NOT NULL,
    members text[],
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


ALTER TABLE public."SmartSnapshot" OWNER TO postgres;

--
-- Name: SmartTask; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public."SmartTask" (
    id text NOT NULL,
    "campaignId" text NOT NULL,
    quantity integer NOT NULL,
    "runAt" timestamp(3) without time zone NOT NULL,
    status public."SmartTaskStatus" DEFAULT 'PLANNED'::public."SmartTaskStatus" NOT NULL,
    error text,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL
);


ALTER TABLE public."SmartTask" OWNER TO postgres;

--
-- Name: StaffPermission; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public."StaffPermission" (
    id text NOT NULL,
    "tenantId" text DEFAULT 'smmplan'::text NOT NULL,
    "roleId" text NOT NULL,
    section text NOT NULL,
    "canView" boolean DEFAULT false NOT NULL,
    "canEdit" boolean DEFAULT false NOT NULL
);


ALTER TABLE public."StaffPermission" OWNER TO postgres;

--
-- Name: StaffRole; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public."StaffRole" (
    id text NOT NULL,
    "tenantId" text DEFAULT 'smmplan'::text NOT NULL,
    "allowedTenants" text[] DEFAULT ARRAY['smmplan'::text],
    name text NOT NULL,
    description text DEFAULT ''::text NOT NULL,
    "isSystem" boolean DEFAULT false NOT NULL,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL
);


ALTER TABLE public."StaffRole" OWNER TO postgres;

--
-- Name: StaffShift; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public."StaffShift" (
    id text NOT NULL,
    "userId" text NOT NULL,
    date timestamp(3) without time zone NOT NULL,
    "shiftType" text DEFAULT 'DAY'::text NOT NULL,
    status text DEFAULT 'PLANNED'::text NOT NULL,
    "substituteUserId" text,
    "substituteHours" double precision DEFAULT 0 NOT NULL,
    "rateRubles" double precision DEFAULT 2500 NOT NULL,
    "bonusRubles" double precision DEFAULT 0 NOT NULL,
    "penaltyRubles" double precision DEFAULT 0 NOT NULL,
    notes text,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL
);


ALTER TABLE public."StaffShift" OWNER TO postgres;

--
-- Name: StorefrontKey; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public."StorefrontKey" (
    id text NOT NULL,
    "tenantId" text NOT NULL,
    type text NOT NULL,
    "keyPrefix" text NOT NULL,
    "keyHash" text NOT NULL,
    name text,
    "isActive" boolean DEFAULT true NOT NULL,
    "lastUsedAt" timestamp(3) without time zone,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL
);


ALTER TABLE public."StorefrontKey" OWNER TO postgres;

--
-- Name: SupportFinancialAction; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public."SupportFinancialAction" (
    id text NOT NULL,
    "tenantId" text,
    "staffUserId" text NOT NULL,
    "targetUserId" text NOT NULL,
    direction text NOT NULL,
    source text NOT NULL,
    "amountCents" bigint NOT NULL,
    "reasonCode" text NOT NULL,
    "reasonNote" text NOT NULL,
    "ticketId" text,
    "orderId" text,
    "paymentId" text,
    "policyId" text,
    "policySnapshot" jsonb,
    "idempotencyKey" text NOT NULL,
    status text NOT NULL,
    "ledgerEntryId" text,
    "consentId" text,
    "reviewStatus" text DEFAULT 'PENDING'::text NOT NULL,
    "reviewedBy" text,
    "reviewedAt" timestamp(3) without time zone,
    "reviewNote" text,
    "ipAddress" text,
    "userAgent" text,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL
);


ALTER TABLE public."SupportFinancialAction" OWNER TO postgres;

--
-- Name: SupportHourlyUsage; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public."SupportHourlyUsage" (
    id text NOT NULL,
    "tenantId" text DEFAULT 'smmplan'::text,
    "staffUserId" text NOT NULL,
    "hourKey" text NOT NULL,
    direction text NOT NULL,
    "amountCents" bigint DEFAULT 0 NOT NULL,
    "operationsCount" integer DEFAULT 0 NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL
);


ALTER TABLE public."SupportHourlyUsage" OWNER TO postgres;

--
-- Name: SupportLimitUsage; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public."SupportLimitUsage" (
    id text NOT NULL,
    "tenantId" text,
    "staffUserId" text NOT NULL,
    "dayKey" text NOT NULL,
    direction text NOT NULL,
    "amountCents" bigint DEFAULT 0 NOT NULL,
    "operationsCount" integer DEFAULT 0 NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL
);


ALTER TABLE public."SupportLimitUsage" OWNER TO postgres;

--
-- Name: SupportTemplate; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public."SupportTemplate" (
    id text NOT NULL,
    shortcut text,
    label text NOT NULL,
    text text NOT NULL,
    category text DEFAULT 'GENERAL'::text NOT NULL,
    "isActive" boolean DEFAULT true NOT NULL,
    "useCount" integer DEFAULT 0 NOT NULL,
    sort integer DEFAULT 0 NOT NULL,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL
);


ALTER TABLE public."SupportTemplate" OWNER TO postgres;

--
-- Name: SystemSetting; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public."SystemSetting" (
    key text NOT NULL,
    value text NOT NULL,
    "group" text DEFAULT 'GENERAL'::text NOT NULL,
    description text,
    "updatedAt" timestamp(3) without time zone NOT NULL,
    "updatedBy" text
);


ALTER TABLE public."SystemSetting" OWNER TO postgres;

--
-- Name: SystemSettings; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public."SystemSettings" (
    id text NOT NULL,
    "isTestMode" boolean DEFAULT false NOT NULL,
    "environmentMode" text DEFAULT 'PRODUCTION'::text NOT NULL,
    "taxRate" double precision DEFAULT 6.0 NOT NULL,
    "usnScheme" public."UsnScheme" DEFAULT 'INCOME_EXPENSES'::public."UsnScheme" NOT NULL,
    "opexMonthly" integer DEFAULT 0 NOT NULL,
    "maintenanceMode" boolean DEFAULT false NOT NULL,
    "siteName" text DEFAULT 'Smmplan'::text NOT NULL,
    "siteDescription" text DEFAULT ''::text NOT NULL,
    "telegramBotToken" text,
    "telegramBotMode" text DEFAULT 'polling'::text,
    "welcomeMessage" text DEFAULT 'Добро пожаловать в Smmplan! Ваш персональный кабинет готов к работе.'::text,
    "telegramMenuConfig" jsonb,
    "telegramTemplates" jsonb,
    "telegramRatingReasons" jsonb,
    "telegramWebhookSecret" text,
    "telegramAllowedIps" text DEFAULT '[]'::text,
    "telegramRateLimitPerMin" integer DEFAULT 30,
    "telegramMaxMessageLength" integer DEFAULT 4096,
    "telegramProxyId" text,
    "telegramMaintenanceMode" boolean DEFAULT false NOT NULL,
    "telegramLogErrors" boolean DEFAULT true NOT NULL,
    "telegramEnableCsat" boolean DEFAULT true NOT NULL,
    "telegramEnableSmartBind" boolean DEFAULT true NOT NULL,
    "yookassaShopId" text,
    "yookassaSecretKey" text,
    "yookassaWebhookSecret" text,
    "yookassaTestShopId" text,
    "yookassaTestSecretKey" text,
    "cryptoBotToken" text,
    "quarantineThreshold" double precision DEFAULT 0.20 NOT NULL,
    "globalMarkup" double precision DEFAULT 3.0 NOT NULL,
    "safetyFloor" double precision DEFAULT 1.0 NOT NULL,
    "exchangeRateUSD" double precision DEFAULT 90.0 NOT NULL,
    "exchangeRateUpdatedAt" timestamp(3) without time zone,
    "siteLogoUrl" text,
    "siteFaviconUrl" text,
    "emailProvider" text DEFAULT 'SMTP'::text NOT NULL,
    "resendApiKey" text,
    "smtpHost" text,
    "smtpPort" integer DEFAULT 465 NOT NULL,
    "smtpUser" text,
    "smtpPassword" text,
    "supportEmailDomain" text,
    "inboundEmailWebhookSecret" text,
    "robokassaLogin" text,
    "robokassaPassword" text,
    "robokassaWebhookPassword" text,
    "geminiApiKeys" text,
    "geminiProxy" text,
    "alfaBankAccountNumber" text,
    "alfaBankApiKey" text,
    "alfaBankClientSecret" text,
    "alfaBankApiBaseUrl" text DEFAULT 'https://business.alfabank.ru/ext-api/v1'::text,
    "alfaBankIsSandbox" boolean DEFAULT true NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL,
    "contactSupportEmail" text,
    "contactPrivacyEmail" text,
    "contactTelegramBot" text,
    "contactTelegramChannel" text,
    "contactWhatsApp" text,
    "contactVk" text,
    "legalCompanyName" text,
    "legalCompanyInn" text,
    "legalCompanyOgrnip" text,
    "legalCompanyAddress" text
);


ALTER TABLE public."SystemSettings" OWNER TO postgres;

--
-- Name: TelegramBotInstance; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public."TelegramBotInstance" (
    id text NOT NULL,
    "tenantId" text DEFAULT 'smmplan'::text NOT NULL,
    name text NOT NULL,
    username text,
    "tokenEncrypted" text NOT NULL,
    role public."TelegramBotRole" DEFAULT 'CUSTOM_BUILDER'::public."TelegramBotRole" NOT NULL,
    description text,
    "isActive" boolean DEFAULT true NOT NULL,
    "maintenanceMode" boolean DEFAULT false NOT NULL,
    "welcomeMessage" text,
    "menuConfig" jsonb,
    templates jsonb,
    "flowConfig" jsonb,
    "allowedUserIds" text,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL
);


ALTER TABLE public."TelegramBotInstance" OWNER TO postgres;

--
-- Name: TelegramButton; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public."TelegramButton" (
    id text NOT NULL,
    "tenantId" text DEFAULT 'smmplan'::text NOT NULL,
    label text NOT NULL,
    emoji text DEFAULT ''::text NOT NULL,
    command text NOT NULL,
    description text DEFAULT ''::text NOT NULL,
    "row" integer DEFAULT 0 NOT NULL,
    col integer DEFAULT 0 NOT NULL,
    "sortOrder" integer DEFAULT 0 NOT NULL,
    "isVisible" boolean DEFAULT true NOT NULL,
    "isNew" boolean DEFAULT false NOT NULL,
    "requiresAuth" boolean DEFAULT false NOT NULL,
    "openUrl" text,
    style text DEFAULT 'default'::text NOT NULL,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL
);


ALTER TABLE public."TelegramButton" OWNER TO postgres;

--
-- Name: TelegramDailyStat; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public."TelegramDailyStat" (
    id text NOT NULL,
    "tenantId" text DEFAULT 'smmplan'::text NOT NULL,
    date date NOT NULL,
    "messagesReceived" integer DEFAULT 0 NOT NULL,
    "messagesSent" integer DEFAULT 0 NOT NULL,
    "commandsHandled" integer DEFAULT 0 NOT NULL,
    "callbacksHandled" integer DEFAULT 0 NOT NULL,
    "newUsers" integer DEFAULT 0 NOT NULL,
    "ordersCreated" integer DEFAULT 0 NOT NULL,
    "ticketsCreated" integer DEFAULT 0 NOT NULL,
    "errorsCount" integer DEFAULT 0 NOT NULL,
    "avgLatencyMs" integer,
    "p99LatencyMs" integer,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


ALTER TABLE public."TelegramDailyStat" OWNER TO postgres;

--
-- Name: TelegramErrorLog; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public."TelegramErrorLog" (
    id text NOT NULL,
    "tenantId" text DEFAULT 'smmplan'::text NOT NULL,
    level text DEFAULT 'ERROR'::text NOT NULL,
    source text NOT NULL,
    "errorCode" text,
    "errorMessage" text NOT NULL,
    "stackTrace" text,
    "updateData" text,
    "userId" text,
    "chatId" text,
    "isResolved" boolean DEFAULT false NOT NULL,
    "resolvedBy" text,
    "resolvedAt" timestamp(3) without time zone,
    "occurrenceCount" integer DEFAULT 1 NOT NULL,
    "firstSeenAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "lastSeenAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


ALTER TABLE public."TelegramErrorLog" OWNER TO postgres;

--
-- Name: TelegramProxy; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public."TelegramProxy" (
    id text NOT NULL,
    "tenantId" text DEFAULT 'smmplan'::text NOT NULL,
    label text NOT NULL,
    protocol text DEFAULT 'socks5'::text NOT NULL,
    host text NOT NULL,
    port integer NOT NULL,
    username text,
    "passwordEncrypted" text,
    "isActive" boolean DEFAULT false NOT NULL,
    "lastTestAt" timestamp(3) without time zone,
    "lastTestLatencyMs" integer,
    "lastTestSuccess" boolean,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL
);


ALTER TABLE public."TelegramProxy" OWNER TO postgres;

--
-- Name: TelegramTemplate; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public."TelegramTemplate" (
    id text NOT NULL,
    "tenantId" text DEFAULT 'smmplan'::text NOT NULL,
    name text NOT NULL,
    slug text NOT NULL,
    description text DEFAULT ''::text NOT NULL,
    body text NOT NULL,
    "parseMode" text DEFAULT 'HTML'::text NOT NULL,
    category text DEFAULT 'general'::text NOT NULL,
    variables text DEFAULT '[]'::text NOT NULL,
    "isActive" boolean DEFAULT true NOT NULL,
    version integer DEFAULT 1 NOT NULL,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL
);


ALTER TABLE public."TelegramTemplate" OWNER TO postgres;

--
-- Name: Tenant; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public."Tenant" (
    id text NOT NULL,
    name text NOT NULL,
    slug text NOT NULL,
    domain text NOT NULL,
    "customDomain" text,
    "isActive" boolean DEFAULT true NOT NULL,
    "vaultSalt" text DEFAULT ''::text NOT NULL,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL
);


ALTER TABLE public."Tenant" OWNER TO postgres;

--
-- Name: Ticket; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public."Ticket" (
    id text NOT NULL,
    "userId" text NOT NULL,
    subject text NOT NULL,
    status public."TicketStatus" DEFAULT 'OPEN'::public."TicketStatus" NOT NULL,
    source public."TicketSource" DEFAULT 'WEB'::public."TicketSource" NOT NULL,
    "orderId" text,
    "paymentId" text,
    "firstRespondedAt" timestamp(3) without time zone,
    "resolvedAt" timestamp(3) without time zone,
    tags text[] DEFAULT ARRAY[]::text[],
    "updatedAt" timestamp(3) without time zone NOT NULL,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "tenantId" text DEFAULT 'smmplan'::text NOT NULL
);


ALTER TABLE public."Ticket" OWNER TO postgres;

--
-- Name: TicketFeedback; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public."TicketFeedback" (
    id text NOT NULL,
    "ticketId" text NOT NULL,
    "userId" text NOT NULL,
    score integer NOT NULL,
    reasons text[] DEFAULT ARRAY[]::text[],
    comment text,
    source public."TicketSource" DEFAULT 'TELEGRAM'::public."TicketSource" NOT NULL,
    "tenantId" text DEFAULT 'smmplan'::text NOT NULL,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL
);


ALTER TABLE public."TicketFeedback" OWNER TO postgres;

--
-- Name: TicketMessage; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public."TicketMessage" (
    id text NOT NULL,
    "ticketId" text NOT NULL,
    sender public."MessageSender" NOT NULL,
    text text NOT NULL,
    "mediaUrl" text,
    "mediaType" text,
    "replyToId" text,
    "telegramMsgId" text,
    "isDeleted" boolean DEFAULT false NOT NULL,
    "isEdited" boolean DEFAULT false NOT NULL,
    "originalText" text,
    "orderId" text,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


ALTER TABLE public."TicketMessage" OWNER TO postgres;

--
-- Name: UrlPattern; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public."UrlPattern" (
    id text NOT NULL,
    "networkId" text NOT NULL,
    pattern text NOT NULL,
    "contentType" text NOT NULL,
    sort integer DEFAULT 0 NOT NULL,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


ALTER TABLE public."UrlPattern" OWNER TO postgres;

--
-- Name: User; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public."User" (
    id text NOT NULL,
    email text NOT NULL,
    "passwordHash" text,
    role text DEFAULT 'USER'::text NOT NULL,
    "preferredDashboard" text DEFAULT 'CLASSIC'::text NOT NULL,
    balance bigint DEFAULT 0 NOT NULL,
    "quarantineBalance" bigint DEFAULT 0 NOT NULL,
    "totalSpent" bigint DEFAULT 0 NOT NULL,
    "personalDiscount" double precision DEFAULT 0.0 NOT NULL,
    "discountEndsAt" timestamp(3) without time zone,
    "supportLimitCents" integer DEFAULT 50000 NOT NULL,
    "supportSpentTodayCents" integer DEFAULT 0 NOT NULL,
    "supportLastResetAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "apiKeyHash" text,
    "referralCode" text,
    "referredById" text,
    "referralBalance" integer DEFAULT 0 NOT NULL,
    "telegramId" text,
    "phoneHash" text,
    "isKycVerified" boolean DEFAULT false NOT NULL,
    "isEmailVerified" boolean DEFAULT true NOT NULL,
    "isBotOnly" boolean DEFAULT false NOT NULL,
    "isActive" boolean DEFAULT true NOT NULL,
    "isDeleted" boolean DEFAULT false NOT NULL,
    "tosAcceptedAt" timestamp(3) without time zone,
    "tosAcceptedIp" text,
    "adminNote" text,
    "adminNoteUpdatedAt" timestamp(3) without time zone,
    "adminNoteUpdatedBy" text,
    "geminiApiKey" text,
    "twoFactorEnabled" boolean DEFAULT false NOT NULL,
    "twoFactorSecret" text,
    "twoFactorBackupCodes" text[] DEFAULT ARRAY[]::text[],
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL,
    "companyName" text,
    inn text,
    kpp text,
    ogrn text,
    "legalAddress" text,
    "telegramNotifyOrders" boolean DEFAULT true NOT NULL,
    "telegramNotifyBalance" boolean DEFAULT true NOT NULL,
    "telegramNotifyTickets" boolean DEFAULT true NOT NULL,
    "staffRoleId" text,
    "bonusBalance" bigint DEFAULT 0 NOT NULL,
    "customerGroupId" text,
    "tenantId" text DEFAULT 'smmplan'::text NOT NULL,
    "allowedTenants" text[] DEFAULT ARRAY['smmplan'::text]
);


ALTER TABLE public."User" OWNER TO postgres;

--
-- Name: UserNote; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public."UserNote" (
    id text NOT NULL,
    "userId" text NOT NULL,
    "authorId" text,
    content text NOT NULL,
    "orderId" text,
    "ticketId" text,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


ALTER TABLE public."UserNote" OWNER TO postgres;

--
-- Name: api_request_log; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.api_request_log (
    id text NOT NULL,
    api_key_hash text NOT NULL,
    action text NOT NULL,
    params jsonb,
    http_status integer NOT NULL,
    latency_ms integer NOT NULL,
    ip text,
    user_agent text,
    created_at timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


ALTER TABLE public.api_request_log OWNER TO postgres;

--
-- Name: ledger_period; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.ledger_period (
    id text NOT NULL,
    month text NOT NULL,
    start_date timestamp(3) without time zone NOT NULL,
    end_date timestamp(3) without time zone NOT NULL,
    frozen boolean DEFAULT false NOT NULL,
    frozen_at timestamp(3) without time zone,
    frozen_by text,
    created_at timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at timestamp(3) without time zone NOT NULL
);


ALTER TABLE public.ledger_period OWNER TO postgres;

--
-- Name: provider_service_backup; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.provider_service_backup (
    id text NOT NULL,
    service_id text NOT NULL,
    primary_provider_id text NOT NULL,
    backup_provider_id text NOT NULL,
    backup_external_id text,
    priority integer DEFAULT 1 NOT NULL,
    is_active boolean DEFAULT true NOT NULL,
    created_at timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


ALTER TABLE public.provider_service_backup OWNER TO postgres;

--
-- Name: reconciliation_report; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.reconciliation_report (
    id text NOT NULL,
    date timestamp(3) without time zone NOT NULL,
    bank_total bigint NOT NULL,
    db_total bigint NOT NULL,
    ledger_total bigint NOT NULL,
    delta_bank_vs_db bigint NOT NULL,
    delta_db_vs_ledger bigint NOT NULL,
    status text DEFAULT 'OK'::text NOT NULL,
    details jsonb,
    created_at timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


ALTER TABLE public.reconciliation_report OWNER TO postgres;

--
-- Name: revenue_recognition; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.revenue_recognition (
    id text NOT NULL,
    order_id text NOT NULL,
    amount bigint NOT NULL,
    recognized_at timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    reversed boolean DEFAULT false NOT NULL,
    reversed_at timestamp(3) without time zone,
    reversal_reason text,
    created_at timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at timestamp(3) without time zone NOT NULL
);


ALTER TABLE public.revenue_recognition OWNER TO postgres;

--
-- Name: Order numericId; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."Order" ALTER COLUMN "numericId" SET DEFAULT nextval('public."Order_numericId_seq"'::regclass);


--
-- Name: Refill numericId; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."Refill" ALTER COLUMN "numericId" SET DEFAULT nextval('public."Refill_numericId_seq"'::regclass);


--
-- Name: Service numericId; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."Service" ALTER COLUMN "numericId" SET DEFAULT nextval('public."Service_numericId_seq"'::regclass);


--
-- Data for Name: AdminAuditLog; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public."AdminAuditLog" (id, "tenantId", "adminId", "adminEmail", action, target, "targetType", "oldValue", "newValue", "ipAddress", "createdAt") FROM stdin;
\.


--
-- Data for Name: AiPricingRecommendation; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public."AiPricingRecommendation" (id, "snapshotId", "serviceId", "currentPriceRub", "proposedPriceRub", "currentMarkup", "proposedMarkup", "projectedMonthlyGainRub", "confidenceScore", status, "rejectionReason", "appliedAt", "createdAt", "updatedAt") FROM stdin;
\.


--
-- Data for Name: AnalyticsEvent; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public."AnalyticsEvent" (id, event, metadata, "sessionId", "createdAt") FROM stdin;
\.


--
-- Data for Name: ApiConfig; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public."ApiConfig" (id, "userId", "isApiEnabled", "prioritySupport", "webhookUrl", "webhookSecret", "isWebhookActive", "customLimitCents", created_at, updated_at) FROM stdin;
\.


--
-- Data for Name: Article; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public."Article" (id, slug, title, description, content, status, category, "viewCount", "createdAt", "updatedAt", "authorName", "authorRole", priority) FROM stdin;
\.


--
-- Data for Name: AuditLog; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public."AuditLog" (id, "userId", action, details, "createdAt") FROM stdin;
\.


--
-- Data for Name: AuthToken; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public."AuthToken" (id, token, "tenantId", "userId", used, "usedAt", "expiresAt", "ipIssued", "ipUsed", "userAgentIssued", "userAgentUsed", "createdAt") FROM stdin;
\.


--
-- Data for Name: BalanceAdjustmentPolicy; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public."BalanceAdjustmentPolicy" (id, "scopeType", "staffRoleId", "userId", "isActive", enabled, "canRequestCredit", "canRequestDebit", "canApprove", "canReject", "canViewAll", "canViewStats", "maxCreditPerRequest", "maxDebitPerRequest", "maxCreditPerDay", "maxDebitPerDay", "maxTotalPerDay", "maxApprovalPerRequest", "allowedCreditReasonCodes", "allowedDebitReasonCodes", "allowedTargetRoles", "requireTicket", "requireOrderForDebit", "blockBannedTargets", "blockDeletedTargets", "autoExecuteBelow", "createdAt", "updatedAt") FROM stdin;
\.


--
-- Data for Name: BonusRedemptionLog; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public."BonusRedemptionLog" (id, "userId", "bonusType", "amountCents", "paymentFingerprint", "ipAddress", "userAgent", status, "unlockAt", reason, "tenantId", "createdAt", "updatedAt") FROM stdin;
\.


--
-- Data for Name: Category; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public."Category" (id, name, slug, "networkId", "tenantId", sort, "activityType", "requireWarning", "warningMessage", "analyzerTags", icon, "createdAt", "updatedAt") FROM stdin;
cmud5o46c000b2pztszbkxh6q	Подписчики	telegram-subscribers	cmud5o44k000a2pztmvhj61sh	all	0	\N	f	\N	\N	\N	2026-09-22 20:57:43.717	2026-09-22 20:57:43.717
cmud5o4f4000e2pzto83kd9xa	Просмотры	telegram-views	cmud5o44k000a2pztmvhj61sh	all	0	\N	f	\N	\N	\N	2026-09-22 20:57:44.033	2026-09-22 20:57:44.033
cmud5o4gp000h2pztxzfmcz1a	Реакции	telegram-reactions	cmud5o44k000a2pztmvhj61sh	all	0	\N	f	\N	\N	\N	2026-09-22 20:57:44.09	2026-09-22 20:57:44.09
cmud5o4ig000k2pztsjb2jpwc	Подписчики	vk-subscribers	cmud5o4i8000j2pztli6vflzn	all	0	\N	f	\N	\N	\N	2026-09-22 20:57:44.153	2026-09-22 20:57:44.153
cmud5o4kg000m2pztzzj2zkpp	Лайки	vk-likes	cmud5o4i8000j2pztli6vflzn	all	0	\N	f	\N	\N	\N	2026-09-22 20:57:44.224	2026-09-22 20:57:44.224
cmud5o4mv000o2pzt5e9nkn79	Просмотры	vk-views	cmud5o4i8000j2pztli6vflzn	all	0	\N	f	\N	\N	\N	2026-09-22 20:57:44.311	2026-09-22 20:57:44.311
cmud5o4s0000r2pzt3yipdzwo	Подписчики	youtube-subscribers	cmud5o4rp000q2pztem0ynqgr	all	0	\N	f	\N	\N	\N	2026-09-22 20:57:44.497	2026-09-22 20:57:44.497
cmud5o4vn000t2pztiohxppcr	Просмотры	youtube-views	cmud5o4rp000q2pztem0ynqgr	all	0	\N	f	\N	\N	\N	2026-09-22 20:57:44.628	2026-09-22 20:57:44.628
cmud5o4xp000v2pztyrdkf25i	Лайки	youtube-likes	cmud5o4rp000q2pztem0ynqgr	all	0	\N	f	\N	\N	\N	2026-09-22 20:57:44.701	2026-09-22 20:57:44.701
cmud5o4z8000y2pztjlol8die	Подписчики	instagram-followers	cmud5o4yy000x2pzt6dk4jlor	all	0	\N	f	\N	\N	\N	2026-09-22 20:57:44.756	2026-09-22 20:57:44.756
cmud5o50o00102pzte8gifz68	Лайки	instagram-likes	cmud5o4yy000x2pzt6dk4jlor	all	0	\N	f	\N	\N	\N	2026-09-22 20:57:44.809	2026-09-22 20:57:44.809
cmud5o51n00122pzteqovj2ob	Просмотры	instagram-views	cmud5o4yy000x2pzt6dk4jlor	all	0	\N	f	\N	\N	\N	2026-09-22 20:57:44.843	2026-09-22 20:57:44.843
cmud5o52n00152pztjywjjsmb	Подписчики	tiktok-followers	cmud5o52f00142pztvxeuv0fs	all	0	\N	f	\N	\N	\N	2026-09-22 20:57:44.879	2026-09-22 20:57:44.879
cmud5o53d00172pztp2w5z3zm	Просмотры	tiktok-views	cmud5o52f00142pztvxeuv0fs	all	0	\N	f	\N	\N	\N	2026-09-22 20:57:44.905	2026-09-22 20:57:44.905
cmud5o54400192pztor052uat	Лайки	tiktok-likes	cmud5o52f00142pztvxeuv0fs	all	0	\N	f	\N	\N	\N	2026-09-22 20:57:44.933	2026-09-22 20:57:44.933
\.


--
-- Data for Name: Commission; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public."Commission" (id, "orderId", "referrerId", amount, status, "updatedAt", "createdAt") FROM stdin;
\.


--
-- Data for Name: ContentCategory; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public."ContentCategory" (id, name, slug, "parentId", sort, "createdAt", "updatedAt") FROM stdin;
\.


--
-- Data for Name: ContentItem; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public."ContentItem" (id, type, slug, title, excerpt, "coverImage", "contentJson", "contentHtml", "categoryId", "authorName", "viewCount", "isPublished", "publishedAt", "metaTitle", "metaDescription", "readTimeMinutes", "createdAt", "updatedAt") FROM stdin;
\.


--
-- Data for Name: CustomerGroup; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public."CustomerGroup" (id, name, slug, description, "tenantId", "isDefault", "discountPercent", "createdAt", "updatedAt") FROM stdin;
\.


--
-- Data for Name: CxApologyCompensation; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public."CxApologyCompensation" (id, "userId", "orderId", "amountCents", reason, status, "createdAt") FROM stdin;
\.


--
-- Data for Name: EconomicOptimizationSnapshot; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public."EconomicOptimizationSnapshot" (id, "tenantId", "analyzedPeriodDays", "totalLeakageRub", "leakingServicesCount", "executiveSummary", "toolExecutionTrace", status, "appliedBy", "appliedAt", "createdAt", "updatedAt") FROM stdin;
\.


--
-- Data for Name: EmployeeResponsibilityConsent; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public."EmployeeResponsibilityConsent" (id, "userId", "tenantId", "documentVersionId", "documentVersionText", "documentHash", "acceptedAt", "acceptedIp", "acceptedUserAgent", status, "createdAt") FROM stdin;
\.


--
-- Data for Name: FeatureFlag; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public."FeatureFlag" (id, key, label, description, state, "updatedBy", "updatedAt", "createdAt") FROM stdin;
\.


--
-- Data for Name: Invoice; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public."Invoice" (id, "userId", amount, status, "fileUrl", "actUrl", "paymentId", "createdAt", "updatedAt") FROM stdin;
\.


--
-- Data for Name: LedgerEntry; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public."LedgerEntry" (id, "tenantId", "userId", "adminId", amount, reason, status, "idempotencyKey", "transactionType", immutable, "periodId", "createdAt", "updatedAt") FROM stdin;
cmud5o31b00032pztaboypfa0	smmplan	cmud5o2z700012pzttalr6fv3	\N	10000000	Initial Seed Balance	APPROVED	seed-ledger-user-cmud5o2z700012pzttalr6fv3	DEPOSIT	f	\N	2026-09-22 20:57:42.239	2026-09-22 20:57:42.239
cmud5o3um00062pztqglbzhb6	smmplan	cmud5o3uc00042pzt4dxy88kl	\N	20000000	Initial Seed Balance	APPROVED	seed-ledger-user-cmud5o3uc00042pzt4dxy88kl	DEPOSIT	f	\N	2026-09-22 20:57:43.295	2026-09-22 20:57:43.295
cmud5o41q00092pzt5782aecd	smmplan	cmud5o41700072pzteff7cizx	\N	50000000	Initial Seed Balance	APPROVED	seed-ledger-user-cmud5o41700072pzteff7cizx	DEPOSIT	f	\N	2026-09-22 20:57:43.55	2026-09-22 20:57:43.55
cmud5o56h001d2pztdc133r40	smmplan	cmud5o566001b2pzt9w9w5fww	\N	500000	Initial Seed Balance	APPROVED	seed-ledger-user-cmud5o566001b2pzt9w9w5fww	DEPOSIT	f	\N	2026-09-22 20:57:45.017	2026-09-22 20:57:45.017
cmud5o574001g2pzt7i38f7or	smmplan	cmud5o56w001e2pztf8rizftl	\N	500000	Initial Seed Balance	APPROVED	seed-ledger-user-cmud5o56w001e2pztf8rizftl	DEPOSIT	f	\N	2026-09-22 20:57:45.04	2026-09-22 20:57:45.04
cmud5o57n001j2pzt8l4ekcnx	smmplan	cmud5o57f001h2pztguvmf3rz	\N	500000	Initial Seed Balance	APPROVED	seed-ledger-user-cmud5o57f001h2pztguvmf3rz	DEPOSIT	f	\N	2026-09-22 20:57:45.059	2026-09-22 20:57:45.059
\.


--
-- Data for Name: LegalDocumentVersion; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public."LegalDocumentVersion" (id, "tenantId", type, version, title, "contentHash", "isActive", "effectiveAt", "createdBy", "createdAt") FROM stdin;
\.


--
-- Data for Name: LoginLog; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public."LoginLog" (id, "tenantId", email, "userId", "ipAddress", "userAgent", success, "failReason", "createdAt") FROM stdin;
\.


--
-- Data for Name: ManualBalanceAdjustment; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public."ManualBalanceAdjustment" (id, "userId", "requestedBy", direction, amount, "reasonCode", "reasonNote", "ticketId", "orderId", "paymentId", status, "idempotencyKey", "approvedBy", "approvedAt", "rejectedBy", "rejectedAt", "rejectionReason", "executionError", "ledgerEntryId", "policySnapshot", "createdAt", "updatedAt") FROM stdin;
\.


--
-- Data for Name: MessageAttachment; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public."MessageAttachment" (id, "messageId", url, type, "mimeType", name, size, "createdAt") FROM stdin;
\.


--
-- Data for Name: Network; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public."Network" (id, name, slug, icon, sort, "isActive", "tenantId", "createdAt", "updatedAt") FROM stdin;
cmud5o44k000a2pztmvhj61sh	Telegram	telegram	telegram	1	t	all	2026-09-22 20:57:43.649	2026-09-22 20:57:43.649
cmud5o4i8000j2pztli6vflzn	ВКонтакте	vk	vk	2	t	all	2026-09-22 20:57:44.144	2026-09-22 20:57:44.144
cmud5o4rp000q2pztem0ynqgr	YouTube	youtube	youtube	3	t	all	2026-09-22 20:57:44.485	2026-09-22 20:57:44.485
cmud5o4yy000x2pzt6dk4jlor	Instagram	instagram	instagram	4	t	all	2026-09-22 20:57:44.747	2026-09-22 20:57:44.747
cmud5o52f00142pztvxeuv0fs	TikTok	tiktok	tiktok	5	t	all	2026-09-22 20:57:44.872	2026-09-22 20:57:44.872
\.


--
-- Data for Name: Order; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public."Order" (id, "numericId", "userId", "serviceId", "providerId", "providerServiceId", "externalId", "dripExternalIds", link, "isLinkOverridden", quantity, status, remains, start_count, charge, "providerCost", error, "actualProviderCost", "realMarginDelta", "retryCount", "isTest", email, "customData", "usdToRubRate", "environmentMode", "isDripFeed", runs, "interval", "currentRun", "nextRunAt", "waitingUntil", "discountCents", "promoCodeId", "createdAt", "updatedAt", "paymentId", "idempotencyKey", "abVariant", "tenantId") FROM stdin;
cmud5o59q00252pztap5846e3	1	cmud5o566001b2pzt9w9w5fww	cmud5o49y000c2pztw7q11bbv	\N	\N	ext_1790110665133_0	{}	https://instagram.com/p/test	f	1000	PENDING	0	\N	1500	500	\N	\N	\N	0	f	\N	\N	\N	PRODUCTION	f	\N	\N	0	\N	\N	0	\N	2026-08-24 18:53:36.779	2026-09-22 20:57:45.134	\N	\N	\N	smmplan
cmud5o5aw00272pzttvp2vcjd	2	cmud5o56w001e2pztf8rizftl	cmud5o49y000c2pztw7q11bbv	\N	\N	ext_1790110665175_1	{}	https://instagram.com/p/test	f	1000	PENDING	0	\N	1500	500	\N	\N	\N	0	f	\N	\N	\N	PRODUCTION	f	\N	\N	0	\N	\N	0	\N	2026-09-05 09:24:52.005	2026-09-22 20:57:45.176	\N	\N	\N	smmplan
cmud5o5b300292pztwj7dcn0u	3	cmud5o57f001h2pztguvmf3rz	cmud5o49y000c2pztw7q11bbv	\N	\N	ext_1790110665182_2	{}	https://instagram.com/p/test	f	1000	IN_PROGRESS	0	\N	1500	500	\N	\N	\N	0	f	\N	\N	\N	PRODUCTION	f	\N	\N	0	\N	\N	0	\N	2026-08-25 13:32:49.186	2026-09-22 20:57:45.183	\N	\N	\N	smmplan
cmud5o5ba002b2pztvbdsvd0d	4	cmud5o566001b2pzt9w9w5fww	cmud5o49y000c2pztw7q11bbv	\N	\N	ext_1790110665189_3	{}	https://instagram.com/p/test	f	1000	PENDING	0	\N	1500	500	\N	\N	\N	0	f	\N	\N	\N	PRODUCTION	f	\N	\N	0	\N	\N	0	\N	2026-09-09 11:05:45.26	2026-09-22 20:57:45.19	\N	\N	\N	smmplan
cmud5o5bg002d2pzt5oxcfg7l	5	cmud5o56w001e2pztf8rizftl	cmud5o49y000c2pztw7q11bbv	\N	\N	ext_1790110665196_4	{}	https://instagram.com/p/test	f	1000	COMPLETED	0	\N	1500	500	\N	\N	\N	0	f	\N	\N	\N	PRODUCTION	f	\N	\N	0	\N	\N	0	\N	2026-08-28 18:51:42.646	2026-09-22 20:57:45.197	\N	\N	\N	smmplan
cmud5o5bo002f2pzt8x5lkgwh	6	cmud5o57f001h2pztguvmf3rz	cmud5o49y000c2pztw7q11bbv	\N	\N	ext_1790110665202_5	{}	https://instagram.com/p/test	f	1000	COMPLETED	0	\N	1500	500	\N	\N	\N	0	f	\N	\N	\N	PRODUCTION	f	\N	\N	0	\N	\N	0	\N	2026-08-26 00:10:20.002	2026-09-22 20:57:45.204	\N	\N	\N	smmplan
cmud5o5bu002h2pztwqj6oy7h	7	cmud5o566001b2pzt9w9w5fww	cmud5o49y000c2pztw7q11bbv	\N	\N	ext_1790110665209_6	{}	https://instagram.com/p/test	f	1000	ERROR	0	\N	1500	500	\N	\N	\N	0	f	\N	\N	\N	PRODUCTION	f	\N	\N	0	\N	\N	0	\N	2026-09-12 02:44:06.222	2026-09-22 20:57:45.21	\N	\N	\N	smmplan
cmud5o5c1002j2pztixsa1rg1	8	cmud5o56w001e2pztf8rizftl	cmud5o49y000c2pztw7q11bbv	\N	\N	ext_1790110665216_7	{}	https://instagram.com/p/test	f	1000	ERROR	0	\N	1500	500	\N	\N	\N	0	f	\N	\N	\N	PRODUCTION	f	\N	\N	0	\N	\N	0	\N	2026-09-01 23:17:14.701	2026-09-22 20:57:45.217	\N	\N	\N	smmplan
cmud5o5c9002l2pzt9gyipb9z	9	cmud5o57f001h2pztguvmf3rz	cmud5o49y000c2pztw7q11bbv	\N	\N	ext_1790110665224_8	{}	https://instagram.com/p/test	f	1000	CANCELED	1000	\N	1500	500	\N	\N	\N	0	f	\N	\N	\N	PRODUCTION	f	\N	\N	0	\N	\N	0	\N	2026-09-10 03:16:56.8	2026-09-22 20:57:45.225	\N	\N	\N	smmplan
cmud5o5ch002n2pztbc8epgj3	10	cmud5o566001b2pzt9w9w5fww	cmud5o49y000c2pztw7q11bbv	\N	\N	ext_1790110665231_9	{}	https://instagram.com/p/test	f	1000	IN_PROGRESS	0	\N	1500	500	\N	\N	\N	0	f	\N	\N	\N	PRODUCTION	f	\N	\N	0	\N	\N	0	\N	2026-09-07 20:41:09.238	2026-09-22 20:57:45.232	\N	\N	\N	smmplan
cmud5o5co002p2pztl8ibso78	11	cmud5o56w001e2pztf8rizftl	cmud5o49y000c2pztw7q11bbv	\N	\N	ext_1790110665239_10	{}	https://instagram.com/p/test	f	1000	CANCELED	1000	\N	1500	500	\N	\N	\N	0	f	\N	\N	\N	PRODUCTION	f	\N	\N	0	\N	\N	0	\N	2026-09-14 07:32:29.487	2026-09-22 20:57:45.24	\N	\N	\N	smmplan
cmud5o5cv002r2pztsimwwu23	12	cmud5o57f001h2pztguvmf3rz	cmud5o49y000c2pztw7q11bbv	\N	\N	ext_1790110665246_11	{}	https://instagram.com/p/test	f	1000	COMPLETED	0	\N	1500	500	\N	\N	\N	0	f	\N	\N	\N	PRODUCTION	f	\N	\N	0	\N	\N	0	\N	2026-09-16 19:13:45.572	2026-09-22 20:57:45.247	\N	\N	\N	smmplan
cmud5o5d3002t2pzt8wjp08hn	13	cmud5o566001b2pzt9w9w5fww	cmud5o49y000c2pztw7q11bbv	\N	\N	ext_1790110665254_12	{}	https://instagram.com/p/test	f	1000	IN_PROGRESS	0	\N	1500	500	\N	\N	\N	0	f	\N	\N	\N	PRODUCTION	f	\N	\N	0	\N	\N	0	\N	2026-08-31 07:27:48.606	2026-09-22 20:57:45.255	\N	\N	\N	smmplan
cmud5o5d9002v2pztrf226o2h	14	cmud5o56w001e2pztf8rizftl	cmud5o49y000c2pztw7q11bbv	\N	\N	ext_1790110665260_13	{}	https://instagram.com/p/test	f	1000	COMPLETED	0	\N	1500	500	\N	\N	\N	0	f	\N	\N	\N	PRODUCTION	f	\N	\N	0	\N	\N	0	\N	2026-09-22 00:35:48.034	2026-09-22 20:57:45.261	\N	\N	\N	smmplan
cmud5o5dg002x2pztj4l7u8pw	15	cmud5o57f001h2pztguvmf3rz	cmud5o49y000c2pztw7q11bbv	\N	\N	ext_1790110665267_14	{}	https://instagram.com/p/test	f	1000	ERROR	0	\N	1500	500	\N	\N	\N	0	f	\N	\N	\N	PRODUCTION	f	\N	\N	0	\N	\N	0	\N	2026-09-12 14:19:21.135	2026-09-22 20:57:45.268	\N	\N	\N	smmplan
cmud5o5dm002z2pzt00gp13et	16	cmud5o566001b2pzt9w9w5fww	cmud5o49y000c2pztw7q11bbv	\N	\N	ext_1790110665273_15	{}	https://instagram.com/p/test	f	1000	CANCELED	1000	\N	1500	500	\N	\N	\N	0	f	\N	\N	\N	PRODUCTION	f	\N	\N	0	\N	\N	0	\N	2026-09-09 03:09:59.922	2026-09-22 20:57:45.274	\N	\N	\N	smmplan
cmud5o5dt00312pztzzxjokmz	17	cmud5o56w001e2pztf8rizftl	cmud5o49y000c2pztw7q11bbv	\N	\N	ext_1790110665280_16	{}	https://instagram.com/p/test	f	1000	PENDING	0	\N	1500	500	\N	\N	\N	0	f	\N	\N	\N	PRODUCTION	f	\N	\N	0	\N	\N	0	\N	2026-08-26 00:04:09.951	2026-09-22 20:57:45.281	\N	\N	\N	smmplan
cmud5o5e500332pztyflobgre	18	cmud5o57f001h2pztguvmf3rz	cmud5o49y000c2pztw7q11bbv	\N	\N	ext_1790110665292_17	{}	https://instagram.com/p/test	f	1000	PENDING	0	\N	1500	500	\N	\N	\N	0	f	\N	\N	\N	PRODUCTION	f	\N	\N	0	\N	\N	0	\N	2026-09-06 01:34:21.141	2026-09-22 20:57:45.293	\N	\N	\N	smmplan
cmud5o5ed00352pzti7n8t4to	19	cmud5o566001b2pzt9w9w5fww	cmud5o49y000c2pztw7q11bbv	\N	\N	ext_1790110665300_18	{}	https://instagram.com/p/test	f	1000	PENDING	0	\N	1500	500	\N	\N	\N	0	f	\N	\N	\N	PRODUCTION	f	\N	\N	0	\N	\N	0	\N	2026-09-20 00:47:01.086	2026-09-22 20:57:45.301	\N	\N	\N	smmplan
cmud5o5ek00372pztefn97asm	20	cmud5o56w001e2pztf8rizftl	cmud5o49y000c2pztw7q11bbv	\N	\N	ext_1790110665307_19	{}	https://instagram.com/p/test	f	1000	ERROR	0	\N	1500	500	\N	\N	\N	0	f	\N	\N	\N	PRODUCTION	f	\N	\N	0	\N	\N	0	\N	2026-09-17 10:09:54.174	2026-09-22 20:57:45.308	\N	\N	\N	smmplan
cmud5o5et00392pzth58cp49p	21	cmud5o57f001h2pztguvmf3rz	cmud5o49y000c2pztw7q11bbv	\N	\N	ext_1790110665315_20	{}	https://instagram.com/p/test	f	1000	COMPLETED	0	\N	1500	500	\N	\N	\N	0	f	\N	\N	\N	PRODUCTION	f	\N	\N	0	\N	\N	0	\N	2026-08-25 12:46:30.913	2026-09-22 20:57:45.317	\N	\N	\N	smmplan
cmud5o5f1003b2pztr9zhghp1	22	cmud5o566001b2pzt9w9w5fww	cmud5o49y000c2pztw7q11bbv	\N	\N	ext_1790110665323_21	{}	https://instagram.com/p/test	f	1000	PENDING	0	\N	1500	500	\N	\N	\N	0	f	\N	\N	\N	PRODUCTION	f	\N	\N	0	\N	\N	0	\N	2026-09-20 02:01:10.257	2026-09-22 20:57:45.325	\N	\N	\N	smmplan
cmud5o5fp003d2pzt8pyq4hz8	23	cmud5o56w001e2pztf8rizftl	cmud5o49y000c2pztw7q11bbv	\N	\N	ext_1790110665348_22	{}	https://instagram.com/p/test	f	1000	IN_PROGRESS	0	\N	1500	500	\N	\N	\N	0	f	\N	\N	\N	PRODUCTION	f	\N	\N	0	\N	\N	0	\N	2026-08-30 06:21:56.662	2026-09-22 20:57:45.349	\N	\N	\N	smmplan
cmud5o5g5003f2pzt25hf984v	24	cmud5o57f001h2pztguvmf3rz	cmud5o49y000c2pztw7q11bbv	\N	\N	ext_1790110665364_23	{}	https://instagram.com/p/test	f	1000	IN_PROGRESS	0	\N	1500	500	\N	\N	\N	0	f	\N	\N	\N	PRODUCTION	f	\N	\N	0	\N	\N	0	\N	2026-08-31 15:17:28.739	2026-09-22 20:57:45.365	\N	\N	\N	smmplan
cmud5o5gc003h2pztp62rteob	25	cmud5o566001b2pzt9w9w5fww	cmud5o49y000c2pztw7q11bbv	\N	\N	ext_1790110665371_24	{}	https://instagram.com/p/test	f	1000	IN_PROGRESS	0	\N	1500	500	\N	\N	\N	0	f	\N	\N	\N	PRODUCTION	f	\N	\N	0	\N	\N	0	\N	2026-09-07 19:14:59.985	2026-09-22 20:57:45.372	\N	\N	\N	smmplan
cmud5o5gu003j2pzt3u88q7o9	26	cmud5o56w001e2pztf8rizftl	cmud5o49y000c2pztw7q11bbv	\N	\N	ext_1790110665389_25	{}	https://instagram.com/p/test	f	1000	IN_PROGRESS	0	\N	1500	500	\N	\N	\N	0	f	\N	\N	\N	PRODUCTION	f	\N	\N	0	\N	\N	0	\N	2026-09-08 17:08:35.078	2026-09-22 20:57:45.39	\N	\N	\N	smmplan
cmud5o5h1003l2pztasnulaxd	27	cmud5o57f001h2pztguvmf3rz	cmud5o49y000c2pztw7q11bbv	\N	\N	ext_1790110665396_26	{}	https://instagram.com/p/test	f	1000	IN_PROGRESS	0	\N	1500	500	\N	\N	\N	0	f	\N	\N	\N	PRODUCTION	f	\N	\N	0	\N	\N	0	\N	2026-08-26 04:23:16.283	2026-09-22 20:57:45.397	\N	\N	\N	smmplan
cmud5o5h9003n2pztbxeemybk	28	cmud5o566001b2pzt9w9w5fww	cmud5o49y000c2pztw7q11bbv	\N	\N	ext_1790110665404_27	{}	https://instagram.com/p/test	f	1000	CANCELED	1000	\N	1500	500	\N	\N	\N	0	f	\N	\N	\N	PRODUCTION	f	\N	\N	0	\N	\N	0	\N	2026-08-27 13:39:19.377	2026-09-22 20:57:45.405	\N	\N	\N	smmplan
cmud5o5hj003p2pzth84pi07f	29	cmud5o56w001e2pztf8rizftl	cmud5o49y000c2pztw7q11bbv	\N	\N	ext_1790110665414_28	{}	https://instagram.com/p/test	f	1000	COMPLETED	0	\N	1500	500	\N	\N	\N	0	f	\N	\N	\N	PRODUCTION	f	\N	\N	0	\N	\N	0	\N	2026-09-08 02:31:43.586	2026-09-22 20:57:45.415	\N	\N	\N	smmplan
cmud5o5hq003r2pzt8bzeox90	30	cmud5o57f001h2pztguvmf3rz	cmud5o49y000c2pztw7q11bbv	\N	\N	ext_1790110665421_29	{}	https://instagram.com/p/test	f	1000	PENDING	0	\N	1500	500	\N	\N	\N	0	f	\N	\N	\N	PRODUCTION	f	\N	\N	0	\N	\N	0	\N	2026-09-04 11:54:36.396	2026-09-22 20:57:45.422	\N	\N	\N	smmplan
cmud5o5hw003t2pztw3i2spg5	31	cmud5o566001b2pzt9w9w5fww	cmud5o49y000c2pztw7q11bbv	\N	\N	ext_1790110665427_30	{}	https://instagram.com/p/test	f	1000	PENDING	0	\N	1500	500	\N	\N	\N	0	f	\N	\N	\N	PRODUCTION	f	\N	\N	0	\N	\N	0	\N	2026-09-18 02:27:14.292	2026-09-22 20:57:45.428	\N	\N	\N	smmplan
cmud5o5ia003v2pztflqwi8p4	32	cmud5o56w001e2pztf8rizftl	cmud5o49y000c2pztw7q11bbv	\N	\N	ext_1790110665440_31	{}	https://instagram.com/p/test	f	1000	COMPLETED	0	\N	1500	500	\N	\N	\N	0	f	\N	\N	\N	PRODUCTION	f	\N	\N	0	\N	\N	0	\N	2026-09-04 22:48:50.39	2026-09-22 20:57:45.442	\N	\N	\N	smmplan
cmud5o5ij003x2pzt0hm1me83	33	cmud5o57f001h2pztguvmf3rz	cmud5o49y000c2pztw7q11bbv	\N	\N	ext_1790110665449_32	{}	https://instagram.com/p/test	f	1000	PENDING	0	\N	1500	500	\N	\N	\N	0	f	\N	\N	\N	PRODUCTION	f	\N	\N	0	\N	\N	0	\N	2026-09-22 16:34:36.651	2026-09-22 20:57:45.451	\N	\N	\N	smmplan
cmud5o5is003z2pztrufg5ut4	34	cmud5o566001b2pzt9w9w5fww	cmud5o49y000c2pztw7q11bbv	\N	\N	ext_1790110665459_33	{}	https://instagram.com/p/test	f	1000	ERROR	0	\N	1500	500	\N	\N	\N	0	f	\N	\N	\N	PRODUCTION	f	\N	\N	0	\N	\N	0	\N	2026-09-14 07:13:41.611	2026-09-22 20:57:45.46	\N	\N	\N	smmplan
cmud5o5j200412pztwfb9l7ig	35	cmud5o56w001e2pztf8rizftl	cmud5o49y000c2pztw7q11bbv	\N	\N	ext_1790110665469_34	{}	https://instagram.com/p/test	f	1000	CANCELED	1000	\N	1500	500	\N	\N	\N	0	f	\N	\N	\N	PRODUCTION	f	\N	\N	0	\N	\N	0	\N	2026-09-20 10:56:21.096	2026-09-22 20:57:45.47	\N	\N	\N	smmplan
cmud5o5j900432pztbd6bv3ix	36	cmud5o57f001h2pztguvmf3rz	cmud5o49y000c2pztw7q11bbv	\N	\N	ext_1790110665476_35	{}	https://instagram.com/p/test	f	1000	COMPLETED	0	\N	1500	500	\N	\N	\N	0	f	\N	\N	\N	PRODUCTION	f	\N	\N	0	\N	\N	0	\N	2026-09-02 13:31:59.782	2026-09-22 20:57:45.477	\N	\N	\N	smmplan
cmud5o5jh00452pztct0n2wc9	37	cmud5o566001b2pzt9w9w5fww	cmud5o49y000c2pztw7q11bbv	\N	\N	ext_1790110665484_36	{}	https://instagram.com/p/test	f	1000	PENDING	0	\N	1500	500	\N	\N	\N	0	f	\N	\N	\N	PRODUCTION	f	\N	\N	0	\N	\N	0	\N	2026-09-05 00:08:42.298	2026-09-22 20:57:45.485	\N	\N	\N	smmplan
cmud5o5jn00472pztzfck5gww	38	cmud5o56w001e2pztf8rizftl	cmud5o49y000c2pztw7q11bbv	\N	\N	ext_1790110665490_37	{}	https://instagram.com/p/test	f	1000	COMPLETED	0	\N	1500	500	\N	\N	\N	0	f	\N	\N	\N	PRODUCTION	f	\N	\N	0	\N	\N	0	\N	2026-09-11 21:22:53.986	2026-09-22 20:57:45.491	\N	\N	\N	smmplan
cmud5o5ju00492pzt4o2tmfdz	39	cmud5o57f001h2pztguvmf3rz	cmud5o49y000c2pztw7q11bbv	\N	\N	ext_1790110665497_38	{}	https://instagram.com/p/test	f	1000	ERROR	0	\N	1500	500	\N	\N	\N	0	f	\N	\N	\N	PRODUCTION	f	\N	\N	0	\N	\N	0	\N	2026-09-22 03:23:46.371	2026-09-22 20:57:45.498	\N	\N	\N	smmplan
cmud5o5k2004b2pzt8mkdaomj	40	cmud5o566001b2pzt9w9w5fww	cmud5o49y000c2pztw7q11bbv	\N	\N	ext_1790110665505_39	{}	https://instagram.com/p/test	f	1000	IN_PROGRESS	0	\N	1500	500	\N	\N	\N	0	f	\N	\N	\N	PRODUCTION	f	\N	\N	0	\N	\N	0	\N	2026-09-09 06:10:12.686	2026-09-22 20:57:45.506	\N	\N	\N	smmplan
cmud5o5kb004d2pzthcg3tya3	41	cmud5o56w001e2pztf8rizftl	cmud5o49y000c2pztw7q11bbv	\N	\N	ext_1790110665514_40	{}	https://instagram.com/p/test	f	1000	ERROR	0	\N	1500	500	\N	\N	\N	0	f	\N	\N	\N	PRODUCTION	f	\N	\N	0	\N	\N	0	\N	2026-09-15 16:41:24.344	2026-09-22 20:57:45.515	\N	\N	\N	smmplan
cmud5o5kj004f2pztkm2gb9tv	42	cmud5o57f001h2pztguvmf3rz	cmud5o49y000c2pztw7q11bbv	\N	\N	ext_1790110665522_41	{}	https://instagram.com/p/test	f	1000	ERROR	0	\N	1500	500	\N	\N	\N	0	f	\N	\N	\N	PRODUCTION	f	\N	\N	0	\N	\N	0	\N	2026-09-14 22:58:45.415	2026-09-22 20:57:45.523	\N	\N	\N	smmplan
cmud5o5kq004h2pztpmvjgc2c	43	cmud5o566001b2pzt9w9w5fww	cmud5o49y000c2pztw7q11bbv	\N	\N	ext_1790110665529_42	{}	https://instagram.com/p/test	f	1000	IN_PROGRESS	0	\N	1500	500	\N	\N	\N	0	f	\N	\N	\N	PRODUCTION	f	\N	\N	0	\N	\N	0	\N	2026-08-28 10:15:12.352	2026-09-22 20:57:45.53	\N	\N	\N	smmplan
cmud5o5kx004j2pztrou6htp4	44	cmud5o56w001e2pztf8rizftl	cmud5o49y000c2pztw7q11bbv	\N	\N	ext_1790110665536_43	{}	https://instagram.com/p/test	f	1000	PENDING	0	\N	1500	500	\N	\N	\N	0	f	\N	\N	\N	PRODUCTION	f	\N	\N	0	\N	\N	0	\N	2026-09-17 22:34:54.631	2026-09-22 20:57:45.537	\N	\N	\N	smmplan
cmud5o5l4004l2pztht564esh	45	cmud5o57f001h2pztguvmf3rz	cmud5o49y000c2pztw7q11bbv	\N	\N	ext_1790110665543_44	{}	https://instagram.com/p/test	f	1000	COMPLETED	0	\N	1500	500	\N	\N	\N	0	f	\N	\N	\N	PRODUCTION	f	\N	\N	0	\N	\N	0	\N	2026-08-31 11:57:07.187	2026-09-22 20:57:45.544	\N	\N	\N	smmplan
cmud5o5la004n2pztfqc8g919	46	cmud5o566001b2pzt9w9w5fww	cmud5o49y000c2pztw7q11bbv	\N	\N	ext_1790110665549_45	{}	https://instagram.com/p/test	f	1000	ERROR	0	\N	1500	500	\N	\N	\N	0	f	\N	\N	\N	PRODUCTION	f	\N	\N	0	\N	\N	0	\N	2026-09-09 20:41:23.046	2026-09-22 20:57:45.55	\N	\N	\N	smmplan
cmud5o5li004p2pzt93szcg1a	47	cmud5o56w001e2pztf8rizftl	cmud5o49y000c2pztw7q11bbv	\N	\N	ext_1790110665557_46	{}	https://instagram.com/p/test	f	1000	COMPLETED	0	\N	1500	500	\N	\N	\N	0	f	\N	\N	\N	PRODUCTION	f	\N	\N	0	\N	\N	0	\N	2026-09-07 22:54:40.839	2026-09-22 20:57:45.558	\N	\N	\N	smmplan
cmud5o5lr004r2pztt5ht9rcw	48	cmud5o57f001h2pztguvmf3rz	cmud5o49y000c2pztw7q11bbv	\N	\N	ext_1790110665566_47	{}	https://instagram.com/p/test	f	1000	PENDING	0	\N	1500	500	\N	\N	\N	0	f	\N	\N	\N	PRODUCTION	f	\N	\N	0	\N	\N	0	\N	2026-09-21 18:31:35.357	2026-09-22 20:57:45.567	\N	\N	\N	smmplan
cmud5o5ly004t2pztgy6yw990	49	cmud5o566001b2pzt9w9w5fww	cmud5o49y000c2pztw7q11bbv	\N	\N	ext_1790110665573_48	{}	https://instagram.com/p/test	f	1000	ERROR	0	\N	1500	500	\N	\N	\N	0	f	\N	\N	\N	PRODUCTION	f	\N	\N	0	\N	\N	0	\N	2026-09-16 20:30:50.121	2026-09-22 20:57:45.574	\N	\N	\N	smmplan
cmud5o5m4004v2pztxpk4tv62	50	cmud5o56w001e2pztf8rizftl	cmud5o49y000c2pztw7q11bbv	\N	\N	ext_1790110665579_49	{}	https://instagram.com/p/test	f	1000	CANCELED	1000	\N	1500	500	\N	\N	\N	0	f	\N	\N	\N	PRODUCTION	f	\N	\N	0	\N	\N	0	\N	2026-08-27 00:08:57.993	2026-09-22 20:57:45.58	\N	\N	\N	smmplan
\.


--
-- Data for Name: OrderRecoveryIncident; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public."OrderRecoveryIncident" (id, "orderId", "userId", "originalProviderId", "swappedProviderId", "absorbedDeltaCents", reason, status, "createdAt") FROM stdin;
\.


--
-- Data for Name: Page; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public."Page" (id, slug, title, content, "updatedAt", "createdAt") FROM stdin;
\.


--
-- Data for Name: Payment; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public."Payment" (id, "userId", "orderId", amount, currency, status, "gatewayId", gateway, "consentIp", "consentUserAgent", "consentVersion", "checkoutUrl", "receiptId", "refundReceiptId", "abVariant", "tenantId", "createdAt", "updatedAt") FROM stdin;
cmud5o57t001l2pzt1i6yr4ve	cmud5o566001b2pzt9w9w5fww	\N	155295	RUB	SUCCEEDED	\N	yookassa	\N	\N	\N	\N	\N	\N	\N	smmplan	2026-08-30 23:35:36.601	2026-09-22 20:57:45.066
cmud5o584001n2pztmuoadn0g	cmud5o56w001e2pztf8rizftl	\N	509919	RUB	SUCCEEDED	\N	yookassa	\N	\N	\N	\N	\N	\N	\N	smmplan	2026-09-01 14:42:51.478	2026-09-22 20:57:45.076
cmud5o589001p2pztydyr185d	cmud5o57f001h2pztguvmf3rz	\N	271077	RUB	SUCCEEDED	\N	yookassa	\N	\N	\N	\N	\N	\N	\N	smmplan	2026-08-25 20:40:12.169	2026-09-22 20:57:45.082
cmud5o58f001r2pztz52veurm	cmud5o566001b2pzt9w9w5fww	\N	584641	RUB	SUCCEEDED	\N	yookassa	\N	\N	\N	\N	\N	\N	\N	smmplan	2026-09-14 02:39:30.941	2026-09-22 20:57:45.087
cmud5o58k001t2pzt72v5uvu4	cmud5o56w001e2pztf8rizftl	\N	399228	RUB	SUCCEEDED	\N	yookassa	\N	\N	\N	\N	\N	\N	\N	smmplan	2026-08-25 23:34:59.876	2026-09-22 20:57:45.092
cmud5o58s001v2pztuwui6mn6	cmud5o57f001h2pztguvmf3rz	\N	127932	RUB	SUCCEEDED	\N	yookassa	\N	\N	\N	\N	\N	\N	\N	smmplan	2026-09-11 14:06:45.939	2026-09-22 20:57:45.1
cmud5o58x001x2pzt9me8nopf	cmud5o566001b2pzt9w9w5fww	\N	465969	RUB	SUCCEEDED	\N	yookassa	\N	\N	\N	\N	\N	\N	\N	smmplan	2026-09-10 14:48:38.675	2026-09-22 20:57:45.105
cmud5o595001z2pzteuiudbrc	cmud5o56w001e2pztf8rizftl	\N	534243	RUB	SUCCEEDED	\N	yookassa	\N	\N	\N	\N	\N	\N	\N	smmplan	2026-09-18 11:26:12.266	2026-09-22 20:57:45.114
cmud5o59a00212pztrt3gtzd0	cmud5o57f001h2pztguvmf3rz	\N	118616	RUB	SUCCEEDED	\N	yookassa	\N	\N	\N	\N	\N	\N	\N	smmplan	2026-09-20 14:32:43.534	2026-09-22 20:57:45.119
cmud5o59g00232pzt3nviuawd	cmud5o566001b2pzt9w9w5fww	\N	498553	RUB	SUCCEEDED	\N	yookassa	\N	\N	\N	\N	\N	\N	\N	smmplan	2026-09-09 08:27:20.512	2026-09-22 20:57:45.124
\.


--
-- Data for Name: PiiAccessLog; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public."PiiAccessLog" (id, "staffId", "staffEmail", action, "targetId", "targetType", fields, ip, "userAgent", "createdAt") FROM stdin;
\.


--
-- Data for Name: PreLaunchLead; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public."PreLaunchLead" (id, email, "tenantId", "ipHash", source, "isNotified", "notifiedAt", "createdAt") FROM stdin;
\.


--
-- Data for Name: ProcessedBonusEvent; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public."ProcessedBonusEvent" (id, "eventType", "eventId", "userId", "amountCents", status, "createdAt") FROM stdin;
\.


--
-- Data for Name: PromoCode; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public."PromoCode" (id, code, type, "discountPercent", amount, "maxUses", uses, "isActive", "expiresAt", "createdAt", description, "utmSource", "utmMedium", "utmCampaign", "budgetCents", "isSuspicious") FROM stdin;
\.


--
-- Data for Name: PromoCodeUsage; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public."PromoCodeUsage" (id, "promoCodeId", "userId", "orderId", "discountCents", "revenueCents", "profitCents", "isSuspicious", "createdAt") FROM stdin;
\.


--
-- Data for Name: Provider; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public."Provider" (id, name, "apiUrl", "apiKey", "isActive", metadata, "providerType", "syncLock", "balanceCurrency", "ticketUrl", "createdAt", "updatedAt", "errorCount5m", "lastErrorAt", "lastSuccessAt", "avgResponseMs", "proxyId") FROM stdin;
cmud5o2yc00002pztc50y6l9l	Vexboost	https://vexboost.ru/api/v2/	v1:f8a65e29b18c8f57fe8b5de9518e5d42:8d6335c25f0389978045c27a13e00467:c20ba4e87db5d63c42372eb7d6dc263e5e6c0d37cb04c65b201cfaf74c97fd304e480c67d004d02e1059080b1dc2102a8e060c1557b41b7bea3bf247	t	\N	SMM_PANEL	f	USD	https://vexboost.ru/tickets/	2026-09-22 20:57:42.132	2026-09-22 21:05:07.434	2	2026-09-22 21:05:07.43	\N	0	\N
\.


--
-- Data for Name: ProviderOutbox; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public."ProviderOutbox" (id, "orderId", "providerId", "idempotencyKey", status, "providerOrderId", payload, "responseBody", error, attempts, "lastAttemptAt", "createdAt", "updatedAt") FROM stdin;
\.


--
-- Data for Name: ProviderProxy; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public."ProviderProxy" (id, label, description, protocol, host, port, username, "passwordEncrypted", "isActive", "isRotating", "geoCountry", tags, "lastTestAt", "lastTestLatencyMs", "lastTestSuccess", "errorCount", "lastErrorAt", "consecutiveFailures", category, "subscriptionUrl", "expiresAt", "trafficUsedBytes", "trafficTotalBytes", "lastSyncAt", "createdAt", "updatedAt") FROM stdin;
\.


--
-- Data for Name: ProviderProxyLog; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public."ProviderProxyLog" (id, "proxyId", "providerId", action, url, method, "statusCode", "latencyMs", error, "bytesSent", "bytesReceived", "createdAt") FROM stdin;
\.


--
-- Data for Name: RateLimit; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public."RateLimit" (id, ip, endpoint, hits, "expiresAt", "createdAt") FROM stdin;
\.


--
-- Data for Name: Refill; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public."Refill" (id, "numericId", "orderId", status, "externalId", "createdAt", "updatedAt") FROM stdin;
\.


--
-- Data for Name: RoutingAuditLog; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public."RoutingAuditLog" (id, "serviceId", "adminId", action, "fromProviderId", "toProviderId", reason, "createdAt") FROM stdin;
\.


--
-- Data for Name: SecurityEvent; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public."SecurityEvent" (id, "tenantId", event, severity, ip, details, "createdAt") FROM stdin;
\.


--
-- Data for Name: Service; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public."Service" (id, "numericId", name, description, icon, features, "categoryId", "tenantId", "providerId", rate, "providerCurrency", "costPer1kRub", "currencyCapturedAt", "usdRateAtCapture", markup, "anomalyScore", "minQty", "maxQty", "externalId", "dataHash", "lastSeenAt", "isDripFeedEnabled", "isRefillEnabled", "isCancelEnabled", "isCustomName", "isCustomDescription", "qualityTier", "isQuarantined", "pendingRate", "quarantineReason", "quarantinedAt", "cooldownUntil", "cooldownReason", "etaP50Seconds", "etaP90Seconds", "etaSampleCount", "etaSpeedClass", "etaUpdatedAt", "targetType", "customDataType", "customDataLabel", "isMediaGroupAware", "linkValidatorRegex", "linkPlaceholder", "linkHint", "requiresBotAdmin", "requireWarning", "warningMessage", "clientRequirement", "clientConfirmation", "isActive", "pricePer1000Cents", "createdAt", "updatedAt", slug, "sortOrder") FROM stdin;
cmud5o4em000d2pztbvg6izo2	2	Telegram Подписчики (Живые СНГ / Без отписок)	\N	\N	\N	cmud5o46c000b2pztszbkxh6q	all	cmud5o2yc00002pztc50y6l9l	0.35	USD	\N	\N	\N	3	0	50	20000	tg_sub_real	\N	\N	t	f	f	f	f	STANDARD	f	\N	\N	\N	\N	\N	\N	\N	0	\N	\N	CHANNEL	NONE	\N	f	\N	\N	\N	f	f	\N	\N	\N	t	10500	2026-09-22 20:57:44.014	2026-09-22 20:57:44.014	\N	0
cmud5o4fs000f2pztf2l4pd21	3	Telegram Просмотры на пост (Моментальные)	\N	\N	\N	cmud5o4f4000e2pzto83kd9xa	all	cmud5o2yc00002pztc50y6l9l	0.005	USD	\N	\N	\N	3	0	100	100000	tg_views_fast	\N	\N	t	f	f	f	f	STANDARD	f	\N	\N	\N	\N	\N	\N	\N	0	\N	\N	POST	NONE	\N	f	\N	\N	\N	f	f	\N	\N	\N	t	150	2026-09-22 20:57:44.056	2026-09-22 20:57:44.056	\N	0
cmud5o4gc000g2pztskn791fz	4	Telegram Автопросмотры на 10 постов	\N	\N	\N	cmud5o4f4000e2pzto83kd9xa	all	cmud5o2yc00002pztc50y6l9l	0.05	USD	\N	\N	\N	3	0	100	50000	tg_views_auto	\N	\N	t	f	f	f	f	STANDARD	f	\N	\N	\N	\N	\N	\N	\N	0	\N	\N	POST	NONE	\N	f	\N	\N	\N	f	f	\N	\N	\N	t	1500	2026-09-22 20:57:44.076	2026-09-22 20:57:44.076	\N	0
cmud5o4hr000i2pztsifqfmxe	5	Telegram Реакции (Позитивные 🔥👍❤️)	\N	\N	\N	cmud5o4gp000h2pztxzfmcz1a	all	cmud5o2yc00002pztc50y6l9l	0.02	USD	\N	\N	\N	3	0	50	50000	tg_react_pos	\N	\N	t	f	f	f	f	STANDARD	f	\N	\N	\N	\N	\N	\N	\N	0	\N	\N	POST	NONE	\N	f	\N	\N	\N	f	f	\N	\N	\N	t	600	2026-09-22 20:57:44.127	2026-09-22 20:57:44.127	\N	0
cmud5o4j2000l2pzt1afjv3fz	6	VK Подписчики в сообщество (СНГ, Безопасные)	\N	\N	\N	cmud5o4ig000k2pztsjb2jpwc	all	cmud5o2yc00002pztc50y6l9l	0.25	USD	\N	\N	\N	3	0	100	25000	vk_sub_group	\N	\N	t	f	f	f	f	STANDARD	f	\N	\N	\N	\N	\N	\N	\N	0	\N	\N	GROUP	NONE	\N	f	\N	\N	\N	f	f	\N	\N	\N	t	7500	2026-09-22 20:57:44.174	2026-09-22 20:57:44.174	\N	0
cmud5o4m3000n2pzt5a19743i	7	VK Лайки на пост	\N	\N	\N	cmud5o4kg000m2pztzzj2zkpp	all	cmud5o2yc00002pztc50y6l9l	0.05	USD	\N	\N	\N	3	0	50	10000	vk_likes	\N	\N	t	f	f	f	f	STANDARD	f	\N	\N	\N	\N	\N	\N	\N	0	\N	\N	POST	NONE	\N	f	\N	\N	\N	f	f	\N	\N	\N	t	1500	2026-09-22 20:57:44.283	2026-09-22 20:57:44.283	\N	0
cmud5o4ob000p2pzt5u9ar8ab	8	VK Просмотры записей / клипов	\N	\N	\N	cmud5o4mv000o2pzt5e9nkn79	all	cmud5o2yc00002pztc50y6l9l	0.01	USD	\N	\N	\N	3	0	100	100000	vk_views	\N	\N	t	f	f	f	f	STANDARD	f	\N	\N	\N	\N	\N	\N	\N	0	\N	\N	POST	NONE	\N	f	\N	\N	\N	f	f	\N	\N	\N	t	300	2026-09-22 20:57:44.363	2026-09-22 20:57:44.363	\N	0
cmud5o4uk000s2pzt5ok7o96b	9	YouTube Подписчики на канал (Гарантия 30 дней)	\N	\N	\N	cmud5o4s0000r2pzt3yipdzwo	all	cmud5o2yc00002pztc50y6l9l	1.5	USD	\N	\N	\N	3	0	50	10000	yt_subs_guar	\N	\N	t	f	f	f	f	STANDARD	f	\N	\N	\N	\N	\N	\N	\N	0	\N	\N	PROFILE	NONE	\N	f	\N	\N	\N	f	f	\N	\N	\N	t	45000	2026-09-22 20:57:44.589	2026-09-22 20:57:44.589	\N	0
cmud5o4x1000u2pzt4wtomtcz	10	YouTube Просмотры с удержанием (High Retention)	\N	\N	\N	cmud5o4vn000t2pztiohxppcr	all	cmud5o2yc00002pztc50y6l9l	0.4	USD	\N	\N	\N	3	0	500	500000	yt_views_hr	\N	\N	t	f	f	f	f	STANDARD	f	\N	\N	\N	\N	\N	\N	\N	0	\N	\N	VIDEO	NONE	\N	f	\N	\N	\N	f	f	\N	\N	\N	t	12000	2026-09-22 20:57:44.677	2026-09-22 20:57:44.677	\N	0
cmud5o4yf000w2pztdg03i16w	11	YouTube Лайки на видео / Shorts	\N	\N	\N	cmud5o4xp000v2pztyrdkf25i	all	cmud5o2yc00002pztc50y6l9l	0.1	USD	\N	\N	\N	3	0	50	25000	yt_likes	\N	\N	t	f	f	f	f	STANDARD	f	\N	\N	\N	\N	\N	\N	\N	0	\N	\N	VIDEO	NONE	\N	f	\N	\N	\N	f	f	\N	\N	\N	t	3000	2026-09-22 20:57:44.727	2026-09-22 20:57:44.727	\N	0
cmud5o4zp000z2pztt02v16h9	12	Instagram Подписчики (Быстрый старт)	\N	\N	\N	cmud5o4z8000y2pztjlol8die	all	cmud5o2yc00002pztc50y6l9l	0.18	USD	\N	\N	\N	3	0	100	50000	ig_fol_fast	\N	\N	t	f	f	f	f	STANDARD	f	\N	\N	\N	\N	\N	\N	\N	0	\N	\N	PROFILE	NONE	\N	f	\N	\N	\N	f	f	\N	\N	\N	t	5400	2026-09-22 20:57:44.773	2026-09-22 20:57:44.773	\N	0
cmud5o51900112pztlg9semat	13	Instagram Лайки на фото / Reels	\N	\N	\N	cmud5o50o00102pzte8gifz68	all	cmud5o2yc00002pztc50y6l9l	0.03	USD	\N	\N	\N	3	0	50	25000	ig_likes_fast	\N	\N	t	f	f	f	f	STANDARD	f	\N	\N	\N	\N	\N	\N	\N	0	\N	\N	POST	NONE	\N	f	\N	\N	\N	f	f	\N	\N	\N	t	900	2026-09-22 20:57:44.829	2026-09-22 20:57:44.829	\N	0
cmud5o52200132pzt3hdhovrx	14	Instagram Просмотры Reels / Видео	\N	\N	\N	cmud5o51n00122pzteqovj2ob	all	cmud5o2yc00002pztc50y6l9l	0.008	USD	\N	\N	\N	3	0	100	100000	ig_views_reels	\N	\N	t	f	f	f	f	STANDARD	f	\N	\N	\N	\N	\N	\N	\N	0	\N	\N	POST	NONE	\N	f	\N	\N	\N	f	f	\N	\N	\N	t	240	2026-09-22 20:57:44.858	2026-09-22 20:57:44.858	\N	0
cmud5o52z00162pzte0pn1lut	15	TikTok Подписчики (Быстрый старт)	\N	\N	\N	cmud5o52n00152pztjywjjsmb	all	cmud5o2yc00002pztc50y6l9l	0.3	USD	\N	\N	\N	3	0	50	20000	tt_sub_fast	\N	\N	t	f	f	f	f	STANDARD	f	\N	\N	\N	\N	\N	\N	\N	0	\N	\N	PROFILE	NONE	\N	f	\N	\N	\N	f	f	\N	\N	\N	t	9000	2026-09-22 20:57:44.892	2026-09-22 20:57:44.892	\N	0
cmud5o53t00182pztqonmodnf	16	TikTok Просмотры видео (Молниеносные)	\N	\N	\N	cmud5o53d00172pztp2w5z3zm	all	cmud5o2yc00002pztc50y6l9l	0.008	USD	\N	\N	\N	3	0	200	1000000	tt_views_fast	\N	\N	t	f	f	f	f	STANDARD	f	\N	\N	\N	\N	\N	\N	\N	0	\N	\N	VIDEO	NONE	\N	f	\N	\N	\N	f	f	\N	\N	\N	t	240	2026-09-22 20:57:44.921	2026-09-22 20:57:44.921	\N	0
cmud5o54i001a2pzt20p14bbu	17	TikTok Лайки (Высокое качество)	\N	\N	\N	cmud5o54400192pztor052uat	all	cmud5o2yc00002pztc50y6l9l	0.12	USD	\N	\N	\N	3	0	50	20000	tt_likes	\N	\N	t	f	f	f	f	STANDARD	f	\N	\N	\N	\N	\N	\N	\N	0	\N	\N	VIDEO	NONE	\N	f	\N	\N	\N	f	f	\N	\N	\N	t	3600	2026-09-22 20:57:44.946	2026-09-22 20:57:44.946	\N	0
cmud5o49y000c2pztw7q11bbv	1	Telegram Подписчики (Быстрые, Микс)	\N	\N	\N	cmud5o46c000b2pztszbkxh6q	all	cmud5o2yc00002pztc50y6l9l	0.15	USD	\N	\N	\N	3	0	100	50000	tg_sub_fast	\N	\N	t	f	f	f	f	STANDARD	f	\N	\N	\N	\N	\N	1288985	1980103	9	ULTRA_SLOW	2026-09-22 21:00:01.21	CHANNEL	NONE	\N	f	\N	\N	\N	f	f	\N	\N	\N	t	4500	2026-09-22 20:57:43.846	2026-09-22 21:00:01.253	\N	0
\.


--
-- Data for Name: ServiceCustomerAccess; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public."ServiceCustomerAccess" (id, "serviceId", "customerGroupId", "isCustomPrice", "customPriceRub", "createdAt", "updatedAt") FROM stdin;
\.


--
-- Data for Name: ServiceDraft; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public."ServiceDraft" (id, "serviceId", "providerId", "externalId", "tenantId", name, "cleanName", description, "categoryId", "targetType", status, "procurementRate", "procurementCurrency", markup, "retailPriceRub", "minQty", "maxQty", "validationStatus", "linkCheckStatus", payload, "adminId", "createdAt", "updatedAt") FROM stdin;
\.


--
-- Data for Name: ServiceEditHistory; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public."ServiceEditHistory" (id, "serviceId", "draftId", "adminId", "adminEmail", "changeType", field, "oldValue", "newValue", comment, "ipAddress", "createdAt") FROM stdin;
\.


--
-- Data for Name: ServiceLinkCheck; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public."ServiceLinkCheck" (id, "serviceId", "targetType", "testUrl", "isSuccess", "statusCode", "responseTimeMs", "errorMessage", "checkedBy", "checkedAt") FROM stdin;
\.


--
-- Data for Name: ServicePriceHistory; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public."ServicePriceHistory" (id, "serviceId", rate, "createdAt") FROM stdin;
\.


--
-- Data for Name: ServiceRoute; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public."ServiceRoute" (id, "serviceId", "providerId", "providerServiceId", "isPrimary", "isActive", priority, "failoverMode", "createdAt", "updatedAt") FROM stdin;
\.


--
-- Data for Name: ServiceSmartConfig; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public."ServiceSmartConfig" (id, "serviceId", "isEnabled", "isTestMode", "minChunk", "maxChunk", markup, "providersPriority", "useInviteBuffer", "autoCompensate", "checkIntervalMins", "createdAt", "updatedAt") FROM stdin;
\.


--
-- Data for Name: Session; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public."Session" (id, "userId", "expiresAt", "userAgent", "ipAddress", "impersonatedBy", "createdAt") FROM stdin;
\.


--
-- Data for Name: ShadowService; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public."ShadowService" (id, "providerId", "externalId", name, type, category, rate, "rateRub", min, max, refill, cancel, dripfeed, "cleanName", platform, "normalizedCategory", "targetType", "customDataType", "isMediaGroupAware", "isPrivate", warranty, geo, velocity, "anomalyScore", "tenantId", "createdAt", "updatedAt") FROM stdin;
\.


--
-- Data for Name: SlaTelemetrySnapshot; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public."SlaTelemetrySnapshot" (id, "providerId", "serviceId", "p50Seconds", "p90Seconds", "p99Seconds", "sampleCount", "isDegraded", "createdAt") FROM stdin;
\.


--
-- Data for Name: SmartCampaign; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public."SmartCampaign" (id, "userId", "serviceId", status, link, "totalQuantity", "totalDays", "isTestMode", "createdAt", "updatedAt", "paymentId", "orderId") FROM stdin;
\.


--
-- Data for Name: SmartChannelMetric; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public."SmartChannelMetric" (id, "campaignId", "recordedAt", "memberCount", delta, "detectedDrops", "compensatedQty") FROM stdin;
\.


--
-- Data for Name: SmartDetectedUser; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public."SmartDetectedUser" (id, "campaignId", "telegramId", score, reasons, "createdAt") FROM stdin;
\.


--
-- Data for Name: SmartExecution; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public."SmartExecution" (id, "taskId", "providerId", "externalOrderId", "qtySent", "qtyDelivered", status, error, "createdAt", "updatedAt") FROM stdin;
\.


--
-- Data for Name: SmartSnapshot; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public."SmartSnapshot" (id, "campaignId", "channelUrl", members, "createdAt") FROM stdin;
\.


--
-- Data for Name: SmartTask; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public."SmartTask" (id, "campaignId", quantity, "runAt", status, error, "createdAt", "updatedAt") FROM stdin;
\.


--
-- Data for Name: StaffPermission; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public."StaffPermission" (id, "tenantId", "roleId", section, "canView", "canEdit") FROM stdin;
\.


--
-- Data for Name: StaffRole; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public."StaffRole" (id, "tenantId", "allowedTenants", name, description, "isSystem", "createdAt", "updatedAt") FROM stdin;
\.


--
-- Data for Name: StaffShift; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public."StaffShift" (id, "userId", date, "shiftType", status, "substituteUserId", "substituteHours", "rateRubles", "bonusRubles", "penaltyRubles", notes, "createdAt", "updatedAt") FROM stdin;
\.


--
-- Data for Name: StorefrontKey; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public."StorefrontKey" (id, "tenantId", type, "keyPrefix", "keyHash", name, "isActive", "lastUsedAt", "createdAt", "updatedAt") FROM stdin;
\.


--
-- Data for Name: SupportFinancialAction; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public."SupportFinancialAction" (id, "tenantId", "staffUserId", "targetUserId", direction, source, "amountCents", "reasonCode", "reasonNote", "ticketId", "orderId", "paymentId", "policyId", "policySnapshot", "idempotencyKey", status, "ledgerEntryId", "consentId", "reviewStatus", "reviewedBy", "reviewedAt", "reviewNote", "ipAddress", "userAgent", "createdAt", "updatedAt") FROM stdin;
\.


--
-- Data for Name: SupportHourlyUsage; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public."SupportHourlyUsage" (id, "tenantId", "staffUserId", "hourKey", direction, "amountCents", "operationsCount", "updatedAt") FROM stdin;
\.


--
-- Data for Name: SupportLimitUsage; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public."SupportLimitUsage" (id, "tenantId", "staffUserId", "dayKey", direction, "amountCents", "operationsCount", "updatedAt") FROM stdin;
\.


--
-- Data for Name: SupportTemplate; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public."SupportTemplate" (id, shortcut, label, text, category, "isActive", "useCount", sort, "createdAt", "updatedAt") FROM stdin;
\.


--
-- Data for Name: SystemSetting; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public."SystemSetting" (key, value, "group", description, "updatedAt", "updatedBy") FROM stdin;
\.


--
-- Data for Name: SystemSettings; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public."SystemSettings" (id, "isTestMode", "environmentMode", "taxRate", "usnScheme", "opexMonthly", "maintenanceMode", "siteName", "siteDescription", "telegramBotToken", "telegramBotMode", "welcomeMessage", "telegramMenuConfig", "telegramTemplates", "telegramRatingReasons", "telegramWebhookSecret", "telegramAllowedIps", "telegramRateLimitPerMin", "telegramMaxMessageLength", "telegramProxyId", "telegramMaintenanceMode", "telegramLogErrors", "telegramEnableCsat", "telegramEnableSmartBind", "yookassaShopId", "yookassaSecretKey", "yookassaWebhookSecret", "yookassaTestShopId", "yookassaTestSecretKey", "cryptoBotToken", "quarantineThreshold", "globalMarkup", "safetyFloor", "exchangeRateUSD", "exchangeRateUpdatedAt", "siteLogoUrl", "siteFaviconUrl", "emailProvider", "resendApiKey", "smtpHost", "smtpPort", "smtpUser", "smtpPassword", "supportEmailDomain", "inboundEmailWebhookSecret", "robokassaLogin", "robokassaPassword", "robokassaWebhookPassword", "geminiApiKeys", "geminiProxy", "alfaBankAccountNumber", "alfaBankApiKey", "alfaBankClientSecret", "alfaBankApiBaseUrl", "alfaBankIsSandbox", "updatedAt", "contactSupportEmail", "contactPrivacyEmail", "contactTelegramBot", "contactTelegramChannel", "contactWhatsApp", "contactVk", "legalCompanyName", "legalCompanyInn", "legalCompanyOgrnip", "legalCompanyAddress") FROM stdin;
smmplan	t	PRODUCTION	6	INCOME_EXPENSES	0	f	SMMplan	SMMplan Production Platform	\N	polling	Добро пожаловать в Smmplan! Ваш персональный кабинет готов к работе.	\N	\N	\N	\N	[]	30	4096	\N	f	t	t	t	\N	\N	\N	\N	\N	\N	0.2	3	1	90	\N	\N	\N	SMTP	\N	\N	465	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	https://business.alfabank.ru/ext-api/v1	t	2026-09-22 20:57:42.029	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N
flux	t	PRODUCTION	6	INCOME_EXPENSES	0	f	SMMflux	SMMflux Production Platform	\N	polling	Добро пожаловать в Smmplan! Ваш персональный кабинет готов к работе.	\N	\N	\N	\N	[]	30	4096	\N	f	t	t	t	\N	\N	\N	\N	\N	\N	0.2	3	1	90	\N	\N	\N	SMTP	\N	\N	465	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	https://business.alfabank.ru/ext-api/v1	t	2026-09-22 20:57:42.11	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N
\.


--
-- Data for Name: TelegramBotInstance; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public."TelegramBotInstance" (id, "tenantId", name, username, "tokenEncrypted", role, description, "isActive", "maintenanceMode", "welcomeMessage", "menuConfig", templates, "flowConfig", "allowedUserIds", "createdAt", "updatedAt") FROM stdin;
\.


--
-- Data for Name: TelegramButton; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public."TelegramButton" (id, "tenantId", label, emoji, command, description, "row", col, "sortOrder", "isVisible", "isNew", "requiresAuth", "openUrl", style, "createdAt", "updatedAt") FROM stdin;
\.


--
-- Data for Name: TelegramDailyStat; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public."TelegramDailyStat" (id, "tenantId", date, "messagesReceived", "messagesSent", "commandsHandled", "callbacksHandled", "newUsers", "ordersCreated", "ticketsCreated", "errorsCount", "avgLatencyMs", "p99LatencyMs", "createdAt") FROM stdin;
\.


--
-- Data for Name: TelegramErrorLog; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public."TelegramErrorLog" (id, "tenantId", level, source, "errorCode", "errorMessage", "stackTrace", "updateData", "userId", "chatId", "isResolved", "resolvedBy", "resolvedAt", "occurrenceCount", "firstSeenAt", "lastSeenAt", "createdAt") FROM stdin;
\.


--
-- Data for Name: TelegramProxy; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public."TelegramProxy" (id, "tenantId", label, protocol, host, port, username, "passwordEncrypted", "isActive", "lastTestAt", "lastTestLatencyMs", "lastTestSuccess", "createdAt", "updatedAt") FROM stdin;
\.


--
-- Data for Name: TelegramTemplate; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public."TelegramTemplate" (id, "tenantId", name, slug, description, body, "parseMode", category, variables, "isActive", version, "createdAt", "updatedAt") FROM stdin;
\.


--
-- Data for Name: Tenant; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public."Tenant" (id, name, slug, domain, "customDomain", "isActive", "vaultSalt", "createdAt", "updatedAt") FROM stdin;
smmplan	SMMplan	smmplan	smmplan.pro	\N	t		2026-09-22 20:57:41.942	2026-09-22 20:57:41.942
flux	SMMflux	flux	smmflux.ru	\N	t		2026-09-22 20:57:42.104	2026-09-22 20:57:42.104
\.


--
-- Data for Name: Ticket; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public."Ticket" (id, "userId", subject, status, source, "orderId", "paymentId", "firstRespondedAt", "resolvedAt", tags, "updatedAt", "createdAt", "tenantId") FROM stdin;
\.


--
-- Data for Name: TicketFeedback; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public."TicketFeedback" (id, "ticketId", "userId", score, reasons, comment, source, "tenantId", "createdAt", "updatedAt") FROM stdin;
\.


--
-- Data for Name: TicketMessage; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public."TicketMessage" (id, "ticketId", sender, text, "mediaUrl", "mediaType", "replyToId", "telegramMsgId", "isDeleted", "isEdited", "originalText", "orderId", "createdAt") FROM stdin;
\.


--
-- Data for Name: UrlPattern; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public."UrlPattern" (id, "networkId", pattern, "contentType", sort, "createdAt") FROM stdin;
\.


--
-- Data for Name: User; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public."User" (id, email, "passwordHash", role, "preferredDashboard", balance, "quarantineBalance", "totalSpent", "personalDiscount", "discountEndsAt", "supportLimitCents", "supportSpentTodayCents", "supportLastResetAt", "apiKeyHash", "referralCode", "referredById", "referralBalance", "telegramId", "phoneHash", "isKycVerified", "isEmailVerified", "isBotOnly", "isActive", "isDeleted", "tosAcceptedAt", "tosAcceptedIp", "adminNote", "adminNoteUpdatedAt", "adminNoteUpdatedBy", "geminiApiKey", "twoFactorEnabled", "twoFactorSecret", "twoFactorBackupCodes", "createdAt", "updatedAt", "companyName", inn, kpp, ogrn, "legalAddress", "telegramNotifyOrders", "telegramNotifyBalance", "telegramNotifyTickets", "staffRoleId", "bonusBalance", "customerGroupId", "tenantId", "allowedTenants") FROM stdin;
cmud5o2z700012pzttalr6fv3	admin@example.com	\N	OWNER	CLASSIC	10000000	0	0	0	\N	50000	0	2026-09-22 20:57:42.162	\N	\N	\N	0	\N	\N	f	t	f	t	f	\N	\N	\N	\N	\N	\N	f	\N	{}	2026-09-22 20:57:42.162	2026-09-22 20:57:42.162	\N	\N	\N	\N	\N	t	t	t	\N	0	\N	smmplan	{smmplan}
cmud5o3uc00042pzt4dxy88kl	admin@smmplan.test	$s2$65536$041ab338f9a3fb80dd42fcc537cf8655$7d0160bd82aa94369079caacc24796ee2488684e8624276116f5701bbd08a6ab80bf82cf81644a3c1269f2ac35f54c0c6ccd9eefb75778c7362d91a10abd98fc	OWNER	CLASSIC	20000000	0	0	0	\N	50000	0	2026-09-22 20:57:43.285	\N	\N	\N	0	\N	\N	f	t	f	t	f	\N	\N	\N	\N	\N	\N	f	\N	{}	2026-09-22 20:57:43.285	2026-09-22 20:57:43.285	\N	\N	\N	\N	\N	t	t	t	\N	0	\N	smmplan	{smmplan}
cmud5o41700072pzteff7cizx	client@smmplan.test	$s2$65536$a834460659e659306dfd86b2a5e4207d$473e3c6cd176dcf716df8ad027cdbb6cd37a025aed644491237f17c36ce043afcf428d0b96cc09e4221e6467f9a544d72911abe10b161de6b1fe959af0fd29d6	USER	CLASSIC	50000000	0	0	0	\N	50000	0	2026-09-22 20:57:43.531	\N	\N	\N	0	123456789	\N	f	t	f	t	f	\N	\N	\N	\N	\N	\N	f	\N	{}	2026-09-22 20:57:43.531	2026-09-22 20:57:43.531	\N	\N	\N	\N	\N	t	t	t	\N	0	\N	smmplan	{smmplan}
cmud5o566001b2pzt9w9w5fww	testclient1@example.com	\N	USER	CLASSIC	500000	0	0	0	\N	50000	0	2026-09-22 20:57:45.006	\N	\N	\N	0	\N	\N	f	t	f	t	f	\N	\N	\N	\N	\N	\N	f	\N	{}	2026-09-22 20:57:45.006	2026-09-22 20:57:45.006	\N	\N	\N	\N	\N	t	t	t	\N	0	\N	smmplan	{smmplan}
cmud5o56w001e2pztf8rizftl	testclient2@example.com	\N	USER	CLASSIC	500000	0	0	0	\N	50000	0	2026-09-22 20:57:45.032	\N	\N	\N	0	\N	\N	f	t	f	t	f	\N	\N	\N	\N	\N	\N	f	\N	{}	2026-09-22 20:57:45.032	2026-09-22 20:57:45.032	\N	\N	\N	\N	\N	t	t	t	\N	0	\N	smmplan	{smmplan}
cmud5o57f001h2pztguvmf3rz	testclient3@example.com	\N	USER	CLASSIC	500000	0	0	0	\N	50000	0	2026-09-22 20:57:45.051	\N	\N	\N	0	\N	\N	f	t	f	t	f	\N	\N	\N	\N	\N	\N	f	\N	{}	2026-09-22 20:57:45.051	2026-09-22 20:57:45.051	\N	\N	\N	\N	\N	t	t	t	\N	0	\N	smmplan	{smmplan}
\.


--
-- Data for Name: UserNote; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public."UserNote" (id, "userId", "authorId", content, "orderId", "ticketId", "createdAt") FROM stdin;
\.


--
-- Data for Name: api_request_log; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.api_request_log (id, api_key_hash, action, params, http_status, latency_ms, ip, user_agent, created_at) FROM stdin;
\.


--
-- Data for Name: ledger_period; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.ledger_period (id, month, start_date, end_date, frozen, frozen_at, frozen_by, created_at, updated_at) FROM stdin;
\.


--
-- Data for Name: provider_service_backup; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.provider_service_backup (id, service_id, primary_provider_id, backup_provider_id, backup_external_id, priority, is_active, created_at) FROM stdin;
\.


--
-- Data for Name: reconciliation_report; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.reconciliation_report (id, date, bank_total, db_total, ledger_total, delta_bank_vs_db, delta_db_vs_ledger, status, details, created_at) FROM stdin;
\.


--
-- Data for Name: revenue_recognition; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.revenue_recognition (id, order_id, amount, recognized_at, reversed, reversed_at, reversal_reason, created_at, updated_at) FROM stdin;
\.


--
-- Name: Order_numericId_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public."Order_numericId_seq"', 50, true);


--
-- Name: Refill_numericId_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public."Refill_numericId_seq"', 1, false);


--
-- Name: Service_numericId_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public."Service_numericId_seq"', 17, true);


--
-- Name: AdminAuditLog AdminAuditLog_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."AdminAuditLog"
    ADD CONSTRAINT "AdminAuditLog_pkey" PRIMARY KEY (id);


--
-- Name: AiPricingRecommendation AiPricingRecommendation_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."AiPricingRecommendation"
    ADD CONSTRAINT "AiPricingRecommendation_pkey" PRIMARY KEY (id);


--
-- Name: AnalyticsEvent AnalyticsEvent_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."AnalyticsEvent"
    ADD CONSTRAINT "AnalyticsEvent_pkey" PRIMARY KEY (id);


--
-- Name: ApiConfig ApiConfig_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."ApiConfig"
    ADD CONSTRAINT "ApiConfig_pkey" PRIMARY KEY (id);


--
-- Name: Article Article_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."Article"
    ADD CONSTRAINT "Article_pkey" PRIMARY KEY (id);


--
-- Name: AuditLog AuditLog_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."AuditLog"
    ADD CONSTRAINT "AuditLog_pkey" PRIMARY KEY (id);


--
-- Name: AuthToken AuthToken_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."AuthToken"
    ADD CONSTRAINT "AuthToken_pkey" PRIMARY KEY (id);


--
-- Name: BalanceAdjustmentPolicy BalanceAdjustmentPolicy_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."BalanceAdjustmentPolicy"
    ADD CONSTRAINT "BalanceAdjustmentPolicy_pkey" PRIMARY KEY (id);


--
-- Name: BonusRedemptionLog BonusRedemptionLog_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."BonusRedemptionLog"
    ADD CONSTRAINT "BonusRedemptionLog_pkey" PRIMARY KEY (id);


--
-- Name: Category Category_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."Category"
    ADD CONSTRAINT "Category_pkey" PRIMARY KEY (id);


--
-- Name: Commission Commission_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."Commission"
    ADD CONSTRAINT "Commission_pkey" PRIMARY KEY (id);


--
-- Name: ContentCategory ContentCategory_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."ContentCategory"
    ADD CONSTRAINT "ContentCategory_pkey" PRIMARY KEY (id);


--
-- Name: ContentItem ContentItem_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."ContentItem"
    ADD CONSTRAINT "ContentItem_pkey" PRIMARY KEY (id);


--
-- Name: CustomerGroup CustomerGroup_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."CustomerGroup"
    ADD CONSTRAINT "CustomerGroup_pkey" PRIMARY KEY (id);


--
-- Name: CxApologyCompensation CxApologyCompensation_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."CxApologyCompensation"
    ADD CONSTRAINT "CxApologyCompensation_pkey" PRIMARY KEY (id);


--
-- Name: EconomicOptimizationSnapshot EconomicOptimizationSnapshot_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."EconomicOptimizationSnapshot"
    ADD CONSTRAINT "EconomicOptimizationSnapshot_pkey" PRIMARY KEY (id);


--
-- Name: EmployeeResponsibilityConsent EmployeeResponsibilityConsent_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."EmployeeResponsibilityConsent"
    ADD CONSTRAINT "EmployeeResponsibilityConsent_pkey" PRIMARY KEY (id);


--
-- Name: FeatureFlag FeatureFlag_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."FeatureFlag"
    ADD CONSTRAINT "FeatureFlag_pkey" PRIMARY KEY (id);


--
-- Name: Invoice Invoice_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."Invoice"
    ADD CONSTRAINT "Invoice_pkey" PRIMARY KEY (id);


--
-- Name: LedgerEntry LedgerEntry_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."LedgerEntry"
    ADD CONSTRAINT "LedgerEntry_pkey" PRIMARY KEY (id);


--
-- Name: LegalDocumentVersion LegalDocumentVersion_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."LegalDocumentVersion"
    ADD CONSTRAINT "LegalDocumentVersion_pkey" PRIMARY KEY (id);


--
-- Name: LoginLog LoginLog_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."LoginLog"
    ADD CONSTRAINT "LoginLog_pkey" PRIMARY KEY (id);


--
-- Name: ManualBalanceAdjustment ManualBalanceAdjustment_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."ManualBalanceAdjustment"
    ADD CONSTRAINT "ManualBalanceAdjustment_pkey" PRIMARY KEY (id);


--
-- Name: MessageAttachment MessageAttachment_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."MessageAttachment"
    ADD CONSTRAINT "MessageAttachment_pkey" PRIMARY KEY (id);


--
-- Name: Network Network_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."Network"
    ADD CONSTRAINT "Network_pkey" PRIMARY KEY (id);


--
-- Name: OrderRecoveryIncident OrderRecoveryIncident_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."OrderRecoveryIncident"
    ADD CONSTRAINT "OrderRecoveryIncident_pkey" PRIMARY KEY (id);


--
-- Name: Order Order_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."Order"
    ADD CONSTRAINT "Order_pkey" PRIMARY KEY (id);


--
-- Name: Page Page_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."Page"
    ADD CONSTRAINT "Page_pkey" PRIMARY KEY (id);


--
-- Name: Payment Payment_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."Payment"
    ADD CONSTRAINT "Payment_pkey" PRIMARY KEY (id);


--
-- Name: PiiAccessLog PiiAccessLog_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."PiiAccessLog"
    ADD CONSTRAINT "PiiAccessLog_pkey" PRIMARY KEY (id);


--
-- Name: PreLaunchLead PreLaunchLead_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."PreLaunchLead"
    ADD CONSTRAINT "PreLaunchLead_pkey" PRIMARY KEY (id);


--
-- Name: ProcessedBonusEvent ProcessedBonusEvent_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."ProcessedBonusEvent"
    ADD CONSTRAINT "ProcessedBonusEvent_pkey" PRIMARY KEY (id);


--
-- Name: PromoCodeUsage PromoCodeUsage_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."PromoCodeUsage"
    ADD CONSTRAINT "PromoCodeUsage_pkey" PRIMARY KEY (id);


--
-- Name: PromoCode PromoCode_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."PromoCode"
    ADD CONSTRAINT "PromoCode_pkey" PRIMARY KEY (id);


--
-- Name: ProviderOutbox ProviderOutbox_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."ProviderOutbox"
    ADD CONSTRAINT "ProviderOutbox_pkey" PRIMARY KEY (id);


--
-- Name: ProviderProxyLog ProviderProxyLog_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."ProviderProxyLog"
    ADD CONSTRAINT "ProviderProxyLog_pkey" PRIMARY KEY (id);


--
-- Name: ProviderProxy ProviderProxy_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."ProviderProxy"
    ADD CONSTRAINT "ProviderProxy_pkey" PRIMARY KEY (id);


--
-- Name: Provider Provider_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."Provider"
    ADD CONSTRAINT "Provider_pkey" PRIMARY KEY (id);


--
-- Name: RateLimit RateLimit_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."RateLimit"
    ADD CONSTRAINT "RateLimit_pkey" PRIMARY KEY (id);


--
-- Name: Refill Refill_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."Refill"
    ADD CONSTRAINT "Refill_pkey" PRIMARY KEY (id);


--
-- Name: RoutingAuditLog RoutingAuditLog_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."RoutingAuditLog"
    ADD CONSTRAINT "RoutingAuditLog_pkey" PRIMARY KEY (id);


--
-- Name: SecurityEvent SecurityEvent_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."SecurityEvent"
    ADD CONSTRAINT "SecurityEvent_pkey" PRIMARY KEY (id);


--
-- Name: ServiceCustomerAccess ServiceCustomerAccess_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."ServiceCustomerAccess"
    ADD CONSTRAINT "ServiceCustomerAccess_pkey" PRIMARY KEY (id);


--
-- Name: ServiceDraft ServiceDraft_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."ServiceDraft"
    ADD CONSTRAINT "ServiceDraft_pkey" PRIMARY KEY (id);


--
-- Name: ServiceEditHistory ServiceEditHistory_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."ServiceEditHistory"
    ADD CONSTRAINT "ServiceEditHistory_pkey" PRIMARY KEY (id);


--
-- Name: ServiceLinkCheck ServiceLinkCheck_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."ServiceLinkCheck"
    ADD CONSTRAINT "ServiceLinkCheck_pkey" PRIMARY KEY (id);


--
-- Name: ServicePriceHistory ServicePriceHistory_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."ServicePriceHistory"
    ADD CONSTRAINT "ServicePriceHistory_pkey" PRIMARY KEY (id);


--
-- Name: ServiceRoute ServiceRoute_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."ServiceRoute"
    ADD CONSTRAINT "ServiceRoute_pkey" PRIMARY KEY (id);


--
-- Name: ServiceSmartConfig ServiceSmartConfig_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."ServiceSmartConfig"
    ADD CONSTRAINT "ServiceSmartConfig_pkey" PRIMARY KEY (id);


--
-- Name: Service Service_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."Service"
    ADD CONSTRAINT "Service_pkey" PRIMARY KEY (id);


--
-- Name: Session Session_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."Session"
    ADD CONSTRAINT "Session_pkey" PRIMARY KEY (id);


--
-- Name: ShadowService ShadowService_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."ShadowService"
    ADD CONSTRAINT "ShadowService_pkey" PRIMARY KEY (id);


--
-- Name: SlaTelemetrySnapshot SlaTelemetrySnapshot_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."SlaTelemetrySnapshot"
    ADD CONSTRAINT "SlaTelemetrySnapshot_pkey" PRIMARY KEY (id);


--
-- Name: SmartCampaign SmartCampaign_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."SmartCampaign"
    ADD CONSTRAINT "SmartCampaign_pkey" PRIMARY KEY (id);


--
-- Name: SmartChannelMetric SmartChannelMetric_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."SmartChannelMetric"
    ADD CONSTRAINT "SmartChannelMetric_pkey" PRIMARY KEY (id);


--
-- Name: SmartDetectedUser SmartDetectedUser_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."SmartDetectedUser"
    ADD CONSTRAINT "SmartDetectedUser_pkey" PRIMARY KEY (id);


--
-- Name: SmartExecution SmartExecution_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."SmartExecution"
    ADD CONSTRAINT "SmartExecution_pkey" PRIMARY KEY (id);


--
-- Name: SmartSnapshot SmartSnapshot_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."SmartSnapshot"
    ADD CONSTRAINT "SmartSnapshot_pkey" PRIMARY KEY (id);


--
-- Name: SmartTask SmartTask_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."SmartTask"
    ADD CONSTRAINT "SmartTask_pkey" PRIMARY KEY (id);


--
-- Name: StaffPermission StaffPermission_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."StaffPermission"
    ADD CONSTRAINT "StaffPermission_pkey" PRIMARY KEY (id);


--
-- Name: StaffRole StaffRole_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."StaffRole"
    ADD CONSTRAINT "StaffRole_pkey" PRIMARY KEY (id);


--
-- Name: StaffShift StaffShift_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."StaffShift"
    ADD CONSTRAINT "StaffShift_pkey" PRIMARY KEY (id);


--
-- Name: StorefrontKey StorefrontKey_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."StorefrontKey"
    ADD CONSTRAINT "StorefrontKey_pkey" PRIMARY KEY (id);


--
-- Name: SupportFinancialAction SupportFinancialAction_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."SupportFinancialAction"
    ADD CONSTRAINT "SupportFinancialAction_pkey" PRIMARY KEY (id);


--
-- Name: SupportHourlyUsage SupportHourlyUsage_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."SupportHourlyUsage"
    ADD CONSTRAINT "SupportHourlyUsage_pkey" PRIMARY KEY (id);


--
-- Name: SupportLimitUsage SupportLimitUsage_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."SupportLimitUsage"
    ADD CONSTRAINT "SupportLimitUsage_pkey" PRIMARY KEY (id);


--
-- Name: SupportTemplate SupportTemplate_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."SupportTemplate"
    ADD CONSTRAINT "SupportTemplate_pkey" PRIMARY KEY (id);


--
-- Name: SystemSetting SystemSetting_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."SystemSetting"
    ADD CONSTRAINT "SystemSetting_pkey" PRIMARY KEY (key);


--
-- Name: SystemSettings SystemSettings_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."SystemSettings"
    ADD CONSTRAINT "SystemSettings_pkey" PRIMARY KEY (id);


--
-- Name: TelegramBotInstance TelegramBotInstance_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."TelegramBotInstance"
    ADD CONSTRAINT "TelegramBotInstance_pkey" PRIMARY KEY (id);


--
-- Name: TelegramButton TelegramButton_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."TelegramButton"
    ADD CONSTRAINT "TelegramButton_pkey" PRIMARY KEY (id);


--
-- Name: TelegramDailyStat TelegramDailyStat_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."TelegramDailyStat"
    ADD CONSTRAINT "TelegramDailyStat_pkey" PRIMARY KEY (id);


--
-- Name: TelegramErrorLog TelegramErrorLog_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."TelegramErrorLog"
    ADD CONSTRAINT "TelegramErrorLog_pkey" PRIMARY KEY (id);


--
-- Name: TelegramProxy TelegramProxy_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."TelegramProxy"
    ADD CONSTRAINT "TelegramProxy_pkey" PRIMARY KEY (id);


--
-- Name: TelegramTemplate TelegramTemplate_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."TelegramTemplate"
    ADD CONSTRAINT "TelegramTemplate_pkey" PRIMARY KEY (id);


--
-- Name: Tenant Tenant_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."Tenant"
    ADD CONSTRAINT "Tenant_pkey" PRIMARY KEY (id);


--
-- Name: TicketFeedback TicketFeedback_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."TicketFeedback"
    ADD CONSTRAINT "TicketFeedback_pkey" PRIMARY KEY (id);


--
-- Name: TicketMessage TicketMessage_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."TicketMessage"
    ADD CONSTRAINT "TicketMessage_pkey" PRIMARY KEY (id);


--
-- Name: Ticket Ticket_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."Ticket"
    ADD CONSTRAINT "Ticket_pkey" PRIMARY KEY (id);


--
-- Name: UrlPattern UrlPattern_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."UrlPattern"
    ADD CONSTRAINT "UrlPattern_pkey" PRIMARY KEY (id);


--
-- Name: UserNote UserNote_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."UserNote"
    ADD CONSTRAINT "UserNote_pkey" PRIMARY KEY (id);


--
-- Name: User User_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."User"
    ADD CONSTRAINT "User_pkey" PRIMARY KEY (id);


--
-- Name: api_request_log api_request_log_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.api_request_log
    ADD CONSTRAINT api_request_log_pkey PRIMARY KEY (id);


--
-- Name: ledger_period ledger_period_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.ledger_period
    ADD CONSTRAINT ledger_period_pkey PRIMARY KEY (id);


--
-- Name: provider_service_backup provider_service_backup_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.provider_service_backup
    ADD CONSTRAINT provider_service_backup_pkey PRIMARY KEY (id);


--
-- Name: reconciliation_report reconciliation_report_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.reconciliation_report
    ADD CONSTRAINT reconciliation_report_pkey PRIMARY KEY (id);


--
-- Name: revenue_recognition revenue_recognition_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.revenue_recognition
    ADD CONSTRAINT revenue_recognition_pkey PRIMARY KEY (id);


--
-- Name: AdminAuditLog_adminId_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX "AdminAuditLog_adminId_idx" ON public."AdminAuditLog" USING btree ("adminId");


--
-- Name: AdminAuditLog_createdAt_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX "AdminAuditLog_createdAt_idx" ON public."AdminAuditLog" USING btree ("createdAt");


--
-- Name: AdminAuditLog_targetType_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX "AdminAuditLog_targetType_idx" ON public."AdminAuditLog" USING btree ("targetType");


--
-- Name: AdminAuditLog_tenantId_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX "AdminAuditLog_tenantId_idx" ON public."AdminAuditLog" USING btree ("tenantId");


--
-- Name: AiPricingRecommendation_confidenceScore_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX "AiPricingRecommendation_confidenceScore_idx" ON public."AiPricingRecommendation" USING btree ("confidenceScore");


--
-- Name: AiPricingRecommendation_serviceId_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX "AiPricingRecommendation_serviceId_idx" ON public."AiPricingRecommendation" USING btree ("serviceId");


--
-- Name: AiPricingRecommendation_snapshotId_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX "AiPricingRecommendation_snapshotId_idx" ON public."AiPricingRecommendation" USING btree ("snapshotId");


--
-- Name: AiPricingRecommendation_snapshotId_status_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX "AiPricingRecommendation_snapshotId_status_idx" ON public."AiPricingRecommendation" USING btree ("snapshotId", status);


--
-- Name: AiPricingRecommendation_status_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX "AiPricingRecommendation_status_idx" ON public."AiPricingRecommendation" USING btree (status);


--
-- Name: AnalyticsEvent_createdAt_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX "AnalyticsEvent_createdAt_idx" ON public."AnalyticsEvent" USING btree ("createdAt");


--
-- Name: AnalyticsEvent_event_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX "AnalyticsEvent_event_idx" ON public."AnalyticsEvent" USING btree (event);


--
-- Name: ApiConfig_userId_key; Type: INDEX; Schema: public; Owner: postgres
--

CREATE UNIQUE INDEX "ApiConfig_userId_key" ON public."ApiConfig" USING btree ("userId");


--
-- Name: Article_category_status_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX "Article_category_status_idx" ON public."Article" USING btree (category, status);


--
-- Name: Article_slug_key; Type: INDEX; Schema: public; Owner: postgres
--

CREATE UNIQUE INDEX "Article_slug_key" ON public."Article" USING btree (slug);


--
-- Name: Article_status_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX "Article_status_idx" ON public."Article" USING btree (status);


--
-- Name: AuditLog_userId_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX "AuditLog_userId_idx" ON public."AuditLog" USING btree ("userId");


--
-- Name: AuthToken_expiresAt_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX "AuthToken_expiresAt_idx" ON public."AuthToken" USING btree ("expiresAt");


--
-- Name: AuthToken_token_tenantId_key; Type: INDEX; Schema: public; Owner: postgres
--

CREATE UNIQUE INDEX "AuthToken_token_tenantId_key" ON public."AuthToken" USING btree (token, "tenantId");


--
-- Name: AuthToken_userId_createdAt_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX "AuthToken_userId_createdAt_idx" ON public."AuthToken" USING btree ("userId", "createdAt");


--
-- Name: BalanceAdjustmentPolicy_scopeType_staffRoleId_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX "BalanceAdjustmentPolicy_scopeType_staffRoleId_idx" ON public."BalanceAdjustmentPolicy" USING btree ("scopeType", "staffRoleId");


--
-- Name: BalanceAdjustmentPolicy_scopeType_userId_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX "BalanceAdjustmentPolicy_scopeType_userId_idx" ON public."BalanceAdjustmentPolicy" USING btree ("scopeType", "userId");


--
-- Name: BonusRedemptionLog_paymentFingerprint_bonusType_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX "BonusRedemptionLog_paymentFingerprint_bonusType_idx" ON public."BonusRedemptionLog" USING btree ("paymentFingerprint", "bonusType");


--
-- Name: BonusRedemptionLog_status_unlockAt_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX "BonusRedemptionLog_status_unlockAt_idx" ON public."BonusRedemptionLog" USING btree (status, "unlockAt");


--
-- Name: BonusRedemptionLog_tenantId_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX "BonusRedemptionLog_tenantId_idx" ON public."BonusRedemptionLog" USING btree ("tenantId");


--
-- Name: BonusRedemptionLog_userId_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX "BonusRedemptionLog_userId_idx" ON public."BonusRedemptionLog" USING btree ("userId");


--
-- Name: Category_activityType_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX "Category_activityType_idx" ON public."Category" USING btree ("activityType");


--
-- Name: Category_networkId_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX "Category_networkId_idx" ON public."Category" USING btree ("networkId");


--
-- Name: Category_slug_key; Type: INDEX; Schema: public; Owner: postgres
--

CREATE UNIQUE INDEX "Category_slug_key" ON public."Category" USING btree (slug);


--
-- Name: Category_tenantId_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX "Category_tenantId_idx" ON public."Category" USING btree ("tenantId");


--
-- Name: Commission_orderId_referrerId_key; Type: INDEX; Schema: public; Owner: postgres
--

CREATE UNIQUE INDEX "Commission_orderId_referrerId_key" ON public."Commission" USING btree ("orderId", "referrerId");


--
-- Name: Commission_referrerId_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX "Commission_referrerId_idx" ON public."Commission" USING btree ("referrerId");


--
-- Name: ContentCategory_parentId_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX "ContentCategory_parentId_idx" ON public."ContentCategory" USING btree ("parentId");


--
-- Name: ContentCategory_slug_key; Type: INDEX; Schema: public; Owner: postgres
--

CREATE UNIQUE INDEX "ContentCategory_slug_key" ON public."ContentCategory" USING btree (slug);


--
-- Name: ContentItem_categoryId_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX "ContentItem_categoryId_idx" ON public."ContentItem" USING btree ("categoryId");


--
-- Name: ContentItem_slug_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX "ContentItem_slug_idx" ON public."ContentItem" USING btree (slug);


--
-- Name: ContentItem_slug_key; Type: INDEX; Schema: public; Owner: postgres
--

CREATE UNIQUE INDEX "ContentItem_slug_key" ON public."ContentItem" USING btree (slug);


--
-- Name: ContentItem_type_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX "ContentItem_type_idx" ON public."ContentItem" USING btree (type);


--
-- Name: CustomerGroup_tenantId_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX "CustomerGroup_tenantId_idx" ON public."CustomerGroup" USING btree ("tenantId");


--
-- Name: CustomerGroup_tenantId_slug_key; Type: INDEX; Schema: public; Owner: postgres
--

CREATE UNIQUE INDEX "CustomerGroup_tenantId_slug_key" ON public."CustomerGroup" USING btree ("tenantId", slug);


--
-- Name: CxApologyCompensation_orderId_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX "CxApologyCompensation_orderId_idx" ON public."CxApologyCompensation" USING btree ("orderId");


--
-- Name: CxApologyCompensation_status_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX "CxApologyCompensation_status_idx" ON public."CxApologyCompensation" USING btree (status);


--
-- Name: CxApologyCompensation_userId_createdAt_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX "CxApologyCompensation_userId_createdAt_idx" ON public."CxApologyCompensation" USING btree ("userId", "createdAt");


--
-- Name: EconomicOptimizationSnapshot_appliedBy_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX "EconomicOptimizationSnapshot_appliedBy_idx" ON public."EconomicOptimizationSnapshot" USING btree ("appliedBy");


--
-- Name: EconomicOptimizationSnapshot_status_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX "EconomicOptimizationSnapshot_status_idx" ON public."EconomicOptimizationSnapshot" USING btree (status);


--
-- Name: EconomicOptimizationSnapshot_tenantId_createdAt_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX "EconomicOptimizationSnapshot_tenantId_createdAt_idx" ON public."EconomicOptimizationSnapshot" USING btree ("tenantId", "createdAt" DESC);


--
-- Name: EconomicOptimizationSnapshot_tenantId_status_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX "EconomicOptimizationSnapshot_tenantId_status_idx" ON public."EconomicOptimizationSnapshot" USING btree ("tenantId", status);


--
-- Name: EmployeeResponsibilityConsent_documentVersionId_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX "EmployeeResponsibilityConsent_documentVersionId_idx" ON public."EmployeeResponsibilityConsent" USING btree ("documentVersionId");


--
-- Name: EmployeeResponsibilityConsent_tenantId_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX "EmployeeResponsibilityConsent_tenantId_idx" ON public."EmployeeResponsibilityConsent" USING btree ("tenantId");


--
-- Name: EmployeeResponsibilityConsent_userId_status_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX "EmployeeResponsibilityConsent_userId_status_idx" ON public."EmployeeResponsibilityConsent" USING btree ("userId", status);


--
-- Name: FeatureFlag_key_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX "FeatureFlag_key_idx" ON public."FeatureFlag" USING btree (key);


--
-- Name: FeatureFlag_key_key; Type: INDEX; Schema: public; Owner: postgres
--

CREATE UNIQUE INDEX "FeatureFlag_key_key" ON public."FeatureFlag" USING btree (key);


--
-- Name: Invoice_paymentId_key; Type: INDEX; Schema: public; Owner: postgres
--

CREATE UNIQUE INDEX "Invoice_paymentId_key" ON public."Invoice" USING btree ("paymentId");


--
-- Name: Invoice_status_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX "Invoice_status_idx" ON public."Invoice" USING btree (status);


--
-- Name: Invoice_userId_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX "Invoice_userId_idx" ON public."Invoice" USING btree ("userId");


--
-- Name: LedgerEntry_adminId_createdAt_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX "LedgerEntry_adminId_createdAt_idx" ON public."LedgerEntry" USING btree ("adminId", "createdAt");


--
-- Name: LedgerEntry_adminId_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX "LedgerEntry_adminId_idx" ON public."LedgerEntry" USING btree ("adminId");


--
-- Name: LedgerEntry_createdAt_id_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX "LedgerEntry_createdAt_id_idx" ON public."LedgerEntry" USING btree ("createdAt" DESC, id DESC);


--
-- Name: LedgerEntry_idempotencyKey_key; Type: INDEX; Schema: public; Owner: postgres
--

CREATE UNIQUE INDEX "LedgerEntry_idempotencyKey_key" ON public."LedgerEntry" USING btree ("idempotencyKey");


--
-- Name: LedgerEntry_status_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX "LedgerEntry_status_idx" ON public."LedgerEntry" USING btree (status);


--
-- Name: LedgerEntry_tenantId_createdAt_id_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX "LedgerEntry_tenantId_createdAt_id_idx" ON public."LedgerEntry" USING btree ("tenantId", "createdAt" DESC, id DESC);


--
-- Name: LedgerEntry_tenantId_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX "LedgerEntry_tenantId_idx" ON public."LedgerEntry" USING btree ("tenantId");


--
-- Name: LedgerEntry_tenantId_transactionType_createdAt_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX "LedgerEntry_tenantId_transactionType_createdAt_idx" ON public."LedgerEntry" USING btree ("tenantId", "transactionType", "createdAt");


--
-- Name: LedgerEntry_tenantId_userId_createdAt_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX "LedgerEntry_tenantId_userId_createdAt_idx" ON public."LedgerEntry" USING btree ("tenantId", "userId", "createdAt");


--
-- Name: LedgerEntry_userId_createdAt_id_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX "LedgerEntry_userId_createdAt_id_idx" ON public."LedgerEntry" USING btree ("userId", "createdAt" DESC, id DESC);


--
-- Name: LedgerEntry_userId_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX "LedgerEntry_userId_idx" ON public."LedgerEntry" USING btree ("userId");


--
-- Name: LegalDocumentVersion_tenantId_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX "LegalDocumentVersion_tenantId_idx" ON public."LegalDocumentVersion" USING btree ("tenantId");


--
-- Name: LegalDocumentVersion_type_isActive_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX "LegalDocumentVersion_type_isActive_idx" ON public."LegalDocumentVersion" USING btree (type, "isActive");


--
-- Name: LegalDocumentVersion_type_version_key; Type: INDEX; Schema: public; Owner: postgres
--

CREATE UNIQUE INDEX "LegalDocumentVersion_type_version_key" ON public."LegalDocumentVersion" USING btree (type, version);


--
-- Name: LoginLog_createdAt_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX "LoginLog_createdAt_idx" ON public."LoginLog" USING btree ("createdAt");


--
-- Name: LoginLog_email_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX "LoginLog_email_idx" ON public."LoginLog" USING btree (email);


--
-- Name: LoginLog_ipAddress_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX "LoginLog_ipAddress_idx" ON public."LoginLog" USING btree ("ipAddress");


--
-- Name: LoginLog_tenantId_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX "LoginLog_tenantId_idx" ON public."LoginLog" USING btree ("tenantId");


--
-- Name: ManualBalanceAdjustment_direction_status_createdAt_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX "ManualBalanceAdjustment_direction_status_createdAt_idx" ON public."ManualBalanceAdjustment" USING btree (direction, status, "createdAt");


--
-- Name: ManualBalanceAdjustment_idempotencyKey_key; Type: INDEX; Schema: public; Owner: postgres
--

CREATE UNIQUE INDEX "ManualBalanceAdjustment_idempotencyKey_key" ON public."ManualBalanceAdjustment" USING btree ("idempotencyKey");


--
-- Name: ManualBalanceAdjustment_requestedBy_createdAt_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX "ManualBalanceAdjustment_requestedBy_createdAt_idx" ON public."ManualBalanceAdjustment" USING btree ("requestedBy", "createdAt");


--
-- Name: ManualBalanceAdjustment_status_createdAt_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX "ManualBalanceAdjustment_status_createdAt_idx" ON public."ManualBalanceAdjustment" USING btree (status, "createdAt");


--
-- Name: ManualBalanceAdjustment_ticketId_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX "ManualBalanceAdjustment_ticketId_idx" ON public."ManualBalanceAdjustment" USING btree ("ticketId");


--
-- Name: ManualBalanceAdjustment_userId_createdAt_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX "ManualBalanceAdjustment_userId_createdAt_idx" ON public."ManualBalanceAdjustment" USING btree ("userId", "createdAt");


--
-- Name: MessageAttachment_messageId_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX "MessageAttachment_messageId_idx" ON public."MessageAttachment" USING btree ("messageId");


--
-- Name: Network_name_key; Type: INDEX; Schema: public; Owner: postgres
--

CREATE UNIQUE INDEX "Network_name_key" ON public."Network" USING btree (name);


--
-- Name: Network_slug_key; Type: INDEX; Schema: public; Owner: postgres
--

CREATE UNIQUE INDEX "Network_slug_key" ON public."Network" USING btree (slug);


--
-- Name: Network_tenantId_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX "Network_tenantId_idx" ON public."Network" USING btree ("tenantId");


--
-- Name: OrderRecoveryIncident_createdAt_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX "OrderRecoveryIncident_createdAt_idx" ON public."OrderRecoveryIncident" USING btree ("createdAt");


--
-- Name: OrderRecoveryIncident_orderId_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX "OrderRecoveryIncident_orderId_idx" ON public."OrderRecoveryIncident" USING btree ("orderId");


--
-- Name: OrderRecoveryIncident_userId_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX "OrderRecoveryIncident_userId_idx" ON public."OrderRecoveryIncident" USING btree ("userId");


--
-- Name: Order_createdAt_id_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX "Order_createdAt_id_idx" ON public."Order" USING btree ("createdAt" DESC, id DESC);


--
-- Name: Order_createdAt_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX "Order_createdAt_idx" ON public."Order" USING btree ("createdAt");


--
-- Name: Order_dripExternalIds_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX "Order_dripExternalIds_idx" ON public."Order" USING gin ("dripExternalIds");


--
-- Name: Order_externalId_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX "Order_externalId_idx" ON public."Order" USING btree ("externalId");


--
-- Name: Order_idempotencyKey_key; Type: INDEX; Schema: public; Owner: postgres
--

CREATE UNIQUE INDEX "Order_idempotencyKey_key" ON public."Order" USING btree ("idempotencyKey");


--
-- Name: Order_numericId_key; Type: INDEX; Schema: public; Owner: postgres
--

CREATE UNIQUE INDEX "Order_numericId_key" ON public."Order" USING btree ("numericId");


--
-- Name: Order_paymentId_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX "Order_paymentId_idx" ON public."Order" USING btree ("paymentId");


--
-- Name: Order_providerId_externalId_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX "Order_providerId_externalId_idx" ON public."Order" USING btree ("providerId", "externalId");


--
-- Name: Order_serviceId_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX "Order_serviceId_idx" ON public."Order" USING btree ("serviceId");


--
-- Name: Order_status_createdAt_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX "Order_status_createdAt_idx" ON public."Order" USING btree (status, "createdAt");


--
-- Name: Order_status_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX "Order_status_idx" ON public."Order" USING btree (status);


--
-- Name: Order_tenantId_createdAt_id_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX "Order_tenantId_createdAt_id_idx" ON public."Order" USING btree ("tenantId", "createdAt" DESC, id DESC);


--
-- Name: Order_tenantId_createdAt_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX "Order_tenantId_createdAt_idx" ON public."Order" USING btree ("tenantId", "createdAt" DESC);


--
-- Name: Order_tenantId_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX "Order_tenantId_idx" ON public."Order" USING btree ("tenantId");


--
-- Name: Order_tenantId_status_createdAt_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX "Order_tenantId_status_createdAt_idx" ON public."Order" USING btree ("tenantId", status, "createdAt");


--
-- Name: Order_tenantId_userId_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX "Order_tenantId_userId_idx" ON public."Order" USING btree ("tenantId", "userId");


--
-- Name: Order_tenantId_userId_status_createdAt_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX "Order_tenantId_userId_status_createdAt_idx" ON public."Order" USING btree ("tenantId", "userId", status, "createdAt");


--
-- Name: Order_userId_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX "Order_userId_idx" ON public."Order" USING btree ("userId");


--
-- Name: Order_userId_status_createdAt_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX "Order_userId_status_createdAt_idx" ON public."Order" USING btree ("userId", status, "createdAt" DESC);


--
-- Name: Order_userId_status_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX "Order_userId_status_idx" ON public."Order" USING btree ("userId", status);


--
-- Name: Page_slug_key; Type: INDEX; Schema: public; Owner: postgres
--

CREATE UNIQUE INDEX "Page_slug_key" ON public."Page" USING btree (slug);


--
-- Name: Payment_createdAt_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX "Payment_createdAt_idx" ON public."Payment" USING btree ("createdAt");


--
-- Name: Payment_gatewayId_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX "Payment_gatewayId_idx" ON public."Payment" USING btree ("gatewayId");


--
-- Name: Payment_gatewayId_key; Type: INDEX; Schema: public; Owner: postgres
--

CREATE UNIQUE INDEX "Payment_gatewayId_key" ON public."Payment" USING btree ("gatewayId");


--
-- Name: Payment_orderId_key; Type: INDEX; Schema: public; Owner: postgres
--

CREATE UNIQUE INDEX "Payment_orderId_key" ON public."Payment" USING btree ("orderId");


--
-- Name: Payment_receiptId_key; Type: INDEX; Schema: public; Owner: postgres
--

CREATE UNIQUE INDEX "Payment_receiptId_key" ON public."Payment" USING btree ("receiptId");


--
-- Name: Payment_refundReceiptId_key; Type: INDEX; Schema: public; Owner: postgres
--

CREATE UNIQUE INDEX "Payment_refundReceiptId_key" ON public."Payment" USING btree ("refundReceiptId");


--
-- Name: Payment_status_createdAt_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX "Payment_status_createdAt_idx" ON public."Payment" USING btree (status, "createdAt");


--
-- Name: Payment_status_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX "Payment_status_idx" ON public."Payment" USING btree (status);


--
-- Name: Payment_tenantId_createdAt_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX "Payment_tenantId_createdAt_idx" ON public."Payment" USING btree ("tenantId", "createdAt" DESC);


--
-- Name: Payment_tenantId_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX "Payment_tenantId_idx" ON public."Payment" USING btree ("tenantId");


--
-- Name: Payment_tenantId_status_createdAt_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX "Payment_tenantId_status_createdAt_idx" ON public."Payment" USING btree ("tenantId", status, "createdAt");


--
-- Name: Payment_tenantId_userId_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX "Payment_tenantId_userId_idx" ON public."Payment" USING btree ("tenantId", "userId");


--
-- Name: Payment_tenantId_userId_status_createdAt_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX "Payment_tenantId_userId_status_createdAt_idx" ON public."Payment" USING btree ("tenantId", "userId", status, "createdAt");


--
-- Name: Payment_userId_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX "Payment_userId_idx" ON public."Payment" USING btree ("userId");


--
-- Name: Payment_userId_status_createdAt_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX "Payment_userId_status_createdAt_idx" ON public."Payment" USING btree ("userId", status, "createdAt" DESC);


--
-- Name: PiiAccessLog_staffId_createdAt_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX "PiiAccessLog_staffId_createdAt_idx" ON public."PiiAccessLog" USING btree ("staffId", "createdAt");


--
-- Name: PiiAccessLog_targetType_targetId_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX "PiiAccessLog_targetType_targetId_idx" ON public."PiiAccessLog" USING btree ("targetType", "targetId");


--
-- Name: PreLaunchLead_email_tenantId_key; Type: INDEX; Schema: public; Owner: postgres
--

CREATE UNIQUE INDEX "PreLaunchLead_email_tenantId_key" ON public."PreLaunchLead" USING btree (email, "tenantId");


--
-- Name: PreLaunchLead_tenantId_createdAt_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX "PreLaunchLead_tenantId_createdAt_idx" ON public."PreLaunchLead" USING btree ("tenantId", "createdAt");


--
-- Name: ProcessedBonusEvent_eventType_eventId_key; Type: INDEX; Schema: public; Owner: postgres
--

CREATE UNIQUE INDEX "ProcessedBonusEvent_eventType_eventId_key" ON public."ProcessedBonusEvent" USING btree ("eventType", "eventId");


--
-- Name: ProcessedBonusEvent_userId_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX "ProcessedBonusEvent_userId_idx" ON public."ProcessedBonusEvent" USING btree ("userId");


--
-- Name: PromoCodeUsage_orderId_key; Type: INDEX; Schema: public; Owner: postgres
--

CREATE UNIQUE INDEX "PromoCodeUsage_orderId_key" ON public."PromoCodeUsage" USING btree ("orderId");


--
-- Name: PromoCodeUsage_promoCodeId_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX "PromoCodeUsage_promoCodeId_idx" ON public."PromoCodeUsage" USING btree ("promoCodeId");


--
-- Name: PromoCodeUsage_userId_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX "PromoCodeUsage_userId_idx" ON public."PromoCodeUsage" USING btree ("userId");


--
-- Name: PromoCode_code_key; Type: INDEX; Schema: public; Owner: postgres
--

CREATE UNIQUE INDEX "PromoCode_code_key" ON public."PromoCode" USING btree (code);


--
-- Name: ProviderOutbox_idempotencyKey_key; Type: INDEX; Schema: public; Owner: postgres
--

CREATE UNIQUE INDEX "ProviderOutbox_idempotencyKey_key" ON public."ProviderOutbox" USING btree ("idempotencyKey");


--
-- Name: ProviderOutbox_orderId_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX "ProviderOutbox_orderId_idx" ON public."ProviderOutbox" USING btree ("orderId");


--
-- Name: ProviderOutbox_providerId_status_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX "ProviderOutbox_providerId_status_idx" ON public."ProviderOutbox" USING btree ("providerId", status);


--
-- Name: ProviderProxyLog_createdAt_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX "ProviderProxyLog_createdAt_idx" ON public."ProviderProxyLog" USING btree ("createdAt");


--
-- Name: ProviderProxyLog_providerId_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX "ProviderProxyLog_providerId_idx" ON public."ProviderProxyLog" USING btree ("providerId");


--
-- Name: ProviderProxyLog_proxyId_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX "ProviderProxyLog_proxyId_idx" ON public."ProviderProxyLog" USING btree ("proxyId");


--
-- Name: ProviderProxy_category_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX "ProviderProxy_category_idx" ON public."ProviderProxy" USING btree (category);


--
-- Name: ProviderProxy_expiresAt_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX "ProviderProxy_expiresAt_idx" ON public."ProviderProxy" USING btree ("expiresAt");


--
-- Name: ProviderProxy_isActive_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX "ProviderProxy_isActive_idx" ON public."ProviderProxy" USING btree ("isActive");


--
-- Name: ProviderProxy_protocol_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX "ProviderProxy_protocol_idx" ON public."ProviderProxy" USING btree (protocol);


--
-- Name: Provider_name_key; Type: INDEX; Schema: public; Owner: postgres
--

CREATE UNIQUE INDEX "Provider_name_key" ON public."Provider" USING btree (name);


--
-- Name: Provider_proxyId_key; Type: INDEX; Schema: public; Owner: postgres
--

CREATE UNIQUE INDEX "Provider_proxyId_key" ON public."Provider" USING btree ("proxyId");


--
-- Name: RateLimit_expiresAt_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX "RateLimit_expiresAt_idx" ON public."RateLimit" USING btree ("expiresAt");


--
-- Name: RateLimit_ip_endpoint_key; Type: INDEX; Schema: public; Owner: postgres
--

CREATE UNIQUE INDEX "RateLimit_ip_endpoint_key" ON public."RateLimit" USING btree (ip, endpoint);


--
-- Name: Refill_numericId_key; Type: INDEX; Schema: public; Owner: postgres
--

CREATE UNIQUE INDEX "Refill_numericId_key" ON public."Refill" USING btree ("numericId");


--
-- Name: Refill_orderId_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX "Refill_orderId_idx" ON public."Refill" USING btree ("orderId");


--
-- Name: Refill_status_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX "Refill_status_idx" ON public."Refill" USING btree (status);


--
-- Name: SecurityEvent_createdAt_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX "SecurityEvent_createdAt_idx" ON public."SecurityEvent" USING btree ("createdAt");


--
-- Name: SecurityEvent_event_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX "SecurityEvent_event_idx" ON public."SecurityEvent" USING btree (event);


--
-- Name: SecurityEvent_tenantId_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX "SecurityEvent_tenantId_idx" ON public."SecurityEvent" USING btree ("tenantId");


--
-- Name: ServiceCustomerAccess_customerGroupId_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX "ServiceCustomerAccess_customerGroupId_idx" ON public."ServiceCustomerAccess" USING btree ("customerGroupId");


--
-- Name: ServiceCustomerAccess_serviceId_customerGroupId_key; Type: INDEX; Schema: public; Owner: postgres
--

CREATE UNIQUE INDEX "ServiceCustomerAccess_serviceId_customerGroupId_key" ON public."ServiceCustomerAccess" USING btree ("serviceId", "customerGroupId");


--
-- Name: ServiceCustomerAccess_serviceId_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX "ServiceCustomerAccess_serviceId_idx" ON public."ServiceCustomerAccess" USING btree ("serviceId");


--
-- Name: ServiceDraft_providerId_externalId_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX "ServiceDraft_providerId_externalId_idx" ON public."ServiceDraft" USING btree ("providerId", "externalId");


--
-- Name: ServiceDraft_serviceId_key; Type: INDEX; Schema: public; Owner: postgres
--

CREATE UNIQUE INDEX "ServiceDraft_serviceId_key" ON public."ServiceDraft" USING btree ("serviceId");


--
-- Name: ServiceDraft_status_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX "ServiceDraft_status_idx" ON public."ServiceDraft" USING btree (status);


--
-- Name: ServiceDraft_tenantId_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX "ServiceDraft_tenantId_idx" ON public."ServiceDraft" USING btree ("tenantId");


--
-- Name: ServiceEditHistory_adminId_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX "ServiceEditHistory_adminId_idx" ON public."ServiceEditHistory" USING btree ("adminId");


--
-- Name: ServiceEditHistory_createdAt_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX "ServiceEditHistory_createdAt_idx" ON public."ServiceEditHistory" USING btree ("createdAt");


--
-- Name: ServiceEditHistory_draftId_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX "ServiceEditHistory_draftId_idx" ON public."ServiceEditHistory" USING btree ("draftId");


--
-- Name: ServiceEditHistory_serviceId_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX "ServiceEditHistory_serviceId_idx" ON public."ServiceEditHistory" USING btree ("serviceId");


--
-- Name: ServiceLinkCheck_checkedAt_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX "ServiceLinkCheck_checkedAt_idx" ON public."ServiceLinkCheck" USING btree ("checkedAt");


--
-- Name: ServiceLinkCheck_serviceId_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX "ServiceLinkCheck_serviceId_idx" ON public."ServiceLinkCheck" USING btree ("serviceId");


--
-- Name: ServiceLinkCheck_targetType_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX "ServiceLinkCheck_targetType_idx" ON public."ServiceLinkCheck" USING btree ("targetType");


--
-- Name: ServicePriceHistory_createdAt_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX "ServicePriceHistory_createdAt_idx" ON public."ServicePriceHistory" USING btree ("createdAt");


--
-- Name: ServicePriceHistory_serviceId_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX "ServicePriceHistory_serviceId_idx" ON public."ServicePriceHistory" USING btree ("serviceId");


--
-- Name: ServiceRoute_providerId_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX "ServiceRoute_providerId_idx" ON public."ServiceRoute" USING btree ("providerId");


--
-- Name: ServiceRoute_serviceId_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX "ServiceRoute_serviceId_idx" ON public."ServiceRoute" USING btree ("serviceId");


--
-- Name: ServiceRoute_serviceId_providerId_key; Type: INDEX; Schema: public; Owner: postgres
--

CREATE UNIQUE INDEX "ServiceRoute_serviceId_providerId_key" ON public."ServiceRoute" USING btree ("serviceId", "providerId");


--
-- Name: ServiceSmartConfig_serviceId_key; Type: INDEX; Schema: public; Owner: postgres
--

CREATE UNIQUE INDEX "ServiceSmartConfig_serviceId_key" ON public."ServiceSmartConfig" USING btree ("serviceId");


--
-- Name: Service_categoryId_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX "Service_categoryId_idx" ON public."Service" USING btree ("categoryId");


--
-- Name: Service_externalId_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX "Service_externalId_idx" ON public."Service" USING btree ("externalId");


--
-- Name: Service_isQuarantined_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX "Service_isQuarantined_idx" ON public."Service" USING btree ("isQuarantined");


--
-- Name: Service_numericId_key; Type: INDEX; Schema: public; Owner: postgres
--

CREATE UNIQUE INDEX "Service_numericId_key" ON public."Service" USING btree ("numericId");


--
-- Name: Service_providerId_externalId_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX "Service_providerId_externalId_idx" ON public."Service" USING btree ("providerId", "externalId");


--
-- Name: Service_providerId_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX "Service_providerId_idx" ON public."Service" USING btree ("providerId");


--
-- Name: Service_qualityTier_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX "Service_qualityTier_idx" ON public."Service" USING btree ("qualityTier");


--
-- Name: Service_slug_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX "Service_slug_idx" ON public."Service" USING btree (slug);


--
-- Name: Service_tenantId_categoryId_isActive_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX "Service_tenantId_categoryId_isActive_idx" ON public."Service" USING btree ("tenantId", "categoryId", "isActive");


--
-- Name: Service_tenantId_categoryId_isActive_sortOrder_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX "Service_tenantId_categoryId_isActive_sortOrder_idx" ON public."Service" USING btree ("tenantId", "categoryId", "isActive", "sortOrder");


--
-- Name: Service_tenantId_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX "Service_tenantId_idx" ON public."Service" USING btree ("tenantId");


--
-- Name: Service_tenantId_isActive_qualityTier_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX "Service_tenantId_isActive_qualityTier_idx" ON public."Service" USING btree ("tenantId", "isActive", "qualityTier");


--
-- Name: Service_tenantId_providerId_isActive_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX "Service_tenantId_providerId_isActive_idx" ON public."Service" USING btree ("tenantId", "providerId", "isActive");


--
-- Name: Service_tenantId_slug_key; Type: INDEX; Schema: public; Owner: postgres
--

CREATE UNIQUE INDEX "Service_tenantId_slug_key" ON public."Service" USING btree ("tenantId", slug);


--
-- Name: Session_userId_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX "Session_userId_idx" ON public."Session" USING btree ("userId");


--
-- Name: ShadowService_normalizedCategory_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX "ShadowService_normalizedCategory_idx" ON public."ShadowService" USING btree ("normalizedCategory");


--
-- Name: ShadowService_platform_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX "ShadowService_platform_idx" ON public."ShadowService" USING btree (platform);


--
-- Name: ShadowService_providerId_externalId_key; Type: INDEX; Schema: public; Owner: postgres
--

CREATE UNIQUE INDEX "ShadowService_providerId_externalId_key" ON public."ShadowService" USING btree ("providerId", "externalId");


--
-- Name: ShadowService_providerId_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX "ShadowService_providerId_idx" ON public."ShadowService" USING btree ("providerId");


--
-- Name: ShadowService_providerId_normalizedCategory_rateRub_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX "ShadowService_providerId_normalizedCategory_rateRub_idx" ON public."ShadowService" USING btree ("providerId", "normalizedCategory", "rateRub");


--
-- Name: ShadowService_rateRub_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX "ShadowService_rateRub_idx" ON public."ShadowService" USING btree ("rateRub");


--
-- Name: ShadowService_tenantId_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX "ShadowService_tenantId_idx" ON public."ShadowService" USING btree ("tenantId");


--
-- Name: SlaTelemetrySnapshot_createdAt_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX "SlaTelemetrySnapshot_createdAt_idx" ON public."SlaTelemetrySnapshot" USING btree ("createdAt");


--
-- Name: SlaTelemetrySnapshot_providerId_createdAt_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX "SlaTelemetrySnapshot_providerId_createdAt_idx" ON public."SlaTelemetrySnapshot" USING btree ("providerId", "createdAt" DESC);


--
-- Name: SmartCampaign_orderId_key; Type: INDEX; Schema: public; Owner: postgres
--

CREATE UNIQUE INDEX "SmartCampaign_orderId_key" ON public."SmartCampaign" USING btree ("orderId");


--
-- Name: SmartCampaign_paymentId_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX "SmartCampaign_paymentId_idx" ON public."SmartCampaign" USING btree ("paymentId");


--
-- Name: SmartCampaign_serviceId_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX "SmartCampaign_serviceId_idx" ON public."SmartCampaign" USING btree ("serviceId");


--
-- Name: SmartCampaign_userId_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX "SmartCampaign_userId_idx" ON public."SmartCampaign" USING btree ("userId");


--
-- Name: SmartChannelMetric_campaignId_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX "SmartChannelMetric_campaignId_idx" ON public."SmartChannelMetric" USING btree ("campaignId");


--
-- Name: SmartExecution_taskId_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX "SmartExecution_taskId_idx" ON public."SmartExecution" USING btree ("taskId");


--
-- Name: SmartTask_campaignId_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX "SmartTask_campaignId_idx" ON public."SmartTask" USING btree ("campaignId");


--
-- Name: SmartTask_runAt_status_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX "SmartTask_runAt_status_idx" ON public."SmartTask" USING btree ("runAt", status);


--
-- Name: StaffPermission_roleId_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX "StaffPermission_roleId_idx" ON public."StaffPermission" USING btree ("roleId");


--
-- Name: StaffPermission_roleId_section_key; Type: INDEX; Schema: public; Owner: postgres
--

CREATE UNIQUE INDEX "StaffPermission_roleId_section_key" ON public."StaffPermission" USING btree ("roleId", section);


--
-- Name: StaffPermission_tenantId_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX "StaffPermission_tenantId_idx" ON public."StaffPermission" USING btree ("tenantId");


--
-- Name: StaffRole_name_key; Type: INDEX; Schema: public; Owner: postgres
--

CREATE UNIQUE INDEX "StaffRole_name_key" ON public."StaffRole" USING btree (name);


--
-- Name: StaffRole_tenantId_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX "StaffRole_tenantId_idx" ON public."StaffRole" USING btree ("tenantId");


--
-- Name: StaffShift_date_status_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX "StaffShift_date_status_idx" ON public."StaffShift" USING btree (date, status);


--
-- Name: StaffShift_userId_date_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX "StaffShift_userId_date_idx" ON public."StaffShift" USING btree ("userId", date);


--
-- Name: StaffShift_userId_date_shiftType_key; Type: INDEX; Schema: public; Owner: postgres
--

CREATE UNIQUE INDEX "StaffShift_userId_date_shiftType_key" ON public."StaffShift" USING btree ("userId", date, "shiftType");


--
-- Name: StorefrontKey_keyHash_key; Type: INDEX; Schema: public; Owner: postgres
--

CREATE UNIQUE INDEX "StorefrontKey_keyHash_key" ON public."StorefrontKey" USING btree ("keyHash");


--
-- Name: StorefrontKey_tenantId_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX "StorefrontKey_tenantId_idx" ON public."StorefrontKey" USING btree ("tenantId");


--
-- Name: SupportFinancialAction_idempotencyKey_key; Type: INDEX; Schema: public; Owner: postgres
--

CREATE UNIQUE INDEX "SupportFinancialAction_idempotencyKey_key" ON public."SupportFinancialAction" USING btree ("idempotencyKey");


--
-- Name: SupportFinancialAction_orderId_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX "SupportFinancialAction_orderId_idx" ON public."SupportFinancialAction" USING btree ("orderId");


--
-- Name: SupportFinancialAction_reviewStatus_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX "SupportFinancialAction_reviewStatus_idx" ON public."SupportFinancialAction" USING btree ("reviewStatus");


--
-- Name: SupportFinancialAction_staffUserId_createdAt_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX "SupportFinancialAction_staffUserId_createdAt_idx" ON public."SupportFinancialAction" USING btree ("staffUserId", "createdAt");


--
-- Name: SupportFinancialAction_status_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX "SupportFinancialAction_status_idx" ON public."SupportFinancialAction" USING btree (status);


--
-- Name: SupportFinancialAction_targetUserId_createdAt_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX "SupportFinancialAction_targetUserId_createdAt_idx" ON public."SupportFinancialAction" USING btree ("targetUserId", "createdAt");


--
-- Name: SupportFinancialAction_tenantId_createdAt_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX "SupportFinancialAction_tenantId_createdAt_idx" ON public."SupportFinancialAction" USING btree ("tenantId", "createdAt");


--
-- Name: SupportFinancialAction_ticketId_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX "SupportFinancialAction_ticketId_idx" ON public."SupportFinancialAction" USING btree ("ticketId");


--
-- Name: SupportHourlyUsage_staffUserId_hourKey_direction_key; Type: INDEX; Schema: public; Owner: postgres
--

CREATE UNIQUE INDEX "SupportHourlyUsage_staffUserId_hourKey_direction_key" ON public."SupportHourlyUsage" USING btree ("staffUserId", "hourKey", direction);


--
-- Name: SupportHourlyUsage_staffUserId_hourKey_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX "SupportHourlyUsage_staffUserId_hourKey_idx" ON public."SupportHourlyUsage" USING btree ("staffUserId", "hourKey");


--
-- Name: SupportHourlyUsage_tenantId_hourKey_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX "SupportHourlyUsage_tenantId_hourKey_idx" ON public."SupportHourlyUsage" USING btree ("tenantId", "hourKey");


--
-- Name: SupportLimitUsage_staffUserId_dayKey_direction_key; Type: INDEX; Schema: public; Owner: postgres
--

CREATE UNIQUE INDEX "SupportLimitUsage_staffUserId_dayKey_direction_key" ON public."SupportLimitUsage" USING btree ("staffUserId", "dayKey", direction);


--
-- Name: SupportLimitUsage_staffUserId_dayKey_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX "SupportLimitUsage_staffUserId_dayKey_idx" ON public."SupportLimitUsage" USING btree ("staffUserId", "dayKey");


--
-- Name: SupportLimitUsage_tenantId_dayKey_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX "SupportLimitUsage_tenantId_dayKey_idx" ON public."SupportLimitUsage" USING btree ("tenantId", "dayKey");


--
-- Name: SupportTemplate_category_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX "SupportTemplate_category_idx" ON public."SupportTemplate" USING btree (category);


--
-- Name: SupportTemplate_shortcut_key; Type: INDEX; Schema: public; Owner: postgres
--

CREATE UNIQUE INDEX "SupportTemplate_shortcut_key" ON public."SupportTemplate" USING btree (shortcut);


--
-- Name: TelegramBotInstance_isActive_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX "TelegramBotInstance_isActive_idx" ON public."TelegramBotInstance" USING btree ("isActive");


--
-- Name: TelegramBotInstance_role_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX "TelegramBotInstance_role_idx" ON public."TelegramBotInstance" USING btree (role);


--
-- Name: TelegramBotInstance_tenantId_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX "TelegramBotInstance_tenantId_idx" ON public."TelegramBotInstance" USING btree ("tenantId");


--
-- Name: TelegramButton_sortOrder_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX "TelegramButton_sortOrder_idx" ON public."TelegramButton" USING btree ("sortOrder");


--
-- Name: TelegramButton_tenantId_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX "TelegramButton_tenantId_idx" ON public."TelegramButton" USING btree ("tenantId");


--
-- Name: TelegramDailyStat_date_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX "TelegramDailyStat_date_idx" ON public."TelegramDailyStat" USING btree (date);


--
-- Name: TelegramDailyStat_date_tenantId_key; Type: INDEX; Schema: public; Owner: postgres
--

CREATE UNIQUE INDEX "TelegramDailyStat_date_tenantId_key" ON public."TelegramDailyStat" USING btree (date, "tenantId");


--
-- Name: TelegramDailyStat_tenantId_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX "TelegramDailyStat_tenantId_idx" ON public."TelegramDailyStat" USING btree ("tenantId");


--
-- Name: TelegramErrorLog_errorCode_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX "TelegramErrorLog_errorCode_idx" ON public."TelegramErrorLog" USING btree ("errorCode");


--
-- Name: TelegramErrorLog_isResolved_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX "TelegramErrorLog_isResolved_idx" ON public."TelegramErrorLog" USING btree ("isResolved");


--
-- Name: TelegramErrorLog_lastSeenAt_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX "TelegramErrorLog_lastSeenAt_idx" ON public."TelegramErrorLog" USING btree ("lastSeenAt");


--
-- Name: TelegramErrorLog_level_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX "TelegramErrorLog_level_idx" ON public."TelegramErrorLog" USING btree (level);


--
-- Name: TelegramErrorLog_source_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX "TelegramErrorLog_source_idx" ON public."TelegramErrorLog" USING btree (source);


--
-- Name: TelegramErrorLog_tenantId_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX "TelegramErrorLog_tenantId_idx" ON public."TelegramErrorLog" USING btree ("tenantId");


--
-- Name: TelegramProxy_tenantId_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX "TelegramProxy_tenantId_idx" ON public."TelegramProxy" USING btree ("tenantId");


--
-- Name: TelegramTemplate_category_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX "TelegramTemplate_category_idx" ON public."TelegramTemplate" USING btree (category);


--
-- Name: TelegramTemplate_slug_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX "TelegramTemplate_slug_idx" ON public."TelegramTemplate" USING btree (slug);


--
-- Name: TelegramTemplate_slug_tenantId_key; Type: INDEX; Schema: public; Owner: postgres
--

CREATE UNIQUE INDEX "TelegramTemplate_slug_tenantId_key" ON public."TelegramTemplate" USING btree (slug, "tenantId");


--
-- Name: TelegramTemplate_tenantId_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX "TelegramTemplate_tenantId_idx" ON public."TelegramTemplate" USING btree ("tenantId");


--
-- Name: Tenant_customDomain_key; Type: INDEX; Schema: public; Owner: postgres
--

CREATE UNIQUE INDEX "Tenant_customDomain_key" ON public."Tenant" USING btree ("customDomain");


--
-- Name: Tenant_domain_key; Type: INDEX; Schema: public; Owner: postgres
--

CREATE UNIQUE INDEX "Tenant_domain_key" ON public."Tenant" USING btree (domain);


--
-- Name: Tenant_slug_key; Type: INDEX; Schema: public; Owner: postgres
--

CREATE UNIQUE INDEX "Tenant_slug_key" ON public."Tenant" USING btree (slug);


--
-- Name: TicketFeedback_score_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX "TicketFeedback_score_idx" ON public."TicketFeedback" USING btree (score);


--
-- Name: TicketFeedback_tenantId_createdAt_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX "TicketFeedback_tenantId_createdAt_idx" ON public."TicketFeedback" USING btree ("tenantId", "createdAt");


--
-- Name: TicketFeedback_tenantId_score_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX "TicketFeedback_tenantId_score_idx" ON public."TicketFeedback" USING btree ("tenantId", score);


--
-- Name: TicketFeedback_ticketId_key; Type: INDEX; Schema: public; Owner: postgres
--

CREATE UNIQUE INDEX "TicketFeedback_ticketId_key" ON public."TicketFeedback" USING btree ("ticketId");


--
-- Name: TicketFeedback_userId_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX "TicketFeedback_userId_idx" ON public."TicketFeedback" USING btree ("userId");


--
-- Name: TicketMessage_orderId_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX "TicketMessage_orderId_idx" ON public."TicketMessage" USING btree ("orderId");


--
-- Name: TicketMessage_telegramMsgId_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX "TicketMessage_telegramMsgId_idx" ON public."TicketMessage" USING btree ("telegramMsgId");


--
-- Name: TicketMessage_ticketId_createdAt_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX "TicketMessage_ticketId_createdAt_idx" ON public."TicketMessage" USING btree ("ticketId", "createdAt");


--
-- Name: TicketMessage_ticketId_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX "TicketMessage_ticketId_idx" ON public."TicketMessage" USING btree ("ticketId");


--
-- Name: Ticket_orderId_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX "Ticket_orderId_idx" ON public."Ticket" USING btree ("orderId");


--
-- Name: Ticket_paymentId_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX "Ticket_paymentId_idx" ON public."Ticket" USING btree ("paymentId");


--
-- Name: Ticket_source_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX "Ticket_source_idx" ON public."Ticket" USING btree (source);


--
-- Name: Ticket_status_createdAt_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX "Ticket_status_createdAt_idx" ON public."Ticket" USING btree (status, "createdAt");


--
-- Name: Ticket_status_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX "Ticket_status_idx" ON public."Ticket" USING btree (status);


--
-- Name: Ticket_tenantId_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX "Ticket_tenantId_idx" ON public."Ticket" USING btree ("tenantId");


--
-- Name: Ticket_tenantId_status_createdAt_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX "Ticket_tenantId_status_createdAt_idx" ON public."Ticket" USING btree ("tenantId", status, "createdAt");


--
-- Name: Ticket_tenantId_userId_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX "Ticket_tenantId_userId_idx" ON public."Ticket" USING btree ("tenantId", "userId");


--
-- Name: Ticket_userId_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX "Ticket_userId_idx" ON public."Ticket" USING btree ("userId");


--
-- Name: Ticket_userId_status_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX "Ticket_userId_status_idx" ON public."Ticket" USING btree ("userId", status);


--
-- Name: UrlPattern_networkId_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX "UrlPattern_networkId_idx" ON public."UrlPattern" USING btree ("networkId");


--
-- Name: UserNote_authorId_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX "UserNote_authorId_idx" ON public."UserNote" USING btree ("authorId");


--
-- Name: UserNote_orderId_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX "UserNote_orderId_idx" ON public."UserNote" USING btree ("orderId");


--
-- Name: UserNote_ticketId_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX "UserNote_ticketId_idx" ON public."UserNote" USING btree ("ticketId");


--
-- Name: UserNote_userId_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX "UserNote_userId_idx" ON public."UserNote" USING btree ("userId");


--
-- Name: User_apiKeyHash_key; Type: INDEX; Schema: public; Owner: postgres
--

CREATE UNIQUE INDEX "User_apiKeyHash_key" ON public."User" USING btree ("apiKeyHash");


--
-- Name: User_createdAt_id_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX "User_createdAt_id_idx" ON public."User" USING btree ("createdAt" DESC, id DESC);


--
-- Name: User_customerGroupId_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX "User_customerGroupId_idx" ON public."User" USING btree ("customerGroupId");


--
-- Name: User_email_tenantId_key; Type: INDEX; Schema: public; Owner: postgres
--

CREATE UNIQUE INDEX "User_email_tenantId_key" ON public."User" USING btree (email, "tenantId");


--
-- Name: User_phoneHash_key; Type: INDEX; Schema: public; Owner: postgres
--

CREATE UNIQUE INDEX "User_phoneHash_key" ON public."User" USING btree ("phoneHash");


--
-- Name: User_referralCode_key; Type: INDEX; Schema: public; Owner: postgres
--

CREATE UNIQUE INDEX "User_referralCode_key" ON public."User" USING btree ("referralCode");


--
-- Name: User_tenantId_createdAt_id_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX "User_tenantId_createdAt_id_idx" ON public."User" USING btree ("tenantId", "createdAt" DESC, id DESC);


--
-- Name: User_tenantId_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX "User_tenantId_idx" ON public."User" USING btree ("tenantId");


--
-- Name: api_request_log_api_key_hash_created_at_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX api_request_log_api_key_hash_created_at_idx ON public.api_request_log USING btree (api_key_hash, created_at);


--
-- Name: api_request_log_created_at_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX api_request_log_created_at_idx ON public.api_request_log USING btree (created_at);


--
-- Name: ledger_period_month_key; Type: INDEX; Schema: public; Owner: postgres
--

CREATE UNIQUE INDEX ledger_period_month_key ON public.ledger_period USING btree (month);


--
-- Name: provider_service_backup_service_id_backup_provider_id_key; Type: INDEX; Schema: public; Owner: postgres
--

CREATE UNIQUE INDEX provider_service_backup_service_id_backup_provider_id_key ON public.provider_service_backup USING btree (service_id, backup_provider_id);


--
-- Name: provider_service_backup_service_id_priority_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX provider_service_backup_service_id_priority_idx ON public.provider_service_backup USING btree (service_id, priority);


--
-- Name: reconciliation_report_date_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX reconciliation_report_date_idx ON public.reconciliation_report USING btree (date);


--
-- Name: revenue_recognition_order_id_key; Type: INDEX; Schema: public; Owner: postgres
--

CREATE UNIQUE INDEX revenue_recognition_order_id_key ON public.revenue_recognition USING btree (order_id);


--
-- Name: AiPricingRecommendation AiPricingRecommendation_serviceId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."AiPricingRecommendation"
    ADD CONSTRAINT "AiPricingRecommendation_serviceId_fkey" FOREIGN KEY ("serviceId") REFERENCES public."Service"(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: AiPricingRecommendation AiPricingRecommendation_snapshotId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."AiPricingRecommendation"
    ADD CONSTRAINT "AiPricingRecommendation_snapshotId_fkey" FOREIGN KEY ("snapshotId") REFERENCES public."EconomicOptimizationSnapshot"(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: ApiConfig ApiConfig_userId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."ApiConfig"
    ADD CONSTRAINT "ApiConfig_userId_fkey" FOREIGN KEY ("userId") REFERENCES public."User"(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: AuditLog AuditLog_userId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."AuditLog"
    ADD CONSTRAINT "AuditLog_userId_fkey" FOREIGN KEY ("userId") REFERENCES public."User"(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: AuthToken AuthToken_userId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."AuthToken"
    ADD CONSTRAINT "AuthToken_userId_fkey" FOREIGN KEY ("userId") REFERENCES public."User"(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: Category Category_networkId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."Category"
    ADD CONSTRAINT "Category_networkId_fkey" FOREIGN KEY ("networkId") REFERENCES public."Network"(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: Commission Commission_referrerId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."Commission"
    ADD CONSTRAINT "Commission_referrerId_fkey" FOREIGN KEY ("referrerId") REFERENCES public."User"(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: ContentCategory ContentCategory_parentId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."ContentCategory"
    ADD CONSTRAINT "ContentCategory_parentId_fkey" FOREIGN KEY ("parentId") REFERENCES public."ContentCategory"(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: ContentItem ContentItem_categoryId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."ContentItem"
    ADD CONSTRAINT "ContentItem_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES public."ContentCategory"(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: CxApologyCompensation CxApologyCompensation_orderId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."CxApologyCompensation"
    ADD CONSTRAINT "CxApologyCompensation_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES public."Order"(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: CxApologyCompensation CxApologyCompensation_userId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."CxApologyCompensation"
    ADD CONSTRAINT "CxApologyCompensation_userId_fkey" FOREIGN KEY ("userId") REFERENCES public."User"(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: EconomicOptimizationSnapshot EconomicOptimizationSnapshot_appliedBy_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."EconomicOptimizationSnapshot"
    ADD CONSTRAINT "EconomicOptimizationSnapshot_appliedBy_fkey" FOREIGN KEY ("appliedBy") REFERENCES public."User"(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: EmployeeResponsibilityConsent EmployeeResponsibilityConsent_documentVersionId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."EmployeeResponsibilityConsent"
    ADD CONSTRAINT "EmployeeResponsibilityConsent_documentVersionId_fkey" FOREIGN KEY ("documentVersionId") REFERENCES public."LegalDocumentVersion"(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: EmployeeResponsibilityConsent EmployeeResponsibilityConsent_userId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."EmployeeResponsibilityConsent"
    ADD CONSTRAINT "EmployeeResponsibilityConsent_userId_fkey" FOREIGN KEY ("userId") REFERENCES public."User"(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: Invoice Invoice_paymentId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."Invoice"
    ADD CONSTRAINT "Invoice_paymentId_fkey" FOREIGN KEY ("paymentId") REFERENCES public."Payment"(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: Invoice Invoice_userId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."Invoice"
    ADD CONSTRAINT "Invoice_userId_fkey" FOREIGN KEY ("userId") REFERENCES public."User"(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: LedgerEntry LedgerEntry_periodId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."LedgerEntry"
    ADD CONSTRAINT "LedgerEntry_periodId_fkey" FOREIGN KEY ("periodId") REFERENCES public.ledger_period(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: LedgerEntry LedgerEntry_userId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."LedgerEntry"
    ADD CONSTRAINT "LedgerEntry_userId_fkey" FOREIGN KEY ("userId") REFERENCES public."User"(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: ManualBalanceAdjustment ManualBalanceAdjustment_approvedBy_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."ManualBalanceAdjustment"
    ADD CONSTRAINT "ManualBalanceAdjustment_approvedBy_fkey" FOREIGN KEY ("approvedBy") REFERENCES public."User"(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: ManualBalanceAdjustment ManualBalanceAdjustment_rejectedBy_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."ManualBalanceAdjustment"
    ADD CONSTRAINT "ManualBalanceAdjustment_rejectedBy_fkey" FOREIGN KEY ("rejectedBy") REFERENCES public."User"(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: ManualBalanceAdjustment ManualBalanceAdjustment_requestedBy_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."ManualBalanceAdjustment"
    ADD CONSTRAINT "ManualBalanceAdjustment_requestedBy_fkey" FOREIGN KEY ("requestedBy") REFERENCES public."User"(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: ManualBalanceAdjustment ManualBalanceAdjustment_userId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."ManualBalanceAdjustment"
    ADD CONSTRAINT "ManualBalanceAdjustment_userId_fkey" FOREIGN KEY ("userId") REFERENCES public."User"(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: MessageAttachment MessageAttachment_messageId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."MessageAttachment"
    ADD CONSTRAINT "MessageAttachment_messageId_fkey" FOREIGN KEY ("messageId") REFERENCES public."TicketMessage"(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: OrderRecoveryIncident OrderRecoveryIncident_orderId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."OrderRecoveryIncident"
    ADD CONSTRAINT "OrderRecoveryIncident_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES public."Order"(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: OrderRecoveryIncident OrderRecoveryIncident_userId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."OrderRecoveryIncident"
    ADD CONSTRAINT "OrderRecoveryIncident_userId_fkey" FOREIGN KEY ("userId") REFERENCES public."User"(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: Order Order_paymentId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."Order"
    ADD CONSTRAINT "Order_paymentId_fkey" FOREIGN KEY ("paymentId") REFERENCES public."Payment"(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: Order Order_promoCodeId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."Order"
    ADD CONSTRAINT "Order_promoCodeId_fkey" FOREIGN KEY ("promoCodeId") REFERENCES public."PromoCode"(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: Order Order_providerId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."Order"
    ADD CONSTRAINT "Order_providerId_fkey" FOREIGN KEY ("providerId") REFERENCES public."Provider"(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: Order Order_serviceId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."Order"
    ADD CONSTRAINT "Order_serviceId_fkey" FOREIGN KEY ("serviceId") REFERENCES public."Service"(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: Order Order_userId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."Order"
    ADD CONSTRAINT "Order_userId_fkey" FOREIGN KEY ("userId") REFERENCES public."User"(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: Payment Payment_userId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."Payment"
    ADD CONSTRAINT "Payment_userId_fkey" FOREIGN KEY ("userId") REFERENCES public."User"(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: PromoCodeUsage PromoCodeUsage_orderId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."PromoCodeUsage"
    ADD CONSTRAINT "PromoCodeUsage_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES public."Order"(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: PromoCodeUsage PromoCodeUsage_promoCodeId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."PromoCodeUsage"
    ADD CONSTRAINT "PromoCodeUsage_promoCodeId_fkey" FOREIGN KEY ("promoCodeId") REFERENCES public."PromoCode"(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: PromoCodeUsage PromoCodeUsage_userId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."PromoCodeUsage"
    ADD CONSTRAINT "PromoCodeUsage_userId_fkey" FOREIGN KEY ("userId") REFERENCES public."User"(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: ProviderProxyLog ProviderProxyLog_providerId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."ProviderProxyLog"
    ADD CONSTRAINT "ProviderProxyLog_providerId_fkey" FOREIGN KEY ("providerId") REFERENCES public."Provider"(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: ProviderProxyLog ProviderProxyLog_proxyId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."ProviderProxyLog"
    ADD CONSTRAINT "ProviderProxyLog_proxyId_fkey" FOREIGN KEY ("proxyId") REFERENCES public."ProviderProxy"(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: Provider Provider_proxyId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."Provider"
    ADD CONSTRAINT "Provider_proxyId_fkey" FOREIGN KEY ("proxyId") REFERENCES public."ProviderProxy"(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: Refill Refill_orderId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."Refill"
    ADD CONSTRAINT "Refill_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES public."Order"(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: ServiceCustomerAccess ServiceCustomerAccess_customerGroupId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."ServiceCustomerAccess"
    ADD CONSTRAINT "ServiceCustomerAccess_customerGroupId_fkey" FOREIGN KEY ("customerGroupId") REFERENCES public."CustomerGroup"(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: ServiceCustomerAccess ServiceCustomerAccess_serviceId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."ServiceCustomerAccess"
    ADD CONSTRAINT "ServiceCustomerAccess_serviceId_fkey" FOREIGN KEY ("serviceId") REFERENCES public."Service"(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: ServiceDraft ServiceDraft_serviceId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."ServiceDraft"
    ADD CONSTRAINT "ServiceDraft_serviceId_fkey" FOREIGN KEY ("serviceId") REFERENCES public."Service"(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: ServiceEditHistory ServiceEditHistory_draftId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."ServiceEditHistory"
    ADD CONSTRAINT "ServiceEditHistory_draftId_fkey" FOREIGN KEY ("draftId") REFERENCES public."ServiceDraft"(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: ServiceEditHistory ServiceEditHistory_serviceId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."ServiceEditHistory"
    ADD CONSTRAINT "ServiceEditHistory_serviceId_fkey" FOREIGN KEY ("serviceId") REFERENCES public."Service"(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: ServiceLinkCheck ServiceLinkCheck_serviceId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."ServiceLinkCheck"
    ADD CONSTRAINT "ServiceLinkCheck_serviceId_fkey" FOREIGN KEY ("serviceId") REFERENCES public."Service"(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: ServicePriceHistory ServicePriceHistory_serviceId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."ServicePriceHistory"
    ADD CONSTRAINT "ServicePriceHistory_serviceId_fkey" FOREIGN KEY ("serviceId") REFERENCES public."Service"(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: ServiceRoute ServiceRoute_providerId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."ServiceRoute"
    ADD CONSTRAINT "ServiceRoute_providerId_fkey" FOREIGN KEY ("providerId") REFERENCES public."Provider"(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: ServiceRoute ServiceRoute_serviceId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."ServiceRoute"
    ADD CONSTRAINT "ServiceRoute_serviceId_fkey" FOREIGN KEY ("serviceId") REFERENCES public."Service"(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: ServiceSmartConfig ServiceSmartConfig_serviceId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."ServiceSmartConfig"
    ADD CONSTRAINT "ServiceSmartConfig_serviceId_fkey" FOREIGN KEY ("serviceId") REFERENCES public."Service"(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: Service Service_categoryId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."Service"
    ADD CONSTRAINT "Service_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES public."Category"(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: Service Service_providerId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."Service"
    ADD CONSTRAINT "Service_providerId_fkey" FOREIGN KEY ("providerId") REFERENCES public."Provider"(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: Session Session_userId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."Session"
    ADD CONSTRAINT "Session_userId_fkey" FOREIGN KEY ("userId") REFERENCES public."User"(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: ShadowService ShadowService_providerId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."ShadowService"
    ADD CONSTRAINT "ShadowService_providerId_fkey" FOREIGN KEY ("providerId") REFERENCES public."Provider"(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: SmartCampaign SmartCampaign_orderId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."SmartCampaign"
    ADD CONSTRAINT "SmartCampaign_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES public."Order"(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: SmartCampaign SmartCampaign_paymentId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."SmartCampaign"
    ADD CONSTRAINT "SmartCampaign_paymentId_fkey" FOREIGN KEY ("paymentId") REFERENCES public."Payment"(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: SmartCampaign SmartCampaign_serviceId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."SmartCampaign"
    ADD CONSTRAINT "SmartCampaign_serviceId_fkey" FOREIGN KEY ("serviceId") REFERENCES public."Service"(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: SmartCampaign SmartCampaign_userId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."SmartCampaign"
    ADD CONSTRAINT "SmartCampaign_userId_fkey" FOREIGN KEY ("userId") REFERENCES public."User"(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: SmartChannelMetric SmartChannelMetric_campaignId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."SmartChannelMetric"
    ADD CONSTRAINT "SmartChannelMetric_campaignId_fkey" FOREIGN KEY ("campaignId") REFERENCES public."SmartCampaign"(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: SmartExecution SmartExecution_providerId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."SmartExecution"
    ADD CONSTRAINT "SmartExecution_providerId_fkey" FOREIGN KEY ("providerId") REFERENCES public."Provider"(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: SmartExecution SmartExecution_taskId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."SmartExecution"
    ADD CONSTRAINT "SmartExecution_taskId_fkey" FOREIGN KEY ("taskId") REFERENCES public."SmartTask"(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: SmartSnapshot SmartSnapshot_campaignId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."SmartSnapshot"
    ADD CONSTRAINT "SmartSnapshot_campaignId_fkey" FOREIGN KEY ("campaignId") REFERENCES public."SmartCampaign"(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: SmartTask SmartTask_campaignId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."SmartTask"
    ADD CONSTRAINT "SmartTask_campaignId_fkey" FOREIGN KEY ("campaignId") REFERENCES public."SmartCampaign"(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: StaffPermission StaffPermission_roleId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."StaffPermission"
    ADD CONSTRAINT "StaffPermission_roleId_fkey" FOREIGN KEY ("roleId") REFERENCES public."StaffRole"(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: StaffShift StaffShift_substituteUserId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."StaffShift"
    ADD CONSTRAINT "StaffShift_substituteUserId_fkey" FOREIGN KEY ("substituteUserId") REFERENCES public."User"(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: StaffShift StaffShift_userId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."StaffShift"
    ADD CONSTRAINT "StaffShift_userId_fkey" FOREIGN KEY ("userId") REFERENCES public."User"(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: StorefrontKey StorefrontKey_tenantId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."StorefrontKey"
    ADD CONSTRAINT "StorefrontKey_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES public."Tenant"(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: SupportFinancialAction SupportFinancialAction_staffUserId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."SupportFinancialAction"
    ADD CONSTRAINT "SupportFinancialAction_staffUserId_fkey" FOREIGN KEY ("staffUserId") REFERENCES public."User"(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: SupportFinancialAction SupportFinancialAction_targetUserId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."SupportFinancialAction"
    ADD CONSTRAINT "SupportFinancialAction_targetUserId_fkey" FOREIGN KEY ("targetUserId") REFERENCES public."User"(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: SystemSettings SystemSettings_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."SystemSettings"
    ADD CONSTRAINT "SystemSettings_id_fkey" FOREIGN KEY (id) REFERENCES public."Tenant"(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: TicketFeedback TicketFeedback_ticketId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."TicketFeedback"
    ADD CONSTRAINT "TicketFeedback_ticketId_fkey" FOREIGN KEY ("ticketId") REFERENCES public."Ticket"(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: TicketFeedback TicketFeedback_userId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."TicketFeedback"
    ADD CONSTRAINT "TicketFeedback_userId_fkey" FOREIGN KEY ("userId") REFERENCES public."User"(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: TicketMessage TicketMessage_orderId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."TicketMessage"
    ADD CONSTRAINT "TicketMessage_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES public."Order"(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: TicketMessage TicketMessage_replyToId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."TicketMessage"
    ADD CONSTRAINT "TicketMessage_replyToId_fkey" FOREIGN KEY ("replyToId") REFERENCES public."TicketMessage"(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: TicketMessage TicketMessage_ticketId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."TicketMessage"
    ADD CONSTRAINT "TicketMessage_ticketId_fkey" FOREIGN KEY ("ticketId") REFERENCES public."Ticket"(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: Ticket Ticket_orderId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."Ticket"
    ADD CONSTRAINT "Ticket_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES public."Order"(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: Ticket Ticket_paymentId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."Ticket"
    ADD CONSTRAINT "Ticket_paymentId_fkey" FOREIGN KEY ("paymentId") REFERENCES public."Payment"(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: Ticket Ticket_userId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."Ticket"
    ADD CONSTRAINT "Ticket_userId_fkey" FOREIGN KEY ("userId") REFERENCES public."User"(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: UrlPattern UrlPattern_networkId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."UrlPattern"
    ADD CONSTRAINT "UrlPattern_networkId_fkey" FOREIGN KEY ("networkId") REFERENCES public."Network"(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: UserNote UserNote_authorId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."UserNote"
    ADD CONSTRAINT "UserNote_authorId_fkey" FOREIGN KEY ("authorId") REFERENCES public."User"(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: UserNote UserNote_orderId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."UserNote"
    ADD CONSTRAINT "UserNote_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES public."Order"(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: UserNote UserNote_ticketId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."UserNote"
    ADD CONSTRAINT "UserNote_ticketId_fkey" FOREIGN KEY ("ticketId") REFERENCES public."Ticket"(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: UserNote UserNote_userId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."UserNote"
    ADD CONSTRAINT "UserNote_userId_fkey" FOREIGN KEY ("userId") REFERENCES public."User"(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: User User_customerGroupId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."User"
    ADD CONSTRAINT "User_customerGroupId_fkey" FOREIGN KEY ("customerGroupId") REFERENCES public."CustomerGroup"(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: User User_referredById_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."User"
    ADD CONSTRAINT "User_referredById_fkey" FOREIGN KEY ("referredById") REFERENCES public."User"(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: User User_staffRoleId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."User"
    ADD CONSTRAINT "User_staffRoleId_fkey" FOREIGN KEY ("staffRoleId") REFERENCES public."StaffRole"(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: SCHEMA public; Type: ACL; Schema: -; Owner: postgres
--

REVOKE USAGE ON SCHEMA public FROM PUBLIC;


--
-- PostgreSQL database dump complete
--

\unrestrict lTV7muNSLdWAZl5h4csuTOBLZslvdacaXgOsapxWS10hSBTInSfdn14GFv5SUVC

