import express from "express";
import { importMembers } from "../controllers/memberController";

const router = express.Router();

router.post("/import", importMembers);

export default router;
