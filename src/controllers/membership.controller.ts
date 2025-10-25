import express from "express";
import type { Request, Response } from "express";
import { prisma } from "../config/prisma";
import { getSession } from "./auth/auth";
import { generateUniqueNumber } from "../utils/generateUnique";
import multer from "multer";
import { UserRole } from "@prisma/client";
import {
	NotificationPayload,
	sendNotification,
} from "./notification/notification.controller";

const membershipRouter = express.Router();
const APPROVAL_HIERARCHY: UserRole[] = [
	UserRole.ACCOUNTANT,
	UserRole.SUPERVISOR,
	UserRole.MANAGER,
];
const upload = multer({ dest: "userInfo/" });
// middleware

membershipRouter.post(
	"/request",
	upload.fields([{ name: "national_id" }, { name: "signature" }]),
	async (req, res) => {
		try {
			const { name, email, phone, etNumber, department, salary } = req.body;
			const files = req.files as { [fieldname: string]: Express.Multer.File[] };

			const signaturePath = files["signature"]?.[0]?.path ?? "";
			const nationalIdPath = files["national_id"]?.[0]?.path ?? "";

			const membershipRequest = await prisma.membershipRequest.create({
				data: {
					name,
					email,
					phone,
					etNumber: Number.parseInt(etNumber),
					signature: signaturePath, //this should be strings only file paths
					national_id: nationalIdPath,
					approvalOrder: 0,
					salary: parseInt(salary),
					department,
					status: "PENDING",
				},
			});
			const accountants = await prisma.user.findMany({
				where: {
					role: UserRole.ACCOUNTANT,
				},
			});

			for (const accountant of accountants) {
				const message: NotificationPayload = {
					userId: accountant.id,
					title: "Membership Request",
					message: "Your approval is needed",
					type: "Membership_APPROVAL",
				};
				await sendNotification(message);
			}
			return res.status(201).json(membershipRequest);
		} catch (error) {
			console.error("Error creating membership request:", error);
			return res.status(500).json({
				error: "Failed to create membership request",
				details: (error as Error).message,
			});
		}
	}
);

membershipRouter.patch("/requests/:id", async (req, res) => {
	console.log("MEMBERSHIP REQUEST APPLYING...");

	const session = await getSession(req);
	// if (!session || !["SUPERVISOR", "MANAGER"].includes(session.role)) { // I NEED TO CHECK THIS LATER ON
	// 	return res.status(401).json({ error: "Unauthorized" });
	// }
	// if (!session || session.role === "MEMBER" || session.role === "COMMITTEE") {
	// 	return res.status(401).json({ error: "Unauthorized" });
	// }
	try {
		const { status } = req.body;
		const id = Number.parseInt(req.params.id);
		const userRole = session.role;
		const currIndex = APPROVAL_HIERARCHY.findIndex((val) => val === userRole);

		console.log({
			userRole,
			currIndex,
		});

		const updatedRequest = await prisma.membershipRequest.update({
			where: { id },
			data: {
				status,
				approvalOrder: currIndex + 1,
			},
		});

		console.log({
			updatedRequest,
		});

		const etNumber = updatedRequest.etNumber;
		const memberNumber = await generateUniqueNumber("memberNumber");

		// Create a new Member record
		const newMember = await prisma.member.create({
			data: {
				name: updatedRequest.name,
				salary: updatedRequest.salary,
				email: updatedRequest.email,
				phone: updatedRequest.phone,
				etNumber,
				memberNumber,
				department: updatedRequest.department,
				// userId: user.id,
			},
		});

		console.log({
			newMember,
		});
		if (currIndex + 1 === APPROVAL_HIERARCHY.length) {
			// Get the membership request details
			// const membershipRequest = await prisma.membershipRequest.findUnique({
			// 	where: { id },
			// });
			const membershipRequest = await prisma.membershipRequest.findUnique({
				where: {
					id,
				},
			});

			if (membershipRequest) {
				// Generate unique etNumber and memberNumber
				// const etNumber = await generateUniqueNumber("etNumber");
				const etNumber = membershipRequest.etNumber;
				const memberNumber = await generateUniqueNumber("memberNumber");

				// Create a new Member record
				const newMember = await prisma.member.create({
					data: {
						name: membershipRequest.name,
						salary: membershipRequest.salary,
						email: membershipRequest.email,
						phone: membershipRequest.phone,
						etNumber,
						memberNumber,
						department: membershipRequest.department,
						// userId: user.id,
					},
				});

				// Create initial MemberBalance record
				await prisma.memberBalance.create({
					data: {
						memberId: newMember.id,
					},
				});

				// await fetch("http://94.130.27.32:3001/send-sms", { // mock
				// 	method: "POST",
				// 	headers: {
				// 		"Content-Type": "application/json",
				// 	},
				// 	body: JSON.stringify({
				// 		to: membershipRequest.phone,
				// 		message: `ውድ ${
				// 			membershipRequest.name
				// 		} በኢትዮ ክሬዲት አሶሴሽን በተሳካ ሁኔታ ተመዝገበዋል! የአባልነት ልዩ ቁጥር ${etNumber} : እንዲሁም ጊዚያዊ የማለፊያ ቂጥርዎ 'Test@123tr' ይህ ነው በተጨማሪም በ ${"http://94.130.27.32:3008"} መጎብኘት አገልግሎቱን መጠቀም ይችላሉ::`,
				// 		callback: "https://your-callback-url.com/sms-status",
				// 	}),
				// });

				// Return both the updated request and the new member
				return res.json({
					updatedRequest,
					newMember,
				});
			}
		}

		return res.json(updatedRequest);
	} catch (error) {
		console.error("Error fetching membership requests:", error);
		return res.status(500).json({
			error: "Failed to update membership request",
			details: (error as Error).message,
		});
	}
});

membershipRouter.get("/requests", async (req, res) => {
	const session = await getSession(req);
	if (!session || session.role === "MEMBER" || session.role === "COMMITTEE") {
		return res.status(401).json({ error: "Unauthorized" });
	}
	const userRole = session.role;

	try {
		if (userRole == "ACCOUNTANT") {
			const requests = await prisma.membershipRequest.findMany({
				where: {
					approvalOrder: 0,
				},
				orderBy: { createdAt: "desc" },
			});
			return res.json(requests);
		} else if (userRole == "SUPERVISOR") {
			const requests = await prisma.membershipRequest.findMany({
				where: {
					approvalOrder: 1,
				},
				orderBy: { createdAt: "desc" },
			});
			return res.json(requests);
		} else if (userRole == "MANAGER") {
			const requests = await prisma.membershipRequest.findMany({
				where: {
					approvalOrder: 2,
				},
				orderBy: { createdAt: "desc" },
			});
			return res.json(requests);
		}
	} catch (error) {
		console.error("Error fetching membership requests:", error);
		return res
			.status(500)
			.json({ error: "Failed to fetch membership requests" });
	}
});

export default membershipRouter;
