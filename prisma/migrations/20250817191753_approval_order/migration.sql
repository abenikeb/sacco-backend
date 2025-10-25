/*
  Warnings:

  - You are about to drop the column `approvalOrder` on the `LoanApprovalLog` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "public"."Loan" ADD COLUMN     "approvalOrder" INTEGER NOT NULL DEFAULT 0;

-- AlterTable
ALTER TABLE "public"."LoanApprovalLog" DROP COLUMN "approvalOrder";
