CREATE TABLE IF NOT EXISTS "User" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "email" TEXT NOT NULL,
  "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS "Project" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "name" TEXT NOT NULL,
  "slug" TEXT NOT NULL,
  "stagingUrl" TEXT,
  "productionUrl" TEXT NOT NULL,
  "monitoringActive" BOOLEAN NOT NULL DEFAULT true,
  "monitoringIntervalMinutes" INTEGER NOT NULL DEFAULT 360,
  "notifyOnCompletion" BOOLEAN NOT NULL DEFAULT true,
  "status" TEXT NOT NULL DEFAULT 'HEALTHY',
  "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" DATETIME NOT NULL,
  "lastRunAt" DATETIME,
  "performanceScore" INTEGER,
  "healthScore" INTEGER NOT NULL DEFAULT 100,
  "userId" TEXT NOT NULL,
  CONSTRAINT "Project_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE TABLE IF NOT EXISTS "QaRun" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "projectId" TEXT NOT NULL,
  "environment" TEXT NOT NULL,
  "status" TEXT NOT NULL,
  "startedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "completedAt" DATETIME,
  "performanceScore" INTEGER,
  "seoScore" INTEGER,
  "accessibility" INTEGER,
  "payload" JSON NOT NULL,
  CONSTRAINT "QaRun_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE TABLE IF NOT EXISTS "UptimeLog" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "projectId" TEXT NOT NULL,
  "environment" TEXT NOT NULL,
  "isUp" BOOLEAN NOT NULL,
  "statusCode" INTEGER,
  "responseMs" INTEGER,
  "checkedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "errorDetails" TEXT,
  CONSTRAINT "UptimeLog_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE TABLE IF NOT EXISTS "ErrorLog" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "projectId" TEXT NOT NULL,
  "environment" TEXT NOT NULL,
  "source" TEXT NOT NULL,
  "severity" TEXT NOT NULL,
  "message" TEXT NOT NULL,
  "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "ErrorLog_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE TABLE IF NOT EXISTS "AlertSettings" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "userId" TEXT NOT NULL,
  "alertEmail" TEXT NOT NULL,
  "smtpHost" TEXT NOT NULL,
  "smtpPort" INTEGER NOT NULL,
  "smtpSecure" BOOLEAN NOT NULL DEFAULT true,
  "smtpUser" TEXT NOT NULL,
  "smtpPassword" TEXT NOT NULL,
  "downtimeAlerts" BOOLEAN NOT NULL DEFAULT true,
  "qaFailureAlerts" BOOLEAN NOT NULL DEFAULT true,
  "performanceThreshold" INTEGER NOT NULL DEFAULT 80,
  "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" DATETIME NOT NULL,
  CONSTRAINT "AlertSettings_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE TABLE IF NOT EXISTS "LighthouseReport" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "projectId" TEXT NOT NULL,
  "environment" TEXT NOT NULL,
  "performanceScore" INTEGER NOT NULL,
  "seoScore" INTEGER NOT NULL,
  "accessibilityScore" INTEGER NOT NULL,
  "bestPracticesScore" INTEGER NOT NULL,
  "reportPath" TEXT NOT NULL,
  "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "LighthouseReport_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE UNIQUE INDEX IF NOT EXISTS "User_email_key" ON "User"("email");
CREATE UNIQUE INDEX IF NOT EXISTS "Project_slug_key" ON "Project"("slug");
CREATE INDEX IF NOT EXISTS "Project_userId_createdAt_idx" ON "Project"("userId", "createdAt");
CREATE INDEX IF NOT EXISTS "Project_monitoringActive_status_idx" ON "Project"("monitoringActive", "status");
CREATE INDEX IF NOT EXISTS "QaRun_projectId_startedAt_idx" ON "QaRun"("projectId", "startedAt");
CREATE INDEX IF NOT EXISTS "UptimeLog_projectId_checkedAt_idx" ON "UptimeLog"("projectId", "checkedAt");
CREATE UNIQUE INDEX IF NOT EXISTS "AlertSettings_userId_key" ON "AlertSettings"("userId");
CREATE INDEX IF NOT EXISTS "LighthouseReport_projectId_createdAt_idx" ON "LighthouseReport"("projectId", "createdAt");
