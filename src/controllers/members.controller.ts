import express from "express";
import type { Request, Response } from "express";
import { prisma } from "../config/prisma";
import {
	LoanApprovalStatus,
	RepaymentStatus,
	TransactionType,
} from "@prisma/client";
import { startOfMonth, endOfMonth, parseISO } from "date-fns";
import { DateTime } from "luxon";
import { getSession, getUserFromRequest } from "./auth/auth";
import multer from "multer";

const membersRouter = express.Router();
const upload = multer({ dest: "loanDocAdmin/" });

async function calculateTotalSavings(memberId: string): Promise<number> {
	const savingsTransactions = await prisma.transaction.findMany({
		where: {
			memberId,
			type: {
				in: [
					TransactionType.SAVINGS,
					TransactionType.MEMBERSHIP_FEE,
					TransactionType.REGISTRATION_FEE,
					TransactionType.COST_OF_SHARE,
					TransactionType.WILLING_DEPOSIT,
				],
			},
		} as any,
	});

	return savingsTransactions.reduce((sum, tx) => sum + Number(tx.amount), 0);
}

async function calculateTotalContributions(memberId: any): Promise<number> {
	const contributionTransactions = await prisma.transaction.findMany({
		where: {
			memberId,
			type: {
				in: [
					TransactionType.SAVINGS,
					TransactionType.MEMBERSHIP_FEE,
					TransactionType.REGISTRATION_FEE,
					TransactionType.COST_OF_SHARE,
				],
			},
		},
	});

	return contributionTransactions.reduce(
		(sum, tx) => sum + Number(tx.amount),
		0
	);
}

async function calculateActiveLoanBalance(memberId: any) {
	const activeLoans = await prisma.loan.findMany({
		where: {
			memberId,
			status: {
				in: ["PENDING", "APPROVED", "DISBURSED"],
			},
		},
		include: {
			loanRepayments: true,
		},
	});

	if (activeLoans.length === 0) {
		return null;
	}

	// Calculate totals for all active loans
	let totalDisbursed = 0;
	let totalRepaid = 0;

	for (const loan of activeLoans) {
		totalDisbursed += Number(loan.amount);

		const repaidAmount = loan.loanRepayments.reduce((sum, repayment) => {
			if (repayment.status === RepaymentStatus.PAID) {
				return sum + Number(repayment.amount);
			}
			return sum;
		}, 0);

		totalRepaid += repaidAmount;
	}

	const remainingBalance = totalDisbursed - totalRepaid;

	return {
		totalDisbursed,
		totalRepaid,
		remainingBalance,
		activeLoansCount: activeLoans.length,
	};
}

membersRouter.get("/loans", async (req, res) => {
	const session = await getSession(req);

	if (!session || session.role !== "MEMBER" || !session.id) {
		return res.status(401).json("Unauthroized");
	}
	try {
		const loans = await prisma.loan.findMany({
			where: {
				memberId: session.id,
			},
			include: {
				approvalLogs: {
					select: {
						id: true,
						status: true,
						approvalDate: true,
						comments: true,
						role: true,
					},
					orderBy: {
						approvalDate: "desc",
					},
				},
				loanRepayments: {
					select: {
						id: true,
						amount: true,
						repaymentDate: true,
						reference: true,
						sourceType: true,
						status: true,
					},
					orderBy: {
						repaymentDate: "asc",
					},
				},
			},
			orderBy: {
				createdAt: "desc",
			},
		});

		return res.json(loans);
	} catch (error) {
		console.error("Error fetching loan details:", error);
		return res.status(500).json({
			error: "Failed to fetch loans",
			message: error instanceof Error ? error.message : "Unknown error",
		});
	}
});

membersRouter.get("/loan-eligibility", async (req, res) => {
	const session = await getSession(req);
	if (!session) {
		return res.status(401).json({ error: "Unauthorized" });
	}

	try {
		const member = await prisma.member.findUnique({
			where: { id: session.id! },
		});

		if (!member) {
			return res.status(404).json({ error: "Member not found" });
		}

		const totalSavings = await calculateTotalSavings((session as any).id!);
		const totalContributions = await calculateTotalContributions(session.id!);

		const activeLoanBalance = await calculateActiveLoanBalance(session.id!);
		const hasActiveLoan = activeLoanBalance !== null;

		const monthlySalary = member.salary || 0;

		// Requirement 1: Max loan term is 10 years (120 months) - fixed in frontend
		const maxLoanTerm = 120; // months

		// Requirement 2: Fixed interest rate of 9.5% - fixed in frontend
		const interestRate = 9.5;

		// Requirement 3: Savings requirement before loan approval (30% of requested amount)
		// This is validated during application

		// Requirement 4: Loan limit based on salary (max 30 months' salary)
		const maxLoanBasedOnSalary = monthlySalary * 30;

		// Requirement 5: Savings requirement during active loan (35% of monthly income)
		// If has active loan, must save 35% of monthly income
		const savingsRequirementRate = hasActiveLoan ? 0.35 : 0.3;

		// Requirement 6: Active loan balance tracking
		// Calculate max loan based on current savings
		// If no active loan: max = totalSavings / 0.3 (need 30% saved)
		// If active loan: max = totalSavings / 0.35 (need 35% saved)
		const maxLoanBasedOnSavings =
			totalSavings > 0 ? totalSavings / savingsRequirementRate : 0;

		// Overall max loan is the minimum of salary-based and savings-based limits
		const maxLoanAmount = Math.min(maxLoanBasedOnSalary, maxLoanBasedOnSavings);

		return res.json({
			// Financial information
			totalSavings: Number(totalSavings),
			totalContributions: Number(totalContributions),
			monthlySalary: Number(monthlySalary),

			// Loan limits
			maxLoanBasedOnSalary: Number(maxLoanBasedOnSalary),
			maxLoanBasedOnSavings: Number(maxLoanBasedOnSavings),
			maxLoanAmount: Number(maxLoanAmount),

			// Active loan information
			hasActiveLoan,
			activeLoanBalance: activeLoanBalance
				? {
						totalDisbursed: Number(activeLoanBalance.totalDisbursed),
						totalRepaid: Number(activeLoanBalance.totalRepaid),
						remainingBalance: Number(activeLoanBalance.remainingBalance),
						activeLoansCount: activeLoanBalance.activeLoansCount,
					}
				: null,

			// Requirements information
			savingsRequirementRate,
			maxLoanTerm,
			interestRate,
		});
	} catch (err) {
		console.error("Eligibility error:", err);
		return res.status(500).json({
			error: "Failed to fetch eligibility information",
			message: err instanceof Error ? err.message : "Unknown error",
		});
	}
});

// membersRouter.get("/loans", async (req, res) => {
// 	const session = await getSession(req);

// 	if (!session || session.role !== "MEMBER" || !session.id) {
// 		return res.status(401).json("Unauthroized");
// 	}
// 	try {
// 		const loans = await prisma.loan.findMany({
// 			where: {
// 				memberId: session.id,
// 			},
// 			include: {
// 				approvalLogs: {
// 					select: {
// 						id: true,
// 						status: true,
// 						approvalDate: true,
// 						comments: true,
// 						role: true,
// 					},
// 					orderBy: {
// 						approvalDate: "desc",
// 					},
// 				},
// 				loanRepayments: {
// 					select: {
// 						id: true,
// 						amount: true,
// 						repaymentDate: true,
// 						reference: true,
// 						sourceType: true,
// 						status: true,
// 					},
// 					orderBy: {
// 						repaymentDate: "asc",
// 					},
// 				},
// 			},
// 			orderBy: {
// 				createdAt: "desc",
// 			},
// 		});

// 		return res.json(loans);
// 	} catch (error) {
// 		console.error("Error fetching loan details:", error);
// 		return res.status(500).json({
// 			error: "Failed to fetch loans",
// 			message: error instanceof Error ? error.message : "Unknown error",
// 		});
// 	}
// });

// membersRouter.get("/loan-eligibility", async (req, res) => {
// 	const session = await getSession(req);
// 	if (!session) {
// 		return res.status(401).json({ error: "Unauthorized" });
// 	}

// 	try {
// 		const member = await prisma.member.findUnique({
// 			where: { id: session.id! },
// 			include: {
// 				balance: true,
// 				loans: {
// 					where: {
// 						status: {
// 							in: ["PENDING", "APPROVED", "DISBURSED"],
// 						},
// 					},
// 				},
// 			},
// 		});

// 		if (!member) {
// 			return res.status(404).json({ error: "Member not found" });
// 		}
// 		const monthlySalary = member.salary; // This should be fetched from member.salary or similar field
// 		const totalContribution = member.balance?.totalContributions || 0; // this will become 0 coelecing will return 0
// 		const hasActiveLoan = member.loans.length > 0;

// 		return res.json({
// 			totalContribution: Number(totalContribution),
// 			monthlySalary,
// 			hasActiveLoan,
// 		});
// 	} catch (err) {
// 		console.log("Eligibility " + err);
// 		return res.json({ error: err });
// 	}
// });

membersRouter.get("/loans/documents", async (req, res) => {
	const session = await getSession(req);
	if (!session || session.role == "MEMBER") {
		return res.status(401).json("Unauthorized");
	}
	try {
		const documents = await prisma.loanDocument.findMany({
			select: {
				id: true,
				loanId: true,
				documentType: true,
				fileName: true,
				uploadDate: true,
				documentUrl: true,
			},
			orderBy: { uploadDate: "desc" },
		});
		return res.json(documents);
	} catch (error) {
		console.error("Error fetching loan documents:", error);
		return res.status(500).json({ error: "Internal server error" });
	}
});

membersRouter.post(
	"/loans/documents",
	upload.single("file"),
	async (req, res) => {
		const session = await getSession(req);
		try {
			if (!session || session.role == "MEMBER") {
				return res.status(401).json("Unauthorized");
			}
			const { documentType, loanId } = req.body;
			const file = req.file;
			if (!file || !documentType || !loanId) {
				return res.status(400).json({ error: "Missing required fields" });
			}
			const fileContent = file.buffer;
			const documentUrl = `/api/loans/documents/${Date.now()}-${file.originalname}`;

			const document = await prisma.loanDocument.create({
				data: {
					loanId: Number(loanId),
					documentType,
					fileName: file.originalname,
					mimeType: file.mimetype,
					documentContent: fileContent,
					uploadedByUserId: session.id!,
					documentUrl,
				},
			});
			return res.json({
				success: true,
				documentId: document.id,
				documentUrl: document.documentUrl,
			});
		} catch (error) {
			console.error("Error uploading loan document:", error);
			return res.status(500).json({ error: "Internal server error" });
		}
	}
);

membersRouter.get("/:etNumber/savings-and-transactions", async (req, res) => {
	const session = await getSession(req);
	if (!session) {
		return res.status(401).json("Unauthroized");
	}

	const etNumber = req.params.etNumber;
	if (
		!session ||
		session.role !== "MEMBER" ||
		session?.etNumber?.toString() !== etNumber
	) {
		return res.status(401).json({ error: "Unauthorized" });
	}
	try {
		// Get the query parameters for filtering
		const url = new URL(req.url, `${req.protocol}://${req.get("host")}`);
		const period = url.searchParams.get("period") || "all";
		const type = url.searchParams.get("type") || "all";

		// Calculate date range based on period
		let startDate: Date | undefined;
		const now = new Date();

		if (period === "week") {
			startDate = new Date(now);
			startDate.setDate(now.getDate() - 7);
		} else if (period === "month") {
			startDate = new Date(now);
			startDate.setMonth(now.getMonth() - 1);
		} else if (period === "year") {
			startDate = new Date(now);
			startDate.setFullYear(now.getFullYear() - 1);
		}

		// Build the where clause for transactions

		const member = await prisma.member.findUnique({
			where: { etNumber: Number.parseInt(etNumber) },
		});
		if (!member) {
			return res.status(404).json({ error: "Member not found" });
		}
		const transactions = await prisma.transaction.findMany({
			where: {
				memberId: member.id,
			},
			orderBy: { transactionDate: "desc" },
		});
		const savingsTransactions = transactions.filter(
			(t: any) => t.type === "SAVINGS"
		);

		console.log({
			savingsTransactions,
		});

		const withdrawalTransactions = transactions.filter(
			(t: any) => t.type === "WITHDRAWAL"
		);

		const totalDeposits = savingsTransactions.reduce(
			(sum, t) => sum + Number(t.amount),
			0
		);

		const totalWithdrawals = withdrawalTransactions.reduce(
			(sum, t) => sum + Number(t.amount),
			0
		);

		const totalSavings = totalDeposits - totalWithdrawals;

		// Get monthly savings data for chart
		const last6Months = Array.from({ length: 6 }, (_, i) => {
			const date = new Date();
			date.setMonth(date.getMonth() - i);
			return {
				month: date.toLocaleString("default", { month: "short" }),
				year: date.getFullYear(),
				monthIndex: date.getMonth(),
				fullYear: date.getFullYear(),
			};
		}).reverse();

		const monthlySavings = await Promise.all(
			last6Months.map(async ({ month, year, monthIndex, fullYear }) => {
				const startOfMonth = new Date(fullYear, monthIndex, 1);
				const endOfMonth = new Date(fullYear, monthIndex + 1, 0);

				const monthlyDeposits = await prisma.transaction.findMany({
					where: {
						memberId: Number.parseInt(etNumber),
						type: { in: ["MEMBERSHIP_FEE", "WILLING_DEPOSIT", "SAVINGS"] },
						transactionDate: {
							gte: startOfMonth,
							lte: endOfMonth,
						},
					},
				});

				const monthlyWithdrawals = await prisma.transaction.findMany({
					where: {
						memberId: Number.parseInt(etNumber),
						type: "LOAN_REPAYMENT",
						transactionDate: {
							gte: startOfMonth,
							lte: endOfMonth,
						},
					},
				});

				const deposits = monthlyDeposits.reduce(
					(sum, t) => sum + Number(t.amount),
					0
				);
				const withdrawals = monthlyWithdrawals.reduce(
					(sum, t) => sum + Number(t.amount),
					0
				);

				return {
					month: `${month} ${year}`,
					deposits,
					withdrawals,
					net: deposits - withdrawals,
				};
			})
		);

		// Get transaction type distribution for pie chart
		const transactionTypes = await prisma.transaction.groupBy({
			by: ["type"],
			where: {
				memberId: Number.parseInt(etNumber),
			},
			_sum: {
				amount: true,
			},
		});

		const typeDistribution = transactionTypes.map((type) => ({
			name: type.type,
			value: Number(type._sum.amount) || 0,
		}));

		return res.json({
			totalSavings,
			totalDeposits,
			totalWithdrawals,
			recentTransactions: transactions.slice(0, 10),
			monthlySavings,
			typeDistribution,
			transactionCount: transactions.length,
		});
	} catch (error) {
		console.error("Error fetching member details:", error);
		return res.status(500).json({
			error: "Failed to fetch member details",
			message: error instanceof Error ? error.message : "Unknown error",
		});
	}
});

membersRouter.get("/loans/:id", async (req, res) => {
	const loanId = Number(req.params.id);
	if (isNaN(loanId)) {
		return res.status(400).json({ error: "Invalid loan ID" });
	}
	const session = await getSession(req);
	if (!session || session.role !== "MEMBER" || !session.id) {
		return res.status(401).json("Unauthorized");
	}
	try {
		const loan = await prisma.loan.findUnique({
			where: {
				id: loanId,
				memberId: session.id,
			},
			include: {
				approvalLogs: {
					select: {
						id: true,
						status: true,
						approvalDate: true,
						comments: true,
						role: true,
					},
					orderBy: {
						approvalDate: "desc",
					},
				},
				loanRepayments: {
					// select: {
					// 	id: true,
					// 	amount: true,
					// 	repaymentDate: true,
					// 	reference: true,
					// 	sourceType: true,
					// 	status: true,
					// },
					orderBy: {
						repaymentDate: "asc",
					},
				},
				loanDocuments: {
					select: {
						id: true,
						documentType: true,
						documentUrl: true,
						uploadDate: true,
					},
					orderBy: {
						uploadDate: "desc",
					},
				},
			},
		});
		if (!loan) {
			return res.status(404).json({ error: "Loan not found" });
		}

		return res.json(loan);
	} catch (error) {
		console.error("Error fetching loan details:", error);
		return res.status(500).json({ error: "Failed to fetch loan details" });
	}
});

membersRouter.get("/:etNumber", async (req, res) => {
	const session = await getSession(req);
	if (!session) {
		return res.status(401).json({ error: "Unauthorized" });
	}

	const etNumber = req.params.etNumber;
	if (isNaN(etNumber as any)) {
		return res.status(400).json({ error: "Invalid ET Number format" });
	}

	try {
		const member = await prisma.member.findUnique({
			where: { etNumber: Number.parseInt(etNumber) },
			include: {
				balance: true,
				savings: {
					orderBy: { savingsDate: "desc" },
				},
				loans: {
					include: {
						loanRepayments: {
							orderBy: { repaymentDate: "desc" },
						},
					},
					orderBy: { createdAt: "desc" },
				},
				transactions: {
					orderBy: { transactionDate: "desc" },
				},
			},
		});
		console.log("the member fetched ", member);

		if (!member) {
			return res.status(404).json({ error: "Member not found" });
		}

		// Define transaction types for better maintainability
		const TransactionType = {
			SAVINGS: "SAVINGS",
			MEMBERSHIP_FEE: "MEMBERSHIP_FEE",
			LOAN_REPAYMENT: "LOAN_REPAYMENT",
			WILLING_DEPOSIT: "WILLING_DEPOSIT",
			REGISTRATION_FEE: "REGISTRATION_FEE",
			COST_OF_SHARE: "COST_OF_SHARE",
		};

		// Helper function to calculate total amount for a specific transaction type
		const calculateTotalByType = (type: any) => {
			return member.transactions
				.filter((transaction) => transaction.type === type)
				.reduce((sum, transaction) => sum + Number(transaction.amount), 0);
		};

		// Helper function to get the latest transaction of a specific type
		const getLatestTransactionByType = (type: any) => {
			return member.transactions
				.filter((transaction) => transaction.type === type)
				.sort(
					(a, b) =>
						new Date(b.transactionDate).getTime() -
						new Date(a.transactionDate).getTime()
				)[0];
		};

		// Calculate financial metrics
		const totalSavings = calculateTotalByType(TransactionType.SAVINGS);
		const totalLoanRepayment = calculateTotalByType(
			TransactionType.LOAN_REPAYMENT
		);
		const totalMembershipFee = calculateTotalByType(
			TransactionType.MEMBERSHIP_FEE
		);
		const totalWillingDeposit = calculateTotalByType(
			TransactionType.WILLING_DEPOSIT
		);
		const totalRegistrationFee = calculateTotalByType(
			TransactionType.REGISTRATION_FEE
		);
		const totalCostOfShare = calculateTotalByType(
			TransactionType.COST_OF_SHARE
		);

		// Calculate total contributions
		const contributionTypes = [
			TransactionType.SAVINGS,
			TransactionType.MEMBERSHIP_FEE,
			TransactionType.LOAN_REPAYMENT,
			TransactionType.WILLING_DEPOSIT,
		];

		const totalContributions = member.transactions
			.filter((transaction) => contributionTypes.includes(transaction.type))
			.reduce((sum, transaction) => sum + Number(transaction.amount), 0);

		// Get latest transactions
		const lastSavingsTransaction = getLatestTransactionByType(
			TransactionType.SAVINGS
		);
		const lastContributionTransaction = member.transactions
			.filter((transaction) => contributionTypes.includes(transaction.type))
			.sort(
				(a, b) =>
					new Date(b.transactionDate).getTime() -
					new Date(a.transactionDate).getTime()
			)[0];

		// Calculate loan metrics
		const activeLoans = member.loans.filter(
			(loan) => loan.status === ("DISBURSED" as LoanApprovalStatus)
		).length;

		const totalLoanAmount = member.loans
			.filter((loan) => loan.status === ("DISBURSED" as LoanApprovalStatus))
			.reduce((sum, loan) => sum + Number(loan.amount), 0);

		// Find next payment due
		const nextPayment =
			member.loans
				.filter((loan) => loan.status === ("DISBURSED" as LoanApprovalStatus))
				.flatMap((loan) => loan.loanRepayments)
				.filter((repayment) => repayment.status === "PENDING")
				.sort(
					(a, b) =>
						new Date(a.repaymentDate).getTime() -
						new Date(b.repaymentDate).getTime()
				)[0] || null;

		// Prepare chart data
		const prepareChartData = (transactions: any, type: any) => {
			return transactions
				.filter((transaction: any) => transaction.type === type)
				.map((transaction: any) => ({
					date: transaction.transactionDate,
					amount: Number(transaction.amount),
				}))
				.sort(
					(a: any, b: any) =>
						new Date(a.date).getTime() - new Date(b.date).getTime()
				);
		};

		const savingsHistory = prepareChartData(
			member.transactions,
			TransactionType.SAVINGS
		);
		const loanRepaymentHistory = prepareChartData(
			member.transactions,
			TransactionType.LOAN_REPAYMENT
		);

		// Group transactions by type for pie chart
		const transactionsByType = member.transactions.reduce(
			(acc, transaction) => {
				const type = transaction.type;
				if (!acc[type]) {
					acc[type] = 0;
				}
				acc[type] += Number(transaction.amount);
				return acc;
			},
			{} as Record<string, number>
		);

		// Calculate loan repayment progress
		const loanRepaymentProgress = member.loans
			.filter((loan) => loan.status === ("DISBURSED" as LoanApprovalStatus))
			.map((loan) => {
				const totalRepaid = loan.loanRepayments
					.filter((repayment) => repayment.status === "PAID")
					.reduce((sum, repayment) => sum + Number(repayment.amount), 0);

				const remainingAmount = Number(loan.amount) - totalRepaid;
				const progress = (totalRepaid / Number(loan.amount)) * 100;

				return {
					loanId: loan.id,
					loanAmount: Number(loan.amount),
					totalRepaid,
					remainingAmount,
					progress: isNaN(progress) ? 0 : progress,
				};
			});

		return res.status(200).json({
			member: {
				...member,
				totalSavings,
				totalContributions,
				totalLoanRepayment,
				totalMembershipFee,
				totalWillingDeposit,
				totalRegistrationFee,
				totalCostOfShare,
				activeLoans,
				totalLoanAmount,
				nextPayment,
				lastSavingsAmount: lastSavingsTransaction?.amount || 0,
				lastContributionAmount: lastContributionTransaction?.amount || 0,
				savingsHistory,
				loanRepaymentHistory,
				transactionsByType,
				loanRepaymentProgress,
			},
		});
	} catch (error) {
		console.error("Error fetching member details:", error);
		return res.status(500).json({
			error: "Failed to fetch member details",
			message: error instanceof Error ? error.message : "Unknown error",
		});
	}
});

export default membersRouter;
