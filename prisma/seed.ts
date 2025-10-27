import {
	PrismaClient,
	UserRole,
	TransactionType,
	LoanApprovalStatus,
	RepaymentSourceType,
	DocumentType,
	RepaymentStatus,
	NotificationType,
	AccountType,
} from "@prisma/client";
import { hashSync } from "bcryptjs";

const prisma = new PrismaClient();

async function main() {
	console.log("🌱 Seeding database...");

	console.log("📊 Seeding Chart of Accounts...");
	const chartOfAccounts = await prisma.chartOfAccounts.createMany({
		data: [
			// ASSET ACCOUNTS (1000-1999)
			{
				code: "1010",
				name: "Cash on Hand",
				accountType: AccountType.ASSET,

				isActive: true,
			},
			{
				code: "1020",
				name: "Bank Account - Primary",
				accountType: AccountType.ASSET,

				isActive: true,
			},
			{
				code: "1030",
				name: "Bank Account - Savings",
				accountType: AccountType.ASSET,

				isActive: true,
			},
			{
				code: "1100",
				name: "Loans Receivable - Members",
				accountType: AccountType.ASSET,

				isActive: true,
			},
			{
				code: "1110",
				name: "Interest Receivable",
				accountType: AccountType.ASSET,

				isActive: true,
			},
			{
				code: "1200",
				name: "Member Deposits",
				accountType: AccountType.ASSET,

				isActive: true,
			},
			{
				code: "1210",
				name: "Member Savings",
				accountType: AccountType.ASSET,

				isActive: true,
			},
			{
				code: "1300",
				name: "Prepaid Expenses",
				accountType: AccountType.ASSET,

				isActive: true,
			},
			{
				code: "1500",
				name: "Fixed Assets",
				accountType: AccountType.ASSET,

				isActive: true,
			},
			{
				code: "1510",
				name: "Accumulated Depreciation",
				accountType: AccountType.ASSET,

				isActive: true,
			},

			// LIABILITY ACCOUNTS (2000-2999)
			{
				code: "2010",
				name: "Accounts Payable",
				accountType: AccountType.LIABILITY,

				isActive: true,
			},
			{
				code: "2020",
				name: "Member Savings Liability",
				accountType: AccountType.LIABILITY,

				isActive: true,
			},
			{
				code: "2030",
				name: "Interest Payable",
				accountType: AccountType.LIABILITY,

				isActive: true,
			},
			{
				code: "2040",
				name: "Fees Payable",
				accountType: AccountType.LIABILITY,

				isActive: true,
			},
			{
				code: "2100",
				name: "Short-Term Loans Payable",
				accountType: AccountType.LIABILITY,

				isActive: true,
			},
			{
				code: "2200",
				name: "Long-Term Loans Payable",
				accountType: AccountType.LIABILITY,

				isActive: true,
			},

			// EQUITY ACCOUNTS (3000-3999)
			{
				code: "3010",
				name: "Member Capital",
				accountType: AccountType.EQUITY,

				isActive: true,
			},
			{
				code: "3020",
				name: "Share Capital",
				accountType: AccountType.EQUITY,

				isActive: true,
			},
			{
				code: "3030",
				name: "Retained Earnings",
				accountType: AccountType.EQUITY,

				isActive: true,
			},
			{
				code: "3040",
				name: "General Reserve",
				accountType: AccountType.EQUITY,

				isActive: true,
			},

			// REVENUE ACCOUNTS (4000-4999)
			{
				code: "4010",
				name: "Interest Income - Loans",
				accountType: AccountType.EQUITY,

				isActive: true,
			},
			{
				code: "4020",
				name: "Interest Income - Savings",
				accountType: AccountType.EQUITY,

				isActive: true,
			},
			{
				code: "4100",
				name: "Membership Fees",
				accountType: AccountType.EQUITY,

				isActive: true,
			},
			{
				code: "4110",
				name: "Registration Fees",
				accountType: AccountType.EQUITY,

				isActive: true,
			},
			{
				code: "4120",
				name: "Loan Processing Fees",
				accountType: AccountType.EQUITY,

				isActive: true,
			},
			{
				code: "4130",
				name: "Late Payment Penalties",
				accountType: AccountType.EQUITY,

				isActive: true,
			},
			{
				code: "4200",
				name: "Other Income",
				accountType: AccountType.EQUITY,

				isActive: true,
			},

			// EXPENSE ACCOUNTS (5000-5999)
			{
				code: "5010",
				name: "Salaries & Wages",
				accountType: AccountType.EXPENSE,

				isActive: true,
			},
			{
				code: "5020",
				name: "Employee Benefits",
				accountType: AccountType.EXPENSE,

				isActive: true,
			},
			{
				code: "5100",
				name: "Office Rent",
				accountType: AccountType.EXPENSE,

				isActive: true,
			},
			{
				code: "5110",
				name: "Utilities",
				accountType: AccountType.EXPENSE,

				isActive: true,
			},
			{
				code: "5120",
				name: "Office Supplies",
				accountType: AccountType.EXPENSE,

				isActive: true,
			},
			{
				code: "5200",
				name: "Depreciation Expense",
				accountType: AccountType.EXPENSE,

				isActive: true,
			},
			{
				code: "5300",
				name: "Bad Debt Expense",
				accountType: AccountType.EXPENSE,

				isActive: true,
			},
			{
				code: "5400",
				name: "Loan Loss Provision",
				accountType: AccountType.EXPENSE,

				isActive: true,
			},
			{
				code: "5500",
				name: "Training & Development",
				accountType: AccountType.EXPENSE,

				isActive: true,
			},
			{
				code: "5600",
				name: "Professional Fees",
				accountType: AccountType.EXPENSE,

				isActive: true,
			},
			{
				code: "5700",
				name: "Audit Fees",
				accountType: AccountType.EXPENSE,
				isActive: true,
			},
			{
				code: "5800",
				name: "Insurance",
				accountType: AccountType.EXPENSE,

				isActive: true,
			},
			{
				code: "5900",
				name: "Miscellaneous Expenses",
				accountType: AccountType.EXPENSE,

				isActive: true,
			},
		],
	});

	console.log(`✅ Created ${chartOfAccounts.count} Chart of Accounts entries`);

	// Create Users
	const users = await prisma.user.createMany({
		data: [
			{
				name: "Yohans Manager",
				email: "manager@coop.com",
				phone: "0911000001",
				password: hashSync("password123", 10),
				role: UserRole.MANAGER,
			},
			{
				name: "Sarah Accountant",
				email: "accountant@coop.com",
				phone: "0911000002",
				password: hashSync("password123", 10),
				role: UserRole.ACCOUNTANT,
			},
			{
				name: "Daniel Member",
				email: "daniel.member@coop.com",
				phone: "0911000003",
				password: hashSync("password123", 10),
				role: UserRole.MEMBER,
			},
			{
				name: "Alex Supervisor",
				email: "alex.supervisor@coop.com",
				phone: "0911000009",
				password: hashSync("password123", 10),
				role: UserRole.SUPERVISOR,
			},
			{
				name: "Abebe Committee",
				email: "abebe.committee@coop.com",
				phone: "0911000005",
				password: hashSync("password123", 10),
				role: UserRole.COMMITTEE,
			},
		],
	});

	const manager = await prisma.user.findFirst({
		where: { role: UserRole.MANAGER },
	});
	const accountant = await prisma.user.findFirst({
		where: { role: UserRole.ACCOUNTANT },
	});
	const memberUser = await prisma.user.findFirst({
		where: { role: UserRole.MEMBER },
	});
	const supervisor = await prisma.user.findFirst({
		where: { role: UserRole.SUPERVISOR },
	});
	const committee = await prisma.user.findFirst({
		where: { role: UserRole.COMMITTEE },
	});

	// --- Create Loan Products ---
	await prisma.loanProduct.createMany({
		data: [
			{
				name: "Short-Term Loan",
				description:
					"Quick access loan for short-term needs. Ideal for immediate financial requirements.",
				interestRate: 9.5,
				minDurationMonths: 1,
				maxDurationMonths: 24,
				minTotalContributions: 32000,
				requiredSavingsPercentage: 30,
				requiredSavingsDuringLoan: 35,
				maxLoanBasedOnSalaryMonths: 30,
				isActive: true,
			},
			{
				name: "Medium-Term Loan",
				description:
					"Balanced loan product for medium-term financial planning and investments.",
				interestRate: 9.5,
				minDurationMonths: 25,
				maxDurationMonths: 60,
				minTotalContributions: 62000,

				requiredSavingsPercentage: 30,
				requiredSavingsDuringLoan: 35,
				maxLoanBasedOnSalaryMonths: 30,
				isActive: true,
			},
			{
				name: "Long-Term Loan",
				description:
					"Extended loan tenure for major investments and long-term financial goals.",
				interestRate: 9.5,
				minDurationMonths: 61,
				maxDurationMonths: 120,
				minTotalContributions: 132000,

				requiredSavingsPercentage: 30,
				requiredSavingsDuringLoan: 35,
				maxLoanBasedOnSalaryMonths: 30,
				isActive: true,
			},
			{
				name: "Business Loan",
				description:
					"Specialized loan product for business expansion and entrepreneurial ventures.",
				interestRate: 9.5,
				minDurationMonths: 12,
				minTotalContributions: 332000,
				maxDurationMonths: 120,
				requiredSavingsPercentage: 35,
				requiredSavingsDuringLoan: 40,
				maxLoanBasedOnSalaryMonths: 36,
				isActive: true,
			},
		],
	});

	const shortTermLoanProduct = await prisma.loanProduct.findFirst({
		where: { name: "Short-Term Loan" },
	});

	// Create Member safely (omit userId if undefined)
	const member = await prisma.member.create({
		data: {
			memberNumber: 1001,
			etNumber: 5001,
			name: "Daniel Member",
			email: "daniel.member@coop.com",
			phone: "0911000003",
			division: "Finance",
			department: "Accounts",
			section: "Payroll",
			group: "A",
			salary: 15000,
			...(memberUser?.id ? { userId: memberUser.id } : {}),
			balance: {
				create: {
					totalSavings: 2000.0,
					totalContributions: 1500.0,
					costOfShare: 500.0,
					registrationFee: 200.0,
					membershipFee: 100.0,
					willingDeposit: 800.0,
				},
			},
		},
	});

	// Add Member History
	await prisma.memberHistory.create({
		data: {
			memberId: member.id,
			effectiveDate: new Date(),
			fieldName: "department",
			oldValue: "Finance",
			newValue: "Operations",
		},
	});

	// Add Savings
	await prisma.savings.createMany({
		data: [
			{
				memberId: member.id,
				amount: 1000.0,
			},
			{
				memberId: member.id,
				amount: 500.0,
			},
		],
	});

	// Add Transactions
	await prisma.transaction.createMany({
		data: [
			{
				memberId: member.id,
				type: TransactionType.SAVINGS,
				amount: 1000.0,
				reference: "TXN-001",
			},
			{
				memberId: member.id,
				type: TransactionType.MEMBERSHIP_FEE,
				amount: 100.0,
				reference: "TXN-002",
			},
		],
	});

	// --- Create Loan linked to Loan Product ---
	const loan = await prisma.loan.create({
		data: {
			memberId: member.id,
			loanProductId: shortTermLoanProduct!.id,
			amount: 5000.0,
			remainingAmount: 5000.0,
			interestRate: 10.0,
			tenureMonths: 3,
			status: LoanApprovalStatus.PENDING,
		},
	});

	// Add Loan Approval Log
	await prisma.loanApprovalLog.create({
		data: {
			loanId: loan.id,
			approvedByUserId: manager!.id,
			role: UserRole.MANAGER,
			status: LoanApprovalStatus.APPROVED,
			comments: "Initial approval granted.",
			approvalOrder: 1,
			committeeApproval: 1,
		},
	});

	// Add Loan Repayment
	await prisma.loanRepayment.create({
		data: {
			loanId: loan.id,
			amount: 2000.0,
			paidAmount: 0.0,
			sourceType: RepaymentSourceType.ERP_PAYROLL,
			status: RepaymentStatus.PENDING,
		},
	});

	// Add Loan Document
	await prisma.loanDocument.create({
		data: {
			loanId: loan.id,
			uploadedByUserId: accountant!.id,
			documentType: DocumentType.AGREEMENT,
			documentContent: Buffer.from("This is a loan agreement document."),
			fileName: "loan_agreement.pdf",
			mimeType: "application/pdf",
			documentUrl: "https://example.com/docs/loan_agreement.pdf",
		},
	});

	// Add Notifications
	await prisma.notification.createMany({
		data: [
			{
				userId: memberUser!.id,
				title: "Loan Application Submitted",
				message: "Your loan request has been submitted successfully.",
				type: NotificationType.LOAN_APPLICATION_SUBMITTED,
			},
			{
				userId: memberUser!.id,
				title: "Savings Updated",
				message: "Your savings account was credited with 500.00 ETB.",
				type: NotificationType.SAVINGS_UPDATE,
			},
		],
	});

	console.log("✅ Seeding completed.");
}

main()
	.catch((e) => {
		console.error("❌ Error seeding data:", e);
		process.exit(1);
	})
	.finally(async () => {
		await prisma.$disconnect();
	});
// import {
// 	PrismaClient,
// 	UserRole,
// 	TransactionType,
// 	LoanApprovalStatus,
// 	RepaymentSourceType,
// 	DocumentType,
// 	RepaymentStatus,
// 	NotificationType,
// } from "@prisma/client";
// import { hashSync } from "bcryptjs";

// const prisma = new PrismaClient();

// async function main() {
// 	console.log("🌱 Seeding database...");

// 	// Create Users
// 	const users = await prisma.user.createMany({
// 		data: [
// 			{
// 				name: "Yohans Manager",
// 				email: "manager@coop.com",
// 				phone: "0911000001",
// 				password: hashSync("password123", 10),
// 				role: UserRole.MANAGER,
// 			},
// 			{
// 				name: "Sarah Accountant",
// 				email: "accountant@coop.com",
// 				phone: "0911000002",
// 				password: hashSync("password123", 10),
// 				role: UserRole.ACCOUNTANT,
// 			},
// 			{
// 				name: "Daniel Member",
// 				email: "daniel.member@coop.com",
// 				phone: "0911000003",
// 				password: hashSync("password123", 10),
// 				role: UserRole.MEMBER,
// 			},
// 			{
// 				name: "Alex Supervisor",
// 				email: "alex.supervisor@coop.com",
// 				phone: "0911000009",
// 				password: hashSync("password123", 10),
// 				role: UserRole.SUPERVISOR,
// 			},
// 			{
// 				name: "Abebe Committee",
// 				email: "abebe.committee@coop.com",
// 				phone: "0911000005",
// 				password: hashSync("password123", 10),
// 				role: UserRole.COMMITTEE,
// 			},
// 		],
// 	});

// 	const manager = await prisma.user.findFirst({
// 		where: { role: UserRole.MANAGER },
// 	});
// 	const accountant = await prisma.user.findFirst({
// 		where: { role: UserRole.ACCOUNTANT },
// 	});
// 	const memberUser = await prisma.user.findFirst({
// 		where: { role: UserRole.MEMBER },
// 	});
// 	const supervisor = await prisma.user.findFirst({
// 		where: { role: UserRole.SUPERVISOR },
// 	});
// 	const committee = await prisma.user.findFirst({
// 		where: { role: UserRole.COMMITTEE },
// 	});

// 	// --- Create Loan Products ---
// 	await prisma.loanProduct.createMany({
// 		data: [
// 			{
// 				name: "Short-Term Loan",
// 				description:
// 					"Quick access loan for short-term needs. Ideal for immediate financial requirements.",
// 				interestRate: 9.5,
// 				minDurationMonths: 1,
// 				maxDurationMonths: 24,
// 				minTotalContributions: 32000,
// 				requiredSavingsPercentage: 30,
// 				requiredSavingsDuringLoan: 35,
// 				maxLoanBasedOnSalaryMonths: 30,
// 				isActive: true,
// 			},
// 			{
// 				name: "Medium-Term Loan",
// 				description:
// 					"Balanced loan product for medium-term financial planning and investments.",
// 				interestRate: 9.5,
// 				minDurationMonths: 25,
// 				maxDurationMonths: 60,
// 				minTotalContributions: 62000,

// 				requiredSavingsPercentage: 30,
// 				requiredSavingsDuringLoan: 35,
// 				maxLoanBasedOnSalaryMonths: 30,
// 				isActive: true,
// 			},
// 			{
// 				name: "Long-Term Loan",
// 				description:
// 					"Extended loan tenure for major investments and long-term financial goals.",
// 				interestRate: 9.5,
// 				minDurationMonths: 61,
// 				maxDurationMonths: 120,
// 				minTotalContributions: 132000,

// 				requiredSavingsPercentage: 30,
// 				requiredSavingsDuringLoan: 35,
// 				maxLoanBasedOnSalaryMonths: 30,
// 				isActive: true,
// 			},
// 			{
// 				name: "Business Loan",
// 				description:
// 					"Specialized loan product for business expansion and entrepreneurial ventures.",
// 				interestRate: 9.5,
// 				minDurationMonths: 12,
// 				minTotalContributions: 332000,
// 				maxDurationMonths: 120,
// 				requiredSavingsPercentage: 35,
// 				requiredSavingsDuringLoan: 40,
// 				maxLoanBasedOnSalaryMonths: 36,
// 				isActive: true,
// 			},
// 		],
// 	});

// 	const shortTermLoanProduct = await prisma.loanProduct.findFirst({
// 		where: { name: "Short-Term Loan" },
// 	});

// 	// Create Member safely (omit userId if undefined)
// 	const member = await prisma.member.create({
// 		data: {
// 			memberNumber: 1001,
// 			etNumber: 5001,
// 			name: "Daniel Member",
// 			email: "daniel.member@coop.com",
// 			phone: "0911000003",
// 			division: "Finance",
// 			department: "Accounts",
// 			section: "Payroll",
// 			group: "A",
// 			salary: 15000,
// 			...(memberUser?.id
// 				? { userId: memberUser.id } // ✅ only include userId if it's defined
// 				: {}),
// 			balance: {
// 				create: {
// 					totalSavings: 2000.0,
// 					totalContributions: 1500.0,
// 					costOfShare: 500.0,
// 					registrationFee: 200.0,
// 					membershipFee: 100.0,
// 					willingDeposit: 800.0,
// 				},
// 			},
// 		},
// 	});

// 	// Add Member History
// 	await prisma.memberHistory.create({
// 		data: {
// 			memberId: member.id,
// 			effectiveDate: new Date(),
// 			fieldName: "department",
// 			oldValue: "Finance",
// 			newValue: "Operations",
// 		},
// 	});

// 	// Add Savings
// 	await prisma.savings.createMany({
// 		data: [
// 			{
// 				memberId: member.id,
// 				amount: 1000.0,
// 			},
// 			{
// 				memberId: member.id,
// 				amount: 500.0,
// 			},
// 		],
// 	});

// 	// Add Transactions
// 	await prisma.transaction.createMany({
// 		data: [
// 			{
// 				memberId: member.id,
// 				type: TransactionType.SAVINGS,
// 				amount: 1000.0,
// 				reference: "TXN-001",
// 			},
// 			{
// 				memberId: member.id,
// 				type: TransactionType.MEMBERSHIP_FEE,
// 				amount: 100.0,
// 				reference: "TXN-002",
// 			},
// 		],
// 	});

// 	// --- Create Loan linked to Loan Product ---
// 	const loan = await prisma.loan.create({
// 		data: {
// 			memberId: member.id,
// 			loanProductId: shortTermLoanProduct!.id,
// 			amount: 5000.0,
// 			remainingAmount: 5000.0,
// 			interestRate: 10.0,
// 			tenureMonths: 3,
// 			status: LoanApprovalStatus.PENDING,
// 		},
// 	});

// 	// Add Loan Approval Log
// 	await prisma.loanApprovalLog.create({
// 		data: {
// 			loanId: loan.id,
// 			approvedByUserId: manager!.id,
// 			role: UserRole.MANAGER,
// 			status: LoanApprovalStatus.APPROVED,
// 			comments: "Initial approval granted.",
// 			approvalOrder: 1,
// 			committeeApproval: 1,
// 		},
// 	});

// 	// Add Loan Repayment
// 	await prisma.loanRepayment.create({
// 		data: {
// 			loanId: loan.id,
// 			amount: 2000.0,
// 			paidAmount: 0.0,
// 			sourceType: RepaymentSourceType.ERP_PAYROLL,
// 			status: RepaymentStatus.PENDING,
// 		},
// 	});

// 	// Add Loan Document
// 	await prisma.loanDocument.create({
// 		data: {
// 			loanId: loan.id,
// 			uploadedByUserId: accountant!.id,
// 			documentType: DocumentType.AGREEMENT,
// 			documentContent: Buffer.from("This is a loan agreement document."),
// 			fileName: "loan_agreement.pdf",
// 			mimeType: "application/pdf",
// 			documentUrl: "https://example.com/docs/loan_agreement.pdf",
// 		},
// 	});

// 	// Add Notifications
// 	await prisma.notification.createMany({
// 		data: [
// 			{
// 				userId: memberUser!.id,
// 				title: "Loan Application Submitted",
// 				message: "Your loan request has been submitted successfully.",
// 				type: NotificationType.LOAN_APPLICATION_SUBMITTED,
// 			},
// 			{
// 				userId: memberUser!.id,
// 				title: "Savings Updated",
// 				message: "Your savings account was credited with 500.00 ETB.",
// 				type: NotificationType.SAVINGS_UPDATE,
// 			},
// 		],
// 	});

// 	console.log("✅ Seeding completed.");
// }

// main()
// 	.catch((e) => {
// 		console.error("❌ Error seeding data:", e);
// 		process.exit(1);
// 	})
// 	.finally(async () => {
// 		await prisma.$disconnect();
// 	});
