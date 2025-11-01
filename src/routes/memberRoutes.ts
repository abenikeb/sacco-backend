import {
	deleteMember,
	getMember,
	getMemberByEtNumber,
	importMembers,
	listMembers,
	registerMember,
	updateMember,
} from "../controllers/memberController";

import express, { type Router } from "express";
import multer from "multer";
import path from "path";
import fs from "fs";

const router = express.Router();

router.post("/import", importMembers);

// import { MemberController } from "../controllers/memberController";

const membershipRouter: Router = express.Router();
// Update multer storage to use absolute path for uploads directory
const uploadsDir = path.join(__dirname, "../../uploads/members");

// Ensure directory exists
if (!fs.existsSync(uploadsDir)) {
	fs.mkdirSync(uploadsDir, { recursive: true });
}

const storage = multer.diskStorage({
	destination: (req, file, cb) => {
		cb(null, uploadsDir);
	},
	filename: (req, file, cb) => {
		const uniqueSuffix = Date.now() + "-" + Math.round(Math.random() * 1e9);
		cb(null, file.fieldname + "-" + uniqueSuffix);
	},
});

const upload = multer({
	storage,
	limits: {
		fileSize: 5 * 1024 * 1024, // 5MB
	},
	fileFilter: (req, file, cb) => {
		const allowedMimes = ["image/jpeg", "image/png", "application/pdf"];
		if (allowedMimes.includes(file.mimetype)) {
			cb(null, true);
		} else {
			cb(new Error("Invalid file type"));
		}
	},
});

/**
 * POST /api/members/register
 * Register a new member with national ID files
 * Body: { name, email?, phone?, etNumber, department?, division?, section?, group?, salary? }
 * Files: national_id_front, national_id_back
 */
membershipRouter.post(
	"/register",
	upload.fields([
		{ name: "national_id_front", maxCount: 1 },
		{ name: "national_id_back", maxCount: 1 },
	]),
	(req, res) => registerMember(req, res)
);

/**
 * GET /api/members
 * List all members with pagination and filtering
 * Query: skip?, take?, department?, division?
 */
membershipRouter.get("/", (req, res) => listMembers(req, res));

/**
 * GET /api/members/:id
 * Get member by ID
 */
membershipRouter.get("/:memberId", (req, res) => getMember(req, res));

/**
 * GET /api/members/et/:etNumber
 * Get member by etNumber
 */
membershipRouter.get("/et/:etNumber", (req, res) =>
	getMemberByEtNumber(req, res)
);

/**
 * PATCH /api/members/:id
 * Update member
 */
membershipRouter.patch(
	"/:id",
	upload.fields([
		{ name: "national_id_front", maxCount: 1 },
		{ name: "national_id_back", maxCount: 1 },
	]),
	(req, res) => updateMember(req, res)
);
/**
 * DELETE /api/members/:id
 * Delete member
 */
membershipRouter.delete("/:id", (req, res) => deleteMember(req, res));

export default membershipRouter;
