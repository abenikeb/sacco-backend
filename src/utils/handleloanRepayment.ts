import { LoanApprovalStatus, TransactionType } from "@prisma/client";
import { createJournalEntry, mapToAccountingType } from "./createJournal";

export async function handleLoanRepayment(
	prisma: any,
	memberId: number,
	repaymentAmount: number,
	repaymentDate: Date,
	sourceType: string = "ERP_PAYROLL", // default sourceType
	reference?: string
) {
	const activeLoan = await prisma.loan.findFirst({
		where: {
			memberId,
			status: LoanApprovalStatus.DISBURSED,
		},
		include: {
			loanRepayments: {
				orderBy: { repaymentDate: "asc" },
				where: { status: "PENDING" },
			},
		},
		orderBy: { createdAt: "desc" },
	});

	if (!activeLoan) {
		console.log("No active loan found for the member");
		return;
		// continue;
		// throw new Error("No active loan found for the member");
	}
	console.log({
		activeLoan,
		loanRepayments: activeLoan.loanRepayments,
	});

	let remainingAmount = repaymentAmount;

	console.log({
		remainingAmount,
	});

	for (const repayment of activeLoan.loanRepayments) {
		if (remainingAmount <= 0) break;

		const unpaidPortion =
			Number(repayment.amount) - Number(repayment.paidAmount);

		if (unpaidPortion <= 0) continue;

		console.log({
			unpaidPortion,
		});

		const amountToApply = Math.min(remainingAmount, unpaidPortion);

		if (amountToApply <= 0) continue;

		const newPaidAmount = Number(repayment.paidAmount) + amountToApply;
		const newStatus =
			newPaidAmount >= Number(repayment.amount) ? "PAID" : "PENDING";

		console.log({
			newPaidAmount,
			newStatus,
		});

		await prisma.loanRepayment.update({
			where: { id: repayment.id },
			data: {
				paidAmount: newPaidAmount,
				repaymentDate,
				status: newStatus,
			},
		});

		remainingAmount -= amountToApply;
	}

	console.log({
		repaymentAmount,
	});

	// Record the actual LoanPayment
	// if (repaymentAmount > 0) {
	// 	await prisma.loanPayment.create({
	// 		data: {
	// 			loanId: activeLoan.id,
	// 			memberId,
	// 			amount: repaymentAmount,
	// 			paymentDate: repaymentDate,
	// 			sourceType,
	// 			reference,
	// 		},
	// 	});
	// }

	// Create transaction log
	if (repaymentAmount > 0) {
		await prisma.transaction.create({
			data: {
				memberId,
				type: TransactionType.LOAN_REPAYMENT,
				amount: repaymentAmount,
				transactionDate: repaymentDate,
				reference,
			},
		});

		const currentDate = new Date().toISOString().split("T")[0];

		await createJournalEntry({
			type: mapToAccountingType(
				TransactionType.LOAN_REPAYMENT as TransactionType
			),
			amount: repaymentAmount,
			interest: 50,
			date: currentDate,
			reference: `${
				TransactionType.LOAN_REPAYMENT
			}-${memberId}-${repaymentDate.toISOString()}`,
			journalId: 3,
		});
	}

	// Recalculate remaining loan balance
	const totalRepaidResult = await prisma.loanRepayment.aggregate({
		where: { loanId: activeLoan.id },
		_sum: { paidAmount: true },
	});

	const totalRepaid = totalRepaidResult._sum.paidAmount || 0;
	const newRemaining = Number(activeLoan.amount) - Number(totalRepaid);

	console.log({
		totalRepaidResult,
		totalRepaid,
		newRemaining,
	});

	await prisma.loan.update({
		where: { id: activeLoan.id },
		data: {
			remainingAmount: newRemaining,
		},
	});

	if (newRemaining <= 0) {
		await prisma.loan.update({
			where: { id: activeLoan.id },
			data: {
				status: LoanApprovalStatus.REPAID,
			},
		});
	}
}
