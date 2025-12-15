import { Router } from "express";
import { getPrinterSettings, savePrinterSettings } from "../data/printer";

const router = Router();

router.get("/", (_req, res) => {
  const settings = getPrinterSettings();
  res.json(settings);
});

router.put("/", (req, res) => {
  const { printerName, copies, enabled, paperWidthMm } = req.body as {
    printerName?: string;
    copies?: number;
    enabled?: boolean;
    paperWidthMm?: number;
  };

  const next = savePrinterSettings({
    printerName,
    copies,
    enabled,
    paperWidthMm,
  });

  res.json(next);
});

export default router;


