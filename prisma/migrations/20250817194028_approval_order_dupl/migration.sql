/*
  Warnings:

  - You are about to drop the column `approvalOrder` on the `Loan` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "public"."Loan" DROP COLUMN "approvalOrder",
ADD COLUMN     "order" INTEGER NOT NULL DEFAULT 0;

-- AlterTable
ALTER TABLE "public"."LoanApprovalLog" ADD COLUMN     "approvalOrder" INTEGER NOT NULL DEFAULT 0;
