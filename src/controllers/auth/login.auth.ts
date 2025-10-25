import express from "express";
import { prisma } from "../../config/prisma";
import * as bcrypt from "bcrypt";
import { signJWT, setAuthCookie } from "./auth";

const authLoginRouter = express.Router();

authLoginRouter.post("/", async (req, res) => {
	try {
		const MEMBER_PHONE = "password123";
		const { identifier, password } = req.body;
		console.log({
			identifier,
			password,
		});

		if (/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(identifier)) {
			const user = await prisma.user.findUnique({
				where: { email: identifier.toLowerCase() },
			});
			console.log({
				user,
			});
			if (!user) {
				return res.status(401).json({ error: "Invalid credentials" });
			}

			const passwordMatch = await bcrypt.compare(password, user.password);
			console.log({
				passwordMatch,
			});
			if (!passwordMatch) {
				return res.status(401).json({ error: "Invalid credentials" });
			}
			const payload = {
				id: user.id,
				email: user.email,
				name: user.name,
				role: user.role,
			};
			const token = await signJWT(payload);
			console.log({
				payload,
				token,
			});

			setAuthCookie(token, res);
			return res.json({
				user: {
					id: user.id,
					name: user.name,
					email: user.email,
					role: user.role,
				},
				redirectUrl: "/dashboard",
			});
		} else {
			const etNumber = Number.parseInt(identifier);
			if (isNaN(etNumber)) {
				return res.status(400).json({ error: "Invalid ET Number" });
			}

			const member = await prisma.member.findUnique({
				where: { etNumber },
			});

			if (!member || password !== MEMBER_PHONE) {
				return res.status(401).json({ error: "Invalid credentials" });
			}

			// Create JWT payload for members
			const payload = {
				id: member.id,
				etNumber: member.etNumber,
				role: "MEMBER" as const,
				phone: MEMBER_PHONE,
				name: member.name,
			};

			// Sign JWT
			const token = await signJWT(payload);

			// Create response
			setAuthCookie(token, res);
			return res.json({
				user: {
					id: member.id,
					etNumber: member.etNumber,
					role: "MEMBER",
					phone: MEMBER_PHONE,
					name: member.name,
				},

				redirectUrl: "/member",
			});

			// Set auth cookie
		}
	} catch (error) {
		console.log(error);
		return res.status(500).json({ error: "Internal server error" });
	}
});

export default authLoginRouter;
