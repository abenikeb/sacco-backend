import { prisma } from "@/src/config/prisma";
import { LoanApprovalStatus, Prisma, TransactionType } from "@prisma/client";
import {
	createJournalEntry,
	mapToAccountingType,
} from "../utils/accountingUtils";
import { AccountingService } from "./accountingService";
const accountingService = new AccountingService();
export interface UpdateMemberInput extends Partial<CreateMemberInput> {}
export interface CreateMemberInput {
	name: string;
	email?: string;
	phone?: string;
	etNumber: number;
	department?: string;
	division?: string;
	section?: string;
	group?: string;
	salary?: number;
	national_id_front?: string;
	national_id_back?: string;
}

export class MemberService {
	async importMembers(membersData = []) {
		const skipped = [];
		const failed = [];

		const importedCount = await prisma.$transaction(async (tx) => {
			let count = 0;

			for (const memberData of membersData) {
				try {
					const memberNumber = memberData["Employee Number"];
					const etNumber = memberData["ET Number"];

					if (isNaN(memberNumber) || isNaN(etNumber)) {
						skipped.push(memberData.Name);
						continue;
					}

					const jsDate = new Date(
						(memberData["Effective Date"] - 25569) * 86400 * 1000
					);

					//Upsert Member
					const member = await tx.member.upsert({
						where: { etNumber },
						update: {
							name: memberData.Name,
							division: memberData.Division,
							department: memberData.Department || null,
							section: memberData.Section,
							group: memberData.Group,
						},
						create: {
							memberNumber,
							etNumber,
							name: memberData.Name,
							division: memberData.Division,
							department: memberData.Department || null,
							section: memberData.Section,
							group: memberData.Group,
						},
					});

					//Handle Loan Repayment if applicable
					const repaymentAmount =
						memberData["Credit Association Loan Repayment"];
					if (repaymentAmount > 0) {
						await this.handleLoanRepayment(
							tx,
							member.id,
							repaymentAmount,
							jsDate,
							"ERP_PAYROLL",
							`BULK_IMPORT_${jsDate.getTime()}`
						);
					}

					//Create Transactions
					const txList = [
						["SAVINGS", memberData["Credit Association Savings"]],
						["MEMBERSHIP_FEE", memberData["Credit Association Membership Fee"]],
						[
							"REGISTRATION_FEE",
							memberData["Credit Association Registration Fee"],
						],
						["COST_OF_SHARE", memberData["Credit Association Cost of Share"]],
						["PURCHASE", memberData["Credit Association Purchases"]],
						[
							"WILLING_DEPOSIT",
							memberData["Credit Association Willing Deposit"],
						],
					]
						.filter(([_, amt]) => amt > 0)
						.map(([type, amt]) => ({
							memberId: member.id,
							type,
							amount: amt,
							transactionDate: jsDate,
						}));

					if (txList.length > 0) {
						const transactions = await tx.transaction.createMany({
							data: txList,
						});

						for (const t of txList) {
							const reference = `REF-${t.type}-${member.name}-${jsDate.toISOString().split("T")[0]}`;

							if (
								t.type === "SAVINGS" ||
								t.type === "WILLING_DEPOSIT" ||
								t.type === "REGISTRATION_FEE" ||
								t.type === "MEMBERSHIP_FEE" ||
								t.type === "COST_OF_SHARE"
							) {
								// Record as savings/deposit
								await accountingService.recordSavingsTransaction(
									member.id,
									Number(t.amount),
									jsDate,
									reference
								);
							}
						}
					}
					count++;
				} catch (err) {
					console.error(`❌ Failed to import member ${memberData.Name}:`, err);
					failed.push(memberData.Name);
				}
			}

			return count;
		});

		return { importedCount, skipped, failed };
	}

	async handleLoanRepayment(
		prismaTx,
		memberId,
		repaymentAmount,
		repaymentDate,
		sourceType,
		reference
	) {
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

		if (!activeLoan) return;

		let remaining = repaymentAmount;

		for (const repayment of activeLoan.loanRepayments) {
			if (remaining <= 0) break;
			const unpaid = Number(repayment.amount) - Number(repayment.paidAmount);
			if (unpaid <= 0) continue;

			const apply = Math.min(remaining, unpaid);
			const newPaid = Number(repayment.paidAmount) + apply;
			const newStatus =
				newPaid >= Number(repayment.amount) ? "PAID" : "PENDING";

			await prismaTx.loanRepayment.update({
				where: { id: repayment.id },
				data: { paidAmount: newPaid, repaymentDate, status: newStatus },
			});

			remaining -= apply;
		}

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

		const newRemaining = Number(activeLoan.amount) - Number(totalRepaid);
		await prismaTx.loan.update({
			where: { id: activeLoan.id },
			data: {
				remainingAmount: newRemaining,
				...(newRemaining <= 0 && { status: LoanApprovalStatus.REPAID }),
			},
		});
	}
	/**
	 * Create a new member with validation
	 */
	async createMember(data: CreateMemberInput) {
		// Validate etNumber is unique
		const existingMember = await prisma.member.findUnique({
			where: { etNumber: data.etNumber },
		});

		if (existingMember) {
			throw new Error(`Member with etNumber ${data.etNumber} already exists`);
		}

		// Validate email is unique if provided
		if (data.email) {
			const existingEmail = await prisma.member.findFirst({
				where: { email: data.email },
			});

			if (existingEmail) {
				throw new Error(`Email ${data.email} is already registered`);
			}
		}

		// Create member
		const member = await prisma.member.create({
			data: {
				name: data.name,
				email: data.email,
				phone: data.phone,
				etNumber: data.etNumber,
				department: data.department,
				division: data.division,
				section: data.section,
				group: data.group,
				salary: data.salary || 0,
				national_id_front: data.national_id_front,
				national_id_back: data.national_id_back,
				memberNumber: data.etNumber, // Assuming memberNumber is same as etNumber initially
			},
		});

		// // Create initial member balance
		// await prisma.memberBalance.create({
		// 	data: {
		// 		memberId: member.id,
		// 		balance: 0,
		// 	},
		// });

		// // Add to member history
		// await prisma.memberHistory.create({
		// 	data: {
		// 		memberId: member.id,
		// 		action: "Member registered",
		// 	},
		// });

		return member;
	}

	/**
	 * Get member by ID with related data
	 */
	async getMemberById(id: number) {
		const member = await prisma.member.findUnique({
			where: { id },
			include: {
				balance: true,
				history: {
					// orderBy: { createdAt: "desc" },
					take: 10,
				},
				withdrawalRequests: {
					orderBy: { createdAt: "desc" },
					take: 5,
				},
			},
		});

		if (!member) {
			throw new Error(`Member with ID ${id} not found`);
		}

		return member;
	}

	/**
	 * Get member by etNumber
	 */
	async getMemberByEtNumber(etNumber: number) {
		const member = await prisma.member.findUnique({
			where: { etNumber },
			include: {
				balance: true,
				history: {
					// orderBy: { createdAt: "desc" },
					take: 10,
				},
			},
		});

		if (!member) {
			throw new Error(`Member with etNumber ${etNumber} not found`);
		}

		return member;
	}

	/**
	 * List all members with pagination and filtering
	 */
	async listMembers(options?: {
		skip?: number;
		take?: number;
		department?: string;
		division?: string;
	}) {
		const skip = options?.skip || 0;
		const take = options?.take || 10;

		const where: Prisma.MemberWhereInput = {};

		if (options?.department) {
			where.department = options.department;
		}

		if (options?.division) {
			where.division = options.division;
		}

		const [members, total] = await Promise.all([
			prisma.member.findMany({
				where,
				skip,
				take,
				include: {
					balance: true,
				},
				orderBy: { createdAt: "desc" },
			}),
			prisma.member.count({ where }),
		]);

		return {
			members,
			total,
			skip,
			take,
			pages: Math.ceil(total / take),
		};
	}

	/**
	 * Update member data
	 */
	async updateMember(id: number, data: UpdateMemberInput) {
		const member = await prisma.member.findUnique({
			where: { id },
		});

		if (!member) {
			throw new Error(`Member with ID ${id} not found`);
		}

		// If etNumber is being updated, check uniqueness
		if (data.etNumber && data.etNumber !== member.etNumber) {
			const existingMember = await prisma.member.findUnique({
				where: { etNumber: data.etNumber },
			});

			if (existingMember) {
				throw new Error(`Member with etNumber ${data.etNumber} already exists`);
			}
		}

		// If email is being updated, check uniqueness
		if (data.email && data.email !== member.email) {
			const existingEmail = await prisma.member.findFirst({
				where: {
					email: data.email,
					NOT: { id },
				},
			});

			if (existingEmail) {
				throw new Error(`Email ${data.email} is already registered`);
			}
		}

		const updatedMember = await prisma.member.update({
			where: { id },
			data: {
				...data,
				salary: Number(data.salary),
			},
			include: {
				balance: true,
			},
		});

		return updatedMember;
	}

	/**
	 * Delete member
	 */
	async deleteMember(id: number) {
		const member = await prisma.member.findUnique({
			where: { id },
		});

		if (!member) {
			throw new Error(`Member with ID ${id} not found`);
		}

		// Delete related data
		await prisma.memberBalance.deleteMany({
			where: { memberId: id },
		});

		await prisma.memberHistory.deleteMany({
			where: { memberId: id },
		});

		await prisma.member.delete({
			where: { id },
		});

		return { success: true, message: "Member deleted successfully" };
	}
}
