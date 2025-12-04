import { execFile } from "child_process";
import fs from "fs";
import os from "os";
import path from "path";
import puppeteer from "puppeteer";
import { db } from "./db";
import { PrintJob, PrinterSettings } from "../models/types";

const SETTINGS_ID = 1;

// --- 票券排版（精美網頁版）---
// 這裡將 HTML/CSS 寫在變數中，實際使用 puppeteer 渲染並列印
function generateHtml(job: PrintJob): string {
  const qNumber = String(job.queueNumber).padStart(3, "0");
  const prettyTime = job.timestamp.replace("T", " ").slice(0, 16);
  
  // 現代簡約風格 CSS
  const css = `
    @import url('https://fonts.googleapis.com/css2?family=Noto+Serif+TC:wght@400;700&display=swap');
    
    @page {
      margin: 0;
      size: 80mm auto; /* 預設熱感紙寬度，可自動延伸長度 */
    }
    
    body {
      margin: 0;
      padding: 20px;
      font-family: 'Noto Serif TC', serif;
      font-size: 14px;
      line-height: 1.6;
      color: #333;
      background: #fff;
      width: 80mm; /* 模擬寬度 */
      box-sizing: border-box;
    }

    .container {
      display: flex;
      flex-direction: column;
      align-items: center;
      border: 2px solid #333;
      padding: 15px;
      position: relative;
    }

    /* 內框線裝飾 */
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
      white-space: pre-wrap; /* 保留換行 */
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

  // 使用 puppeteer 產生 PDF
  return new Promise(async (resolve) => {
    let browser;
    const tmpDir = os.tmpdir();
    const pdfPath = path.join(tmpDir, `ticket-${Date.now()}.pdf`);

    try {
      // 啟動瀏覽器
      browser = await puppeteer.launch({
        headless: true,
        args: ["--no-sandbox", "--disable-setuid-sandbox"],
      });
      const page = await browser.newPage();
      
      // 設定 HTML 內容
      const htmlContent = generateHtml(job);
      await page.setContent(htmlContent, { waitUntil: "networkidle0" });

      // 產生 PDF（寬度 80mm，長度自動）
      await page.pdf({
        path: pdfPath,
        width: "80mm",
        printBackground: true,
        margin: { top: "0", right: "0", bottom: "0", left: "0" },
      });

      await browser.close();
      browser = null;

      // 接著送交 PDF 給印表機
      const isWindows = process.platform === "win32";
      const cleanup = () => {
         fs.unlink(pdfPath, () => {});
      };

      if (isWindows) {
        // Windows: 使用 PowerShell 呼叫預設關聯程式列印或 Adobe Reader，比較麻煩
        // 為了通用，我們這裡改用產生圖片或維持 PDF。
        // 不過 Windows 原生沒有簡單的 PDF 命令行列印工具。
        // 如果要最簡單，我們可以使用 SumatraPDF CLI (如果有的話)，或者改為產生 PNG 圖片給 mspaint / Out-Printer (但 Out-Printer 不吃圖片)。
        // 
        // 這裡採用一個通用的解法：既然我們裝了 puppeteer，我們其實可以截圖成 PNG，然後用 PowerShell Start-Process -Verb Print
        // 但是 Windows 的 "Print" verb 通常會跳出對話框或依賴看圖軟體。
        //
        // 替代方案：在 Windows 上，我們不要印 PDF，我們改為產生一個非常漂亮的純文字版 (Fallback) 
        // 或是我們假設使用者裝了 SumatraPDF。
        // 
        // 為了確保「現在」就能動，我們在 Windows 上還是使用「優化的文字版」或嘗試呼叫 PDF 列印（如果系統支援）。
        // 但既然你要求「精美」，文字版不夠。
        // 
        // 讓我們嘗試用 PDFtoPrinter (需下載) 或者直接用 Edge 列印 PDF？
        // PowerShell 可以呼叫 Start-Process -FilePath "xxx.pdf" -Verb Print 
        // 這會使用預設 PDF 閱讀器列印。通常是 Edge 或 Acrobat。
        
        const psScript = `
          Start-Process -FilePath "${pdfPath}" -Verb Print -PassThru | ForEach-Object {
            $_.WaitForExit(10000) # 等待 10 秒讓它送出
          }
        `;
        
        // 備註：Windows 的 Verb Print 可能會短暫開啟 PDF 閱讀器視窗然後關閉（或不關閉）。
        // 這是目前不依賴第三方 exe 最簡單的方法。
        execFile(
          "powershell.exe",
          ["-NoProfile", "-Command", psScript],
          (error, stdout, stderr) => {
            // 不刪除檔案太快，以免列印程式還沒讀取
            setTimeout(cleanup, 60000); 
            
            if (error) {
              console.error("[PRINT] Windows PDF Print error", error);
               resolve({ success: false, message: "Windows PDF 列印啟動失敗" });
            } else {
               resolve({ success: true });
            }
          }
        );

      } else {
        // macOS / Linux: lp 指令原生支援 PDF
        const args = [
          "-d",
          settings.printerName,
          "-n",
          String(settings.copies ?? 1),
          // "-o", "fit-to-page", // 視情況
          pdfPath,
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
        message: "產生票券 PDF 時發生錯誤",
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
