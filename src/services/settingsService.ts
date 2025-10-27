import { prisma } from "../config/prisma";
import { UserRole } from "@prisma/client";

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
		// Hash password in production
		return prisma.user.create({
			data,
			select: {
				id: true,
				name: true,
				email: true,
				phone: true,
				role: true,
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

	// Get role permissions
	getRolePermissions(role: UserRole) {
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
		// This would typically be stored in a SystemConfig table
		// For now, returning default configuration
		return {
			organizationName: "Microfinance Institution",
			currency: "ETB",
			fiscalYearStart: "01-01",
			maxLoanAmount: 100000,
			minSavingsPercentage: 30,
			interestCalculationMethod: "SIMPLE",
			loanApprovalLevels: ["ACCOUNTANT", "SUPERVISOR", "MANAGER"],
			withdrawalApprovalLevels: ["ACCOUNTANT", "SUPERVISOR", "MANAGER"],
		};
	}

	// Update system configuration
	async updateSystemConfig(config: Record<string, any>) {
		// This would typically update a SystemConfig table
		// For now, just returning the updated config
		return {
			...config,
			updatedAt: new Date(),
		};
	}

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
