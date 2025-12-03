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
}

export interface SystemPrinter {
  name: string;
  status?: string;
  isDefault?: boolean;
}
