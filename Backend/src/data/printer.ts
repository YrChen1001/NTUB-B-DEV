import { execFile } from "child_process";
import fs from "fs";
import os from "os";
import path from "path";
import { db } from "./db";
import { PrintJob, PrinterSettings } from "../models/types";

const SETTINGS_ID = 1;

export function getPrinterSettings(): PrinterSettings {
  const row = db
    .prepare<never, PrinterSettings & { enabled: number }>(`
      SELECT id, printerName, copies, enabled
      FROM printer_settings
      WHERE id = ?
    `)
    .get(SETTINGS_ID);

  if (!row) {
    return {
      id: SETTINGS_ID,
      printerName: "",
      copies: 1,
      enabled: false,
    };
  }

  return {
    id: row.id,
    printerName: row.printerName ?? "",
    copies: row.copies ?? 1,
    enabled: !!row.enabled,
  };
}

export function savePrinterSettings(partial: Partial<PrinterSettings>): PrinterSettings {
  const current = getPrinterSettings();
  const next: PrinterSettings = {
    id: SETTINGS_ID,
    printerName: partial.printerName ?? current.printerName,
    copies: partial.copies ?? current.copies,
    enabled: partial.enabled ?? current.enabled,
  };

  db.prepare(
    `
    INSERT INTO printer_settings (id, printerName, copies, enabled)
    VALUES (@id, @printerName, @copies, @enabled)
    ON CONFLICT(id) DO UPDATE SET
      printerName = excluded.printerName,
      copies = excluded.copies,
      enabled = excluded.enabled
  `
  ).run({
    id: SETTINGS_ID,
    printerName: next.printerName,
    copies: next.copies,
    enabled: next.enabled ? 1 : 0,
  });

  return next;
}

export function sendToPrinter(job: PrintJob): Promise<{ success: boolean; message?: string }> {
  const settings = getPrinterSettings();

  if (!settings.enabled) {
    return Promise.resolve({
      success: false,
      message: "列印功能已在設定中關閉",
    });
  }

  if (!settings.printerName) {
    return Promise.resolve({
      success: false,
      message: "尚未在設定中指定印表機名稱",
    });
  }

  const tmpDir = os.tmpdir();
  const fileName = `arcana-ticket-${Date.now()}.txt`;
  const filePath = path.join(tmpDir, fileName);

  const lines = [
    `【${job.categoryName}】`,
    `時間：${job.timestamp}`,
    `號碼：${String(job.queueNumber).padStart(3, "0")}`,
    "",
    `標題：${job.item.title}`,
    job.item.subtitle ? `副標題：${job.item.subtitle}` : "",
    "",
    job.item.content,
    "",
    job.item.footer ? `*** ${job.item.footer} ***` : "",
    "",
  ]
    .filter(Boolean)
    .join("\n");

  fs.writeFileSync(filePath, lines, "utf-8");

  return new Promise((resolve) => {
    const args = [
      "-d",
      settings.printerName,
      "-n",
      String(settings.copies ?? 1),
      filePath,
    ];

    execFile("lp", args, (error, _stdout, stderr) => {
      fs.unlink(filePath, () => {});

      if (error) {
        console.error("[PRINT_JOB] lp error", error, stderr);
        resolve({
          success: false,
          message:
            stderr?.toString().trim() ||
            error.message ||
            "送交印表機時發生錯誤",
        });
      } else {
        resolve({ success: true });
      }
    });
  });
}

export interface SystemPrinter {
  name: string;
  status?: string;
  isDefault?: boolean;
}

export function listSystemPrinters(): Promise<SystemPrinter[]> {
  return new Promise((resolve) => {
    execFile("lpstat", ["-p"], (err, stdout, stderr) => {
      if (err) {
        // 若系統回報「沒有加入目標」或「No destinations added」，表示單純無印表機，不需報錯
        const isNoDestinations = stderr && (stderr.includes("沒有加入目標") || stderr.includes("No destinations added"));
        
        if (!isNoDestinations) {
          console.error("[PRINTER] lpstat -p error", err, stderr);
        }
        resolve([]);
        return;
      }

      const printers: SystemPrinter[] = [];
      const lines = stdout.toString().split("\n");
      for (const line of lines) {
        const trimmed = line.trim();
        if (!trimmed.startsWith("printer ")) continue;
        // 典型輸出: "printer EPSON_TM_T88V is idle.  enabled since ..."
        const parts = trimmed.split(/\s+/);
        const name = parts[1];
        const status = parts.slice(2).join(" ");
        printers.push({ name, status });
      }

      // 嘗試找出預設印表機
      execFile("lpstat", ["-d"], (dErr, dStdout) => {
        if (!dErr) {
          const m = dStdout.toString().match(/system default destination: (.+)/);
          if (m && m[1]) {
            const def = m[1].trim();
            printers.forEach((p) => {
              if (p.name === def) p.isDefault = true;
            });
          }
        }
        resolve(printers);
      });
    });
  });
}


