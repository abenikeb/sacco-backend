import {
	PrismaClient,
	PermissionAction,
	PermissionResource,
} from "@prisma/client";

const prisma = new PrismaClient();

/**
 * Seed file for initializing roles and permissions
 * Maps to existing UserRole enum: MEMBER, ACCOUNTANT, MANAGER, SUPERVISOR, COMMITTEE
 * Run with: npx prisma db seed -- --roles-permissions
 */

async function seedRolesAndPermissions() {
	console.log("🔐 Seeding roles and permissions...");

	try {
		// Step 1: Create all permission combinations
		console.log("📋 Creating permissions...");
		const resources = Object.values(PermissionResource);
		const actions = Object.values(PermissionAction);

		let permissionCount = 0;
		for (const resource of resources) {
			for (const action of actions) {
				await prisma.permission.upsert({
					where: {
						resource_action: {
							resource: resource as PermissionResource,
							action: action as PermissionAction,
						},
					},
					update: {},
					create: {
						resource: resource as PermissionResource,
						action: action as PermissionAction,
						description: `${action} access to ${resource}`,
					},
				});
				permissionCount++;
			}
		}
		console.log(`✅ Created ${permissionCount} permissions`);

		// Step 2: Define role configurations aligned with UserRole enum
		const roleConfigurations = [
			{
				name: "MEMBER",
				description:
					"Member role with limited access to personal accounts and loan information",
				permissions: [
					{ resource: "MEMBERS", action: "VIEW" },
					{ resource: "MEMBERS", action: "READ" },
					{ resource: "LOANS", action: "VIEW" },
					{ resource: "LOANS", action: "READ" },
					{ resource: "SAVINGS", action: "VIEW" },
					{ resource: "SAVINGS", action: "READ" },
					{ resource: "WITHDRAWALS", action: "VIEW" },
					{ resource: "WITHDRAWALS", action: "READ" },
				],
			},
			{
				name: "ACCOUNTANT",
				description:
					"Accountant role with full accounting and reporting access",
				permissions: [
					{ resource: "ACCOUNTING", action: "VIEW" },
					{ resource: "ACCOUNTING", action: "READ" },
					{ resource: "ACCOUNTING", action: "CREATE" },
					{ resource: "ACCOUNTING", action: "UPDATE" },
					{ resource: "REPORTS", action: "VIEW" },
					{ resource: "REPORTS", action: "READ" },
					{ resource: "TRANSACTIONS", action: "VIEW" },
					{ resource: "TRANSACTIONS", action: "READ" },
					{ resource: "TRANSACTIONS", action: "CREATE" },
					{ resource: "AUDIT_LOGS", action: "VIEW" },
					{ resource: "AUDIT_LOGS", action: "READ" },
				],
			},
			{
				name: "SUPERVISOR",
				description:
					"Supervisor role with approval authority for loans and withdrawals",
				permissions: [
					{ resource: "LOANS", action: "VIEW" },
					{ resource: "LOANS", action: "READ" },
					{ resource: "LOANS", action: "APPROVE" },
					{ resource: "LOANS", action: "REJECT" },
					{ resource: "WITHDRAWALS", action: "VIEW" },
					{ resource: "WITHDRAWALS", action: "READ" },
					{ resource: "WITHDRAWALS", action: "APPROVE" },
					{ resource: "WITHDRAWALS", action: "REJECT" },
					{ resource: "REPORTS", action: "VIEW" },
					{ resource: "REPORTS", action: "READ" },
					{ resource: "MEMBERS", action: "VIEW" },
					{ resource: "MEMBERS", action: "READ" },
				],
			},
			{
				name: "MANAGER",
				description:
					"Manager role with comprehensive access to all operations except system configuration",
				permissions: [
					{ resource: "MEMBERS", action: "VIEW" },
					{ resource: "MEMBERS", action: "READ" },
					{ resource: "MEMBERS", action: "UPDATE" },
					{ resource: "MEMBERS", action: "CREATE" },
					{ resource: "LOANS", action: "VIEW" },
					{ resource: "LOANS", action: "READ" },
					{ resource: "LOANS", action: "CREATE" },
					{ resource: "LOANS", action: "UPDATE" },
					{ resource: "LOANS", action: "APPROVE" },
					{ resource: "LOANS", action: "REJECT" },
					{ resource: "SAVINGS", action: "VIEW" },
					{ resource: "SAVINGS", action: "READ" },
					{ resource: "SAVINGS", action: "CREATE" },
					{ resource: "SAVINGS", action: "UPDATE" },
					{ resource: "WITHDRAWALS", action: "VIEW" },
					{ resource: "WITHDRAWALS", action: "READ" },
					{ resource: "WITHDRAWALS", action: "APPROVE" },
					{ resource: "WITHDRAWALS", action: "REJECT" },
					{ resource: "TRANSACTIONS", action: "VIEW" },
					{ resource: "TRANSACTIONS", action: "READ" },
					{ resource: "TRANSACTIONS", action: "CREATE" },
					{ resource: "REPORTS", action: "VIEW" },
					{ resource: "REPORTS", action: "READ" },
					{ resource: "ACCOUNTING", action: "VIEW" },
					{ resource: "ACCOUNTING", action: "READ" },
					{ resource: "USERS", action: "VIEW" },
					{ resource: "USERS", action: "READ" },
					{ resource: "LOAN_PRODUCTS", action: "VIEW" },
					{ resource: "LOAN_PRODUCTS", action: "READ" },
					{ resource: "AUDIT_LOGS", action: "VIEW" },
					{ resource: "AUDIT_LOGS", action: "READ" },
				],
			},
			{
				name: "COMMITTEE",
				description:
					"Committee role with administrative authority for user management and system configuration",
				permissions: [
					// User Management
					{ resource: "USERS", action: "VIEW" },
					{ resource: "USERS", action: "READ" },
					{ resource: "USERS", action: "CREATE" },
					{ resource: "USERS", action: "UPDATE" },
					{ resource: "USERS", action: "DELETE" },
					// Role Management
					{ resource: "ROLES", action: "VIEW" },
					{ resource: "ROLES", action: "READ" },
					{ resource: "ROLES", action: "CREATE" },
					{ resource: "ROLES", action: "UPDATE" },
					{ resource: "ROLES", action: "DELETE" },
					// System Configuration
					{ resource: "SETTINGS", action: "VIEW" },
					{ resource: "SETTINGS", action: "READ" },
					{ resource: "SETTINGS", action: "UPDATE" },
					// Loan Approval Authority
					{ resource: "LOANS", action: "VIEW" },
					{ resource: "LOANS", action: "READ" },
					{ resource: "LOANS", action: "APPROVE" },
					{ resource: "LOANS", action: "REJECT" },
					// Reporting
					{ resource: "REPORTS", action: "VIEW" },
					{ resource: "REPORTS", action: "READ" },
					{ resource: "ACCOUNTING", action: "VIEW" },
					{ resource: "ACCOUNTING", action: "READ" },
					// Audit Trail
					{ resource: "AUDIT_LOGS", action: "VIEW" },
					{ resource: "AUDIT_LOGS", action: "READ" },
					{ resource: "LOAN_PRODUCTS", action: "VIEW" },
					{ resource: "LOAN_PRODUCTS", action: "READ" },
					{ resource: "LOAN_PRODUCTS", action: "UPDATE" },
				],
			},
		];

		// Step 3: Create roles and assign permissions
		console.log("👥 Creating roles and assigning permissions...");
		let roleCount = 0;

		for (const roleConfig of roleConfigurations) {
			// Create or update role
			const role = await prisma.role.upsert({
				where: { name: roleConfig.name },
				update: {
					description: roleConfig.description,
				},
				create: {
					name: roleConfig.name,
					description: roleConfig.description,
					isActive: true,
				},
			});

			// Assign permissions to role
			for (const permConfig of roleConfig.permissions) {
				const permission = await prisma.permission.findUnique({
					where: {
						resource_action: {
							resource: permConfig.resource as PermissionResource,
							action: permConfig.action as PermissionAction,
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

			console.log(
				`✅ Role "${roleConfig.name}" created with ${roleConfig.permissions.length} permissions`
			);
			roleCount++;
		}

		console.log(`\n✅ Successfully seeded ${roleCount} roles with permissions`);
		console.log("\n📋 Role Summary:");
		console.log("  • MEMBER: Limited access to personal accounts");
		console.log("  • ACCOUNTANT: Full accounting and reporting access");
		console.log("  • SUPERVISOR: Loan and withdrawal approval authority");
		console.log("  • MANAGER: Comprehensive operational access");
		console.log(
			"  • COMMITTEE: Administrative and system configuration access"
		);
	} catch (error) {
		console.error("❌ Error seeding roles and permissions:", error);
		throw error;
	}
}

seedRolesAndPermissions()
	.catch((e) => {
		console.error("❌ Seeding failed:", e);
		process.exit(1);
	})
	.finally(async () => {
		await prisma.$disconnect();
	});
