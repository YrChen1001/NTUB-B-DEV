import fs from "fs";
import path from "path";
import Database from "better-sqlite3";
import { DEFAULT_CATEGORIES, DEFAULT_ITEMS } from "./seed";
import { Category, Item } from "../models/types";

const DATA_DIR = path.resolve(process.cwd(), "data");
const DB_FILE = path.join(DATA_DIR, "sqlite.db");

function ensureDataDir() {
  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
  }
}

ensureDataDir();

export const db = new Database(DB_FILE);

export function initDb() {
  db.pragma("foreign_keys = ON");
  db.pragma("journal_mode = WAL");

  db.prepare(`
    CREATE TABLE IF NOT EXISTS categories (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      description TEXT,
      icon TEXT,
      color TEXT
    )
  `).run();

  db.prepare(`
    CREATE TABLE IF NOT EXISTS items (
      id TEXT PRIMARY KEY,
      categoryId TEXT NOT NULL,
      title TEXT NOT NULL,
      subtitle TEXT,
      content TEXT NOT NULL,
      footer TEXT,
      price REAL,
      imageUrl TEXT,
      FOREIGN KEY (categoryId) REFERENCES categories(id) ON DELETE CASCADE
    )
  `).run();

  db.prepare(`
    CREATE TABLE IF NOT EXISTS print_jobs (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      payload TEXT NOT NULL,
      createdAt TEXT NOT NULL
    )
  `).run();

  db.prepare(`
    CREATE TABLE IF NOT EXISTS printer_settings (
      id INTEGER PRIMARY KEY CHECK (id = 1),
      printerName TEXT,
      copies INTEGER NOT NULL DEFAULT 1,
      enabled INTEGER NOT NULL DEFAULT 0
    )
  `).run();

  // Seed/補齊預設資料（若不存在則插入，已存在則忽略）
  const insertCat = db.prepare(`
    INSERT OR IGNORE INTO categories (id, name, description, icon, color)
    VALUES (@id, @name, @description, @icon, @color)
  `);
  const insertCatsTx = db.transaction((cats: Category[]) => {
    for (const c of cats) {
      insertCat.run({
        id: c.id,
        name: c.name,
        description: c.description ?? null,
        icon: c.icon ?? null,
        color: c.color ?? null,
      });
    }
  });
  insertCatsTx(DEFAULT_CATEGORIES);

  const insertItem = db.prepare(`
    INSERT OR IGNORE INTO items (id, categoryId, title, subtitle, content, footer, price, imageUrl)
    VALUES (@id, @categoryId, @title, @subtitle, @content, @footer, NULL, @imageUrl)
  `);
  const insertItemsTx = db.transaction((items: Item[]) => {
    for (const item of items) {
      insertItem.run({
        id: item.id,
        categoryId: item.categoryId,
        title: item.title,
        subtitle: item.subtitle ?? null,
        content: item.content ?? "",
        footer: item.footer ?? null,
        imageUrl: item.imageUrl ?? null,
      });
    }
  });
  insertItemsTx(DEFAULT_ITEMS);
}
