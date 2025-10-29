import { prisma } from "../config/prisma";
import { UserRole } from "@prisma/client";
import * as bcrypt from "bcrypt";

export class SettingsService {
	// Get all users with their roles
	async getAllUsers(page = 1, limit = 20) {
		const skip = (page - 1) * limit;
		const [users, total] = await Promise.all([
			prisma.user.findMany({
				skip,
				take: limit,
				select: {
					id: true,
					name: true,
					email: true,
					phone: true,
					role: true,
					createdAt: true,
					updatedAt: true,
				},
				orderBy: { createdAt: "desc" },
			}),
			prisma.user.count(),
		]);

		return {
			users,
			total,
			page,
			limit,
			totalPages: Math.ceil(total / limit),
		};
	}

	// Get user by ID
	async getUserById(userId: number) {
		return prisma.user.findUnique({
			where: { id: userId },
			select: {
				id: true,
				name: true,
				email: true,
				phone: true,
				role: true,
				createdAt: true,
				updatedAt: true,
			},
		});
	}

	// Update user role
	async updateUserRole(userId: number, role: UserRole) {
		return prisma.user.update({
			where: { id: userId },
			data: { role },
			select: {
				id: true,
				name: true,
				email: true,
				role: true,
				updatedAt: true,
			},
		});
	}

	// Create new user
	async createUser(data: {
		name: string;
		email: string;
		phone: string;
		password: string;
		role: UserRole;
	}) {
		// Check if user already exists
		const existingUser = await prisma.user.findUnique({
			where: { email: data.email },
		});
		if (existingUser) {
			throw new Error("User with this email already exists");
		}

		const roleRecord = await prisma.role.findUnique({
			where: { name: data.role },
		});

		if (!roleRecord) {
			throw new Error(`Role ${data.role} not found in system`);
		}

		// Hash password using bcrypt
		const hashedPassword = await bcrypt.hash(data.password, 10);

		return prisma.user.create({
			data: {
				name: data.name,
				email: data.email,
				phone: data.phone,
				password: hashedPassword,
				role: data.role,
				roleId: roleRecord.id,
			},
			select: {
				id: true,
				name: true,
				email: true,
				phone: true,
				role: true,
				roleId: true,
				createdAt: true,
			},
		});
	}

	// Delete user
	async deleteUser(userId: number) {
		return prisma.user.delete({
			where: { id: userId },
		});
	}

	// Update user
	async updateUser(
		userId: number,
		data: {
			name?: string;
			email?: string;
			phone?: string;
			password?: string;
			role?: UserRole;
		}
	) {
		const updateData: any = {};

		if (data.name) updateData.name = data.name;
		if (data.email) updateData.email = data.email;
		if (data.phone) updateData.phone = data.phone;
		if (data.role) updateData.role = data.role;

		if (data.role) {
			const roleRecord = await prisma.role.findUnique({
				where: { name: data.role },
			});

			if (!roleRecord) {
				throw new Error(`Role ${data.role} not found in system`);
			}

			updateData.roleId = roleRecord.id;
		}

		// Hash password if provided
		if (data.password) {
			updateData.password = await bcrypt.hash(data.password, 10);
		}

		return prisma.user.update({
			where: { id: userId },
			data: updateData,
			select: {
				id: true,
				name: true,
				email: true,
				phone: true,
				role: true,
				roleId: true,
				updatedAt: true,
			},
		});
	}

	// Get role permissions
	getRolePermissions(role: UserRole) {
		// This method is now deprecated in favor of the permission system
		// Kept for backward compatibility
		const permissions: Record<UserRole, string[]> = {
			MEMBER: ["view_own_profile", "view_loans", "view_savings"],
			ACCOUNTANT: [
				"view_accounting",
				"create_journal_entries",
				"view_reports",
				"manage_chart_of_accounts",
			],
			SUPERVISOR: [
				"view_accounting",
				"approve_loans",
				"approve_withdrawals",
				"view_reports",
			],
			MANAGER: [
				"view_accounting",
				"approve_loans",
				"approve_withdrawals",
				"view_reports",
				"manage_users",
				"manage_system_config",
			],
			COMMITTEE: ["approve_loans", "view_reports"],
		};

		return permissions[role] || [];
	}

	// Get all available roles
	getAllRoles() {
		return Object.values(UserRole);
	}

	// Get system configuration
	async getSystemConfig() {
		let config = await prisma.systemConfiguration.findFirst();

		if (!config) {
			// Create default configuration if it doesn't exist
			config = await prisma.systemConfiguration.create({
				data: {
					organizationName: "Microfinance Institution",
					currency: "ETB",
					fiscalYearStart: "01-01",
					maxLoanAmount: 100000,
					minSavingsPercentage: 30,
					interestCalculationMethod: "SIMPLE",
					loanApprovalLevels: "ACCOUNTANT,SUPERVISOR,MANAGER",
					withdrawalApprovalLevels: "ACCOUNTANT,SUPERVISOR,MANAGER",
				},
			});
		}

		return {
			id: config.id,
			organizationName: config.organizationName,
			organizationLogo: config.organizationLogo,
			currency: config.currency,
			fiscalYearStart: config.fiscalYearStart,
			maxLoanAmount: config.maxLoanAmount,
			minSavingsPercentage: config.minSavingsPercentage,
			interestCalculationMethod: config.interestCalculationMethod,
			loanApprovalLevels: config.loanApprovalLevels.split(","),
			withdrawalApprovalLevels: config.withdrawalApprovalLevels.split(","),
		};
	}
	// // Get system configuration
	// async getSystemConfig() {
	// 	let config = await prisma.systemConfiguration.findFirst();

	// 	if (!config) {
	// 		// Create default configuration if it doesn't exist
	// 		config = await prisma.systemConfiguration.create({
	// 			data: {
	// 				organizationName: "Microfinance Institution",
	// 				currency: "ETB",
	// 				fiscalYearStart: "01-01",
	// 				maxLoanAmount: 100000,
	// 				minSavingsPercentage: 30,
	// 				interestCalculationMethod: "SIMPLE",
	// 				loanApprovalLevels: "ACCOUNTANT,SUPERVISOR,MANAGER",
	// 				withdrawalApprovalLevels: "ACCOUNTANT,SUPERVISOR,MANAGER",
	// 			},
	// 		});
	// 	}

	// 	return {
	// 		id: config.id,
	// 		organizationName: config.organizationName,
	// 		organizationLogo: config.organizationLogo,
	// 		currency: config.currency,
	// 		fiscalYearStart: config.fiscalYearStart,
	// 		maxLoanAmount: config.maxLoanAmount,
	// 		minSavingsPercentage: config.minSavingsPercentage,
	// 		interestCalculationMethod: config.interestCalculationMethod,
	// 		loanApprovalLevels: config.loanApprovalLevels.split(","),
	// 		withdrawalApprovalLevels: config.withdrawalApprovalLevels.split(","),
	// 	};
	// }

	// Update system configuration
	async updateSystemConfig(config: {
		organizationName?: string;
		organizationLogo?: string;
		currency?: string;
		fiscalYearStart?: string;
		maxLoanAmount?: number;
		minSavingsPercentage?: number;
		interestCalculationMethod?: string;
		loanApprovalLevels?: string[];
		withdrawalApprovalLevels?: string[];
	}) {
		const updateData: any = {};

		if (config.organizationName)
			updateData.organizationName = config.organizationName;
		if (config.organizationLogo)
			updateData.organizationLogo = config.organizationLogo;
		if (config.currency) updateData.currency = config.currency;
		if (config.fiscalYearStart)
			updateData.fiscalYearStart = config.fiscalYearStart;
		if (config.maxLoanAmount) updateData.maxLoanAmount = config.maxLoanAmount;
		if (config.minSavingsPercentage)
			updateData.minSavingsPercentage = config.minSavingsPercentage;
		if (config.interestCalculationMethod)
			updateData.interestCalculationMethod = config.interestCalculationMethod;
		if (config.loanApprovalLevels)
			updateData.loanApprovalLevels = config.loanApprovalLevels.join(",");
		if (config.withdrawalApprovalLevels)
			updateData.withdrawalApprovalLevels =
				config.withdrawalApprovalLevels.join(",");

		const updated = await prisma.systemConfiguration.upsert({
			where: { id: 1 },
			update: updateData,
			create: {
				id: 1,
				organizationName: config.organizationName || "Microfinance Institution",
				organizationLogo: config.organizationLogo || null,
				currency: config.currency || "ETB",
				fiscalYearStart: config.fiscalYearStart || "01-01",
				maxLoanAmount: config.maxLoanAmount || 100000,
				minSavingsPercentage: config.minSavingsPercentage || 30,
				interestCalculationMethod: config.interestCalculationMethod || "SIMPLE",
				loanApprovalLevels:
					config.loanApprovalLevels?.join(",") ||
					"ACCOUNTANT,SUPERVISOR,MANAGER",
				withdrawalApprovalLevels:
					config.withdrawalApprovalLevels?.join(",") ||
					"ACCOUNTANT,SUPERVISOR,MANAGER",
			},
		});

		return {
			id: updated.id,
			organizationName: updated.organizationName,
			organizationLogo: updated.organizationLogo,
			currency: updated.currency,
			fiscalYearStart: updated.fiscalYearStart,
			maxLoanAmount: updated.maxLoanAmount,
			minSavingsPercentage: updated.minSavingsPercentage,
			interestCalculationMethod: updated.interestCalculationMethod,
			loanApprovalLevels: updated.loanApprovalLevels.split(","),
			withdrawalApprovalLevels: updated.withdrawalApprovalLevels.split(","),
		};
	}
	// // Update system configuration
	// async updateSystemConfig(config: {
	// 	organizationName?: string;
	// 	organizationLogo?: string;
	// 	currency?: string;
	// 	fiscalYearStart?: string;
	// 	maxLoanAmount?: number;
	// 	minSavingsPercentage?: number;
	// 	interestCalculationMethod?: string;
	// 	loanApprovalLevels?: string[];
	// 	withdrawalApprovalLevels?: string[];
	// }) {
	// 	const updateData: any = {};

	// 	if (config.organizationName)
	// 		updateData.organizationName = config.organizationName;
	// 	if (config.organizationLogo)
	// 		updateData.organizationLogo = config.organizationLogo;
	// 	if (config.currency) updateData.currency = config.currency;
	// 	if (config.fiscalYearStart)
	// 		updateData.fiscalYearStart = config.fiscalYearStart;
	// 	if (config.maxLoanAmount) updateData.maxLoanAmount = config.maxLoanAmount;
	// 	if (config.minSavingsPercentage)
	// 		updateData.minSavingsPercentage = config.minSavingsPercentage;
	// 	if (config.interestCalculationMethod)
	// 		updateData.interestCalculationMethod = config.interestCalculationMethod;
	// 	if (config.loanApprovalLevels)
	// 		updateData.loanApprovalLevels = config.loanApprovalLevels.join(",");
	// 	if (config.withdrawalApprovalLevels)
	// 		updateData.withdrawalApprovalLevels =
	// 			config.withdrawalApprovalLevels.join(",");

	// 	const updated = await prisma.systemConfiguration.update({
	// 		where: { id: 1 },
	// 		data: updateData,
	// 	});

	// 	return {
	// 		id: updated.id,
	// 		organizationName: updated.organizationName,
	// 		organizationLogo: updated.organizationLogo,
	// 		currency: updated.currency,
	// 		fiscalYearStart: updated.fiscalYearStart,
	// 		maxLoanAmount: updated.maxLoanAmount,
	// 		minSavingsPercentage: updated.minSavingsPercentage,
	// 		interestCalculationMethod: updated.interestCalculationMethod,
	// 		loanApprovalLevels: updated.loanApprovalLevels.split(","),
	// 		withdrawalApprovalLevels: updated.withdrawalApprovalLevels.split(","),
	// 	};
	// }

	// Get audit logs
	async getAuditLogs(page = 1, limit = 50) {
		// This would typically query an AuditLog table
		// For now, returning sample data structure
		const skip = (page - 1) * limit;

		// Get user activities from various tables
		const userCreations = await prisma.user.findMany({
			skip,
			take: limit,
			select: {
				id: true,
				name: true,
				email: true,
				createdAt: true,
			},
			orderBy: { createdAt: "desc" },
		});

		const logs = userCreations.map((user) => ({
			id: user.id,
			action: "USER_CREATED",
			actor: "System",
			resource: "User",
			resourceId: user.id,
			details: `User ${user.name} (${user.email}) created`,
			timestamp: user.createdAt,
			status: "SUCCESS",
		}));

		return {
			logs,
			total: logs.length,
			page,
			limit,
		};
	}

	// Get user activity summary
	async getUserActivitySummary() {
		const totalUsers = await prisma.user.count();
		const usersByRole = await prisma.user.groupBy({
			by: ["role"],
			_count: true,
		});

		return {
			totalUsers,
			usersByRole: usersByRole.map((item) => ({
				role: item.role,
				count: item._count,
			})),
			lastUpdated: new Date(),
		};
	}
}

// import { prisma } from "../config/prisma";
// import { UserRole } from "@prisma/client";
// import * as bcrypt from "bcrypt";

// export class SettingsService {
// 	// Get all users with their roles
// 	async getAllUsers(page = 1, limit = 20) {
// 		const skip = (page - 1) * limit;
// 		const [users, total] = await Promise.all([
// 			prisma.user.findMany({
// 				skip,
// 				take: limit,
// 				select: {
// 					id: true,
// 					name: true,
// 					email: true,
// 					phone: true,
// 					role: true,
// 					createdAt: true,
// 					updatedAt: true,
// 				},
// 				orderBy: { createdAt: "desc" },
// 			}),
// 			prisma.user.count(),
// 		]);

// 		return {
// 			users,
// 			total,
// 			page,
// 			limit,
// 			totalPages: Math.ceil(total / limit),
// 		};
// 	}

// 	// Get user by ID
// 	async getUserById(userId: number) {
// 		return prisma.user.findUnique({
// 			where: { id: userId },
// 			select: {
// 				id: true,
// 				name: true,
// 				email: true,
// 				phone: true,
// 				role: true,
// 				createdAt: true,
// 				updatedAt: true,
// 			},
// 		});
// 	}

// 	// Update user role
// 	async updateUserRole(userId: number, role: UserRole) {
// 		return prisma.user.update({
// 			where: { id: userId },
// 			data: { role },
// 			select: {
// 				id: true,
// 				name: true,
// 				email: true,
// 				role: true,
// 				updatedAt: true,
// 			},
// 		});
// 	}

// 	// Create new user
// 	async createUser(data: {
// 		name: string;
// 		email: string;
// 		phone: string;
// 		password: string;
// 		role: UserRole;
// 	}) {
// 		console.log({
// 			data,
// 		});

// 		// Check if user already exists
// 		const existingUser = await prisma.user.findUnique({
// 			where: { email: data.email },
// 		});
// 		if (existingUser) {
// 			throw new Error("User with this email already exists");
// 		}

// 		const roleRecord = await prisma.role.findUnique({
// 			where: { name: data.role },
// 		});

// 		if (!roleRecord) {
// 			throw new Error(`Role ${data.role} not found in system`);
// 		}

// 		// Hash password using bcrypt
// 		const hashedPassword = await bcrypt.hash(data.password, 10);

// 		return prisma.user.create({
// 			data: {
// 				name: data.name,
// 				email: data.email,
// 				phone: data.phone,
// 				password: hashedPassword,
// 				role: data.role,
// 				roleId: roleRecord.id,
// 			},
// 			select: {
// 				id: true,
// 				name: true,
// 				email: true,
// 				phone: true,
// 				role: true,
// 				roleId: true,
// 				createdAt: true,
// 			},
// 		});
// 	}

// 	// Delete user
// 	async deleteUser(userId: number) {
// 		return prisma.user.delete({
// 			where: { id: userId },
// 		});
// 	}

// 	// Update user
// 	async updateUser(
// 		userId: number,
// 		data: {
// 			name?: string;
// 			email?: string;
// 			phone?: string;
// 			password?: string;
// 			role?: UserRole;
// 		}
// 	) {
// 		const updateData: any = {};

// 		if (data.name) updateData.name = data.name;
// 		if (data.email) updateData.email = data.email;
// 		if (data.phone) updateData.phone = data.phone;
// 		if (data.role) updateData.role = data.role;

// 		if (data.role) {
// 			const roleRecord = await prisma.role.findUnique({
// 				where: { name: data.role },
// 			});

// 			if (!roleRecord) {
// 				throw new Error(`Role ${data.role} not found in system`);
// 			}

// 			updateData.roleId = roleRecord.id;
// 		}

// 		// Hash password if provided
// 		if (data.password) {
// 			updateData.password = await bcrypt.hash(data.password, 10);
// 		}

// 		return prisma.user.update({
// 			where: { id: userId },
// 			data: updateData,
// 			select: {
// 				id: true,
// 				name: true,
// 				email: true,
// 				phone: true,
// 				role: true,
// 				roleId: true,
// 				updatedAt: true,
// 			},
// 		});
// 	}

// 	// Get role permissions
// 	getRolePermissions(role: UserRole) {
// 		// This method is now deprecated in favor of the permission system
// 		// Kept for backward compatibility
// 		const permissions: Record<UserRole, string[]> = {
// 			MEMBER: ["view_own_profile", "view_loans", "view_savings"],
// 			ACCOUNTANT: [
// 				"view_accounting",
// 				"create_journal_entries",
// 				"view_reports",
// 				"manage_chart_of_accounts",
// 			],
// 			SUPERVISOR: [
// 				"view_accounting",
// 				"approve_loans",
// 				"approve_withdrawals",
// 				"view_reports",
// 			],
// 			MANAGER: [
// 				"view_accounting",
// 				"approve_loans",
// 				"approve_withdrawals",
// 				"view_reports",
// 				"manage_users",
// 				"manage_system_config",
// 			],
// 			COMMITTEE: ["approve_loans", "view_reports"],
// 		};

// 		return permissions[role] || [];
// 	}

// 	// Get all available roles
// 	getAllRoles() {
// 		return Object.values(UserRole);
// 	}

// 	// Get system configuration
// 	async getSystemConfig() {
// 		let config = await prisma.systemConfiguration.findFirst();

// 		if (!config) {
// 			// Create default configuration if it doesn't exist
// 			config = await prisma.systemConfiguration.create({
// 				data: {
// 					organizationName: "Microfinance Institution",
// 					currency: "ETB",
// 					fiscalYearStart: "01-01",
// 					maxLoanAmount: 100000,
// 					minSavingsPercentage: 30,
// 					interestCalculationMethod: "SIMPLE",
// 					loanApprovalLevels: "ACCOUNTANT,SUPERVISOR,MANAGER",
// 					withdrawalApprovalLevels: "ACCOUNTANT,SUPERVISOR,MANAGER",
// 				},
// 			});
// 		}

// 		return {
// 			id: config.id,
// 			organizationName: config.organizationName,
// 			organizationLogo: config.organizationLogo,
// 			currency: config.currency,
// 			fiscalYearStart: config.fiscalYearStart,
// 			maxLoanAmount: config.maxLoanAmount,
// 			minSavingsPercentage: config.minSavingsPercentage,
// 			interestCalculationMethod: config.interestCalculationMethod,
// 			loanApprovalLevels: config.loanApprovalLevels.split(","),
// 			withdrawalApprovalLevels: config.withdrawalApprovalLevels.split(","),
// 		};
// 	}

// 	// Update system configuration
// 	async updateSystemConfig(config: {
// 		organizationName?: string;
// 		organizationLogo?: string;
// 		currency?: string;
// 		fiscalYearStart?: string;
// 		maxLoanAmount?: number;
// 		minSavingsPercentage?: number;
// 		interestCalculationMethod?: string;
// 		loanApprovalLevels?: string[];
// 		withdrawalApprovalLevels?: string[];
// 	}) {
// 		const updateData: any = {};

// 		if (config.organizationName)
// 			updateData.organizationName = config.organizationName;
// 		if (config.organizationLogo)
// 			updateData.organizationLogo = config.organizationLogo;
// 		if (config.currency) updateData.currency = config.currency;
// 		if (config.fiscalYearStart)
// 			updateData.fiscalYearStart = config.fiscalYearStart;
// 		if (config.maxLoanAmount) updateData.maxLoanAmount = config.maxLoanAmount;
// 		if (config.minSavingsPercentage)
// 			updateData.minSavingsPercentage = config.minSavingsPercentage;
// 		if (config.interestCalculationMethod)
// 			updateData.interestCalculationMethod = config.interestCalculationMethod;
// 		if (config.loanApprovalLevels)
// 			updateData.loanApprovalLevels = config.loanApprovalLevels.join(",");
// 		if (config.withdrawalApprovalLevels)
// 			updateData.withdrawalApprovalLevels =
// 				config.withdrawalApprovalLevels.join(",");

// 		const updated = await prisma.systemConfiguration.update({
// 			where: { id: 1 },
// 			data: updateData,
// 		});

// 		return {
// 			id: updated.id,
// 			organizationName: updated.organizationName,
// 			organizationLogo: updated.organizationLogo,
// 			currency: updated.currency,
// 			fiscalYearStart: updated.fiscalYearStart,
// 			maxLoanAmount: updated.maxLoanAmount,
// 			minSavingsPercentage: updated.minSavingsPercentage,
// 			interestCalculationMethod: updated.interestCalculationMethod,
// 			loanApprovalLevels: updated.loanApprovalLevels.split(","),
// 			withdrawalApprovalLevels: updated.withdrawalApprovalLevels.split(","),
// 		};
// 	}

// 	// Get audit logs
// 	async getAuditLogs(page = 1, limit = 50) {
// 		// This would typically query an AuditLog table
// 		// For now, returning sample data structure
// 		const skip = (page - 1) * limit;

// 		// Get user activities from various tables
// 		const userCreations = await prisma.user.findMany({
// 			skip,
// 			take: limit,
// 			select: {
// 				id: true,
// 				name: true,
// 				email: true,
// 				createdAt: true,
// 			},
// 			orderBy: { createdAt: "desc" },
// 		});

// 		const logs = userCreations.map((user) => ({
// 			id: user.id,
// 			action: "USER_CREATED",
// 			actor: "System",
// 			resource: "User",
// 			resourceId: user.id,
// 			details: `User ${user.name} (${user.email}) created`,
// 			timestamp: user.createdAt,
// 			status: "SUCCESS",
// 		}));

// 		return {
// 			logs,
// 			total: logs.length,
// 			page,
// 			limit,
// 		};
// 	}

// 	// Get user activity summary
// 	async getUserActivitySummary() {
// 		const totalUsers = await prisma.user.count();
// 		const usersByRole = await prisma.user.groupBy({
// 			by: ["role"],
// 			_count: true,
// 		});

// 		return {
// 			totalUsers,
// 			usersByRole: usersByRole.map((item) => ({
// 				role: item.role,
// 				count: item._count,
// 			})),
// 			lastUpdated: new Date(),
// 		};
// 	}
// }
