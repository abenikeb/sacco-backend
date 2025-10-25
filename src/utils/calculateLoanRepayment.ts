import { prisma } from "../config/prisma";
export async function createLoanRepayments(loan: any) {
	const { id, amount, interestRate, tenureMonths } = loan;
	// const monthlyInterestRate = interestRate / 100 / 12; // this underestimates the interest since it is not suggesting any componding
	const monthlyInterestRate = Math.pow(1 + interestRate / 100, 1 / 12) - 1;

	const monthlyPayment =
		(amount *
			monthlyInterestRate *
			Math.pow(1 + monthlyInterestRate, tenureMonths)) /
		(Math.pow(1 + monthlyInterestRate, tenureMonths) - 1);

	const repayments = [];
	let remainingBalance = amount;
	const startDate = new Date();

	for (let i = 1; i <= tenureMonths; i++) {
		const interestPayment = remainingBalance * monthlyInterestRate;
		const principalPayment = monthlyPayment - interestPayment;
		remainingBalance -= principalPayment;
		const repaymentDate = new Date(
			startDate.getFullYear(),
			startDate.getMonth() + i,
			startDate.getDate()
		);

		repayments.push({
			loanId: id,
			amount: Number(monthlyPayment.toFixed(2)),
			repaymentDate,
			sourceType: "ERP_PAYROLL",
			status: "PENDING",
			reference: `Principal: ${principalPayment.toFixed(
				2
			)}, Interest: ${interestPayment.toFixed(2)}`,
		});
	}

	// Adjust the last repayment to account for any rounding errors
	const totalCalculatedAmount = repayments.reduce(
		(sum, repayment) => sum + repayment.amount,
		0
	);
	const expectedTotal = monthlyPayment * tenureMonths;
	const discrepancy = Number(
		(expectedTotal - totalCalculatedAmount).toFixed(2)
	);

	if (discrepancy !== 0) {
		const lastRepayment = repayments[repayments.length - 1];
		lastRepayment!.amount += discrepancy;

		// Update the reference to reflect the adjusted principal
		const [principalStr, interestStr] = lastRepayment!.reference.split(", ");
		const principalValue = principalStr?.split(": ")[1] ?? "0";
		const principal = parseFloat(principalValue) + discrepancy;
		lastRepayment!.reference = `Principal: ${principal.toFixed(
			2
		)}, ${interestStr}`;
	}

	await prisma.loanRepayment.createMany({
		data: repayments,
	} as any);
}
