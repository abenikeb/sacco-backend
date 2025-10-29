import express from "express";
const permissionRouter = express.Router();

import { PermissionService } from "../services/permissionService";
const permissionService = new PermissionService();
// Get all permissions
permissionRouter.get("/", async (req, res) => {
	try {
		const permissions = await permissionService.getAllPermissions();
		res.status(200).json(permissions);
	} catch (error) {
		res.status(500).json({ error: "Failed to fetch permissions" });
	}
});

// Get all roles with permissions
permissionRouter.get("/roles", async (req, res) => {
	try {
		const roles = await permissionService.getAllRolesWithPermissions();
		res.status(200).json(roles);
	} catch (error) {
		res.status(500).json({ error: "Failed to fetch roles" });
	}
});

// Get role by ID with permissions
permissionRouter.get("/roles/:roleId", async (req, res) => {
	try {
		const role = await permissionService.getRoleWithPermissions(
			Number.parseInt(req.params.roleId)
		);
		res.status(200).json(role);
	} catch (error) {
		res.status(500).json({ error: "Failed to fetch role" });
	}
});

// Create role
permissionRouter.post("/roles", async (req, res) => {
	try {
		const { name, description } = req.body;
		const role = await permissionService.createRole(name, description);
		res.status(201).json(role);
	} catch (error) {
		res.status(500).json({ error: "Failed to create role" });
	}
});

// Update role
permissionRouter.put("/roles/:roleId", async (req, res) => {
	try {
		const { name, description } = req.body;
		const role = await permissionService.updateRole(
			Number.parseInt(req.params.roleId),
			name,
			description
		);
		res.status(200).json(role);
	} catch (error) {
		res.status(500).json({ error: "Failed to update role" });
	}
});

// Assign permission to role
permissionRouter.post(
	"/roles/:roleId/permissions/:permissionId",
	async (req, res) => {
		try {
			const rolePermission = await permissionService.assignPermissionToRole(
				Number.parseInt(req.params.roleId),
				Number.parseInt(req.params.permissionId)
			);
			res.status(201).json(rolePermission);
		} catch (error) {
			res.status(500).json({ error: "Failed to assign permission" });
		}
	}
);

// Remove permission from role
permissionRouter.delete(
	"/roles/:roleId/permissions/:permissionId",
	async (req, res) => {
		try {
			await permissionService.removePermissionFromRole(
				Number.parseInt(req.params.roleId),
				Number.parseInt(req.params.permissionId)
			);
			res.status(200).json({ message: "Permission removed from role" });
		} catch (error) {
			res.status(500).json({ error: "Failed to remove permission" });
		}
	}
);

// Get user permissions
permissionRouter.get("/users/:userId/permissions", async (req, res) => {
	try {
		const permissions = await permissionService.getUserPermissions(
			Number.parseInt(req.params.userId)
		);
		res.status(200).json(permissions);
	} catch (error) {
		res.status(500).json({ error: "Failed to fetch user permissions" });
	}
});

// Check if user has permission
permissionRouter.post("/users/:userId/check-permission", async (req, res) => {
	try {
		const { resource, action } = req.body;
		const hasPermission = await permissionService.hasPermission(
			Number.parseInt(req.params.userId),
			resource,
			action
		);
		res.status(200).json({ hasPermission });
	} catch (error) {
		res.status(500).json({ error: "Failed to check permission" });
	}
});

// Assign role to user
permissionRouter.post("/users/:userId/role/:roleId", async (req, res) => {
	try {
		const user = await permissionService.assignRoleToUser(
			Number.parseInt(req.params.userId),
			Number.parseInt(req.params.roleId)
		);
		res.status(200).json(user);
	} catch (error) {
		res.status(500).json({ error: "Failed to assign role to user" });
	}
});

// Initialize default roles and permissions
permissionRouter.post("/initialize", async (req, res) => {
	try {
		const result = await permissionService.initializeDefaultRoles();
		res.status(200).json(result);
	} catch (error) {
		res
			.status(500)
			.json({ error: "Failed to initialize roles and permissions" });
	}
});
export default permissionRouter;
