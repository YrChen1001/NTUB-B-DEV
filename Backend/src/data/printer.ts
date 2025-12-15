import { execFile } from "child_process";
import fs from "fs";
import os from "os";
import path from "path";
import puppeteer from "puppeteer";
import { db } from "./db";
import { PrintJob, PrinterSettings } from "../models/types";

const SETTINGS_ID = 1;

const PAPER_WIDTH_MM = 80;

function normalizePaperWidthMm(value: unknown): number {
  // 依需求：列印寬度固定 80mm（不提供 A4/其他尺寸）
  void value;
  return PAPER_WIDTH_MM;
}

// --- 票券排版（精美網頁版）---
function generateHtml(job: PrintJob, paperWidthMm: number): string {
  const qNumber = String(job.queueNumber).padStart(3, "0");
  const prettyTime = job.timestamp.replace("T", " ").slice(0, 16);
  const widthMm = normalizePaperWidthMm(paperWidthMm);
  
  const css = `
    @page {
      margin: 0;
      size: ${widthMm}mm auto;
    }
    
    body {
      margin: 0;
      padding: 0;
      width: ${widthMm}mm;
      box-sizing: border-box;
      background: #fff;
      color: #000;
      overflow: visible;
      font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", "Courier New", monospace;
    }

    .ticket {
      width: ${widthMm}mm;
      box-sizing: border-box;
      /* 留一點邊界避免硬體不可印邊，但不縮小整體寬度 */
      padding: 4mm;
      position: relative;
      display: flex;
      flex-direction: column;
    }

    .header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 6mm;
      border-bottom: 2px solid #000;
      padding-bottom: 4mm;
    }

    .sparkle {
      width: 10px;
      height: 10px;
      opacity: 0.45;
      color: #94a3b8;
    }

    .category {
      font-size: 16px;
      font-weight: 900;
      letter-spacing: 0.12em;
      text-transform: uppercase;
      text-align: center;
      flex: 1;
      margin: 0 6px;
      overflow-wrap: anywhere;
      word-break: break-word;
    }

    .meta {
      text-align: center;
      margin-bottom: 6mm;
    }

    .time {
      font-size: 10px;
      color: #64748b;
      letter-spacing: 0.12em;
      text-transform: uppercase;
      margin-bottom: 2mm;
    }

    .badge {
      display: inline-block;
      background: #000;
      color: #fff;
      padding: 2mm 4mm;
      border-radius: 9999px;
      font-size: 11px;
      font-weight: 700;
    }

    .titleBlock {
      text-align: center;
      margin-bottom: 7mm;
    }

    .title {
      font-size: 18px;
      font-weight: 700;
      line-height: 1.15;
      margin: 0 0 2mm 0;
    }

    .subtitle {
      margin: 0;
      font-size: 12px;
      font-style: italic;
      color: #475569;
      font-family: ui-serif, Georgia, Cambria, "Times New Roman", Times, serif;
    }

    .contentBox {
      background: #f8fafc;
      border: 1px solid #e2e8f0;
      border-radius: 8px;
      padding: 4mm;
      margin-bottom: 6mm;
      flex: 1;
      overflow: visible;
    }

    .content {
      margin: 0;
      font-size: 11px;
      line-height: 1.55;
      color: #1f2937;
      white-space: pre-wrap;
      text-align: justify;
      overflow-wrap: anywhere;
      word-break: break-word;
    }

    .footer {
      text-align: center;
      font-size: 10px;
      font-weight: 700;
      letter-spacing: 0.08em;
      color: #94a3b8;
      text-transform: uppercase;
      margin-top: 0;
    }

    .bottomBar {
      position: absolute;
      left: 0;
      right: 0;
      bottom: 0;
      height: 2mm;
      background: #0f172a;
    }
  `;

  return `
    <!DOCTYPE html>
    <html>
      <head>
        <meta charset="UTF-8">
        <style>${css}</style>
      </head>
      <body>
        <div class="ticket">
          <div class="header">
            <div class="sparkle">✦</div>
            <div class="category">${job.categoryName}</div>
            <div class="sparkle">✦</div>
          </div>

          <div class="meta">
            <div class="time">${prettyTime}</div>
            <div class="badge">#${qNumber}</div>
          </div>

          <div class="titleBlock">
            <div class="title">${job.item.title || "無標題"}</div>
            ${job.item.subtitle ? `<p class="subtitle">${job.item.subtitle}</p>` : ""}
          </div>

          <div class="contentBox">
            <p class="content">${job.item.content}</p>
          </div>

          ${job.item.footer ? `<div class="footer">*** ${job.item.footer} ***</div>` : ""}

          <div class="bottomBar"></div>
        </div>
      </body>
    </html>
  `;
}

export function getPrinterSettings(): PrinterSettings {
  const row = db
    .prepare(`
      SELECT id, printerName, copies, enabled, paperWidthMm
      FROM printer_settings
      WHERE id = ?
    `)
    .get(SETTINGS_ID) as
    | {
        id: number;
        printerName: string | null;
        copies: number | null;
        enabled: number;
        paperWidthMm?: number | null;
      }
    | undefined;

  if (!row) {
    return {
      id: SETTINGS_ID,
      printerName: "",
      copies: 1,
      enabled: false,
      paperWidthMm: 80,
    };
  }

  return {
    id: row.id,
    printerName: row.printerName ?? "",
    copies: row.copies ?? 1,
    enabled: !!row.enabled,
    paperWidthMm: normalizePaperWidthMm(row.paperWidthMm ?? 80),
  };
}

export function savePrinterSettings(partial: Partial<PrinterSettings>): PrinterSettings {
  const current = getPrinterSettings();
  const next: PrinterSettings = {
    id: SETTINGS_ID,
    printerName: partial.printerName ?? current.printerName,
    copies: partial.copies ?? current.copies,
    enabled: partial.enabled ?? current.enabled,
    paperWidthMm: normalizePaperWidthMm(partial.paperWidthMm ?? current.paperWidthMm),
  };

  db.prepare(
    `
    INSERT INTO printer_settings (id, printerName, copies, enabled, paperWidthMm)
    VALUES (@id, @printerName, @copies, @enabled, @paperWidthMm)
    ON CONFLICT(id) DO UPDATE SET
      printerName = excluded.printerName,
      copies = excluded.copies,
      enabled = excluded.enabled,
      paperWidthMm = excluded.paperWidthMm
  `
  ).run({
    id: SETTINGS_ID,
    printerName: next.printerName,
    copies: next.copies,
    enabled: next.enabled ? 1 : 0,
    paperWidthMm: next.paperWidthMm,
  });

  return next;
}

export function sendToPrinter(job: PrintJob): Promise<{ success: boolean; message?: string }> {
  const settings = getPrinterSettings();

  const paperWidthMm = normalizePaperWidthMm(settings.paperWidthMm ?? PAPER_WIDTH_MM);

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

  return new Promise(async (resolve) => {
    let browser;
    const isWindows = process.platform === "win32";
    const tmpDir = os.tmpdir();
    
    // Windows 改用 PNG 截圖列印
    const outputExt = isWindows ? "png" : "pdf";
    const outputPath = path.join(tmpDir, `ticket-${Date.now()}.${outputExt}`);

    try {
      browser = await puppeteer.launch({
        headless: true,
        args: ["--no-sandbox", "--disable-setuid-sandbox"],
      });
      const page = await browser.newPage();
      
      const htmlContent = generateHtml(job, paperWidthMm);
      await page.setContent(htmlContent, { waitUntil: "networkidle0" });

      if (isWindows) {
        // Windows: 截圖為 PNG（必須設定 viewport 寬度以確保排版正確）
        // 既有實作 80mm -> 320px（約 4px/mm），維持一致比例
        const viewportWidth = Math.round(PAPER_WIDTH_MM * 4);
        await page.setViewport({ width: viewportWidth, height: 800, deviceScaleFactor: 2 });
        await page.screenshot({ path: outputPath, fullPage: true });
      } else {
        // macOS / Linux: 產生 PDF
        await page.pdf({
          path: outputPath,
          width: `${paperWidthMm}mm`,
          printBackground: true,
          preferCSSPageSize: true,
          margin: { top: "0", right: "0", bottom: "0", left: "0" },
        });
      }

      await browser.close();
      browser = null;

      const cleanup = () => {
         fs.unlink(outputPath, () => {});
      };

      if (isWindows) {
        // Windows: 使用 PowerShell System.Drawing 印圖
        // 這不依賴任何外部程式，只依賴 .NET Framework (Windows 內建)
        const printerName = settings.printerName.replace(/'/g, "''");
        const imgPath = outputPath.replace(/'/g, "''");
        
        const psScript = `
          Add-Type -AssemblyName System.Drawing
          
          $printDoc = New-Object System.Drawing.Printing.PrintDocument
          $printDoc.PrinterSettings.PrinterName = '${printerName}'
          
          # 設定列印事件
          $printDoc.add_PrintPage({
            param($sender, $e)
            
            $img = [System.Drawing.Image]::FromFile('${imgPath}')
            
            # 依可列印區自動縮放，避免內容超出紙張範圍被裁切
            $scaleW = $e.MarginBounds.Width / $img.Width
            $scaleH = $e.MarginBounds.Height / $img.Height
            $scale = [Math]::Min($scaleW, $scaleH)
            if ($scale -gt 1) { $scale = 1 }

            $destW = [int]([Math]::Floor($img.Width * $scale))
            $destH = [int]([Math]::Floor($img.Height * $scale))
            $destX = $e.MarginBounds.Left
            $destY = $e.MarginBounds.Top
            $e.Graphics.DrawImage($img, $destX, $destY, $destW, $destH)
            
            $img.Dispose()
            $e.HasMorePages = $false
          })
          
          try {
            $printDoc.Print()
            Write-Output "SUCCESS"
          } catch {
            Write-Error $_.Exception.Message
          }
        `;

        execFile(
          "powershell.exe",
          ["-NoProfile", "-Command", psScript],
          (error, stdout, stderr) => {
            setTimeout(cleanup, 10000); // 稍微晚點刪除，確保列印完成
            
            if (error || (stderr && !stderr.includes("SUCCESS"))) {
              console.error("[PRINT] Windows Image Print error", error, stderr);
              resolve({ 
                success: false, 
                message: "Windows 列印失敗，請確認印表機名稱正確且已連線。" 
              });
            } else {
              resolve({ success: true });
            }
          }
        );

      } else {
        // macOS / Linux: lp 印 PDF
        const args = [
          "-d",
          settings.printerName,
          "-n",
          String(settings.copies ?? 1),
          // 避免 CUPS 自動縮放導致內容變很小
          "-o",
          "scaling=100",
          outputPath,
        ];

        execFile("lp", args, (error, _stdout, stderr) => {
          cleanup();
          if (error) {
            console.error("[PRINT] lp error", error, stderr);
            resolve({
              success: false,
              message: stderr?.toString() || error.message,
            });
          } else {
            resolve({ success: true });
          }
        });
      }

    } catch (e) {
      if (browser) await browser.close();
      console.error("[PRINT] Puppeteer error", e);
      resolve({
        success: false,
        message: "產生票券影像時發生錯誤",
      });
    }
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

    // Windows：使用 PowerShell 取得印表機清單
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
