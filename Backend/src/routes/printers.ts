import { Router } from "express";
import { listSystemPrinters } from "../data/printer";

const router = Router();

router.get("/", async (_req, res) => {
  try {
    const printers = await listSystemPrinters();
    res.json(printers);
  } catch (e) {
    console.error("[PRINTER] list printers failed", e);
    res.status(500).json({ message: "無法偵測系統印表機" });
  }
});

export default router;


