import express from "express";
const accountingRouter = express.Router();
import { AccountingService } from "@/src/services/accountingService";

const accountingService = new AccountingService();

// Initialize Chart of Accounts
accountingRouter.post("/initialize-coa", async (req, res) => {
	try {
		await accountingService.initializeChartOfAccounts();
		res.status(200).json({ message: "Chart of Accounts initialized" });
	} catch (error: any) {
		res.status(500).json({ error: error.message });
	}
});

// Get account balance
accountingRouter.get("/account-balance/:code", async (req, res) => {
	try {
		const { code } = req.params;
		const { asOfDate } = req.query;
		const balance = await accountingService.getAccountBalance(
			code,
			asOfDate ? new Date(asOfDate as string) : undefined
		);
		res.status(200).json(balance);
	} catch (error: any) {
		res.status(500).json({ error: error.message });
	}
});

// Get trial balance
accountingRouter.get("/trial-balance", async (req, res) => {
	try {
		const { asOfDate } = req.query;
		const trialBalance = await accountingService.getTrialBalance(
			asOfDate ? new Date(asOfDate as string) : undefined
		);
		res.status(200).json(trialBalance);
	} catch (error: any) {
		res.status(500).json({ error: error.message });
	}
});

// Get balance sheet
accountingRouter.get("/balance-sheet", async (req, res) => {
	try {
		const { asOfDate } = req.query;
		const balanceSheet = await accountingService.getBalanceSheet(
			asOfDate ? new Date(asOfDate as string) : undefined
		);
		res.status(200).json(balanceSheet);
	} catch (error: any) {
		res.status(500).json({ error: error.message });
	}
});

// Get income statement
accountingRouter.get("/income-statement", async (req, res) => {
	try {
		const { fromDate, toDate } = req.query;
		const incomeStatement = await accountingService.getIncomeStatement(
			fromDate ? new Date(fromDate as string) : undefined,
			toDate ? new Date(toDate as string) : undefined
		);
		res.status(200).json(incomeStatement);
	} catch (error: any) {
		res.status(500).json({ error: error.message });
	}
});

// Get accounting metrics
accountingRouter.get("/metrics", async (req, res) => {
	try {
		const metrics = await accountingService.getAccountingMetrics();
		res.status(200).json(metrics);
	} catch (error: any) {
		res.status(500).json({ error: error.message });
	}
});

// Get journal entries
accountingRouter.get("/journal-entries", async (req, res) => {
	try {
		const { page = 1, limit = 20, fromDate, toDate } = req.query;
		const journalEntries = await accountingService.getJournalEntries(
			Number(page),
			Number(limit),
			fromDate ? new Date(fromDate as string) : undefined,
			toDate ? new Date(toDate as string) : undefined
		);
		res.status(200).json(journalEntries);
	} catch (error: any) {
		res.status(500).json({ error: error.message });
	}
});

// Get general ledger for an account
accountingRouter.get("/general-ledger/:accountCode", async (req, res) => {
	try {
		const { accountCode } = req.params;
		const { fromDate, toDate } = req.query;
		const ledger = await accountingService.getGeneralLedger(
			accountCode,
			fromDate ? new Date(fromDate as string) : undefined,
			toDate ? new Date(toDate as string) : undefined
		);
		res.status(200).json(ledger);
	} catch (error: any) {
		res.status(500).json({ error: error.message });
	}
});

// Get account distribution
accountingRouter.get("/account-distribution", async (req, res) => {
	try {
		const distribution = await accountingService.getAccountDistribution();
		res.status(200).json(distribution);
	} catch (error: any) {
		res.status(500).json({ error: error.message });
	}
});

// Get journal entries trend (last 7 days)
accountingRouter.get("/journal-trend", async (req, res) => {
	try {
		const trend = await accountingService.getJournalEntriesTrend();
		res.status(200).json(trend);
	} catch (error: any) {
		res.status(500).json({ error: error.message });
	}
});

// Get chart of accounts
accountingRouter.get("/chart-of-accounts", async (req, res) => {
	try {
		const { isActive } = req.query;
		const coa = await accountingService.getChartOfAccounts(
			isActive === "true" ? true : isActive === "false" ? false : undefined
		);
		res.status(200).json(coa);
	} catch (error: any) {
		res.status(500).json({ error: error.message });
	}
});

// Get general ledger summary
accountingRouter.get("/general-ledger-summary", async (req, res) => {
	try {
		const { fromDate, toDate } = req.query;
		const summary = await accountingService.getGeneralLedgerSummary(
			fromDate ? new Date(fromDate as string) : undefined,
			toDate ? new Date(toDate as string) : undefined
		);
		res.status(200).json(summary);
	} catch (error: any) {
		res.status(500).json({ error: error.message });
	}
});

export default accountingRouter;
