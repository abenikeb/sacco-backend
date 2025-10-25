/*
  Warnings:

  - A unique constraint covering the columns `[etNumber]` on the table `MembershipRequest` will be added. If there are existing duplicate values, this will fail.
  - Added the required column `etNumber` to the `MembershipRequest` table without a default value. This is not possible if the table is not empty.
  - Added the required column `national_id` to the `MembershipRequest` table without a default value. This is not possible if the table is not empty.
  - Added the required column `signature` to the `MembershipRequest` table without a default value. This is not possible if the table is not empty.

*/
-- AlterEnum
ALTER TYPE "public"."LoanApprovalStatus" ADD VALUE 'REPAID';

-- AlterTable
ALTER TABLE "public"."MembershipRequest" ADD COLUMN     "approvalOrder" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "etNumber" INTEGER NOT NULL,
ADD COLUMN     "national_id" TEXT NOT NULL,
ADD COLUMN     "signature" TEXT NOT NULL;

-- CreateIndex
CREATE UNIQUE INDEX "MembershipRequest_etNumber_key" ON "public"."MembershipRequest"("etNumber");
