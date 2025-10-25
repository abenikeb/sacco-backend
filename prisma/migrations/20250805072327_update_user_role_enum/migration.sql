-- CreateEnum
CREATE TYPE "public"."TransactionType" AS ENUM ('SAVINGS', 'MEMBERSHIP_FEE', 'REGISTRATION_FEE', 'COST_OF_SHARE', 'LOAN_REPAYMENT', 'PURCHASE', 'WILLING_DEPOSIT');

-- CreateEnum
CREATE TYPE "public"."LoanApprovalStatus" AS ENUM ('APPROVED_BY_COMMITTEE', 'APPROVED_BY_MANAGER', 'APPROVED_BY_SUPERVISOR', 'APPROVED_BY_ACCOUNTANT', 'DISBURSED', 'REJECTED_BY_COMMITTEE', 'REJECTED', 'PENDING');

-- CreateEnum
CREATE TYPE "public"."UserRole" AS ENUM ('MEMBER', 'ACCOUNTANT', 'MANAGER', 'SUPERVISOR', 'COMMITTEE');

-- CreateEnum
CREATE TYPE "public"."RepaymentSourceType" AS ENUM ('ERP_PAYROLL', 'MANUAL_PAYMENT', 'BANK_TRANSFER');

-- CreateEnum
CREATE TYPE "public"."DocumentType" AS ENUM ('AGREEMENT', 'COLLATERAL', 'OTHER');

-- CreateEnum
CREATE TYPE "public"."NotificationType" AS ENUM ('LOAN_APPLICATION_SUBMITTED', 'LOAN_STATUS_UPDATE', 'LOAN_DISBURSEMENT_READY', 'LOAN_REPAYMENT_DUE', 'LOAN_REPAYMENT_RECEIVED', 'SAVINGS_UPDATE', 'ACCOUNT_UPDATE', 'GENERAL');

-- CreateEnum
CREATE TYPE "public"."RepaymentStatus" AS ENUM ('PENDING', 'PAID', 'OVERDUE');

-- CreateTable
CREATE TABLE "public"."Member" (
    "id" SERIAL NOT NULL,
    "memberNumber" INTEGER NOT NULL,
    "etNumber" INTEGER NOT NULL,
    "name" TEXT NOT NULL,
    "email" TEXT,
    "phone" TEXT,
    "division" TEXT,
    "department" TEXT,
    "section" TEXT,
    "group" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "userId" INTEGER,

    CONSTRAINT "Member_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."MemberHistory" (
    "id" SERIAL NOT NULL,
    "memberId" INTEGER NOT NULL,
    "changeDate" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "effectiveDate" TIMESTAMP(3) NOT NULL,
    "fieldName" TEXT NOT NULL,
    "oldValue" TEXT,
    "newValue" TEXT,

    CONSTRAINT "MemberHistory_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."MembershipRequest" (
    "id" SERIAL NOT NULL,
    "name" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "phone" TEXT NOT NULL,
    "department" TEXT NOT NULL,
    "status" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "MembershipRequest_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."MemberBalance" (
    "id" SERIAL NOT NULL,
    "memberId" INTEGER NOT NULL,
    "totalSavings" DECIMAL(65,30) NOT NULL DEFAULT 0.00,
    "totalContributions" DECIMAL(65,30) NOT NULL DEFAULT 0.00,
    "costOfShare" DECIMAL(65,30) NOT NULL DEFAULT 0.00,
    "registrationFee" DECIMAL(65,30) NOT NULL DEFAULT 0.00,
    "membershipFee" DECIMAL(65,30) NOT NULL DEFAULT 0.00,
    "willingDeposit" DECIMAL(65,30) NOT NULL DEFAULT 0.00,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "MemberBalance_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."Savings" (
    "id" SERIAL NOT NULL,
    "memberId" INTEGER NOT NULL,
    "amount" DECIMAL(65,30) NOT NULL,
    "savingsDate" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Savings_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."Transaction" (
    "id" SERIAL NOT NULL,
    "memberId" INTEGER NOT NULL,
    "type" "public"."TransactionType" NOT NULL,
    "amount" DECIMAL(65,30) NOT NULL,
    "reference" TEXT,
    "transactionDate" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Transaction_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."Loan" (
    "id" SERIAL NOT NULL,
    "memberId" INTEGER NOT NULL,
    "amount" DECIMAL(65,30) NOT NULL,
    "remainingAmount" DECIMAL(65,30),
    "interestRate" DECIMAL(65,30) NOT NULL,
    "tenureMonths" INTEGER NOT NULL,
    "status" "public"."LoanApprovalStatus" NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Loan_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."LoanRepayment" (
    "id" SERIAL NOT NULL,
    "loanId" INTEGER NOT NULL,
    "amount" DECIMAL(65,30) NOT NULL,
    "paidAmount" DECIMAL(65,30) NOT NULL DEFAULT 0,
    "repaymentDate" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "reference" TEXT,
    "sourceType" "public"."RepaymentSourceType" NOT NULL,
    "status" "public"."RepaymentStatus" NOT NULL DEFAULT 'PENDING',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "LoanRepayment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."LoanApprovalLog" (
    "id" SERIAL NOT NULL,
    "loanId" INTEGER NOT NULL,
    "approvedByUserId" INTEGER NOT NULL,
    "role" "public"."UserRole" NOT NULL,
    "status" "public"."LoanApprovalStatus" NOT NULL,
    "approvalOrder" INTEGER NOT NULL,
    "comments" TEXT,
    "approvalDate" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "LoanApprovalLog_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."LoanDocument" (
    "id" SERIAL NOT NULL,
    "loanId" INTEGER NOT NULL,
    "uploadedByUserId" INTEGER NOT NULL,
    "documentType" "public"."DocumentType" NOT NULL,
    "documentContent" BYTEA NOT NULL,
    "fileName" TEXT NOT NULL,
    "mimeType" TEXT NOT NULL,
    "documentUrl" TEXT NOT NULL,
    "uploadDate" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "LoanDocument_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."User" (
    "id" SERIAL NOT NULL,
    "name" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "phone" TEXT NOT NULL,
    "password" TEXT NOT NULL,
    "role" "public"."UserRole" NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."Notification" (
    "id" SERIAL NOT NULL,
    "userId" INTEGER NOT NULL,
    "title" TEXT NOT NULL,
    "message" TEXT NOT NULL,
    "type" "public"."NotificationType" NOT NULL,
    "read" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Notification_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Member_memberNumber_key" ON "public"."Member"("memberNumber");

-- CreateIndex
CREATE UNIQUE INDEX "Member_etNumber_key" ON "public"."Member"("etNumber");

-- CreateIndex
CREATE UNIQUE INDEX "Member_userId_key" ON "public"."Member"("userId");

-- CreateIndex
CREATE INDEX "Member_name_idx" ON "public"."Member"("name");

-- CreateIndex
CREATE INDEX "Member_division_idx" ON "public"."Member"("division");

-- CreateIndex
CREATE INDEX "Member_department_idx" ON "public"."Member"("department");

-- CreateIndex
CREATE INDEX "Member_section_idx" ON "public"."Member"("section");

-- CreateIndex
CREATE INDEX "Member_group_idx" ON "public"."Member"("group");

-- CreateIndex
CREATE UNIQUE INDEX "MemberBalance_memberId_key" ON "public"."MemberBalance"("memberId");

-- CreateIndex
CREATE INDEX "Transaction_memberId_transactionDate_idx" ON "public"."Transaction"("memberId", "transactionDate");

-- CreateIndex
CREATE INDEX "Transaction_type_transactionDate_idx" ON "public"."Transaction"("type", "transactionDate");

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "public"."User"("email");

-- CreateIndex
CREATE UNIQUE INDEX "User_phone_key" ON "public"."User"("phone");

-- AddForeignKey
ALTER TABLE "public"."Member" ADD CONSTRAINT "Member_userId_fkey" FOREIGN KEY ("userId") REFERENCES "public"."User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."MemberHistory" ADD CONSTRAINT "MemberHistory_memberId_fkey" FOREIGN KEY ("memberId") REFERENCES "public"."Member"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."MemberBalance" ADD CONSTRAINT "MemberBalance_memberId_fkey" FOREIGN KEY ("memberId") REFERENCES "public"."Member"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."Savings" ADD CONSTRAINT "Savings_memberId_fkey" FOREIGN KEY ("memberId") REFERENCES "public"."Member"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."Transaction" ADD CONSTRAINT "Transaction_memberId_fkey" FOREIGN KEY ("memberId") REFERENCES "public"."Member"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."Loan" ADD CONSTRAINT "Loan_memberId_fkey" FOREIGN KEY ("memberId") REFERENCES "public"."Member"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."LoanRepayment" ADD CONSTRAINT "LoanRepayment_loanId_fkey" FOREIGN KEY ("loanId") REFERENCES "public"."Loan"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."LoanApprovalLog" ADD CONSTRAINT "LoanApprovalLog_loanId_fkey" FOREIGN KEY ("loanId") REFERENCES "public"."Loan"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."LoanApprovalLog" ADD CONSTRAINT "LoanApprovalLog_approvedByUserId_fkey" FOREIGN KEY ("approvedByUserId") REFERENCES "public"."User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."LoanDocument" ADD CONSTRAINT "LoanDocument_loanId_fkey" FOREIGN KEY ("loanId") REFERENCES "public"."Loan"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."LoanDocument" ADD CONSTRAINT "LoanDocument_uploadedByUserId_fkey" FOREIGN KEY ("uploadedByUserId") REFERENCES "public"."User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."Notification" ADD CONSTRAINT "Notification_userId_fkey" FOREIGN KEY ("userId") REFERENCES "public"."User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
