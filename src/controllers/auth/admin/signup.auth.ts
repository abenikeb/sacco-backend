import express from "express";
import type { Request, Response } from "express";
import { prisma } from "../../../config/prisma";
import * as bcrypt from "bcrypt";

const adminSignupRouter = express.Router();

adminSignupRouter.post("/", async (req: Request, res: Response) => {
	const { name, email, phone, password, role } = await req.body;
	try {
		const existingUser = await prisma.user.findUnique({
			where: { email },
		});
		if (existingUser) {
			return res
				.status(400)
				.json({ error: "User with this email already exists" });
		}
		const hashedPassword = await bcrypt.hash(password, 10);

		const newUser = await prisma.user.create({
			data: {
				name,
				email,
				phone,
				password: hashedPassword,
				role,
			},
		});

		const { password: _, ...userWithoutPassword } = newUser;

		return res.status(201).json(userWithoutPassword);
	} catch (error) {
		console.log(error);
		res.status(500).json({ error: "Internal server error" });
	}
});

export default adminSignupRouter;
