export interface Category {
  id: string;
  name: string;
  description?: string;
  icon?: string;
  color?: string;
}

export interface Item {
  id: string;
  categoryId: string;
  title: string;
  subtitle?: string;
  content: string;
  footer?: string;
  imageUrl?: string;
}

export type AppMode = 'ADMIN' | 'USER_HOME' | 'USER_CATEGORY' | 'USER_PRINTING';

export interface PrintJob {
  item: Item;
  categoryName: string;
  timestamp: string;
  queueNumber: number;
}

export interface PrinterSettings {
  id: number;
  printerName: string;
  copies: number;
  enabled: boolean;
  /**
   * 熱感紙/票券列印常用的紙張寬度（mm），例如 58 / 80。
   * macOS/Linux 會用於 PDF width；Windows 會換算成 viewport 寬度。
   */
  paperWidthMm: number;
}

export interface SystemPrinter {
  name: string;
  status?: string;
  isDefault?: boolean;
}
