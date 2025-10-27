import express from "express";
const analyticsRouter = express.Router();
import { AnalyticsService } from "@/src/services/analyticsService";

const analyticsService = new AnalyticsService();

// Get member growth trends
analyticsRouter.get("/member-growth", async (req, res) => {
	try {
		const trends = await analyticsService.getMemberGrowthTrends();
		res.status(200).json(trends);
	} catch (error) {
		res.status(500).json({ error: (error as Error).message });
	}
});

// Get savings trends
analyticsRouter.get("/savings-trends", async (req, res) => {
	try {
		const trends = await analyticsService.getSavingsTrends();
		res.status(200).json(trends);
	} catch (error) {
		res.status(500).json({ error: (error as Error).message });
	}
});

// Get loan performance
analyticsRouter.get("/loan-performance", async (req, res) => {
	try {
		const performance = await analyticsService.getLoanPerformance();
		res.status(200).json(performance);
	} catch (error) {
		res.status(500).json({ error: (error as Error).message });
	}
});

// Get delinquency report
analyticsRouter.get("/delinquency-report", async (req, res) => {
	try {
		const report = await analyticsService.getDelinquencyReport();
		res.status(200).json(report);
	} catch (error) {
		res.status(500).json({ error: (error as Error).message });
	}
});

// Get financial performance
analyticsRouter.get("/financial-performance", async (req, res) => {
	try {
		const { fromDate, toDate } = req.query;
		const performance = await analyticsService.getFinancialPerformance(
			fromDate ? new Date(fromDate as string) : undefined,
			toDate ? new Date(toDate as string) : undefined
		);
		res.status(200).json(performance);
	} catch (error) {
		res.status(500).json({ error: (error as Error).message });
	}
});

// Get loan portfolio breakdown
analyticsRouter.get("/loan-portfolio-breakdown", async (req, res) => {
	try {
		const breakdown = await analyticsService.getLoanPortfolioBreakdown();
		res.status(200).json(breakdown);
	} catch (error) {
		res.status(500).json({ error: (error as Error).message });
	}
});

// Get member demographics
analyticsRouter.get("/member-demographics", async (req, res) => {
	try {
		const demographics = await analyticsService.getMemberDemographics();
		res.status(200).json(demographics);
	} catch (error) {
		res.status(500).json({ error: (error as Error).message });
	}
});

export default analyticsRouter;
