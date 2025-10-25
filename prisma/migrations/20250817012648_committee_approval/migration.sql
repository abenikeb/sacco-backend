/*
  Warnings:

  - The values [APPROVED_BY_COMMITTEE,APPROVED_BY_MANAGER,APPROVED_BY_SUPERVISOR,APPROVED_BY_ACCOUNTANT,REJECTED_BY_COMMITTEE] on the enum `LoanApprovalStatus` will be removed. If these variants are still used in the database, this will fail.

*/
-- AlterEnum
BEGIN;
CREATE TYPE "public"."LoanApprovalStatus_new" AS ENUM ('APPROVED', 'DISBURSED', 'REPAID', 'REJECTED', 'PENDING');
ALTER TABLE "public"."Loan" ALTER COLUMN "status" TYPE "public"."LoanApprovalStatus_new" USING ("status"::text::"public"."LoanApprovalStatus_new");
ALTER TABLE "public"."LoanApprovalLog" ALTER COLUMN "status" TYPE "public"."LoanApprovalStatus_new" USING ("status"::text::"public"."LoanApprovalStatus_new");
ALTER TYPE "public"."LoanApprovalStatus" RENAME TO "LoanApprovalStatus_old";
ALTER TYPE "public"."LoanApprovalStatus_new" RENAME TO "LoanApprovalStatus";
DROP TYPE "public"."LoanApprovalStatus_old";
COMMIT;

-- AlterTable
ALTER TABLE "public"."LoanApprovalLog" ADD COLUMN     "committeeApproval" INTEGER NOT NULL DEFAULT 0;
