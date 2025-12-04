import { execFile } from "child_process";
import fs from "fs";
import os from "os";
import path from "path";
import { db } from "./db";
import { PrintJob, PrinterSettings } from "../models/types";

const SETTINGS_ID = 1;

export function getPrinterSettings(): PrinterSettings {
  const row = db
    .prepare(`
      SELECT id, printerName, copies, enabled
      FROM printer_settings
      WHERE id = ?
    `)
    .get(SETTINGS_ID) as
    | {
        id: number;
        printerName: string | null;
        copies: number | null;
        enabled: number;
      }
    | undefined;

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

  // --- 票券排版（純文字版面，盡量在各種印表機上維持清晰）---
  const border = "==============================";
  const numberLine = `號碼：${String(job.queueNumber).padStart(3, "0")}`;
  const headerTitle = job.item.title || "標題";
  const headerSubtitle = job.item.subtitle ? `(${job.item.subtitle})` : "";

  const lines = [
    border,
    "        NTUB B-KIOSK",
    border,
    "",
    `【${job.categoryName}】`,
    numberLine,
    `時間：${job.timestamp}`,
    "",
    `標題：${headerTitle}`,
    headerSubtitle,
    "",
    "—— 內容 ——",
    job.item.content,
    "",
    job.item.footer ? `*** ${job.item.footer} ***` : "",
    border,
    "         感謝您的使用",
    border,
    "",
  ]
    .filter(Boolean)
    .join("\n");

  fs.writeFileSync(filePath, lines, "utf-8");

  const isWindows = process.platform === "win32";

  return new Promise((resolve) => {
    const cleanup = () => {
      fs.unlink(filePath, () => {});
    };

    // Windows：使用 PowerShell Out-Printer
    if (isWindows) {
      const copies = Math.max(1, settings.copies ?? 1);
      const psPrinter = settings.printerName.replace(/'/g, "''");
      const psPath = filePath.replace(/'/g, "''");
      const psScript = `
        $printer = '${psPrinter}';
        $path = '${psPath}';
        $copies = ${copies};
        1..$copies | ForEach-Object {
          Get-Content -Path $path -Encoding UTF8 | Out-Printer -Name $printer
        }
      `;

      execFile(
        "powershell.exe",
        ["-NoProfile", "-Command", psScript],
        (error, _stdout, stderr) => {
          cleanup();

          if (error) {
            const rawMsg =
              stderr?.toString().trim() ||
              error.message ||
              "送交印表機時發生錯誤（Windows）";

            const friendlyMsg = error.message.includes("ENOENT")
              ? "系統無法找到 PowerShell 列印指令（powershell.exe），請確認此機器為 Windows 並已安裝/啟用 PowerShell。"
              : rawMsg;

            console.error("[PRINT_JOB] PowerShell Out-Printer error", error, stderr);
            resolve({
              success: false,
              message: friendlyMsg,
            });
          } else {
            resolve({ success: true });
          }
        }
      );

      return;
    }

    // macOS / Linux：沿用 lp 指令
    const args = [
      "-d",
      settings.printerName,
      "-n",
      String(settings.copies ?? 1),
      filePath,
    ];

    execFile("lp", args, (error, _stdout, stderr) => {
      cleanup();

      if (error) {
        const rawMsg =
          stderr?.toString().trim() ||
          error.message ||
          "送交印表機時發生錯誤";

        const friendlyMsg = error.message.includes("ENOENT")
          ? "系統無法找到 lp 列印指令，請確認此機器已安裝 CUPS（或類似列印系統）並且有 lp 指令。"
          : rawMsg;

        console.error("[PRINT_JOB] lp error", error, stderr);
        resolve({
          success: false,
          message: friendlyMsg,
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
    const isWindows = process.platform === "win32";

    // Windows：使用 PowerShell 取得印表機清單（優先 Get-Printer，失敗時改用 Win32_Printer）
    if (isWindows) {
      const psScript = `
        try {
          $printers = Get-Printer | Select-Object Name, Default;
        } catch {
          $printers = $null;
        }

        if (-not $printers) {
          try {
            $printers = Get-WmiObject -Class Win32_Printer | Select-Object Name, Default;
          } catch {
            $printers = $null;
          }
        }

        if ($printers) {
          $printers | ConvertTo-Json -Compress
        }
      `;

      execFile(
        "powershell.exe",
        ["-NoProfile", "-Command", psScript],
        (err, stdout, stderr) => {
          if (err) {
            console.error("[PRINTER] Get-Printer error", err, stderr);
            resolve([]);
            return;
          }

          const text = stdout.toString().trim();
          if (!text) {
            resolve([]);
            return;
          }

          try {
            const parsed = JSON.parse(text) as
              | { Name?: string; Default?: boolean }
              | Array<{ Name?: string; Default?: boolean }>;

            const arr = Array.isArray(parsed) ? parsed : [parsed];
            const printers: SystemPrinter[] = arr
              .filter((p) => p && p.Name)
              .map((p) => ({
                name: String(p.Name),
                isDefault: !!p.Default,
              }));

            resolve(printers);
          } catch (e) {
            console.error("[PRINTER] parse Get-Printer JSON failed", e, text);
            resolve([]);
          }
        }
      );

      return;
    }

    // macOS / Linux：沿用 lpstat
    execFile("lpstat", ["-p"], (err, stdout, stderr) => {
      if (err) {
        // 若系統回報「沒有加入目標」或「No destinations added」，表示單純無印表機，不需報錯
        const isNoDestinations =
          stderr &&
          (stderr.includes("沒有加入目標") ||
            stderr.includes("No destinations added"));

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
          const m = dStdout
            .toString()
            .match(/system default destination: (.+)/);
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


