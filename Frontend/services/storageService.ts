import { Category, Item } from '../types';

const KEYS = {
  CATEGORIES: 'kiosk_categories',
  ITEMS: 'kiosk_items'
};

// 後端 API base，開發時固定指向本機 Backend
const API_BASE = 'http://localhost:4000/api';

export const getCategories = async (): Promise<Category[]> => {
  try {
    const res = await fetch(`${API_BASE}/categories`);
    if (!res.ok) throw new Error('Failed to fetch categories');
    const data = (await res.json()) as Category[];
    // 同步一份到 localStorage，離線時可當快取
    localStorage.setItem(KEYS.CATEGORIES, JSON.stringify(data));
    return data;
  } catch (error) {
    console.error('getCategories: backend error, fallback to localStorage', error);
    const stored = localStorage.getItem(KEYS.CATEGORIES);
    return stored ? JSON.parse(stored) : [];
  }
};

export const saveCategories = async (categories: Category[]): Promise<void> => {
  // 先寫入 localStorage，確保前端即時可用
  localStorage.setItem(KEYS.CATEGORIES, JSON.stringify(categories));
  try {
    await fetch(`${API_BASE}/categories`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(categories),
    });
  } catch (error) {
    console.error('saveCategories: failed to persist to backend', error);
  }
};

export const getItems = async (): Promise<Item[]> => {
  try {
    const res = await fetch(`${API_BASE}/items`);
    if (!res.ok) throw new Error('Failed to fetch items');
    const data = (await res.json()) as Item[];
    localStorage.setItem(KEYS.ITEMS, JSON.stringify(data));
    return data;
  } catch (error) {
    console.error('getItems: backend error, fallback to localStorage', error);
    const stored = localStorage.getItem(KEYS.ITEMS);
    return stored ? JSON.parse(stored) : [];
  }
};

export const saveItems = async (items: Item[]): Promise<void> => {
  localStorage.setItem(KEYS.ITEMS, JSON.stringify(items));
  try {
    await fetch(`${API_BASE}/items`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(items),
    });
  } catch (error) {
    console.error('saveItems: failed to persist to backend', error);
  }
};