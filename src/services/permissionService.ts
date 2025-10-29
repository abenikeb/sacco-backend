import { prisma } from "../config/prisma";
import { PermissionAction, PermissionResource } from "@prisma/client";

export class PermissionService {
	// Get all permissions
	async getAllPermissions() {
		return prisma.permission.findMany({
			orderBy: [{ resource: "asc" }, { action: "asc" }],
		});
	}

	// Get permissions by resource
	async getPermissionsByResource(resource: PermissionResource) {
		return prisma.permission.findMany({
			where: { resource },
			orderBy: { action: "asc" },
		});
	}

	// Create permission
	async createPermission(
		resource: PermissionResource,
		action: PermissionAction,
		description?: string
	) {
		return prisma.permission.create({
			data: {
				resource,
				action,
				description,
			},
		});
	}

	// Get all roles with permissions
	async getAllRolesWithPermissions() {
		return prisma.role.findMany({
			include: {
				permissions: {
					include: {
						permission: true,
					},
				},
			},
			orderBy: { name: "asc" },
		});
	}

	// Get role by ID with permissions
	async getRoleWithPermissions(roleId: number) {
		return prisma.role.findUnique({
			where: { id: roleId },
			include: {
				permissions: {
					include: {
						permission: true,
					},
				},
			},
		});
	}

	// Create role
	async createRole(name: string, description?: string) {
		return prisma.role.create({
			data: {
				name,
				description,
			},
			include: {
				permissions: {
					include: {
						permission: true,
					},
				},
			},
		});
	}

	// Update role
	async updateRole(roleId: number, name?: string, description?: string) {
		return prisma.role.update({
			where: { id: roleId },
			data: {
				...(name && { name }),
				...(description && { description }),
			},
			include: {
				permissions: {
					include: {
						permission: true,
					},
				},
			},
		});
	}

	// Assign permission to role
	async assignPermissionToRole(roleId: number, permissionId: number) {
		return prisma.rolePermission.create({
			data: {
				roleId,
				permissionId,
			},
			include: {
				permission: true,
			},
		});
	}

	// Remove permission from role
	async removePermissionFromRole(roleId: number, permissionId: number) {
		return prisma.rolePermission.deleteMany({
			where: {
				roleId,
				permissionId,
			},
		});
	}

	// Get user permissions
	async getUserPermissions(userId: number) {
		const user = await prisma.user.findUnique({
			where: { id: userId },
			include: {
				userRole: {
					include: {
						permissions: {
							include: {
								permission: true,
							},
						},
					},
				},
			},
		});

		if (!user || !user.userRole) {
			return [];
		}

		return user.userRole.permissions.map((rp) => ({
			resource: rp.permission.resource,
			action: rp.permission.action,
		}));
	}

	// Check if user has permission
	async hasPermission(
		userId: number,
		resource: PermissionResource,
		action: PermissionAction
	): Promise<boolean> {
		const user = await prisma.user.findUnique({
			where: { id: userId },
			include: {
				userRole: {
					include: {
						permissions: {
							include: {
								permission: true,
							},
						},
					},
				},
			},
		});

		if (!user || !user.userRole) {
			return false;
		}

		return user.userRole.permissions.some(
			(rp) =>
				rp.permission.resource === resource && rp.permission.action === action
		);
	}

	// Assign role to user
	async assignRoleToUser(userId: number, roleId: number) {
		return prisma.user.update({
			where: { id: userId },
			data: { roleId },
			include: {
				userRole: {
					include: {
						permissions: {
							include: {
								permission: true,
							},
						},
					},
				},
			},
		});
	}

	// Initialize default roles and permissions
	async initializeDefaultRoles() {
		const resources = Object.values(PermissionResource);
		const actions = Object.values(PermissionAction);

		// Create all permission combinations
		for (const resource of resources) {
			for (const action of actions) {
				await prisma.permission.upsert({
					where: {
						resource_action: {
							resource,
							action,
						},
					},
					update: {},
					create: {
						resource,
						action,
						description: `${action} access to ${resource}`,
					},
				});
			}
		}

		// Create default roles
		const roleConfigs = [
			{
				name: "MEMBER",
				description: "Member role with limited access",
				permissions: [
					{ resource: "MEMBERS", action: "VIEW" },
					{ resource: "MEMBERS", action: "READ" },
					{ resource: "LOANS", action: "VIEW" },
					{ resource: "LOANS", action: "READ" },
					{ resource: "SAVINGS", action: "VIEW" },
					{ resource: "SAVINGS", action: "READ" },
				],
			},
			{
				name: "ACCOUNTANT",
				description: "Accountant role with accounting access",
				permissions: [
					{ resource: "ACCOUNTING", action: "VIEW" },
					{ resource: "ACCOUNTING", action: "READ" },
					{ resource: "ACCOUNTING", action: "CREATE" },
					{ resource: "ACCOUNTING", action: "UPDATE" },
					{ resource: "REPORTS", action: "VIEW" },
					{ resource: "REPORTS", action: "READ" },
					{ resource: "TRANSACTIONS", action: "VIEW" },
					{ resource: "TRANSACTIONS", action: "READ" },
				],
			},
			{
				name: "SUPERVISOR",
				description: "Supervisor role with approval access",
				permissions: [
					{ resource: "LOANS", action: "VIEW" },
					{ resource: "LOANS", action: "READ" },
					{ resource: "LOANS", action: "APPROVE" },
					{ resource: "WITHDRAWALS", action: "VIEW" },
					{ resource: "WITHDRAWALS", action: "READ" },
					{ resource: "WITHDRAWALS", action: "APPROVE" },
					{ resource: "REPORTS", action: "VIEW" },
					{ resource: "REPORTS", action: "READ" },
				],
			},
			{
				name: "MANAGER",
				description: "Manager role with full access",
				permissions: [
					{ resource: "MEMBERS", action: "VIEW" },
					{ resource: "MEMBERS", action: "READ" },
					{ resource: "MEMBERS", action: "UPDATE" },
					{ resource: "LOANS", action: "VIEW" },
					{ resource: "LOANS", action: "READ" },
					{ resource: "LOANS", action: "APPROVE" },
					{ resource: "WITHDRAWALS", action: "VIEW" },
					{ resource: "WITHDRAWALS", action: "READ" },
					{ resource: "WITHDRAWALS", action: "APPROVE" },
					{ resource: "REPORTS", action: "VIEW" },
					{ resource: "REPORTS", action: "READ" },
					{ resource: "USERS", action: "VIEW" },
					{ resource: "USERS", action: "READ" },
					{ resource: "SETTINGS", action: "VIEW" },
					{ resource: "SETTINGS", action: "READ" },
				],
			},
			{
				name: "COMMITTEE",
				description: "Committee role with approval authority",
				permissions: [
					{ resource: "LOANS", action: "VIEW" },
					{ resource: "LOANS", action: "READ" },
					{ resource: "LOANS", action: "APPROVE" },
					{ resource: "REPORTS", action: "VIEW" },
					{ resource: "REPORTS", action: "READ" },
					{ resource: "USERS", action: "VIEW" },
					{ resource: "USERS", action: "READ" },
					{ resource: "USERS", action: "CREATE" },
					{ resource: "USERS", action: "UPDATE" },
					{ resource: "ROLES", action: "VIEW" },
					{ resource: "ROLES", action: "READ" },
					{ resource: "ROLES", action: "UPDATE" },
					{ resource: "WITHDRAWALS", action: "VIEW" },
					{ resource: "WITHDRAWALS", action: "READ" },
					{ resource: "WITHDRAWALS", action: "APPROVE" },
					{ resource: "SETTINGS", action: "VIEW" },
					{ resource: "SETTINGS", action: "READ" },
					{ resource: "SETTINGS", action: "UPDATE" },
				],
			},
		];

		for (const roleConfig of roleConfigs) {
			const role = await prisma.role.upsert({
				where: { name: roleConfig.name },
				update: {},
				create: {
					name: roleConfig.name,
					description: roleConfig.description,
				},
			});

			for (const perm of roleConfig.permissions) {
				const permission = await prisma.permission.findUnique({
					where: {
						resource_action: {
							resource: perm.resource as any,
							action: perm.action as any,
						},
					},
				});

				if (permission) {
					await prisma.rolePermission.upsert({
						where: {
							roleId_permissionId: {
								roleId: role.id,
								permissionId: permission.id,
							},
						},
						update: {},
						create: {
							roleId: role.id,
							permissionId: permission.id,
						},
					});
				}
			}
		}

		return { message: "Default roles and permissions initialized" };
	}
}
