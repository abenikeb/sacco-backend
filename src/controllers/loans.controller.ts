import express from "express";
import { prisma } from "../config/prisma";
import { getSession } from "./auth/auth";
import {
	LoanApprovalLog,
	Prisma,
	LoanApprovalStatus,
	UserRole,
	TransactionType,
} from "@prisma/client";
import { sendNotification } from "./notification/notification.controller";
import fs from "fs";
import { mkdir, readFile, writeFile } from "fs/promises";
import path from "path";
import multer from "multer";
import { calculateLoan } from "../utils/calculate";
import mime from "mime-types";
import { getContentType } from "../utils/getContentType";
import { createLoanRepayments } from "../utils/calculateLoanRepayment";
import { AccountingService } from "./../services/accountingService";
const accountingService = new AccountingService();

const loansRouter = express.Router();
const APPROVAL_HIERARCHY: UserRole[] = [
	UserRole.ACCOUNTANT,
	UserRole.SUPERVISOR,
	UserRole.MANAGER,
	UserRole.COMMITTEE,
];

const order = new Map<UserRole, number>([
	[UserRole.ACCOUNTANT, 0],
	[UserRole.SUPERVISOR, 1],
	[UserRole.MANAGER, 2],
	[UserRole.COMMITTEE, 3],
]);
const MIN_COMMITTEE_APPROVAL = 1;
const upload = multer();

async function calculateTotalSavings(memberId: number): Promise<number> {
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
		},
	});
	return savingsTransactions.reduce((sum, tx) => sum + Number(tx.amount), 0);
}

async function calculateTotalContributions(memberId: number): Promise<number> {
	const contributionTransactions = await prisma.transaction.findMany({
		where: {
			memberId,
			type: {
				in: [
					TransactionType.MEMBERSHIP_FEE,
					TransactionType.REGISTRATION_FEE,
					TransactionType.COST_OF_SHARE,
					TransactionType.SAVINGS,
					TransactionType.WILLING_DEPOSIT,
				],
			},
		},
	});
	return contributionTransactions.reduce(
		(sum, tx) => sum + Number(tx.amount),
		0
	);
}

async function getActiveLoanBalance(memberId: number) {
	const activeLoan = await prisma.loan.findFirst({
		where: {
			memberId,
			status: {
				in: ["APPROVED", "DISBURSED"],
			},
		},
		include: {
			loanRepayments: true,
		},
	});

	if (!activeLoan) {
		return null;
	}

	const totalRepaid = activeLoan.loanRepayments.reduce(
		(sum, repayment) => sum + Number(repayment.paidAmount || 0),
		0
	);
	const remainingBalance = Number(activeLoan.amount) - totalRepaid;

	return {
		loanId: activeLoan.id,
		totalDisbursed: Number(activeLoan.amount),
		totalRepaid,
		remainingBalance,
		status: activeLoan.status,
	};
}

// Helper function to get the next approver in the hierarchy
async function getNextApproverUserId(
	currentRoleIndex: number
): Promise<number | null> {
	if (currentRoleIndex >= APPROVAL_HIERARCHY.length - 1) {
		return null; // No next approver
	}

	const nextRole = APPROVAL_HIERARCHY[currentRoleIndex + 1];
	const nextApprover = await prisma.user.findFirst({
		where: { role: nextRole },
	});

	return nextApprover?.id || null;
}

// Helper function to get first approver (ACCOUNTANT)
async function getFirstApproverUserId(): Promise<number | null> {
	const firstApprover = await prisma.user.findFirst({
		where: { role: UserRole.ACCOUNTANT },
	});

	return firstApprover?.id || null;
}

async function findLoanProductByContributions(
	totalContributions: number
): Promise<any | null> {
	// Find the highest tier product that the member qualifies for
	const product = await prisma.loanProduct.findFirst({
		where: {
			isActive: true,
			minTotalContributions: {
				lte: totalContributions, // Member's contributions must be >= product's minimum
			},
		},
		orderBy: {
			minTotalContributions: "desc", // Get the highest tier they qualify for
		},
	});

	return product;
}

function calculateMonthlyPayment(
	principal: number,
	annualRate: number,
	months: number
): number {
	const monthlyRate = annualRate / 100 / 12;
	if (monthlyRate === 0) return principal / months;
	return (
		(principal * monthlyRate * Math.pow(1 + monthlyRate, months)) /
		(Math.pow(1 + monthlyRate, months) - 1)
	);
}

async function handleLoanRepayment(
	prismaTx,
	memberId,
	repaymentAmount,
	repaymentDate,
	sourceType,
	reference
) {
	console.log("Handling loan repayment:", {
		memberId,
		repaymentAmount,
		repaymentDate,
		sourceType,
		reference,
	});

	const activeLoan = await prismaTx.loan.findFirst({
		where: { memberId, status: LoanApprovalStatus.DISBURSED },
		include: {
			loanRepayments: {
				orderBy: { repaymentDate: "asc" },
				where: { status: "PENDING" },
			},
		},
		orderBy: { createdAt: "desc" },
	});

	console.log("Active loan found:", activeLoan);

	if (!activeLoan) return;

	let remaining = repaymentAmount;

	for (const repayment of activeLoan.loanRepayments) {
		if (remaining <= 0) break;
		const unpaid = Number(repayment.amount) - Number(repayment.paidAmount);
		if (unpaid <= 0) continue;

		const apply = Math.min(remaining, unpaid);
		const newPaid = Number(repayment.paidAmount) + apply;
		const newStatus = newPaid >= Number(repayment.amount) ? "PAID" : "PENDING";

		await prismaTx.loanRepayment.update({
			where: { id: repayment.id },
			data: { paidAmount: newPaid, repaymentDate, status: newStatus },
		});

		remaining -= apply;
	}
	console.log({
		repaymentAmount,
	});

	if (repaymentAmount > 0) {
		await prismaTx.transaction.create({
			data: {
				memberId,
				type: TransactionType.LOAN_REPAYMENT,
				amount: repaymentAmount,
				transactionDate: repaymentDate,
				reference,
			},
		});

		const currentDate = new Date().toISOString().split("T")[0];
		const interestRate = Number(activeLoan.interestRate) / 100;
		const interestAmount = repaymentAmount * interestRate;
		const principalAmount = repaymentAmount - interestAmount;

		await accountingService.recordLoanRepayment(
			memberId,
			principalAmount,
			interestAmount,
			repaymentDate,
			reference
		);
		// await createJournalEntry({
		// 	type: mapToAccountingType(TransactionType.LOAN_REPAYMENT),
		// 	amount: repaymentAmount,
		// 	interest: 50,
		// 	date: currentDate,
		// 	reference: `${TransactionType.LOAN_REPAYMENT}-${memberId}-${repaymentDate.toISOString()}`,
		// 	journalId: 3,
		// });
	}

	// Update remaining loan balance
	const totalRepaid =
		(
			await prismaTx.loanRepayment.aggregate({
				where: { loanId: activeLoan.id },
				_sum: { paidAmount: true },
			})
		)._sum.paidAmount || 0;

	console.log("Total repaid so far:", totalRepaid);

	const newRemaining = Number(activeLoan.amount) - Number(totalRepaid);
	await prismaTx.loan.update({
		where: { id: activeLoan.id },
		data: {
			remainingAmount: newRemaining,
			...(newRemaining <= 0 && { status: LoanApprovalStatus.REPAID }),
		},
	});
}

loansRouter.get("/", async (req, res) => {
	const session = await getSession(req);
	if (!session || session.role === "MEMBER") {
		return res.status(401).json({ error: "Unauthorized" });
	}

	const userRole = session.role;
	const searchTerm = (req.query.search || "").toString();
	const status = req.query.status?.toString();
	const sortBy = req.query.sortBy?.toString() || "createdAt";
	const sortOrder = (
		req.query.sortOrder?.toString() === "asc" ? "asc" : "desc"
	) as "asc" | "desc";

	const loanId = Number(searchTerm);
	const idFilter = !isNaN(loanId) ? { id: { equals: loanId } } : undefined;

	try {
		const loans = await prisma.loan.findMany({
			where: {
				order: order.get(userRole)!,
				OR: [
					{ member: { name: { contains: searchTerm, mode: "insensitive" } } },
					idFilter,
				].filter(Boolean) as any[],
			},
			include: {
				member: { select: { name: true } },
				approvalLogs: true,
			},
			orderBy: { [sortBy]: sortOrder },
		});

		return res.status(200).json(loans);
	} catch (error) {
		console.log(error);
		return res.status(500).json({ error: "Internal Server Error" });
	}
});

loansRouter.get("/agreement-template", async (req, res) => {
	const session = await getSession(req);
	if (!session || session.role !== "MEMBER") {
		return res.status(401).json({ error: "Unauthorized" });
	}
	try {
		const filePath = path.join(
			process.cwd(),
			"public",
			"loan_agreement_template.pdf"
		);
		const fileBuffer = fs.readFileSync(filePath);

		res.set("Content-Type", "application/pdf");
		res.set(
			"Content-Disposition",
			"attachment; filename=loan_agreement_template.pdf"
		);
		res.send(fileBuffer);
	} catch (error) {
		console.error("Error serving loan agreement template:", error);
		return res
			.status(500)
			.json({ error: "Failed to serve loan agreement template" });
	}
});

loansRouter.get("/approval-history", async (req, res) => {
	const session = await getSession(req);
	if (!session || session.role === "MEMBER") {
		return res.status(401).json({ error: "Unauthorized" });
	}
	const search = (req.query.search || "").toString();
	const status = req.query.status || "ALL";
	const fromDate = req.query.fromDate;
	const toDate = req.query.toDate;
	const page = parseInt((req.query.page ?? "1").toString(), 10);
	const pageSize = parseInt((req.query.pageSize ?? "10").toString(), 10);
	try {
		const where: Prisma.LoanApprovalLogWhereInput = {
			OR: [
				...(Number.isFinite(Number.parseInt(search))
					? [{ loan: { id: Number.parseInt(search) } }]
					: []),
				{
					loan: { member: { name: { contains: search, mode: "insensitive" } } },
				},
				{ user: { name: { contains: search, mode: "insensitive" } } },
			],
			...(status !== "ALL" && {
				status: status as Prisma.EnumLoanApprovalStatusFilter,
			}),
			...(typeof fromDate === "string" &&
				typeof toDate === "string" && {
					approvalDate: {
						gte: new Date(fromDate),
						lte: new Date(toDate),
					},
				}),
		};
		const [approvalLogs, totalCount] = await Promise.all([
			prisma.loanApprovalLog.findMany({
				where,
				include: {
					loan: {
						select: {
							id: true,
							amount: true,
							status: true,
							member: {
								select: {
									name: true,
									etNumber: true,
								},
							},
						},
					},
					user: {
						select: {
							name: true,
						},
					},
				},
				orderBy: [{ loanId: "asc" }, { approvalOrder: "asc" }],
				skip: (page - 1) * pageSize,
				take: pageSize,
			}),
			prisma.loanApprovalLog.count({ where }),
		]);
		const formattedLogs = approvalLogs.map((log) => ({
			id: log.id,
			loanId: log.loanId,
			loanAmount: log.loan.amount,
			loanStatus: log.loan.status,
			memberName: log.loan.member.name,
			memberEtNumber: log.loan.member.etNumber,
			approvedBy: log.user.name,
			approverRole: log.role,
			status: log.status,
			approvalOrder: log.approvalOrder,
			comments: log.comments,
			approvalDate: log.approvalDate,
		}));
		return res.json({
			logs: formattedLogs,
			totalCount,
			totalPages: Math.ceil(totalCount / pageSize),
		});
	} catch (error) {
		console.error("Error fetching approval history:", error);
		return res.status(500).json({ error: "Failed to fetch approval history" });
	}
});

loansRouter.get("/pending", async (req, res) => {
	const session = await getSession(req);
	if (!session || session.role === "MEMBER") {
		return res.status(401).json({ error: "Unauthorized" });
	}
	const userRole = session.role as UserRole;

	const pendingLoans = await prisma.loan.findMany({
		where: {
			order: order.get(userRole)!,
			status: "PENDING",
			approvalLogs: {
				some: {
					approvalOrder: 0,
				},
			},
		},
		include: {
			member: true,
			approvalLogs: {
				orderBy: { approvalOrder: "desc" },
				take: 1,
			},
		},
	});

	return res.json(pendingLoans);
});

loansRouter.get("/disbursed", async (req, res) => {
	const session = await getSession(req);
	if (!session || session.role !== "COMMITTEE") {
		return res.status(401).json({ error: "Unauthorized" });
	}
	try {
		const disbursedLoans = await prisma.loan.findMany({
			where: {
				status: "DISBURSED",
				order: 3,
			},
			include: {
				member: {
					select: {
						name: true,
						etNumber: true,
					},
				},
				loanRepayments: {
					select: {
						id: true,
						amount: true,
						repaymentDate: true,
						status: true,
					},
				},
			},
			orderBy: {
				createdAt: "desc",
			},
		});

		return res.json(disbursedLoans);
	} catch (error) {
		console.error("Error fetching disbursed loans:", error);
		return res.status(500).json({ error: "Failed to fetch disbursed loans" });
	}
});

loansRouter.post("/:loanId/repayments/:repaymentId/pay", async (req, res) => {
	const session = await getSession(req);
	if (!session || session.role === "MEMBER") {
		return res.status(401).json({ error: "Unauthorized" });
	}
	const { loanId, repaymentId } = req.params;
	const { amount, reference, sourceType, memberId } = req.body;

	try {
		if (!memberId) {
			return res
				.status(400)
				.json({ error: "Member ID is required for repayment." });
		}

		const repaymentAmount = Number(amount);
		if (isNaN(repaymentAmount) || repaymentAmount <= 0) {
			return res
				.status(400)
				.json({ error: "Invalid repayment amount provided." });
		}

		if (!reference || reference.trim() === "") {
			return res
				.status(400)
				.json({ error: "Reference is required for repayment." });
		}

		const repaymentDate = new Date();

		const result = await prisma.$transaction(async (prismaTx) => {
			await handleLoanRepayment(
				prismaTx,
				memberId,
				repaymentAmount,
				repaymentDate,
				sourceType,
				reference
			);

			// Return updated repayment details for response clarity
			const updatedRepayment = await prismaTx.loanRepayment.findUnique({
				where: { id: Number(repaymentId) },
				include: {
					loan: true,
				},
			});

			return updatedRepayment;
		});

		return res.json({
			message: "Loan repayment processed successfully.",
			data: result,
		});
	} catch (error) {
		console.error("Error processing loan repayment:", error);
		return res.status(500).json({
			error: "Failed to process loan repayment.",
			details: error.message,
		});
	}
});

loansRouter.post("/apply", upload.single("agreement"), async (req, res) => {
	const session = await getSession(req);
	if (!session || session.role !== "MEMBER") {
		return res.status(401).json({ error: "Unauthorized" });
	}

	try {
		const { amount, tenureMonths, purpose, coSigner1, coSigner2 } = req.body;
		const agreement = req.file;

		if (!amount || !tenureMonths || !purpose || !agreement) {
			return res.status(400).json({ error: "Missing required fields" });
		}

		const member = await prisma.member.findUnique({
			where: { id: session.id! },
			include: {
				loans: {
					where: {
						status: {
							in: ["PENDING", "APPROVED", "DISBURSED"],
						},
					},
				},
			},
		});

		if (!member) {
			return res.status(404).json({ error: "Member not found" });
		}

		const totalSavings = await calculateTotalSavings(member.id);
		const totalContributions = await calculateTotalContributions(member.id);
		const monthlySalary = member.salary || 0;

		const loanProduct =
			await findLoanProductByContributions(totalContributions);

		if (!loanProduct) {
			return res.status(400).json({
				error: `You do not qualify for any loan product. Minimum total contributions required: ${(await prisma.loanProduct.findFirst({ where: { isActive: true }, orderBy: { minTotalContributions: "asc" } }))?.minTotalContributions || 0} ETB. Your current contributions: ${totalContributions.toLocaleString()} ETB`,
				requirement: "Minimum Total Contributions",
				minimumRequired:
					(
						await prisma.loanProduct.findFirst({
							where: { isActive: true },
							orderBy: { minTotalContributions: "asc" },
						})
					)?.minTotalContributions || 0,
				currentContributions: totalContributions,
			});
		}

		const loanAmount = Number.parseFloat(amount);
		const tenure = Number.parseInt(tenureMonths, 10);

		if (
			tenure < loanProduct.minDurationMonths ||
			tenure > loanProduct.maxDurationMonths + 1
		) {
			return res.status(400).json({
				error: `Loan tenure must be between ${loanProduct.minDurationMonths} and ${loanProduct.maxDurationMonths} months for ${loanProduct.name}`,
				requirement: "Max Loan Term",
				min: loanProduct.minDurationMonths,
				max: loanProduct.maxDurationMonths,
			});
		}

		const activeLoanBalance = await getActiveLoanBalance(member.id);
		const hasActiveLoan = activeLoanBalance !== null;

		const maxLoanBasedOnSalary =
			monthlySalary * loanProduct.maxLoanBasedOnSalaryMonths;
		if (loanAmount > maxLoanBasedOnSalary) {
			return res.status(400).json({
				error: `Loan amount exceeds maximum limit based on salary. Maximum: ${maxLoanBasedOnSalary.toLocaleString()} ETB (${loanProduct.maxLoanBasedOnSalaryMonths} months of salary)`,
				requirement: "Loan Limit Based on Salary",
				maxAllowed: maxLoanBasedOnSalary,
			});
		}

		const requiredSavingsBeforeLoan =
			loanAmount * (Number(loanProduct.requiredSavingsPercentage) / 100);
		if (totalSavings < requiredSavingsBeforeLoan) {
			return res.status(400).json({
				error: `Insufficient savings. Required: ${requiredSavingsBeforeLoan.toLocaleString()} ETB (${loanProduct.requiredSavingsPercentage}% of loan amount), Available: ${totalSavings.toLocaleString()} ETB`,
				requirement: "Savings Requirement Before Loan Approval",
				required: requiredSavingsBeforeLoan,
				available: totalSavings,
			});
		}

		if (hasActiveLoan) {
			const requiredMonthlySavings =
				monthlySalary * (Number(loanProduct.requiredSavingsDuringLoan) / 100);
			if (monthlySalary === 0) {
				return res.status(400).json({
					error:
						"Cannot apply for additional loan without valid salary information",
					requirement: "Active Loan Savings Requirement",
				});
			}
		}

		if (hasActiveLoan) {
			return res.status(400).json({
				error: `You have an active loan with remaining balance of ${activeLoanBalance!.remainingBalance.toLocaleString()} ETB. Please repay the existing loan before applying for a new one.`,
				requirement: "Active Loan Balance Tracking",
				activeLoan: activeLoanBalance,
			});
		}

		const fileExtension = path.extname(agreement.originalname);
		const fileName = `loan_agreement_${Date.now()}_${member.id}${fileExtension}`;
		const uploadDir = path.join(process.cwd(), "public", "loan_agreements");
		const filePath = path.join(uploadDir, fileName);

		try {
			await mkdir(uploadDir, { recursive: true });
		} catch (err) {
			if ((err as NodeJS.ErrnoException).code !== "EEXIST") {
				throw err;
			}
		}

		await writeFile(filePath, agreement.buffer);
		const documentUrl = `/loan_agreements/${fileName}`;

		const loan = await prisma.loan.create({
			data: {
				memberId: member.id,
				loanProductId: loanProduct.id,
				amount: loanAmount,
				remainingAmount: loanAmount,
				interestRate: loanProduct.interestRate,
				tenureMonths: tenure,
				status: "PENDING",
				loanDocuments: {
					create: {
						documentType: "AGREEMENT",
						documentContent: agreement.buffer,
						uploadedByUserId: Number(process.env.ADMIN_ID || 5),
						fileName: fileName,
						mimeType: agreement.mimetype,
						documentUrl: documentUrl,
					} as any,
				},
				approvalLogs: {
					create: {
						role: "MEMBER" as UserRole,
						status: "PENDING",
						approvedByUserId: Number(process.env.ADMIN_ID || 5),
						approvalOrder: 0,
						comments: `Loan application submitted. Product: ${loanProduct.name} (auto-assigned based on ${totalContributions.toLocaleString()} ETB total contributions). Amount: ${loanAmount.toLocaleString()} ETB. Purpose: ${purpose}. Co-signers: ${
							coSigner1 ? `ID:${coSigner1}` : "None"
						}, ${coSigner2 ? `ID:${coSigner2}` : "None"}. Savings: ${totalSavings.toLocaleString()} ETB. Monthly Salary: ${monthlySalary.toLocaleString()} ETB`,
					} as any,
				},
			},
		});

		if (!loan) throw Error("Failed to create loan");

		const firstApproverId = await getFirstApproverUserId();
		if (firstApproverId) {
			await sendNotification({
				userId: firstApproverId,
				title: "New Loan Application Pending Review",
				message: `New loan application (ID: ${loan.id}) for ${loanAmount.toLocaleString()} ETB (${loanProduct.name}) submitted by ${member.name}. Savings: ${totalSavings.toLocaleString()} ETB (${((totalSavings / loanAmount) * 100).toFixed(1)}% of loan amount). Awaiting your review.`,
				type: "LOAN_APPLICATION_SUBMITTED",
			});
		}

		return res.json({
			success: true,
			loanId: loan.id,
			documentUrl: documentUrl,
			message: "Loan application submitted successfully",
			loanDetails: {
				amount: loanAmount,
				productName: loanProduct.name,
				interestRate: Number(loanProduct.interestRate),
				tenureMonths: tenure,
				monthlyPayment: calculateMonthlyPayment(
					loanAmount,
					Number(loanProduct.interestRate),
					tenure
				),
			},
		});
	} catch (error) {
		console.error("Error processing loan application:", error);
		return res
			.status(500)
			.json({ error: "Failed to process loan application" });
	}
});

loansRouter.post("/calculate", async (req, res) => {
	try {
		const body = req.body;
		const result = calculateLoan(body);
		return res.status(201).json(result);
	} catch (error) {
		console.error("Error calculating loan:", error);
		return res.status(500).json({ error: "Failed to calculate loan" });
	}
});

loansRouter.get("/documents", async (req, res) => {
	const session = await getSession(req);
	if (
		!session ||
		!["ACCOUNTANT", "COMMITTEE", "MANAGER", "SUPERVISOR", "MEMBER"].includes(
			session.role
		)
	) {
		return res.status(401).json({ error: "Unauthorized" });
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
		console.error("Error fetching document:", error);
		return res.status(500).json({ error: "Internal server error" });
	}
});

loansRouter.post("/documents", upload.single("file"), async (req, res) => {
	const session = await getSession(req);
	if (
		!session ||
		!["ACCOUNTANT", "COMMITTEE", "MANAGER", "SUPERVISOR", "MEMBER"].includes(
			session.role
		)
	) {
		return res.status(401).json({ error: "Unauthorized" });
	}
	try {
		const file = req.file;
		const documentType = req.body.documentType;
		const loanId = Number(req.body.loanId);

		if (!file || !documentType || !loanId) {
			return res.status(400).json({ error: "Missing required fields" });
		}

		const fileContent = file.buffer;

		// Generate a unique document URL
		const documentUrl = `/api/loans/documents/${Date.now()}-${file.originalname}`;

		const document = await prisma.loanDocument.create({
			data: {
				loanId,
				documentType,
				fileName: file.originalname,
				mimeType: file.mimetype,
				documentContent: fileContent,
				uploadedByUserId: session.id,
				documentUrl, // Add the documentUrl field
			} as any,
		});

		return res.json({
			success: true,
			documentId: document.id,
			documentUrl: document.documentUrl,
		});
	} catch (error) {
		console.error("Error fetching document:", error);
		return res.status(500).json({ error: "Internal server error" });
	}
});

loansRouter.get("/:id", async (req, res) => {
	const session = await getSession(req);

	if (!session || !session.id) {
		return res.status(401).json({ error: "Unauthorized" });
	}
	const loanId = Number.parseInt(req.params.id);
	if (!loanId) return res.status(401).json({ error: "Unauthorized" });

	try {
		const loan = await prisma.loan.findUnique({
			where: { id: loanId },
			include: {
				member: {
					select: {
						name: true,
						etNumber: true,
						user: {
							select: {
								email: true,
								phone: true,
							},
						},
					},
				},
				approvalLogs: {
					include: {
						user: {
							select: {
								name: true,
							},
						},
					},
					orderBy: {
						approvalOrder: "asc",
					},
				},
				loanRepayments: {
					orderBy: {
						repaymentDate: "asc",
					},
				},
				loanDocuments: {
					select: {
						id: true,
						documentType: true,
						documentUrl: true,
						fileName: true,
						uploadDate: true,
					},
				},
			},
		});

		if (!loan) {
			return res.status(404).json({ error: "Loan not found" });
		}

		// Restructure the data to match the frontend expectations
		const restructuredLoan = {
			...loan,
			member: {
				...loan.member,
				email: loan.member.user?.email,
				phone: loan.member.user?.phone,
				etNumber: loan.member.etNumber,
			},
			loanRepayments: loan.loanRepayments || [],
			approvalLogs: loan.approvalLogs || [],
			loanDocuments: loan.loanDocuments || [],
		};

		return res.json(restructuredLoan);
	} catch (error) {
		console.error("Error fetching document:", error);
		return res.status(500).json({ error: "Internal server error" });
	}
});

loansRouter.get("/documents/:id", async (req, res) => {
	const session = await getSession(req);
	if (
		!session ||
		!["ACCOUNTANT", "COMMITTEE", "MANAGER", "SUPERVISOR", "MEMBER"].includes(
			session.role
		)
	) {
		return res.status(401).json({ error: "Unauthorized" });
	}
	try {
		const documentId = req.params.id;
		const document = await prisma.loanDocument.findUnique({
			where: { id: Number.parseInt(documentId) },
		});
		if (!document) {
			return res.status(404).json({ error: "Document not found!" });
		}
		if (session.role === "MEMBER") {
			const loan = await prisma.loan.findUnique({
				where: { id: document.loanId },
				select: { memberId: true },
			});
			if (!loan || loan.memberId !== session.etNumber) {
				return res.status(401).json({ error: "Unauthorized" });
			}
		}
		const response = res
			.type(document.mimeType)
			.set("Content-Disposition", `inline; filename="${document.fileName}`);
		return response;
	} catch (error) {
		console.error("Error fetching document:", error);
		return res.status(500).json({ error: "Internal server error" });
	}
});

loansRouter.get("/documents/view", async (req, res) => {
	const session = await getSession(req);
	if (!session || !session.id) {
		return res.status(401).json({ error: "Unauthorized" });
	}
	const url = req.query.url;
	if (!url || typeof url !== "string") {
		return res.status(400).json({ error: "Missing or invalid URL parameter" });
	}
	try {
		let buffer: Buffer;
		let contentType: string;

		if (url.startsWith("http://") || url.startsWith("https://")) {
			const response = await fetch(url);
			const arrayBuffer = await response.arrayBuffer();
			buffer = Buffer.from(arrayBuffer);
			contentType =
				response.headers.get("Content-Type") || "application/octet-stream";
		} else {
			const filePath = path.join(process.cwd(), "public", url);
			buffer = await readFile(filePath);
			contentType = getContentType(filePath);
		}
		res.setHeader("Content-Type", contentType);
		res.setHeader("Content-Disposition", "inline");
		res.send(buffer);
	} catch (error) {
		console.error("Error fetching document:", error);
		return res.status(500).json("Failed to fetch document");
	}
});

loansRouter.post("/approve/:id", async (req, res) => {
	const id = req.params.id;
	const session = await getSession(req);
	if (!session || session.role === "MEMBER") {
		return res.status(401).json({ error: "Unauthorized" });
	}

	const userRole = session.role as UserRole;
	const { status, comment } = req.body;

	try {
		const loan = await prisma.loan.findUnique({
			where: { id: Number.parseInt(id) },
			include: {
				member: true,
				approvalLogs: {
					orderBy: { approvalOrder: "asc" },
				},
			},
		});

		if (!loan) {
			return res.status(404).json({ error: "Loan not found" });
		}

		if (status === "REJECTED") {
			await prisma.loan.update({
				where: { id: loan.id },
				data: {
					status: "REJECTED",
					approvalLogs: {
						create: {
							approvedByUserId: session.id!,
							role: userRole,
							status: "REJECTED",
							approvalOrder: -1,
							comments: comment || "Loan rejected",
						},
					},
				},
			});

			await sendNotification({
				userId: loan.memberId,
				title: "Loan Application Rejected",
				message: `Your loan application (ID: ${loan.id}) for ${loan.amount.toLocaleString()} ETB has been rejected. Reason: ${comment || "No reason provided"}`,
				type: "LOAN_APPROVAL_UPDATE",
			});

			return res.json({
				success: true,
				message: "Loan rejected successfully",
				loan: { id: loan.id, status: "REJECTED" },
			});
		}

		if (status === "APPROVED") {
			const currentRoleIndex = APPROVAL_HIERARCHY.indexOf(userRole);

			if (currentRoleIndex === -1) {
				return res
					.status(400)
					.json({ error: "Invalid user role for approval" });
			}

			// Validate that all previous roles have approved
			for (let i = 0; i < currentRoleIndex; i++) {
				const role = APPROVAL_HIERARCHY[i];
				if (
					!loan.approvalLogs.some(
						(log) => log.role === role && log.status === "APPROVED"
					)
				) {
					return res.status(400).json({
						error: `${role} must approve the loan before ${userRole}`,
					});
				}
			}

			// Check if current role has already approved
			if (
				loan.approvalLogs.some(
					(log) => log.role === userRole && log.status === "APPROVED"
				)
			) {
				return res.status(400).json({
					error: `${userRole} has already approved this loan`,
				});
			}

			if (userRole === UserRole.COMMITTEE) {
				const committeeApprovals = loan.approvalLogs.filter(
					(log) => log.role === UserRole.COMMITTEE && log.status === "APPROVED"
				);

				// If this is the final committee approval (2 approvals needed)
				if (committeeApprovals.length >= MIN_COMMITTEE_APPROVAL - 1) {
					const updatedLoan = await prisma.loan.update({
						where: { id: loan.id },
						data: {
							status: "DISBURSED",
							approvalLogs: {
								create: {
									approvedByUserId: session.id!,
									role: userRole,
									status: "APPROVED",
									approvalOrder: currentRoleIndex,
									comments:
										comment || "Loan approved and disbursed by committee",
									committeeApproval: committeeApprovals.length + 1,
								},
							},
						},
					});

					await createLoanRepayments(updatedLoan);

					await sendNotification({
						userId: loan.memberId,
						title: "Loan Approved and Disbursed",
						message: `Your loan application (ID: ${loan.id}) for ${loan.amount.toLocaleString()} ETB has been approved and disbursed. Monthly payment: ${calculateMonthlyPayment(Number(loan.amount), Number(loan.interestRate), loan.tenureMonths).toLocaleString()} ETB`,
						type: "LOAN_DISBURSEMENT_READY",
					});

					return res.json({
						success: true,
						message: "Loan approved and disbursed successfully",
						loan: updatedLoan,
					});
				}

				// If not yet final approval, add committee approval and wait for next committee member
				const updatedLoan = await prisma.loan.update({
					where: { id: loan.id },
					data: {
						approvalLogs: {
							create: {
								approvedByUserId: session.id!,
								role: userRole,
								status: "APPROVED",
								approvalOrder: currentRoleIndex,
								comments: comment || "Loan approved by committee member",
								committeeApproval: committeeApprovals.length + 1,
							},
						},
					},
				});

				const remainingApprovals =
					MIN_COMMITTEE_APPROVAL - committeeApprovals.length - 1;
				if (remainingApprovals > 0) {
					const otherCommitteeMembers = await prisma.user.findMany({
						where: {
							role: UserRole.COMMITTEE,
							id: { not: session.id! },
						},
					});

					if (otherCommitteeMembers.length > 0) {
						await sendNotification({
							userId: otherCommitteeMembers[0].id,
							title: "Loan Pending Committee Approval",
							message: `Loan application (ID: ${loan.id}) for ${loan.amount.toLocaleString()} ETB is pending your committee approval. ${remainingApprovals} more approval(s) needed.`,
							type: "LOAN_APPROVAL_UPDATE",
						});
					}
				}

				return res.json({
					success: true,
					message: `Loan approved by committee (${committeeApprovals.length + 1}/${MIN_COMMITTEE_APPROVAL} approvals)`,
					loan: updatedLoan,
				});
			}

			const updatedLoan = await prisma.loan.update({
				where: { id: loan.id },
				data: {
					order: { increment: 1 },
					approvalLogs: {
						create: {
							approvedByUserId: session.id!,
							role: userRole,
							status: "APPROVED",
							approvalOrder: currentRoleIndex,
							comments: comment || `Loan approved by ${userRole}`,
						},
					},
				},
			});

			// Get next approver and send notification
			const nextApproverId = await getNextApproverUserId(currentRoleIndex);
			if (nextApproverId) {
				const nextRole = APPROVAL_HIERARCHY[currentRoleIndex + 1];
				await sendNotification({
					userId: nextApproverId,
					title: `Loan Pending ${nextRole} Approval`,
					message: `Loan application (ID: ${loan.id}) for ${loan.amount.toLocaleString()} ETB has been approved by ${userRole} and is now pending your review.`,
					type: "LOAN_STATUS_UPDATE",
				});
			}

			return res.json({
				success: true,
				message: `Loan approved by ${userRole} and forwarded to next approval level`,
				loan: updatedLoan,
			});
		}

		return res.status(400).json({ error: "Invalid approval status" });
	} catch (error) {
		console.error("Error approving loan:", error);
		return res.status(500).json({ error: "Failed to process loan approval" });
	}
});

loansRouter.patch("/status/:id", async (req, res) => {
	const id = req.params.id;
	const session = await getSession(req);
	if (!session || session.role === "MEMBER") {
		return res.status(401).json({ error: "Unauthorized" });
	}
	const loanId = Number.parseInt(id);
	const { status } = await req.body;
	try {
		const updatedLoan = await prisma.loan.update({
			where: { id: loanId },
			data: { status },
		});

		return res.json(updatedLoan);
	} catch (error) {
		console.error("Error updating loan status:", error);
		return res.status(500).json({ error: "Failed to update loan status" });
	}
});

export default loansRouter;
