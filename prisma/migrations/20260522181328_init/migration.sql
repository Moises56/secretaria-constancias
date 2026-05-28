-- CreateEnum
CREATE TYPE "Role" AS ENUM ('ADMIN', 'SECRETARY', 'VIEWER');

-- CreateEnum
CREATE TYPE "ConstanciaType" AS ENUM ('CVD', 'CVP', 'CVE');

-- CreateEnum
CREATE TYPE "ConstanciaStatus" AS ENUM ('ACTIVE', 'ANNULLED');

-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL,
    "username" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "passwordHash" TEXT NOT NULL,
    "fullName" TEXT NOT NULL,
    "role" "Role" NOT NULL DEFAULT 'SECRETARY',
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "lastLoginAt" TIMESTAMP(3),
    "securityStamp" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Signer" (
    "id" TEXT NOT NULL,
    "fullName" TEXT NOT NULL,
    "titleLine" TEXT NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "defaultForTypes" "ConstanciaType"[],
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Signer_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Constancia" (
    "id" TEXT NOT NULL,
    "type" "ConstanciaType" NOT NULL,
    "folioNumber" INTEGER NOT NULL,
    "folioYear" INTEGER NOT NULL,
    "folio" TEXT NOT NULL,
    "status" "ConstanciaStatus" NOT NULL DEFAULT 'ACTIVE',
    "applicantFullName" TEXT NOT NULL,
    "applicantIdNumber" TEXT NOT NULL,
    "paperSerial" TEXT,
    "signerName" TEXT NOT NULL,
    "signerTitleLine" TEXT NOT NULL,
    "signerIdAtIssue" TEXT NOT NULL,
    "verificationToken" TEXT NOT NULL,
    "issuedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "issuedById" TEXT NOT NULL,
    "annulledAt" TIMESTAMP(3),
    "annulledReason" TEXT,
    "annulledById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Constancia_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "FolioSequence" (
    "id" TEXT NOT NULL,
    "type" "ConstanciaType" NOT NULL,
    "year" INTEGER NOT NULL,
    "lastNumber" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "FolioSequence_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AuditLog" (
    "id" TEXT NOT NULL,
    "userId" TEXT,
    "action" TEXT NOT NULL,
    "entity" TEXT,
    "entityId" TEXT,
    "metadata" JSONB,
    "ipAddress" TEXT,
    "userAgent" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AuditLog_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "User_username_key" ON "User"("username");

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE UNIQUE INDEX "Constancia_verificationToken_key" ON "Constancia"("verificationToken");

-- CreateIndex
CREATE INDEX "Constancia_type_issuedAt_idx" ON "Constancia"("type", "issuedAt");

-- CreateIndex
CREATE INDEX "Constancia_applicantIdNumber_idx" ON "Constancia"("applicantIdNumber");

-- CreateIndex
CREATE INDEX "Constancia_status_idx" ON "Constancia"("status");

-- CreateIndex
CREATE INDEX "Constancia_issuedById_idx" ON "Constancia"("issuedById");

-- CreateIndex
CREATE UNIQUE INDEX "Constancia_type_folioYear_folioNumber_key" ON "Constancia"("type", "folioYear", "folioNumber");

-- CreateIndex
CREATE UNIQUE INDEX "FolioSequence_type_year_key" ON "FolioSequence"("type", "year");

-- CreateIndex
CREATE INDEX "AuditLog_userId_idx" ON "AuditLog"("userId");

-- CreateIndex
CREATE INDEX "AuditLog_action_idx" ON "AuditLog"("action");

-- CreateIndex
CREATE INDEX "AuditLog_createdAt_idx" ON "AuditLog"("createdAt");

-- AddForeignKey
ALTER TABLE "Constancia" ADD CONSTRAINT "Constancia_issuedById_fkey" FOREIGN KEY ("issuedById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Constancia" ADD CONSTRAINT "Constancia_annulledById_fkey" FOREIGN KEY ("annulledById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AuditLog" ADD CONSTRAINT "AuditLog_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
