-- CreateTable
CREATE TABLE "Organization" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "plan" TEXT NOT NULL DEFAULT 'ENTERPRISE',
    "subscriptionTier" TEXT NOT NULL DEFAULT 'ENTERPRISE',
    "subscriptionExpiresAt" TIMESTAMP(3),
    "quotaMessagesLimit" INTEGER NOT NULL DEFAULT 50000,
    "quotaMessagesUsed" INTEGER NOT NULL DEFAULT 0,
    "quotaAccountsLimit" INTEGER NOT NULL DEFAULT 50,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Organization_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "passwordHash" TEXT NOT NULL,
    "name" TEXT,
    "role" TEXT NOT NULL DEFAULT 'OWNER',
    "plan" TEXT NOT NULL DEFAULT 'ENTERPRISE',
    "subscriptionTier" TEXT NOT NULL DEFAULT 'ENTERPRISE',
    "subscriptionExpiresAt" TIMESTAMP(3),
    "quotaMessagesLimit" INTEGER NOT NULL DEFAULT 5000,
    "quotaMessagesUsed" INTEGER NOT NULL DEFAULT 0,
    "quotaAccountsLimit" INTEGER NOT NULL DEFAULT 10,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "orgId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Membership" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "orgId" TEXT NOT NULL,
    "role" TEXT NOT NULL DEFAULT 'MEMBER',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Membership_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "UserSession" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "refreshToken" TEXT NOT NULL,
    "ipAddress" TEXT,
    "userAgent" TEXT,
    "isRevoked" BOOLEAN NOT NULL DEFAULT false,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "lastActiveAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "UserSession_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Proxy" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "orgId" TEXT,
    "host" TEXT NOT NULL,
    "port" INTEGER NOT NULL,
    "protocol" TEXT NOT NULL DEFAULT 'socks5',
    "username" TEXT,
    "password" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "responseTimeMs" INTEGER DEFAULT 0,
    "lastCheckedAt" TIMESTAMP(3),
    "failureCount" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Proxy_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TelegramAccount" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "orgId" TEXT,
    "phone" TEXT NOT NULL,
    "apiId" INTEGER NOT NULL,
    "apiHash" TEXT NOT NULL,
    "sessionString" TEXT,
    "status" TEXT NOT NULL DEFAULT 'PENDING_AUTH',
    "floodWaitUntil" TIMESTAMP(3),
    "dailyLimit" INTEGER NOT NULL DEFAULT 40,
    "sentToday" INTEGER NOT NULL DEFAULT 0,
    "totalSent" INTEGER NOT NULL DEFAULT 0,
    "totalFailed" INTEGER NOT NULL DEFAULT 0,
    "lastSentAt" TIMESTAMP(3),
    "warmupMode" BOOLEAN NOT NULL DEFAULT true,
    "warmupDays" INTEGER NOT NULL DEFAULT 1,
    "healthScore" INTEGER NOT NULL DEFAULT 100,
    "tier" TEXT NOT NULL DEFAULT 'TIER_1',
    "firstName" TEXT,
    "lastName" TEXT,
    "username" TEXT,
    "proxyId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "TelegramAccount_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TelegramSession" (
    "id" TEXT NOT NULL,
    "accountId" TEXT NOT NULL,
    "sessionHash" TEXT NOT NULL,
    "ipAddress" TEXT,
    "deviceModel" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "lastActiveAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "TelegramSession_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "GroupTarget" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "orgId" TEXT,
    "title" TEXT NOT NULL,
    "username" TEXT,
    "chatId" TEXT,
    "memberCount" INTEGER NOT NULL DEFAULT 0,
    "scrapedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "GroupTarget_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ScrapedMember" (
    "id" TEXT NOT NULL,
    "groupId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "accessHash" TEXT,
    "username" TEXT,
    "firstName" TEXT,
    "lastName" TEXT,
    "phone" TEXT,
    "status" TEXT,
    "isBot" BOOLEAN NOT NULL DEFAULT false,
    "isScam" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ScrapedMember_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Campaign" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "orgId" TEXT,
    "name" TEXT NOT NULL,
    "messageTemplate" TEXT NOT NULL,
    "groupId" TEXT,
    "delayMinSeconds" INTEGER NOT NULL DEFAULT 15,
    "delayMaxSeconds" INTEGER NOT NULL DEFAULT 45,
    "status" TEXT NOT NULL DEFAULT 'DRAFT',
    "totalTargets" INTEGER NOT NULL DEFAULT 0,
    "sentCount" INTEGER NOT NULL DEFAULT 0,
    "failedCount" INTEGER NOT NULL DEFAULT 0,
    "policyConfig" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Campaign_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CampaignTarget" (
    "id" TEXT NOT NULL,
    "campaignId" TEXT NOT NULL,
    "scrapedMemberId" TEXT,
    "targetUserId" TEXT NOT NULL,
    "username" TEXT,
    "firstName" TEXT,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "lastAttemptAt" TIMESTAMP(3),
    "error" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CampaignTarget_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CampaignRun" (
    "id" TEXT NOT NULL,
    "campaignId" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'RUNNING',
    "totalCount" INTEGER NOT NULL DEFAULT 0,
    "processedCount" INTEGER NOT NULL DEFAULT 0,
    "successCount" INTEGER NOT NULL DEFAULT 0,
    "failedCount" INTEGER NOT NULL DEFAULT 0,
    "progress" INTEGER NOT NULL DEFAULT 0,
    "startedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "endedAt" TIMESTAMP(3),
    "triggeredBy" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CampaignRun_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CampaignEvent" (
    "id" TEXT NOT NULL,
    "campaignRunId" TEXT,
    "campaignId" TEXT NOT NULL,
    "accountId" TEXT,
    "targetUserId" TEXT NOT NULL,
    "targetUsername" TEXT,
    "eventType" TEXT NOT NULL,
    "status" TEXT NOT NULL,
    "error" TEXT,
    "metadata" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CampaignEvent_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CampaignLog" (
    "id" TEXT NOT NULL,
    "campaignId" TEXT NOT NULL,
    "accountId" TEXT,
    "targetUserId" TEXT NOT NULL,
    "status" TEXT NOT NULL,
    "error" TEXT,
    "sentAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CampaignLog_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AddMembersTask" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "orgId" TEXT,
    "name" TEXT NOT NULL,
    "sourceGroupId" TEXT,
    "targetGroup" TEXT NOT NULL,
    "delayMinSeconds" INTEGER NOT NULL DEFAULT 20,
    "delayMaxSeconds" INTEGER NOT NULL DEFAULT 50,
    "status" TEXT NOT NULL DEFAULT 'DRAFT',
    "totalTargets" INTEGER NOT NULL DEFAULT 0,
    "addedCount" INTEGER NOT NULL DEFAULT 0,
    "failedCount" INTEGER NOT NULL DEFAULT 0,
    "privacyRestrictedCount" INTEGER NOT NULL DEFAULT 0,
    "alreadyMemberCount" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AddMembersTask_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AddMembersLog" (
    "id" TEXT NOT NULL,
    "taskId" TEXT NOT NULL,
    "accountId" TEXT,
    "targetUserId" TEXT NOT NULL,
    "targetUsername" TEXT,
    "status" TEXT NOT NULL,
    "error" TEXT,
    "addedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AddMembersLog_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AuditLog" (
    "id" TEXT NOT NULL,
    "userId" TEXT,
    "orgId" TEXT,
    "action" TEXT NOT NULL,
    "entity" TEXT NOT NULL,
    "entityId" TEXT,
    "details" TEXT,
    "ipAddress" TEXT,
    "userAgent" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AuditLog_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Notification" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "message" TEXT NOT NULL,
    "type" TEXT NOT NULL DEFAULT 'INFO',
    "read" BOOLEAN NOT NULL DEFAULT false,
    "actionUrl" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Notification_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SystemEvent" (
    "id" TEXT NOT NULL,
    "level" TEXT NOT NULL DEFAULT 'INFO',
    "source" TEXT NOT NULL,
    "message" TEXT NOT NULL,
    "metadata" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "SystemEvent_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PaymentReceiptRequest" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "planRequested" TEXT NOT NULL,
    "durationMonths" INTEGER NOT NULL DEFAULT 1,
    "amountPaid" DOUBLE PRECISION NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'USD',
    "paymentMethod" TEXT NOT NULL,
    "transactionReference" TEXT,
    "receiptImageUrl" TEXT NOT NULL,
    "adminNotes" TEXT,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "reviewedBy" TEXT,
    "reviewedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PaymentReceiptRequest_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TelegramBot" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "orgId" TEXT,
    "token" TEXT NOT NULL,
    "botId" TEXT NOT NULL,
    "username" TEXT,
    "firstName" TEXT,
    "webhookUrl" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "autoReplyRules" TEXT,
    "welcomeMessage" TEXT,
    "subscriberCount" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "TelegramBot_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "BotSubscriber" (
    "id" TEXT NOT NULL,
    "botId" TEXT NOT NULL,
    "telegramUserId" TEXT NOT NULL,
    "username" TEXT,
    "firstName" TEXT,
    "lastName" TEXT,
    "tags" TEXT,
    "customFields" TEXT,
    "isBlocked" BOOLEAN NOT NULL DEFAULT false,
    "lastInteractionAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "BotSubscriber_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "BotBroadcast" (
    "id" TEXT NOT NULL,
    "botId" TEXT NOT NULL,
    "messageText" TEXT NOT NULL,
    "mediaUrl" TEXT,
    "buttons" TEXT,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "totalRecipients" INTEGER NOT NULL DEFAULT 0,
    "successCount" INTEGER NOT NULL DEFAULT 0,
    "failedCount" INTEGER NOT NULL DEFAULT 0,
    "scheduledAt" TIMESTAMP(3),
    "completedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "BotBroadcast_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Organization_slug_key" ON "Organization"("slug");

-- CreateIndex
CREATE INDEX "Organization_slug_idx" ON "Organization"("slug");

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE INDEX "User_email_idx" ON "User"("email");

-- CreateIndex
CREATE INDEX "User_orgId_idx" ON "User"("orgId");

-- CreateIndex
CREATE INDEX "Membership_userId_idx" ON "Membership"("userId");

-- CreateIndex
CREATE INDEX "Membership_orgId_idx" ON "Membership"("orgId");

-- CreateIndex
CREATE UNIQUE INDEX "Membership_userId_orgId_key" ON "Membership"("userId", "orgId");

-- CreateIndex
CREATE UNIQUE INDEX "UserSession_refreshToken_key" ON "UserSession"("refreshToken");

-- CreateIndex
CREATE INDEX "UserSession_userId_idx" ON "UserSession"("userId");

-- CreateIndex
CREATE INDEX "UserSession_refreshToken_idx" ON "UserSession"("refreshToken");

-- CreateIndex
CREATE INDEX "Proxy_userId_idx" ON "Proxy"("userId");

-- CreateIndex
CREATE INDEX "Proxy_isActive_idx" ON "Proxy"("isActive");

-- CreateIndex
CREATE UNIQUE INDEX "TelegramAccount_phone_key" ON "TelegramAccount"("phone");

-- CreateIndex
CREATE INDEX "TelegramAccount_userId_idx" ON "TelegramAccount"("userId");

-- CreateIndex
CREATE INDEX "TelegramAccount_phone_idx" ON "TelegramAccount"("phone");

-- CreateIndex
CREATE INDEX "TelegramAccount_status_idx" ON "TelegramAccount"("status");

-- CreateIndex
CREATE INDEX "TelegramAccount_proxyId_idx" ON "TelegramAccount"("proxyId");

-- CreateIndex
CREATE INDEX "TelegramSession_accountId_idx" ON "TelegramSession"("accountId");

-- CreateIndex
CREATE INDEX "GroupTarget_userId_idx" ON "GroupTarget"("userId");

-- CreateIndex
CREATE INDEX "GroupTarget_username_idx" ON "GroupTarget"("username");

-- CreateIndex
CREATE INDEX "ScrapedMember_groupId_idx" ON "ScrapedMember"("groupId");

-- CreateIndex
CREATE INDEX "ScrapedMember_userId_idx" ON "ScrapedMember"("userId");

-- CreateIndex
CREATE INDEX "ScrapedMember_username_idx" ON "ScrapedMember"("username");

-- CreateIndex
CREATE INDEX "ScrapedMember_status_idx" ON "ScrapedMember"("status");

-- CreateIndex
CREATE UNIQUE INDEX "ScrapedMember_groupId_userId_key" ON "ScrapedMember"("groupId", "userId");

-- CreateIndex
CREATE INDEX "Campaign_userId_idx" ON "Campaign"("userId");

-- CreateIndex
CREATE INDEX "Campaign_status_idx" ON "Campaign"("status");

-- CreateIndex
CREATE INDEX "Campaign_groupId_idx" ON "Campaign"("groupId");

-- CreateIndex
CREATE INDEX "CampaignTarget_campaignId_idx" ON "CampaignTarget"("campaignId");

-- CreateIndex
CREATE INDEX "CampaignTarget_targetUserId_idx" ON "CampaignTarget"("targetUserId");

-- CreateIndex
CREATE INDEX "CampaignTarget_status_idx" ON "CampaignTarget"("status");

-- CreateIndex
CREATE INDEX "CampaignRun_campaignId_idx" ON "CampaignRun"("campaignId");

-- CreateIndex
CREATE INDEX "CampaignRun_status_idx" ON "CampaignRun"("status");

-- CreateIndex
CREATE INDEX "CampaignEvent_campaignId_idx" ON "CampaignEvent"("campaignId");

-- CreateIndex
CREATE INDEX "CampaignEvent_campaignRunId_idx" ON "CampaignEvent"("campaignRunId");

-- CreateIndex
CREATE INDEX "CampaignEvent_accountId_idx" ON "CampaignEvent"("accountId");

-- CreateIndex
CREATE INDEX "CampaignEvent_eventType_idx" ON "CampaignEvent"("eventType");

-- CreateIndex
CREATE INDEX "CampaignLog_campaignId_idx" ON "CampaignLog"("campaignId");

-- CreateIndex
CREATE INDEX "CampaignLog_accountId_idx" ON "CampaignLog"("accountId");

-- CreateIndex
CREATE INDEX "AddMembersTask_userId_idx" ON "AddMembersTask"("userId");

-- CreateIndex
CREATE INDEX "AddMembersTask_status_idx" ON "AddMembersTask"("status");

-- CreateIndex
CREATE INDEX "AddMembersLog_taskId_idx" ON "AddMembersLog"("taskId");

-- CreateIndex
CREATE INDEX "AddMembersLog_accountId_idx" ON "AddMembersLog"("accountId");

-- CreateIndex
CREATE INDEX "AuditLog_userId_idx" ON "AuditLog"("userId");

-- CreateIndex
CREATE INDEX "AuditLog_action_idx" ON "AuditLog"("action");

-- CreateIndex
CREATE INDEX "AuditLog_createdAt_idx" ON "AuditLog"("createdAt");

-- CreateIndex
CREATE INDEX "Notification_userId_idx" ON "Notification"("userId");

-- CreateIndex
CREATE INDEX "Notification_read_idx" ON "Notification"("read");

-- CreateIndex
CREATE INDEX "SystemEvent_level_idx" ON "SystemEvent"("level");

-- CreateIndex
CREATE INDEX "SystemEvent_source_idx" ON "SystemEvent"("source");

-- CreateIndex
CREATE INDEX "SystemEvent_createdAt_idx" ON "SystemEvent"("createdAt");

-- CreateIndex
CREATE INDEX "PaymentReceiptRequest_userId_idx" ON "PaymentReceiptRequest"("userId");

-- CreateIndex
CREATE INDEX "PaymentReceiptRequest_status_idx" ON "PaymentReceiptRequest"("status");

-- CreateIndex
CREATE INDEX "PaymentReceiptRequest_createdAt_idx" ON "PaymentReceiptRequest"("createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "TelegramBot_token_key" ON "TelegramBot"("token");

-- CreateIndex
CREATE INDEX "TelegramBot_userId_idx" ON "TelegramBot"("userId");

-- CreateIndex
CREATE INDEX "TelegramBot_botId_idx" ON "TelegramBot"("botId");

-- CreateIndex
CREATE INDEX "TelegramBot_isActive_idx" ON "TelegramBot"("isActive");

-- CreateIndex
CREATE INDEX "BotSubscriber_botId_idx" ON "BotSubscriber"("botId");

-- CreateIndex
CREATE INDEX "BotSubscriber_telegramUserId_idx" ON "BotSubscriber"("telegramUserId");

-- CreateIndex
CREATE INDEX "BotSubscriber_isBlocked_idx" ON "BotSubscriber"("isBlocked");

-- CreateIndex
CREATE UNIQUE INDEX "BotSubscriber_botId_telegramUserId_key" ON "BotSubscriber"("botId", "telegramUserId");

-- CreateIndex
CREATE INDEX "BotBroadcast_botId_idx" ON "BotBroadcast"("botId");

-- CreateIndex
CREATE INDEX "BotBroadcast_status_idx" ON "BotBroadcast"("status");

-- CreateIndex
CREATE INDEX "BotBroadcast_createdAt_idx" ON "BotBroadcast"("createdAt");

-- AddForeignKey
ALTER TABLE "User" ADD CONSTRAINT "User_orgId_fkey" FOREIGN KEY ("orgId") REFERENCES "Organization"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Membership" ADD CONSTRAINT "Membership_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Membership" ADD CONSTRAINT "Membership_orgId_fkey" FOREIGN KEY ("orgId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UserSession" ADD CONSTRAINT "UserSession_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Proxy" ADD CONSTRAINT "Proxy_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Proxy" ADD CONSTRAINT "Proxy_orgId_fkey" FOREIGN KEY ("orgId") REFERENCES "Organization"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TelegramAccount" ADD CONSTRAINT "TelegramAccount_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TelegramAccount" ADD CONSTRAINT "TelegramAccount_orgId_fkey" FOREIGN KEY ("orgId") REFERENCES "Organization"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TelegramAccount" ADD CONSTRAINT "TelegramAccount_proxyId_fkey" FOREIGN KEY ("proxyId") REFERENCES "Proxy"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TelegramSession" ADD CONSTRAINT "TelegramSession_accountId_fkey" FOREIGN KEY ("accountId") REFERENCES "TelegramAccount"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GroupTarget" ADD CONSTRAINT "GroupTarget_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GroupTarget" ADD CONSTRAINT "GroupTarget_orgId_fkey" FOREIGN KEY ("orgId") REFERENCES "Organization"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ScrapedMember" ADD CONSTRAINT "ScrapedMember_groupId_fkey" FOREIGN KEY ("groupId") REFERENCES "GroupTarget"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Campaign" ADD CONSTRAINT "Campaign_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Campaign" ADD CONSTRAINT "Campaign_orgId_fkey" FOREIGN KEY ("orgId") REFERENCES "Organization"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Campaign" ADD CONSTRAINT "Campaign_groupId_fkey" FOREIGN KEY ("groupId") REFERENCES "GroupTarget"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CampaignTarget" ADD CONSTRAINT "CampaignTarget_campaignId_fkey" FOREIGN KEY ("campaignId") REFERENCES "Campaign"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CampaignTarget" ADD CONSTRAINT "CampaignTarget_scrapedMemberId_fkey" FOREIGN KEY ("scrapedMemberId") REFERENCES "ScrapedMember"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CampaignRun" ADD CONSTRAINT "CampaignRun_campaignId_fkey" FOREIGN KEY ("campaignId") REFERENCES "Campaign"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CampaignEvent" ADD CONSTRAINT "CampaignEvent_campaignRunId_fkey" FOREIGN KEY ("campaignRunId") REFERENCES "CampaignRun"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CampaignEvent" ADD CONSTRAINT "CampaignEvent_campaignId_fkey" FOREIGN KEY ("campaignId") REFERENCES "Campaign"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CampaignEvent" ADD CONSTRAINT "CampaignEvent_accountId_fkey" FOREIGN KEY ("accountId") REFERENCES "TelegramAccount"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CampaignLog" ADD CONSTRAINT "CampaignLog_campaignId_fkey" FOREIGN KEY ("campaignId") REFERENCES "Campaign"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CampaignLog" ADD CONSTRAINT "CampaignLog_accountId_fkey" FOREIGN KEY ("accountId") REFERENCES "TelegramAccount"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AddMembersTask" ADD CONSTRAINT "AddMembersTask_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AddMembersTask" ADD CONSTRAINT "AddMembersTask_orgId_fkey" FOREIGN KEY ("orgId") REFERENCES "Organization"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AddMembersTask" ADD CONSTRAINT "AddMembersTask_sourceGroupId_fkey" FOREIGN KEY ("sourceGroupId") REFERENCES "GroupTarget"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AddMembersLog" ADD CONSTRAINT "AddMembersLog_taskId_fkey" FOREIGN KEY ("taskId") REFERENCES "AddMembersTask"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AddMembersLog" ADD CONSTRAINT "AddMembersLog_accountId_fkey" FOREIGN KEY ("accountId") REFERENCES "TelegramAccount"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AuditLog" ADD CONSTRAINT "AuditLog_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AuditLog" ADD CONSTRAINT "AuditLog_orgId_fkey" FOREIGN KEY ("orgId") REFERENCES "Organization"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Notification" ADD CONSTRAINT "Notification_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PaymentReceiptRequest" ADD CONSTRAINT "PaymentReceiptRequest_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TelegramBot" ADD CONSTRAINT "TelegramBot_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TelegramBot" ADD CONSTRAINT "TelegramBot_orgId_fkey" FOREIGN KEY ("orgId") REFERENCES "Organization"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BotSubscriber" ADD CONSTRAINT "BotSubscriber_botId_fkey" FOREIGN KEY ("botId") REFERENCES "TelegramBot"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BotBroadcast" ADD CONSTRAINT "BotBroadcast_botId_fkey" FOREIGN KEY ("botId") REFERENCES "TelegramBot"("id") ON DELETE CASCADE ON UPDATE CASCADE;
