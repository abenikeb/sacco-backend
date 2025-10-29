import { PrismaClient, UserRole } from "@prisma/client";

const prisma = new PrismaClient();

/**
 * Seed file for assigning roles to existing users
 * Maps UserRole enum to dynamic Role model
 * Run with: npx prisma db seed -- --users-roles
 */

async function seedUsersWithRoles() {
	console.log("👤 Assigning roles to users...");

	try {
		// Mapping of UserRole enum to Role names
		const roleMapping: Record<UserRole, string> = {
			[UserRole.MEMBER]: "MEMBER",
			[UserRole.ACCOUNTANT]: "ACCOUNTANT",
			[UserRole.MANAGER]: "MANAGER",
			[UserRole.SUPERVISOR]: "SUPERVISOR",
			[UserRole.COMMITTEE]: "COMMITTEE",
		};

		// Get all roles from database
		const roles = await prisma.role.findMany();
		const roleMap = new Map(roles.map((r) => [r.name, r.id]));

		// Update users with their corresponding roleId
		const users = await prisma.user.findMany();

		for (const user of users) {
			const roleName = roleMapping[user.role];
			const roleId = roleMap.get(roleName);

			if (roleId) {
				await prisma.user.update({
					where: { id: user.id },
					data: { roleId },
				});
				console.log(`✅ User "${user.name}" assigned to role "${roleName}"`);
			}
		}

		console.log(`\n✅ Successfully assigned roles to ${users.length} users`);
	} catch (error) {
		console.error("❌ Error assigning roles to users:", error);
		throw error;
	}
}

seedUsersWithRoles()
	.catch((e) => {
		console.error("❌ Seeding failed:", e);
		process.exit(1);
	})
	.finally(async () => {
		await prisma.$disconnect();
	});
