// import express from 'express'
// import XLSX from "xlsx"
// import { prisma } from '../config/prisma.js';
// import { getSession } from './auth/auth.js';
// import { LoanApprovalLog, LoanApprovalStatus, Prisma, UserRole} from '@prisma/client';
// import { sendNotification } from './notification/notification.controller.js';
// import fs  from "fs";
// import { mkdir, readFile, writeFile } from 'fs/promises';
// import multer from 'multer'
// import mime from 'mime-types';

// const salaryRouter = express.Router();

// const upload = multer({dest:"uploads/"});

// salaryRouter.post('/import', upload.single("excel_file"),  async (req, res) => {
//     try {
//     const session = await getSession(req);
//     if (!session || session.role === 'MEMBER') return res.status(401).json("Unauthorized");
//     if (!req.file) return res.status(400).json({message : "Upload a file first"});
//     const workbook = XLSX.readFile(req.file?.path);
//     const sheetName = workbook.SheetNames[0];
//     const sheet = workbook.Sheets[sheetName!]; //
//     const data: { etNumber: number; email: string; salary: number }[] = XLSX.utils.sheet_to_json(sheet!);// we can change this later on
//     for (const row of data){
//         if (!row.email || !row.salary) continue;
//          await prisma.user.update({
//         where: { email: row.email.toString() },
//         data: { salary: Number(row.salary) },
//       });

//     }
//     return res.json({ success: true, message: "Salaries updated successfully" });}
//     catch(error) {
//         console.error("Error importing salaries:", error);
//         return res.status(500).json({ error: "Failed to import salaries" });
//     }

// })
// export default salaryRouter;
