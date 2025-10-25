import {
	PrismaClient,
	UserRole,
	TransactionType,
	LoanApprovalStatus,
	RepaymentSourceType,
	DocumentType,
	RepaymentStatus,
	NotificationType,
} from "@prisma/client";
import { hashSync } from "bcryptjs";

const prisma = new PrismaClient();

async function main() {
	console.log("🌱 Seeding database...");

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
			...(memberUser?.id
				? { userId: memberUser.id } // ✅ only include userId if it's defined
				: {}),
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

	// Create a Loan
	const loan = await prisma.loan.create({
		data: {
			memberId: member.id,
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
