import { Router } from "express";
import { db } from "../data/db";
import { PrintJob } from "../models/types";
import { sendToPrinter } from "../data/printer";

const router = Router();

// 接收前端送來的列印工作：記錄到資料庫，並嘗試送交實體印表機
router.post("/", async (req, res) => {
  const job = req.body as PrintJob;

  if (!job || !job.item || !job.categoryName || !job.timestamp) {
    return res.status(400).json({ message: "Invalid print job payload" });
  }

  const stmt = db.prepare(`
    INSERT INTO print_jobs (payload, createdAt)
    VALUES (@payload, @createdAt)
  `);

  const createdAt = new Date().toISOString();
  const result = stmt.run({
    payload: JSON.stringify(job),
    createdAt,
  });

  console.log("[PRINT_JOB] queued", { id: result.lastInsertRowid, createdAt });

  const printResult = await sendToPrinter(job);

  res.status(printResult.success ? 201 : 202).json({
    id: result.lastInsertRowid,
    createdAt,
    printed: printResult.success,
    error: printResult.message,
  });
});

export default router;


