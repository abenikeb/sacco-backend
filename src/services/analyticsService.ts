import { prisma } from "../config/prisma";

export class AnalyticsService {
	/**
	 * Get member growth trends (last 12 months)
	 */
	async getMemberGrowthTrends() {
		const months = 12;
		const trends = [];

		for (let i = months - 1; i >= 0; i--) {
			const date = new Date();
			date.setMonth(date.getMonth() - i);
			date.setDate(1);
			date.setHours(0, 0, 0, 0);

			const nextMonth = new Date(date);
			nextMonth.setMonth(nextMonth.getMonth() + 1);

			const memberCount = await prisma.member.count({
				where: {
					createdAt: {
						lt: nextMonth,
					},
				},
			});

			const newMembers = await prisma.member.count({
				where: {
					createdAt: {
						gte: date,
						lt: nextMonth,
					},
				},
			});

			trends.push({
				month: date.toLocaleDateString("en-US", {
					month: "short",
					year: "2-digit",
				}),
				date: date.toISOString().split("T")[0],
				totalMembers: memberCount,
				newMembers,
			});
		}

		return trends;
	}

	/**
	 * Get savings trends (last 12 months)
	 */
	async getSavingsTrends() {
		const months = 12;
		const trends = [];

		for (let i = months - 1; i >= 0; i--) {
			const date = new Date();
			date.setMonth(date.getMonth() - i);
			date.setDate(1);
			date.setHours(0, 0, 0, 0);

			const nextMonth = new Date(date);
			nextMonth.setMonth(nextMonth.getMonth() + 1);

			const savingsData = await prisma.transaction.aggregate({
				where: {
					type: "SAVINGS",
					createdAt: {
						gte: date,
						lt: nextMonth,
					},
				},
				_sum: {
					amount: true,
				},
				_count: true,
			});

			trends.push({
				month: date.toLocaleDateString("en-US", {
					month: "short",
					year: "2-digit",
				}),
				date: date.toISOString().split("T")[0],
				totalSavings: Number(savingsData._sum.amount || 0),
				transactionCount: savingsData._count,
			});
		}

		return trends;
	}

	/**
	 * Get loan performance metrics
	 */
	async getLoanPerformance() {
		const loans = await prisma.loan.findMany({
			include: {
				member: true,
				loanRepayments: true,
			},
		});

		let totalLoansIssued = 0;
		let totalLoansOutstanding = 0;
		let totalRepaid = 0;
		let activeLoans = 0;
		let completedLoans = 0;
		let defaultedLoans = 0;

		for (const loan of loans) {
			totalLoansIssued += Number(loan.amount);

			const totalRepayment = loan.loanRepayments.reduce(
				(sum, r) => sum + Number(r.paidAmount),
				0
			);
			const outstanding = Number(loan.amount) - totalRepayment;

			if (outstanding > 0) {
				totalLoansOutstanding += outstanding;
				activeLoans++;
			} else {
				completedLoans++;
			}

			totalRepaid += totalRepayment;

			// Check if loan is defaulted (more than 90 days overdue)
			if (loan.status === "DISBURSED" && outstanding > 0) {
				const lastRepaymentDate =
					loan.loanRepayments.length > 0
						? loan.loanRepayments[loan.loanRepayments.length - 1].repaymentDate
						: loan.remainingAmount;
				const daysOverdue = Math.floor(
					(new Date().getTime() -
						new Date(lastRepaymentDate as any).getTime()) /
						(1000 * 60 * 60 * 24)
				);

				if (daysOverdue > 90) {
					defaultedLoans++;
				}
			}
		}

		const portfolioAtRisk =
			totalLoansIssued > 0
				? (totalLoansOutstanding / totalLoansIssued) * 100
				: 0;

		return {
			totalLoansIssued,
			totalLoansOutstanding,
			totalRepaid,
			activeLoans,
			completedLoans,
			defaultedLoans,
			portfolioAtRisk,
			repaymentRate:
				totalLoansIssued > 0 ? (totalRepaid / totalLoansIssued) * 100 : 0,
		};
	}

	/**
	 * Get delinquency report
	 */
	async getDelinquencyReport() {
		const loans = await prisma.loan.findMany({
			include: {
				member: true,
				loanRepayments: true,
			},
			where: {
				status: "DISBURSED",
			},
		});

		const delinquent = [];
		const defaulters = [];

		for (const loan of loans) {
			const totalRepayment = loan.loanRepayments.reduce(
				(sum, r) => sum + Number(r.paidAmount),
				0
			);
			const outstanding = Number(loan.remainingAmount) - totalRepayment;

			if (outstanding > 0) {
				const lastRepaymentDate =
					loan.loanRepayments.length > 0
						? loan.loanRepayments[loan.loanRepayments.length - 1].repaymentDate
						: loan.updatedAt;
				const daysOverdue = Math.floor(
					(new Date().getTime() - new Date(lastRepaymentDate).getTime()) /
						(1000 * 60 * 60 * 24)
				);

				if (daysOverdue > 30) {
					const category =
						daysOverdue > 90
							? "DEFAULTED"
							: daysOverdue > 60
								? "SEVERELY_DELINQUENT"
								: "DELINQUENT";

					const record = {
						loanId: loan.id,
						memberId: loan.memberId,
						memberName: loan.member.name,
						loanAmount: Number(loan.amount),
						outstanding,
						daysOverdue,
						category,
						lastRepaymentDate: new Date(lastRepaymentDate)
							.toISOString()
							.split("T")[0],
					};

					if (category === "DEFAULTED") {
						defaulters.push(record);
					} else {
						delinquent.push(record);
					}
				}
			}
		}

		return {
			delinquent: delinquent.sort((a, b) => b.daysOverdue - a.daysOverdue),
			defaulters: defaulters.sort((a, b) => b.daysOverdue - a.daysOverdue),
			totalDelinquent: delinquent.length,
			totalDefaulters: defaulters.length,
			delinquencyRate:
				loans.length > 0
					? ((delinquent.length + defaulters.length) / loans.length) * 100
					: 0,
		};
	}

	/**
	 * Get financial performance summary
	 */
	async getFinancialPerformance(fromDate?: Date, toDate?: Date) {
		const from = fromDate || new Date(new Date().getFullYear(), 0, 1);
		const to = toDate || new Date();

		// Revenue
		const interestIncome = await prisma.transaction.aggregate({
			where: {
				type: "LOAN_REPAYMENT",
				createdAt: { gte: from, lte: to },
			},
			_sum: { amount: true },
		});

		const fees = await prisma.transaction.aggregate({
			where: {
				type: "COST_OF_SHARE",
				createdAt: { gte: from, lte: to },
			},
			_sum: { amount: true },
		});

		// Expenses
		const loans = await prisma.loan.findMany({
			where: {
				updatedAt: { gte: from, lte: to },
			},
		});

		const totalLoansIssued = loans.reduce(
			(sum, l) => sum + Number(l.amount),
			0
		);

		// Member deposits (liability)
		const deposits = await prisma.transaction.aggregate({
			where: {
				type: "SAVINGS",
				createdAt: { gte: from, lte: to },
			},
			_sum: { amount: true },
		});

		const totalRevenue =
			Number(interestIncome._sum.amount || 0) + Number(fees._sum.amount || 0);
		const totalExpenses = totalLoansIssued;
		const netIncome = totalRevenue - totalExpenses;

		return {
			totalRevenue,
			interestIncome: Number(interestIncome._sum.amount || 0),
			fees: Number(fees._sum.amount || 0),
			totalExpenses,
			loansIssued: totalLoansIssued,
			netIncome,
			profitMargin: totalRevenue > 0 ? (netIncome / totalRevenue) * 100 : 0,
			memberDeposits: Number(deposits._sum.amount || 0),
			fromDate: from.toISOString().split("T")[0],
			toDate: to.toISOString().split("T")[0],
		};
	}

	/**
	 * Get loan portfolio breakdown by status
	 */
	async getLoanPortfolioBreakdown() {
		const statuses = ["DISBURSED", "COMPLETED", "DEFAULTED", "CANCELLED"];
		const breakdown = [];

		for (const status of statuses) {
			const loans = await prisma.loan.findMany({
				where: { status: status } as any,
			});

			const totalAmount = loans.reduce((sum, l) => sum + Number(l.amount), 0);

			breakdown.push({
				status,
				count: loans.length,
				totalAmount,
			});
		}

		return breakdown;
	}

	/**
	 * Get member demographics
	 */
	async getMemberDemographics() {
		const totalMembers = await prisma.member.count();

		const activeMembers = await prisma.member.count();

		const membersWithLoans = await prisma.loan.findMany({
			distinct: ["memberId"],
		});

		const membersWithSavings = await prisma.transaction.findMany({
			where: { type: "SAVINGS" },
			distinct: ["memberId"],
		});

		return {
			totalMembers,
			activeMembers,
			inactiveMembers: totalMembers - activeMembers,
			membersWithLoans: membersWithLoans.length,
			membersWithSavings: membersWithSavings.length,
			activationRate:
				totalMembers > 0 ? (activeMembers / totalMembers) * 100 : 0,
		};
	}
}
