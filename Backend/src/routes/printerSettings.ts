import { Router } from "express";
import { getPrinterSettings, savePrinterSettings } from "../data/printer";

const router = Router();

router.get("/", (_req, res) => {
  const settings = getPrinterSettings();
  res.json(settings);
});

router.put("/", (req, res) => {
  const { printerName, copies, enabled } = req.body as {
    printerName?: string;
    copies?: number;
    enabled?: boolean;
  };

  const next = savePrinterSettings({
    printerName,
    copies,
    enabled,
  });

  res.json(next);
});

export default router;


