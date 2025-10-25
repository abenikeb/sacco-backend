import express from "express";
import { prisma } from "../config/prisma";
import {
	LoanApprovalStatus,
	RepaymentStatus,
	TransactionType,
} from "@prisma/client";

const willingDepositRouter = express.Router();

willingDepositRouter.get("/requests", async (req, res) => {
	try {
		const userId = (req.query.userId || "").toString();
		const status = req.query.status || "ALL";
		const id = req.query.id;
		const toDate = req.query.toDate;
		const page = parseInt((req.query.page ?? "1").toString(), 10);
		const pageSize = parseInt((req.query.pageSize ?? "10").toString(), 10);
		let whereClause = {};

		if (userId) {
			whereClause = { ...whereClause, userId: userId };
		}

		if (id) {
			whereClause = { ...whereClause, id: id };
		}

		if (status) {
			whereClause = { ...whereClause, status: status };
		}

		const pageNumber = page ? page : 1;
		const pageSizeNumber = pageSize ? pageSize : 10;
		const skip = (pageNumber - 1) * pageSizeNumber;
	} catch (error) {
		console.error("Error fetching willing deposit requests:", error);
		return res
			.status(500)
			.json({ error: "Error fetching willing deposit requests" });
	}
});

willingDepositRouter.post("/requests", async (req, res) => {
	try {
		const {
			userId,
			amount,
			currency,
			paymentMethod,
			walletAddress,
			transactionHash,
			status,
		} = req.body;
		if (
			!userId ||
			!amount ||
			!currency ||
			!paymentMethod ||
			!walletAddress ||
			!transactionHash ||
			!status
		) {
			return res.status(400).json({ message: "Missing required fields" });
		}
		// the implementation is lacking
	} catch (error) {
		return res
			.status(500)
			.json({ error: "Error creating willing deposit request" });
	}
});

export default willingDepositRouter;
