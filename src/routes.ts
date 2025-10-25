import { Router } from "express";
import loansRouter from "./controllers/loans.controller";
import dashboardRouter from "./controllers/dashboard.controller";
import membersRouter from "./controllers/members.controller";
import membershipRouter from "./controllers/membership.controller";
import authLoginRouter from "./controllers/auth/login.auth";
import authLogoutRouter from "./controllers/auth/logout.auth";
import sessionRouter from "./controllers/auth/session.auth";
import notificationRouter from "./controllers/notification/notification.controller";
import adminSignupRouter from "./controllers/auth/admin/signup.auth";
import {
	fetchMembers,
	importMembers,
} from "@/src/controllers/memberController";
// import reportRouter from './controllers/report.controller';
// import salaryRouter from './controllers/importSalary.controller';
const router = Router();

router.use("/dashboard", dashboardRouter);
router.use("/loans", loansRouter);
router.use("/members", membersRouter);
router.use("/membership", membershipRouter);
router.use("/notifications", notificationRouter);
// router.use('/report', reportRouter);
// router.use('/importSalary', salaryRouter);

// Might add the auth routes

router.use("/auth/login", authLoginRouter);
router.use("/auth/logout", authLogoutRouter);
router.use("/auth/session", sessionRouter);
router.use("/auth/register", adminSignupRouter);

router.use("/members__/import", importMembers);
router.use("/members__", fetchMembers);

export default router;
