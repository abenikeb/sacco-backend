import xmlrpc from "xmlrpc";

export const ODOO_CONFIG = {
	host: "116.202.104.180",
	port: 8069,
	db: "test",
	username: "admin",
	password: "admin",
	commonPath: "/xmlrpc/2/common",
	objectPath: "/xmlrpc/2/object",
};

export function mapToAccountingType(transactionType: string): string {
	switch (transactionType) {
		case "SAVINGS":
		case "WILLING_DEPOSIT":
			return "SAVINGS"; //deposit
		case "REGISTRATION_FEE":
			return "SAVINGS"; //deposit
		case "MEMBERSHIP_FEE":
			return "SAVINGS"; //deposit
		case "COST_OF_SHARE":
			return "SAVINGS"; //deposit
		case "PURCHASE":
			return "PURCHASE"; //withdrawal
		case "LOAN_REPAYMENT":
			return "LOAN_REPAYMENT"; //loanRepayment
		default:
			throw new Error(`Unknown accounting mapping for: ${transactionType}`);
	}
}

export async function createJournalEntry(transactionDetails: any) {
	return true;
	// try {
	// 	// Odoo server details
	// 	const host = "116.202.104.180";
	// 	const port = 8069;
	// 	const db = "test";
	// 	const username = "admin";
	// 	const password = "admin";

	// 	// Define account mapping
	// 	const accounts = {
	// 		cash: {
	// 			id: 102,
	// 			code: "211002",
	// 			name: "Cash",
	// 			account_type: "asset_cash",
	// 		},
	// 		bank: {
	// 			id: 101,
	// 			code: "211001",
	// 			name: "Bank",
	// 			account_type: "asset_cash",
	// 		},
	// 		tradeDebtors: {
	// 			id: 9,
	// 			code: "221100",
	// 			name: "Trade Debtors",
	// 			account_type: "asset_receivable",
	// 		},
	// 		suspense: {
	// 			id: 5,
	// 			code: "220100",
	// 			name: "Suspense",
	// 			account_type: "asset_receivable",
	// 		},
	// 		otherDeposits: {
	// 			id: 38,
	// 			code: "305400",
	// 			name: "Other deposits",
	// 			account_type: "liability_current",
	// 		},
	// 		commercialLoan: {
	// 			id: 40,
	// 			code: "310300",
	// 			name: "Commercial Loan",
	// 			account_type: "liability_current",
	// 		},
	// 		salesIncome: {
	// 			id: 1,
	// 			code: "110000",
	// 			name: "Sales of Goods and Services",
	// 			account_type: "income",
	// 		},
	// 		exchangeGain: {
	// 			id: 98,
	// 			code: "120000",
	// 			name: "Foreign Exchange Currency Gain Account",
	// 			account_type: "income_other",
	// 		},
	// 		interestExpense: {
	// 			id: 97,
	// 			code: "643400",
	// 			name: "Payments of interest and bank charges on local debt",
	// 			account_type: "expense",
	// 		},
	// 		feeExpense: {
	// 			id: 81,
	// 			code: "625600",
	// 			name: "Fees and charges",
	// 			account_type: "expense",
	// 		},
	// 		equity: {
	// 			id: 42,
	// 			code: "401000",
	// 			name: "Share capital / equity",
	// 			account_type: "equity",
	// 		},
	// 		undistributedProfits: {
	// 			id: 109,
	// 			code: "999999",
	// 			name: "Undistributed Profits/Losses",
	// 			account_type: "equity_unaffected",
	// 		},
	// 		cashDifferenceGain: {
	// 			id: 106,
	// 			code: "999001",
	// 			name: "Cash Difference Gain",
	// 			account_type: "income_other",
	// 		},
	// 		cashDifferenceLoss: {
	// 			id: 107,
	// 			code: "999002",
	// 			name: "Cash Difference Loss",
	// 			account_type: "expense",
	// 		},
	// 	};

	// 	// Initialize line items
	// 	const lineItems = [];

	// 	// Handle different transaction types
	// 	switch (transactionDetails.type) {
	// 		case "SAVINGS":
	// 		case "WILLING_DEPOSIT":
	// 			lineItems.push(
	// 				[
	// 					0,
	// 					0,
	// 					{
	// 						account_id: accounts.cash.id,
	// 						name: "Cash",
	// 						debit: transactionDetails.amount,
	// 						credit: 0,
	// 					},
	// 				],
	// 				[
	// 					0,
	// 					0,
	// 					{
	// 						account_id: accounts.otherDeposits.id,
	// 						name: "Deposit Liability",
	// 						debit: 0,
	// 						credit: transactionDetails.amount,
	// 					},
	// 				]
	// 			);
	// 			break;

	// 		case "LOAN_DISBURSEMENT":
	// 			lineItems.push(
	// 				[
	// 					0,
	// 					0,
	// 					{
	// 						account_id: accounts.tradeDebtors.id,
	// 						name: "Loan Receivable",
	// 						debit: transactionDetails.amount,
	// 						credit: 0,
	// 					},
	// 				],
	// 				[
	// 					0,
	// 					0,
	// 					{
	// 						account_id: accounts.cash.id,
	// 						name: "Cash",
	// 						debit: 0,
	// 						credit: transactionDetails.amount,
	// 					},
	// 				]
	// 			);
	// 			break;

	// 		case "LOAN_REPAYMENT":
	// 			lineItems.push(
	// 				[
	// 					0,
	// 					0,
	// 					{
	// 						account_id: accounts.cash.id,
	// 						name: "Cash",
	// 						debit: transactionDetails.amount,
	// 						credit: 0,
	// 					},
	// 				],
	// 				[
	// 					0,
	// 					0,
	// 					{
	// 						account_id: accounts.tradeDebtors.id,
	// 						name: "Loan Receivable",
	// 						debit: 0,
	// 						credit: transactionDetails.amount,
	// 					},
	// 				]
	// 			);
	// 			if (transactionDetails.interest > 0) {
	// 				lineItems.push(
	// 					[
	// 						0,
	// 						0,
	// 						{
	// 							account_id: accounts.cash.id,
	// 							name: "Cash",
	// 							debit: transactionDetails.interest,
	// 							credit: 0,
	// 						},
	// 					],
	// 					[
	// 						0,
	// 						0,
	// 						{
	// 							account_id: accounts.salesIncome.id,
	// 							name: "Interest Income",
	// 							debit: 0,
	// 							credit: transactionDetails.interest,
	// 						},
	// 					]
	// 				);
	// 			}
	// 			break;

	// 		case "WITHDRAWAL":
	// 			lineItems.push(
	// 				[
	// 					0,
	// 					0,
	// 					{
	// 						account_id: accounts.otherDeposits.id,
	// 						name: "Deposit Liability",
	// 						debit: transactionDetails.amount,
	// 						credit: 0,
	// 					},
	// 				],
	// 				[
	// 					0,
	// 					0,
	// 					{
	// 						account_id: accounts.cash.id,
	// 						name: "Cash",
	// 						debit: 0,
	// 						credit: transactionDetails.amount,
	// 					},
	// 				]
	// 			);
	// 			break;

	// 		case "INTEREST_INCOME":
	// 			lineItems.push(
	// 				[
	// 					0,
	// 					0,
	// 					{
	// 						account_id: accounts.cash.id,
	// 						name: "Cash",
	// 						debit: transactionDetails.amount,
	// 						credit: 0,
	// 					},
	// 				],
	// 				[
	// 					0,
	// 					0,
	// 					{
	// 						account_id: accounts.salesIncome.id,
	// 						name: "Interest Income",
	// 						debit: 0,
	// 						credit: transactionDetails.amount,
	// 					},
	// 				]
	// 			);
	// 			break;

	// 		case "INTEREST_EXPENSE":
	// 			lineItems.push(
	// 				[
	// 					0,
	// 					0,
	// 					{
	// 						account_id: accounts.interestExpense.id,
	// 						name: "Interest Expense",
	// 						debit: transactionDetails.amount,
	// 						credit: 0,
	// 					},
	// 				],
	// 				[
	// 					0,
	// 					0,
	// 					{
	// 						account_id: accounts.cash.id,
	// 						name: "Cash",
	// 						debit: 0,
	// 						credit: transactionDetails.amount,
	// 					},
	// 				]
	// 			);
	// 			break;

	// 		default:
	// 			throw new Error(
	// 				`Unsupported transaction type: ${transactionDetails.type}`
	// 			);
	// 	}

	// 	// Create XML-RPC client
	// 	const commonClient = xmlrpc.createClient({
	// 		host,
	// 		port,
	// 		path: "/xmlrpc/2/common",
	// 	});

	// 	// Authenticate and create journal entry
	// 	const uid = await new Promise((resolve, reject) => {
	// 		commonClient.methodCall(
	// 			"authenticate",
	// 			[db, username, password, {}],
	// 			(error: any, result: any) => {
	// 				if (error) reject(error);
	// 				else resolve(result);
	// 			}
	// 		);
	// 	});

	// 	const objectClient = xmlrpc.createClient({
	// 		host,
	// 		port,
	// 		path: "/xmlrpc/2/object",
	// 	});

	// 	const journalEntry = {
	// 		move_type: "entry",
	// 		journal_id: transactionDetails.journalId || 3,
	// 		date: transactionDetails.date || new Date().toISOString().split("T")[0],
	// 		ref:
	// 			transactionDetails.reference ||
	// 			`Microfinance Transaction: ${transactionDetails.type}`,
	// 		line_ids: lineItems,
	// 	};

	// 	const entryId = await new Promise((resolve, reject) => {
	// 		objectClient.methodCall(
	// 			"execute_kw",
	// 			[db, uid, password, "account.move", "create", [journalEntry]],
	// 			(error: any, result: any) => {
	// 				if (error) reject(error);
	// 				else resolve(result);
	// 			}
	// 		);
	// 	});

	// 	console.log(`✅ Journal entry created with ID: ${entryId}`);
	// 	return entryId;
	// } catch (error: any) {
	// 	console.error("❌ Error in createJournalEntry:", error.message);
	// 	throw error;
	// }
}
