import { MemberService } from "../services/memberService";
import { prisma } from "../config/prisma";
import { startOfMonth, endOfMonth, parseISO } from "date-fns";
import { DateTime } from "luxon";
import { getSession, getUserFromRequest } from "./auth/auth";

const memberService = new MemberService();

export const fetchMembers = async (req, res) => {
	const session = await getSession(req);

	if (!session) {
		return res.status(401).json({ error: "Unauthorized" });
	}
	// const url = new URL(req.url);
	const url = new URL(req.url, `http://${req.headers.host}`);
	const effectiveDateStr = url.searchParams.get("effectiveDate");

	let effectiveDate: Date;
	let startDate: Date;
	let endDate: Date;
	if (effectiveDateStr) {
		effectiveDate = DateTime.fromISO(effectiveDateStr, {
			zone: "utc",
		}).toJSDate();
	} else {
		effectiveDate = DateTime.utc().toJSDate(); // Use current date in UTC
	}

	startDate = startOfMonth(effectiveDate);
	endDate = endOfMonth(effectiveDate);

	console.log("API: Effective Date:", effectiveDate.toISOString()); // Debug log
	console.log("API: Start Date:", startDate.toISOString()); // Debug log
	console.log("API: End Date:", endDate.toISOString()); // Debug log

	try {
		const members = await prisma.member.findMany({
			include: {
				balance: true,
				savings: {
					where: {
						savingsDate: {
							gte: startDate,
							lte: endDate,
						},
					},
					orderBy: { savingsDate: "desc" },
				},
				transactions: {
					where: {
						transactionDate: {
							gte: startDate,
							lte: endDate,
						},
					},
					orderBy: { transactionDate: "desc" },
				},
				loans: {
					where: {
						createdAt: {
							lte: endDate,
						},
					},
					include: {
						loanRepayments: {
							where: {
								repaymentDate: {
									gte: startDate,
									lte: endDate,
								},
							},
							orderBy: { repaymentDate: "desc" },
						},
					},
					orderBy: { createdAt: "desc" },
				},
			},
		});

		const formattedMembers = members.map((member) => {
			// Find the most recent transaction for each type within the month
			const savingsTransaction = member.transactions.find(
				(t) => t.type === "SAVINGS"
			);
			const membershipFeeTransaction = member.transactions.find(
				(t) => t.type === "MEMBERSHIP_FEE"
			);
			const willingDepositTransaction = member.transactions.find(
				(t) => t.type === "WILLING_DEPOSIT"
			);
			const loanRepaymentTransaction = member.transactions.find(
				(t) => t.type === "LOAN_REPAYMENT"
			);


			const totalContributions =
				(savingsTransaction ? Number(savingsTransaction.amount) : 0) +
				(membershipFeeTransaction
					? Number(membershipFeeTransaction.amount)
					: 0) +
				(willingDepositTransaction
					? Number(willingDepositTransaction.amount)
					: 0) +
				(loanRepaymentTransaction
					? Number(loanRepaymentTransaction.amount)
					: 0);

			// Calculate total contributions (sum of savings and loan repayments)
			// const totalContributions =
			// 	(savingsTransaction ? Number(savingsTransaction.amount) : 0) +
			// 	(loanRepaymentTransaction
			// 		? Number(loanRepaymentTransaction.amount)
			// 		: 0);
			// const loanRepayments =
			// 	member.loans
			// 		?.flatMap((loan) => loan.loanRepayments)
			// 		.reduce((sum, repayment) => sum + Number(repayment.amount), 0) ?? 0;
			const loanRepayments =
				loanRepaymentTransaction
						? Number(loanRepaymentTransaction.amount)
						: 0

			return {
				id: member.id,
				memberNumber: member.memberNumber,
				etNumber: member.etNumber,
				name: member.name,
				division: member.division,
				department: member.department,
				section: member.section,
				group: member.group,
				effectiveDate: startDate.toISOString(),
				balance: {
					totalSavings: savingsTransaction?.amount ?? 0,
					totalContributions,
					membershipFee: membershipFeeTransaction?.amount ?? 0,
					willingDeposit: willingDepositTransaction?.amount ?? 0,
					loanRepayments,
				},
			};
		});

		return res.json(formattedMembers);
	} catch (error) {
		console.error("Error fetching members:", error);
		return res.status(500).json({ error: "Failed to fetch members" });
	}
};

export const importMembers = async (req, res) => {
	try {
		const membersData = req.body;
		const result = await memberService.importMembers(membersData);
		res.status(200).json(result);
	} catch (err) {
		console.error("Error importing members:", err);
		res
			.status(500)
			.json({ error: "Failed to import members", details: err.message });
	}
};
