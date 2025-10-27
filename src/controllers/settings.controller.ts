import express from "express";
const settingsRouter = express.Router();
import { SettingsService } from "@/src/services/settingsService";
import type { UserRole } from "@prisma/client";
const settingsService = new SettingsService();
// Get all users
settingsRouter.get("/users", async (req, res) => {
	try {
		const { page = 1, limit = 20 } = req.query;
		const result = await settingsService.getAllUsers(
			Number(page),
			Number(limit)
		);
		res.status(200).json(result);
	} catch (error: any) {
		res.status(500).json({ error: error.message });
	}
});

// Get user by ID
settingsRouter.get("/users/:id", async (req, res) => {
	try {
		const { id } = req.params;
		const user = await settingsService.getUserById(Number(id));
		res.status(200).json(user);
	} catch (error: any) {
		res.status(500).json({ error: error.message });
	}
});

// Create new user
settingsRouter.post("/users", async (req, res) => {
	try {
		const { name, email, phone, password, role } = req.body;
		const user = await settingsService.createUser({
			name,
			email,
			phone,
			password,
			role: role as UserRole,
		});
		res.status(201).json(user);
	} catch (error: any) {
		res.status(500).json({ error: error.message });
	}
});

// Update user role
settingsRouter.put("/users/:id/role", async (req, res) => {
	try {
		const { id } = req.params;
		const { role } = req.body;
		const user = await settingsService.updateUserRole(
			Number(id),
			role as UserRole
		);
		res.status(200).json(user);
	} catch (error: any) {
		res.status(500).json({ error: error.message });
	}
});

// Delete user
settingsRouter.delete("/users/:id", async (req, res) => {
	try {
		const { id } = req.params;
		await settingsService.deleteUser(Number(id));
		res.status(200).json({ message: "User deleted successfully" });
	} catch (error: any) {
		res.status(500).json({ error: error.message });
	}
});

// Get role permissions
settingsRouter.get("/roles/:role/permissions", async (req, res) => {
	try {
		const { role } = req.params;
		const permissions = settingsService.getRolePermissions(role as UserRole);
		res.status(200).json({ role, permissions });
	} catch (error: any) {
		res.status(500).json({ error: error.message });
	}
});

// Get all available roles
settingsRouter.get("/roles", async (req, res) => {
	try {
		const roles = settingsService.getAllRoles();
		res.status(200).json({ roles });
	} catch (error: any) {
		res.status(500).json({ error: error.message });
	}
});

// Get system configuration
settingsRouter.get("/system-config", async (req, res) => {
	try {
		const config = await settingsService.getSystemConfig();
		res.status(200).json(config);
	} catch (error: any) {
		res.status(500).json({ error: error.message });
	}
});

// Update system configuration
settingsRouter.put("/system-config", async (req, res) => {
	try {
		const config = await settingsService.updateSystemConfig(req.body);
		res.status(200).json(config);
	} catch (error: any) {
		res.status(500).json({ error: error.message });
	}
});

// Get audit logs
settingsRouter.get("/audit-logs", async (req, res) => {
	try {
		const { page = 1, limit = 50 } = req.query;
		const logs = await settingsService.getAuditLogs(
			Number(page),
			Number(limit)
		);
		res.status(200).json(logs);
	} catch (error: any) {
		res.status(500).json({ error: error.message });
	}
});

// Get user activity summary
settingsRouter.get("/user-activity-summary", async (req, res) => {
	try {
		const summary = await settingsService.getUserActivitySummary();
		res.status(200).json(summary);
	} catch (error: any) {
		res.status(500).json({ error: error.message });
	}
});

export default settingsRouter;
