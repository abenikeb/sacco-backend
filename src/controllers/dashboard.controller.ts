import express from "express";
import type { Request, Response } from "express";
import { prisma } from "../config/prisma";
import {
	LoanApprovalStatus,
	RepaymentStatus,
	TransactionType,
	UserRole,
} from "@prisma/client";
import { startOfMonth, subMonths, format } from "date-fns";
import { getSession } from "./auth/auth";
const order = new Map<UserRole, number>([
	[UserRole.ACCOUNTANT, 0],
	[UserRole.SUPERVISOR, 1],
	[UserRole.MANAGER, 2],
	[UserRole.COMMITTEE, 3],
]);

const dashboardRouter = express.Router();

dashboardRouter.get("/", async (req: Request, res: Response) => {
	const session = await getSession(req);
	console.log({
		session,
	});
	if (!session || session.role === "MEMBER") {
		return res.status(401).json({ error: "Unauthorized" });
	}
	const userRole = session.role as UserRole;
	res.set({
		"Cache-Control": "no-cache, no-store, must-revalidate",
		"Pragma": "no-cache",
		"Expires": "0",
	});

	try {
		// Basic matrics
		const totalMembers = await prisma.member.count();

		// Use Loan schema for loan-related metrics
		const activeLoanCount = await prisma.loan.count({
			where: { status: LoanApprovalStatus.DISBURSED },
		});

		const pendingApprovals = await prisma.loan.count({
			where: {
				status: LoanApprovalStatus.PENDING,
				order: order.get(userRole)!,
			},
		});

		const totalSavingsTransactions = await prisma.transaction.aggregate({
			where: { type: TransactionType.SAVINGS },
			_sum: { amount: true },
		});

		const membershipFeeTransactions = await prisma.transaction.aggregate({
			where: { type: TransactionType.MEMBERSHIP_FEE },
			_sum: { amount: true },
		});

		const willingDepositTransactions = await prisma.transaction.aggregate({
			where: { type: TransactionType.WILLING_DEPOSIT },
			_sum: { amount: true },
		});

		// Use Loan schema for loan portfolio
		const loanPortfolio = await prisma.loan.aggregate({
			where: { status: LoanApprovalStatus.DISBURSED },
			_sum: { amount: true },
		});

		const outstandingLoans = await prisma.loan.aggregate({
			where: {
				status: LoanApprovalStatus.DISBURSED,
				remainingAmount: { gt: 0 },
			},
			_sum: { remainingAmount: true },
		});

		const totalRepayments = await prisma.loanRepayment.aggregate({
			where: { status: RepaymentStatus.PAID },
			_sum: { amount: true },
		});

		const overdueLoans = await prisma.loanRepayment.aggregate({
			where: {
				status: RepaymentStatus.OVERDUE,
				loan: { status: LoanApprovalStatus.DISBURSED },
			},
			_sum: { amount: true },
		});

		const portfolioAtRisk =
			overdueLoans._sum.amount && loanPortfolio._sum.amount
				? (Number(overdueLoans._sum.amount) /
						Number(loanPortfolio._sum.amount)) *
					100
				: 0;

		const loanStatusDistribution = await prisma.loan.groupBy({
			by: ["status"],
			_count: true,
			_sum: { amount: true },
		});

		const formattedLoanStatusDistribution = loanStatusDistribution.map(
			(item) => ({
				name: item.status,
				value: item._count,
				amount: item._sum.amount,
			})
		);

		// Department distribution - using Member schema
		const departmentDistribution = await prisma.member.groupBy({
			by: ["department"],
			_count: true,
		});

		const formattedDepartmentDistribution = departmentDistribution
			.filter((item) => item.department !== null)
			.map((item) => ({
				name: item.department || "Unspecified",
				value: item._count,
			}));

		// Monthly trends data
		const last6Months = Array.from({ length: 6 }, (_, i) => {
			const date = subMonths(new Date(), i);
			return {
				month: format(date, "MMM"),
				date: startOfMonth(date),
			};
		}).reverse();

		// Loan applications and disbursements by month - using Loan schema
		const loanTrends = await Promise.all(
			last6Months.map(async ({ month, date }) => {
				const applications = await prisma.loan.count({
					where: {
						createdAt: {
							gte: date,
							lt: subMonths(date, -1),
						},
					},
				});

				const disbursements = await prisma.loan.count({
					where: {
						status: LoanApprovalStatus.DISBURSED,
						approvalLogs: {
							some: {
								status: LoanApprovalStatus.DISBURSED,
								approvalDate: {
									gte: date,
									lt: subMonths(date, -1),
								},
							},
						},
					},
				});

				return {
					name: month,
					Applications: applications,
					Disbursements: disbursements,
				};
			})
		);

		// Savings growth by month - using Transaction schema
		const savingsTrends = await Promise.all(
			last6Months.map(async ({ month, date }) => {
				const monthlySavings = await prisma.transaction.aggregate({
					where: {
						type: TransactionType.SAVINGS,
						transactionDate: {
							gte: date,
							lt: subMonths(date, -1),
						},
					},
					_sum: { amount: true },
				});

				return {
					name: month,
					amount: Number(monthlySavings._sum.amount || 0),
				};
			})
		);

		// Repayment performance by month - using LoanRepayment schema
		const repaymentTrends = await Promise.all(
			last6Months.map(async ({ month, date }) => {
				// Expected repayments from LoanRepayment schema
				const expected = await prisma.loanRepayment.aggregate({
					where: {
						repaymentDate: {
							gte: date,
							lt: subMonths(date, -1),
						},
					},
					_sum: { amount: true },
				});

				// Actual repayments from LoanRepayment schema with PAID status
				const actual = await prisma.loanRepayment.aggregate({
					where: {
						status: RepaymentStatus.PAID,
						repaymentDate: {
							gte: date,
							lt: subMonths(date, -1),
						},
					},
					_sum: { amount: true },
				});

				return {
					name: month,
					Expected: Number(expected._sum.amount || 0),
					Actual: Number(actual._sum.amount || 0),
				};
			})
		);

		// Transaction types distribution - using Transaction schema
		const transactionDistribution = await prisma.transaction.groupBy({
			by: ["type"],
			_sum: { amount: true },
			_count: true,
		});

		const formattedTransactionDistribution = transactionDistribution.map(
			(item) => ({
				name: item.type,
				value: Number(item._sum.amount || 0),
				count: item._count,
			})
		);

		// Loan size distribution - using Loan schema
		const loanSizeRanges = [
			{ min: 0, max: 5000, label: "0-5,000" },
			{ min: 5000, max: 10000, label: "5,000-10,000" },
			{ min: 10000, max: 20000, label: "10,000-20,000" },
			{ min: 20000, max: 50000, label: "20,000-50,000" },
			{ min: 50000, max: null, label: "50,000+" },
		];

		const loanSizeDistribution = await Promise.all(
			loanSizeRanges.map(async (range) => {
				const count = await prisma.loan.count({
					where: {
						amount: {
							gte: range.min,
							...(range.max ? { lt: range.max } : {}),
						},
					},
				});
				return {
					name: range.label,
					value: count,
				};
			})
		);

		// Recent loans - using Loan schema
		const recentLoans = await prisma.loan.findMany({
			take: 5,
			orderBy: { createdAt: "desc" },
			include: {
				member: {
					select: { name: true },
				},
			},
		});

		const formattedRecentLoans = recentLoans.map((loan) => ({
			id: loan.id,
			memberName: loan.member.name,
			amount: loan.amount,
			status: loan.status,
			createdAt: loan.createdAt,
		}));

		// Top savers - using MemberBalance schema
		const topSavers = await prisma.memberBalance.findMany({
			take: 5,
			orderBy: { totalSavings: "desc" },
			include: {
				member: {
					select: { name: true, etNumber: true },
				},
			},
		});

		const formattedTopSavers = topSavers.map((saver) => ({
			memberId: saver.memberId,
			etNumber: saver.member.etNumber,
			memberName: saver.member.name,
			totalSavings: saver.totalSavings,
		}));

		return res.json({
			// Basic metrics
			totalMembers,
			activeLoanCount,
			totalSavings: totalSavingsTransactions._sum.amount || 0,
			pendingApprovals,

			// Financial metrics from transactions
			membershipFees: membershipFeeTransactions._sum.amount || 0,
			willingDeposits: willingDepositTransactions._sum.amount || 0,
			loanRepayments: totalRepayments._sum.amount || 0, // Using LoanRepayment schema

			// Loan portfolio metrics
			loanPortfolio: loanPortfolio._sum.amount || 0,
			outstandingLoans: outstandingLoans._sum.remainingAmount || 0, // Fixed property access
			portfolioAtRisk,

			// Distributions
			loanStatusDistribution: formattedLoanStatusDistribution,
			departmentDistribution: formattedDepartmentDistribution,
			transactionDistribution: formattedTransactionDistribution,
			loanSizeDistribution,

			// Trends
			loanTrends,
			savingsTrends,
			repaymentTrends,

			// Lists
			recentLoans: formattedRecentLoans,
			topSavers: formattedTopSavers,
		});
	} catch (err) {
		console.log(err);
		return res.status(500).json({ message: "Internal server error" });
	}
});

export default dashboardRouter;
