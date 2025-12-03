import { PrinterSettings, SystemPrinter } from '../types';

// 與 storageService 一致：
// - 部署時：由 VITE_API_BASE_URL 提供（/api 或完整網址）
// - 本機開發時：預設 http://localhost:4000/api
const API_BASE =
  (import.meta.env.VITE_API_BASE_URL as string | undefined) ||
  'http://localhost:4000/api';

export const getPrinterSettings = async (): Promise<PrinterSettings> => {
  const res = await fetch(`${API_BASE}/printer-settings`);
  if (!res.ok) {
    throw new Error('無法讀取印表機設定');
  }
  const data = (await res.json()) as PrinterSettings;
  return data;
};

export const savePrinterSettings = async (settings: PrinterSettings): Promise<PrinterSettings> => {
  const res = await fetch(`${API_BASE}/printer-settings`, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(settings),
  });
  if (!res.ok) {
    throw new Error('儲存印表機設定失敗');
  }
  const data = (await res.json()) as PrinterSettings;
  return data;
};

export const getSystemPrinters = async (): Promise<SystemPrinter[]> => {
  const res = await fetch(`${API_BASE}/printers`);
  if (!res.ok) {
    throw new Error('無法偵測系統印表機');
  }
  const data = (await res.json()) as SystemPrinter[];
  return data;
};


