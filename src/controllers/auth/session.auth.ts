import express from "express";
import { getSession, removeAuthCookie } from "./auth";

const sessionRouter = express.Router();

sessionRouter.get("/", async (req, res) => {
	try {
		const session = await getSession(req);

		if (!session) {
			return res.json({ user: null });
		}

		return res.json({
			user: {
				id: session.id,
				name: session.name,
				email: session.email,
				role: session.role,
				etNumber: session.etNumber,
				// memberId: session.memberId,
			},
		});
	} catch (error) {
		console.error("Session error:", error);
		return res.status(400).json({ error: "Internal server error" });
	}
});

export default sessionRouter;
