import { prisma } from "../config/prisma";
export async function generateUniqueNumber(
	type: "etNumber" | "memberNumber"
): Promise<number> {
	// Generate a random 5-digit number
	const min = 1000;
	const max = 9999;
	let uniqueNumber = Math.floor(Math.random() * (max - min + 1)) + min;

	// Check if the number already exists
	let exists = true;
	while (exists) {
		const query =
			type === "etNumber"
				? { etNumber: uniqueNumber }
				: { memberNumber: uniqueNumber };

		const existingMember = await prisma.member.findUnique({
			where: query as any,
		});

		if (!existingMember) {
			exists = false;
		} else {
			// Generate a new number if the current one exists
			uniqueNumber = Math.floor(Math.random() * (max - min + 1)) + min;
		}
	}

	return uniqueNumber;
}
