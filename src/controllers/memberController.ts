import type { Request, Response } from "express";
import {
	MemberService,
	type CreateMemberInput,
} from "../services/memberService";
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
			const loanRepayments = loanRepaymentTransaction
				? Number(loanRepaymentTransaction.amount)
				: 0;

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

export const registerMember = async (
	req: Request,
	res: Response
): Promise<void> => {
	try {
		console.log("Register Member Request Body:", req.body); // Debug log
		const {
			name,
			email,
			phone,
			etNumber,
			department,
			division,
			section,
			group,
			salary,
		} = req.body;
		const files = req.files as { [fieldname: string]: Express.Multer.File[] };

		// Validate required fields
		if (!name || !etNumber) {
			res.status(400).json({
				error: "Missing required fields",
				required: ["name", "etNumber"],
			});
			return;
		}

		// Validate etNumber is a number
		if (isNaN(Number(etNumber))) {
			res.status(400).json({
				error: "etNumber must be a valid number",
			});
			return;
		}

		// Validate file uploads
		if (!files || !files["national_id_front"] || !files["national_id_back"]) {
			res.status(400).json({
				error: "Missing required files",
				required: ["national_id_front", "national_id_back"],
			});
			return;
		}

		// Validate file types
		const allowedMimeTypes = ["image/jpeg", "image/png", "application/pdf"];
		const frontFile = files["national_id_front"][0];
		const backFile = files["national_id_back"][0];

		if (
			!allowedMimeTypes.includes(frontFile.mimetype) ||
			!allowedMimeTypes.includes(backFile.mimetype)
		) {
			res.status(400).json({
				error: "Invalid file type. Allowed types: JPEG, PNG, PDF",
			});
			return;
		}

		// Validate file size (5MB max)
		const MAX_FILE_SIZE = 5 * 1024 * 1024;
		if (frontFile.size > MAX_FILE_SIZE || backFile.size > MAX_FILE_SIZE) {
			res.status(400).json({
				error: "File size exceeds 5MB limit",
			});
			return;
		}

		const memberData: CreateMemberInput = {
			name,
			email,
			phone,
			etNumber: Number(etNumber),
			department,
			division,
			section,
			group,
			salary: salary ? Number(salary) : 0,
			national_id_front: frontFile.path,
			national_id_back: backFile.path,
		};

		const newMember = await memberService.createMember(memberData);

		res.status(201).json({
			success: true,
			message: "Member registered successfully",
			data: newMember,
		});
	} catch (error) {
		console.error("[v0] Error registering member:", error);
		const errorMessage =
			error instanceof Error ? error.message : "Unknown error";

		if (errorMessage.includes("already exists")) {
			res.status(409).json({
				error: "Conflict",
				message: errorMessage,
			});
		} else {
			res.status(500).json({
				error: "Failed to register member",
				details: errorMessage,
			});
		}
	}
};

export const getMember = async (req: Request, res: Response): Promise<void> => {
	try {
		const { memberId } = req.params;

		if (!memberId || isNaN(Number(memberId))) {
			res.status(400).json({
				error: "Invalid member ID",
			});
			return;
		}

		const member = await memberService.getMemberById(Number(memberId));

		res.json({
			success: true,
			data: member,
		});
	} catch (error) {
		console.error("[v0] Error fetching member:", error);
		const errorMessage =
			error instanceof Error ? error.message : "Unknown error";

		res.status(404).json({
			error: "Not found",
			message: errorMessage,
		});
	}
};

export const getMemberByEtNumber = async (
	req: Request,
	res: Response
): Promise<void> => {
	try {
		const { etNumber } = req.params;

		if (!etNumber || isNaN(Number(etNumber))) {
			res.status(400).json({
				error: "Invalid etNumber",
			});
			return;
		}

		const member = await memberService.getMemberByEtNumber(Number(etNumber));

		res.json({
			success: true,
			data: member,
		});
	} catch (error) {
		console.error("[v0] Error fetching member by etNumber:", error);
		const errorMessage =
			error instanceof Error ? error.message : "Unknown error";

		res.status(404).json({
			error: "Not found",
			message: errorMessage,
		});
	}
};

export const listMembers = async (
	req: Request,
	res: Response
): Promise<void> => {
	try {
		const skip = req.query.skip ? Number(req.query.skip) : 0;
		const take = req.query.take ? Number(req.query.take) : 10;
		const department = req.query.department as string | undefined;
		const division = req.query.division as string | undefined;

		const result = await memberService.listMembers({
			skip,
			take,
			department,
			division,
		});

		res.json({
			success: true,
			data: result,
		});
	} catch (error) {
		console.error("[v0] Error listing members:", error);
		res.status(500).json({
			error: "Failed to list members",
			details: error instanceof Error ? error.message : "Unknown error",
		});
	}
};

export const updateMember = async (
	req: Request,
	res: Response
): Promise<void> => {
	try {
		const { id } = req.params;

		if (!id || isNaN(Number(id))) {
			res.status(400).json({
				error: "Invalid member ID",
			});
			return;
		}

		const updateData: any = req.body;
		const files = req.files as
			| { [fieldname: string]: Express.Multer.File[] }
			| undefined;

		if (files) {
			if (files["national_id_front"]) {
				updateData.national_id_front = files["national_id_front"][0].path;
			}
			if (files["national_id_back"]) {
				updateData.national_id_back = files["national_id_back"][0].path;
			}
		}

		console.log("[v0] Update data received:", updateData);

		// Validate etNumber if provided
		if (updateData.etNumber && isNaN(Number(updateData.etNumber))) {
			res.status(400).json({
				error: "etNumber must be a valid number",
			});
			return;
		}

		const updatedMember = await memberService.updateMember(
			Number(id),
			updateData
		);

		res.json({
			success: true,
			message: "Member updated successfully",
			data: updatedMember,
		});
	} catch (error) {
		console.error("[v0] Error updating member:", error);
		const errorMessage =
			error instanceof Error ? error.message : "Unknown error";

		if (errorMessage.includes("not found")) {
			res.status(404).json({
				error: "Not found",
				message: errorMessage,
			});
		} else if (errorMessage.includes("already")) {
			res.status(409).json({
				error: "Conflict",
				message: errorMessage,
			});
		} else {
			res.status(500).json({
				error: "Failed to update member",
				details: errorMessage,
			});
		}
	}
};

export const deleteMember = async (
	req: Request,
	res: Response
): Promise<void> => {
	try {
		const { id } = req.params;

		if (!id || isNaN(Number(id))) {
			res.status(400).json({
				error: "Invalid member ID",
			});
			return;
		}

		const result = await memberService.deleteMember(Number(id));

		res.json({
			success: true,
			message: result.message,
		});
	} catch (error) {
		console.error("[v0] Error deleting member:", error);
		const errorMessage =
			error instanceof Error ? error.message : "Unknown error";

		res.status(404).json({
			error: "Not found",
			message: errorMessage,
		});
	}
};
