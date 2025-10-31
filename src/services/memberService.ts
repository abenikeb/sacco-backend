import { prisma } from "@/src/config/prisma";
import { LoanApprovalStatus, TransactionType } from "@prisma/client";
import {
	createJournalEntry,
	mapToAccountingType,
} from "../utils/accountingUtils";
import { AccountingService } from "./accountingService";
const accountingService = new AccountingService();

export class MemberService {
	async importMembers(membersData = []) {
		const skipped = [];
		const failed = [];

		const importedCount = await prisma.$transaction(async (tx) => {
			let count = 0;

			for (const memberData of membersData) {
				try {
					const memberNumber = memberData["Employee Number"];
					const etNumber = memberData["ET Number"];

					if (isNaN(memberNumber) || isNaN(etNumber)) {
						skipped.push(memberData.Name);
						continue;
					}

					const jsDate = new Date(
						(memberData["Effective Date"] - 25569) * 86400 * 1000
					);

					//Upsert Member
					const member = await tx.member.upsert({
						where: { etNumber },
						update: {
							name: memberData.Name,
							division: memberData.Division,
							department: memberData.Department || null,
							section: memberData.Section,
							group: memberData.Group,
						},
						create: {
							memberNumber,
							etNumber,
							name: memberData.Name,
							division: memberData.Division,
							department: memberData.Department || null,
							section: memberData.Section,
							group: memberData.Group,
						},
					});

					//Handle Loan Repayment if applicable
					const repaymentAmount =
						memberData["Credit Association Loan Repayment"];
					if (repaymentAmount > 0) {
						await this.handleLoanRepayment(
							tx,
							member.id,
							repaymentAmount,
							jsDate,
							"ERP_PAYROLL",
							`BULK_IMPORT_${jsDate.getTime()}`
						);
					}

					//Create Transactions
					const txList = [
						["SAVINGS", memberData["Credit Association Savings"]],
						["MEMBERSHIP_FEE", memberData["Credit Association Membership Fee"]],
						[
							"REGISTRATION_FEE",
							memberData["Credit Association Registration Fee"],
						],
						["COST_OF_SHARE", memberData["Credit Association Cost of Share"]],
						["PURCHASE", memberData["Credit Association Purchases"]],
						[
							"WILLING_DEPOSIT",
							memberData["Credit Association Willing Deposit"],
						],
					]
						.filter(([_, amt]) => amt > 0)
						.map(([type, amt]) => ({
							memberId: member.id,
							type,
							amount: amt,
							transactionDate: jsDate,
						}));

					if (txList.length > 0) {
						const transactions = await tx.transaction.createMany({
							data: txList,
						});

						for (const t of txList) {
							const reference = `REF-${t.type}-${member.name}-${jsDate.toISOString().split("T")[0]}`;

							if (
								t.type === "SAVINGS" ||
								t.type === "WILLING_DEPOSIT" ||
								t.type === "REGISTRATION_FEE" ||
								t.type === "MEMBERSHIP_FEE" ||
								t.type === "COST_OF_SHARE"
							) {
								// Record as savings/deposit
								await accountingService.recordSavingsTransaction(
									member.id,
									Number(t.amount),
									jsDate,
									reference
								);
							}
						}
					}
					count++;
				} catch (err) {
					console.error(`❌ Failed to import member ${memberData.Name}:`, err);
					failed.push(memberData.Name);
				}
			}

			return count;
		});

		return { importedCount, skipped, failed };
	}

	async handleLoanRepayment(
		prismaTx,
		memberId,
		repaymentAmount,
		repaymentDate,
		sourceType,
		reference
	) {
		const activeLoan = await prismaTx.loan.findFirst({
			where: { memberId, status: LoanApprovalStatus.DISBURSED },
			include: {
				loanRepayments: {
					orderBy: { repaymentDate: "asc" },
					where: { status: "PENDING" },
				},
			},
			orderBy: { createdAt: "desc" },
		});

		if (!activeLoan) return;

		let remaining = repaymentAmount;

		for (const repayment of activeLoan.loanRepayments) {
			if (remaining <= 0) break;
			const unpaid = Number(repayment.amount) - Number(repayment.paidAmount);
			if (unpaid <= 0) continue;

			const apply = Math.min(remaining, unpaid);
			const newPaid = Number(repayment.paidAmount) + apply;
			const newStatus =
				newPaid >= Number(repayment.amount) ? "PAID" : "PENDING";

			await prismaTx.loanRepayment.update({
				where: { id: repayment.id },
				data: { paidAmount: newPaid, repaymentDate, status: newStatus },
			});

			remaining -= apply;
		}

		if (repaymentAmount > 0) {
			await prismaTx.transaction.create({
				data: {
					memberId,
					type: TransactionType.LOAN_REPAYMENT,
					amount: repaymentAmount,
					transactionDate: repaymentDate,
					reference,
				},
			});

			const currentDate = new Date().toISOString().split("T")[0];
			const interestRate = Number(activeLoan.interestRate) / 100;
			const interestAmount = repaymentAmount * interestRate;
			const principalAmount = repaymentAmount - interestAmount;

			await accountingService.recordLoanRepayment(
				memberId,
				principalAmount,
				interestAmount,
				repaymentDate,
				reference
			);
			// await createJournalEntry({
			// 	type: mapToAccountingType(TransactionType.LOAN_REPAYMENT),
			// 	amount: repaymentAmount,
			// 	interest: 50,
			// 	date: currentDate,
			// 	reference: `${TransactionType.LOAN_REPAYMENT}-${memberId}-${repaymentDate.toISOString()}`,
			// 	journalId: 3,
			// });
		}

		// Update remaining loan balance
		const totalRepaid =
			(
				await prismaTx.loanRepayment.aggregate({
					where: { loanId: activeLoan.id },
					_sum: { paidAmount: true },
				})
			)._sum.paidAmount || 0;

		const newRemaining = Number(activeLoan.amount) - Number(totalRepaid);
		await prismaTx.loan.update({
			where: { id: activeLoan.id },
			data: {
				remainingAmount: newRemaining,
				...(newRemaining <= 0 && { status: LoanApprovalStatus.REPAID }),
			},
		});
	}
}
