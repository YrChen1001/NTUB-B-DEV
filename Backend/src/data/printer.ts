import { execFile } from "child_process";
import fs from "fs";
import os from "os";
import path from "path";
import puppeteer from "puppeteer";
import { db } from "./db";
import { PrintJob, PrinterSettings } from "../models/types";

const SETTINGS_ID = 1;

// --- 票券排版（精美網頁版）---
function generateHtml(job: PrintJob): string {
  const qNumber = String(job.queueNumber).padStart(3, "0");
  const prettyTime = job.timestamp.replace("T", " ").slice(0, 16);
  
  const css = `
    @import url('https://fonts.googleapis.com/css2?family=Noto+Serif+TC:wght@400;700&display=swap');
    
    @page {
      margin: 0;
      size: 80mm auto;
    }
    
    body {
      margin: 0;
      padding: 0; /* 圖片截圖需要滿版 */
      font-family: 'Noto Serif TC', serif;
      font-size: 14px;
      line-height: 1.6;
      color: #333;
      background: #fff;
      width: 80mm;
      box-sizing: border-box;
      display: inline-block; /* 讓截圖寬度正確 */
    }

    .container {
      display: flex;
      flex-direction: column;
      align-items: center;
      border: 2px solid #333;
      margin: 10px;
      padding: 15px;
      position: relative;
    }

    .container::before {
      content: "";
      position: absolute;
      top: 4px; left: 4px; right: 4px; bottom: 4px;
      border: 1px solid #999;
      pointer-events: none;
    }

    .header {
      text-align: center;
      margin-bottom: 15px;
      width: 100%;
      border-bottom: 2px solid #333;
      padding-bottom: 10px;
    }

    .brand {
      font-size: 18px;
      font-weight: 700;
      letter-spacing: 2px;
      margin-bottom: 5px;
    }

    .sub-brand {
      font-size: 10px;
      text-transform: uppercase;
      color: #666;
    }

    .meta {
      width: 100%;
      display: flex;
      justify-content: space-between;
      font-size: 12px;
      margin-bottom: 15px;
      border-bottom: 1px dashed #ccc;
      padding-bottom: 10px;
    }

    .meta-item {
      display: flex;
      flex-direction: column;
      align-items: center;
    }

    .meta-label {
      font-size: 10px;
      color: #999;
    }

    .meta-value {
      font-weight: 700;
      font-size: 14px;
    }

    .title-section {
      text-align: center;
      margin-bottom: 20px;
    }

    .title {
      font-size: 20px;
      font-weight: 700;
      margin-bottom: 5px;
    }

    .subtitle {
      font-size: 12px;
      font-style: italic;
      color: #555;
    }

    .content {
      text-align: justify;
      margin-bottom: 25px;
      white-space: pre-wrap;
      width: 100%;
      font-size: 13px;
    }

    .footer {
      text-align: center;
      font-size: 10px;
      color: #666;
      border-top: 1px solid #333;
      padding-top: 10px;
      width: 100%;
    }

    .footer-text {
      margin-bottom: 5px;
      font-weight: 700;
    }
    
    .logo-text {
      font-family: sans-serif;
      font-size: 9px;
      color: #aaa;
      letter-spacing: 1px;
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
        <div class="container">
          <div class="header">
            <div class="brand">NTUB B-KIOSK</div>
            <div class="sub-brand">Divine Guidance Ticket</div>
          </div>
          
          <div class="meta">
            <div class="meta-item">
              <span class="meta-label">NO.</span>
              <span class="meta-value">${qNumber}</span>
            </div>
            <div class="meta-item">
              <span class="meta-label">CATEGORY</span>
              <span class="meta-value">${job.categoryName}</span>
            </div>
          </div>

          <div class="title-section">
            <div class="title">${job.item.title || "無標題"}</div>
            ${job.item.subtitle ? `<div class="subtitle">${job.item.subtitle}</div>` : ""}
          </div>

          <div class="content">
            ${job.item.content}
          </div>

          <div class="footer">
            ${job.item.footer ? `<div class="footer-text">${job.item.footer}</div>` : ""}
            <div class="logo-text">DESIGNED BY NTUB B-KIOSK</div>
            <div style="font-size: 9px; margin-top: 4px; color: #ccc;">${prettyTime}</div>
          </div>
        </div>
      </body>
    </html>
  `;
}

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
      
      const htmlContent = generateHtml(job);
      await page.setContent(htmlContent, { waitUntil: "networkidle0" });

      if (isWindows) {
        // Windows: 截圖為 PNG（必須設定 viewport 寬度以確保排版正確）
        await page.setViewport({ width: 320, height: 800, deviceScaleFactor: 2 }); // 320px ~= 80mm
        // 取得 body 的高度
        const bodyHandle = await page.$('body');
        const { height } = await bodyHandle!.boundingBox() as any;
        await bodyHandle!.dispose();
        
        await page.setViewport({ width: 320, height: Math.ceil(height), deviceScaleFactor: 2 });
        await page.screenshot({ path: outputPath, fullPage: true });
      } else {
        // macOS / Linux: 產生 PDF
        await page.pdf({
          path: outputPath,
          width: "80mm",
          printBackground: true,
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
            
            # 計算縮放（適應紙張寬度，保持比例）
            # 這裡假設印表機已設定好紙張大小 (如 80mm)，通常不需要縮放，直接印原始大小即可
            # 若需強制縮放，可計算 $e.MarginBounds.Width / $img.Width
            
            # 直接繪製圖片 (X=0, Y=0)
            $e.Graphics.DrawImage($img, 0, 0, $img.Width, $img.Height)
            
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
