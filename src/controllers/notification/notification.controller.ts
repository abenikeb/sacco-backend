import { prisma } from "../../config/prisma";
import { Notification } from "@prisma/client";
import express from "express";
import { getSession, getUserFromRequest } from "../auth/auth";
import { broadcastNotification } from "@/src/utils/socket-handler";

export interface NotificationPayload {
	userId: number | any;
	title: string;
	message: string;
	type: string;
}

const notificationRouter = express.Router();

export const sendNotification = async (payload: NotificationPayload) => {
	try {
		console.log({
			NotificationPayload: payload,
		});
		const notification = await prisma.notification.create({
			data: {
				userId: payload.userId,
				title: payload.title,
				message: payload.message,
				type: payload.type as Notification["type"],
			},
		});

		await broadcastNotification(payload.userId, notification);

		console.log("Notification sent and broadcasted:", notification);
		return notification;
	} catch (error) {
		console.error("Error sending notification:", error);
	}
};

notificationRouter.get("/", async (req, res) => {
	try {
		const user = await getSession(req);
		console.log({
			userNotification: user,
		});
		if (!user) {
			return res.status(401).json({ error: "Unauthorized" });
		}

		const notifications = await prisma.notification.findMany({
			where: {
				userId: user.id!,
			},
			orderBy: {
				createdAt: "desc",
			},
		});

		console.log({
			notifications,
		});

		return res
			.json({
				success: true,
				message: `Notifications`,
				notifications,
			})
			.status(200);

		return notifications;
	} catch (err) {
		console.log(err);
		return res.status(400).json({ error: "Error fetching your data" });
	}
});

notificationRouter.patch("/:id/read", async (req, res) => {
	const id = req.params.id;
	const session = await getSession(req);
	if (!session || session.role === "MEMBER") {
		return res.status(401).json({ error: "Unauthorized" });
	}
	const { status } = await req.body;
	try {
		const updatedLoan = await prisma.notification.update({
			where: { id: Number(id) } as any,
			data: { read: true },
		});

		return res.json(updatedLoan);
	} catch (error) {
		console.error("Error updating loan status:", error);
		return res.status(500).json({ error: "Failed to update loan status" });
	}
});
export default notificationRouter;
