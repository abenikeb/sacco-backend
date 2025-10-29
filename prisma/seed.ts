// import {
// 	PrismaClient,
// 	UserRole,
// 	TransactionType,
// 	LoanApprovalStatus,
// 	RepaymentSourceType,
// 	DocumentType,
// 	RepaymentStatus,
// 	NotificationType,
// 	AccountType,
// } from "@prisma/client";
// import { hashSync } from "bcryptjs";

// const prisma = new PrismaClient();

// async function main() {
// 	console.log("🌱 Seeding database...");

// 	console.log("📊 Seeding Chart of Accounts...");
// 	const chartOfAccounts = await prisma.chartOfAccounts.createMany({
// 		data: [
// 			// ASSET ACCOUNTS (1000-1999)
// 			{
// 				code: "1010",
// 				name: "Cash on Hand",
// 				accountType: AccountType.ASSET,

// 				isActive: true,
// 			},
// 			{
// 				code: "1020",
// 				name: "Bank Account - Primary",
// 				accountType: AccountType.ASSET,

// 				isActive: true,
// 			},
// 			{
// 				code: "1030",
// 				name: "Bank Account - Savings",
// 				accountType: AccountType.ASSET,

// 				isActive: true,
// 			},
// 			{
// 				code: "1100",
// 				name: "Loans Receivable - Members",
// 				accountType: AccountType.ASSET,

// 				isActive: true,
// 			},
// 			{
// 				code: "1110",
// 				name: "Interest Receivable",
// 				accountType: AccountType.ASSET,

// 				isActive: true,
// 			},
// 			{
// 				code: "1200",
// 				name: "Member Deposits",
// 				accountType: AccountType.ASSET,

// 				isActive: true,
// 			},
// 			{
// 				code: "1210",
// 				name: "Member Savings",
// 				accountType: AccountType.ASSET,

// 				isActive: true,
// 			},
// 			{
// 				code: "1300",
// 				name: "Prepaid Expenses",
// 				accountType: AccountType.ASSET,

// 				isActive: true,
// 			},
// 			{
// 				code: "1500",
// 				name: "Fixed Assets",
// 				accountType: AccountType.ASSET,

// 				isActive: true,
// 			},
// 			{
// 				code: "1510",
// 				name: "Accumulated Depreciation",
// 				accountType: AccountType.ASSET,

// 				isActive: true,
// 			},

// 			// LIABILITY ACCOUNTS (2000-2999)
// 			{
// 				code: "2010",
// 				name: "Accounts Payable",
// 				accountType: AccountType.LIABILITY,

// 				isActive: true,
// 			},
// 			{
// 				code: "2020",
// 				name: "Member Savings Liability",
// 				accountType: AccountType.LIABILITY,

// 				isActive: true,
// 			},
// 			{
// 				code: "2030",
// 				name: "Interest Payable",
// 				accountType: AccountType.LIABILITY,

// 				isActive: true,
// 			},
// 			{
// 				code: "2040",
// 				name: "Fees Payable",
// 				accountType: AccountType.LIABILITY,

// 				isActive: true,
// 			},
// 			{
// 				code: "2100",
// 				name: "Short-Term Loans Payable",
// 				accountType: AccountType.LIABILITY,

// 				isActive: true,
// 			},
// 			{
// 				code: "2200",
// 				name: "Long-Term Loans Payable",
// 				accountType: AccountType.LIABILITY,

// 				isActive: true,
// 			},

// 			// EQUITY ACCOUNTS (3000-3999)
// 			{
// 				code: "3010",
// 				name: "Member Capital",
// 				accountType: AccountType.EQUITY,

// 				isActive: true,
// 			},
// 			{
// 				code: "3020",
// 				name: "Share Capital",
// 				accountType: AccountType.EQUITY,

// 				isActive: true,
// 			},
// 			{
// 				code: "3030",
// 				name: "Retained Earnings",
// 				accountType: AccountType.EQUITY,

// 				isActive: true,
// 			},
// 			{
// 				code: "3040",
// 				name: "General Reserve",
// 				accountType: AccountType.EQUITY,

// 				isActive: true,
// 			},

// 			// REVENUE ACCOUNTS (4000-4999)
// 			{
// 				code: "4010",
// 				name: "Interest Income - Loans",
// 				accountType: AccountType.EQUITY,

// 				isActive: true,
// 			},
// 			{
// 				code: "4020",
// 				name: "Interest Income - Savings",
// 				accountType: AccountType.EQUITY,

// 				isActive: true,
// 			},
// 			{
// 				code: "4100",
// 				name: "Membership Fees",
// 				accountType: AccountType.EQUITY,

// 				isActive: true,
// 			},
// 			{
// 				code: "4110",
// 				name: "Registration Fees",
// 				accountType: AccountType.EQUITY,

// 				isActive: true,
// 			},
// 			{
// 				code: "4120",
// 				name: "Loan Processing Fees",
// 				accountType: AccountType.EQUITY,

// 				isActive: true,
// 			},
// 			{
// 				code: "4130",
// 				name: "Late Payment Penalties",
// 				accountType: AccountType.EQUITY,

// 				isActive: true,
// 			},
// 			{
// 				code: "4200",
// 				name: "Other Income",
// 				accountType: AccountType.EQUITY,

// 				isActive: true,
// 			},

// 			// EXPENSE ACCOUNTS (5000-5999)
// 			{
// 				code: "5010",
// 				name: "Salaries & Wages",
// 				accountType: AccountType.EXPENSE,

// 				isActive: true,
// 			},
// 			{
// 				code: "5020",
// 				name: "Employee Benefits",
// 				accountType: AccountType.EXPENSE,

// 				isActive: true,
// 			},
// 			{
// 				code: "5100",
// 				name: "Office Rent",
// 				accountType: AccountType.EXPENSE,

// 				isActive: true,
// 			},
// 			{
// 				code: "5110",
// 				name: "Utilities",
// 				accountType: AccountType.EXPENSE,

// 				isActive: true,
// 			},
// 			{
// 				code: "5120",
// 				name: "Office Supplies",
// 				accountType: AccountType.EXPENSE,

// 				isActive: true,
// 			},
// 			{
// 				code: "5200",
// 				name: "Depreciation Expense",
// 				accountType: AccountType.EXPENSE,

// 				isActive: true,
// 			},
// 			{
// 				code: "5300",
// 				name: "Bad Debt Expense",
// 				accountType: AccountType.EXPENSE,

// 				isActive: true,
// 			},
// 			{
// 				code: "5400",
// 				name: "Loan Loss Provision",
// 				accountType: AccountType.EXPENSE,

// 				isActive: true,
// 			},
// 			{
// 				code: "5500",
// 				name: "Training & Development",
// 				accountType: AccountType.EXPENSE,

// 				isActive: true,
// 			},
// 			{
// 				code: "5600",
// 				name: "Professional Fees",
// 				accountType: AccountType.EXPENSE,

// 				isActive: true,
// 			},
// 			{
// 				code: "5700",
// 				name: "Audit Fees",
// 				accountType: AccountType.EXPENSE,
// 				isActive: true,
// 			},
// 			{
// 				code: "5800",
// 				name: "Insurance",
// 				accountType: AccountType.EXPENSE,

// 				isActive: true,
// 			},
// 			{
// 				code: "5900",
// 				name: "Miscellaneous Expenses",
// 				accountType: AccountType.EXPENSE,

// 				isActive: true,
// 			},
// 		],
// 	});

// 	console.log(`✅ Created ${chartOfAccounts.count} Chart of Accounts entries`);

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
// 			...(memberUser?.id ? { userId: memberUser.id } : {}),
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
// // import {
// // 	PrismaClient,
// // 	UserRole,
// // 	TransactionType,
// // 	LoanApprovalStatus,
// // 	RepaymentSourceType,
// // 	DocumentType,
// // 	RepaymentStatus,
// // 	NotificationType,
// // } from "@prisma/client";
// // import { hashSync } from "bcryptjs";

// // const prisma = new PrismaClient();

// // async function main() {
// // 	console.log("🌱 Seeding database...");

// // 	// Create Users
// // 	const users = await prisma.user.createMany({
// // 		data: [
// // 			{
// // 				name: "Yohans Manager",
// // 				email: "manager@coop.com",
// // 				phone: "0911000001",
// // 				password: hashSync("password123", 10),
// // 				role: UserRole.MANAGER,
// // 			},
// // 			{
// // 				name: "Sarah Accountant",
// // 				email: "accountant@coop.com",
// // 				phone: "0911000002",
// // 				password: hashSync("password123", 10),
// // 				role: UserRole.ACCOUNTANT,
// // 			},
// // 			{
// // 				name: "Daniel Member",
// // 				email: "daniel.member@coop.com",
// // 				phone: "0911000003",
// // 				password: hashSync("password123", 10),
// // 				role: UserRole.MEMBER,
// // 			},
// // 			{
// // 				name: "Alex Supervisor",
// // 				email: "alex.supervisor@coop.com",
// // 				phone: "0911000009",
// // 				password: hashSync("password123", 10),
// // 				role: UserRole.SUPERVISOR,
// // 			},
// // 			{
// // 				name: "Abebe Committee",
// // 				email: "abebe.committee@coop.com",
// // 				phone: "0911000005",
// // 				password: hashSync("password123", 10),
// // 				role: UserRole.COMMITTEE,
// // 			},
// // 		],
// // 	});

// // 	const manager = await prisma.user.findFirst({
// // 		where: { role: UserRole.MANAGER },
// // 	});
// // 	const accountant = await prisma.user.findFirst({
// // 		where: { role: UserRole.ACCOUNTANT },
// // 	});
// // 	const memberUser = await prisma.user.findFirst({
// // 		where: { role: UserRole.MEMBER },
// // 	});
// // 	const supervisor = await prisma.user.findFirst({
// // 		where: { role: UserRole.SUPERVISOR },
// // 	});
// // 	const committee = await prisma.user.findFirst({
// // 		where: { role: UserRole.COMMITTEE },
// // 	});

// // 	// --- Create Loan Products ---
// // 	await prisma.loanProduct.createMany({
// // 		data: [
// // 			{
// // 				name: "Short-Term Loan",
// // 				description:
// // 					"Quick access loan for short-term needs. Ideal for immediate financial requirements.",
// // 				interestRate: 9.5,
// // 				minDurationMonths: 1,
// // 				maxDurationMonths: 24,
// // 				minTotalContributions: 32000,
// // 				requiredSavingsPercentage: 30,
// // 				requiredSavingsDuringLoan: 35,
// // 				maxLoanBasedOnSalaryMonths: 30,
// // 				isActive: true,
// // 			},
// // 			{
// // 				name: "Medium-Term Loan",
// // 				description:
// // 					"Balanced loan product for medium-term financial planning and investments.",
// // 				interestRate: 9.5,
// // 				minDurationMonths: 25,
// // 				maxDurationMonths: 60,
// // 				minTotalContributions: 62000,

// // 				requiredSavingsPercentage: 30,
// // 				requiredSavingsDuringLoan: 35,
// // 				maxLoanBasedOnSalaryMonths: 30,
// // 				isActive: true,
// // 			},
// // 			{
// // 				name: "Long-Term Loan",
// // 				description:
// // 					"Extended loan tenure for major investments and long-term financial goals.",
// // 				interestRate: 9.5,
// // 				minDurationMonths: 61,
// // 				maxDurationMonths: 120,
// // 				minTotalContributions: 132000,

// // 				requiredSavingsPercentage: 30,
// // 				requiredSavingsDuringLoan: 35,
// // 				maxLoanBasedOnSalaryMonths: 30,
// // 				isActive: true,
// // 			},
// // 			{
// // 				name: "Business Loan",
// // 				description:
// // 					"Specialized loan product for business expansion and entrepreneurial ventures.",
// // 				interestRate: 9.5,
// // 				minDurationMonths: 12,
// // 				minTotalContributions: 332000,
// // 				maxDurationMonths: 120,
// // 				requiredSavingsPercentage: 35,
// // 				requiredSavingsDuringLoan: 40,
// // 				maxLoanBasedOnSalaryMonths: 36,
// // 				isActive: true,
// // 			},
// // 		],
// // 	});

// // 	const shortTermLoanProduct = await prisma.loanProduct.findFirst({
// // 		where: { name: "Short-Term Loan" },
// // 	});

// // 	// Create Member safely (omit userId if undefined)
// // 	const member = await prisma.member.create({
// // 		data: {
// // 			memberNumber: 1001,
// // 			etNumber: 5001,
// // 			name: "Daniel Member",
// // 			email: "daniel.member@coop.com",
// // 			phone: "0911000003",
// // 			division: "Finance",
// // 			department: "Accounts",
// // 			section: "Payroll",
// // 			group: "A",
// // 			salary: 15000,
// // 			...(memberUser?.id
// // 				? { userId: memberUser.id } // ✅ only include userId if it's defined
// // 				: {}),
// // 			balance: {
// // 				create: {
// // 					totalSavings: 2000.0,
// // 					totalContributions: 1500.0,
// // 					costOfShare: 500.0,
// // 					registrationFee: 200.0,
// // 					membershipFee: 100.0,
// // 					willingDeposit: 800.0,
// // 				},
// // 			},
// // 		},
// // 	});

// // 	// Add Member History
// // 	await prisma.memberHistory.create({
// // 		data: {
// // 			memberId: member.id,
// // 			effectiveDate: new Date(),
// // 			fieldName: "department",
// // 			oldValue: "Finance",
// // 			newValue: "Operations",
// // 		},
// // 	});

// // 	// Add Savings
// // 	await prisma.savings.createMany({
// // 		data: [
// // 			{
// // 				memberId: member.id,
// // 				amount: 1000.0,
// // 			},
// // 			{
// // 				memberId: member.id,
// // 				amount: 500.0,
// // 			},
// // 		],
// // 	});

// // 	// Add Transactions
// // 	await prisma.transaction.createMany({
// // 		data: [
// // 			{
// // 				memberId: member.id,
// // 				type: TransactionType.SAVINGS,
// // 				amount: 1000.0,
// // 				reference: "TXN-001",
// // 			},
// // 			{
// // 				memberId: member.id,
// // 				type: TransactionType.MEMBERSHIP_FEE,
// // 				amount: 100.0,
// // 				reference: "TXN-002",
// // 			},
// // 		],
// // 	});

// // 	// --- Create Loan linked to Loan Product ---
// // 	const loan = await prisma.loan.create({
// // 		data: {
// // 			memberId: member.id,
// // 			loanProductId: shortTermLoanProduct!.id,
// // 			amount: 5000.0,
// // 			remainingAmount: 5000.0,
// // 			interestRate: 10.0,
// // 			tenureMonths: 3,
// // 			status: LoanApprovalStatus.PENDING,
// // 		},
// // 	});

// // 	// Add Loan Approval Log
// // 	await prisma.loanApprovalLog.create({
// // 		data: {
// // 			loanId: loan.id,
// // 			approvedByUserId: manager!.id,
// // 			role: UserRole.MANAGER,
// // 			status: LoanApprovalStatus.APPROVED,
// // 			comments: "Initial approval granted.",
// // 			approvalOrder: 1,
// // 			committeeApproval: 1,
// // 		},
// // 	});

// // 	// Add Loan Repayment
// // 	await prisma.loanRepayment.create({
// // 		data: {
// // 			loanId: loan.id,
// // 			amount: 2000.0,
// // 			paidAmount: 0.0,
// // 			sourceType: RepaymentSourceType.ERP_PAYROLL,
// // 			status: RepaymentStatus.PENDING,
// // 		},
// // 	});

// // 	// Add Loan Document
// // 	await prisma.loanDocument.create({
// // 		data: {
// // 			loanId: loan.id,
// // 			uploadedByUserId: accountant!.id,
// // 			documentType: DocumentType.AGREEMENT,
// // 			documentContent: Buffer.from("This is a loan agreement document."),
// // 			fileName: "loan_agreement.pdf",
// // 			mimeType: "application/pdf",
// // 			documentUrl: "https://example.com/docs/loan_agreement.pdf",
// // 		},
// // 	});

// // 	// Add Notifications
// // 	await prisma.notification.createMany({
// // 		data: [
// // 			{
// // 				userId: memberUser!.id,
// // 				title: "Loan Application Submitted",
// // 				message: "Your loan request has been submitted successfully.",
// // 				type: NotificationType.LOAN_APPLICATION_SUBMITTED,
// // 			},
// // 			{
// // 				userId: memberUser!.id,
// // 				title: "Savings Updated",
// // 				message: "Your savings account was credited with 500.00 ETB.",
// // 				type: NotificationType.SAVINGS_UPDATE,
// // 			},
// // 		],
// // 	});

// // 	console.log("✅ Seeding completed.");
// // }

// // main()
// // 	.catch((e) => {
// // 		console.error("❌ Error seeding data:", e);
// // 		process.exit(1);
// // 	})
// // 	.finally(async () => {
// // 		await prisma.$disconnect();
// // 	});

// import {
// 	PrismaClient,
// 	PermissionAction,
// 	PermissionResource,
// } from "@prisma/client";

// const prisma = new PrismaClient();

// /**
//  * Prisma seed script for roles and permissions.
//  * Run: npx prisma db seed
//  */

// async function main() {
// 	console.log("🔐 Seeding roles and permissions...");

// 	// Step 1: Create all permission combinations
// 	console.log("📋 Creating permissions...");
// 	const resources = Object.values(PermissionResource);
// 	const actions = Object.values(PermissionAction);

// 	let permissionCount = 0;

// 	for (const resource of resources) {
// 		for (const action of actions) {
// 			await prisma.permission.upsert({
// 				where: {
// 					resource_action: {
// 						resource: resource as PermissionResource,
// 						action: action as PermissionAction,
// 					},
// 				},
// 				update: {},
// 				create: {
// 					resource: resource as PermissionResource,
// 					action: action as PermissionAction,
// 					description: `${action} access to ${resource}`,
// 				},
// 			});
// 			permissionCount++;
// 		}
// 	}
// 	console.log(`✅ Created or verified ${permissionCount} permissions`);

// 	// Step 2: Define role configurations based on your enum UserRole
// 	const roleConfigurations = [
// 		{
// 			name: "MEMBER",
// 			description:
// 				"Member role with limited access to personal accounts and loan information",
// 			permissions: [
// 				{ resource: "MEMBERS", action: "VIEW" },
// 				{ resource: "MEMBERS", action: "READ" },
// 				{ resource: "LOANS", action: "VIEW" },
// 				{ resource: "LOANS", action: "READ" },
// 				{ resource: "SAVINGS", action: "VIEW" },
// 				{ resource: "SAVINGS", action: "READ" },
// 				{ resource: "WITHDRAWALS", action: "VIEW" },
// 				{ resource: "WITHDRAWALS", action: "READ" },
// 			],
// 		},
// 		{
// 			name: "ACCOUNTANT",
// 			description: "Accountant role with full accounting and reporting access",
// 			permissions: [
// 				{ resource: "ACCOUNTING", action: "VIEW" },
// 				{ resource: "ACCOUNTING", action: "READ" },
// 				{ resource: "ACCOUNTING", action: "CREATE" },
// 				{ resource: "ACCOUNTING", action: "UPDATE" },
// 				{ resource: "REPORTS", action: "VIEW" },
// 				{ resource: "REPORTS", action: "READ" },
// 				{ resource: "TRANSACTIONS", action: "VIEW" },
// 				{ resource: "TRANSACTIONS", action: "READ" },
// 				{ resource: "TRANSACTIONS", action: "CREATE" },
// 				{ resource: "AUDIT_LOGS", action: "VIEW" },
// 				{ resource: "AUDIT_LOGS", action: "READ" },
// 			],
// 		},
// 		{
// 			name: "SUPERVISOR",
// 			description:
// 				"Supervisor role with approval authority for loans and withdrawals",
// 			permissions: [
// 				{ resource: "LOANS", action: "VIEW" },
// 				{ resource: "LOANS", action: "READ" },
// 				{ resource: "LOANS", action: "APPROVE" },
// 				{ resource: "LOANS", action: "REJECT" },
// 				{ resource: "WITHDRAWALS", action: "VIEW" },
// 				{ resource: "WITHDRAWALS", action: "READ" },
// 				{ resource: "WITHDRAWALS", action: "APPROVE" },
// 				{ resource: "WITHDRAWALS", action: "REJECT" },
// 				{ resource: "REPORTS", action: "VIEW" },
// 				{ resource: "REPORTS", action: "READ" },
// 				{ resource: "MEMBERS", action: "VIEW" },
// 				{ resource: "MEMBERS", action: "READ" },
// 			],
// 		},
// 		{
// 			name: "MANAGER",
// 			description:
// 				"Manager role with comprehensive access to all operations except system configuration",
// 			permissions: [
// 				{ resource: "MEMBERS", action: "VIEW" },
// 				{ resource: "MEMBERS", action: "READ" },
// 				{ resource: "MEMBERS", action: "UPDATE" },
// 				{ resource: "MEMBERS", action: "CREATE" },
// 				{ resource: "LOANS", action: "VIEW" },
// 				{ resource: "LOANS", action: "READ" },
// 				{ resource: "LOANS", action: "CREATE" },
// 				{ resource: "LOANS", action: "UPDATE" },
// 				{ resource: "LOANS", action: "APPROVE" },
// 				{ resource: "LOANS", action: "REJECT" },
// 				{ resource: "SAVINGS", action: "VIEW" },
// 				{ resource: "SAVINGS", action: "READ" },
// 				{ resource: "SAVINGS", action: "CREATE" },
// 				{ resource: "SAVINGS", action: "UPDATE" },
// 				{ resource: "WITHDRAWALS", action: "VIEW" },
// 				{ resource: "WITHDRAWALS", action: "READ" },
// 				{ resource: "WITHDRAWALS", action: "APPROVE" },
// 				{ resource: "WITHDRAWALS", action: "REJECT" },
// 				{ resource: "TRANSACTIONS", action: "VIEW" },
// 				{ resource: "TRANSACTIONS", action: "READ" },
// 				{ resource: "TRANSACTIONS", action: "CREATE" },
// 				{ resource: "REPORTS", action: "VIEW" },
// 				{ resource: "REPORTS", action: "READ" },
// 				{ resource: "ACCOUNTING", action: "VIEW" },
// 				{ resource: "ACCOUNTING", action: "READ" },
// 				{ resource: "USERS", action: "VIEW" },
// 				{ resource: "USERS", action: "READ" },
// 				{ resource: "LOAN_PRODUCTS", action: "VIEW" },
// 				{ resource: "LOAN_PRODUCTS", action: "READ" },
// 				{ resource: "AUDIT_LOGS", action: "VIEW" },
// 				{ resource: "AUDIT_LOGS", action: "READ" },
// 			],
// 		},
// 		{
// 			name: "COMMITTEE",
// 			description:
// 				"Committee role with administrative authority for user management and system configuration",
// 			permissions: [
// 				{ resource: "USERS", action: "VIEW" },
// 				{ resource: "USERS", action: "READ" },
// 				{ resource: "USERS", action: "CREATE" },
// 				{ resource: "USERS", action: "UPDATE" },
// 				{ resource: "USERS", action: "DELETE" },
// 				{ resource: "ROLES", action: "VIEW" },
// 				{ resource: "ROLES", action: "READ" },
// 				{ resource: "ROLES", action: "CREATE" },
// 				{ resource: "ROLES", action: "UPDATE" },
// 				{ resource: "ROLES", action: "DELETE" },
// 				{ resource: "SETTINGS", action: "VIEW" },
// 				{ resource: "SETTINGS", action: "READ" },
// 				{ resource: "SETTINGS", action: "UPDATE" },
// 				{ resource: "LOANS", action: "VIEW" },
// 				{ resource: "LOANS", action: "READ" },
// 				{ resource: "LOANS", action: "APPROVE" },
// 				{ resource: "LOANS", action: "REJECT" },
// 				{ resource: "REPORTS", action: "VIEW" },
// 				{ resource: "REPORTS", action: "READ" },
// 				{ resource: "ACCOUNTING", action: "VIEW" },
// 				{ resource: "ACCOUNTING", action: "READ" },
// 				{ resource: "AUDIT_LOGS", action: "VIEW" },
// 				{ resource: "AUDIT_LOGS", action: "READ" },
// 				{ resource: "LOAN_PRODUCTS", action: "VIEW" },
// 				{ resource: "LOAN_PRODUCTS", action: "READ" },
// 				{ resource: "LOAN_PRODUCTS", action: "UPDATE" },
// 			],
// 		},
// 	];

// 	// Step 3: Create roles and assign permissions
// 	console.log("👥 Creating roles and assigning permissions...");
// 	let roleCount = 0;

// 	for (const roleConfig of roleConfigurations) {
// 		const role = await prisma.role.upsert({
// 			where: { name: roleConfig.name },
// 			update: { description: roleConfig.description },
// 			create: {
// 				name: roleConfig.name,
// 				description: roleConfig.description,
// 				isActive: true,
// 			},
// 		});

// 		for (const permConfig of roleConfig.permissions) {
// 			const permission = await prisma.permission.findUnique({
// 				where: {
// 					resource_action: {
// 						resource: permConfig.resource as PermissionResource,
// 						action: permConfig.action as PermissionAction,
// 					},
// 				},
// 			});

// 			if (permission) {
// 				await prisma.rolePermission.upsert({
// 					where: {
// 						roleId_permissionId: {
// 							roleId: role.id,
// 							permissionId: permission.id,
// 						},
// 					},
// 					update: {},
// 					create: {
// 						roleId: role.id,
// 						permissionId: permission.id,
// 					},
// 				});
// 			}
// 		}

// 		console.log(
// 			`✅ Role "${roleConfig.name}" created with ${roleConfig.permissions.length} permissions`
// 		);
// 		roleCount++;
// 	}

// 	console.log(`\n✅ Successfully seeded ${roleCount} roles with permissions`);
// 	console.log(`
// 📋 Role Summary:
//   • MEMBER: Limited access to personal accounts
//   • ACCOUNTANT: Full accounting and reporting access
//   • SUPERVISOR: Loan and withdrawal approval authority
//   • MANAGER: Comprehensive operational access
//   • COMMITTEE: Administrative and system configuration access
// `);
// }

// main()
// 	.catch((e) => {
// 		console.error("❌ Seeding failed:", e);
// 		process.exit(1);
// 	})
// 	.finally(async () => {
// 		await prisma.$disconnect();
// 	});
import { PrismaClient, UserRole } from "@prisma/client";

const prisma = new PrismaClient();

/**
 * Prisma seed script for assigning existing users to roles
 * This maps UserRole enum values to dynamic Role IDs in the database.
 *
 * Run:
 *   npx prisma db seed -- --users-roles
 * OR if defined as a separate command:
 *   ts-node prisma/seedUsers.ts
 */

async function main() {
	console.log("👤 Assigning roles to users...");

	try {
		// 1️⃣ Define mapping between UserRole enum and Role names
		const roleMapping: Record<UserRole, string> = {
			[UserRole.MEMBER]: "MEMBER",
			[UserRole.ACCOUNTANT]: "ACCOUNTANT",
			[UserRole.MANAGER]: "MANAGER",
			[UserRole.SUPERVISOR]: "SUPERVISOR",
			[UserRole.COMMITTEE]: "COMMITTEE",
		};

		// 2️⃣ Fetch all roles from DB
		const roles = await prisma.role.findMany();
		const roleMap = new Map(roles.map((role) => [role.name, role.id]));

		// 3️⃣ Fetch all users
		const users = await prisma.user.findMany();

		if (users.length === 0) {
			console.log("⚠️ No users found in database to assign roles.");
			return;
		}

		// 4️⃣ Update users with their respective roleId
		let assignedCount = 0;

		for (const user of users) {
			const roleName = roleMapping[user.role];
			const roleId = roleMap.get(roleName);

			if (roleId) {
				await prisma.user.update({
					where: { id: user.id },
					data: { roleId },
				});

				console.log(`✅ User "${user.name}" assigned to role "${roleName}"`);
				assignedCount++;
			} else {
				console.warn(
					`⚠️ No matching role found in DB for enum value "${user.role}"`
				);
			}
		}

		console.log(`\n✅ Successfully assigned roles to ${assignedCount} users`);
	} catch (error) {
		console.error("❌ Error assigning roles to users:", error);
		throw error;
	}
}

main()
	.catch((e) => {
		console.error("❌ Seeding failed:", e);
		process.exit(1);
	})
	.finally(async () => {
		await prisma.$disconnect();
	});
