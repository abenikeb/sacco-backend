import express from "express";
import { Router, type Request, type Response } from "express";
import { PrismaClient } from "@prisma/client";
import { sendNotification } from "./notification/notification.controller";
import Decimal from "decimal.js";

const router = Router();
const prisma = new PrismaClient();

const withdrawalsRouter = express.Router();

async function getWillingDepositBalance(memberId: number): Promise<number> {
	const transactions = await prisma.transaction.findMany({
		where: {
			memberId,
			type: "WILLING_DEPOSIT",
		},
	});

	const totalDeposited = transactions.reduce(
		(sum, t) => sum + Number(t.amount),
		0
	);

	// Get total withdrawn amount
	const withdrawals = await prisma.withdrawalRequest.findMany({
		where: {
			memberId,
			approvalStatus: "DISBURSED",
		},
	});

	const totalWithdrawn = withdrawals.reduce(
		(sum, w) => sum + Number(w.amount),
		0
	);

	return totalDeposited - totalWithdrawn;
}

async function getNextApproverUserId(
	currentLevel: string
): Promise<number | null> {
	const approvalHierarchy: { [key: string]: string } = {
		ACCOUNTANT: "SUPERVISOR",
		SUPERVISOR: "MANAGER",
		MANAGER: "MANAGER", // Manager is final approver
	};

	const nextRole = approvalHierarchy[currentLevel];
	if (!nextRole) return null;

	const user = await prisma.user.findFirst({
		where: { role: nextRole } as any,
	});

	return user?.id || null;
}

withdrawalsRouter.get(
	"/balance/:memberId",
	async (req: Request, res: Response) => {
		try {
			const { memberId } = req.params;

			const willingDepositBalance = await getWillingDepositBalance(
				Number.parseInt(memberId)
			);

			// Get total deposited and withdrawn for detailed breakdown
			const transactions = await prisma.transaction.findMany({
				where: {
					memberId: Number.parseInt(memberId),
					type: "WILLING_DEPOSIT",
				},
			});

			const totalDeposited = transactions.reduce(
				(sum, t) => sum + Number(t.amount),
				0
			);

			const withdrawals = await prisma.withdrawalRequest.findMany({
				where: {
					memberId: Number.parseInt(memberId),
					approvalStatus: "DISBURSED",
				},
			});

			const totalWithdrawn = withdrawals.reduce(
				(sum, w) => sum + Number(w.amount),
				0
			);

			res.json({
				willingDepositBalance,
				totalDeposited,
				totalWithdrawn,
			});
		} catch (error) {
			console.error("Error fetching balance:", error);
			res.status(500).json({ error: "Failed to fetch balance" });
		}
	}
);

withdrawalsRouter.post("/submit", async (req: Request, res: Response) => {
	try {
		const { memberId, amount } = req.body.data;

		// Validate input
		if (!memberId || !amount || amount <= 0) {
			return res.status(400).json({ error: "Invalid member ID or amount" });
		}

		// Get member
		const member = await prisma.member.findUnique({
			where: { id: memberId },
		});

		if (!member) {
			return res.status(404).json({ error: "Member not found" });
		}

		// Check willing deposit balance
		const willingDepositBalance = await getWillingDepositBalance(memberId);

		if (willingDepositBalance < amount) {
			return res.status(400).json({
				error: "Insufficient willing deposit balance",
				availableBalance: willingDepositBalance,
				requestedAmount: amount,
			});
		}

		// Create withdrawal request
		const withdrawalRequest = await prisma.withdrawalRequest.create({
			data: {
				memberId,
				amount: new Decimal(amount),
				requestedAmount: new Decimal(amount),
				approvalStatus: "PENDING",
			},
		});

		// Get first approver (ACCOUNTANT)
		const accountantUserId = await getNextApproverUserId("ACCOUNTANT");
		if (!accountantUserId) {
			return res
				.status(500)
				.json({ error: "No accountant available for approval" });
		}

		// Send notification to accountant
		await sendNotification({
			userId: accountantUserId,
			title: "New Withdrawal Request",
			message: `Member ${member.name} has requested a withdrawal of ${amount}. Available balance: ${willingDepositBalance}`,
			type: "WITHDRAWAL_REQUEST",
		});

		res.status(201).json({
			success: true,
			withdrawalRequest,
			message: "Withdrawal request submitted successfully",
		});
	} catch (error) {
		console.error("Error submitting withdrawal request:", error);
		res.status(500).json({ error: "Failed to submit withdrawal request" });
	}
});

withdrawalsRouter.get("/pending/:role", async (req: Request, res: Response) => {
	try {
		const { role } = req.params;

		// Map role to approval status
		const statusMap: { [key: string]: string } = {
			ACCOUNTANT: "PENDING",
			SUPERVISOR: "APPROVED_BY_ACCOUNTANT",
			MANAGER: "APPROVED_BY_SUPERVISOR",
		};

		const status = statusMap[role];
		if (!status) {
			return res.status(400).json({ error: "Invalid role" });
		}

		const withdrawalRequests = await prisma.withdrawalRequest.findMany({
			where: { approvalStatus: status } as any,
			include: {
				member: true,
				approvalLogs: {
					include: { approvedByUser: true },
				},
			},
			orderBy: { createdAt: "desc" },
		});

		res.json(withdrawalRequests);
	} catch (error) {
		console.error("Error fetching withdrawal requests:", error);
		res.status(500).json({ error: "Failed to fetch withdrawal requests" });
	}
});

withdrawalsRouter.post("/approve/:id", async (req: Request, res: Response) => {
	try {
		const { id } = req.params;
		const { approvedByUserId, approvalLevel, remarks } = req.body.data;
		console.log({body:req.body})

		// Validate input
		if (!approvedByUserId || !approvalLevel) {
			return res.status(400).json({ error: "Missing required fields" });
		}

		// Get withdrawal request
		const withdrawalRequest = await prisma.withdrawalRequest.findUnique({
			where: { id: Number.parseInt(id) },
			include: { member: true },
		});

		if (!withdrawalRequest) {
			return res.status(404).json({ error: "Withdrawal request not found" });
		}

		// Determine next status
		const statusMap: { [key: string]: string } = {
			ACCOUNTANT: "APPROVED_BY_ACCOUNTANT",
			SUPERVISOR: "APPROVED_BY_SUPERVISOR",
			MANAGER: "APPROVED_BY_MANAGER",
		};

		const newStatus = statusMap[approvalLevel];
		if (!newStatus) {
			return res.status(400).json({ error: "Invalid approval level" });
		}

		// Create approval log
		await prisma.withdrawalApprovalLog.create({
			data: {
				withdrawalRequestId: Number.parseInt(id),
				approvedByUserId,
				approvalLevel,
				status: newStatus,
				remarks,
			} as any,
		});

		// Update withdrawal request status
		const updatedRequest = await prisma.withdrawalRequest.update({
			where: { id: Number.parseInt(id) },
			data: { approvalStatus: newStatus } as any,
		});

		// Get next approver and send notification
		if (approvalLevel !== "MANAGER") {
			const nextApproverUserId = await getNextApproverUserId(approvalLevel);
			if (nextApproverUserId) {
				await sendNotification({
					userId: nextApproverUserId,
					title: `Withdrawal Request Approved by ${approvalLevel}`,
					message: `Withdrawal request of ${withdrawalRequest.amount} from ${withdrawalRequest.member.name} is ready for your approval.`,
					type: "WITHDRAWAL_APPROVAL",
				});
			}
		} else {
			// This creates a negative WILLING_DEPOSIT transaction to reduce the available balance
			await prisma.transaction.create({
				data: {
					memberId: withdrawalRequest.memberId,
					amount: new Decimal(withdrawalRequest.amount).negated(), // Negative amount to deduct
					type: "WILLING_DEPOSIT",
					reference: `Withdrawal disbursed - Request ID: ${id}`,
				},
			});

			// Manager approved - notify member
			// const memberUser = await prisma.user.findFirst({
			// 	where: { memberId: withdrawalRequest.memberId },
			// });
			// if (memberUser) {
			// 	await sendNotification({
			// 		userId: memberUser.id,
			// 		title: "Withdrawal Request Approved",
			// 		message: `Your withdrawal request of ${withdrawalRequest.amount} has been approved and will be disbursed.`,
			// 		type: "WITHDRAWAL_APPROVED",
			// 	});
			// }
		}

		res.json({
			success: true,
			withdrawalRequest: updatedRequest,
			message: "Withdrawal request approved successfully",
		});
	} catch (error) {
		console.error("Error approving withdrawal request:", error);
		res.status(500).json({ error: "Failed to approve withdrawal request" });
	}
});
// withdrawalsRouter.post("/approve/:id", async (req: Request, res: Response) => {
// 	try {
// 		const { id } = req.params;
// 		const { approvedByUserId, approvalLevel, remarks } = req.body.data;

// 		// Validate input
// 		if (!approvedByUserId || !approvalLevel) {
// 			return res.status(400).json({ error: "Missing required fields" });
// 		}

// 		// Get withdrawal request
// 		const withdrawalRequest = await prisma.withdrawalRequest.findUnique({
// 			where: { id: Number.parseInt(id) },
// 			include: { member: true },
// 		});

// 		if (!withdrawalRequest) {
// 			return res.status(404).json({ error: "Withdrawal request not found" });
// 		}

// 		// Determine next status
// 		const statusMap: { [key: string]: string } = {
// 			ACCOUNTANT: "APPROVED_BY_ACCOUNTANT",
// 			SUPERVISOR: "APPROVED_BY_SUPERVISOR",
// 			MANAGER: "APPROVED_BY_MANAGER",
// 		};

// 		const newStatus = statusMap[approvalLevel];
// 		if (!newStatus) {
// 			return res.status(400).json({ error: "Invalid approval level" });
// 		}

// 		// Create approval log
// 		await prisma.withdrawalApprovalLog.create({
// 			data: {
// 				withdrawalRequestId: Number.parseInt(id),
// 				approvedByUserId,
// 				approvalLevel,
// 				status: newStatus,
// 				remarks,
// 			} as any,
// 		});

// 		// Update withdrawal request status
// 		const updatedRequest = await prisma.withdrawalRequest.update({
// 			where: { id: Number.parseInt(id) },
// 			data: { approvalStatus: newStatus } as any,
// 		});

// 		// Get next approver and send notification
// 		if (approvalLevel !== "MANAGER") {
// 			const nextApproverUserId = await getNextApproverUserId(approvalLevel);
// 			if (nextApproverUserId) {
// 				await sendNotification({
// 					userId: nextApproverUserId,
// 					title: `Withdrawal Request Approved by ${approvalLevel}`,
// 					message: `Withdrawal request of ${withdrawalRequest.amount} from ${withdrawalRequest.member.name} is ready for your approval.`,
// 					type: "WITHDRAWAL_APPROVAL",
// 				});
// 			}
// 		} else {
// 			// Manager approved - notify member
// 			// const memberUser = await prisma.user.findFirst({
// 			// 	where: { memberId: withdrawalRequest.memberId },
// 			// });
// 			// if (memberUser) {
// 			// 	await sendNotification({
// 			// 		userId: memberUser.id,
// 			// 		title: "Withdrawal Request Approved",
// 			// 		message: `Your withdrawal request of ${withdrawalRequest.amount} has been approved and will be disbursed.`,
// 			// 		type: "WITHDRAWAL_APPROVED",
// 			// 	});
// 			// }
// 		}

// 		res.json({
// 			success: true,
// 			withdrawalRequest: updatedRequest,
// 			message: "Withdrawal request approved successfully",
// 		});
// 	} catch (error) {
// 		console.error("Error approving withdrawal request:", error);
// 		res.status(500).json({ error: "Failed to approve withdrawal request" });
// 	}
// });

withdrawalsRouter.post("/reject/:id", async (req: Request, res: Response) => {
	try {
		const { id } = req.params;
		const { approvedByUserId, approvalLevel, remarks } = req.body;

		// Validate input
		if (!approvedByUserId || !approvalLevel || !remarks) {
			return res.status(400).json({ error: "Missing required fields" });
		}

		// Get withdrawal request
		const withdrawalRequest = await prisma.withdrawalRequest.findUnique({
			where: { id: Number.parseInt(id) },
			include: { member: true },
		});

		if (!withdrawalRequest) {
			return res.status(404).json({ error: "Withdrawal request not found" });
		}

		// Create rejection log
		await prisma.withdrawalApprovalLog.create({
			data: {
				withdrawalRequestId: Number.parseInt(id),
				approvedByUserId,
				approvalLevel,
				status: "REJECTED",
				remarks,
			},
		});

		// Update withdrawal request status
		const updatedRequest = await prisma.withdrawalRequest.update({
			where: { id: Number.parseInt(id) },
			data: { approvalStatus: "REJECTED" },
		});

		// Notify member of rejection
		const memberUser = await prisma.user.findFirst({
			where: { memberId: withdrawalRequest.memberId } as any,
		});

		if (memberUser) {
			await sendNotification({
				userId: memberUser.id,
				title: "Withdrawal Request Rejected",
				message: `Your withdrawal request of ${withdrawalRequest.amount} has been rejected. Reason: ${remarks}`,
				type: "WITHDRAWAL_REJECTED",
			});
		}

		res.json({
			success: true,
			withdrawalRequest: updatedRequest,
			message: "Withdrawal request rejected successfully",
		});
	} catch (error) {
		console.error("Error rejecting withdrawal request:", error);
		res.status(500).json({ error: "Failed to reject withdrawal request" });
	}
});

withdrawalsRouter.post("/disburse/:id", async (req: Request, res: Response) => {
	try {
		const { id } = req.params;
		const { managerId } = req.body;

		if (!managerId) {
			return res.status(400).json({ error: "Manager ID is required" });
		}

		// Get withdrawal request
		const withdrawalRequest = await prisma.withdrawalRequest.findUnique({
			where: { id: Number.parseInt(id) },
			include: { member: true },
		});

		if (!withdrawalRequest) {
			return res.status(404).json({ error: "Withdrawal request not found" });
		}

		if (withdrawalRequest.approvalStatus !== "APPROVED_BY_MANAGER") {
			return res.status(400).json({
				error:
					"Withdrawal request must be approved by manager before disbursement",
			});
		}

		// This creates a negative WILLING_DEPOSIT transaction to reduce the available balance
		await prisma.transaction.create({
			data: {
				memberId: withdrawalRequest.memberId,
				amount: new Decimal(withdrawalRequest.amount).negated(), // Negative amount to deduct
				type: "WILLING_DEPOSIT",
				reference: `Withdrawal disbursed - Request ID: ${id}`,
			},
		});

		// Update withdrawal request status
		const updatedRequest = await prisma.withdrawalRequest.update({
			where: { id: Number.parseInt(id) },
			data: { approvalStatus: "DISBURSED" },
		});

		// Notify member of disbursement
		// const memberUser = await prisma.user.findFirst({
		// 	where: { memberId: withdrawalRequest.memberId },
		// });

		// if (memberUser) {
		// 	await sendNotification({
		// 		userId: memberUser.id,
		// 		title: "Withdrawal Disbursed",
		// 		message: `Your withdrawal of ${withdrawalRequest.amount} has been successfully disbursed.`,
		// 		type: "WITHDRAWAL_DISBURSED",
		// 	});
		// }

		res.json({
			success: true,
			withdrawalRequest: updatedRequest,
			message: "Withdrawal disbursed successfully",
		});
	} catch (error) {
		console.error("Error disbursing withdrawal:", error);
		res.status(500).json({ error: "Failed to disburse withdrawal" });
	}
});

withdrawalsRouter.get(
	"/history/:memberId",
	async (req: Request, res: Response) => {
		try {
			const { memberId } = req.params;

			const withdrawalRequests = await prisma.withdrawalRequest.findMany({
				where: { memberId: Number.parseInt(memberId) },
				include: {
					approvalLogs: {
						include: { approvedByUser: true },
					},
				},
				orderBy: { createdAt: "desc" },
			});

			res.json(withdrawalRequests);
		} catch (error) {
			console.error("Error fetching withdrawal history:", error);
			res.status(500).json({ error: "Failed to fetch withdrawal history" });
		}
	}
);

export default withdrawalsRouter;
