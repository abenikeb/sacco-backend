import express from "express";
import { prisma } from "../config/prisma";
import { getSession } from "./auth/auth";
import { UserRole } from "@prisma/client";

const loanProductsRouter = express.Router();

loanProductsRouter.post("/auto-assign", async (req, res) => {
	try {
		const { totalContributions } = req.body;

		if (totalContributions === undefined || totalContributions === null) {
			return res.status(400).json({ error: "Total contributions is required" });
		}

		// Find the highest tier product that the member qualifies for
		const product = await prisma.loanProduct.findFirst({
			where: {
				isActive: true,
				minTotalContributions: {
					lte: totalContributions, // Member's contributions must be >= product's minimum
				},
			},
			orderBy: {
				minTotalContributions: "desc", // Get the highest tier they qualify for
			},
		});

		if (!product) {
			const lowestProduct = await prisma.loanProduct.findFirst({
				where: { isActive: true },
				orderBy: { minTotalContributions: "asc" },
			});

			return res.status(400).json({
				error: `You do not qualify for any loan product. Minimum total contributions required: ${lowestProduct?.minTotalContributions || 0} ETB. Your current contributions: ${totalContributions.toLocaleString()} ETB`,
			});
		}

		return res.json(product);
	} catch (error) {
		console.error("Error auto-assigning loan product:", error);
		return res
			.status(500)
			.json({ error: "Failed to auto-assign loan product" });
	}
});

// Get all loan products
loanProductsRouter.get("/", async (req, res) => {
	try {
		const products = await prisma.loanProduct.findMany({
			orderBy: { createdAt: "desc" },
		});
		return res.json(products);
	} catch (error) {
		console.error("Error fetching loan products:", error);
		return res.status(500).json({ error: "Failed to fetch loan products" });
	}
});

// Get active loan products only
loanProductsRouter.get("/active", async (req, res) => {
	try {
		const products = await prisma.loanProduct.findMany({
			where: { isActive: true },
			orderBy: { name: "asc" },
		});
		return res.json(products);
	} catch (error) {
		console.error("Error fetching active loan products:", error);
		return res
			.status(500)
			.json({ error: "Failed to fetch active loan products" });
	}
});

// Get single loan product
loanProductsRouter.get("/:id", async (req, res) => {
	try {
		const product = await prisma.loanProduct.findUnique({
			where: { id: Number.parseInt(req.params.id) },
		});
		if (!product) {
			return res.status(404).json({ error: "Loan product not found" });
		}
		return res.json(product);
	} catch (error) {
		console.error("Error fetching loan product:", error);
		return res.status(500).json({ error: "Failed to fetch loan product" });
	}
});

// Create new loan product (Admin only)
loanProductsRouter.post("/", async (req, res) => {
	const session = await getSession(req);
	if (!session || session.role !== UserRole.MANAGER) {
		return res
			.status(401)
			.json({ error: "Unauthorized - Manager access required" });
	}

	try {
		const {
			name,
			description,
			interestRate,
			minDurationMonths,
			maxDurationMonths,
			requiredSavingsPercentage,
			requiredSavingsDuringLoan,
			maxLoanBasedOnSalaryMonths,
			minTotalContributions,
		} = req.body.formData;

		// Validation
		if (!name) {
			return res.status(400).json({ error: "Product name is required" });
		}

		if (interestRate < 0 || interestRate > 100) {
			return res
				.status(400)
				.json({ error: "Interest rate must be between 0 and 100" });
		}

		if (minDurationMonths < 1 || maxDurationMonths < minDurationMonths) {
			return res.status(400).json({ error: "Invalid duration range" });
		}

		if (requiredSavingsPercentage < 0 || requiredSavingsPercentage > 100) {
			return res.status(400).json({
				error: "Required savings percentage must be between 0 and 100",
			});
		}

		if (minTotalContributions !== undefined && minTotalContributions < 0) {
			return res
				.status(400)
				.json({ error: "Minimum total contributions cannot be negative" });
		}

		// Check if product name already exists
		const existingProduct = await prisma.loanProduct.findUnique({
			where: { name },
		});

		if (existingProduct) {
			return res
				.status(400)
				.json({ error: "Loan product with this name already exists" });
		}

		const product = await prisma.loanProduct.create({
			data: {
				name,
				description,
				interestRate: Number(interestRate),
				minDurationMonths: Number(minDurationMonths),
				maxDurationMonths: Number(maxDurationMonths),
				requiredSavingsPercentage: Number(requiredSavingsPercentage),
				requiredSavingsDuringLoan: Number(requiredSavingsDuringLoan),
				maxLoanBasedOnSalaryMonths: Number(maxLoanBasedOnSalaryMonths),
				minTotalContributions: Number(minTotalContributions || 0),
			},
		});

		return res.status(201).json({
			success: true,
			message: "Loan product created successfully",
			product,
		});
	} catch (error) {
		console.error("Error creating loan product:", error);
		return res.status(500).json({ error: "Failed to create loan product" });
	}
});

// Update loan product (Admin only)
loanProductsRouter.put("/:id", async (req, res) => {
	const session = await getSession(req);
	// if (!session || session.role !== UserRole.MANAGER) {
	// 	return res
	// 		.status(401)
	// 		.json({ error: "Unauthorized - Manager access required" });
	// }
	if (!session) {
		return res
			.status(401)
			.json({ error: "Unauthorized - Manager access required" });
	}

	try {
		const productId = Number.parseInt(req.params.id);
		const {
			name,
			description,
			interestRate,
			minDurationMonths,
			maxDurationMonths,
			requiredSavingsPercentage,
			requiredSavingsDuringLoan,
			maxLoanBasedOnSalaryMonths,
			minTotalContributions,
			isActive,
		} = req.body.formData;

		console.log({
			request: req,
			body: req.body,
			productId: Number.parseInt(req.params.id),
		});

		// Check if product exists
		const product = await prisma.loanProduct.findUnique({
			where: { id: productId },
		});

		console.log({ productss: product });

		if (!product) {
			return res.status(404).json({ error: "Loan product not found" });
		}

		// Validation
		if (name && name !== product.name) {
			const existingProduct = await prisma.loanProduct.findUnique({
				where: { name },
			});
			if (existingProduct) {
				return res
					.status(400)
					.json({ error: "Loan product with this name already exists" });
			}
		}

		if (
			interestRate !== undefined &&
			(interestRate < 0 || interestRate > 100)
		) {
			return res
				.status(400)
				.json({ error: "Interest rate must be between 0 and 100" });
		}

		if (minTotalContributions !== undefined && minTotalContributions < 0) {
			return res
				.status(400)
				.json({ error: "Minimum total contributions cannot be negative" });
		}

		const updatedProduct = await prisma.loanProduct.update({
			where: { id: productId },
			data: {
				...(name && { name }),
				...(description !== undefined && { description }),
				...(interestRate !== undefined && {
					interestRate: Number(interestRate),
				}),
				...(minDurationMonths !== undefined && {
					minDurationMonths: Number(minDurationMonths),
				}),
				...(maxDurationMonths !== undefined && {
					maxDurationMonths: Number(maxDurationMonths),
				}),
				...(requiredSavingsPercentage !== undefined && {
					requiredSavingsPercentage: Number(requiredSavingsPercentage),
				}),
				...(requiredSavingsDuringLoan !== undefined && {
					requiredSavingsDuringLoan: Number(requiredSavingsDuringLoan),
				}),
				...(maxLoanBasedOnSalaryMonths !== undefined && {
					maxLoanBasedOnSalaryMonths: Number(maxLoanBasedOnSalaryMonths),
				}),
				...(minTotalContributions !== undefined && {
					minTotalContributions: Number(minTotalContributions),
				}),
				...(isActive !== undefined && { isActive }),
			},
		});

		return res.json({
			success: true,
			message: "Loan product updated successfully",
			product: updatedProduct,
		});
	} catch (error) {
		console.error("Error updating loan product:", error);
		return res.status(500).json({ error: "Failed to update loan product" });
	}
});

// Delete loan product (Admin only)
loanProductsRouter.delete("/:id", async (req, res) => {
	const session = await getSession(req);
	if (!session || session.role !== UserRole.MANAGER) {
		return res
			.status(401)
			.json({ error: "Unauthorized - Manager access required" });
	}

	try {
		const productId = Number.parseInt(req.params.id);

		// Check if product exists
		const product = await prisma.loanProduct.findUnique({
			where: { id: productId },
		});

		if (!product) {
			return res.status(404).json({ error: "Loan product not found" });
		}

		// Check if product is being used by any loans
		const loansUsingProduct = await prisma.loan.findMany({
			where: { loanProductId: productId },
		});

		if (loansUsingProduct.length > 0) {
			return res.status(400).json({
				error: `Cannot delete loan product. It is being used by ${loansUsingProduct.length} loan(s). Deactivate it instead.`,
			});
		}

		await prisma.loanProduct.delete({
			where: { id: productId },
		});

		return res.json({
			success: true,
			message: "Loan product deleted successfully",
		});
	} catch (error) {
		console.error("Error deleting loan product:", error);
		return res.status(500).json({ error: "Failed to delete loan product" });
	}
});

export default loanProductsRouter;
