import { prisma } from "../config/prisma";
import { Decimal } from "@prisma/client/runtime/library";

export class AccountingService {
	/**
	 * Initialize Chart of Accounts with standard accounts
	 */
	async initializeChartOfAccounts() {
		const standardAccounts = [
			// ASSETS
			{ code: "1010", name: "Cash", type: "ASSET" },
			{ code: "1020", name: "Bank Account", type: "ASSET" },
			{ code: "1030", name: "Loan Receivable", type: "ASSET" },
			{ code: "1040", name: "Member Deposits", type: "ASSET" },

			// LIABILITIES
			{ code: "2010", name: "Member Savings Deposits", type: "LIABILITY" },
			{ code: "2020", name: "Loan Payable", type: "LIABILITY" },
			{ code: "2030", name: "Interest Payable", type: "LIABILITY" },

			// EQUITY
			{ code: "3010", name: "Share Capital", type: "EQUITY" },
			{ code: "3020", name: "Retained Earnings", type: "EQUITY" },

			// INCOME
			{ code: "4010", name: "Interest Income", type: "INCOME" },
			{ code: "4020", name: "Membership Fees", type: "INCOME" },
			{ code: "4030", name: "Registration Fees", type: "INCOME" },
			{ code: "4040", name: "Loan Origination Fees", type: "INCOME" },

			// EXPENSES
			{ code: "5010", name: "Interest Expense", type: "EXPENSE" },
			{ code: "5020", name: "Administrative Expenses", type: "EXPENSE" },
			{ code: "5030", name: "Loan Loss Provision", type: "EXPENSE" },
		];

		for (const account of standardAccounts) {
			await prisma.chartOfAccounts.upsert({
				where: { code: account.code },
				update: {},
				create: {
					code: account.code,
					name: account.name,
					accountType: account.type as any,
					isActive: true,
				},
			});
		}

		console.log("✅ Chart of Accounts initialized");
	}

	/**
	 * Create a journal entry with double-entry bookkeeping
	 */
	async createJournalEntry(data: {
		entryDate: Date;
		description: string;
		reference?: string;
		transactionId?: number;
		lines: Array<{
			accountCode: string;
			debit: number;
			credit: number;
			description?: string;
		}>;
	}) {
		return await prisma.$transaction(async (tx) => {
			// Validate double-entry bookkeeping (debit = credit)
			const totalDebit = data.lines.reduce((sum, line) => sum + line.debit, 0);
			const totalCredit = data.lines.reduce(
				(sum, line) => sum + line.credit,
				0
			);

			if (Math.abs(totalDebit - totalCredit) > 0.01) {
				throw new Error(
					`Journal entry not balanced. Debit: ${totalDebit}, Credit: ${totalCredit}`
				);
			}

			// Generate entry number
			const lastEntry = await tx.journalEntry.findFirst({
				orderBy: { id: "desc" },
			});
			const entryNumber = `JE-${String((lastEntry?.id || 0) + 1).padStart(6, "0")}`;

			// Create journal entry
			const journalEntry = await tx.journalEntry.create({
				data: {
					entryNumber,
					entryDate: data.entryDate,
					description: data.description,
					reference: data.reference,
					transactionId: data.transactionId,
					totalDebit: new Decimal(totalDebit),
					totalCredit: new Decimal(totalCredit),
					isBalanced: true,
					status: "POSTED",
				},
			});

			// Create journal lines
			for (const line of data.lines) {
				const account = await tx.chartOfAccounts.findUnique({
					where: { code: line.accountCode },
				});

				if (!account) {
					throw new Error(`Account not found: ${line.accountCode}`);
				}

				await tx.journalLine.create({
					data: {
						journalEntryId: journalEntry.id,
						accountId: account.id,
						debit: new Decimal(line.debit),
						credit: new Decimal(line.credit),
						description: line.description,
					},
				});

				// Create ledger entry
				await tx.generalLedger.create({
					data: {
						accountId: account.id,
						journalEntryId: journalEntry.id,
						debit: new Decimal(line.debit),
						credit: new Decimal(line.credit),
						balance: new Decimal(0), // Will be calculated
						transactionDate: data.entryDate,
						description: line.description,
					},
				});
			}

			return journalEntry;
		});
	}

	/**
	 * Record a savings transaction
	 */
	async recordSavingsTransaction(
		memberId: number,
		amount: number,
		transactionDate: Date,
		reference: string
	) {
		return await this.createJournalEntry({
			entryDate: transactionDate,
			description: `Savings deposit from member ${memberId}`,
			reference,
			lines: [
				{
					accountCode: "1020", // Bank Account (Debit)
					debit: amount,
					credit: 0,
					description: "Cash received",
				},
				{
					accountCode: "2010", // Member Savings Deposits (Credit)
					debit: 0,
					credit: amount,
					description: "Member savings liability",
				},
			],
		});
	}

	/**
	 * Record a loan disbursement
	 */
	async recordLoanDisbursement(
		memberId: number,
		loanAmount: number,
		transactionDate: Date,
		reference: string
	) {
		return await this.createJournalEntry({
			entryDate: transactionDate,
			description: `Loan disbursement to member ${memberId}`,
			reference,
			lines: [
				{
					accountCode: "1030", // Loan Receivable (Debit)
					debit: loanAmount,
					credit: 0,
					description: "Loan given to member",
				},
				{
					accountCode: "1020", // Bank Account (Credit)
					debit: 0,
					credit: loanAmount,
					description: "Cash paid out",
				},
			],
		});
	}

	/**
	 * Record a loan repayment
	 */
	async recordLoanRepayment(
		memberId: number,
		principalAmount: number,
		interestAmount: number,
		transactionDate: Date,
		reference: string
	) {
		return await this.createJournalEntry({
			entryDate: transactionDate,
			description: `Loan repayment from member ${memberId}`,
			reference,
			lines: [
				{
					accountCode: "1020", // Bank Account (Debit)
					debit: principalAmount + interestAmount,
					credit: 0,
					description: "Cash received",
				},
				{
					accountCode: "1030", // Loan Receivable (Credit)
					debit: 0,
					credit: principalAmount,
					description: "Loan principal repaid",
				},
				{
					accountCode: "4010", // Interest Income (Credit)
					debit: 0,
					credit: interestAmount,
					description: "Interest income",
				},
			],
		});
	}

	/**
	 * Record membership fee
	 */
	async recordMembershipFee(
		memberId: number,
		feeAmount: number,
		transactionDate: Date,
		reference: string
	) {
		return await this.createJournalEntry({
			entryDate: transactionDate,
			description: `Membership fee from member ${memberId}`,
			reference,
			lines: [
				{
					accountCode: "1020", // Bank Account (Debit)
					debit: feeAmount,
					credit: 0,
					description: "Cash received",
				},
				{
					accountCode: "4020", // Membership Fees (Credit)
					debit: 0,
					credit: feeAmount,
					description: "Membership fee income",
				},
			],
		});
	}

	/**
	 * Get account balance
	 */
	async getAccountBalance(accountCode: string, asOfDate?: Date) {
		const account = await prisma.chartOfAccounts.findUnique({
			where: { code: accountCode },
		});

		if (!account) {
			throw new Error(`Account not found: ${accountCode}`);
		}

		const ledgerEntries = await prisma.generalLedger.findMany({
			where: {
				accountId: account.id,
				...(asOfDate && { transactionDate: { lte: asOfDate } }),
			},
		});

		let balance = 0;
		for (const entry of ledgerEntries) {
			balance += Number(entry.debit) - Number(entry.credit);
		}

		return {
			accountCode,
			accountName: account.name,
			balance,
			asOfDate: asOfDate || new Date(),
		};
	}

	/**
	 * Get trial balance
	 */
	async getTrialBalance(asOfDate?: Date) {
		const accounts = await prisma.chartOfAccounts.findMany({
			where: { isActive: true },
		});

		const trialBalance = [];
		let totalDebit = 0;
		let totalCredit = 0;

		for (const account of accounts) {
			const ledgerEntries = await prisma.generalLedger.findMany({
				where: {
					accountId: account.id,
					...(asOfDate && { transactionDate: { lte: asOfDate } }),
				},
			});

			let debit = 0;
			let credit = 0;

			for (const entry of ledgerEntries) {
				debit += Number(entry.debit);
				credit += Number(entry.credit);
			}

			const balance = debit - credit;

			if (balance !== 0) {
				trialBalance.push({
					accountCode: account.code,
					accountName: account.name,
					accountType: account.accountType,
					debit: balance > 0 ? balance : 0,
					credit: balance < 0 ? Math.abs(balance) : 0,
				});

				totalDebit += balance > 0 ? balance : 0;
				totalCredit += balance < 0 ? Math.abs(balance) : 0;
			}
		}

		return {
			trialBalance,
			totalDebit,
			totalCredit,
			isBalanced: Math.abs(totalDebit - totalCredit) < 0.01,
			asOfDate: asOfDate || new Date(),
		};
	}

	/**
	 * Get balance sheet
	 */
	async getBalanceSheet(asOfDate?: Date) {
		const trialBalance = await this.getTrialBalance(asOfDate);

		const assets = trialBalance.trialBalance.filter(
			(acc) => acc.accountType === "ASSET"
		);
		const liabilities = trialBalance.trialBalance.filter(
			(acc) => acc.accountType === "LIABILITY"
		);
		const equity = trialBalance.trialBalance.filter(
			(acc) => acc.accountType === "EQUITY"
		);

		const totalAssets = assets.reduce((sum, acc) => sum + acc.debit, 0);
		const totalLiabilities = liabilities.reduce(
			(sum, acc) => sum + acc.credit,
			0
		);
		const totalEquity = equity.reduce((sum, acc) => sum + acc.credit, 0);

		return {
			assets,
			liabilities,
			equity,
			totalAssets,
			totalLiabilities,
			totalEquity,
			totalLiabilitiesAndEquity: totalLiabilities + totalEquity,
			isBalanced:
				Math.abs(totalAssets - (totalLiabilities + totalEquity)) < 0.01,
			asOfDate: asOfDate || new Date(),
		};
	}

	/**
	 * Get income statement
	 */
	async getIncomeStatement(fromDate?: Date, toDate?: Date) {
		const accounts = await prisma.chartOfAccounts.findMany({
			where: { isActive: true },
		});

		const revenues = [];
		const expenses = [];
		let totalRevenue = 0;
		let totalExpense = 0;

		for (const account of accounts) {
			if (
				account.accountType === "INCOME" ||
				account.accountType === "REVENUE"
			) {
				const ledgerEntries = await prisma.generalLedger.findMany({
					where: {
						accountId: account.id,
						...(fromDate && { transactionDate: { gte: fromDate } }),
						...(toDate && { transactionDate: { lte: toDate } }),
					},
				});

				let credit = 0;
				for (const entry of ledgerEntries) {
					credit += Number(entry.credit);
				}

				if (credit !== 0) {
					revenues.push({
						accountCode: account.code,
						accountName: account.name,
						amount: credit,
					});
					totalRevenue += credit;
				}
			} else if (account.accountType === "EXPENSE") {
				const ledgerEntries = await prisma.generalLedger.findMany({
					where: {
						accountId: account.id,
						...(fromDate && { transactionDate: { gte: fromDate } }),
						...(toDate && { transactionDate: { lte: toDate } }),
					},
				});

				let debit = 0;
				for (const entry of ledgerEntries) {
					debit += Number(entry.debit);
				}

				if (debit !== 0) {
					expenses.push({
						accountCode: account.code,
						accountName: account.name,
						amount: debit,
					});
					totalExpense += debit;
				}
			}
		}

		const netIncome = totalRevenue - totalExpense;

		return {
			revenues,
			expenses,
			totalRevenue,
			totalExpense,
			netIncome,
			fromDate: fromDate || new Date(new Date().getFullYear(), 0, 1),
			toDate: toDate || new Date(),
		};
	}

	/**
	 * Get accounting metrics
	 */
	async getAccountingMetrics() {
		const balanceSheet = await this.getBalanceSheet();
		const incomeStatement = await this.getIncomeStatement();

		return {
			totalAssets: balanceSheet.totalAssets,
			totalLiabilities: balanceSheet.totalLiabilities,
			totalEquity: balanceSheet.totalEquity,
			totalRevenue: incomeStatement.totalRevenue,
			totalExpense: incomeStatement.totalExpense,
			netIncome: incomeStatement.netIncome,
			accountCount: await prisma.chartOfAccounts.count({
				where: { isActive: true },
			}),
			journalEntryCount: await prisma.journalEntry.count(),
		};
	}

	/**
	 * Get journal entries with pagination
	 */
	async getJournalEntries(
		page = 1,
		limit = 20,
		fromDate?: Date,
		toDate?: Date
	) {
		const skip = (page - 1) * limit;

		const entries = await prisma.journalEntry.findMany({
			where: {
				...(fromDate && { entryDate: { gte: fromDate } }),
				...(toDate && { entryDate: { lte: toDate } }),
			},
			include: {
				journalLines: {
					include: {
						account: true,
					},
				},
			},
			orderBy: { entryDate: "desc" },
			skip,
			take: limit,
		});

		const total = await prisma.journalEntry.count({
			where: {
				...(fromDate && { entryDate: { gte: fromDate } }),
				...(toDate && { entryDate: { lte: toDate } }),
			},
		});

		return {
			entries,
			pagination: {
				page,
				limit,
				total,
				pages: Math.ceil(total / limit),
			},
		};
	}

	/**
	 * Get general ledger for an account
	 */
	async getGeneralLedger(accountCode: string, fromDate?: Date, toDate?: Date) {
		const account = await prisma.chartOfAccounts.findUnique({
			where: { code: accountCode },
		});

		if (!account) {
			throw new Error(`Account not found: ${accountCode}`);
		}

		const ledgerEntries = await prisma.generalLedger.findMany({
			where: {
				accountId: account.id,
				...(fromDate && { transactionDate: { gte: fromDate } }),
				...(toDate && { transactionDate: { lte: toDate } }),
			},
			orderBy: { transactionDate: "asc" },
		});

		let runningBalance = 0;
		const entries = ledgerEntries.map((entry) => {
			runningBalance += Number(entry.debit) - Number(entry.credit);
			return {
				...entry,
				runningBalance,
			};
		});

		return {
			accountCode,
			accountName: account.name,
			entries,
			fromDate: fromDate || new Date(new Date().getFullYear(), 0, 1),
			toDate: toDate || new Date(),
		};
	}

	/**
	 * Get account distribution by type
	 */
	async getAccountDistribution() {
		const accounts = await prisma.chartOfAccounts.findMany({
			where: { isActive: true },
		});

		const distribution: Record<string, number> = {};

		for (const account of accounts) {
			distribution[account.accountType] =
				(distribution[account.accountType] || 0) + 1;
		}

		return Object.entries(distribution).map(([type, count]) => ({
			type,
			count,
		}));
	}

	/**
	 * Get journal entries trend (last 7 days)
	 */
	async getJournalEntriesTrend() {
		const days = 7;
		const trend = [];

		for (let i = days - 1; i >= 0; i--) {
			const date = new Date();
			date.setDate(date.getDate() - i);
			date.setHours(0, 0, 0, 0);

			const nextDate = new Date(date);
			nextDate.setDate(nextDate.getDate() + 1);

			const count = await prisma.journalEntry.count({
				where: {
					entryDate: {
						gte: date,
						lt: nextDate,
					},
				},
			});

			trend.push({
				day: date.toLocaleDateString("en-US", { weekday: "short" }),
				date: date.toISOString().split("T")[0],
				entries: count,
			});
		}

		return trend;
	}

	/**
	 * Get all chart of accounts
	 */
	async getChartOfAccounts(isActive?: boolean) {
		const accounts = await prisma.chartOfAccounts.findMany({
			where: {
				...(isActive !== undefined && { isActive }),
			},
			orderBy: [{ accountType: "asc" }, { code: "asc" }],
		});

		// Group by account type
		const grouped: Record<string, any[]> = {};
		for (const account of accounts) {
			if (!grouped[account.accountType]) {
				grouped[account.accountType] = [];
			}
			grouped[account.accountType].push(account);
		}

		return {
			accounts,
			grouped,
			total: accounts.length,
		};
	}

	/**
	 * Get general ledger summary for all accounts
	 */
	async getGeneralLedgerSummary(fromDate?: Date, toDate?: Date) {
		const accounts = await prisma.chartOfAccounts.findMany({
			where: { isActive: true },
		});

		const summary = [];

		for (const account of accounts) {
			const ledgerEntries = await prisma.generalLedger.findMany({
				where: {
					accountId: account.id,
					...(fromDate && { transactionDate: { gte: fromDate } }),
					...(toDate && { transactionDate: { lte: toDate } }),
				},
			});

			let totalDebit = 0;
			let totalCredit = 0;
			let balance = 0;

			for (const entry of ledgerEntries) {
				totalDebit += Number(entry.debit);
				totalCredit += Number(entry.credit);
				balance += Number(entry.debit) - Number(entry.credit);
			}

			if (totalDebit !== 0 || totalCredit !== 0) {
				summary.push({
					accountCode: account.code,
					accountName: account.name,
					accountType: account.accountType,
					totalDebit,
					totalCredit,
					balance,
					entryCount: ledgerEntries.length,
				});
			}
		}

		return {
			summary,
			fromDate: fromDate || new Date(new Date().getFullYear(), 0, 1),
			toDate: toDate || new Date(),
		};
	}
}
