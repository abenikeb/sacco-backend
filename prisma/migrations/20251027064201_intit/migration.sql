/*
  Warnings:

  - Added the required column `loanProductId` to the `Loan` table without a default value. This is not possible if the table is not empty.

*/
-- CreateEnum
CREATE TYPE "public"."WithdrawalApprovalStatus" AS ENUM ('PENDING', 'APPROVED_BY_ACCOUNTANT', 'APPROVED_BY_SUPERVISOR', 'APPROVED_BY_MANAGER', 'REJECTED', 'DISBURSED');

-- CreateEnum
CREATE TYPE "public"."AccountType" AS ENUM ('ASSET', 'LIABILITY', 'EQUITY', 'INCOME', 'REVENUE', 'EXPENSE');

-- CreateEnum
CREATE TYPE "public"."JournalStatus" AS ENUM ('DRAFT', 'POSTED', 'REVERSED');

-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "public"."NotificationType" ADD VALUE 'WITHDRAWAL_APPROVAL';
ALTER TYPE "public"."NotificationType" ADD VALUE 'WITHDRAWAL_APPROVED';
ALTER TYPE "public"."NotificationType" ADD VALUE 'WITHDRAWAL_REQUEST';

-- AlterTable
ALTER TABLE "public"."Loan" ADD COLUMN     "loanProductId" INTEGER NOT NULL;

-- CreateTable
CREATE TABLE "public"."LoanProduct" (
    "id" SERIAL NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "interestRate" DECIMAL(65,30) NOT NULL DEFAULT 9.5,
    "minDurationMonths" INTEGER NOT NULL DEFAULT 1,
    "maxDurationMonths" INTEGER NOT NULL DEFAULT 120,
    "requiredSavingsPercentage" DECIMAL(65,30) NOT NULL DEFAULT 30,
    "requiredSavingsDuringLoan" DECIMAL(65,30) NOT NULL DEFAULT 35,
    "maxLoanBasedOnSalaryMonths" INTEGER NOT NULL DEFAULT 30,
    "minTotalContributions" DECIMAL(65,30) NOT NULL DEFAULT 0,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "LoanProduct_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."WithdrawalRequest" (
    "id" SERIAL NOT NULL,
    "memberId" INTEGER NOT NULL,
    "amount" DECIMAL(65,30) NOT NULL,
    "requestedAmount" DECIMAL(65,30) NOT NULL,
    "approvalStatus" "public"."WithdrawalApprovalStatus" NOT NULL DEFAULT 'PENDING',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "WithdrawalRequest_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."WithdrawalApprovalLog" (
    "id" SERIAL NOT NULL,
    "withdrawalRequestId" INTEGER NOT NULL,
    "approvedByUserId" INTEGER NOT NULL,
    "approvalLevel" TEXT NOT NULL,
    "status" "public"."WithdrawalApprovalStatus" NOT NULL,
    "remarks" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "WithdrawalApprovalLog_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."ChartOfAccounts" (
    "id" SERIAL NOT NULL,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "accountType" "public"."AccountType" NOT NULL,
    "description" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "parentAccountId" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ChartOfAccounts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."JournalEntry" (
    "id" SERIAL NOT NULL,
    "journalId" INTEGER NOT NULL DEFAULT 3,
    "entryNumber" TEXT NOT NULL,
    "entryDate" TIMESTAMP(3) NOT NULL,
    "description" TEXT NOT NULL,
    "reference" TEXT,
    "transactionId" INTEGER,
    "totalDebit" DECIMAL(65,30) NOT NULL DEFAULT 0,
    "totalCredit" DECIMAL(65,30) NOT NULL DEFAULT 0,
    "isBalanced" BOOLEAN NOT NULL DEFAULT false,
    "status" "public"."JournalStatus" NOT NULL DEFAULT 'DRAFT',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "JournalEntry_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."JournalLine" (
    "id" SERIAL NOT NULL,
    "journalEntryId" INTEGER NOT NULL,
    "accountId" INTEGER NOT NULL,
    "debit" DECIMAL(65,30) NOT NULL DEFAULT 0,
    "credit" DECIMAL(65,30) NOT NULL DEFAULT 0,
    "description" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "JournalLine_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."GeneralLedger" (
    "id" SERIAL NOT NULL,
    "accountId" INTEGER NOT NULL,
    "journalEntryId" INTEGER NOT NULL,
    "debit" DECIMAL(65,30) NOT NULL DEFAULT 0,
    "credit" DECIMAL(65,30) NOT NULL DEFAULT 0,
    "balance" DECIMAL(65,30) NOT NULL DEFAULT 0,
    "transactionDate" TIMESTAMP(3) NOT NULL,
    "description" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "GeneralLedger_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "LoanProduct_name_key" ON "public"."LoanProduct"("name");

-- CreateIndex
CREATE INDEX "LoanProduct_isActive_idx" ON "public"."LoanProduct"("isActive");

-- CreateIndex
CREATE INDEX "LoanProduct_minTotalContributions_idx" ON "public"."LoanProduct"("minTotalContributions");

-- CreateIndex
CREATE INDEX "WithdrawalRequest_memberId_idx" ON "public"."WithdrawalRequest"("memberId");

-- CreateIndex
CREATE INDEX "WithdrawalRequest_approvalStatus_idx" ON "public"."WithdrawalRequest"("approvalStatus");

-- CreateIndex
CREATE INDEX "WithdrawalRequest_createdAt_idx" ON "public"."WithdrawalRequest"("createdAt");

-- CreateIndex
CREATE INDEX "WithdrawalApprovalLog_withdrawalRequestId_idx" ON "public"."WithdrawalApprovalLog"("withdrawalRequestId");

-- CreateIndex
CREATE INDEX "WithdrawalApprovalLog_approvedByUserId_idx" ON "public"."WithdrawalApprovalLog"("approvedByUserId");

-- CreateIndex
CREATE UNIQUE INDEX "ChartOfAccounts_code_key" ON "public"."ChartOfAccounts"("code");

-- CreateIndex
CREATE INDEX "ChartOfAccounts_accountType_idx" ON "public"."ChartOfAccounts"("accountType");

-- CreateIndex
CREATE INDEX "ChartOfAccounts_isActive_idx" ON "public"."ChartOfAccounts"("isActive");

-- CreateIndex
CREATE UNIQUE INDEX "JournalEntry_entryNumber_key" ON "public"."JournalEntry"("entryNumber");

-- CreateIndex
CREATE INDEX "JournalEntry_entryDate_idx" ON "public"."JournalEntry"("entryDate");

-- CreateIndex
CREATE INDEX "JournalEntry_status_idx" ON "public"."JournalEntry"("status");

-- CreateIndex
CREATE INDEX "JournalEntry_transactionId_idx" ON "public"."JournalEntry"("transactionId");

-- CreateIndex
CREATE INDEX "JournalLine_journalEntryId_idx" ON "public"."JournalLine"("journalEntryId");

-- CreateIndex
CREATE INDEX "JournalLine_accountId_idx" ON "public"."JournalLine"("accountId");

-- CreateIndex
CREATE INDEX "GeneralLedger_accountId_transactionDate_idx" ON "public"."GeneralLedger"("accountId", "transactionDate");

-- CreateIndex
CREATE INDEX "GeneralLedger_journalEntryId_idx" ON "public"."GeneralLedger"("journalEntryId");

-- AddForeignKey
ALTER TABLE "public"."Loan" ADD CONSTRAINT "Loan_loanProductId_fkey" FOREIGN KEY ("loanProductId") REFERENCES "public"."LoanProduct"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."WithdrawalRequest" ADD CONSTRAINT "WithdrawalRequest_memberId_fkey" FOREIGN KEY ("memberId") REFERENCES "public"."Member"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."WithdrawalApprovalLog" ADD CONSTRAINT "WithdrawalApprovalLog_withdrawalRequestId_fkey" FOREIGN KEY ("withdrawalRequestId") REFERENCES "public"."WithdrawalRequest"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."WithdrawalApprovalLog" ADD CONSTRAINT "WithdrawalApprovalLog_approvedByUserId_fkey" FOREIGN KEY ("approvedByUserId") REFERENCES "public"."User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."ChartOfAccounts" ADD CONSTRAINT "ChartOfAccounts_parentAccountId_fkey" FOREIGN KEY ("parentAccountId") REFERENCES "public"."ChartOfAccounts"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."JournalEntry" ADD CONSTRAINT "JournalEntry_transactionId_fkey" FOREIGN KEY ("transactionId") REFERENCES "public"."Transaction"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."JournalLine" ADD CONSTRAINT "JournalLine_journalEntryId_fkey" FOREIGN KEY ("journalEntryId") REFERENCES "public"."JournalEntry"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."JournalLine" ADD CONSTRAINT "JournalLine_accountId_fkey" FOREIGN KEY ("accountId") REFERENCES "public"."ChartOfAccounts"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."GeneralLedger" ADD CONSTRAINT "GeneralLedger_accountId_fkey" FOREIGN KEY ("accountId") REFERENCES "public"."ChartOfAccounts"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."GeneralLedger" ADD CONSTRAINT "GeneralLedger_journalEntryId_fkey" FOREIGN KEY ("journalEntryId") REFERENCES "public"."JournalEntry"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
