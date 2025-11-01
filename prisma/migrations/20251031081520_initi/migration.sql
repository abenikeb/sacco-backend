/*
  Warnings:

  - A unique constraint covering the columns `[reference]` on the table `LoanRepayment` will be added. If there are existing duplicate values, this will fail.

*/
-- CreateEnum
CREATE TYPE "public"."PermissionAction" AS ENUM ('VIEW', 'READ', 'CREATE', 'UPDATE', 'DELETE', 'APPROVE', 'REJECT');

-- CreateEnum
CREATE TYPE "public"."PermissionResource" AS ENUM ('MEMBERS', 'LOANS', 'SAVINGS', 'TRANSACTIONS', 'ACCOUNTING', 'REPORTS', 'USERS', 'ROLES', 'SETTINGS', 'WITHDRAWALS', 'LOAN_PRODUCTS', 'AUDIT_LOGS');

-- AlterTable
ALTER TABLE "public"."User" ADD COLUMN     "roleId" INTEGER,
ALTER COLUMN "role" SET DEFAULT 'MEMBER';

-- CreateTable
CREATE TABLE "public"."Permission" (
    "id" SERIAL NOT NULL,
    "resource" "public"."PermissionResource" NOT NULL,
    "action" "public"."PermissionAction" NOT NULL,
    "description" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Permission_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."Role" (
    "id" SERIAL NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Role_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."RolePermission" (
    "id" SERIAL NOT NULL,
    "roleId" INTEGER NOT NULL,
    "permissionId" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "RolePermission_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."SystemConfiguration" (
    "id" SERIAL NOT NULL,
    "organizationName" TEXT NOT NULL DEFAULT 'Microfinance Institution',
    "organizationLogo" TEXT,
    "currency" TEXT NOT NULL DEFAULT 'ETB',
    "fiscalYearStart" TEXT NOT NULL DEFAULT '01-01',
    "maxLoanAmount" DECIMAL(65,30) NOT NULL DEFAULT 100000,
    "minSavingsPercentage" INTEGER NOT NULL DEFAULT 30,
    "interestCalculationMethod" TEXT NOT NULL DEFAULT 'SIMPLE',
    "loanApprovalLevels" TEXT NOT NULL DEFAULT 'ACCOUNTANT,SUPERVISOR,MANAGER',
    "withdrawalApprovalLevels" TEXT NOT NULL DEFAULT 'ACCOUNTANT,SUPERVISOR,MANAGER',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SystemConfiguration_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Permission_resource_idx" ON "public"."Permission"("resource");

-- CreateIndex
CREATE UNIQUE INDEX "Permission_resource_action_key" ON "public"."Permission"("resource", "action");

-- CreateIndex
CREATE UNIQUE INDEX "Role_name_key" ON "public"."Role"("name");

-- CreateIndex
CREATE INDEX "Role_isActive_idx" ON "public"."Role"("isActive");

-- CreateIndex
CREATE INDEX "RolePermission_roleId_idx" ON "public"."RolePermission"("roleId");

-- CreateIndex
CREATE INDEX "RolePermission_permissionId_idx" ON "public"."RolePermission"("permissionId");

-- CreateIndex
CREATE UNIQUE INDEX "RolePermission_roleId_permissionId_key" ON "public"."RolePermission"("roleId", "permissionId");

-- CreateIndex
CREATE UNIQUE INDEX "LoanRepayment_reference_key" ON "public"."LoanRepayment"("reference");

-- AddForeignKey
ALTER TABLE "public"."User" ADD CONSTRAINT "User_roleId_fkey" FOREIGN KEY ("roleId") REFERENCES "public"."Role"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."RolePermission" ADD CONSTRAINT "RolePermission_roleId_fkey" FOREIGN KEY ("roleId") REFERENCES "public"."Role"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."RolePermission" ADD CONSTRAINT "RolePermission_permissionId_fkey" FOREIGN KEY ("permissionId") REFERENCES "public"."Permission"("id") ON DELETE CASCADE ON UPDATE CASCADE;
